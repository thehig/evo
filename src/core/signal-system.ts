import {
  SignalType,
  SignalPriority,
  ISignal,
  ISignalEmissionConfig,
  ISignalReception,
  ISignalProcessingResult,
  ISignalSystemConfig,
  ISignalEnvironment,
  ISignalGridCell,
  ISignalMemory,
} from "../types/signals";
import { IObstacle } from "../types/obstacles";
import { ICreature } from "./interfaces";
import { v4 as uuidv4 } from "uuid";

/**
 * Default configuration for the signal system
 */
export const DEFAULT_SIGNAL_CONFIG: ISignalSystemConfig = {
  maxActiveSignals: 1000,
  signalDecayEnabled: true,
  spatialHashing: true,
  gridSize: 10,
  maxRange: 50,
  environmentalAttenuation: 0.1,
};

/**
 * Default signal emission configurations for different signal types
 */
export const DEFAULT_SIGNAL_EMISSIONS: Record<
  SignalType,
  Partial<ISignalEmissionConfig>
> = {
  [SignalType.WARNING]: {
    priority: SignalPriority.HIGH,
    decayRate: 0.05,
    energyCost: 5,
  },
  [SignalType.DANGER_APPROACH]: {
    priority: SignalPriority.CRITICAL,
    decayRate: 0.08,
    energyCost: 8,
  },
  [SignalType.FOOD_LOCATION]: {
    priority: SignalPriority.NORMAL,
    decayRate: 0.02,
    energyCost: 3,
  },
  [SignalType.MATING_CALL]: {
    priority: SignalPriority.NORMAL,
    decayRate: 0.03,
    energyCost: 4,
  },
  [SignalType.TERRITORY_CLAIM]: {
    priority: SignalPriority.HIGH,
    decayRate: 0.01,
    energyCost: 6,
  },
  [SignalType.GROUP_ASSEMBLY]: {
    priority: SignalPriority.HIGH,
    decayRate: 0.04,
    energyCost: 5,
  },
  [SignalType.HELP_REQUEST]: {
    priority: SignalPriority.HIGH,
    decayRate: 0.06,
    energyCost: 7,
  },
  [SignalType.ALL_CLEAR]: {
    priority: SignalPriority.LOW,
    decayRate: 0.03,
    energyCost: 2,
  },
};

/**
 * Signal system managing creature communication
 */
export class SignalSystem {
  private config: ISignalSystemConfig;
  private activeSignals: Map<string, ISignal> = new Map();
  private spatialGrid: Map<string, ISignalGridCell> = new Map();
  private currentTime: number = 0;
  private obstacles: IObstacle[] = [];
  private environment: ISignalEnvironment = {
    attenuationFactor: 0.1,
    reflectionFactor: 0.05,
    noiseFactor: 0.02,
  };

  constructor(config: Partial<ISignalSystemConfig> = {}) {
    this.config = { ...DEFAULT_SIGNAL_CONFIG, ...config };
  }

  /**
   * Update the signal system for one tick
   */
  update(deltaTime: number): void {
    this.currentTime += deltaTime;

    if (this.config.signalDecayEnabled) {
      this.updateSignalDecay();
    }

    this.cleanupExpiredSignals();

    if (this.config.spatialHashing) {
      this.updateSpatialGrid();
    }
  }

  /**
   * Emit a signal from a creature
   */
  emitSignal(
    creature: ICreature,
    config: ISignalEmissionConfig
  ): string | null {
    // Check if creature has enough energy
    const energyCost =
      config.energyCost ??
      DEFAULT_SIGNAL_EMISSIONS[config.type]?.energyCost ??
      3;
    if (creature.energy < energyCost) {
      return null;
    }

    // Create signal with defaults
    const defaults = DEFAULT_SIGNAL_EMISSIONS[config.type] ?? {};
    const signal: ISignal = {
      id: uuidv4(),
      type: config.type,
      strength: Math.max(0, Math.min(1, config.strength)),
      priority: config.priority ?? defaults.priority ?? SignalPriority.NORMAL,
      sourceId: creature.id,
      sourcePosition: { ...creature.position },
      data: config.data,
      timestamp: this.currentTime,
      decayRate: config.decayRate ?? defaults.decayRate ?? 0.03,
      energyCost,
    };

    // Deduct energy cost
    creature.energy -= energyCost;

    // Add to active signals
    this.activeSignals.set(signal.id, signal);

    // Add to spatial grid if enabled
    if (this.config.spatialHashing) {
      this.addSignalToGrid(signal);
    }

    // Limit total active signals
    this.limitActiveSignals();

    return signal.id;
  }

