export interface CellInfo {
  id: number;
  voltage: number; // in Volts, e.g. 3.285
  isBalancing: boolean;
}

export interface ProtectionStatus {
  cellOverVoltage: boolean;
  cellUnderVoltage: boolean;
  packOverVoltage: boolean;
  packUnderVoltage: boolean;
  chargeOverTemp: boolean;
  chargeUnderTemp: boolean;
  dischargeOverTemp: boolean;
  dischargeUnderTemp: boolean;
  chargeOverCurrent: boolean;
  dischargeOverCurrent: boolean;
  shortCircuit: boolean;
  icError: boolean;
  mosfetLock: boolean;
}

export interface BmsData {
  totalVoltage: number; // Volts
  current: number; // Amps (+ for charge, - for discharge)
  power: number; // Watts
  soc: number; // Percentage 0 - 100%
  remainingCapacity: number; // Ah
  nominalCapacity: number; // Ah
  cycleCount: number;
  productionDate: string; // YYYY-MM-DD
  chargeMosEnabled: boolean;
  dischargeMosEnabled: boolean;
  temperatures: number[]; // Celcius array (NTC1, NTC2...)
  cellCount: number;
  cells: CellInfo[];
  protection: ProtectionStatus;
  maxCellVoltage: number;
  minCellVoltage: number;
  maxCellIndex: number;
  minCellIndex: number;
  deltaVoltage: number; // mV
  hardwareName: string;
  softwareVersion: string;
  lastUpdated: Date;
}

export type BatteryChemistry = 'LiFePO4' | 'Li-ion' | 'LTO' | 'Custom';

export interface BmsParameters {
  chemistry: BatteryChemistry;
  cellCount: number;
  nominalCapacity: number; // Ah
  
  // Voltages (in Volts per cell or pack)
  cellOverVoltage: number; // e.g. 3.650V
  cellOverVoltageRelease: number; // e.g. 3.550V
  cellUnderVoltage: number; // e.g. 2.500V
  cellUnderVoltageRelease: number; // e.g. 2.800V
  
  packOverVoltage: number; // e.g. 58.4V
  packUnderVoltage: number; // e.g. 40.0V
  
  // Currents (in Amps)
  chargeOverCurrent: number; // e.g. 50A
  dischargeOverCurrent: number; // e.g. 100A
  
  // Temperatures (°C)
  chargeHighTemp: number; // e.g. 55°C
  chargeLowTemp: number; // e.g. 0°C
  dischargeHighTemp: number; // e.g. 65°C
  dischargeLowTemp: number; // e.g. -20°C
  
  // Balance parameters
  balanceStartVoltage: number; // e.g. 3.400V
  balanceDeltaVoltage: number; // e.g. 15mV
  balanceOnlyCharging: boolean;
}

export interface BleLogEntry {
  id: string;
  timestamp: string;
  type: 'tx' | 'rx' | 'info' | 'error';
  command?: string;
  hex: string;
  description: string;
}

export interface TelemetryHistoryPoint {
  timestamp: number; // Epoch time in ms
  time: string;      // HH:mm:ss string
  dateStr: string;   // Full date string for historical view
  voltage: number;   // Volts
  current: number;   // Amps
  soc: number;       // %
  power: number;     // Watts
  temp1: number;     // °C
  temp2: number;     // °C
  minCell: number;   // Volts
  maxCell: number;   // Volts
  delta: number;     // mV
}

export interface NotificationThresholds {
  // SOC thresholds (%)
  socLow: number;             // e.g. 20%
  socCriticalLow: number;     // e.g. 10%
  socHigh: number;            // e.g. 95%
  socEnabled: boolean;

  // Temperature thresholds (°C)
  tempHigh: number;           // e.g. 45°C
  tempCriticalHigh: number;   // e.g. 55°C
  tempLow: number;            // e.g. 0°C
  tempEnabled: boolean;

  // Pack Voltage thresholds (V)
  voltageLow: number;         // e.g. 44.0V
  voltageHigh: number;        // e.g. 58.4V
  voltageEnabled: boolean;

  // Current thresholds (A)
  currentDischargeMax: number; // e.g. 100A
  currentChargeMax: number;    // e.g. 50A
  currentEnabled: boolean;

  // Cell Delta threshold (mV)
  deltaVoltageMax: number;     // e.g. 40mV
  deltaEnabled: boolean;

  // Sound and Desktop Preferences
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
}

export type AlertSeverity = 'info' | 'warning' | 'danger';

export interface AlertNotificationItem {
  id: string;
  timestamp: string;
  isoTime: string;
  paramKey: 'soc' | 'temp' | 'voltage' | 'current' | 'delta' | 'protection';
  title: string;
  message: string;
  currentValue: number | string;
  thresholdValue?: number | string;
  unit?: string;
  severity: AlertSeverity;
  isRead: boolean;
}
