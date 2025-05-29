import { vi } from "vitest";
import { IWorld, ICreature } from "../../src/core/interfaces";
import { INeuralNetwork } from "../../src/neural/types";
import { IPersistenceManager } from "../../src/persistence/types";

/**
 * Mock Service Factories
 *
 * Provides factory functions for creating consistent mocks
 * across different test types and scenarios.
 */

export class MockServices {
  /**
   * Create a mock world with configurable behavior
   */
  static createMockWorld(overrides: Partial<IWorld> = {}): IWorld {
    const mockWorld: IWorld = {
      width: 20,
      height: 20,
      creatures: [],
      entities: [],
      currentTick: 0,

      addEntity: vi.fn(),
      removeEntity: vi.fn().mockReturnValue(true),
      getEntity: vi.fn().mockReturnValue(undefined),
      getEntitiesInRadius: vi.fn().mockReturnValue([]),
      update: vi.fn(),
      reset: vi.fn(),

      ...overrides,
    };

    // Add common extended methods
    (mockWorld as any).addCreature = vi.fn();

    return mockWorld;
  }

  /**
   * Create a mock creature with configurable behavior
   */
  static createMockCreature(overrides: Partial<ICreature> = {}): ICreature {
    const mockCreature: ICreature = {
      id: "mock-creature-1",
      position: { x: 5, y: 5 },
      active: true,
      energy: 50,
      age: 100,
      alive: true,
      genome: {},
      brain: {},

      update: vi.fn(),
      destroy: vi.fn(),
      think: vi.fn(),
      act: vi.fn(),
      reproduce: vi.fn().mockReturnValue(null),
      getConfig: vi.fn().mockReturnValue({}),
      getBroadcastSignal: vi.fn().mockReturnValue(0),
      setBroadcastSignal: vi.fn(),

      ...overrides,
    };

    // Add common extended methods
    (mockCreature as any).getNextAction = vi.fn().mockReturnValue("move");

    return mockCreature;
  }

  /**
   * Create a mock neural network with configurable behavior
   */
  static createMockNeuralNetwork(
    overrides: Partial<INeuralNetwork> = {}
  ): INeuralNetwork {
    const mockNetwork: INeuralNetwork = {
      config: {
        inputSize: 60,
        hiddenLayers: [{ size: 32, activation: "sigmoid" as any }],
        outputLayer: { size: 16, activation: "sigmoid" as any },
        seed: 12345,
      },
      layers: [],
      inputLayer: {} as any,
      hiddenLayers: [],
      outputLayer: {} as any,

      process: vi
        .fn()
        .mockReturnValue(Array.from({ length: 16 }, () => Math.random())),
      getState: vi.fn().mockReturnValue({ layers: [] }),
      setState: vi.fn(),
      clone: vi.fn().mockReturnValue({} as any),
      serialize: vi.fn().mockReturnValue("{}"),
      deserialize: vi.fn(),

      ...overrides,
    };

    return mockNetwork;
  }

  /**
   * Create a mock persistence manager
   */
  static createMockPersistenceManager(
    overrides: Partial<IPersistenceManager> = {}
  ): IPersistenceManager {
    const mockPersistence: IPersistenceManager = {
      initialize: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue({
        success: true,
        filePath: "test.json",
        metadata: {} as any,
      }),
      load: vi.fn().mockResolvedValue({ success: true, data: {} }),
      delete: vi.fn().mockResolvedValue(true),
      list: vi.fn().mockResolvedValue([]),
      exists: vi.fn().mockResolvedValue(false),
      getMetadata: vi.fn().mockResolvedValue(null),
      validateFile: vi.fn().mockResolvedValue(true),
      getDirectoryPath: vi.fn().mockReturnValue("/test"),
      cleanup: vi.fn().mockResolvedValue(undefined),

      ...overrides,
    };

    return mockPersistence;
  }

