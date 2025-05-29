/**
 * Main World class implementing the grid-based world system
 */

import { IWorld, IEntity, ICreature, IRandom } from "../core/interfaces";
import { SensorySystem } from "../core/sensory-system";
import { SignalSystem } from "../core/signal-system";
import { ObstacleSystem } from "../core/obstacle-system";
import { Creature } from "../core/creature";
import {
  Position,
  TerrainType,
  ResourceType,
  ResourceNode,
  GridCell,
  WorldChunk,
  WorldConfig,
  WorldGenerationOptions,
  EntityQuery,
  EntityQueryResult,
} from "./types";
import {
  generateTerrain,
  generateResources,
  generateObstacles,
} from "./generation";
import { DEFAULT_TERRAIN_DISTRIBUTION } from "./terrain";

/**
 * Default world configuration
 */
const DEFAULT_WORLD_CONFIG: WorldConfig = {
  width: 100,
  height: 100,
  chunkSize: 16,
  seed: 12345,
  terrainDistribution: DEFAULT_TERRAIN_DISTRIBUTION,
  resourceDensity: 0.1,
  obstacleDensity: 0.05,
  useChunking: true,
  maxLoadedChunks: 25,
  signalConfig: {
    maxActiveSignals: 1000,
    signalDecayEnabled: true,
    spatialHashing: true,
    gridSize: 10,
    maxRange: 50,
    environmentalAttenuation: 0.1,
  },
  obstacleConfig: {
    collisionDetection: true,
    signalAttenuation: true,
    visionBlocking: true,
    statusEffects: true,
    resourceGeneration: true,
    maxObstacles: 5000,
    spatialHashing: true,
    gridSize: 10,
  },
};

/**
 * Default world generation options
 */
const DEFAULT_GENERATION_OPTIONS: WorldGenerationOptions = {
  terrainAlgorithm: "cellular",
  resourcePlacement: "terrain-based",
  obstaclePlacement: "clustered",
  smoothingPasses: 3,
};

/**
 * Grid-based world implementation
 */
export class World implements IWorld {
  private readonly config: WorldConfig;
  private readonly random: IRandom;
  private readonly generationOptions: WorldGenerationOptions;
  private readonly sensorySystem: SensorySystem;
  private readonly signalSystem: SignalSystem;
  private readonly obstacleSystem: ObstacleSystem;

  // Grid system
  private grid: GridCell[][] = [];
  private chunks: Map<string, WorldChunk> = new Map();

  // Entity management
  private entityMap: Map<string, IEntity> = new Map();
  private entityPositions: Map<string, Position> = new Map();
  private creatureSet: Set<ICreature> = new Set();

  // Simulation state
  private _currentTick: number = 0;

  constructor(
    random: IRandom,
    config: Partial<WorldConfig> = {},
    generationOptions: Partial<WorldGenerationOptions> = {}
  ) {
    this.config = { ...DEFAULT_WORLD_CONFIG, ...config };
    this.random = random;
    this.generationOptions = {
      ...DEFAULT_GENERATION_OPTIONS,
      ...generationOptions,
    };

    // Initialize sensory system
    this.sensorySystem = new SensorySystem(this);

    // Initialize signal system with configuration
    this.signalSystem = new SignalSystem(this.config.signalConfig);

    // Initialize obstacle system with configuration
    this.obstacleSystem = new ObstacleSystem(this.config.obstacleConfig);

    this.initialize();
  }

  // IWorld interface implementation

  get width(): number {
    return this.config.width;
  }

  get height(): number {
    return this.config.height;
  }

  get entities(): ReadonlyArray<IEntity> {
    return Array.from(this.entityMap.values());
  }

  get creatures(): ReadonlyArray<ICreature> {
    return Array.from(this.creatureSet);
  }

  get currentTick(): number {
    return this._currentTick;
  }

