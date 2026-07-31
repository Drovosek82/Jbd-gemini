import { BmsData, ProtectionStatus, BmsParameters } from '../types/bms';

// JBD BMS Constants
export const JBD_SERVICE_UUID = '0000ff00-0000-1000-8000-00805f9b34fb';
export const JBD_NOTIFY_CHAR_UUID = '0000ff01-0000-1000-8000-00805f9b34fb';
export const JBD_WRITE_CHAR_UUID = '0000ff02-0000-1000-8000-00805f9b34fb';

export const JBD_COMMANDS = {
  READ_BASIC_INFO: 0x03,
  READ_CELL_VOLTAGES: 0x04,
  READ_HARDWARE_NAME: 0x05,
  WRITE_MOS_CONTROL: 0xE0,
  ENTER_FACTORY_MODE: 0x56,
  EXIT_FACTORY_MODE: 0x56,
} as const;

/**
 * Calculates JBD checksum for command frames.
 * Checksum formula for outgoing frame [0xDD, 0xA5, CMD, LEN, DATA...]:
 * 0x10000 - sum(CMD + LEN + DATA)
 */
export function calculateChecksum(cmd: number, length: number, data: number[] = []): { hi: number; lo: number } {
  let sum = cmd + length;
  for (const byte of data) {
    sum += byte;
  }
  const checksum = (0x10000 - sum) & 0xFFFF;
  return {
    hi: (checksum >> 8) & 0xFF,
    lo: checksum & 0xFF,
  };
}

/**
 * Builds a JBD read request packet.
 * Frame: [0xDD, 0xA5, CMD, 0x00, CS_HI, CS_LO, 0x77]
 */
export function buildReadRequest(cmd: number): Uint8Array {
  const { hi, lo } = calculateChecksum(cmd, 0, []);
  return new Uint8Array([0xDD, 0xA5, cmd, 0x00, hi, lo, 0x77]);
}

/**
 * Builds a JBD write packet (e.g. for MOS control or parameters).
 * Frame: [0xDD, 0x5A, REG, LEN, DATA..., CS_HI, CS_LO, 0x77]
 */
export function buildWriteRequest(reg: number, data: number[]): Uint8Array {
  const len = data.length;
  const { hi, lo } = calculateChecksum(reg, len, data);
  return new Uint8Array([0xDD, 0x5A, reg, len, ...data, hi, lo, 0x77]);
}

/**
 * Converts byte array to formatted HEX string for logging.
 */
export function bytesToHex(bytes: Uint8Array | number[]): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
}

/**
 * Parses JBD Protection Status 16-bit mask
 */
export function parseProtectionStatus(protectionWord: number): ProtectionStatus {
  return {
    cellOverVoltage: (protectionWord & (1 << 0)) !== 0,
    cellUnderVoltage: (protectionWord & (1 << 1)) !== 0,
    packOverVoltage: (protectionWord & (1 << 2)) !== 0,
    packUnderVoltage: (protectionWord & (1 << 3)) !== 0,
    chargeOverTemp: (protectionWord & (1 << 4)) !== 0,
    chargeUnderTemp: (protectionWord & (1 << 5)) !== 0,
    dischargeOverTemp: (protectionWord & (1 << 6)) !== 0,
    dischargeUnderTemp: (protectionWord & (1 << 7)) !== 0,
    chargeOverCurrent: (protectionWord & (1 << 8)) !== 0,
    dischargeOverCurrent: (protectionWord & (1 << 9)) !== 0,
    shortCircuit: (protectionWord & (1 << 10)) !== 0,
    icError: (protectionWord & (1 << 11)) !== 0,
    mosfetLock: (protectionWord & (1 << 12)) !== 0,
  };
}

/**
 * Parses basic info packet (0x03 response data bytes)
 */
export function parseBasicInfoResponse(data: Uint8Array, currentBmsData?: Partial<BmsData>): Partial<BmsData> {
  // Format: [0xDD, 0x03, STATUS, LENGTH, DATA_BYTES..., CS_HI, CS_LO, 0x77]
  // Minimum length check
  if (data.length < 24) return {};
  
  const payload = data.subarray(4, data.length - 3); // data payload
  if (payload.length < 20) return {};

  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

  const totalVoltage = view.getUint16(0, false) / 100; // 10mV resolution -> Volts
  const rawCurrent = view.getInt16(2, false); // 10mA signed int -> Amps
  const current = rawCurrent / 100;
  const remainingCapacity = view.getUint16(4, false) / 100; // 10mAh -> Ah
  const nominalCapacity = view.getUint16(6, false) / 100; // 10mAh -> Ah
  const cycleCount = view.getUint16(8, false);

  const prodDateRaw = view.getUint16(10, false);
  const year = 2000 + ((prodDateRaw >> 9) & 0x7F);
  const month = (prodDateRaw >> 5) & 0x0F;
  const day = prodDateRaw & 0x1F;
  const productionDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const balanceStatusLow = view.getUint16(12, false);
  const balanceStatusHigh = view.getUint16(14, false);
  const balanceMask = (balanceStatusHigh << 16) | balanceStatusLow;

  const protectionWord = view.getUint16(16, false);
  const protection = parseProtectionStatus(protectionWord);

  const softwareVersionByte = payload[18];
  const softwareVersion = `v${(softwareVersionByte >> 4)}.${softwareVersionByte & 0x0F}`;

  const soc = payload[19];

  const fetStatus = payload[20];
  const chargeMosEnabled = (fetStatus & 0x01) !== 0;
  const dischargeMosEnabled = (fetStatus & 0x02) !== 0;

  const ntcCount = payload[21];
  const temperatures: number[] = [];
  let offset = 22;
  for (let i = 0; i < ntcCount && offset + 1 < payload.length; i++) {
    const rawTempK = view.getUint16(offset, false);
    const tempC = Math.round((rawTempK - 2731) / 10 * 10) / 10;
    temperatures.push(tempC);
    offset += 2;
  }

  const power = Math.round(totalVoltage * current * 10) / 10;

  // Update cell balancing states if cells array exists
  let cells = currentBmsData?.cells ? [...currentBmsData.cells] : [];
  if (cells.length > 0) {
    cells = cells.map((cell, idx) => ({
      ...cell,
      isBalancing: (balanceMask & (1 << idx)) !== 0,
    }));
  }

  return {
    totalVoltage,
    current,
    power,
    remainingCapacity,
    nominalCapacity,
    cycleCount,
    productionDate,
    protection,
    softwareVersion,
    soc,
    chargeMosEnabled,
    dischargeMosEnabled,
    temperatures,
    cells,
    lastUpdated: new Date(),
  };
}

