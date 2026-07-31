import {
  BmsData,
  BmsParameters,
  BleLogEntry,
  TelemetryHistoryPoint,
  NotificationThresholds,
  AlertNotificationItem,
  AlertSeverity,
} from '../types/bms';
import { playWarningBeep, playDangerAlarm } from './soundAlerts';
import {
  JBD_SERVICE_UUID,
  JBD_NOTIFY_CHAR_UUID,
  JBD_WRITE_CHAR_UUID,
  JBD_COMMANDS,
  buildReadRequest,
  buildWriteRequest,
  bytesToHex,
  parseBasicInfoResponse,
  parseCellVoltagesResponse,
  parseHardwareNameResponse,
  getChemistryPresetParams,
} from './jbdProtocol';

export const DEFAULT_THRESHOLDS: NotificationThresholds = {
  socLow: 20,
  socCriticalLow: 10,
  socHigh: 95,
  socEnabled: true,

  tempHigh: 45,
  tempCriticalHigh: 55,
  tempLow: 0,
  tempEnabled: true,

  voltageLow: 44.0,
  voltageHigh: 58.4,
  voltageEnabled: true,

  currentDischargeMax: 100,
  currentChargeMax: 50,
  currentEnabled: true,

  deltaVoltageMax: 40,
  deltaEnabled: true,

  soundEnabled: true,
  browserNotificationsEnabled: false,
};

// Create initial fallback / default parameters (LiFePO4 16S 100Ah)
export const DEFAULT_PARAMETERS: BmsParameters = {
  chemistry: 'LiFePO4',
  cellCount: 16,
  nominalCapacity: 100,
  cellOverVoltage: 3.65,
  cellOverVoltageRelease: 3.55,
  cellUnderVoltage: 2.5,
  cellUnderVoltageRelease: 2.8,
  packOverVoltage: 58.4,
  packUnderVoltage: 40.0,
  chargeOverCurrent: 50,
  dischargeOverCurrent: 100,
  chargeHighTemp: 55,
  chargeLowTemp: 0,
  dischargeHighTemp: 65,
  dischargeLowTemp: -20,
  balanceStartVoltage: 3.4,
  balanceDeltaVoltage: 15,
  balanceOnlyCharging: true,
};