  addEntity(entity: IEntity): void {
    if (this.entityMap.has(entity.id)) {
      throw new Error(`Entity with ID ${entity.id} already exists in world`);
    }

    // Validate position
    const { x, y } = entity.position;
    if (!this.isValidPosition(x, y)) {
      throw new Error(`Invalid position (${x}, ${y}) for entity ${entity.id}`);
    }

    // Add to entity tracking
    this.entityMap.set(entity.id, entity);
    this.entityPositions.set(entity.id, { ...entity.position });

    // Add to creature set if it's a creature
    if (this.isCreature(entity)) {
      this.creatureSet.add(entity);

      // Set up sensory system for creatures
      if (entity instanceof Creature) {
        entity.setSensorySystem(this.sensorySystem);
      }
    }

    // Add to grid cell
    this.addEntityToCell(entity, x, y);

    // Load chunk if using chunking
    if (this.config.useChunking) {
      this.ensureChunkLoaded(x, y);
    }
  }

  removeEntity(entityId: string): boolean {
    const entity = this.entityMap.get(entityId);
    if (!entity) {
      return false;
    }

    const position = this.entityPositions.get(entityId);
    if (position) {
      this.removeEntityFromCell(entity, position.x, position.y);
    }

    this.entityMap.delete(entityId);
    this.entityPositions.delete(entityId);

    if (this.isCreature(entity)) {
      this.creatureSet.delete(entity);
    }

    return true;
  }

  getEntity(entityId: string): IEntity | undefined {
    return this.entityMap.get(entityId);
  }

  getEntitiesInRadius(position: Position, radius: number): IEntity[] {
    const query: EntityQuery = {
      position,
      radius,
      activeOnly: true,
    };

    const result = this.queryEntities(query);
    return result.entities;
  }

  update(deltaTime: number): void {
    this._currentTick++;

    // Update signal and obstacle systems
    this.signalSystem.update(deltaTime);
    this.obstacleSystem.update(deltaTime);

    // Synchronize obstacles with signal system for proper signal attenuation
    const obstacles = this.obstacleSystem.getAllObstacles();
    this.signalSystem.setObstacles([...obstacles]);

    // Update all entities
    for (const entity of this.entityMap.values()) {
      if (entity.active) {
        const oldPosition = this.entityPositions.get(entity.id);

        entity.update(deltaTime);

        // Check if entity moved
        if (
          oldPosition &&
          (oldPosition.x !== entity.position.x ||
            oldPosition.y !== entity.position.y)
        ) {
          this.handleEntityMovement(entity, oldPosition, entity.position);
        }

        // Process signals and obstacles for creatures
        if (this.isCreature(entity)) {
          this.processCreatureSignals(entity);
          this.processCreatureObstacles(entity);
        }
      }
    }

    // Update resources
    this.updateResources();

    // Manage chunks if using chunking
    if (this.config.useChunking) {
      this.manageChunks();
    }
  }

  reset(): void {
    // Clear all entities
    for (const entity of this.entityMap.values()) {
      entity.destroy();
    }

    this.entityMap.clear();
    this.entityPositions.clear();
    this.creatureSet.clear();
    this.chunks.clear();

    this._currentTick = 0;

    // Regenerate world
    this.initialize();
  }

  // World-specific methods

  /**
   * Get the terrain type at a specific position
   */
  getTerrainAt(x: number, y: number): TerrainType | null {
    if (!this.isValidPosition(x, y)) {
      return null;
    }

    const cell = this.getCell(x, y);
    return cell ? cell.terrain : null;
  }

  /**
   * Get resources at a specific position
   */
  getResourcesAt(x: number, y: number): ResourceNode[] {
    if (!this.isValidPosition(x, y)) {
      return [];
    }

    const cell = this.getCell(x, y);
    return cell ? [...cell.resources] : [];
  }

  /**
   * Check if a position has an obstacle
   */
  hasObstacleAt(x: number, y: number): boolean {
    if (!this.isValidPosition(x, y)) {
      return true; // Out of bounds is considered an obstacle
    }

    const cell = this.getCell(x, y);
    return cell ? cell.hasObstacle : true;
  }

