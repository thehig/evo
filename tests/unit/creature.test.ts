/**
 * Creature class unit tests
 *
 * Tests for the basic Creature implementation including neural network integration,
 * energy system, actions, and deterministic behavior.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Creature } from "@/core/creature.js";
import { NeuralNetwork } from "@/neural/neural-network.js";
import { ActivationType } from "@/neural/types.js";
import {
  CreatureAction,
  ICreatureConfig,
  DEFAULT_CREATURE_CONFIG,
} from "@/core/creature-types.js";
import { SensorySystem } from "@/core/sensory-system.js";
import { World } from "@/world/World.js";
import { Random } from "@/core/random.js";

describe("Creature", () => {
  let creature: Creature;
  let brain: NeuralNetwork;
  let world: World;
  let sensorySystem: SensorySystem;
  const testConfig: Partial<ICreatureConfig> = {
    initialEnergy: 0.8,
    maxEnergy: 1.0,
    energyCosts: {
      movement: 0.1,
      rest: -0.05,
      metabolism: 0.01,
    },
    maxAge: 100,
    worldDimensions: {
      width: 50,
      height: 50,
    },
    vision: {
      range: 1,
      maxDistance: 2.0,
      includeDiagonals: true,
    },
    memory: {
      energyHistorySize: 5,
      actionHistorySize: 3,
      encounterHistorySize: 4,
      signalHistorySize: 3,
    },
  };

  beforeEach(() => {
    // Create world and sensory system
    const random = new Random(12345);
    world = new World(random, { width: 50, height: 50 });
    sensorySystem = new SensorySystem(world);

    // Calculate the correct input size for the neural network
    const mergedConfig = { ...DEFAULT_CREATURE_CONFIG, ...testConfig };
    const expectedInputSize = SensorySystem.calculateInputSize(
      mergedConfig.vision,
      mergedConfig.memory
    );

    // Debug: Log the configuration and expected input size
    console.log("Merged config vision:", mergedConfig.vision);
    console.log("Merged config memory:", mergedConfig.memory);
    console.log("Expected input size:", expectedInputSize);

    // Create a neural network with the correct input size
    brain = new NeuralNetwork({
      inputSize: expectedInputSize,
      hiddenLayers: [{ size: 8, activation: ActivationType.SIGMOID }],
      outputLayer: { size: 5, activation: ActivationType.SIGMOID },
      seed: 12345,
    });

    creature = new Creature(
      "test-creature",
      brain,
      { x: 10, y: 15 },
      testConfig
    );

    // Set up the sensory system
    creature.setSensorySystem(sensorySystem);
    world.addEntity(creature);
  });

  describe("Constructor and Basic Properties", () => {
    it("should create a creature with correct initial properties", () => {
      expect(creature.id).toBe("test-creature");
      expect(creature.position).toEqual({ x: 10, y: 15 });
      expect(creature.energy).toBe(0.8);
      expect(creature.age).toBe(0);
      expect(creature.alive).toBe(true);
      expect(creature.active).toBe(true);
      expect(creature.brain).toBe(brain);
    });

    it("should use default config when no config provided", () => {
      const defaultCreature = new Creature("default", brain, { x: 0, y: 0 });
      expect(defaultCreature.energy).toBe(
        DEFAULT_CREATURE_CONFIG.initialEnergy
      );
      expect(defaultCreature.getConfig().maxEnergy).toBe(
        DEFAULT_CREATURE_CONFIG.maxEnergy
      );
    });

    it("should merge provided config with defaults", () => {
      const config = creature.getConfig();
      expect(config.initialEnergy).toBe(0.8); // From testConfig
      expect(config.maxEnergy).toBe(1.0); // From testConfig
      expect(config.energyCosts.movement).toBe(0.1); // From testConfig
    });
  });

  describe("Energy System", () => {
    it("should clamp energy to valid range", () => {
      creature.energy = 1.5; // Above max
      expect(creature.energy).toBe(1.0);

      creature.energy = -0.5; // Below min
      expect(creature.energy).toBe(0);
    });

    it("should die when energy reaches zero", () => {
      creature.energy = 0;
      expect(creature.alive).toBe(false);
    });

    it("should apply metabolic cost during update", () => {
      const initialEnergy = creature.energy;
      creature.update(1);
      // Energy should change due to metabolism + action costs
      // The exact change depends on the action taken by the neural network
      // Metabolism cost is 0.01, but action could be REST (-0.05) or movement (0.1)
      expect(creature.energy).not.toBe(initialEnergy);

      // Verify that metabolism was applied by checking the range of possible outcomes
      const metabolismCost = 0.01;
      const restCost = -0.05; // REST gives energy
      const movementCost = 0.1;

      const minPossibleEnergy = initialEnergy - metabolismCost - movementCost;
      const maxPossibleEnergy = initialEnergy - metabolismCost - restCost;

      expect(creature.energy).toBeGreaterThanOrEqual(minPossibleEnergy);
      expect(creature.energy).toBeLessThanOrEqual(maxPossibleEnergy);
    });

    it("should update hunger based on energy level", () => {
      creature.energy = 0.3;
      creature.update(1);
      const state = creature.getState();
      // Hunger is based on energy after update (which includes action costs)
      // So we expect hunger to be approximately 1.0 - current_energy
      expect(state.hunger).toBeGreaterThan(0.6); // Should be hungry
      expect(state.hunger).toBeLessThan(1.0); // But not maximum hunger
    });
  });

  describe("Age and Lifespan", () => {
    it("should age by 1 each update", () => {
      expect(creature.age).toBe(0);
      creature.update(1);
      expect(creature.age).toBe(1);
      creature.update(1);
      expect(creature.age).toBe(2);
    });

    it("should die when reaching max age", () => {
      // Set age close to max
      for (let i = 0; i < testConfig.maxAge! - 1; i++) {
        creature.update(1);
        if (!creature.alive) break; // In case energy runs out first
      }

      if (creature.alive) {
        creature.update(1); // This should kill it
        expect(creature.alive).toBe(false);
      }
    });

    it("should consider age in alive status", () => {
      const shortLivedCreature = new Creature(
        "short-lived",
        brain,
        { x: 0, y: 0 },
        { ...testConfig, maxAge: 5 }
      );

      for (let i = 0; i < 6; i++) {
        shortLivedCreature.update(1);
      }

      expect(shortLivedCreature.alive).toBe(false);
    });
  });

  describe("Movement and Actions", () => {
    it("should move north correctly", () => {
      const initialY = creature.position.y;
      // Manually execute move north action
      creature["executeAction"](CreatureAction.MOVE_NORTH);
      expect(creature.position.y).toBe(initialY - 1);
      expect(creature.position.x).toBe(10); // X should not change
    });

    it("should move south correctly", () => {
      const initialY = creature.position.y;
      creature["executeAction"](CreatureAction.MOVE_SOUTH);
      expect(creature.position.y).toBe(initialY + 1);
    });

    it("should move east correctly", () => {
      const initialX = creature.position.x;
      creature["executeAction"](CreatureAction.MOVE_EAST);
      expect(creature.position.x).toBe(initialX + 1);
    });

    it("should move west correctly", () => {
      const initialX = creature.position.x;
      creature["executeAction"](CreatureAction.MOVE_WEST);
      expect(creature.position.x).toBe(initialX - 1);
    });

    it("should respect world boundaries", () => {
      // Move to edge
      creature.position = { x: 0, y: 0 };
      creature["executeAction"](CreatureAction.MOVE_WEST);
      creature["executeAction"](CreatureAction.MOVE_NORTH);
      expect(creature.position.x).toBe(0);
      expect(creature.position.y).toBe(0);

      // Move to other edge
      creature.position = { x: 49, y: 49 }; // Max position for 50x50 world
      creature["executeAction"](CreatureAction.MOVE_EAST);
      creature["executeAction"](CreatureAction.MOVE_SOUTH);
      expect(creature.position.x).toBe(49);
      expect(creature.position.y).toBe(49);
    });

    it("should consume energy for movement", () => {
      const initialEnergy = creature.energy;
      creature["executeAction"](CreatureAction.MOVE_NORTH);
      expect(creature.energy).toBe(
        initialEnergy - testConfig.energyCosts!.movement!
      );
    });

    it("should gain energy when resting", () => {
      const initialEnergy = creature.energy;
      creature["executeAction"](CreatureAction.REST);
      expect(creature.energy).toBe(
        initialEnergy - testConfig.energyCosts!.rest!
      ); // rest cost is negative
    });
  });

  describe("Neural Network Integration", () => {
    it("should process sensory data through neural network", () => {
      creature.think();
      const output = creature.getLastOutput();
      expect(output).toBeDefined();
      expect(output).toHaveLength(5); // 5 possible actions
      expect(output!.every((val) => typeof val === "number")).toBe(true);
    });

    it("should generate sensory data correctly", () => {
      creature.think();
      const sensoryData = creature.getLastSensoryData();
      expect(sensoryData).toBeDefined();
      expect(sensoryData!.energy).toBe(creature.energy);
      expect(sensoryData!.positionX).toBeCloseTo(10 / 50, 2); // Normalized position
      expect(sensoryData!.positionY).toBeCloseTo(15 / 50, 2);
      expect(sensoryData!.vision).toHaveLength(8); // 3x3 vision grid minus center cell
    });

    it("should convert neural output to actions deterministically", () => {
      // Test with fixed neural network output
      const mockOutput = [0.1, 0.9, 0.2, 0.3, 0.4]; // MOVE_SOUTH should be selected
      const action = creature["outputToAction"](mockOutput);
      expect(action).toBe(CreatureAction.MOVE_SOUTH);
    });

    it("should handle empty output gracefully", () => {
      const action = creature["outputToAction"]([]);
      expect(action).toBe(CreatureAction.REST);
    });
  });

  describe("Deterministic Behavior", () => {
    it("should produce identical behavior with same neural network", () => {
      // Create two identical creatures
      const brain1 = new NeuralNetwork({
        inputSize: 14,
        hiddenLayers: [{ size: 8, activation: ActivationType.SIGMOID }],
        outputLayer: { size: 5, activation: ActivationType.SIGMOID },
        seed: 54321,
      });

      const brain2 = new NeuralNetwork({
        inputSize: 14,
        hiddenLayers: [{ size: 8, activation: ActivationType.SIGMOID }],
        outputLayer: { size: 5, activation: ActivationType.SIGMOID },
        seed: 54321, // Same seed
      });

      const creature1 = new Creature(
        "creature1",
        brain1,
        { x: 5, y: 5 },
        testConfig
      );
      const creature2 = new Creature(
        "creature2",
        brain2,
        { x: 5, y: 5 },
        testConfig
      );

      // Run several updates
      for (let i = 0; i < 10; i++) {
        creature1.update(1);
        creature2.update(1);

        // Should have identical positions and energy
        expect(creature1.position).toEqual(creature2.position);
        expect(creature1.energy).toBeCloseTo(creature2.energy, 10);
        expect(creature1.age).toBe(creature2.age);
      }
    });

    it("should produce consistent sensory data for same state", () => {
      creature.think();
      const sensoryData1 = creature.getLastSensoryData();

      creature.think();
      const sensoryData2 = creature.getLastSensoryData();

      expect(sensoryData1).toEqual(sensoryData2);
    });
  });

  describe("State Management", () => {
    it("should track internal state correctly", () => {
      const initialState = creature.getState();
      expect(initialState.hunger).toBe(0);
      expect(initialState.lastAction).toBeNull();
      expect(initialState.ticksSinceLastAction).toBe(0);

      creature.update(1);
      const updatedState = creature.getState();
      expect(updatedState.ticksSinceLastAction).toBe(0); // Reset after action
      expect(updatedState.lastAction).toBeDefined();
    });

    it("should update ticks since last action", () => {
      creature.update(1);
      let state = creature.getState();
      expect(state.ticksSinceLastAction).toBe(0);

      // Manually increment without calling act()
      creature["_state"].ticksSinceLastAction = 5;
      creature.update(1);
      state = creature.getState();
      expect(state.ticksSinceLastAction).toBe(0); // Should reset after act()
    });
  });

  describe("Lifecycle Management", () => {
    it("should not update when inactive", () => {
      creature.active = false;
      const initialAge = creature.age;
      const initialEnergy = creature.energy;

      creature.update(1);

      expect(creature.age).toBe(initialAge);
      expect(creature.energy).toBe(initialEnergy);
    });

    it("should not update when dead", () => {
      creature.energy = 0; // Kill the creature
      expect(creature.alive).toBe(false);

      const initialAge = creature.age;
      creature.update(1);

      expect(creature.age).toBe(initialAge); // Should not age when dead
    });

    it("should clean up properly when destroyed", () => {
      creature.destroy();
      expect(creature.active).toBe(false);
      expect(creature.alive).toBe(false);
    });
  });

  describe("Vision System", () => {
    it("should generate vision data of correct size", () => {
      const visionRange = testConfig.vision!.range!;
      const expectedSize = (visionRange * 2 + 1) ** 2 - 1; // 3x3 grid minus center cell

      creature.think();
      const sensoryData = creature.getLastSensoryData();
      expect(sensoryData!.vision).toHaveLength(expectedSize);
    });

    it("should generate deterministic vision data", () => {
      creature.think();
      const vision1 = creature.getLastSensoryData()!.vision;

      creature.think();
      const vision2 = creature.getLastSensoryData()!.vision;

      expect(vision1).toEqual(vision2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero energy gracefully", () => {
      creature.energy = 0;
      expect(() => creature.update(1)).not.toThrow();
      expect(creature.alive).toBe(false);
    });

    it("should handle maximum energy correctly", () => {
      creature.energy = testConfig.maxEnergy!;
      creature["executeAction"](CreatureAction.REST);
      expect(creature.energy).toBe(testConfig.maxEnergy!); // Should not exceed max
    });

    it("should handle reproduction placeholder", () => {
      const partner = new Creature("partner", brain, { x: 0, y: 0 });
      const offspring = creature.reproduce(partner);
      expect(offspring).toBeNull(); // Placeholder implementation
    });
  });

  describe("Configuration", () => {
    it("should return a copy of configuration", () => {
      const config1 = creature.getConfig();
      const config2 = creature.getConfig();
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Should be different objects
    });

    it("should not allow external modification of config", () => {
      const config = creature.getConfig();
      config.maxEnergy = 999;
      expect(creature.getConfig().maxEnergy).toBe(testConfig.maxEnergy);
    });
  });
});
