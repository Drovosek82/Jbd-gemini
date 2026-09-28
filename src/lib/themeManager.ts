// Theme Manager (Light / Dark Theme Toggle)

export type Theme = 'dark' | 'light';

type Listener = () => void;

class ThemeManager {
  private currentTheme: Theme = 'dark';
  private listeners: Set<Listener> = new Set();

  constructor() {
    const saved = localStorage.getItem('jbd_app_theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') {
      this.currentTheme = saved;
    } else {
      // Default to dark theme for hardware / BMS dashboard
      this.currentTheme = 'dark';
    }
    this.applyThemeToDOM();
  }

  public get theme(): Theme {
    return this.currentTheme;
  }

  public setTheme(theme: Theme) {
    if (this.currentTheme === theme) return;
    this.currentTheme = theme;
    localStorage.setItem('jbd_app_theme', theme);
    this.applyThemeToDOM();
    this.notify();
  }

  public toggleTheme() {
    this.setTheme(this.currentTheme === 'dark' ? 'light' : 'dark');
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private applyThemeToDOM() {
    const root = document.documentElement;
    if (this.currentTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const themeManager = new ThemeManager();