  /**
   * Query entities with advanced filtering
   */
  queryEntities(query: EntityQuery): EntityQueryResult {
    const { position, radius, entityType, activeOnly, limit } = query;
    const results: { entity: IEntity; distance: number }[] = [];

    // Calculate search bounds
    const minX = Math.max(0, Math.floor(position.x - radius));
    const maxX = Math.min(this.width - 1, Math.ceil(position.x + radius));
    const minY = Math.max(0, Math.floor(position.y - radius));
    const maxY = Math.min(this.height - 1, Math.ceil(position.y + radius));

    // Search in the bounded area
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const cell = this.getCell(x, y);
        if (!cell) continue;

        for (const entity of cell.entities) {
          // Apply filters
          if (activeOnly && !entity.active) continue;
          if (entityType === "creature" && !this.isCreature(entity)) continue;
          if (entityType === "entity" && this.isCreature(entity)) continue;

          // Calculate distance
          const distance = this.calculateDistance(position, entity.position);
          if (distance <= radius) {
            results.push({ entity, distance });
          }
        }
      }
    }

    // Sort by distance
    results.sort((a, b) => a.distance - b.distance);

    // Apply limit
    const limitedResults = limit ? results.slice(0, limit) : results;

    return {
      entities: limitedResults.map((r) => r.entity),
      distances: limitedResults.map((r) => r.distance),
      count: limitedResults.length,
    };
  }

  /**
   * Get world configuration
   */
  getConfig(): Readonly<WorldConfig> {
    return { ...this.config };
  }

  /**
   * Get world statistics
   */
  getStatistics() {
    const terrainCounts = new Map<TerrainType, number>();
    const resourceCounts = new Map<ResourceType, number>();
    let obstacleCount = 0;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.getCell(x, y);
        if (cell) {
          // Count terrain
          terrainCounts.set(
            cell.terrain,
            (terrainCounts.get(cell.terrain) || 0) + 1
          );

          // Count resources
          for (const resource of cell.resources) {
            resourceCounts.set(
              resource.type,
              (resourceCounts.get(resource.type) || 0) + 1
            );
          }

          // Count obstacles
          if (cell.hasObstacle) {
            obstacleCount++;
          }
        }
      }
    }

    return {
      totalCells: this.width * this.height,
      entityCount: this.entityMap.size,
      creatureCount: this.creatureSet.size,
      terrainCounts: Object.fromEntries(terrainCounts),
      resourceCounts: Object.fromEntries(resourceCounts),
      obstacleCount,
      activeChunks: this.chunks.size,
      currentTick: this._currentTick,
    };
  }

  /**
   * Get the signal system for external access
   */
  getSignalSystem() {
    return this.signalSystem;
  }

  /**
   * Get the obstacle system for external access
   */
  getObstacleSystem() {
    return this.obstacleSystem;
  }

  // Private methods

  private initialize(): void {
    this.random.setSeed(this.config.seed);

    // Generate terrain
    const terrain = generateTerrain(
      this.width,
      this.height,
      this.random,
      this.generationOptions,
      this.config.terrainDistribution
    );

    // Generate resources
    const resources = generateResources(
      terrain,
      this.width,
      this.height,
      this.random,
      this.config.resourceDensity,
      this.generationOptions.resourcePlacement
    );

    // Generate obstacles
    const obstacles = generateObstacles(
      this.width,
      this.height,
      this.random,
      this.config.obstacleDensity,
      this.generationOptions.obstaclePlacement
    );

    // Create grid
    this.createGrid(terrain, resources, obstacles);
  }

  private createGrid(
    terrain: TerrainType[][],
    resources: ResourceNode[],
    obstacles: Position[]
  ): void {
    // Initialize grid
    this.grid = [];
    for (let y = 0; y < this.height; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = {
          position: { x, y },
          terrain: terrain[y][x],
          entities: new Set(),
          resources: [],
          hasObstacle: false,
          lastUpdate: 0,
        };
      }
    }

    // Place resources
    for (const resource of resources) {
      const { x, y } = resource.position;
      if (this.isValidPosition(x, y)) {
        this.grid[y][x].resources.push(resource);
      }
    }

    // Place obstacles
    for (const obstacle of obstacles) {
      const { x, y } = obstacle;
      if (this.isValidPosition(x, y)) {
        this.grid[y][x].hasObstacle = true;
      }
    }

    // Initialize chunks if using chunking
    if (this.config.useChunking) {
      this.initializeChunks();
    }
  }

  private initializeChunks(): void {
    const chunkSize = this.config.chunkSize;
    const chunksX = Math.ceil(this.width / chunkSize);
    const chunksY = Math.ceil(this.height / chunkSize);

    for (let chunkY = 0; chunkY < chunksY; chunkY++) {
      for (let chunkX = 0; chunkX < chunksX; chunkX++) {
        const chunk: WorldChunk = {
          chunkX,
          chunkY,
          size: chunkSize,
          cells: [],
          loaded: false,
          lastAccess: 0,
          entities: new Set(),
        };

        // Initialize chunk cells
        for (let y = 0; y < chunkSize; y++) {
          chunk.cells[y] = [];
          for (let x = 0; x < chunkSize; x++) {
            const worldX = chunkX * chunkSize + x;
            const worldY = chunkY * chunkSize + y;

            if (this.isValidPosition(worldX, worldY)) {
              chunk.cells[y][x] = this.grid[worldY][worldX];
            }
          }
        }

        this.chunks.set(this.getChunkKey(chunkX, chunkY), chunk);
      }
    }
  }

  private getCell(x: number, y: number): GridCell | null {
    if (!this.isValidPosition(x, y)) {
      return null;
    }

    if (this.config.useChunking) {
      const chunk = this.ensureChunkLoaded(x, y);

      if (chunk) {
        const localX = x % this.config.chunkSize;
        const localY = y % this.config.chunkSize;
        return chunk.cells[localY]?.[localX] || null;
      }
    }

    return this.grid[y]?.[x] || null;
  }

  private ensureChunkLoaded(x: number, y: number): WorldChunk | null {
    const chunkX = Math.floor(x / this.config.chunkSize);
    const chunkY = Math.floor(y / this.config.chunkSize);
    const chunkKey = this.getChunkKey(chunkX, chunkY);

    const chunk = this.chunks.get(chunkKey);
    if (chunk) {
      chunk.loaded = true;
      chunk.lastAccess = this._currentTick;
      return chunk;
    }

    return null;
  }

  private manageChunks(): void {
    const loadedChunks = Array.from(this.chunks.values()).filter(
      (chunk) => chunk.loaded
    );

    if (loadedChunks.length > this.config.maxLoadedChunks) {
      // Sort by last access time and unload oldest chunks
      loadedChunks.sort((a, b) => a.lastAccess - b.lastAccess);

      const chunksToUnload = loadedChunks.slice(
        0,
        loadedChunks.length - this.config.maxLoadedChunks
      );
      for (const chunk of chunksToUnload) {
        // Only unload if no entities are in the chunk
        if (chunk.entities.size === 0) {
          chunk.loaded = false;
        }
      }
    }
  }

  private addEntityToCell(entity: IEntity, x: number, y: number): void {
    const cell = this.getCell(x, y);
    if (cell) {
      cell.entities.add(entity);

      // Add to chunk if using chunking
      if (this.config.useChunking) {
        const chunkX = Math.floor(x / this.config.chunkSize);
        const chunkY = Math.floor(y / this.config.chunkSize);
        const chunk = this.chunks.get(this.getChunkKey(chunkX, chunkY));
        if (chunk) {
          chunk.entities.add(entity);
        }
      }
    }
  }

  private removeEntityFromCell(entity: IEntity, x: number, y: number): void {
    const cell = this.getCell(x, y);
    if (cell) {
      cell.entities.delete(entity);

      // Remove from chunk if using chunking
      if (this.config.useChunking) {
        const chunkX = Math.floor(x / this.config.chunkSize);
        const chunkY = Math.floor(y / this.config.chunkSize);
        const chunk = this.chunks.get(this.getChunkKey(chunkX, chunkY));
        if (chunk) {
          chunk.entities.delete(entity);
        }
      }
    }
  }

  private handleEntityMovement(
    entity: IEntity,
    oldPosition: Position,
    newPosition: Position
  ): void {
    // Validate new position
    if (!this.isValidPosition(newPosition.x, newPosition.y)) {
      // Revert to old position if new position is invalid
      entity.position.x = oldPosition.x;
      entity.position.y = oldPosition.y;
      return;
    }

    // Remove from old cell
    this.removeEntityFromCell(entity, oldPosition.x, oldPosition.y);

    // Add to new cell
    this.addEntityToCell(entity, newPosition.x, newPosition.y);

    // Update position tracking
    this.entityPositions.set(entity.id, { ...newPosition });

    // Ensure new chunk is loaded
    if (this.config.useChunking) {
      this.ensureChunkLoaded(newPosition.x, newPosition.y);
    }
  }

  private updateResources(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.getCell(x, y);
        if (cell) {
          for (const resource of cell.resources) {
            // Regenerate resources
            if (resource.amount < resource.maxAmount) {
              resource.amount = Math.min(
                resource.maxAmount,
                resource.amount + resource.regenerationRate
              );
            }
          }
          cell.lastUpdate = this._currentTick;
        }
      }
    }
  }

  private isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  private isCreature(entity: IEntity): entity is ICreature {
    return "brain" in entity && "genome" in entity && "energy" in entity;
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getChunkKey(chunkX: number, chunkY: number): string {
    return `${chunkX},${chunkY}`;
  }

  private processCreatureSignals(entity: ICreature): void {
    // Get signals received by this creature
    const signalReceptions = this.signalSystem.getSignalsForCreature(entity);

    if (signalReceptions.length > 0) {
      // Process each signal reception
      for (const reception of signalReceptions) {
        const result = this.signalSystem.processSignalReception(
          entity,
          reception
        );

        // Apply signal processing results to creature behavior
        // This would integrate with the creature's behavior system
        // For now, we'll just store the signal in the creature's memory
        if (result.understood && entity.setBroadcastSignal) {
          // Adjust creature's broadcast signal based on received signals
          const currentSignal = entity.getBroadcastSignal();
          const newSignal = Math.min(
            1.0,
            currentSignal + result.actionInfluence * 0.1
          );
          entity.setBroadcastSignal(newSignal);
        }
      }
    }
  }

  private processCreatureObstacles(entity: ICreature): void {
    // Check for obstacle interactions at current position
    const interactionResult = this.obstacleSystem.checkInteraction(
      entity,
      entity.position
    );

    if (interactionResult.blocked) {
      // Apply collision effects
      if (interactionResult.damage > 0) {
        entity.energy = Math.max(0, entity.energy - interactionResult.damage);
      }

      // Apply status effects
      for (const effect of interactionResult.statusEffects) {
        // This would integrate with a creature status effect system
        // For now, we'll apply simple energy modifications
        if (effect.type === "poisoned") {
          entity.energy = Math.max(0, entity.energy - effect.magnitude);
        } else if (effect.type === "protected") {
          // Protected status could reduce damage from other sources
          // This would be handled by a more complex status system
        }
      }
    }

    // Detect nearby obstacles for pathfinding and behavior
    const detectionRange = 10; // This could be a creature trait
    const detectedObstacles = this.obstacleSystem.detectObstacles(
      entity,
      detectionRange
    );

    if (detectedObstacles.length > 0) {
      // This information could be used by the creature's AI for:
      // - Pathfinding around obstacles
      // - Seeking shelter when threatened
      // - Avoiding dangerous areas
      // - Finding resource points

      // For now, we'll just adjust the creature's broadcast signal based on danger
      const dangerLevel = detectedObstacles.reduce(
        (max, detection) => Math.max(max, detection.dangerLevel),
        0
      );

      if (dangerLevel > 0.5 && entity.setBroadcastSignal) {
        // Increase broadcast signal when in danger (warning others)
        const currentSignal = entity.getBroadcastSignal();
        const newSignal = Math.min(1.0, currentSignal + dangerLevel * 0.2);
        entity.setBroadcastSignal(newSignal);
      }
    }
  }
}
