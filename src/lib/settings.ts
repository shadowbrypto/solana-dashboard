import { SortingState } from '@tanstack/react-table';

// Data type change listeners
const dataTypeChangeListeners = new Set<(dataType: 'private' | 'public') => void>();

// Type definitions for all settings
export interface AppSettings {
  // Dashboard accordion states
  'dashboard-accordion-state': string[];
  
  // Protocol visibility per component
  'daily-table-hidden-protocols': string[];
  'weekly-heatmap-hidden-protocols': string[];
  'weekly-table-hidden-protocols': string[];
  
  // Category collapse states per component
  'daily-table-collapsed-categories': string[];
  'weekly-table-collapsed-categories': string[];
  'sidebar-expanded-categories': Record<string, boolean>;
  
  // Column ordering
  'daily-table-column-order': string[];
  
  // Selected metrics per component
  'protocol-data-table-metric': string;
  'weekly-heatmap-metric': string;
  'weekly-table-metric': string;
  
  // View modes
  'dashboard-active-view': 'charts' | 'data';
  
  // Table preferences
  'protocol-table-page-size': number;
  'protocol-table-sorting': SortingState;
  
  // Date preferences
  'last-selected-dates': {
    daily?: string;
    weekly?: string;
    monthly?: string;
  };
  
  // Data type preference
  'data-type-preference': 'private' | 'public';
  
  // Column visibility
  'projected-volume-hidden': boolean;

  // Sidebar state
  'sidebar-collapsed': boolean;
}

// Default values for all settings
export const DEFAULT_SETTINGS: AppSettings = {
  'dashboard-accordion-state': ['categories', 'volume'],
  'daily-table-hidden-protocols': [],
  'weekly-heatmap-hidden-protocols': [],
  'weekly-table-hidden-protocols': [],
  'daily-table-collapsed-categories': [],
  'weekly-table-collapsed-categories': [],
  'sidebar-expanded-categories': {},
  'daily-table-column-order': ['projected_volume', 'total_volume_usd', 'public_daily_users', 'daily_users', 'public_new_users', 'numberOfNewUsers', 'daily_trades', 'market_share', 'daily_growth'],
  'protocol-data-table-metric': 'total_volume_usd',
  'weekly-heatmap-metric': 'total_volume_usd',
  'weekly-table-metric': 'total_volume_usd',
  'dashboard-active-view': 'charts',
  'protocol-table-page-size': 10,
  'protocol-table-sorting': [{ id: 'date', desc: true }],
  'last-selected-dates': {},
  'data-type-preference': 'private' as const,
  'projected-volume-hidden': false,
  'sidebar-collapsed': false,
};

class SettingsManager {
  private static instance: SettingsManager;
  private cache: Partial<AppSettings> = {};

  private constructor() {
    this.loadAllSettings();
  }

  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  private getStorageKey(key: keyof AppSettings): string {
    return `solana-dashboard-${key}`;
  }

  private loadAllSettings(): void {
    // Load all settings from localStorage into cache
    Object.keys(DEFAULT_SETTINGS).forEach((key) => {
      const settingKey = key as keyof AppSettings;
      this.cache[settingKey] = this.getSettingFromStorage(settingKey);
    });
  }

  private getSettingFromStorage<K extends keyof AppSettings>(key: K): AppSettings[K] {
    try {
      const stored = localStorage.getItem(this.getStorageKey(key));
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn(`Failed to parse setting ${key} from localStorage:`, error);
    }
    return DEFAULT_SETTINGS[key];
  }

  private saveSettingToStorage<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    try {
      localStorage.setItem(this.getStorageKey(key), JSON.stringify(value));
      this.cache[key] = value;
    } catch (error) {
      console.error(`Failed to save setting ${key} to localStorage:`, error);
    }
  }

  public getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
    if (this.cache[key] !== undefined) {
      return this.cache[key] as AppSettings[K];
    }
    const value = this.getSettingFromStorage(key);
    this.cache[key] = value;
    return value;
  }

  public setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.saveSettingToStorage(key, value);
  }

  public resetSetting<K extends keyof AppSettings>(key: K): void {
    try {
      localStorage.removeItem(this.getStorageKey(key));
      this.cache[key] = DEFAULT_SETTINGS[key];
    } catch (error) {
      console.error(`Failed to reset setting ${key}:`, error);
    }
  }

  public resetAllSettings(): void {
    Object.keys(DEFAULT_SETTINGS).forEach((key) => {
      this.resetSetting(key as keyof AppSettings);
    });
  }

  public exportSettings(): Partial<AppSettings> {
    return { ...this.cache };
  }

  public importSettings(settings: Partial<AppSettings>): void {
    Object.entries(settings).forEach(([key, value]) => {
      if (key in DEFAULT_SETTINGS) {
        this.setSetting(key as keyof AppSettings, value);
      }
    });
  }
}

// Convenience hooks and functions
export const settingsManager = SettingsManager.getInstance();

// React hook for using settings (commented out - not currently used)
// export function useSetting<K extends keyof AppSettings>(key: K): [AppSettings[K], (value: AppSettings[K]) => void] {
//   const [value, setValue] = React.useState<AppSettings[K]>(() => settingsManager.getSetting(key));

//   const updateSetting = React.useCallback((newValue: AppSettings[K]) => {
//     settingsManager.setSetting(key, newValue);
//     setValue(newValue);
//   }, [key]);

