import {
  ObstacleType,
  MovementEffect,
  IObstacle,
  IObstacleProperties,
  IObstacleStatusEffect,
  IObstacleSystemConfig,
  IObstacleInteractionResult,
  IPathfindingNode,
  IObstacleGridCell,
  ILineOfSightResult,
  IObstacleDetection,
} from "../types/obstacles";
import { ICreature } from "./interfaces";
import { v4 as uuidv4 } from "uuid";

/**
 * Default configuration for the obstacle system
 */
export const DEFAULT_OBSTACLE_CONFIG: IObstacleSystemConfig = {
  collisionDetection: true,
  signalAttenuation: true,
  visionBlocking: true,
  statusEffects: true,
  resourceGeneration: true,
  maxObstacles: 5000,
  spatialHashing: true,
  gridSize: 10,
};

/**
 * Default obstacle properties for different obstacle types
 */
export const DEFAULT_OBSTACLE_PROPERTIES: Record<
  ObstacleType,
  IObstacleProperties
> = {
  [ObstacleType.SOLID_BARRIER]: {
    passable: false,
    movementCost: Infinity,
    damageOnContact: 0,
    damagePerTick: 0,
    signalBlocking: 0.8,
    signalReflection: 0.2,
    visionBlocking: true,
    transparency: 0,
    hidingValue: 0.1,
    climbable: false,
    climbCost: 0,
  },
  [ObstacleType.PARTIAL_BARRIER]: {
    passable: true,
    movementCost: 3.0,
    damageOnContact: 0,
    damagePerTick: 0,
    signalBlocking: 0.4,
    signalReflection: 0.1,
    visionBlocking: false,
    transparency: 0.6,
    hidingValue: 0.3,
    climbable: true,
    climbCost: 5,
  },
  [ObstacleType.HAZARD]: {
    passable: true,
    movementCost: 1.5,
    damageOnContact: 5,
    damagePerTick: 2,
    signalBlocking: 0.1,
    signalReflection: 0,
    visionBlocking: false,
    transparency: 0.9,
    hidingValue: 0,
    climbable: false,
    climbCost: 0,
    statusEffects: [
      {
        type: "poisoned",
        magnitude: 0.5,
        duration: 30,
        probabilityPerTick: 0.1,
      },
    ],
  },
  [ObstacleType.SHELTER]: {
    passable: true,
    movementCost: 1.2,
    damageOnContact: 0,
    damagePerTick: 0,
    signalBlocking: 0.6,
    signalReflection: 0.3,
    visionBlocking: true,
    transparency: 0.2,
    hidingValue: 0.8,
    climbable: false,
    climbCost: 0,
    statusEffects: [
      {
        type: "protected",
        magnitude: 0.7,
        duration: 0, // Permanent while in contact
        probabilityPerTick: 1.0,
      },
    ],
  },
  [ObstacleType.RESOURCE_POINT]: {
    passable: true,
    movementCost: 1.0,
    damageOnContact: 0,
    damagePerTick: 0,
    signalBlocking: 0.2,
    signalReflection: 0,
    visionBlocking: false,
    transparency: 0.8,
    hidingValue: 0.2,
    climbable: true,
    climbCost: 2,
    resourceGeneration: 1,
    maxResources: 100,
  },
  [ObstacleType.WATER]: {
    passable: true,
    movementCost: 2.5,
    damageOnContact: 0,
    damagePerTick: 0,
    signalBlocking: 0.3,
    signalReflection: 0.4,
    visionBlocking: false,
    transparency: 0.7,
    hidingValue: 0.4,
    climbable: false,
    climbCost: 0,
  },
  [ObstacleType.CLIFF]: {
    passable: false,
    movementCost: Infinity,
    damageOnContact: 10,
    damagePerTick: 0,
    signalBlocking: 0.9,
    signalReflection: 0.1,
    visionBlocking: true,
    transparency: 0,
    hidingValue: 0.1,
    climbable: true,
    climbCost: 20,
  },
  [ObstacleType.CAVE]: {
    passable: true,
    movementCost: 1.1,
    damageOnContact: 0,
    damagePerTick: 0,
    signalBlocking: 0.8,
    signalReflection: 0.5,
    visionBlocking: true,
    transparency: 0.1,
    hidingValue: 0.9,
    climbable: false,
    climbCost: 0,
  },
  [ObstacleType.TREE]: {
    passable: true,
    movementCost: 1.3,
    damageOnContact: 0,
    damagePerTick: 0,
    signalBlocking: 0.3,
    signalReflection: 0.1,
    visionBlocking: true,
    transparency: 0.4,
    hidingValue: 0.6,
    climbable: true,
    climbCost: 8,
  },
  [ObstacleType.ROCK]: {
    passable: false,
    movementCost: Infinity,
    damageOnContact: 1,
    damagePerTick: 0,
    signalBlocking: 0.7,
    signalReflection: 0.2,
    visionBlocking: true,
    transparency: 0,
    hidingValue: 0.3,
    climbable: true,
    climbCost: 12,
  },
};

