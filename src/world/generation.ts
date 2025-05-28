/**
 * World generation utilities
 */

import { IRandom } from "../core/interfaces";
import {
  TerrainType,
  ResourceType,
  ResourceNode,
  Position,
  WorldGenerationOptions,
} from "./types";
import { DEFAULT_TERRAIN_DISTRIBUTION, getResourceGeneration } from "./terrain";

/**
 * Generate terrain for a world using the specified algorithm
 */
export function generateTerrain(
  width: number,
  height: number,
  random: IRandom,
  options: WorldGenerationOptions = {
    terrainAlgorithm: "random",
    resourcePlacement: "random",
    obstaclePlacement: "random",
    smoothingPasses: 3,
  },
  terrainDistribution: Partial<Record<TerrainType, number>> = {}
): TerrainType[][] {
  const distribution = {
    ...DEFAULT_TERRAIN_DISTRIBUTION,
    ...terrainDistribution,
  };

  switch (options.terrainAlgorithm) {
    case "random":
      return generateRandomTerrain(width, height, random, distribution);
    case "perlin":
      return generatePerlinTerrain(width, height, random, distribution);
    case "cellular":
      return generateCellularTerrain(
        width,
        height,
        random,
        distribution,
        options.smoothingPasses
      );
    default:
      return generateRandomTerrain(width, height, random, distribution);
  }
}

/**
 * Generate random terrain distribution
 */
function generateRandomTerrain(
  width: number,
  height: number,
  random: IRandom,
  distribution: Record<TerrainType, number>
): TerrainType[][] {
  const terrain: TerrainType[][] = [];
  const terrainTypes = Object.keys(distribution) as TerrainType[];
  const weights = terrainTypes.map((type) => distribution[type]);

  for (let y = 0; y < height; y++) {
    terrain[y] = [];
    for (let x = 0; x < width; x++) {
      terrain[y][x] = weightedRandomChoice(terrainTypes, weights, random);
    }
  }

  return terrain;
}

/**
 * Generate terrain using simplified Perlin-like noise
 */
function generatePerlinTerrain(
  width: number,
  height: number,
  random: IRandom,
  distribution: Record<TerrainType, number>
): TerrainType[][] {
  const terrain: TerrainType[][] = [];
  const terrainTypes = Object.keys(distribution) as TerrainType[];
  const scale = 0.1; // Noise scale

  // Generate noise map
  const noiseMap: number[][] = [];
  for (let y = 0; y < height; y++) {
    noiseMap[y] = [];
    for (let x = 0; x < width; x++) {
      // Simplified noise function
      const noise = simplexNoise(x * scale, y * scale, random);
      noiseMap[y][x] = (noise + 1) / 2; // Normalize to 0-1
    }
  }

  // Map noise values to terrain types
  for (let y = 0; y < height; y++) {
    terrain[y] = [];
    for (let x = 0; x < width; x++) {
      const noiseValue = noiseMap[y][x];
      terrain[y][x] = mapNoiseToTerrain(noiseValue, terrainTypes, distribution);
    }
  }

  return terrain;
}

/**
 * Generate terrain using cellular automata
 */
function generateCellularTerrain(
  width: number,
  height: number,
  random: IRandom,
  distribution: Record<TerrainType, number>,
  smoothingPasses: number
): TerrainType[][] {
  // Start with random terrain
  let terrain = generateRandomTerrain(width, height, random, distribution);

  // Apply cellular automata smoothing
  for (let pass = 0; pass < smoothingPasses; pass++) {
    terrain = applyCellularSmoothing(terrain, width, height);
  }

  return terrain;
}

/**
 * Apply cellular automata smoothing to terrain
 */
function applyCellularSmoothing(
  terrain: TerrainType[][],
  width: number,
  height: number
): TerrainType[][] {
  const newTerrain: TerrainType[][] = [];

  for (let y = 0; y < height; y++) {
    newTerrain[y] = [];
    for (let x = 0; x < width; x++) {
      const neighbors = getNeighborTerrain(terrain, x, y, width, height);
      newTerrain[y][x] = getMostCommonTerrain(neighbors) || terrain[y][x];
    }
  }

  return newTerrain;
}

/**
 * Get neighboring terrain types
 */
function getNeighborTerrain(
  terrain: TerrainType[][],
  x: number,
  y: number,
  width: number,
  height: number
): TerrainType[] {
  const neighbors: TerrainType[] = [];

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        neighbors.push(terrain[ny][nx]);
      }
    }
  }

  return neighbors;
}

/**
 * Get the most common terrain type from a list
 */
function getMostCommonTerrain(terrains: TerrainType[]): TerrainType | null {
  if (terrains.length === 0) return null;

  const counts = new Map<TerrainType, number>();

  for (const terrain of terrains) {
    counts.set(terrain, (counts.get(terrain) || 0) + 1);
  }

  let maxCount = 0;
  let mostCommon: TerrainType | null = null;

  for (const [terrain, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = terrain;
    }
  }

  return mostCommon;
}

/**
 * Generate resource nodes for the world
 */
export function generateResources(
  terrain: TerrainType[][],
  width: number,
  height: number,
  random: IRandom,
  density: number,
  placement: "random" | "clustered" | "terrain-based"
): ResourceNode[] {
  switch (placement) {
    case "random":
      return generateRandomResources(terrain, width, height, random, density);
    case "clustered":
      return generateClusteredResources(
        terrain,
        width,
        height,
        random,
        density
      );
    case "terrain-based":
      return generateTerrainBasedResources(
        terrain,
        width,
        height,
        random,
        density
      );
    default:
      return generateRandomResources(terrain, width, height, random, density);
  }
}