//   return [value, updateSetting];
// }

// Individual setting getters/setters for convenience
export const Settings = {
  // Dashboard accordion
  getAccordionState: () => settingsManager.getSetting('dashboard-accordion-state'),
  setAccordionState: (state: string[]) => settingsManager.setSetting('dashboard-accordion-state', state),

  // Protocol visibility
  getDailyTableHiddenProtocols: () => settingsManager.getSetting('daily-table-hidden-protocols'),
  setDailyTableHiddenProtocols: (protocols: string[]) => settingsManager.setSetting('daily-table-hidden-protocols', protocols),

  getWeeklyHeatmapHiddenProtocols: () => settingsManager.getSetting('weekly-heatmap-hidden-protocols'),
  setWeeklyHeatmapHiddenProtocols: (protocols: string[]) => settingsManager.setSetting('weekly-heatmap-hidden-protocols', protocols),

  getWeeklyTableHiddenProtocols: () => settingsManager.getSetting('weekly-table-hidden-protocols'),
  setWeeklyTableHiddenProtocols: (protocols: string[]) => settingsManager.setSetting('weekly-table-hidden-protocols', protocols),

  // Category collapse states
  getDailyTableCollapsedCategories: () => settingsManager.getSetting('daily-table-collapsed-categories'),
  setDailyTableCollapsedCategories: (categories: string[]) => settingsManager.setSetting('daily-table-collapsed-categories', categories),

  getWeeklyTableCollapsedCategories: () => settingsManager.getSetting('weekly-table-collapsed-categories'),
  setWeeklyTableCollapsedCategories: (categories: string[]) => settingsManager.setSetting('weekly-table-collapsed-categories', categories),

  getSidebarExpandedCategories: () => settingsManager.getSetting('sidebar-expanded-categories'),
  setSidebarExpandedCategories: (categories: Record<string, boolean>) => settingsManager.setSetting('sidebar-expanded-categories', categories),

  // Column ordering
  getDailyTableColumnOrder: () => settingsManager.getSetting('daily-table-column-order'),
  setDailyTableColumnOrder: (order: string[]) => settingsManager.setSetting('daily-table-column-order', order),

  // Selected metrics
  getProtocolDataTableMetric: () => settingsManager.getSetting('protocol-data-table-metric'),
  setProtocolDataTableMetric: (metric: string) => settingsManager.setSetting('protocol-data-table-metric', metric),

  getWeeklyHeatmapMetric: () => settingsManager.getSetting('weekly-heatmap-metric'),
  setWeeklyHeatmapMetric: (metric: string) => settingsManager.setSetting('weekly-heatmap-metric', metric),

  getWeeklyTableMetric: () => settingsManager.getSetting('weekly-table-metric'),
  setWeeklyTableMetric: (metric: string) => settingsManager.setSetting('weekly-table-metric', metric),

  // View modes
  getDashboardActiveView: () => settingsManager.getSetting('dashboard-active-view'),
  setDashboardActiveView: (view: 'charts' | 'data') => settingsManager.setSetting('dashboard-active-view', view),

  // Table preferences
  getProtocolTablePageSize: () => settingsManager.getSetting('protocol-table-page-size'),
  setProtocolTablePageSize: (size: number) => settingsManager.setSetting('protocol-table-page-size', size),

  getProtocolTableSorting: () => settingsManager.getSetting('protocol-table-sorting'),
  setProtocolTableSorting: (sorting: SortingState) => settingsManager.setSetting('protocol-table-sorting', sorting),

  // Date preferences
  getLastSelectedDates: () => settingsManager.getSetting('last-selected-dates'),
  setLastSelectedDates: (dates: { daily?: string; weekly?: string; monthly?: string }) => settingsManager.setSetting('last-selected-dates', dates),
  setLastSelectedDate: (type: 'daily' | 'weekly' | 'monthly', date: string) => {
    const current = settingsManager.getSetting('last-selected-dates');
    settingsManager.setSetting('last-selected-dates', { ...current, [type]: date });
  },
  
  // Data type preference
  getDataTypePreference: () => settingsManager.getSetting('data-type-preference'),
  setDataTypePreference: (dataType: 'private' | 'public') => {
    const previousDataType = settingsManager.getSetting('data-type-preference');
    settingsManager.setSetting('data-type-preference', dataType);
    
    // Trigger data type change listeners
    if (previousDataType !== dataType) {
      dataTypeChangeListeners.forEach(listener => listener(dataType));
    }
  },

  // Data type change listeners
  addDataTypeChangeListener: (listener: (dataType: 'private' | 'public') => void) => {
    dataTypeChangeListeners.add(listener);
    return () => dataTypeChangeListeners.delete(listener);
  },

  // Projected volume visibility
  getIsProjectedVolumeHidden: () => settingsManager.getSetting('projected-volume-hidden'),
  setIsProjectedVolumeHidden: (hidden: boolean) => settingsManager.setSetting('projected-volume-hidden', hidden),

  // Sidebar collapsed state
  getSidebarCollapsed: () => settingsManager.getSetting('sidebar-collapsed'),
  setSidebarCollapsed: (collapsed: boolean) => settingsManager.setSetting('sidebar-collapsed', collapsed),
};

// Export default instance
export default settingsManager;