/**
 * Obstacle system managing environmental obstacles and interactions
 */
export class ObstacleSystem {
  private config: IObstacleSystemConfig;
  private obstacles: Map<string, IObstacle> = new Map();
  private spatialGrid: Map<string, IObstacleGridCell> = new Map();
  private currentTime: number = 0;

  constructor(config: Partial<IObstacleSystemConfig> = {}) {
    this.config = { ...DEFAULT_OBSTACLE_CONFIG, ...config };
  }

  /**
   * Update the obstacle system for one tick
   */
  update(deltaTime: number): void {
    this.currentTime += deltaTime;

    if (this.config.resourceGeneration) {
      this.updateResourceGeneration(deltaTime);
    }

    if (this.config.spatialHashing) {
      this.updateSpatialGrid();
    }
  }

  /**
   * Add an obstacle to the system
   */
  addObstacle(obstacle: IObstacle): void {
    this.obstacles.set(obstacle.id, obstacle);

    if (this.config.spatialHashing) {
      this.addObstacleToGrid(obstacle);
    }
  }

  /**
   * Create a new obstacle with default properties
   */
  createObstacle(
    type: ObstacleType,
    position: { x: number; y: number },
    dimensions: { width: number; height: number },
    customProperties?: Partial<IObstacleProperties>
  ): IObstacle {
    const defaultProps = DEFAULT_OBSTACLE_PROPERTIES[type];
    const properties: IObstacleProperties = {
      ...defaultProps,
      ...customProperties,
    };

    const obstacle: IObstacle = {
      id: uuidv4(),
      type,
      position,
      dimensions,
      properties,
    };

    this.addObstacle(obstacle);
    return obstacle;
  }

  /**
   * Remove an obstacle from the system
   */
  removeObstacle(obstacleId: string): boolean {
    const obstacle = this.obstacles.get(obstacleId);
    if (!obstacle) {
      return false;
    }

    this.obstacles.delete(obstacleId);

    if (this.config.spatialHashing) {
      this.removeObstacleFromGrid(obstacle);
    }

    return true;
  }