  /**
   * Get all signals received by a creature at their current position
   */
  getSignalsForCreature(creature: ICreature): ISignalReception[] {
    const receptions: ISignalReception[] = [];
    const creaturePosition = creature.position;

    const nearbySignals = this.config.spatialHashing
      ? this.getSignalsInRadius(creaturePosition, this.config.maxRange)
      : Array.from(this.activeSignals.values());

    for (const signal of nearbySignals) {
      // Skip own signals
      if (signal.sourceId === creature.id) {
        continue;
      }

      const distance = this.calculateDistance(
        creaturePosition,
        signal.sourcePosition
      );
      const receivedStrength = this.calculateSignalStrength(
        signal,
        distance,
        creaturePosition
      );

      // Only process signals strong enough to be detected
      if (receivedStrength > 0.01) {
        const confidence = this.calculateSignalConfidence(
          creature,
          signal,
          receivedStrength
        );

        receptions.push({
          signal,
          receivedStrength,
          distance,
          confidence,
          timestamp: this.currentTime,
        });
      }
    }

    // Sort by strength (strongest first)
    return receptions.sort((a, b) => b.receivedStrength - a.receivedStrength);
  }

  /**
   * Process a signal reception and determine creature response
   */
  processSignalReception(
    creature: ICreature,
    reception: ISignalReception
  ): ISignalProcessingResult {
    const signal = reception.signal;
    const baseInfluence = reception.receivedStrength * reception.confidence;

    // Different signal types have different processing logic
    switch (signal.type) {
      case SignalType.WARNING:
      case SignalType.DANGER_APPROACH:
        return {
          understood: reception.confidence > 0.5,
          response: SignalType.ALL_CLEAR,
          actionInfluence: -baseInfluence * 0.8, // Negative influence (flee)
          memoryImportance: Math.min(1, baseInfluence * 1.2),
        };

      case SignalType.FOOD_LOCATION:
        return {
          understood: reception.confidence > 0.3,
          actionInfluence: baseInfluence * 0.6, // Positive influence (approach)
          memoryImportance: Math.min(1, baseInfluence),
        };

      case SignalType.MATING_CALL:
        // Only respond if creature is mature and has sufficient energy
        const canMate = creature.energy > 50 && creature.age > 100;
        return {
          understood: reception.confidence > 0.4 && canMate,
          response: canMate ? SignalType.MATING_CALL : undefined,
          actionInfluence: canMate ? baseInfluence * 0.7 : 0,
          memoryImportance: canMate ? baseInfluence * 0.8 : 0.1,
        };

      case SignalType.GROUP_ASSEMBLY:
        return {
          understood: reception.confidence > 0.6,
          actionInfluence: baseInfluence * 0.5,
          memoryImportance: baseInfluence * 0.7,
        };

      case SignalType.HELP_REQUEST:
        return {
          understood: reception.confidence > 0.5,
          response: SignalType.GROUP_ASSEMBLY,
          actionInfluence: baseInfluence * 0.4,
          memoryImportance: baseInfluence * 0.9,
        };

      default:
        return {
          understood: reception.confidence > 0.5,
          actionInfluence: baseInfluence * 0.3,
          memoryImportance: baseInfluence * 0.5,
        };
    }
  }

  /**
   * Set obstacles that affect signal propagation
   */
  setObstacles(obstacles: IObstacle[]): void {
    this.obstacles = obstacles;
  }

