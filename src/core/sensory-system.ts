/**
 * Creature Sensory System
 *
 * This module implements the sensory system for creatures to perceive their environment,
 * including vision, entity classification, distance encoding, and signal detection.
 */

import { IEntity, ICreature } from "./interfaces";
import { World } from "../world/World";
import { Position, TerrainType, ResourceType } from "../world/types";
import {
  EntityType,
  VisionCell,
  MemoryData,
  ISensoryData,
  VisionConfig,
  MemoryConfig,
  CreatureAction,
} from "./creature-types";

/**
 * Sensory system for creatures
 */
export class SensorySystem {
  private world: World;

  constructor(world: World) {
    this.world = world;
  }

  /**
   * Gather complete sensory data for a creature
   */
  gatherSensoryData(
    creature: ICreature,
    visionConfig: VisionConfig,
    memoryConfig: MemoryConfig,
    _signalRange: number,
    energyHistory: number[],
    actionHistory: CreatureAction[],
    encounterHistory: EntityType[],
    signalHistory: number[],
    broadcastSignal: number
  ): ISensoryData {
    const position = creature.position;
    const worldDimensions = {
      width: this.world.width,
      height: this.world.height,
    };

    // Gather vision data
    const vision = this.generateVisionData(creature, visionConfig);

    // Prepare memory data
    const memory = this.prepareMemoryData(
      energyHistory,
      actionHistory,
      encounterHistory,
      signalHistory,
      memoryConfig
    );

    // Normalize position
    const positionX = position.x / worldDimensions.width;
    const positionY = position.y / worldDimensions.height;

    // Normalize age (assuming maxAge is available through creature config)
    const ageNormalized = Math.min(1.0, creature.age / 10000); // Default max age

    return {
      energy: creature.energy,
      ageNormalized,
      positionX: Math.max(0, Math.min(1.0, positionX)),
      positionY: Math.max(0, Math.min(1.0, positionY)),
      vision,
      hunger: Math.max(0, 1.0 - creature.energy), // Simple hunger calculation
      memory,
      currentSignal: broadcastSignal,
    };
  }

  /**
   * Generate vision data for a creature
   */
  private generateVisionData(
    creature: ICreature,
    visionConfig: VisionConfig
  ): VisionCell[] {
    const vision: VisionCell[] = [];
    const creaturePos = creature.position;
    const range = visionConfig.range;

    console.log(
      `Generating vision for creature at (${creaturePos.x}, ${creaturePos.y}) with range ${range}, maxDistance ${visionConfig.maxDistance}`
    );

    // Scan the vision grid
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        // Skip center cell (creature's own position)
        if (dx === 0 && dy === 0) {
          continue;
        }

        // Skip diagonal cells if not included
        if (!visionConfig.includeDiagonals && dx !== 0 && dy !== 0) {
          continue;
        }

        const targetX = creaturePos.x + dx;
        const targetY = creaturePos.y + dy;

        // Check if position is within world bounds
        if (
          targetX < 0 ||
          targetX >= this.world.width ||
          targetY < 0 ||
          targetY >= this.world.height
        ) {
          // Out of bounds - treat as obstacle
          console.log(
            `Cell (${dx}, ${dy}) -> (${targetX}, ${targetY}): OUT OF BOUNDS`
          );
          vision.push(
            this.createVisionCell(EntityType.OBSTACLE, dx, dy, range, 0)
          );
          continue;
        }

        // Calculate distance
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > visionConfig.maxDistance) {
          console.log(
            `Cell (${dx}, ${dy}): distance ${distance.toFixed(2)} > ${
              visionConfig.maxDistance
            } - SKIPPED`
          );
          continue; // Too far to see
        }

        console.log(
          `Cell (${dx}, ${dy}) -> (${targetX}, ${targetY}): distance ${distance.toFixed(
            2
          )} - INCLUDED`
        );

        // Analyze what's at this position
        const visionCell = this.analyzePosition(
          { x: targetX, y: targetY },
          creature,
          dx,
          dy,
          range
        );