  /**
   * Check for creature interaction with obstacles at a specific position
   */
  checkInteraction(
    creature: ICreature,
    targetPosition: { x: number; y: number }
  ): IObstacleInteractionResult {
    const result: IObstacleInteractionResult = {
      blocked: false,
      movementCost: 1.0,
      damage: 0,
      statusEffects: [],
      signalAttenuation: 0,
      visionBlocked: false,
      resourcesGained: 0,
      hidingBonus: 0,
    };

    const obstaclesAtPosition = this.getObstaclesAtPosition(targetPosition);

    for (const obstacle of obstaclesAtPosition) {
      const props = obstacle.properties;

      // Movement blocking
      if (!props.passable) {
        result.blocked = true;
      }

      // Movement cost
      result.movementCost = Math.max(result.movementCost, props.movementCost);

      // Damage
      result.damage += props.damageOnContact;

      // Status effects
      if (this.config.statusEffects && props.statusEffects) {
        for (const effect of props.statusEffects) {
          if (Math.random() < effect.probabilityPerTick) {
            result.statusEffects.push(effect);
          }
        }
      }

      // Signal attenuation
      result.signalAttenuation = Math.max(
        result.signalAttenuation,
        props.signalBlocking
      );

      // Vision blocking
      if (props.visionBlocking) {
        result.visionBlocked = true;
      }

      // Hiding bonus
      result.hidingBonus = Math.max(result.hidingBonus, props.hidingValue);

      // Resource generation
      if (
        this.config.resourceGeneration &&
        props.resourceGeneration &&
        props.maxResources
      ) {
        // Simple resource collection logic
        const resourcesAvailable = Math.min(
          props.maxResources,
          props.resourceGeneration
        );
        result.resourcesGained += resourcesAvailable;

        // Deplete resources
        if (props.maxResources > 0) {
          props.maxResources = Math.max(
            0,
            props.maxResources - resourcesAvailable
          );
        }
      }
    }

    return result;
  }

  /**
   * Get all obstacles at a specific position
   */
  getObstaclesAtPosition(position: { x: number; y: number }): IObstacle[] {
    if (this.config.spatialHashing) {
      return this.getObstaclesAtPositionFromGrid(position);
    }

    const obstaclesAtPosition: IObstacle[] = [];
    for (const obstacle of this.obstacles.values()) {
      if (this.isPositionInObstacle(position, obstacle)) {
        obstaclesAtPosition.push(obstacle);
      }
    }

    return obstaclesAtPosition;
  }

  /**
   * Get obstacles within a radius of a position
   */
  getObstaclesInRadius(
    position: { x: number; y: number },
    radius: number
  ): IObstacle[] {
    if (this.config.spatialHashing) {
      return this.getObstaclesInRadiusFromGrid(position, radius);
    }

    const obstaclesInRadius: IObstacle[] = [];
    for (const obstacle of this.obstacles.values()) {
      const distance = this.getDistanceToObstacle(position, obstacle);
      if (distance <= radius) {
        obstaclesInRadius.push(obstacle);
      }
    }

    return obstaclesInRadius;
  }

  /**
   * Calculate line of sight between two positions
   */
  calculateLineOfSight(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): ILineOfSightResult {
    const result: ILineOfSightResult = {
      visible: true,
      blockedByObstacles: [],
      transparency: 1.0,
      distance: this.calculateDistance(start, end),
    };

    if (!this.config.visionBlocking) {
      return result;
    }

    // Get obstacles that might block line of sight
    const potentialBlockers = this.getObstaclesAlongLine(start, end);

    for (const obstacle of potentialBlockers) {
      if (obstacle.properties.visionBlocking) {
        result.blockedByObstacles.push(obstacle.id);
        result.transparency *= obstacle.properties.transparency;
      }
    }

    result.visible = result.transparency > 0.1; // Visible if more than 10% transparency
    return result;
  }