  /**
   * Set environmental factors affecting signal propagation
   */
  setEnvironment(environment: Partial<ISignalEnvironment>): void {
    this.environment = { ...this.environment, ...environment };
  }

  /**
   * Get all active signals
   */
  getActiveSignals(): ReadonlyArray<ISignal> {
    return Array.from(this.activeSignals.values());
  }

  /**
   * Clear all signals
   */
  clearSignals(): void {
    this.activeSignals.clear();
    this.spatialGrid.clear();
  }

  /**
   * Get current configuration
   */
  getConfig(): ISignalSystemConfig {
    return { ...this.config };
  }

  // Private helper methods

  private updateSignalDecay(): void {
    for (const signal of this.activeSignals.values()) {
      signal.strength *= 1 - signal.decayRate;
    }
  }

  private cleanupExpiredSignals(): void {
    const signalsToRemove: string[] = [];

    for (const [id, signal] of this.activeSignals.entries()) {
      if (
        signal.strength < 0.001 ||
        this.currentTime - signal.timestamp > 1000
      ) {
        signalsToRemove.push(id);
      }
    }

    for (const id of signalsToRemove) {
      this.activeSignals.delete(id);
      this.removeSignalFromGrid(id);
    }
  }

  private limitActiveSignals(): void {
    if (this.activeSignals.size <= this.config.maxActiveSignals) {
      return;
    }

    // Remove oldest, weakest signals first
    const signals = Array.from(this.activeSignals.values()).sort(
      (a, b) => a.strength * a.timestamp - b.strength * b.timestamp
    );

    const toRemove = signals.slice(
      0,
      this.activeSignals.size - this.config.maxActiveSignals
    );
    for (const signal of toRemove) {
      this.activeSignals.delete(signal.id);
      this.removeSignalFromGrid(signal.id);
    }
  }

  private calculateDistance(
    pos1: { x: number; y: number },
    pos2: { x: number; y: number }
  ): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateSignalStrength(
    signal: ISignal,
    distance: number,
    receiverPosition: { x: number; y: number }
  ): number {
    // Base attenuation using inverse square law
    const baseAttenuation = 1 / (1 + distance * distance * 0.01);
    let strength = signal.strength * baseAttenuation;

    // Apply environmental attenuation
    strength *= 1 - this.environment.attenuationFactor;

    // Apply obstacle attenuation
    strength *= this.calculateObstacleAttenuation(
      signal.sourcePosition,
      receiverPosition
    );

    // Add environmental noise
    const noise = (Math.random() - 0.5) * this.environment.noiseFactor;
    strength += noise;

    return Math.max(0, Math.min(1, strength));
  }

  private calculateObstacleAttenuation(
    sourcePos: { x: number; y: number },
    receiverPos: { x: number; y: number }
  ): number {
    let attenuation = 1.0;

    // Simple line-of-sight obstacle checking
    for (const obstacle of this.obstacles) {
      if (this.lineIntersectsObstacle(sourcePos, receiverPos, obstacle)) {
        attenuation *= 1 - obstacle.properties.signalBlocking;
      }
    }

    return attenuation;
  }

  private lineIntersectsObstacle(
    start: { x: number; y: number },
    end: { x: number; y: number },
    obstacle: IObstacle
  ): boolean {
    // Improved line-rectangle intersection test using line segment intersection
    const obstacleLeft = obstacle.position.x;
    const obstacleRight = obstacle.position.x + obstacle.dimensions.width;
    const obstacleTop = obstacle.position.y;
    const obstacleBottom = obstacle.position.y + obstacle.dimensions.height;

    // Check if either point is inside the obstacle
    if (
      (start.x >= obstacleLeft &&
        start.x <= obstacleRight &&
        start.y >= obstacleTop &&
        start.y <= obstacleBottom) ||
      (end.x >= obstacleLeft &&
        end.x <= obstacleRight &&
        end.y >= obstacleTop &&
        end.y <= obstacleBottom)
    ) {
      return true;
    }

    // Check if line segment intersects any of the four rectangle edges
    const lineSegmentIntersectsEdge = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      x3: number,
      y3: number,
      x4: number,
      y4: number
    ): boolean => {
      const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (Math.abs(denominator) < 1e-10) return false; // Lines are parallel

      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
      const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

      return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    };