/**
 * Generate randomly distributed resources
 */
function generateRandomResources(
  terrain: TerrainType[][],
  width: number,
  height: number,
  random: IRandom,
  density: number
): ResourceNode[] {
  const resources: ResourceNode[] = [];
  const totalCells = width * height;
  const resourceCount = Math.floor(totalCells * density);

  for (let i = 0; i < resourceCount; i++) {
    const x = random.randomInt(0, width);
    const y = random.randomInt(0, height);
    const terrainType = terrain[y][x];

    // Choose resource type based on terrain
    const resourceType = chooseResourceForTerrain(terrainType, random);
    if (resourceType) {
      resources.push(createResourceNode(resourceType, { x, y }, random));
    }
  }

  return resources;
}

/**
 * Generate terrain-based resources
 */
function generateTerrainBasedResources(
  terrain: TerrainType[][],
  width: number,
  height: number,
  random: IRandom,
  density: number
): ResourceNode[] {
  const resources: ResourceNode[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const terrainType = terrain[y][x];

      // Check each resource type for this terrain
      for (const resourceType of Object.values(ResourceType)) {
        const generationRate = getResourceGeneration(terrainType, resourceType);

        if (generationRate > 0 && random.random() < generationRate * density) {
          resources.push(createResourceNode(resourceType, { x, y }, random));
        }
      }
    }
  }

  return resources;
}

/**
 * Generate clustered resources
 */
function generateClusteredResources(
  _terrain: TerrainType[][],
  width: number,
  height: number,
  random: IRandom,
  density: number
): ResourceNode[] {
  const resources: ResourceNode[] = [];
  const clusterCount = Math.floor(width * height * density * 0.1); // Fewer, larger clusters

  for (let i = 0; i < clusterCount; i++) {
    const centerX = random.randomInt(0, width);
    const centerY = random.randomInt(0, height);
    const clusterSize = random.randomInt(3, 8);
    const resourceType = random.choice(Object.values(ResourceType));

    // Generate cluster around center
    for (let j = 0; j < clusterSize; j++) {
      const offsetX = random.randomInt(-2, 3);
      const offsetY = random.randomInt(-2, 3);
      const x = Math.max(0, Math.min(width - 1, centerX + offsetX));
      const y = Math.max(0, Math.min(height - 1, centerY + offsetY));

      resources.push(createResourceNode(resourceType, { x, y }, random));
    }
  }

  return resources;
}

/**
 * Generate obstacles for the world
 */
export function generateObstacles(
  width: number,
  height: number,
  random: IRandom,
  density: number,
  placement: "random" | "clustered" | "terrain-based"
): Position[] {
  const obstacles: Position[] = [];
  const totalCells = width * height;
  const obstacleCount = Math.floor(totalCells * density);

  switch (placement) {
    case "random":
      for (let i = 0; i < obstacleCount; i++) {
        obstacles.push({
          x: random.randomInt(0, width),
          y: random.randomInt(0, height),
        });
      }
      break;

    case "clustered":
      const clusterCount = Math.floor(obstacleCount * 0.2);
      for (let i = 0; i < clusterCount; i++) {
        const centerX = random.randomInt(0, width);
        const centerY = random.randomInt(0, height);
        const clusterSize = random.randomInt(2, 6);

        for (let j = 0; j < clusterSize; j++) {
          const offsetX = random.randomInt(-1, 2);
          const offsetY = random.randomInt(-1, 2);
          const x = Math.max(0, Math.min(width - 1, centerX + offsetX));
          const y = Math.max(0, Math.min(height - 1, centerY + offsetY));

          obstacles.push({ x, y });
        }
      }
      break;

    default:
      // Default to random
      for (let i = 0; i < obstacleCount; i++) {
        obstacles.push({
          x: random.randomInt(0, width),
          y: random.randomInt(0, height),
        });
      }
  }

  return obstacles;
}

/**
 * Helper functions
 */

function weightedRandomChoice<T>(
  items: T[],
  weights: number[],
  random: IRandom
): T {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let randomValue = random.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    randomValue -= weights[i];
    if (randomValue <= 0) {
      return items[i];
    }
  }

  return items[items.length - 1];
}

function simplexNoise(x: number, y: number, random: IRandom): number {
  // Simplified noise function - in a real implementation, you'd use proper Simplex noise
  const seed = random.seed;
  const a = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return (a - Math.floor(a)) * 2 - 1;
}

function mapNoiseToTerrain(
  noiseValue: number,
  terrainTypes: TerrainType[],
  distribution: Record<TerrainType, number>
): TerrainType {
  // Map noise value to terrain type based on distribution
  let cumulative = 0;
  for (const terrain of terrainTypes) {
    cumulative += distribution[terrain];
    if (noiseValue <= cumulative) {
      return terrain;
    }
  }
  return terrainTypes[terrainTypes.length - 1];
}

function chooseResourceForTerrain(
  terrain: TerrainType,
  random: IRandom
): ResourceType | null {
  const possibleResources: ResourceType[] = [];

  for (const resourceType of Object.values(ResourceType)) {
    const generationRate = getResourceGeneration(terrain, resourceType);
    if (generationRate > 0) {
      possibleResources.push(resourceType);
    }
  }

  return possibleResources.length > 0 ? random.choice(possibleResources) : null;
}

function createResourceNode(
  type: ResourceType,
  position: Position,
  random: IRandom
): ResourceNode {
  const baseAmount = 50;
  const variation = 0.5;

  const amount = Math.floor(
    baseAmount * (1 + (random.random() - 0.5) * variation)
  );

  return {
    type,
    position,
    amount,
    maxAmount: amount,
    regenerationRate: amount * 0.01, // 1% per tick
  };
}
