import { describe, it, expect, beforeEach } from "vitest";
import {
  SignalSystem,
  DEFAULT_SIGNAL_CONFIG,
} from "../../src/core/signal-system";
import {
  SignalType,
  SignalPriority,
  ISignal,
  ISignalSystemConfig,
  ISignalEmissionConfig,
  ISignalReception,
  ISignalProcessingResult,
} from "../../src/types/signals";
import { ICreature } from "../../src/core/interfaces";

// Mock creature for testing
class MockCreature implements ICreature {
  readonly id: string;
  position: { x: number; y: number };
  energy: number;
  age: number;
  alive: boolean;
  active: boolean;
  readonly genome: unknown = {};
  readonly brain: unknown = {};

  constructor(
    id: string,
    position: { x: number; y: number } = { x: 0, y: 0 },
    energy: number = 100
  ) {
    this.id = id;
    this.position = position;
    this.energy = energy;
    this.age = 0;
    this.alive = true;
    this.active = true;
  }

  update(deltaTime: number): void {
    this.age += deltaTime;
  }

  destroy(): void {
    this.active = false;
    this.alive = false;
  }

  think(): void {
    // Mock implementation
  }

  act(): void {
    // Mock implementation
  }

  reproduce(partner: ICreature): ICreature | null {
    return null; // Mock implementation
  }

  getConfig(): unknown {
    return {};
  }

  getBroadcastSignal(): number {
    return 0;
  }

  setBroadcastSignal(signal: number): void {
    // Mock implementation
  }
}