    // Check intersection with all four edges of the rectangle
    return (
      lineSegmentIntersectsEdge(
        start.x,
        start.y,
        end.x,
        end.y,
        obstacleLeft,
        obstacleTop,
        obstacleRight,
        obstacleTop
      ) || // Top edge
      lineSegmentIntersectsEdge(
        start.x,
        start.y,
        end.x,
        end.y,
        obstacleRight,
        obstacleTop,
        obstacleRight,
        obstacleBottom
      ) || // Right edge
      lineSegmentIntersectsEdge(
        start.x,
        start.y,
        end.x,
        end.y,
        obstacleRight,
        obstacleBottom,
        obstacleLeft,
        obstacleBottom
      ) || // Bottom edge
      lineSegmentIntersectsEdge(
        start.x,
        start.y,
        end.x,
        end.y,
        obstacleLeft,
        obstacleBottom,
        obstacleLeft,
        obstacleTop
      ) // Left edge
    );
  }

  private calculateSignalConfidence(
    creature: ICreature,
    signal: ISignal,
    receivedStrength: number
  ): number {
    // Base confidence from signal strength
    let confidence = receivedStrength;

    // Adjust based on creature's experience with this signal type
    // This would integrate with creature memory system when available

    // Adjust based on signal priority
    switch (signal.priority) {
      case SignalPriority.CRITICAL:
        confidence *= 1.2;
        break;
      case SignalPriority.HIGH:
        confidence *= 1.1;
        break;
      case SignalPriority.LOW:
        confidence *= 0.9;
        break;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  // Spatial grid methods

  private getCellKey(position: { x: number; y: number }): string {
    const cellX = Math.floor(position.x / this.config.gridSize);
    const cellY = Math.floor(position.y / this.config.gridSize);
    return `${cellX},${cellY}`;
  }

  private addSignalToGrid(signal: ISignal): void {
    const cellKey = this.getCellKey(signal.sourcePosition);

    if (!this.spatialGrid.has(cellKey)) {
      this.spatialGrid.set(cellKey, {
        cellId: cellKey,
        signals: new Set(),
        lastUpdated: this.currentTime,
      });
    }

    this.spatialGrid.get(cellKey)!.signals.add(signal.id);
  }

  private removeSignalFromGrid(signalId: string): void {
    for (const cell of this.spatialGrid.values()) {
      cell.signals.delete(signalId);
    }
  }

  private updateSpatialGrid(): void {
    // Remove empty cells and update timestamps
    const cellsToRemove: string[] = [];

    for (const [cellKey, cell] of this.spatialGrid.entries()) {
      cell.lastUpdated = this.currentTime;

      if (cell.signals.size === 0) {
        cellsToRemove.push(cellKey);
      }
    }

    for (const cellKey of cellsToRemove) {
      this.spatialGrid.delete(cellKey);
    }
  }

  private getSignalsInRadius(
    position: { x: number; y: number },
    radius: number
  ): ISignal[] {
    const signals: ISignal[] = [];
    const cellRadius = Math.ceil(radius / this.config.gridSize);

    const centerX = Math.floor(position.x / this.config.gridSize);
    const centerY = Math.floor(position.y / this.config.gridSize);

    // Check all cells in radius
    for (let x = centerX - cellRadius; x <= centerX + cellRadius; x++) {
      for (let y = centerY - cellRadius; y <= centerY + cellRadius; y++) {
        const cellKey = `${x},${y}`;
        const cell = this.spatialGrid.get(cellKey);

        if (cell) {
          for (const signalId of cell.signals) {
            const signal = this.activeSignals.get(signalId);
            if (signal) {
              const distance = this.calculateDistance(
                position,
                signal.sourcePosition
              );
              if (distance <= radius) {
                signals.push(signal);
              }
            }
          }
        }
      }
    }

    return signals;
  }
}
