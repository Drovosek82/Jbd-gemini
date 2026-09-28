import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { bleManager } from './bleManager';

export interface SupabaseSyncConfig {
  enabled: boolean;
  userMode: 'standard' | 'expert';
  supabaseUrl: string;
  supabaseKey: string;
  tableName: string;
  fetchIntervalSec: number;
  activeDeviceName: string; // Empty means 'All / Auto-select'
  customSupabaseUrl?: string;
  customSupabaseKey?: string;
}

export interface SupabaseBmsRecord {
  id?: number;
  device_name: string;
  total_voltage: number;
  current: number;
  power: number;
  soc: number;
  temperatures: number[];
  cell_voltages: number[];
  remaining_capacity: number;
  nominal_capacity: number;
  cycle_count: number;
  created_at: string;
  isOnline?: boolean;
}

export interface SupabaseAuthUser {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  provider?: string;
}

export interface SupabaseSyncStatus {
  lastSyncTime: string | null;
  status: 'idle' | 'fetching' | 'success' | 'error';
  lastError: string | null;
  recordsCount: number;
  deviceCount: number;
}

const envUrl = ((import.meta as any).env?.VITE_SUPABASE_URL as string);
const envKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string);

const DEFAULT_SUPABASE_URL = (envUrl && envUrl.trim() !== '' && envUrl.toLowerCase() !== 'bms')
  ? envUrl
  : 'https://deekjlmbrwmhfoeipuqr.supabase.co';

const DEFAULT_SUPABASE_KEY = (envKey && envKey.trim() !== '' && envKey.toLowerCase() !== 'bms1')
  ? envKey
  : 'sb_publishable_iFdjgqRZBbxuNJHuEVLWUQ_7fYV_I5S';
const DEFAULT_TABLE_NAME = 'bms_telemetry';
const DEFAULT_INTERVAL_SEC = 3;

// Helper to compute deterministic user ID from email for quick local auth
function getDeterministicUserId(email: string): string {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    return 'local_usr_default';
  }

  // 1. Check local registry map first to guarantee persistence across sessions
  try {
    const registryRaw = localStorage.getItem('bms_local_users_registry');
    const registry = registryRaw ? JSON.parse(registryRaw) : {};
    if (registry[cleanEmail]) {
      return registry[cleanEmail];
    }
  } catch (e) {}

  // 2. Compute a stable deterministic hash from cleanEmail
  let hash = 5381;
  for (let i = 0; i < cleanEmail.length; i++) {
    hash = ((hash << 5) + hash) + cleanEmail.charCodeAt(i);
    hash |= 0;
  }
  const hashStr = Math.abs(hash).toString(36);
  const prefix = cleanEmail.split('@')[0].replace(/[^a-z0-9]/gi, '').slice(0, 7) || 'user';
  const userId = `local_usr_${prefix}_${hashStr}`;

  // Save to registry
  try {
    const registryRaw = localStorage.getItem('bms_local_users_registry');
    const registry = registryRaw ? JSON.parse(registryRaw) : {};
    registry[cleanEmail] = userId;
    localStorage.setItem('bms_local_users_registry', JSON.stringify(registry));
  } catch (e) {}

  return userId;
}

class SupabaseService {
  public config: SupabaseSyncConfig = {
    enabled: true,
    userMode: 'standard',
    supabaseUrl: DEFAULT_SUPABASE_URL,
    supabaseKey: DEFAULT_SUPABASE_KEY,
    tableName: DEFAULT_TABLE_NAME,
    fetchIntervalSec: DEFAULT_INTERVAL_SEC,
    activeDeviceName: '',
  };

  public status: SupabaseSyncStatus = {
    lastSyncTime: null,
    status: 'idle',
    lastError: null,
    recordsCount: 0,
    deviceCount: 0,
  };

  public devicesList: SupabaseBmsRecord[] = [];
  public selectedDeviceRecord: SupabaseBmsRecord | null = null;
  public authUser: SupabaseAuthUser | null = null;
  public isAuthLoading = false;