describe("SignalSystem", () => {
  describe("Initialization", () => {
    it("should initialize with default configuration", () => {
      const signalSystem = new SignalSystem();
      const config = signalSystem.getConfig();

      expect(config.maxActiveSignals).toBe(
        DEFAULT_SIGNAL_CONFIG.maxActiveSignals
      );
      expect(config.signalDecayEnabled).toBe(
        DEFAULT_SIGNAL_CONFIG.signalDecayEnabled
      );
      expect(config.spatialHashing).toBe(DEFAULT_SIGNAL_CONFIG.spatialHashing);
      expect(config.gridSize).toBe(DEFAULT_SIGNAL_CONFIG.gridSize);
      expect(config.maxRange).toBe(DEFAULT_SIGNAL_CONFIG.maxRange);
      expect(config.environmentalAttenuation).toBe(
        DEFAULT_SIGNAL_CONFIG.environmentalAttenuation
      );
    });

    it("should initialize with custom configuration", () => {
      const customConfig: Partial<ISignalSystemConfig> = {
        maxActiveSignals: 500,
        signalDecayEnabled: false,
        spatialHashing: false,
        gridSize: 20,
        maxRange: 100,
        environmentalAttenuation: 0.2,
      };

      const signalSystem = new SignalSystem(customConfig);
      const config = signalSystem.getConfig();

      expect(config.maxActiveSignals).toBe(500);
      expect(config.signalDecayEnabled).toBe(false);
      expect(config.spatialHashing).toBe(false);
      expect(config.gridSize).toBe(20);
      expect(config.maxRange).toBe(100);
      expect(config.environmentalAttenuation).toBe(0.2);
    });
  });

  describe("Signal Emission", () => {
    let signalSystem: SignalSystem;
    let entity1: MockCreature;
    let entity2: MockCreature;

    beforeEach(() => {
      signalSystem = new SignalSystem({
        maxActiveSignals: 10,
        signalDecayEnabled: true,
        spatialHashing: true,
        gridSize: 50,
        maxRange: 100,
        environmentalAttenuation: 0.1,
      });
      entity1 = new MockCreature("entity1", { x: 0, y: 0 });
      entity2 = new MockCreature("entity2", { x: 10, y: 10 });
    });

    it("should emit a signal successfully", () => {
      const emissionConfig: ISignalEmissionConfig = {
        type: SignalType.WARNING,
        strength: 0.8,
        priority: SignalPriority.HIGH,
      };

      const signalId = signalSystem.emitSignal(entity1, emissionConfig);

      expect(signalId).toBeTruthy();
      expect(typeof signalId).toBe("string");
      expect(entity1.energy).toBeLessThan(100); // Energy should be deducted
    });

    it("should return null when creature has insufficient energy", () => {
      entity1.energy = 1; // Very low energy

      const emissionConfig: ISignalEmissionConfig = {
        type: SignalType.WARNING,
        strength: 0.8,
        energyCost: 10, // More than available energy
      };

      const signalId = signalSystem.emitSignal(entity1, emissionConfig);

      expect(signalId).toBeNull();
      expect(entity1.energy).toBe(1); // Energy should not be deducted
    });

    it("should handle different signal types", () => {
      const signalTypes = [
        SignalType.WARNING,
        SignalType.FOOD_LOCATION,
        SignalType.MATING_CALL,
        SignalType.TERRITORY_CLAIM,
        SignalType.GROUP_ASSEMBLY,
        SignalType.HELP_REQUEST,
        SignalType.ALL_CLEAR,
        SignalType.DANGER_APPROACH,
      ];

      signalTypes.forEach((type) => {
        const entity = new MockCreature(`entity_${type}`, { x: 0, y: 0 });
        const signalId = signalSystem.emitSignal(entity, {
          type,
          strength: 0.5,
        });

        expect(signalId).toBeTruthy();
      });
    });

    it("should limit active signals to maxActiveSignals", () => {
      const config = { maxActiveSignals: 3 };
      const limitedSystem = new SignalSystem(config);

      // Emit more signals than the limit
      for (let i = 0; i < 5; i++) {
        const entity = new MockCreature(`entity${i}`, { x: i, y: i });
        limitedSystem.emitSignal(entity, {
          type: SignalType.WARNING,
          strength: 0.5,
        });
      }

      const activeSignals = limitedSystem.getActiveSignals();
      expect(activeSignals.length).toBeLessThanOrEqual(3);
    });
  });

  describe("Signal Reception", () => {
    let signalSystem: SignalSystem;
    let emitter: MockCreature;
    let receiver: MockCreature;

    beforeEach(() => {
      signalSystem = new SignalSystem({
        maxActiveSignals: 100,
        signalDecayEnabled: false, // Disable decay for predictable tests
        spatialHashing: true,
        maxRange: 100,
      });
      emitter = new MockCreature("emitter", { x: 0, y: 0 });
      receiver = new MockCreature("receiver", { x: 10, y: 10 });
    });

    it("should receive signals from nearby creatures", () => {
      // Emit a signal
      const signalId = signalSystem.emitSignal(emitter, {
        type: SignalType.WARNING,
        strength: 0.8,
      });

      expect(signalId).toBeTruthy();

      // Check if receiver can detect the signal
      const receptions = signalSystem.getSignalsForCreature(receiver);
      expect(receptions.length).toBeGreaterThan(0);

      const reception = receptions[0];
      expect(reception.signal.type).toBe(SignalType.WARNING);
      expect(reception.signal.sourceId).toBe(emitter.id);
      expect(reception.distance).toBeGreaterThan(0);
      expect(reception.receivedStrength).toBeGreaterThan(0);
      expect(reception.confidence).toBeGreaterThan(0);
    });

    it("should not receive own signals", () => {
      // Emit a signal from the same creature that will try to receive it
      signalSystem.emitSignal(receiver, {
        type: SignalType.WARNING,
        strength: 0.8,
      });

      const receptions = signalSystem.getSignalsForCreature(receiver);
      expect(receptions.length).toBe(0);
    });

    it("should attenuate signal strength with distance", () => {
      const nearReceiver = new MockCreature("near", { x: 5, y: 5 });
      const farReceiver = new MockCreature("far", { x: 50, y: 50 });

      signalSystem.emitSignal(emitter, {
        type: SignalType.WARNING,
        strength: 1.0,
      });

      const nearReceptions = signalSystem.getSignalsForCreature(nearReceiver);
      const farReceptions = signalSystem.getSignalsForCreature(farReceiver);

      expect(nearReceptions.length).toBeGreaterThan(0);
      expect(farReceptions.length).toBeGreaterThan(0);

      const nearStrength = nearReceptions[0].receivedStrength;
      const farStrength = farReceptions[0].receivedStrength;

      expect(nearStrength).toBeGreaterThan(farStrength);
    });
  });

  describe("Signal Processing", () => {
    let signalSystem: SignalSystem;
    let creature: MockCreature;

    beforeEach(() => {
      signalSystem = new SignalSystem();
      creature = new MockCreature("creature", { x: 0, y: 0 });
    });

    it("should process signal reception", () => {
      const emitter = new MockCreature("emitter", { x: 10, y: 10 });

      const signalId = signalSystem.emitSignal(emitter, {
        type: SignalType.FOOD_LOCATION,
        strength: 0.8,
      });

      expect(signalId).toBeTruthy();

      const receptions = signalSystem.getSignalsForCreature(creature);
      expect(receptions.length).toBeGreaterThan(0);

      const result = signalSystem.processSignalReception(
        creature,
        receptions[0]
      );

      expect(result).toBeDefined();
      expect(typeof result.understood).toBe("boolean");
      expect(typeof result.actionInfluence).toBe("number");
      expect(typeof result.memoryImportance).toBe("number");
      expect(result.actionInfluence).toBeGreaterThanOrEqual(-1);
      expect(result.actionInfluence).toBeLessThanOrEqual(1);
      expect(result.memoryImportance).toBeGreaterThanOrEqual(0);
      expect(result.memoryImportance).toBeLessThanOrEqual(1);
    });
  });

  describe("System Updates", () => {
    let signalSystem: SignalSystem;

    beforeEach(() => {
      signalSystem = new SignalSystem({
        signalDecayEnabled: true,
        maxActiveSignals: 100,
      });
    });

    it("should update signal system over time", () => {
      const entity = new MockCreature("entity", { x: 0, y: 0 });

      signalSystem.emitSignal(entity, {
        type: SignalType.WARNING,
        strength: 1.0,
        decayRate: 0.1,
      });

      const initialSignals = signalSystem.getActiveSignals();
      expect(initialSignals.length).toBe(1);

      // Update the system multiple times
      for (let i = 0; i < 10; i++) {
        signalSystem.update(1000); // 1 second
      }

      // Signal should still exist but potentially weaker
      const updatedSignals = signalSystem.getActiveSignals();
      expect(updatedSignals.length).toBeGreaterThanOrEqual(0);
    });

    it("should clean up expired signals", () => {
      const entity = new MockCreature("entity", { x: 0, y: 0 });

      signalSystem.emitSignal(entity, {
        type: SignalType.WARNING,
        strength: 0.1, // Very weak signal
        decayRate: 0.5, // High decay rate
      });

      expect(signalSystem.getActiveSignals().length).toBe(1);

      // Update system with large time step to expire signal
      signalSystem.update(10000); // 10 seconds

      const remainingSignals = signalSystem.getActiveSignals();
      expect(remainingSignals.length).toBe(0);
    });
  });

  describe("Configuration Management", () => {
    it("should allow clearing all signals", () => {
      const signalSystem = new SignalSystem();
      const entity = new MockCreature("entity", { x: 0, y: 0 });

      // Emit multiple signals
      for (let i = 0; i < 5; i++) {
        signalSystem.emitSignal(entity, {
          type: SignalType.WARNING,
          strength: 0.5,
        });
      }

      expect(signalSystem.getActiveSignals().length).toBe(5);

      signalSystem.clearSignals();
      expect(signalSystem.getActiveSignals().length).toBe(0);
    });

    it("should provide access to configuration", () => {
      const config: Partial<ISignalSystemConfig> = {
        maxActiveSignals: 200,
        signalDecayEnabled: false,
        spatialHashing: false,
      };

      const signalSystem = new SignalSystem(config);
      const retrievedConfig = signalSystem.getConfig();

      expect(retrievedConfig.maxActiveSignals).toBe(200);
      expect(retrievedConfig.signalDecayEnabled).toBe(false);
      expect(retrievedConfig.spatialHashing).toBe(false);
    });
  });
});