        vision.push(visionCell);
      }
    }

    console.log(`Total vision cells generated: ${vision.length}`);
    return vision;
  }

  /**
   * Analyze what's at a specific position and create a vision cell
   */
  private analyzePosition(
    position: Position,
    observer: ICreature,
    relativeX: number,
    relativeY: number,
    visionRange: number
  ): VisionCell {
    // Get entities at this position
    const entitiesAtPosition = this.world.getEntitiesInRadius(position, 0.1);

    // Check for creatures first
    for (const entity of entitiesAtPosition) {
      if (this.isCreature(entity) && entity.id !== observer.id) {
        const creature = entity as ICreature;
        const entityType = this.classifyCreature(creature, observer);
        const signalStrength = this.detectSignal(creature, observer);

        return this.createVisionCell(
          entityType,
          relativeX,
          relativeY,
          visionRange,
          signalStrength
        );
      }
    }

    // Check for other entities (food, obstacles, etc.)
    if (entitiesAtPosition.length > 0) {
      // For now, classify non-creature entities as unknown
      // This can be expanded when more entity types are implemented
      return this.createVisionCell(
        EntityType.UNKNOWN,
        relativeX,
        relativeY,
        visionRange,
        0
      );
    }

    // Check terrain and resources
    const terrain = this.world.getTerrainAt(position.x, position.y);
    const resources = this.world.getResourcesAt(position.x, position.y);
    const hasObstacle = this.world.hasObstacleAt(position.x, position.y);

    if (hasObstacle) {
      return this.createVisionCell(
        EntityType.OBSTACLE,
        relativeX,
        relativeY,
        visionRange,
        0
      );
    }

    // Check for resources
    if (resources.length > 0) {
      const entityType = this.classifyResource(resources[0].type);
      return this.createVisionCell(
        entityType,
        relativeX,
        relativeY,
        visionRange,
        0
      );
    }

    // Check terrain
    if (terrain) {
      const entityType = this.classifyTerrain(terrain);
      return this.createVisionCell(
        entityType,
        relativeX,
        relativeY,
        visionRange,
        0
      );
    }

    // Empty space
    return this.createVisionCell(
      EntityType.EMPTY,
      relativeX,
      relativeY,
      visionRange,
      0
    );
  }

  /**
   * Create a vision cell with normalized values
   */
  private createVisionCell(
    entityType: EntityType,
    relativeX: number,
    relativeY: number,
    visionRange: number,
    signalStrength: number
  ): VisionCell {
    const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
    const normalizedDistance = Math.min(1.0, distance / visionRange);

    return {
      entityType,
      distance: normalizedDistance,
      relativeX: relativeX / visionRange,
      relativeY: relativeY / visionRange,
      signalStrength,
    };
  }

  /**
   * Classify a creature as friend or enemy
   */
  private classifyCreature(
    creature: ICreature,
    observer: ICreature
  ): EntityType {
    // For now, use a simple classification based on energy levels
    // This can be expanded with more sophisticated logic

    if (creature.energy > observer.energy * 1.2) {
      return EntityType.CREATURE_ENEMY; // Stronger creature = potential threat
    } else if (creature.energy < observer.energy * 0.8) {
      return EntityType.CREATURE_FRIEND; // Weaker creature = potential ally
    } else {
      return EntityType.CREATURE_ENEMY; // Similar strength = competition
    }
  }

  /**
   * Classify a resource type
   */
  private classifyResource(resourceType: ResourceType): EntityType {
    switch (resourceType) {
      case ResourceType.FOOD:
        return EntityType.FOOD;
      case ResourceType.WATER:
        return EntityType.WATER;
      case ResourceType.SHELTER:
        return EntityType.SHELTER;
      case ResourceType.MINERAL:
        return EntityType.MINERAL;
      default:
        return EntityType.UNKNOWN;
    }
  }

  /**
   * Classify terrain type
   */
  private classifyTerrain(terrain: TerrainType): EntityType {
    switch (terrain) {
      case TerrainType.WATER:
        return EntityType.WATER;
      case TerrainType.MOUNTAIN:
        return EntityType.OBSTACLE;
      case TerrainType.FOREST:
        return EntityType.SHELTER;
      default:
        return EntityType.EMPTY;
    }
  }

  /**
   * Detect signal strength from another creature
   */
  private detectSignal(creature: ICreature, observer: ICreature): number {
    // Calculate distance between creatures
    const dx = creature.position.x - observer.position.x;
    const dy = creature.position.y - observer.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // For now, assume all creatures broadcast a signal of 1.0
    // This will be expanded when the communication system is implemented
    const signalStrength = 1.0;
    const signalRange = 5.0; // Default signal range

    if (distance > signalRange) {
      return 0; // Too far to detect signal
    }

    // Signal strength decreases with distance
    const normalizedDistance = distance / signalRange;
    return signalStrength * (1.0 - normalizedDistance);
  }

  /**
   * Prepare memory data with proper sizing
   */
  private prepareMemoryData(
    energyHistory: number[],
    actionHistory: CreatureAction[],
    encounterHistory: EntityType[],
    signalHistory: number[],
    memoryConfig: MemoryConfig
  ): MemoryData {
    return {
      recentEnergyChanges: this.normalizeEnergyChanges(
        energyHistory.slice(-memoryConfig.energyHistorySize)
      ),
      recentActions: actionHistory.slice(-memoryConfig.actionHistorySize),
      recentEncounters: encounterHistory.slice(
        -memoryConfig.encounterHistorySize
      ),
      recentSignals: signalHistory.slice(-memoryConfig.signalHistorySize),
    };
  }

  /**
   * Normalize energy changes to relative values
   */
  private normalizeEnergyChanges(energyHistory: number[]): number[] {
    if (energyHistory.length < 2) {
      return [];
    }

    const changes: number[] = [];
    for (let i = 1; i < energyHistory.length; i++) {
      const change = energyHistory[i] - energyHistory[i - 1];
      changes.push(Math.max(-1.0, Math.min(1.0, change * 10))); // Scale and clamp
    }

    return changes;
  }

  /**
   * Convert sensory data to neural network inputs
   */
  convertToNeuralInputs(
    sensoryData: ISensoryData,
    memoryConfig?: MemoryConfig
  ): number[] {
    const inputs: number[] = [];

    // Basic creature state
    inputs.push(sensoryData.energy);
    inputs.push(sensoryData.ageNormalized);
    inputs.push(sensoryData.positionX);
    inputs.push(sensoryData.positionY);
    inputs.push(sensoryData.hunger);
    inputs.push(sensoryData.currentSignal);

    // Vision data - flatten vision cells
    for (const cell of sensoryData.vision) {
      inputs.push(this.encodeEntityType(cell.entityType));
      inputs.push(cell.distance);
      inputs.push(cell.relativeX);
      inputs.push(cell.relativeY);
      inputs.push(cell.signalStrength);
    }

    // Memory data - pad arrays to expected size if memoryConfig is provided
    if (memoryConfig) {
      // Energy changes - pad to (energyHistorySize - 1)
      const energyChanges = [...sensoryData.memory.recentEnergyChanges];
      const expectedEnergyChanges = memoryConfig.energyHistorySize - 1;
      while (energyChanges.length < expectedEnergyChanges) {
        energyChanges.push(0.0); // Pad with zeros
      }
      inputs.push(...energyChanges);

      // Recent actions - pad to actionHistorySize
      const recentActions = [...sensoryData.memory.recentActions];
      const expectedActionCount = memoryConfig.actionHistorySize;
      while (recentActions.length < expectedActionCount) {
        recentActions.push(CreatureAction.REST); // Pad with REST action
      }
      for (const action of recentActions) {
        inputs.push(this.encodeAction(action));
      }

      // Recent encounters - pad to encounterHistorySize
      const recentEncounters = [...sensoryData.memory.recentEncounters];
      const expectedEncounterCount = memoryConfig.encounterHistorySize;
      while (recentEncounters.length < expectedEncounterCount) {
        recentEncounters.push(EntityType.EMPTY); // Pad with EMPTY
      }
      for (const encounter of recentEncounters) {
        inputs.push(this.encodeEntityType(encounter));
      }

      // Recent signals - pad to signalHistorySize
      const recentSignals = [...sensoryData.memory.recentSignals];
      const expectedSignalCount = memoryConfig.signalHistorySize;
      while (recentSignals.length < expectedSignalCount) {
        recentSignals.push(0.0); // Pad with zeros
      }
      inputs.push(...recentSignals);
    } else {
      // Fallback to original behavior if no config provided
      inputs.push(...sensoryData.memory.recentEnergyChanges);

      // Encode recent actions as numbers
      for (const action of sensoryData.memory.recentActions) {
        inputs.push(this.encodeAction(action));
      }

      // Encode recent encounters
      for (const encounter of sensoryData.memory.recentEncounters) {
        inputs.push(this.encodeEntityType(encounter));
      }

      inputs.push(...sensoryData.memory.recentSignals);
    }

    return inputs;
  }

  /**
   * Encode entity type as a number for neural network
   */
  private encodeEntityType(entityType: EntityType): number {
    const typeMap: Record<EntityType, number> = {
      [EntityType.EMPTY]: 0.0,
      [EntityType.CREATURE_FRIEND]: 0.2,
      [EntityType.CREATURE_ENEMY]: 0.4,
      [EntityType.FOOD]: 0.6,
      [EntityType.WATER]: 0.7,
      [EntityType.OBSTACLE]: 0.8,
      [EntityType.SHELTER]: 0.9,
      [EntityType.MINERAL]: 0.95,
      [EntityType.UNKNOWN]: 1.0,
    };

    return typeMap[entityType] || 0.0;
  }

  /**
   * Encode action as a number for neural network
   */
  private encodeAction(action: CreatureAction): number {
    const actionMap: Record<CreatureAction, number> = {
      [CreatureAction.REST]: 0.0,
      [CreatureAction.MOVE_NORTH]: 0.1,
      [CreatureAction.MOVE_SOUTH]: 0.2,
      [CreatureAction.MOVE_EAST]: 0.3,
      [CreatureAction.MOVE_WEST]: 0.4,
      [CreatureAction.MOVE_NORTHEAST]: 0.5,
      [CreatureAction.MOVE_NORTHWEST]: 0.6,
      [CreatureAction.MOVE_SOUTHEAST]: 0.7,
      [CreatureAction.MOVE_SOUTHWEST]: 0.8,
      [CreatureAction.SLEEP]: 0.85,
      [CreatureAction.EMIT_SIGNAL]: 0.9,
      [CreatureAction.EAT]: 0.92,
      [CreatureAction.DRINK]: 0.94,
      [CreatureAction.GATHER]: 0.96,
      [CreatureAction.ATTACK]: 0.98,
      [CreatureAction.DEFEND]: 1.0,
    };

    return actionMap[action] || 0.0;
  }

  /**
   * Calculate expected input size for neural network configuration
   */
  static calculateInputSize(
    visionConfig: VisionConfig,
    memoryConfig: MemoryConfig
  ): number {
    // Basic state inputs
    let inputSize = 6; // energy, age, positionX, positionY, hunger, currentSignal

    // Vision inputs (5 values per vision cell)
    const visionCells = this.calculateVisionCells(visionConfig);
    inputSize += visionCells * 5;

    // Memory inputs
    inputSize += memoryConfig.energyHistorySize - 1; // Energy changes
    inputSize += memoryConfig.actionHistorySize; // Recent actions
    inputSize += memoryConfig.encounterHistorySize; // Recent encounters
    inputSize += memoryConfig.signalHistorySize; // Recent signals

    return inputSize;
  }

  /**
   * Calculate number of vision cells based on configuration
   */
  private static calculateVisionCells(visionConfig: VisionConfig): number {
    const range = visionConfig.range;
    let cellCount = 0;

    // Simulate the same logic as generateVisionData
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        // Skip center cell (creature's own position)
        if (dx === 0 && dy === 0) {
          continue;
        }

        // Skip diagonal cells if not included
        if (!visionConfig.includeDiagonals && dx !== 0 && dy !== 0) {
          continue;
        }

        // Calculate distance and check if within maxDistance
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > visionConfig.maxDistance) {
          continue; // Too far to see
        }

        cellCount++;
      }
    }

    return cellCount;
  }

  /**
   * Type guard to check if entity is a creature
   */
  private isCreature(entity: IEntity): entity is ICreature {
    return "brain" in entity && "energy" in entity && "age" in entity;
  }
}