/**
 * Parses cell voltages packet (0x04 response data bytes)
 */
export function parseCellVoltagesResponse(data: Uint8Array, currentBmsData?: Partial<BmsData>): Partial<BmsData> {
  if (data.length < 8) return {};
  
  const payload = data.subarray(4, data.length - 3);
  const cellCount = Math.floor(payload.length / 2);
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

  const cells = [];
  let maxV = 0;
  let minV = 99;
  let maxIdx = 0;
  let minIdx = 0;

  for (let i = 0; i < cellCount; i++) {
    const vMv = view.getUint16(i * 2, false);
    const vVal = vMv / 1000;
    
    if (vVal > maxV) {
      maxV = vVal;
      maxIdx = i;
    }
    if (vVal < minV) {
      minV = vVal;
      minIdx = i;
    }

    const prevCell = currentBmsData?.cells?.[i];
    cells.push({
      id: i + 1,
      voltage: vVal,
      isBalancing: prevCell?.isBalancing || false,
    });
  }

  const deltaVoltage = cellCount > 0 ? Math.round((maxV - minV) * 1000) : 0;

  return {
    cellCount,
    cells,
    maxCellVoltage: maxV,
    minCellVoltage: minV,
    maxCellIndex: maxIdx + 1,
    minCellIndex: minIdx + 1,
    deltaVoltage,
    lastUpdated: new Date(),
  };
}

/**
 * Parses hardware name string (0x05 response payload)
 */
export function parseHardwareNameResponse(data: Uint8Array): string {
  if (data.length < 8) return 'JBD-BMS';
  const payload = data.subarray(4, data.length - 3);
  const textDecoder = new TextDecoder('ascii');
  return textDecoder.decode(payload).trim() || 'JBD Smart BMS';
}

/**
 * Chemistry Presets helper
 */
export function getChemistryPresetParams(chemistry: 'LiFePO4' | 'Li-ion' | 'LTO', cellCount: number): Partial<BmsParameters> {
  switch (chemistry) {
    case 'LiFePO4':
      return {
        chemistry: 'LiFePO4',
        cellCount,
        cellOverVoltage: 3.650,
        cellOverVoltageRelease: 3.550,
        cellUnderVoltage: 2.500,
        cellUnderVoltageRelease: 2.800,
        packOverVoltage: Math.round(3.650 * cellCount * 10) / 10,
        packUnderVoltage: Math.round(2.500 * cellCount * 10) / 10,
        balanceStartVoltage: 3.400,
        balanceDeltaVoltage: 15,
        chargeHighTemp: 55,
        chargeLowTemp: 0,
        dischargeHighTemp: 65,
        dischargeLowTemp: -20,
      };
    case 'Li-ion':
      return {
        chemistry: 'Li-ion',
        cellCount,
        cellOverVoltage: 4.200,
        cellOverVoltageRelease: 4.100,
        cellUnderVoltage: 3.000,
        cellUnderVoltageRelease: 3.200,
        packOverVoltage: Math.round(4.200 * cellCount * 10) / 10,
        packUnderVoltage: Math.round(3.000 * cellCount * 10) / 10,
        balanceStartVoltage: 4.000,
        balanceDeltaVoltage: 20,
        chargeHighTemp: 45,
        chargeLowTemp: 0,
        dischargeHighTemp: 60,
        dischargeLowTemp: -10,
      };
    case 'LTO':
      return {
        chemistry: 'LTO',
        cellCount,
        cellOverVoltage: 2.800,
        cellOverVoltageRelease: 2.700,
        cellUnderVoltage: 1.800,
        cellUnderVoltageRelease: 2.000,
        packOverVoltage: Math.round(2.800 * cellCount * 10) / 10,
        packUnderVoltage: Math.round(1.800 * cellCount * 10) / 10,
        balanceStartVoltage: 2.500,
        balanceDeltaVoltage: 10,
        chargeHighTemp: 50,
        chargeLowTemp: -20,
        dischargeHighTemp: 60,
        dischargeLowTemp: -30,
      };
  }
}