  public isUsingDefaultDb(): boolean {
    return this.config.userMode === 'standard' || 
           !this.config.supabaseUrl || 
           this.config.supabaseUrl === DEFAULT_SUPABASE_URL ||
           !this.config.supabaseKey ||
           this.config.supabaseKey === DEFAULT_SUPABASE_KEY;
  }

  private client: SupabaseClient | null = null;
  private timer: any = null;
  private listeners: Set<() => void> = new Set();
  private isFetching = false;

  constructor() {
    this.loadConfig();
    this.initClient();
    try {
      const savedAuth = localStorage.getItem('bms_supabase_auth_user');
      if (savedAuth) {
        this.authUser = JSON.parse(savedAuth);
      }
    } catch (e) {}
    if (this.config.enabled) {
      this.startPullTimer();
      // Fetch immediately
      setTimeout(() => this.fetchAllDevicesTelemetry(), 500);
    }
  }

  public getCurrentClientId(): string | null {
    if (this.authUser?.id) {
      return this.authUser.id;
    }
    try {
      const savedAuth = localStorage.getItem('bms_supabase_auth_user');
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        if (parsed?.id) return parsed.id;
      }
    } catch (e) {}
    return null;
  }

  private sanitizeUrl(rawUrl?: string): string | null {
    let url = (rawUrl || '').trim();
    if (!url) return null;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    try {
      const parsed = new URL(url);
      if (parsed.hostname && (parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
        return parsed.origin;
      }
    } catch {
      return null;
    }
    return null;
  }

  private loadConfig() {
    try {
      const savedConfig = localStorage.getItem('jbd_bms_supabase_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        this.config = { ...this.config, ...parsed };
      }

      // Initialize custom fields if we have expert credentials but custom properties are empty
      if (this.config.userMode === 'expert') {
        if (!this.config.customSupabaseUrl && this.config.supabaseUrl && this.config.supabaseUrl !== DEFAULT_SUPABASE_URL) {
          this.config.customSupabaseUrl = this.config.supabaseUrl;
        }
        if (!this.config.customSupabaseKey && this.config.supabaseKey && this.config.supabaseKey !== DEFAULT_SUPABASE_KEY) {
          this.config.customSupabaseKey = this.config.supabaseKey;
        }
      }

      // If they are in expert mode, we allow empty values (for typing), but if they have the placeholder "Bms"/"Bms1" we clear them
      if (this.config.userMode === 'expert') {
        if (this.config.supabaseUrl?.toLowerCase() === 'bms') {
          this.config.supabaseUrl = '';
          this.config.customSupabaseUrl = '';
        }
        if (this.config.supabaseKey?.toLowerCase() === 'bms1') {
          this.config.supabaseKey = '';
          this.config.customSupabaseKey = '';
        }
      } else {
        // Standard mode: enforce valid URL and default credentials
        const isValidUrl = Boolean(this.config.supabaseUrl && this.sanitizeUrl(this.config.supabaseUrl));
        if (
          !isValidUrl ||
          !this.config.supabaseKey ||
          this.config.supabaseUrl?.toLowerCase() === 'bms' ||
          this.config.supabaseKey?.toLowerCase() === 'bms1'
        ) {
          this.config.supabaseUrl = DEFAULT_SUPABASE_URL;
          this.config.supabaseKey = DEFAULT_SUPABASE_KEY;
          this.config.tableName = DEFAULT_TABLE_NAME;
        }
      }
      try {
        localStorage.setItem('jbd_bms_supabase_config', JSON.stringify(this.config));
      } catch (e) {}
    } catch (e) {
      console.warn('Failed to load Supabase config from localStorage:', e);
    }
  }

  public saveConfig(newConfig: Partial<SupabaseSyncConfig>) {
    // If the user is saving supabaseUrl/supabaseKey and is in expert mode, update the custom parameters
    if (this.config.userMode === 'expert') {
      if (newConfig.supabaseUrl !== undefined) {
        newConfig.customSupabaseUrl = newConfig.supabaseUrl;
      }
      if (newConfig.supabaseKey !== undefined) {
        newConfig.customSupabaseKey = newConfig.supabaseKey;
      }
    }

    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem('jbd_bms_supabase_config', JSON.stringify(this.config));
    } catch (e) {}

    this.initClient();
    this.stopPullTimer();
    if (this.config.enabled) {
      this.startPullTimer();
      this.fetchAllDevicesTelemetry();
    }
    this.notify();
  }

  public setUserMode(mode: 'standard' | 'expert') {
    if (mode === 'standard') {
      this.saveConfig({
        userMode: 'standard',
        supabaseUrl: DEFAULT_SUPABASE_URL,
        supabaseKey: DEFAULT_SUPABASE_KEY,
        tableName: DEFAULT_TABLE_NAME,
      });
    } else {
      // Switching to expert - restore their saved custom credentials!
      this.saveConfig({
        userMode: 'expert',
        supabaseUrl: this.config.customSupabaseUrl || '',
        supabaseKey: this.config.customSupabaseKey || '',
      });
    }
  }

  public resetToDefaultCredentials() {
    this.saveConfig({
      supabaseUrl: DEFAULT_SUPABASE_URL,
      supabaseKey: DEFAULT_SUPABASE_KEY,
      tableName: DEFAULT_TABLE_NAME,
    });
  }

  private initClient() {
    let targetUrl = DEFAULT_SUPABASE_URL;
    let key = DEFAULT_SUPABASE_KEY;

    if (this.config.userMode === 'expert') {
      const rawUrl = (this.config.supabaseUrl || '').trim();
      if (rawUrl && rawUrl.toLowerCase() !== 'bms') {
        const sanitized = this.sanitizeUrl(rawUrl);
        if (sanitized) {
          targetUrl = sanitized;
        }
      }

      const rawKey = (this.config.supabaseKey || '').trim();
      if (rawKey && rawKey.toLowerCase() !== 'bms1') {
        key = rawKey;
      }
    }

    try {
      this.client = createClient(targetUrl, key);
      if (this.status.status === 'error') {
        this.status.status = 'idle';
        this.status.lastError = null;
      }

      // Check current auth session
      this.client.auth.getSession().then(({ data: { session } }) => {
        this.updateAuthUser(session?.user || null);
      });

      // Listen to auth changes
      this.client.auth.onAuthStateChange((_event, session) => {
        this.updateAuthUser(session?.user || null);
      });
    } catch (e: any) {
      console.warn('Failed to initialize Supabase client:', e);
      this.client = null;
      this.status.status = 'error';
      this.status.lastError = `Помилка ініціалізації Supabase: ${e.message || 'Невалідний URL/Key'}`;
    }
  }

  private updateAuthUser(user: any, forceClear = false) {
    if (user) {
      const userEmail = user.email || 'user@local';
      this.authUser = {
        id: user.id || getDeterministicUserId(userEmail),
        email: userEmail,
        name: user.user_metadata?.full_name || user.user_metadata?.name || userEmail.split('@')[0] || 'Користувач',
        avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        provider: user.app_metadata?.provider || user.provider || 'email',
      };
      try {
        localStorage.setItem('bms_supabase_auth_user', JSON.stringify(this.authUser));
      } catch (e) {}
    } else {
      if (!forceClear && this.authUser?.provider === 'local') {
        return; // Preserve local auth user across tab switches/reinitializations
      }
      this.authUser = null;
      try {
        localStorage.removeItem('bms_supabase_auth_user');
      } catch (e) {}
    }
    this.notify();
  }

  public forceLocalAuth(email: string, name?: string): { success: boolean; message: string } {
    if (!email) {
      return { success: false, message: 'Будь ласка, введіть електронну пошту' };
    }
    const cleanEmail = email.trim();
    const userId = getDeterministicUserId(cleanEmail);
    const fakeUser = {
      id: userId,
      email: cleanEmail,
      name: name?.trim() || cleanEmail.split('@')[0],
      provider: 'local',
    };
    this.updateAuthUser(fakeUser, true);
    return { success: true, message: 'Успішний вхід через локальний персональний профіль!' };
  }

  public signOut(): void {
    this.updateAuthUser(null, true);
    if (this.client) {
      this.client.auth.signOut().catch(() => {});
    }
  }

  public async signUpWithEmail(email: string, password: string, fullName?: string): Promise<{ success: boolean; message: string }> {
    if (!this.client) this.initClient();
    if (!this.client) return { success: false, message: 'Клієнт Supabase не ініціалізовано' };

    try {
      this.isAuthLoading = true;
      this.notify();

      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          data: {
            full_name: fullName || email.split('@')[0],
          },
        },
      });

      this.isAuthLoading = false;
      this.notify();

      if (error) {
        return { success: false, message: error.message };
      }

      if (data.user) {
        this.updateAuthUser(data.user);
        return { success: true, message: 'Акаунт успішно створено та активовано (автоматичний вхід)! Очікування підтвердження пошти пропущено.' };
      }

      return { success: true, message: 'Реєстрацію успішно виконано в Supabase.' };
    } catch (err: any) {
      this.isAuthLoading = false;
      this.notify();
      return { success: false, message: err.message || 'Помилка реєстрації в Supabase' };
    }
  }

  public async signInWithEmail(email: string, password: string): Promise<{ success: boolean; message: string }> {
    if (!this.client) this.initClient();
    if (!this.client) return { success: false, message: 'Клієнт Supabase не ініціалізовано' };

    try {
      this.isAuthLoading = true;
      this.notify();

      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password,
      });

      this.isAuthLoading = false;

      if (error) {
        this.notify();
        return { success: false, message: error.message };
      }

      if (data.user) {
        this.updateAuthUser(data.user);
      }

      return { success: true, message: 'Успішний вхід до акаунту Supabase!' };
    } catch (err: any) {
      this.isAuthLoading = false;
      this.notify();
      return { success: false, message: err.message || 'Помилка авторизації' };
    }
  }

  public async signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
    if (!this.client) this.initClient();
    if (!this.client) return { success: false, error: 'Клієнт Supabase не ініціалізовано' };

    try {
      this.isAuthLoading = true;
      this.notify();

      const { error } = await this.client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      this.isAuthLoading = false;
      this.notify();

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      this.isAuthLoading = false;
      this.notify();
      return { success: false, error: err.message || 'Помилка авторизації через Google' };
    }
  }

  public async signOutGoogle(): Promise<{ success: boolean; error?: string }> {
    if (!this.client) return { success: true };

    try {
      this.isAuthLoading = true;
      this.notify();

      const { error } = await this.client.auth.signOut();

      this.authUser = null;
      this.isAuthLoading = false;
      this.notify();

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      this.isAuthLoading = false;
      this.notify();
      return { success: false, error: err.message || 'Помилка виходу' };
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public setEnabled(enabled: boolean) {
    this.saveConfig({ enabled });
  }

  public setActiveDeviceName(deviceName: string) {
    this.saveConfig({ activeDeviceName: deviceName });
  }

  public startPullTimer() {
    this.stopPullTimer();
    const intervalMs = Math.max(2, this.config.fetchIntervalSec) * 1000;
    this.timer = setInterval(() => {
      this.fetchAllDevicesTelemetry();
    }, intervalMs);
  }

  public stopPullTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Fetches latest telemetry rows for up to 20 unique BMS devices from Supabase table
   */
  public async fetchAllDevicesTelemetry(): Promise<SupabaseBmsRecord[]> {
    if (!this.config.enabled) return [];
    if (this.isFetching) return this.devicesList;

    const clientId = this.getCurrentClientId();
    if (!clientId) {
      this.status = {
        ...this.status,
        status: 'success',
        lastSyncTime: null,
        lastError: 'Увійдіть, щоб бачити свої пристрої',
        recordsCount: 0,
        deviceCount: 0,
      };
      this.devicesList = [];
      this.selectedDeviceRecord = null;
      this.isFetching = false;
      this.notify();
      return [];
    }

    if (!this.client) {
      this.initClient();
      if (!this.client) {
        this.status = {
          ...this.status,
          status: 'error',
          lastError: 'Клієнт Supabase не налаштовано (перевірте URL та Key)',
        };
        this.notify();
        return [];
      }
    }

    this.isFetching = true;
    this.status.status = 'fetching';
    this.notify();

    try {
      // Query recent rows filtered by client_id
      let query = this.client
        .from(this.config.tableName || DEFAULT_TABLE_NAME)
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(100);

      let data: any[] | null = null;
      let error: any = null;

      const filteredRes = await query;
      if (filteredRes.error && filteredRes.error.message?.includes('client_id')) {
        // Fallback if client_id column does not exist yet in custom table
        const fallbackRes = await this.client
          .from(this.config.tableName || DEFAULT_TABLE_NAME)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        data = fallbackRes.data;
        error = fallbackRes.error;
      } else {
        data = filteredRes.data;
        error = filteredRes.error;
      }

      if (error) {
        throw new Error(error.message || 'Помилка читання з Supabase');
      }

      if (!data || data.length === 0) {
        this.status = {
          ...this.status,
          status: 'success',
          lastSyncTime: new Date().toLocaleTimeString('uk-UA'),
          lastError: null,
          recordsCount: 0,
          deviceCount: 0,
        };
        this.devicesList = [];
        this.selectedDeviceRecord = null;
        this.isFetching = false;
        this.notify();
        return [];
      }

      // Group by device_name to get latest row for up to 20 devices
      const devicesMap = new Map<string, SupabaseBmsRecord>();
      const now = new Date().getTime();

      for (const row of data) {
        const dName = row.device_id || row.device_name || 'JBD-BMS';
        if (!devicesMap.has(dName) && devicesMap.size < 20) {
          const createdAtTime = new Date(row.created_at || Date.now()).getTime();
          // Online if updated within last 60 seconds
          const isOnline = now - createdAtTime < 60000;

          const voltVal = row.total_voltage !== undefined && row.total_voltage !== null 
            ? Number(row.total_voltage) 
            : (row.voltage !== undefined && row.voltage !== null ? Number(row.voltage) : 0);
          
          const currVal = Number(row.current || 0);

          const pwrVal = row.power !== undefined && row.power !== null 
            ? Number(row.power) 
            : (voltVal * currVal);

          const tempsArr = Array.isArray(row.temperatures) && row.temperatures.length > 0 
            ? row.temperatures 
            : (row.temp_avg !== undefined && row.temp_avg !== null ? [Number(row.temp_avg)] : (row.temp1 !== undefined && row.temp1 !== null ? [Number(row.temp1)] : []));

          devicesMap.set(dName, {
            id: row.id,
            device_name: dName,
            total_voltage: voltVal,
            current: currVal,
            power: pwrVal,
            soc: Number(row.soc || 0),
            temperatures: tempsArr,
            cell_voltages: Array.isArray(row.cell_voltages) ? row.cell_voltages : [],
            remaining_capacity: Number(row.remaining_capacity || 0),
            nominal_capacity: Number(row.nominal_capacity || 0),
            cycle_count: Number(row.cycle_count || 0),
            created_at: row.created_at || new Date().toISOString(),
            isOnline,
          });
        }
      }

      const devicesList = Array.from(devicesMap.values());
      this.devicesList = devicesList;

      // Select active device
      if (this.config.activeDeviceName) {
        this.selectedDeviceRecord = devicesMap.get(this.config.activeDeviceName) || devicesList[0] || null;
      } else {
        this.selectedDeviceRecord = devicesList[0] || null;
      }

      if (this.selectedDeviceRecord) {
        bleManager.updateFromSupabaseRecord(this.selectedDeviceRecord);
      }

      this.status = {
        lastSyncTime: new Date().toLocaleTimeString('uk-UA'),
        status: 'success',
        lastError: null,
        recordsCount: data.length,
        deviceCount: devicesList.length,
      };

      this.isFetching = false;
      this.notify();
      return devicesList;
    } catch (err: any) {
      let errorMsg = err.message || 'Помилка отримання даних з Supabase';
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('TypeError')) {
        errorMsg = 'Помилка мережі / API ключа (TypeError: Failed to fetch). Перевірте: 1) Скопійовано саме `anon public` key (починається з `eyJ...`), 2) Створено таблицю `bms_telemetry`.';
      }
      this.status = {
        ...this.status,
        status: 'error',
        lastError: errorMsg,
      };
      this.isFetching = false;
      this.notify();
      return [];
    }
  }

  public async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.client) {
      this.initClient();
      if (!this.client) {
        return { success: false, message: 'Клієнт Supabase не налаштовано.' };
      }
    }

    try {
      const { data, error } = await this.client
        .from(this.config.tableName || DEFAULT_TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        return {
          success: false,
          message: `Помилка Supabase [${error.code || ''}]: ${error.message}. Перевірте назву таблиці '${this.config.tableName}' у Supabase!`,
        };
      }

      const count = data ? data.length : 0;
      this.status = {
        ...this.status,
        lastSyncTime: new Date().toLocaleTimeString('uk-UA'),
        status: 'success',
        lastError: null,
      };
      this.notify();

      return {
        success: true,
        message: `З'єднання успішне! У таблиці '${this.config.tableName}' знайдено записів. Останній запис отримано ${count > 0 ? new Date(data[0].created_at).toLocaleString('uk-UA') : 'відсутній'}.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Помилка запиту до Supabase: ${err.message || err}`,
      };
    }
  }

  public async deleteDeviceRecords(deviceName: string): Promise<{ success: boolean; message: string }> {
    if (!this.client) this.initClient();
    if (!this.client) return { success: false, message: 'Клієнт Supabase не налаштовано' };

    try {
      const table = (this.config.tableName || DEFAULT_TABLE_NAME).trim();
      const { error } = await this.client.from(table).delete().eq('device_name', deviceName);

      if (error) {
        return { success: false, message: `Помилка видалення пристрою: ${error.message}` };
      }

      await this.fetchAllDevicesTelemetry();
      return { success: true, message: `Усі записи для BMS "${deviceName}" успішно видалено з Supabase.` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Помилка при видаленні пристрою' };
    }
  }

  public async deleteRecordById(id: number | string): Promise<{ success: boolean; message: string }> {
    if (!this.client) this.initClient();
    if (!this.client) return { success: false, message: 'Клієнт Supabase не налаштовано' };

    try {
      const table = (this.config.tableName || DEFAULT_TABLE_NAME).trim();
      const { error } = await this.client.from(table).delete().eq('id', id);

      if (error) {
        return { success: false, message: `Помилка видалення запису: ${error.message}` };
      }

      await this.fetchAllDevicesTelemetry();
      return { success: true, message: `Запис ID #${id} видалено з Supabase.` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Помилка видалення' };
    }
  }

  public async deleteAllTelemetry(): Promise<{ success: boolean; message: string }> {
    if (!this.client) this.initClient();
    if (!this.client) return { success: false, message: 'Клієнт Supabase не налаштовано' };

    try {
      const table = (this.config.tableName || DEFAULT_TABLE_NAME).trim();
      const { error } = await this.client.from(table).delete().gte('id', 0);

      if (error) {
        return { success: false, message: `Помилка очищення таблиці: ${error.message}` };
      }

      await this.fetchAllDevicesTelemetry();
      return { success: true, message: `Всі дані телеметрії з таблиці "${table}" повністю очищено.` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Помилка очищення' };
    }
  }

  public getTableSqlSchema(): string {
    const table = (this.config.tableName || 'bms_telemetry').trim() || 'bms_telemetry';
    return `-- SQL скрипт для створення таблиці телеметрії в Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.${table} (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  device_name TEXT NOT NULL,
  client_id TEXT DEFAULT 'default',
  total_voltage NUMERIC,
  voltage NUMERIC,
  current NUMERIC,
  power NUMERIC,
  soc NUMERIC,
  temp_avg NUMERIC,
  temperatures JSONB,
  cell_voltages JSONB,
  remaining_capacity NUMERIC,
  nominal_capacity NUMERIC,
  cycle_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Увімкнення політики безпеки RLS
ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;

-- Створення дозволів для читання, запису, видалення (RLS Policies):
DROP POLICY IF EXISTS "Allow public insert" ON public.${table};
CREATE POLICY "Allow public insert" ON public.${table} FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select" ON public.${table};
CREATE POLICY "Allow public select" ON public.${table} FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public delete" ON public.${table};
CREATE POLICY "Allow public delete" ON public.${table} FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public update" ON public.${table};
CREATE POLICY "Allow public update" ON public.${table} FOR UPDATE USING (true);
`;
  }

  public getEsp32CodeSnippet(): string {
    const table = (this.config.tableName || 'bms_telemetry').trim() || 'bms_telemetry';
    const url = this.config.supabaseUrl || 'https://YOUR_PROJECT.supabase.co';
    const key = this.config.supabaseKey || 'YOUR_SUPABASE_ANON_KEY';
    const clientId = this.authUser?.id || 'local_usr_default';
    const clientName = this.authUser?.name || this.authUser?.email || 'Користувач';

    return `// ================================================================
// ESP32 Arduino Скелет для зчитування JBD SP14S004 та запису в Supabase
// Профіль користувача: ${clientName} (ID клієнта: ${clientId})
// (ESP32 тільки ВІДПРАВЛЯЄ дані в Supabase, а веб-додаток тільки ЧИТАЄ)
// ================================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Supabase API REST URL:
const char* supabase_url = "${url}/rest/v1/${table}";
const char* supabase_key = "${key}";

// Унікальний ID клієнта (ідентифікатор користувача для ізоляції акумуляторів у базі даних)
const char* client_id = "${clientId}";

// UART для JBD BMS (HardwareSerial 2: RX2=16, TX2=17)
#define RXD2 16
#define TXD2 17
HardwareSerial bmsSerial(2);

void setup() {
  Serial.begin(115200);
  bmsSerial.begin(9600, SERIAL_8N1, RXD2, TXD2);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Connected!");
}

void loop() {
  // 1. Запит BASIC INFO до JBD BMS (0xDD, 0xA5, 0x03, 0x00, 0xFF, 0xFD, 0x77)
  uint8_t reqInfo[] = {0xDD, 0xA5, 0x03, 0x00, 0xFF, 0xFD, 0x77};
  bmsSerial.write(reqInfo, sizeof(reqInfo));
  delay(200);

  // Read response buffer and parse JBD packets...
  // (Формуємо JSON для Supabase):

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(supabase_url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", supabase_key);
    http.addHeader("Authorization", String("Bearer ") + supabase_key);

    // Payload з унікальним client_id для ізоляції даних кожного користувача
    String jsonPayload = "{"
      "\\"device_name\\":\\"JBD-SP14S004-Rack1\\","
      "\\"client_id\\":\\"" + String(client_id) + "\\","
      "\\"total_voltage\\":51.2,"
      "\\"current\\":12.5,"
      "\\"power\\":640.0,"
      "\\"soc\\":85,"
      "\\"remaining_capacity\\":85.0,"
      "\\"nominal_capacity\\":100.0,"
      "\\"cycle_count\\":12,"
      "\\"cell_voltages\\":[3.21,3.22,3.21,3.20,3.21,3.22,3.21,3.21,3.22,3.20,3.21,3.21,3.22,3.21],"
      "\\"temperatures\\":[24.5, 25.0]"
    "}";

    int httpResponseCode = http.POST(jsonPayload);
    Serial.printf("Supabase POST Result: %d\\n", httpResponseCode);
    http.end();
  }

  delay(5000); // 5 секунд між записами
}
`;
  }
}

export const supabaseService = new SupabaseService();
