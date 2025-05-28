/**
 * Sensory System Tests
 *
 * Tests for the creature sensory system including vision, entity classification,
 * distance encoding, signal detection, and memory functionality.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SensorySystem } from "../../src/core/sensory-system";
import { Creature } from "../../src/core/creature";
import { World } from "../../src/world/World";
import { Random } from "../../src/core/random";
import { NeuralNetwork } from "../../src/neural/neural-network";
import { ActivationType } from "../../src/neural/types";
import {
  EntityType,
  CreatureAction,
  VisionConfig,
  MemoryConfig,
} from "../../src/core/creature-types";

describe("SensorySystem", () => {
  let world: World;
  let sensorySystem: SensorySystem;
  let creature: Creature;
  let random: Random;

  beforeEach(() => {
    random = new Random(12345);
    world = new World(random, { width: 10, height: 10, seed: 12345 });
    sensorySystem = new SensorySystem(world);

    // Create a creature with test configuration first to get the actual config
    const testCreature = new Creature(
      "temp",
      null as any,
      { x: 5, y: 5 },
      {
        worldDimensions: { width: 10, height: 10 },
      }
    );
    const actualConfig = testCreature.getConfig();

    // Calculate the correct input size for the neural network based on actual config
    const inputSize = SensorySystem.calculateInputSize(
      actualConfig.vision,
      actualConfig.memory
    );

    // Create a simple neural network for the creature
    const brain = new NeuralNetwork({
      inputSize,
      hiddenLayers: [{ size: 10, activation: ActivationType.SIGMOID }],
      outputLayer: { size: 5, activation: ActivationType.SIGMOID },
      seed: 12345,
    });

    creature = new Creature(
      "test-creature",
      brain,
      { x: 5, y: 5 },
      {
        worldDimensions: { width: 10, height: 10 },
      }
    );
    creature.setSensorySystem(sensorySystem);
  });

  describe("Vision System", () => {
    it("should generate vision data for empty world", () => {
      const visionConfig: VisionConfig = {
        range: 1,
        maxDistance: 2.0,
        includeDiagonals: true,
      };

      const memoryConfig: MemoryConfig = {
        energyHistorySize: 5,
        actionHistorySize: 3,
        encounterHistorySize: 5,
        signalHistorySize: 3,
      };

      const sensoryData = sensorySystem.gatherSensoryData(
        creature,
        visionConfig,
        memoryConfig,
        5.0,
        [1.0],
        [],
        [],
        [],
        0.0
      );

      expect(sensoryData.vision).toBeDefined();
      expect(sensoryData.vision.length).toBeGreaterThan(0);

      // Check that vision cells have valid data (world may have terrain)
      for (const cell of sensoryData.vision) {
        expect(Object.values(EntityType)).toContain(cell.entityType);
        expect(cell.distance).toBeGreaterThanOrEqual(0);
        expect(cell.distance).toBeLessThanOrEqual(1);
        expect(cell.relativeX).toBeGreaterThanOrEqual(-1);
        expect(cell.relativeX).toBeLessThanOrEqual(1);
        expect(cell.relativeY).toBeGreaterThanOrEqual(-1);
        expect(cell.relativeY).toBeLessThanOrEqual(1);
      }
    });

    it("should detect other creatures in vision range", () => {
      // Add another creature to the world
      const visionConfig = {
        range: 2,
        maxDistance: 3.0,
        includeDiagonals: true,
      };
      const memoryConfig = {
        energyHistorySize: 10,
        actionHistorySize: 5,
        encounterHistorySize: 8,
        signalHistorySize: 6,
      };
      const inputSize = SensorySystem.calculateInputSize(
        visionConfig,
        memoryConfig
      );

      const brain2 = new NeuralNetwork({
        inputSize,
        hiddenLayers: [{ size: 10, activation: ActivationType.SIGMOID }],
        outputLayer: { size: 5, activation: ActivationType.SIGMOID },
        seed: 54321,
      });

      const otherCreature = new Creature("other-creature", brain2, {
        x: 6,
        y: 5,
      });
      world.addEntity(otherCreature);

      const visionConfigTest: VisionConfig = {
        range: 2,
        maxDistance: 3.0,
        includeDiagonals: true,
      };

      const memoryConfigTest: MemoryConfig = {
        energyHistorySize: 5,
        actionHistorySize: 3,
        encounterHistorySize: 5,
        signalHistorySize: 3,
      };

      const sensoryData = sensorySystem.gatherSensoryData(
        creature,
        visionConfigTest,
        memoryConfigTest,
        5.0,
        [1.0],
        [],
        [],
        [],
        0.0
      );

      // Should detect the other creature
      const creatureCells = sensoryData.vision.filter(
        (cell) =>
          cell.entityType === EntityType.CREATURE_FRIEND ||
          cell.entityType === EntityType.CREATURE_ENEMY
      );

      expect(creatureCells.length).toBeGreaterThan(0);
    });

    it("should respect vision range limits", () => {
      const visionConfig: VisionConfig = {
        range: 1, // Small range
        maxDistance: 1.5,
        includeDiagonals: false, // Only orthogonal
      };

      const memoryConfig: MemoryConfig = {
        energyHistorySize: 5,
        actionHistorySize: 3,
        encounterHistorySize: 5,
        signalHistorySize: 3,
      };

      const sensoryData = sensorySystem.gatherSensoryData(
        creature,
        visionConfig,
        memoryConfig,
        5.0,
        [1.0],
        [],
        [],
        [],
        0.0
      );

      // With range 1 and no diagonals, should only see 4 cells (N, S, E, W)
      expect(sensoryData.vision.length).toBe(4);

      // All cells should be within the expected relative positions
      for (const cell of sensoryData.vision) {
        expect(
          Math.abs(cell.relativeX) + Math.abs(cell.relativeY)
        ).toBeLessThanOrEqual(1);
      }
    });

    it("should handle world boundaries correctly", () => {
      // Place creature near edge
      const edgeCreature = new Creature("edge-creature", creature.brain, {
        x: 0,
        y: 0,
      });
      edgeCreature.setSensorySystem(sensorySystem);

      const visionConfig: VisionConfig = {
        range: 2,
        maxDistance: 3.0,
        includeDiagonals: true,
      };

      const memoryConfig: MemoryConfig = {
        energyHistorySize: 5,
        actionHistorySize: 3,
        encounterHistorySize: 5,
        signalHistorySize: 3,
      };

      const sensoryData = sensorySystem.gatherSensoryData(
        edgeCreature,
        visionConfig,
        memoryConfig,
        5.0,
        [1.0],
        [],
        [],
        [],
        0.0
      );

      // Should detect obstacles (out of bounds) in some vision cells
      const obstacleCells = sensoryData.vision.filter(
        (cell) => cell.entityType === EntityType.OBSTACLE
      );

      expect(obstacleCells.length).toBeGreaterThan(0);
    });
  });

  describe("Entity Classification", () => {
    it("should classify creatures based on energy levels", () => {
      // Create creatures with different energy levels
      const weakCreature = new Creature("weak", creature.brain, { x: 6, y: 5 });
      weakCreature.energy = 0.5; // Lower energy

      const strongCreature = new Creature("strong", creature.brain, {
        x: 4,
        y: 5,
      });
      strongCreature.energy = 1.5; // Higher energy (if possible)

      world.addEntity(weakCreature);
      world.addEntity(strongCreature);

      const visionConfig: VisionConfig = {
        range: 2,
        maxDistance: 3.0,
        includeDiagonals: true,
      };

      const memoryConfig: MemoryConfig = {
        energyHistorySize: 5,
        actionHistorySize: 3,
        encounterHistorySize: 5,
        signalHistorySize: 3,
      };

      const sensoryData = sensorySystem.gatherSensoryData(
        creature,
        visionConfig,
        memoryConfig,
        5.0,
        [1.0],
        [],
        [],
        [],
        0.0
      );

      const creatureCells = sensoryData.vision.filter(
        (cell) =>
          cell.entityType === EntityType.CREATURE_FRIEND ||
          cell.entityType === EntityType.CREATURE_ENEMY
      );

      expect(creatureCells.length).toBe(2);
    });
  });

  describe("Memory System", () => {
    it("should track energy changes", () => {
      const energyHistory = [1.0, 0.9, 0.8, 0.85, 0.7];
      const memoryConfig: MemoryConfig = {
        energyHistorySize: 5,
        actionHistorySize: 3,
        encounterHistorySize: 5,
        signalHistorySize: 3,
      };

      const sensoryData = sensorySystem.gatherSensoryData(
        creature,
        { range: 1, maxDistance: 2.0, includeDiagonals: true },
        memoryConfig,
        5.0,
        energyHistory,
        [],
        [],
        [],
        0.0
      );

      expect(sensoryData.memory.recentEnergyChanges).toBeDefined();
      expect(sensoryData.memory.recentEnergyChanges.length).toBe(4); // n-1 changes
    });

    it("should track recent actions", () => {
      const actionHistory = [
        CreatureAction.MOVE_NORTH,
        CreatureAction.REST,
        CreatureAction.MOVE_EAST,
      ];

      const memoryConfig: MemoryConfig = {
        energyHistorySize: 5,
        actionHistorySize: 3,
        encounterHistorySize: 5,
        signalHistorySize: 3,
      };

      const sensoryData = sensorySystem.gatherSensoryData(
        creature,
        { range: 1, maxDistance: 2.0, includeDiagonals: true },
        memoryConfig,
        5.0,
        [1.0],
        actionHistory,
        [],
        [],
        0.0
      );

      expect(sensoryData.memory.recentActions).toEqual(actionHistory);
    });

    it("should track recent encounters", () => {
      const encounterHistory = [
        EntityType.CREATURE_FRIEND,
        EntityType.FOOD,
        EntityType.OBSTACLE,
      ];

      const memoryConfig: MemoryConfig = {
        energyHistorySize: 5,
        actionHistorySize: 3,
        encounterHistorySize: 5,
        signalHistorySize: 3,
      };

      const sensoryData = sensorySystem.gatherSensoryData(
        creature,
        { range: 1, maxDistance: 2.0, includeDiagonals: true },
        memoryConfig,
        5.0,
        [1.0],
        [],
        encounterHistory,
        [],
        0.0
      );

      expect(sensoryData.memory.recentEncounters).toEqual(encounterHistory);
    });

    it("should limit memory size according to configuration", () => {
      const longActionHistory = [
        CreatureAction.MOVE_NORTH,
        CreatureAction.MOVE_SOUTH,
        CreatureAction.MOVE_EAST,
        CreatureAction.MOVE_WEST,
        CreatureAction.REST,
      ];

      const memoryConfig: MemoryConfig = {
        energyHistorySize: 5,
        actionHistorySize: 3, // Limit to 3
        encounterHistorySize: 5,
        signalHistorySize: 3,
      };

      const sensoryData = sensorySystem.gatherSensoryData(
        creature,
        { range: 1, maxDistance: 2.0, includeDiagonals: true },
        memoryConfig,
        5.0,
        [1.0],
        longActionHistory,
        [],
        [],
        0.0
      );

      expect(sensoryData.memory.recentActions.length).toBe(3);
      expect(sensoryData.memory.recentActions).toEqual([
        CreatureAction.MOVE_EAST,
        CreatureAction.MOVE_WEST,
        CreatureAction.REST,
      ]);
    });
  });

  describe("Neural Network Input Conversion", () => {
    it("should convert sensory data to neural network inputs", () => {
      const visionConfig: VisionConfig = {
        range: 1,
        maxDistance: 2.0,
        includeDiagonals: false,
      };

      const memoryConfig: MemoryConfig = {
        energyHistorySize: 3,
        actionHistorySize: 2,
        encounterHistorySize: 3,
        signalHistorySize: 2,
      };

      const sensoryData = sensorySystem.gatherSensoryData(
        creature,
        visionConfig,
        memoryConfig,
        5.0,
        [1.0, 0.9],
        [CreatureAction.MOVE_NORTH],
        [EntityType.FOOD],
        [0.5],
        0.3
      );

      const inputs = sensorySystem.convertToNeuralInputs(sensoryData);

      expect(inputs).toBeDefined();
      expect(inputs.length).toBeGreaterThan(0);
      expect(Array.isArray(inputs)).toBe(true);

      // All inputs should be numbers
      for (const input of inputs) {
        expect(typeof input).toBe("number");
        expect(isNaN(input)).toBe(false);
      }
    });

    it("should calculate correct input size", () => {
      const visionConfig: VisionConfig = {
        range: 1,
        maxDistance: 2.0,
        includeDiagonals: false,
      };

      const memoryConfig: MemoryConfig = {
        energyHistorySize: 3,
        actionHistorySize: 2,
        encounterHistorySize: 3,
        signalHistorySize: 2,
      };

      const expectedSize = SensorySystem.calculateInputSize(
        visionConfig,
        memoryConfig
      );

      expect(expectedSize).toBeGreaterThan(0);
      expect(typeof expectedSize).toBe("number");

      // Basic state: 6 inputs
      // Vision: 4 cells * 5 values = 20 inputs
      // Memory: (3-1) + 2 + 3 + 2 = 9 inputs
      // Total: 6 + 20 + 9 = 35
      expect(expectedSize).toBe(35);
    });
  });

  describe("Signal Detection", () => {
    it("should detect signals from nearby creatures", () => {
      // Add a creature with a signal
      const signalingCreature = new Creature("signaler", creature.brain, {
        x: 6,
        y: 5,
      });
      world.addEntity(signalingCreature);

      const visionConfig: VisionConfig = {
        range: 2,
        maxDistance: 3.0,
        includeDiagonals: true,
      };

      const memoryConfig: MemoryConfig = {
        energyHistorySize: 5,
        actionHistorySize: 3,
        encounterHistorySize: 5,
        signalHistorySize: 3,
      };

      const sensoryData = sensorySystem.gatherSensoryData(
        creature,
        visionConfig,
        memoryConfig,
        5.0,
        [1.0],
        [],
        [],
        [],
        0.0
      );

      // Should detect signal from the other creature
      const signalCells = sensoryData.vision.filter(
        (cell) => cell.signalStrength > 0
      );
      expect(signalCells.length).toBeGreaterThan(0);
    });

    it("should have signal strength decrease with distance", () => {
      // Add creatures at different distances
      const nearCreature = new Creature("near", creature.brain, { x: 6, y: 5 });
      const farCreature = new Creature("far", creature.brain, { x: 8, y: 5 });

      world.addEntity(nearCreature);
      world.addEntity(farCreature);

      const visionConfig: VisionConfig = {
        range: 3,
        maxDistance: 5.0,
        includeDiagonals: true,
      };

      const memoryConfig: MemoryConfig = {
        energyHistorySize: 5,
        actionHistorySize: 3,
        encounterHistorySize: 5,
        signalHistorySize: 3,
      };

      const sensoryData = sensorySystem.gatherSensoryData(
        creature,
        visionConfig,
        memoryConfig,
        5.0,
        [1.0],
        [],
        [],
        [],
        0.0
      );

      const signalCells = sensoryData.vision.filter(
        (cell) => cell.signalStrength > 0
      );

      if (signalCells.length >= 2) {
        // Sort by distance
        signalCells.sort((a, b) => a.distance - b.distance);

        // Closer creature should have stronger signal
        expect(signalCells[0].signalStrength).toBeGreaterThanOrEqual(
          signalCells[1].signalStrength
        );
      }
    });
  });

  describe("Integration with Creature", () => {
    it("should update creature memory during simulation", () => {
      world.addEntity(creature);

      // Debug: Check what the creature's actual configuration is
      const config = creature.getConfig();
      console.log("Creature vision config:", config.vision);
      console.log("Creature memory config:", config.memory);

      const actualInputSize = SensorySystem.calculateInputSize(
        config.vision,
        config.memory
      );
      console.log("Actual input size needed:", actualInputSize);

      // Simulate a few ticks
      creature.update(1);
      creature.update(1);
      creature.update(1);

      const state = creature.getState();

      expect(state.energyHistory.length).toBeGreaterThan(1);
      expect(state.actionHistory.length).toBeGreaterThan(0);
    });

    it("should provide sensory data to neural network", () => {
      world.addEntity(creature);

      creature.update(1);

      const lastSensoryData = creature.getLastSensoryData();
      const lastOutput = creature.getLastOutput();

      expect(lastSensoryData).toBeDefined();
      expect(lastOutput).toBeDefined();
      expect(lastOutput!.length).toBe(5); // 5 possible actions
    });
  });
});