  /**
   * Find a path from start to end position avoiding obstacles
   */
  findPath(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): IPathfindingNode[] {
    // Simple A* pathfinding implementation
    const openList: IPathfindingNode[] = [];
    const closedList: Set<string> = new Set();

    const startNode: IPathfindingNode = {
      position: start,
      gCost: 0,
      hCost: this.calculateDistance(start, end),
      fCost: 0,
      parent: null,
      obstacle: null,
      movementCost: 1,
      passable: true,
    };
    startNode.fCost = startNode.gCost + startNode.hCost;

    openList.push(startNode);

    while (openList.length > 0) {
      // Find node with lowest f cost
      let currentNode = openList[0];
      let currentIndex = 0;

      for (let i = 1; i < openList.length; i++) {
        if (openList[i].fCost < currentNode.fCost) {
          currentNode = openList[i];
          currentIndex = i;
        }
      }

      // Move current node from open to closed list
      openList.splice(currentIndex, 1);
      closedList.add(this.positionToString(currentNode.position));

      // Check if we reached the end
      if (this.calculateDistance(currentNode.position, end) < 1) {
        return this.reconstructPath(currentNode);
      }

      // Generate neighbors (8-directional movement)
      const neighbors = this.getNeighborNodes(currentNode, end);

      for (const neighbor of neighbors) {
        const neighborKey = this.positionToString(neighbor.position);

        if (closedList.has(neighborKey) || !neighbor.passable) {
          continue;
        }

        const tentativeGCost = currentNode.gCost + neighbor.movementCost;

        const existingOpenNode = openList.find(
          (n) => this.positionToString(n.position) === neighborKey
        );

        if (!existingOpenNode) {
          neighbor.gCost = tentativeGCost;
          neighbor.fCost = neighbor.gCost + neighbor.hCost;
          neighbor.parent = currentNode;
          openList.push(neighbor);
        } else if (tentativeGCost < existingOpenNode.gCost) {
          existingOpenNode.gCost = tentativeGCost;
          existingOpenNode.fCost =
            existingOpenNode.gCost + existingOpenNode.hCost;
          existingOpenNode.parent = currentNode;
        }
      }
    }

    // No path found
    return [];
  }

