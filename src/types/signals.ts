/**
 * Types of signals that creatures can emit and receive
 */
export enum SignalType {
  WARNING = "warning",
  FOOD_LOCATION = "food_location",
  MATING_CALL = "mating_call",
  TERRITORY_CLAIM = "territory_claim",
  GROUP_ASSEMBLY = "group_assembly",
  HELP_REQUEST = "help_request",
  ALL_CLEAR = "all_clear",
  DANGER_APPROACH = "danger_approach",
}

/**
 * Priority levels for signal processing
 */
export enum SignalPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}

/**
 * Represents a signal emitted by a creature
 */
export interface ISignal {
  id: string;
  type: SignalType;
  strength: number; // 0-1 value determining initial range
  priority: SignalPriority;
  sourceId: string;
  sourcePosition: { x: number; y: number };
  data?: any; // Additional signal-specific data
  timestamp: number;
  decayRate: number; // How quickly signal strength decays over time
  energyCost: number; // Energy cost to emit this signal
}

/**
 * Configuration for signal emission
 */
export interface ISignalEmissionConfig {
  type: SignalType;
  strength: number;
  priority?: SignalPriority;
  data?: any;
  decayRate?: number;
  energyCost?: number;
}

/**
 * Signal reception information for creatures
 */
export interface ISignalReception {
  signal: ISignal;
  receivedStrength: number; // Strength after distance/obstacle attenuation
  distance: number;
  confidence: number; // 0-1 value based on creature's ability to interpret
  timestamp: number;
}

/**
 * Signal processing result
 */
export interface ISignalProcessingResult {
  understood: boolean;
  response?: SignalType; // Optional response signal type
  actionInfluence: number; // -1 to 1, how much this affects creature behavior
  memoryImportance: number; // 0-1, how important to remember this signal
}

/**
 * Configuration for signal system
 */
export interface ISignalSystemConfig {
  maxActiveSignals: number;
  signalDecayEnabled: boolean;
  spatialHashing: boolean;
  gridSize: number; // For spatial hashing
  maxRange: number; // Maximum possible signal range
  environmentalAttenuation: number; // Global signal attenuation factor
}

/**
 * Environmental factors affecting signal propagation
 */
export interface ISignalEnvironment {
  attenuationFactor: number; // 0-1, how much environment reduces signal strength
  reflectionFactor: number; // 0-1, how much signals bounce off surfaces
  noiseFactor: number; // 0-1, random interference affecting signal clarity
}

/**
 * Spatial grid cell for signal optimization
 */
export interface ISignalGridCell {
  cellId: string;
  signals: Set<string>;
  lastUpdated: number;
}

/**
 * Signal memory entry for creatures
 */
export interface ISignalMemory {
  signalType: SignalType;
  sourceId: string;
  location: { x: number; y: number };
  strength: number;
  reliability: number; // How reliable this source has been historically
  lastReceived: number;
  responseHistory: SignalType[]; // Previous responses to this signal type
}