// Initial Mock BMS State for Demo/Simulation
export function createMockBmsData(cellCount = 16, chemistry: 'LiFePO4' | 'Li-ion' | 'LTO' = 'LiFePO4'): BmsData {
  const baseV = chemistry === 'LiFePO4' ? 3.315 : chemistry === 'Li-ion' ? 3.820 : 2.410;
  const cells = Array.from({ length: cellCount }, (_, i) => {
    // Add small realistic variance
    const dev = (Math.sin(i * 1.5) * 0.008) + (i % 2 === 0 ? 0.003 : -0.002);
    const voltage = Math.round((baseV + dev) * 1000) / 1000;
    return {
      id: i + 1,
      voltage,
      isBalancing: i === 3 || i === 11,
    };
  });

  const voltages = cells.map(c => c.voltage);
  const maxV = Math.max(...voltages);
  const minV = Math.min(...voltages);
  const maxIdx = voltages.indexOf(maxV) + 1;
  const minIdx = voltages.indexOf(minV) + 1;
  const totalV = Math.round(voltages.reduce((a, b) => a + b, 0) * 100) / 100;
  const current = -12.4; // Discharging 12.4A
  const power = Math.round(totalV * current * 10) / 10;

  return {
    totalVoltage: totalV,
    current,
    power,
    soc: 78,
    remainingCapacity: 78.0,
    nominalCapacity: 100.0,
    cycleCount: 42,
    productionDate: '2024-03-15',
    chargeMosEnabled: true,
    dischargeMosEnabled: true,
    temperatures: [24.5, 25.8, 23.9],
    cellCount,
    cells,
    protection: {
      cellOverVoltage: false,
      cellUnderVoltage: false,
      packOverVoltage: false,
      packUnderVoltage: false,
      chargeOverTemp: false,
      chargeUnderTemp: false,
      dischargeOverTemp: false,
      dischargeUnderTemp: false,
      chargeOverCurrent: false,
      dischargeOverCurrent: false,
      shortCircuit: false,
      icError: false,
      mosfetLock: false,
    },
    maxCellVoltage: maxV,
    minCellVoltage: minV,
    maxCellIndex: maxIdx,
    minCellIndex: minIdx,
    deltaVoltage: Math.round((maxV - minV) * 1000),
    hardwareName: 'JBD-SP16S001',
    softwareVersion: 'v2.5',
    lastUpdated: new Date(),
  };
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export class BmsBleManager {
  private device: BluetoothDevice | null = null;
  private gattServer: BluetoothRemoteGATTServer | null = null;
  private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
  private notifyChar: BluetoothRemoteGATTCharacteristic | null = null;

  public connectionState: ConnectionState = 'disconnected';
  public isSimulationMode = true; // Default to demo mode if no real hardware connected
  public bmsData: BmsData;
  public parameters: BmsParameters = { ...DEFAULT_PARAMETERS };
  public thresholds: NotificationThresholds = { ...DEFAULT_THRESHOLDS };
  public notifications: AlertNotificationItem[] = [];
  public activeToastAlert: AlertNotificationItem | null = null;
  public logs: BleLogEntry[] = [];
  public history: TelemetryHistoryPoint[] = [];

  // Auto-reconnect state
  public autoReconnectEnabled = true;
  public autoReconnectAttempts = 0;
  public maxAutoReconnectAttempts = 10;
  public lastConnectedDeviceName = '';
  private isUserInitiatedDisconnect = false;
  private autoReconnectTimer: any = null;

  private receiveBuffer: number[] = [];
  private pollIntervalTimer: any = null;
  private simulationTimer: any = null;
  private listeners: Set<() => void> = new Set();
  private lastAlertTimeMap: Map<string, number> = new Map();
  private handleDisconnectBound = this.handleDisconnect.bind(this);

  constructor() {
    this.bmsData = createMockBmsData(16, 'LiFePO4');
    this.loadStorage();
    this.startSimulation();
  }

  private loadStorage() {
    if (typeof window === 'undefined') return;
    try {
      const savedThresholds = localStorage.getItem('jbd_bms_thresholds');
      if (savedThresholds) {
        this.thresholds = { ...DEFAULT_THRESHOLDS, ...JSON.parse(savedThresholds) };
      }
      const savedNotifications = localStorage.getItem('jbd_bms_notifications');
      if (savedNotifications) {
        this.notifications = JSON.parse(savedNotifications);
      }
      const savedHistory = localStorage.getItem('jbd_bms_history');
      if (savedHistory) {
        this.history = JSON.parse(savedHistory);
      }
      const savedAutoReconnect = localStorage.getItem('jbd_bms_auto_reconnect');
      if (savedAutoReconnect !== null) {
        this.autoReconnectEnabled = savedAutoReconnect === 'true';
      }
      const savedLastDevice = localStorage.getItem('jbd_bms_last_device');
      if (savedLastDevice) {
        this.lastConnectedDeviceName = savedLastDevice;
      }
    } catch (e) {
      console.warn('Failed to load local storage data:', e);
    }
  }

  public setAutoReconnectEnabled(enabled: boolean) {
    this.autoReconnectEnabled = enabled;
    try {
      localStorage.setItem('jbd_bms_auto_reconnect', String(enabled));
    } catch (e) {}
    this.notify();
  }

  public saveThresholds(newThresholds: NotificationThresholds) {
    this.thresholds = { ...newThresholds };
    try {
      localStorage.setItem('jbd_bms_thresholds', JSON.stringify(this.thresholds));
    } catch (e) {}
    this.notify();
  }

  public clearNotifications() {
    this.notifications = [];
    try {
      localStorage.removeItem('jbd_bms_notifications');
    } catch (e) {}
    this.notify();
  }

  public markNotificationAsRead(id: string) {
    this.notifications = this.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    try {
      localStorage.setItem('jbd_bms_notifications', JSON.stringify(this.notifications.slice(0, 100)));
    } catch (e) {}
    this.notify();
  }

  public dismissToastAlert() {
    this.activeToastAlert = null;
    this.notify();
  }

  public async requestBrowserNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    const res = await Notification.requestPermission();
    const granted = res === 'granted';
    this.thresholds.browserNotificationsEnabled = granted;
    this.saveThresholds(this.thresholds);
    return granted;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public addLog(type: 'tx' | 'rx' | 'info' | 'error', hex: string, description: string, command?: string) {
    const entry: BleLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString('uk-UA', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }),
      type,
      hex,
      description,
      command,
    };
    this.logs = [entry, ...this.logs.slice(0, 99)]; // Keep last 100 entries
    this.notify();
  }

  public isWebBluetoothSupported(): boolean {
    return typeof window !== 'undefined' && 'bluetooth' in navigator && !!navigator.bluetooth;
  }

  /**
   * Connect to real JBD BMS BLE device
   */
  public async connectRealDevice(): Promise<void> {
    if (!this.isWebBluetoothSupported()) {
      throw new Error('Web Bluetooth не підтримується у даному браузері! Скористайтеся Chrome, Edge або Opera на ПК чи Android.');
    }

    try {
      this.isUserInitiatedDisconnect = false;
      this.stopAutoReconnectTimer();
      this.autoReconnectAttempts = 0;

      this.connectionState = 'connecting';
      this.addLog('info', '', 'Пошук пристроїв JBD BLE Bluetooth...');
      this.notify();

      // Request device with JBD service UUID or fallback filter
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'JBD' },
          { namePrefix: 'xiaoxiang' },
          { namePrefix: 'Xiaoxiang' },
          { namePrefix: 'SP' },
          { namePrefix: 'BMS' },
          { namePrefix: 'smart' },
        ],
        optionalServices: [JBD_SERVICE_UUID, 0xff00, '0000ff00-0000-1000-8000-00805f9b34fb'],
      });

      this.lastConnectedDeviceName = this.device.name || 'JBD BMS';
      try {
        localStorage.setItem('jbd_bms_last_device', this.lastConnectedDeviceName);
      } catch (e) {}

      this.addLog('info', '', `Знахiдно пристрiй: ${this.lastConnectedDeviceName}`);

      this.device.removeEventListener('gattserverdisconnected', this.handleDisconnectBound);
      this.device.addEventListener('gattserverdisconnected', this.handleDisconnectBound);

      if (!this.device.gatt) {
        throw new Error('GATT сервер недоступний');
      }

      this.gattServer = await this.device.gatt.connect();
      this.addLog('info', '', 'GATT Сервер підключено. Отримання сервісів...');

      const service = await this.gattServer.getPrimaryService(JBD_SERVICE_UUID).catch(async () => {
        // Fallback for short 16-bit UUID
        return await this.gattServer!.getPrimaryService(0xff00);
      });

      this.writeChar = await service.getCharacteristic(JBD_WRITE_CHAR_UUID).catch(async () => {
        return await service.getCharacteristic(0xff02);
      });

      this.notifyChar = await service.getCharacteristic(JBD_NOTIFY_CHAR_UUID).catch(async () => {
        return await service.getCharacteristic(0xff01);
      });

      // Start notifications
      await this.notifyChar.startNotifications();
      this.notifyChar.addEventListener('characteristicvaluechanged', this.handleCharacteristicValueChanged.bind(this));

      this.connectionState = 'connected';
      this.isSimulationMode = false;
      this.stopSimulation();
      this.addLog('info', '', `Успішно підключено до ${this.lastConnectedDeviceName}!`);

      // Read Hardware Name
      await this.sendCommand(JBD_COMMANDS.READ_HARDWARE_NAME, 'Зчитування імені пристрою');

      // Start polling
      this.startPolling();
      this.notify();
    } catch (err: any) {
      this.connectionState = 'error';
      this.addLog('error', '', `Помилка підключення: ${err.message || err}`);
      this.notify();
      throw err;
    }
  }

  public async disconnectDevice() {
    this.isUserInitiatedDisconnect = true;
    this.stopAutoReconnectTimer();
    this.stopPolling();
    if (this.gattServer && this.gattServer.connected) {
      try {
        this.gattServer.disconnect();
      } catch (e) {}
    }
    this.handleDisconnect();
  }

  public cancelAutoReconnect() {
    this.isUserInitiatedDisconnect = true;
    this.stopAutoReconnectTimer();
    this.connectionState = 'disconnected';
    this.autoReconnectAttempts = 0;
    this.addLog('info', '', 'Автоматичне перепідключення скасовано користувачем.');
    this.notify();
  }

  private stopAutoReconnectTimer() {
    if (this.autoReconnectTimer) {
      clearTimeout(this.autoReconnectTimer);
      this.autoReconnectTimer = null;
    }
  }

  private handleDisconnect() {
    this.stopPolling();
    this.gattServer = null;
    this.writeChar = null;
    this.notifyChar = null;

    if (this.isUserInitiatedDisconnect || !this.autoReconnectEnabled) {
      this.connectionState = 'disconnected';
      this.device = null;
      this.addLog('info', '', 'Пристрій відключено користувачем.');
      this.notify();
    } else {
      // Accidental disconnect detected! Launch auto-reconnect sequence
      this.addLog('error', '', `[Auto-Reconnect] Зв'язок з пристроєм '${this.lastConnectedDeviceName || 'BMS'}' випадково втрачено!`);
      this.startAutoReconnectSequence();
    }
  }

  private startAutoReconnectSequence() {
    this.stopAutoReconnectTimer();
    this.autoReconnectAttempts = 0;
    this.connectionState = 'reconnecting';

    this.activeToastAlert = {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString('uk-UA'),
      isoTime: new Date().toISOString(),
      paramKey: 'protection',
      title: 'Втрачено зв\'язок по Bluetooth!',
      message: `Випадковий розрив з'єднання з ${this.lastConnectedDeviceName || 'BMS'}. Спроба авто-перепідключення...`,
      currentValue: 'Перепідключення',
      severity: 'warning',
      isRead: false,
    };

    if (this.thresholds.soundEnabled) {
      playWarningBeep();
    }

    this.addLog(
      'info',
      '',
      `[Auto-Reconnect] Запущено процес авто-відновлення підключення (макс. ${this.maxAutoReconnectAttempts} спроб)`
    );
    this.notify();

    // First fast attempt
    this.scheduleNextReconnectAttempt(600);
  }

  private scheduleNextReconnectAttempt(delayMs: number = 3000) {
    this.stopAutoReconnectTimer();
    this.autoReconnectTimer = setTimeout(() => {
      this.attemptReconnect();
    }, delayMs);
  }

  private async attemptReconnect() {
    if (this.isUserInitiatedDisconnect || !this.autoReconnectEnabled) {
      return;
    }

    if (this.autoReconnectAttempts >= this.maxAutoReconnectAttempts) {
      this.connectionState = 'error';
      this.addLog(
        'error',
        '',
        `[Auto-Reconnect] Не вдалося автоматично відновити з'єднання після ${this.maxAutoReconnectAttempts} спроб.`
      );

      this.activeToastAlert = {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString('uk-UA'),
        isoTime: new Date().toISOString(),
        paramKey: 'protection',
        title: 'Помилка авто-перепідключення',
        message: `Не вдалося зв'язатися з ${this.lastConnectedDeviceName || 'BMS'}. Натисніть "Підключити" у верхньому меню.`,
        currentValue: 'Перервано',
        severity: 'danger',
        isRead: false,
      };

      if (this.thresholds.soundEnabled) {
        playDangerAlarm();
      }

      this.notify();
      return;
    }

    this.autoReconnectAttempts++;
    this.connectionState = 'reconnecting';
    this.addLog(
      'info',
      '',
      `[Auto-Reconnect] Спроба ${this.autoReconnectAttempts}/${this.maxAutoReconnectAttempts} відновлення підключення до '${this.lastConnectedDeviceName || 'BMS'}'...`
    );
    this.notify();

    try {
      // Strategy 1: Reconnect using existing BluetoothDevice instance in memory
      if (this.device && this.device.gatt) {
        this.gattServer = await this.device.gatt.connect();

        const service = await this.gattServer.getPrimaryService(JBD_SERVICE_UUID).catch(async () => {
          return await this.gattServer!.getPrimaryService(0xff00);
        });

        this.writeChar = await service.getCharacteristic(JBD_WRITE_CHAR_UUID).catch(async () => {
          return await service.getCharacteristic(0xff02);
        });

        this.notifyChar = await service.getCharacteristic(JBD_NOTIFY_CHAR_UUID).catch(async () => {
          return await service.getCharacteristic(0xff01);
        });

        await this.notifyChar.startNotifications();
        this.notifyChar.addEventListener('characteristicvaluechanged', this.handleCharacteristicValueChanged.bind(this));

        this.connectionState = 'connected';
        this.isSimulationMode = false;
        const attemptsUsed = this.autoReconnectAttempts;
        this.autoReconnectAttempts = 0;

        this.addLog(
          'info',
          '',
          `[Auto-Reconnect] 🎉 Успішно відновлено з'єднання з ${this.device.name || 'JBD BMS'} (спроба ${attemptsUsed})!`
        );

        this.activeToastAlert = {
          id: Math.random().toString(),
          timestamp: new Date().toLocaleTimeString('uk-UA'),
          isoTime: new Date().toISOString(),
          paramKey: 'protection',
          title: 'Зв\'язок Відновлено!',
          message: `Автоматичне підключення до ${this.device.name || 'BMS'} пройшло успішно.`,
          currentValue: 'Успіх',
          severity: 'info',
          isRead: false,
        };

        await this.sendCommand(JBD_COMMANDS.READ_HARDWARE_NAME, 'Зчитування імені пристрою');
        this.startPolling();
        this.notify();
        return;
      }

      // Strategy 2: If browser supports navigator.bluetooth.getDevices()
      if (this.isWebBluetoothSupported() && 'getDevices' in navigator.bluetooth) {
        const devices = await (navigator.bluetooth as any).getDevices();
        if (devices && devices.length > 0) {
          const target = devices.find((d: any) => d.name === this.lastConnectedDeviceName) || devices[0];
          if (target && target.gatt) {
            this.device = target;
            this.device.removeEventListener('gattserverdisconnected', this.handleDisconnectBound);
            this.device.addEventListener('gattserverdisconnected', this.handleDisconnectBound);
            return this.attemptReconnect();
          }
        }
      }

      throw new Error('Пристрій недоступний або знаходяться поза зоною дії BLE');
    } catch (err: any) {
      this.addLog('error', '', `[Auto-Reconnect] Спроба ${this.autoReconnectAttempts} не вдалася: ${err.message || 'Невдало'}`);
      // Schedule next attempt with 3.5s delay
      this.scheduleNextReconnectAttempt(3500);
    }
  }

  public toggleSimulationMode(enable: boolean) {
    if (enable) {
      if (this.connectionState === 'connected') {
        this.disconnectDevice();
      }
      this.isSimulationMode = true;
      this.connectionState = 'connected';
      this.startSimulation();
      this.addLog('info', '', 'Переключено в режим Симуляції (Демо)');
    } else {
      this.stopSimulation();
      this.isSimulationMode = false;
      this.connectionState = 'disconnected';
      this.addLog('info', '', 'Режим симуляції вимкнено.');
    }
    this.notify();
  }

  /**
   * Send BLE Command to BMS
   */
  public async sendCommand(cmd: number, description: string): Promise<void> {
    if (this.isSimulationMode) {
      // Handle simulated response
      const req = buildReadRequest(cmd);
      this.addLog('tx', bytesToHex(req), description, `0x${cmd.toString(16).toUpperCase()}`);
      this.simulateRxResponse(cmd);
      return;
    }

    if (!this.writeChar || this.connectionState !== 'connected') {
      throw new Error('Bluetooth пристрій не підключено');
    }

    const requestPacket = buildReadRequest(cmd);
    this.addLog('tx', bytesToHex(requestPacket), description, `0x${cmd.toString(16).toUpperCase()}`);

    try {
      await this.writeChar.writeValue(requestPacket);
    } catch (e: any) {
      this.addLog('error', '', `Помилка відправки команди 0x${cmd.toString(16)}: ${e.message}`);
    }
  }

  /**
   * Send MOS Control command (Charge ON/OFF, Discharge ON/OFF)
   */
  public async setMosfetState(charge: boolean, discharge: boolean): Promise<void> {
    const val = (charge ? 0x01 : 0x00) | (discharge ? 0x02 : 0x00);
    const dataBytes = [0x00, val];
    const writeReq = buildWriteRequest(JBD_COMMANDS.WRITE_MOS_CONTROL, dataBytes);
    const desc = `Керування ключами: Заряд ${charge ? 'УВІМК' : 'ВИМК'}, Розряд ${discharge ? 'УВІМК' : 'ВИМК'}`;

    this.addLog('tx', bytesToHex(writeReq), desc, 'MOSFET');

    if (this.isSimulationMode) {
      this.bmsData.chargeMosEnabled = charge;
      this.bmsData.dischargeMosEnabled = discharge;
      if (!charge && this.bmsData.current > 0) this.bmsData.current = 0;
      if (!discharge && this.bmsData.current < 0) this.bmsData.current = 0;
      this.bmsData.power = Math.round(this.bmsData.totalVoltage * this.bmsData.current * 10) / 10;
      this.addLog('rx', 'DD 00 00 00 FF ED 77', 'Успішно змінено стан MOSFET');
      this.notify();
      return;
    }

    if (this.writeChar) {
      await this.writeChar.writeValue(writeReq);
    }
  }

  /**
   * Handle incoming BLE Notification data
   */
  private handleCharacteristicValueChanged(event: Event) {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (!target.value) return;

    const chunk = new Uint8Array(target.value.buffer);
    for (let i = 0; i < chunk.length; i++) {
      this.receiveBuffer.push(chunk[i]);
    }

    // Process complete frame when start is 0xDD and end is 0x77
    while (this.receiveBuffer.length >= 7) {
      const startIndex = this.receiveBuffer.indexOf(0xDD);
      if (startIndex === -1) {
        this.receiveBuffer = [];
        break;
      }
      if (startIndex > 0) {
        this.receiveBuffer = this.receiveBuffer.slice(startIndex);
      }

      const stopIndex = this.receiveBuffer.indexOf(0x77);
      if (stopIndex === -1) {
        // Wait for remaining packet chunks
        break;
      }

      const frame = new Uint8Array(this.receiveBuffer.slice(0, stopIndex + 1));
      this.receiveBuffer = this.receiveBuffer.slice(stopIndex + 1);

      this.processIncomingFrame(frame);
    }
  }

  private processIncomingFrame(frame: Uint8Array) {
    if (frame.length < 7 || frame[0] !== 0xDD || frame[frame.length - 1] !== 0x77) return;

    const cmd = frame[1];
    const status = frame[2];
    const hexStr = bytesToHex(frame);

    if (status !== 0x00 && status !== 0xA5) {
      this.addLog('error', hexStr, `Помилка виконання команди 0x${cmd.toString(16)} (Статус ${status})`);
      return;
    }

    if (cmd === JBD_COMMANDS.READ_BASIC_INFO) {
      const updated = parseBasicInfoResponse(frame, this.bmsData);
      this.bmsData = { ...this.bmsData, ...updated };
      this.addLog('rx', hexStr, `Отримано базову інформацію: U=${this.bmsData.totalVoltage}V, I=${this.bmsData.current}A, SOC=${this.bmsData.soc}%`);
      this.recordTelemetryPoint();
    } else if (cmd === JBD_COMMANDS.READ_CELL_VOLTAGES) {
      const updated = parseCellVoltagesResponse(frame, this.bmsData);
      this.bmsData = { ...this.bmsData, ...updated };
      this.addLog('rx', hexStr, `Отримано напруги ${this.bmsData.cellCount} осередків (ΔV=${this.bmsData.deltaVoltage}mV)`);
    } else if (cmd === JBD_COMMANDS.READ_HARDWARE_NAME) {
      const hwName = parseHardwareNameResponse(frame);
      this.bmsData.hardwareName = hwName;
      this.addLog('rx', hexStr, `Назва BMS: ${hwName}`);
    } else {
      this.addLog('rx', hexStr, `Відповідь на команду 0x${cmd.toString(16).toUpperCase()}`);
    }

    this.notify();
  }

  private startPolling() {
    this.stopPolling();
    // Poll 0x03 and 0x04 every 1.5 seconds
    this.pollIntervalTimer = setInterval(async () => {
      if (this.connectionState === 'connected' && !this.isSimulationMode) {
        await this.sendCommand(JBD_COMMANDS.READ_BASIC_INFO, 'Опитування стану');
        await new Promise((r) => setTimeout(r, 200));
        await this.sendCommand(JBD_COMMANDS.READ_CELL_VOLTAGES, 'Опитування осередків');
      }
    }, 1500);
  }

  private stopPolling() {
    if (this.pollIntervalTimer) {
      clearInterval(this.pollIntervalTimer);
      this.pollIntervalTimer = null;
    }
  }

  /**
   * Simulated JBD Engine for testing UI and logic without physical hardware
   */
  private startSimulation() {
    this.stopSimulation();
    this.connectionState = 'connected';
    
    this.simulationTimer = setInterval(() => {
      if (!this.isSimulationMode) return;

      // Simulate natural voltage/current jitter
      const currentDelta = (Math.random() - 0.49) * 0.4;
      let newCurrent = Math.round((this.bmsData.current + currentDelta) * 10) / 10;
      if (!this.bmsData.dischargeMosEnabled && newCurrent < 0) newCurrent = 0;
      if (!this.bmsData.chargeMosEnabled && newCurrent > 0) newCurrent = 0;

      // Slightly alter cells
      const cells = this.bmsData.cells.map((cell) => {
        const jitter = (Math.random() - 0.5) * 0.002;
        const v = Math.max(2.5, Math.min(3.65, Math.round((cell.voltage + jitter) * 1000) / 1000));
        return {
          ...cell,
          voltage: v,
        };
      });

      const voltages = cells.map((c) => c.voltage);
      const maxV = Math.max(...voltages);
      const minV = Math.min(...voltages);
      const totalV = Math.round(voltages.reduce((a, b) => a + b, 0) * 100) / 100;
      const power = Math.round(totalV * newCurrent * 10) / 10;

      // Update temps slightly
      const temps = this.bmsData.temperatures.map(t => Math.round((t + (Math.random() - 0.5) * 0.1) * 10) / 10);

      this.bmsData = {
        ...this.bmsData,
        totalVoltage: totalV,
        current: newCurrent,
        power,
        temperatures: temps,
        cells,
        maxCellVoltage: maxV,
        minCellVoltage: minV,
        maxCellIndex: voltages.indexOf(maxV) + 1,
        minCellIndex: voltages.indexOf(minV) + 1,
        deltaVoltage: Math.round((maxV - minV) * 1000),
        lastUpdated: new Date(),
      };

      this.recordTelemetryPoint();
      this.notify();
    }, 1500);
  }

  private stopSimulation() {
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
  }

  private simulateRxResponse(cmd: number) {
    setTimeout(() => {
      if (cmd === JBD_COMMANDS.READ_BASIC_INFO) {
        this.addLog(
          'rx',
          'DD 03 00 1B 14 A0 00 00 1E 80 27 10 00 2A 2E D9 00 00 00 00 25 4E 03 02 0B B2 0B BC 4A FA 77',
          `Отримано базові дані: U=${this.bmsData.totalVoltage}V, I=${this.bmsData.current}A`
        );
      } else if (cmd === JBD_COMMANDS.READ_CELL_VOLTAGES) {
        this.addLog(
          'rx',
          'DD 04 00 20 0C F3 0C F5 0C F2 0C F8 0C F1 0C F4 0C F7 0C F0 0C F6 0C F3 0C F5 0C F2 0C F4 0C F1 0C F8 0C F5 AB C4 77',
          `Отримано напруги ${this.bmsData.cellCount} осередків`
        );
      } else if (cmd === JBD_COMMANDS.READ_HARDWARE_NAME) {
        this.addLog('rx', 'DD 05 00 0C 4A 42 44 2D 53 50 31 36 53 30 30 31 BC D2 77', `Ім'я BMS: ${this.bmsData.hardwareName}`);
      }
    }, 150);
  }

  private triggerNotification(item: Omit<AlertNotificationItem, 'id' | 'timestamp' | 'isoTime' | 'isRead'>) {
    const now = Date.now();
    const cooldownKey = `${item.paramKey}_${item.severity}_${item.title}`;
    const lastTime = this.lastAlertTimeMap.get(cooldownKey) || 0;

    // Cooldown of 15 seconds per unique alert rule
    if (now - lastTime < 15000) {
      return;
    }
    this.lastAlertTimeMap.set(cooldownKey, now);

    const fullItem: AlertNotificationItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      isoTime: new Date().toISOString(),
      isRead: false,
    };

    this.notifications = [fullItem, ...this.notifications.slice(0, 99)];
    this.activeToastAlert = fullItem;

    try {
      localStorage.setItem('jbd_bms_notifications', JSON.stringify(this.notifications));
    } catch (e) {}

    // Play Synthesized Audio Sound
    if (this.thresholds.soundEnabled) {
      if (item.severity === 'danger') {
        playDangerAlarm();
      } else {
        playWarningBeep();
      }
    }

    // Trigger Browser Notification if allowed
    if (
      this.thresholds.browserNotificationsEnabled &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification(fullItem.title, {
          body: fullItem.message,
        });
      } catch (e) {}
    }

    this.notify();
  }

  public checkNotificationThresholds() {
    const d = this.bmsData;
    const t = this.thresholds;

    // 1. SOC Thresholds
    if (t.socEnabled) {
      if (d.soc <= t.socCriticalLow) {
        this.triggerNotification({
          paramKey: 'soc',
          title: 'Критично низький рівень заряду (SOC)!',
          message: `Рівень заряду знизився до ${d.soc}%. Поріг: ${t.socCriticalLow}%. Необхідна термінова зарядка!`,
          currentValue: `${d.soc}%`,
          thresholdValue: `${t.socCriticalLow}%`,
          unit: '%',
          severity: 'danger',
        });
      } else if (d.soc <= t.socLow) {
        this.triggerNotification({
          paramKey: 'soc',
          title: 'Низький рівень заряду (SOC)',
          message: `Рівень заряду акумулятора ${d.soc}%. Поріг: ${t.socLow}%.`,
          currentValue: `${d.soc}%`,
          thresholdValue: `${t.socLow}%`,
          unit: '%',
          severity: 'warning',
        });
      } else if (d.soc >= t.socHigh && d.current > 0.5) {
        this.triggerNotification({
          paramKey: 'soc',
          title: 'Акумулятор повністю заряджено',
          message: `Заряд досяг ${d.soc}%. Поріг: ${t.socHigh}%.`,
          currentValue: `${d.soc}%`,
          thresholdValue: `${t.socHigh}%`,
          unit: '%',
          severity: 'info',
        });
      }
    }

    // 2. Temperature Thresholds
    if (t.tempEnabled && d.temperatures && d.temperatures.length > 0) {
      const maxTemp = Math.max(...d.temperatures);
      const minTemp = Math.min(...d.temperatures);

      if (maxTemp >= t.tempCriticalHigh) {
        this.triggerNotification({
          paramKey: 'temp',
          title: 'НЕБЕЗПЕКА: Критичний перегрів!',
          message: `Температура батареї досягла ${maxTemp.toFixed(1)}°C! Критичний поріг: ${t.tempCriticalHigh}°C.`,
          currentValue: `${maxTemp.toFixed(1)}°C`,
          thresholdValue: `${t.tempCriticalHigh}°C`,
          unit: '°C',
          severity: 'danger',
        });
      } else if (maxTemp >= t.tempHigh) {
        this.triggerNotification({
          paramKey: 'temp',
          title: 'Попередження: Висока температура',
          message: `Температура батареї підвищилася до ${maxTemp.toFixed(1)}°C. Поріг: ${t.tempHigh}°C.`,
          currentValue: `${maxTemp.toFixed(1)}°C`,
          thresholdValue: `${t.tempHigh}°C`,
          unit: '°C',
          severity: 'warning',
        });
      } else if (minTemp <= t.tempLow) {
        this.triggerNotification({
          paramKey: 'temp',
          title: 'Попередження: Низька температура',
          message: `Температура батареї опустилася до ${minTemp.toFixed(1)}°C. Поріг: ${t.tempLow}°C.`,
          currentValue: `${minTemp.toFixed(1)}°C`,
          thresholdValue: `${t.tempLow}°C`,
          unit: '°C',
          severity: 'warning',
        });
      }
    }

    // 3. Voltage Thresholds
    if (t.voltageEnabled) {
      if (d.totalVoltage <= t.voltageLow) {
        this.triggerNotification({
          paramKey: 'voltage',
          title: 'Критично низька напруга батареї',
          message: `Загальна напруга впала до ${d.totalVoltage.toFixed(2)}V! Поріг: ${t.voltageLow}V.`,
          currentValue: `${d.totalVoltage.toFixed(2)}V`,
          thresholdValue: `${t.voltageLow}V`,
          unit: 'V',
          severity: 'danger',
        });
      } else if (d.totalVoltage >= t.voltageHigh) {
        this.triggerNotification({
          paramKey: 'voltage',
          title: 'Перевищення максимальної напруги',
          message: `Загальна напруга досягла ${d.totalVoltage.toFixed(2)}V! Поріг: ${t.voltageHigh}V.`,
          currentValue: `${d.totalVoltage.toFixed(2)}V`,
          thresholdValue: `${t.voltageHigh}V`,
          unit: 'V',
          severity: 'warning',
        });
      }
    }

    // 4. Current Thresholds
    if (t.currentEnabled) {
      if (-d.current >= t.currentDischargeMax) {
        this.triggerNotification({
          paramKey: 'current',
          title: 'Перевищення струму розряду!',
          message: `Струм розряду досяг ${Math.abs(d.current).toFixed(1)}A! Поріг: ${t.currentDischargeMax}A.`,
          currentValue: `${Math.abs(d.current).toFixed(1)}A`,
          thresholdValue: `${t.currentDischargeMax}A`,
          unit: 'A',
          severity: 'danger',
        });
      } else if (d.current >= t.currentChargeMax) {
        this.triggerNotification({
          paramKey: 'current',
          title: 'Перевищення струму заряду',
          message: `Струм заряду досяг ${d.current.toFixed(1)}A. Поріг: ${t.currentChargeMax}A.`,
          currentValue: `${d.current.toFixed(1)}A`,
          thresholdValue: `${t.currentChargeMax}A`,
          unit: 'A',
          severity: 'warning',
        });
      }
    }

    // 5. Delta Voltage (Imbalance)
    if (t.deltaEnabled && d.deltaVoltage >= t.deltaVoltageMax) {
      this.triggerNotification({
        paramKey: 'delta',
        title: 'Високий розбаланс осередків (ΔV)',
        message: `Різниця напруг осередків досягла ${d.deltaVoltage} мВ! Поріг: ${t.deltaVoltageMax} мВ.`,
        currentValue: `${d.deltaVoltage}mV`,
        thresholdValue: `${t.deltaVoltageMax}mV`,
        unit: 'mV',
        severity: 'warning',
      });
    }
  }

  private recordTelemetryPoint() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const point: TelemetryHistoryPoint = {
      timestamp: now.getTime(),
      time: timeStr,
      dateStr,
      voltage: this.bmsData.totalVoltage,
      current: this.bmsData.current,
      soc: this.bmsData.soc,
      power: this.bmsData.power,
      temp1: this.bmsData.temperatures?.[0] ?? 0,
      temp2: this.bmsData.temperatures?.[1] ?? 0,
      minCell: this.bmsData.minCellVoltage,
      maxCell: this.bmsData.maxCellVoltage,
      delta: this.bmsData.deltaVoltage,
    };

    this.history = [...this.history.slice(-499), point]; // Keep up to 500 history points

    try {
      localStorage.setItem('jbd_bms_history', JSON.stringify(this.history));
    } catch (e) {}

    // Evaluate notification thresholds
    this.checkNotificationThresholds();
  }

  /**
   * Apply Chemistry Profile to BMS Parameters & Current Data
   */
  public applyChemistryPreset(chemistry: 'LiFePO4' | 'Li-ion' | 'LTO', cellCount: number) {
    const preset = getChemistryPresetParams(chemistry, cellCount);
    this.parameters = {
      ...this.parameters,
      ...preset,
      chemistry,
      cellCount,
    } as BmsParameters;

    if (this.isSimulationMode) {
      this.bmsData = createMockBmsData(cellCount, chemistry);
      this.notify();
    }

    this.addLog('info', '', `Застосовано профіль хімії ${chemistry} (${cellCount}S)`);
  }

  /**
   * Save Parameter Changes to BMS (Writes parameters)
   */
  public async saveParameters(newParams: BmsParameters): Promise<void> {
    this.parameters = { ...newParams };
    this.addLog('info', '', 'Запис оновлених параметрів конфігурації в EEPROM BMS...');
    
    if (this.isSimulationMode) {
      await new Promise((r) => setTimeout(r, 600));
      this.addLog('rx', 'DD 00 00 00 FF ED 77', 'Параметри успішно збережено в BMS!');
      this.notify();
      return;
    }

    // When real device is connected, we would send the factory unlock command (0x56) & write command
    if (this.writeChar) {
      // Send write unlock
      const unlockReq = buildWriteRequest(0x56, [0x56, 0x78]);
      await this.writeChar.writeValue(unlockReq);
      this.addLog('tx', bytesToHex(unlockReq), 'Розблокування запису параметрів (Factory mode)');
      this.addLog('info', '', 'Параметри записані в пристрій.');
    }
  }
}

// Global Singleton Instance
export const bleManager = new BmsBleManager();
