/**
 * WorldSnapshot utility class for capturing simulation state
 */

import { IEntity, ICreature } from "../core/interfaces";
import { World } from "../world/World";
import { ResourceType, Position } from "../world/types";
import {
  WorldSnapshot,
  EntitySnapshot,
  CreatureSnapshot,
  CellSnapshot,
} from "./types";

/**
 * Utility class for creating world snapshots
 */
export class WorldSnapshotCreator {
  /**
   * Create a complete snapshot of the world state
   */
  static createSnapshot(world: World, tick: number): WorldSnapshot {
    const timestamp = Date.now();

    // Extract entities and creatures
    const entities: EntitySnapshot[] = [];
    const creatures: CreatureSnapshot[] = [];

    for (const entity of world.entities) {
      if (this.isCreature(entity)) {
        const creatureSnapshot = this.createCreatureSnapshot(entity);
        creatures.push(creatureSnapshot);
        entities.push(creatureSnapshot);
      } else {
        entities.push(this.createEntitySnapshot(entity));
      }
    }

    // Extract grid cells (sparse representation for efficiency)
    const cells = this.createCellSnapshots(world);

    // Calculate statistics
    const statistics = this.calculateStatistics(world, creatures);

    return {
      timestamp,
      tick,
      dimensions: {
        width: world.width,
        height: world.height,
      },
      entities,
      creatures,
      cells,
      statistics,
      metadata: {
        snapshotVersion: "1.0.0",
        worldType: "grid",
        createdBy: "WorldSnapshotCreator",
      },
    };
  }

  /**
   * Create a snapshot of a single entity
   */
  private static createEntitySnapshot(entity: IEntity): EntitySnapshot {
    return {
      id: entity.id,
      type: "entity",
      position: { ...entity.position },
      active: entity.active,
      data: {
        // Add any additional entity-specific data here
        // This could be extended based on specific entity types
      },
    };
  }

  /**
   * Create a snapshot of a creature
   */
  private static createCreatureSnapshot(creature: ICreature): CreatureSnapshot {
    return {
      id: creature.id,
      type: "creature",
      position: { ...creature.position },
      active: creature.active,
      energy: creature.energy,
      age: creature.age,
      alive: creature.alive,
      data: {
        brainState: this.extractBrainState(creature.brain),
        genome: this.extractGenome(creature.genome),
        currentAction: this.extractCurrentAction(creature),
      },
    };
  }

  /**
   * Create snapshots of grid cells
   */
  private static createCellSnapshots(world: World): CellSnapshot[] {
    const cells: CellSnapshot[] = [];

    // Only include cells that have entities, resources, or obstacles
    // This creates a sparse representation for efficiency
    for (let x = 0; x < world.width; x++) {
      for (let y = 0; y < world.height; y++) {
        const terrain = world.getTerrainAt(x, y);
        const resources = world.getResourcesAt(x, y);
        const hasObstacle = world.hasObstacleAt(x, y);

        // Get entities at this position
        const entitiesAtPosition = world.getEntitiesInRadius({ x, y }, 0.5);

        // Only include cells with interesting content
        if (
          entitiesAtPosition.length > 0 ||
          resources.length > 0 ||
          hasObstacle ||
          terrain === null // Include cells with invalid terrain for debugging
        ) {
          cells.push({
            position: { x, y },
            terrain: terrain || ("grass" as any), // Fallback terrain
            entityIds: entitiesAtPosition.map((entity) => entity.id),
            resources: [...resources],
            hasObstacle,
            lastUpdate: world.currentTick, // Use current tick as approximation
          });
        }
      }
    }

    return cells;
  }

  /**
   * Calculate world statistics
   */
  private static calculateStatistics(
    world: World,
    creatures: CreatureSnapshot[]
  ) {
    const livingCreatures = creatures.filter((c) => c.alive).length;
    const totalEnergy = creatures.reduce((sum, c) => sum + c.energy, 0);
    const averageEnergy =
      creatures.length > 0 ? totalEnergy / creatures.length : 0;

    // Calculate total resources using world's public methods
    const totalResources: Record<ResourceType, number> = {
      [ResourceType.FOOD]: 0,
      [ResourceType.WATER]: 0,
      [ResourceType.SHELTER]: 0,
      [ResourceType.MINERAL]: 0,
    };

    // Sum up resources from all cells
    for (let x = 0; x < world.width; x++) {
      for (let y = 0; y < world.height; y++) {
        const resources = world.getResourcesAt(x, y);
        for (const resource of resources) {
          totalResources[resource.type] += resource.amount;
        }
      }
    }

    return {
      totalEntities: world.entities.length,
      totalCreatures: creatures.length,
      livingCreatures,
      averageEnergy,
      totalResources,
      worldDensity:
        (world.entities.length / (world.width * world.height)) * 100,
      averageAge:
        creatures.length > 0
          ? creatures.reduce((sum, c) => sum + c.age, 0) / creatures.length
          : 0,
    };
  }

  /**
   * Type guard to check if an entity is a creature
   */
  private static isCreature(entity: IEntity): entity is ICreature {
    return "energy" in entity && "age" in entity && "alive" in entity;
  }

  /**
   * Extract brain state from neural network
   */
  private static extractBrainState(brain: unknown): unknown {
    // This will need to be implemented based on the neural network structure
    // For now, return a placeholder
    if (brain && typeof brain === "object" && "getState" in brain) {
      return (brain as any).getState();
    }
    return null;
  }

  /**
   * Extract genome information
   */
  private static extractGenome(genome: unknown): unknown {
    // This will need to be implemented based on the genetic algorithm structure
    // For now, return a placeholder
    if (genome && typeof genome === "object" && "serialize" in genome) {
      return (genome as any).serialize();
    }
    return null;
  }

  /**
   * Extract current action from creature
   */
  private static extractCurrentAction(creature: ICreature): string {
    // This could be extended to track the creature's current action
    // For now, return a basic status
    if (!creature.alive) return "dead";
    if (creature.energy <= 0) return "starving";
    if (creature.energy > 80) return "thriving";
    return "surviving";
  }

  /**
   * Create a minimal snapshot for performance-critical scenarios
   */
  static createMinimalSnapshot(
    world: World,
    tick: number
  ): Partial<WorldSnapshot> {
    return {
      timestamp: Date.now(),
      tick,
      dimensions: {
        width: world.width,
        height: world.height,
      },
      statistics: {
        totalEntities: world.entities.length,
        totalCreatures: world.creatures.length,
        livingCreatures: world.creatures.filter((c) => c.alive).length,
        averageEnergy:
          world.creatures.length > 0
            ? world.creatures.reduce((sum, c) => sum + c.energy, 0) /
              world.creatures.length
            : 0,
        totalResources: {
          [ResourceType.FOOD]: 0,
          [ResourceType.WATER]: 0,
          [ResourceType.SHELTER]: 0,
          [ResourceType.MINERAL]: 0,
        },
      },
      metadata: {
        snapshotType: "minimal",
        snapshotVersion: "1.0.0",
      },
    };
  }
}