  /**
   * Detect obstacles for creature sensory system
   */
  detectObstacles(
    creature: ICreature,
    detectionRange: number
  ): IObstacleDetection[] {
    const detections: IObstacleDetection[] = [];
    const obstaclesInRange = this.getObstaclesInRadius(
      creature.position,
      detectionRange
    );

    for (const obstacle of obstaclesInRange) {
      const distance = this.getDistanceToObstacle(creature.position, obstacle);
      const direction = this.getDirectionToObstacle(
        creature.position,
        obstacle
      );

      const detection: IObstacleDetection = {
        obstacle,
        distance,
        direction,
        approachability: this.calculateApproachability(obstacle),
        dangerLevel: this.calculateDangerLevel(obstacle),
      };

      detections.push(detection);
    }

    return detections.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Get all obstacles
   */
  getAllObstacles(): ReadonlyArray<IObstacle> {
    return Array.from(this.obstacles.values());
  }

  /**
   * Clear all obstacles
   */
  clearObstacles(): void {
    this.obstacles.clear();
    this.spatialGrid.clear();
  }

  /**
   * Get current configuration
   */
  getConfig(): IObstacleSystemConfig {
    return { ...this.config };
  }

  // Private helper methods

  private updateResourceGeneration(deltaTime: number): void {
    for (const obstacle of this.obstacles.values()) {
      const props = obstacle.properties;
      if (props.resourceGeneration && props.maxResources !== undefined) {
        // Simple regeneration logic
        const maxCapacity = props.maxResources + props.resourceGeneration * 10;
        props.maxResources = Math.min(
          maxCapacity,
          props.maxResources + props.resourceGeneration * deltaTime
        );
      }
    }
  }

  private isPositionInObstacle(
    position: { x: number; y: number },
    obstacle: IObstacle
  ): boolean {
    return (
      position.x >= obstacle.position.x &&
      position.x < obstacle.position.x + obstacle.dimensions.width &&
      position.y >= obstacle.position.y &&
      position.y < obstacle.position.y + obstacle.dimensions.height
    );
  }

  private getDistanceToObstacle(
    position: { x: number; y: number },
    obstacle: IObstacle
  ): number {
    // Distance to closest point on obstacle
    const closestX = Math.max(
      obstacle.position.x,
      Math.min(position.x, obstacle.position.x + obstacle.dimensions.width)
    );
    const closestY = Math.max(
      obstacle.position.y,
      Math.min(position.y, obstacle.position.y + obstacle.dimensions.height)
    );

    return this.calculateDistance(position, { x: closestX, y: closestY });
  }

  private getDirectionToObstacle(
    position: { x: number; y: number },
    obstacle: IObstacle
  ): { x: number; y: number } {
    const centerX = obstacle.position.x + obstacle.dimensions.width / 2;
    const centerY = obstacle.position.y + obstacle.dimensions.height / 2;

    const dx = centerX - position.x;
    const dy = centerY - position.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    return length > 0 ? { x: dx / length, y: dy / length } : { x: 0, y: 0 };
  }

  private calculateApproachability(obstacle: IObstacle): number {
    const props = obstacle.properties;
    let approachability = 1.0;

    if (!props.passable) approachability *= 0.1;
    if (props.damageOnContact > 0)
      approachability *= 1 - props.damageOnContact / 20;
    if (props.movementCost > 1) approachability *= 1 / props.movementCost;

    return Math.max(0, Math.min(1, approachability));
  }

  private calculateDangerLevel(obstacle: IObstacle): number {
    const props = obstacle.properties;
    let danger = 0;

    if (props.damageOnContact > 0) danger += props.damageOnContact / 20;
    if (props.damagePerTick > 0) danger += props.damagePerTick / 10;
    if (props.statusEffects) {
      for (const effect of props.statusEffects) {
        if (effect.type === "poisoned" || effect.type === "damaged") {
          danger += effect.magnitude * effect.probabilityPerTick;
        }
      }
    }

    return Math.max(0, Math.min(1, danger));
  }

  private calculateDistance(
    pos1: { x: number; y: number },
    pos2: { x: number; y: number }
  ): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getObstaclesAlongLine(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): IObstacle[] {
    const obstacles: IObstacle[] = [];

    // Simple line traversal to find intersecting obstacles
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const steps = Math.max(dx, dy);

    for (let i = 0; i <= steps; i++) {
      const t = steps > 0 ? i / steps : 0;
      const x = start.x + t * (end.x - start.x);
      const y = start.y + t * (end.y - start.y);

      const obstaclesAtPoint = this.getObstaclesAtPosition({ x, y });
      for (const obstacle of obstaclesAtPoint) {
        if (!obstacles.includes(obstacle)) {
          obstacles.push(obstacle);
        }
      }
    }

    return obstacles;
  }

  private positionToString(position: { x: number; y: number }): string {
    return `${Math.floor(position.x)},${Math.floor(position.y)}`;
  }

  private reconstructPath(endNode: IPathfindingNode): IPathfindingNode[] {
    const path: IPathfindingNode[] = [];
    let current: IPathfindingNode | null = endNode;

    while (current) {
      path.unshift(current);
      current = current.parent;
    }

    return path;
  }

  private getNeighborNodes(
    node: IPathfindingNode,
    target: { x: number; y: number }
  ): IPathfindingNode[] {
    const neighbors: IPathfindingNode[] = [];
    const directions = [
      { x: -1, y: -1 },
      { x: 0, y: -1 },
      { x: 1, y: -1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: 1 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ];

    for (const dir of directions) {
      const newPos = {
        x: node.position.x + dir.x,
        y: node.position.y + dir.y,
      };

      const interaction = this.checkInteraction(
        { id: "pathfinder", position: newPos } as ICreature,
        newPos
      );

      const neighbor: IPathfindingNode = {
        position: newPos,
        gCost: 0,
        hCost: this.calculateDistance(newPos, target),
        fCost: 0,
        parent: null,
        obstacle: null,
        movementCost: interaction.movementCost,
        passable: !interaction.blocked,
      };

      neighbors.push(neighbor);
    }

    return neighbors;
  }

  // Spatial grid methods

  private getCellKey(position: { x: number; y: number }): string {
    const cellX = Math.floor(position.x / this.config.gridSize);
    const cellY = Math.floor(position.y / this.config.gridSize);
    return `${cellX},${cellY}`;
  }

  private addObstacleToGrid(obstacle: IObstacle): void {
    // Add obstacle to all cells it occupies
    const startX = Math.floor(obstacle.position.x / this.config.gridSize);
    const endX = Math.floor(
      (obstacle.position.x + obstacle.dimensions.width) / this.config.gridSize
    );
    const startY = Math.floor(obstacle.position.y / this.config.gridSize);
    const endY = Math.floor(
      (obstacle.position.y + obstacle.dimensions.height) / this.config.gridSize
    );

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const cellKey = `${x},${y}`;

        if (!this.spatialGrid.has(cellKey)) {
          this.spatialGrid.set(cellKey, {
            cellId: cellKey,
            obstacles: new Set(),
            lastUpdated: this.currentTime,
            passable: true,
            averageMovementCost: 1.0,
          });
        }

        const cell = this.spatialGrid.get(cellKey)!;
        cell.obstacles.add(obstacle.id);

        // Update cell properties
        if (!obstacle.properties.passable) {
          cell.passable = false;
        }

        // Recalculate average movement cost
        this.updateCellMovementCost(cell);
      }
    }
  }