  /**
   * Create a mock renderer for UI tests
   */
  static createMockRenderer(overrides: Partial<any> = {}): any {
    const mockRenderer = {
      render: vi.fn(),
      clear: vi.fn(),
      resize: vi.fn(),
      setCamera: vi.fn(),
      drawCreature: vi.fn(),
      drawWorld: vi.fn(),
      drawUI: vi.fn(),
      destroy: vi.fn(),

      ...overrides,
    };

    return mockRenderer;
  }

  /**
   * Create a set of related mocks for integration testing
   */
  static createIntegrationMockSet(): {
    world: IWorld;
    creatures: ICreature[];
    networks: INeuralNetwork[];
    persistence: IPersistenceManager;
    renderer: any;
  } {
    const creatures = [
      this.createMockCreature({ id: "creature-1", position: { x: 1, y: 1 } }),
      this.createMockCreature({ id: "creature-2", position: { x: 5, y: 5 } }),
      this.createMockCreature({ id: "creature-3", position: { x: 10, y: 10 } }),
    ];

    const networks = creatures.map((_, i) => this.createMockNeuralNetwork());

    const world = this.createMockWorld({
      creatures,
      entities: creatures,
    });

    const persistence = this.createMockPersistenceManager();
    const renderer = this.createMockRenderer();

    return {
      world,
      creatures,
      networks,
      persistence,
      renderer,
    };
  }

  /**
   * Create performance-optimized mocks for benchmarking
   */
  static createPerformanceMocks(): {
    world: IWorld;
    creatures: ICreature[];
    networks: INeuralNetwork[];
  } {
    const creatures = Array.from({ length: 100 }, (_, i) =>
      this.createMockCreature({
        id: `perf-creature-${i}`,
        position: { x: i % 20, y: Math.floor(i / 20) },
      })
    );

    const networks = creatures.map(() =>
      this.createMockNeuralNetwork({
        process: vi.fn().mockImplementation(() =>
          // Fast mock implementation
          Array.from({ length: 16 }, () => 0.5)
        ),
      })
    );

    const world = this.createMockWorld({
      creatures,
      entities: creatures,
      width: 20,
      height: 20,
      update: vi.fn().mockImplementation(() => {
        // Fast mock update
      }),
    });

    return {
      world,
      creatures,
      networks,
    };
  }

  /**
   * Reset all mocks to their initial state
   */
  static resetMocks(...mocks: any[]): void {
    mocks.forEach((mock) => {
      if (mock && typeof mock === "object") {
        Object.values(mock).forEach((value) => {
          if (vi.isMockFunction(value)) {
            value.mockReset();
          }
        });
      }
    });
  }

  /**
   * Clear all mock call history
   */
  static clearMockHistory(...mocks: any[]): void {
    mocks.forEach((mock) => {
      if (mock && typeof mock === "object") {
        Object.values(mock).forEach((value) => {
          if (vi.isMockFunction(value)) {
            value.mockClear();
          }
        });
      }
    });
  }

  /**
   * Create minimal mocks for unit testing
   */
  static createUnitTestMocks(): {
    world: IWorld;
    creature: ICreature;
    network: INeuralNetwork;
  } {
    return {
      world: this.createMockWorld(),
      creature: this.createMockCreature(),
      network: this.createMockNeuralNetwork(),
    };
  }

  /**
   * Create mocks with specific behavior for edge case testing
   */
  static createEdgeCaseMocks(): {
    failingWorld: IWorld;
    dyingCreature: ICreature;
    errorNetwork: INeuralNetwork;
  } {
    const failingWorld = this.createMockWorld({
      addEntity: vi.fn().mockImplementation(() => {
        throw new Error("Failed to add entity");
      }),
      update: vi.fn().mockImplementation(() => {
        throw new Error("World update failed");
      }),
    });

    const dyingCreature = this.createMockCreature({
      energy: 0,
      alive: false,
      update: vi.fn().mockImplementation(() => {
        throw new Error("Creature update failed");
      }),
    });

    const errorNetwork = this.createMockNeuralNetwork({
      process: vi.fn().mockImplementation(() => {
        throw new Error("Neural network processing failed");
      }),
    });

    return {
      failingWorld,
      dyingCreature,
      errorNetwork,
    };
  }
}