  private removeObstacleFromGrid(obstacle: IObstacle): void {
    for (const cell of this.spatialGrid.values()) {
      cell.obstacles.delete(obstacle.id);
      this.updateCellMovementCost(cell);
    }
  }

  private updateCellMovementCost(cell: IObstacleGridCell): void {
    if (cell.obstacles.size === 0) {
      cell.passable = true;
      cell.averageMovementCost = 1.0;
      return;
    }

    let totalCost = 0;
    let passableCount = 0;
    cell.passable = false;

    for (const obstacleId of cell.obstacles) {
      const obstacle = this.obstacles.get(obstacleId);
      if (obstacle) {
        if (obstacle.properties.passable) {
          cell.passable = true;
          totalCost += obstacle.properties.movementCost;
          passableCount++;
        }
      }
    }

    cell.averageMovementCost =
      passableCount > 0 ? totalCost / passableCount : Infinity;
  }

  private updateSpatialGrid(): void {
    // Remove empty cells
    const cellsToRemove: string[] = [];

    for (const [cellKey, cell] of this.spatialGrid.entries()) {
      cell.lastUpdated = this.currentTime;

      if (cell.obstacles.size === 0) {
        cellsToRemove.push(cellKey);
      }
    }

    for (const cellKey of cellsToRemove) {
      this.spatialGrid.delete(cellKey);
    }
  }

  private getObstaclesAtPositionFromGrid(position: {
    x: number;
    y: number;
  }): IObstacle[] {
    const cellKey = this.getCellKey(position);
    const cell = this.spatialGrid.get(cellKey);

    if (!cell) {
      return [];
    }

    const obstacles: IObstacle[] = [];
    for (const obstacleId of cell.obstacles) {
      const obstacle = this.obstacles.get(obstacleId);
      if (obstacle && this.isPositionInObstacle(position, obstacle)) {
        obstacles.push(obstacle);
      }
    }

    return obstacles;
  }

  private getObstaclesInRadiusFromGrid(
    position: { x: number; y: number },
    radius: number
  ): IObstacle[] {
    const obstacles: IObstacle[] = [];
    const cellRadius = Math.ceil(radius / this.config.gridSize);

    const centerX = Math.floor(position.x / this.config.gridSize);
    const centerY = Math.floor(position.y / this.config.gridSize);

    for (let x = centerX - cellRadius; x <= centerX + cellRadius; x++) {
      for (let y = centerY - cellRadius; y <= centerY + cellRadius; y++) {
        const cellKey = `${x},${y}`;
        const cell = this.spatialGrid.get(cellKey);

        if (cell) {
          for (const obstacleId of cell.obstacles) {
            const obstacle = this.obstacles.get(obstacleId);
            if (obstacle) {
              const distance = this.getDistanceToObstacle(position, obstacle);
              if (distance <= radius && !obstacles.includes(obstacle)) {
                obstacles.push(obstacle);
              }
            }
          }
        }
      }
    }

    return obstacles;
  }
}
