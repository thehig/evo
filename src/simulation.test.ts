import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
  afterEach,
} from "@jest/globals";
import { Simulation } from "./simulation";
import type * as GridModuleType from "./grid"; // Import the module type
import {
  Grid,
  Creature,
  IRenderer,
  IEntity,
  DietType,
  ActivityCycle,
  PerceptionType,
} from "./grid";

// Extend the NodeJS.Global interface to include browser-specific animation methods
declare global {
  namespace NodeJS {
    interface Global {
      requestAnimationFrame: (callback: FrameRequestCallback) => number;
      cancelAnimationFrame: (id: number) => void;
    }
  }
}

// Simple polyfill for requestAnimationFrame and cancelAnimationFrame for Node.js environment
if (typeof global.requestAnimationFrame === "undefined") {
  global.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    return Date.now(); // Return a dummy ID, spy will override behavior
  };
}
if (typeof global.cancelAnimationFrame === "undefined") {
  global.cancelAnimationFrame = (id: number): void => {
    // Dummy implementation, spy will override behavior
  };
}

// Mocks
jest.mock("./grid", () => {
  const actualGridModule = jest.requireActual<typeof GridModuleType>("./grid");
  return {
    ...actualGridModule,
    Grid: jest.fn().mockImplementation(() => ({
      getCreatures: jest.fn(() => []),
      moveEntity: jest.fn(() => true),
      getCell: jest.fn((x, y) => null),
      removeEntity: jest.fn(() => true),
    })),
    // Creature mock needs to be more careful if we want to use its constructor for type checks
    // For simplicity in this mock, if Creature instances are not deeply inspected beyond getNextMove,
    // this can be simpler. But for instanceof checks, the original class or a more careful mock is needed.
    // The tests later use actualGridModule.Creature for instantiation, which is better.
    Creature: jest.fn().mockImplementation((...args: any[]) => ({
      symbol: args[0] || "C",
      color: args[1] || "#FF0000",
      type: args[2] || "Creature",
      x: args[3] || 0,
      y: args[4] || 0,
      dietType: args[5] || actualGridModule.DietType.UNKNOWN,
      getNextMove: jest.fn(() => null),
    })),
  };
});

const mockRenderer: jest.Mocked<IRenderer> = {
  setup: jest.fn(),
  render: jest.fn(),
};

// Mock console.error and console.log to prevent log spamming
let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
let consoleLogSpy: jest.SpiedFunction<typeof console.log>;

describe("Simulation", () => {
  let mockGridInstance: jest.Mocked<Grid>;
  let simulation: Simulation;
  let requestAnimationFrameSpy: ReturnType<typeof jest.spyOn>;
  let cancelAnimationFrameSpy: ReturnType<typeof jest.spyOn>;
  let animationFrameCallbackStorage: FrameRequestCallback | null = null;

  beforeEach(() => {
    animationFrameCallbackStorage = null;

    const actualGridModule =
      jest.requireActual<typeof GridModuleType>("./grid");
    // It's better to use the mocked Grid constructor and then override methods if needed,
    // or use an actual Grid instance and spy on its methods.
    // Given the mock setup, new Grid() should use the mocked version.
    mockGridInstance = new Grid(10, 10) as jest.Mocked<Grid>;
    // If the mock structure for Grid isn't being picked up as expected for instantiation,
    // we might need to ensure the mock factory returns a class or a constructor function.
    // For now, assuming new Grid() uses the mock and methods are on its prototype or instance.
    // If methods are still from actual Grid, they need individual mocking on the instance:
    mockGridInstance.getCreatures = jest.fn(() => []);
    mockGridInstance.moveEntity = jest.fn(() => true);

    (mockRenderer.render as jest.Mock).mockClear();
    (mockRenderer.setup as jest.Mock).mockClear();

    simulation = new Simulation(mockGridInstance, mockRenderer);

    requestAnimationFrameSpy = jest
      .spyOn(global, "requestAnimationFrame")
      .mockImplementation((cb: FrameRequestCallback) => {
        animationFrameCallbackStorage = cb;
        return 1;
      });

    cancelAnimationFrameSpy = jest
      .spyOn(global, "cancelAnimationFrame")
      .mockImplementation((id: number) => {
        if (id === 1 && animationFrameCallbackStorage) {
          animationFrameCallbackStorage = null;
        }
      });

    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    simulation.pause();
    requestAnimationFrameSpy.mockRestore();
    cancelAnimationFrameSpy.mockRestore();
    animationFrameCallbackStorage = null;
    if (consoleErrorSpy) consoleErrorSpy.mockRestore();
    if (consoleLogSpy) consoleLogSpy.mockRestore();
  });

  it("should initialize with tickCount 0 and not running", () => {
    expect(simulation.getTickCount()).toBe(0);
    expect(simulation.isSimulationRunning()).toBe(false);
  });

  describe("start", () => {
    it("should set isRunning to true and request an animation frame", () => {
      simulation.start();
      expect(simulation.isSimulationRunning()).toBe(true);
      expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);
    });

    it("should not start if already running", () => {
      simulation.start();
      simulation.start();
      expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("pause", () => {
    it("should set isRunning to false and cancel animation frame if running", () => {
      simulation.start();
      if (animationFrameCallbackStorage)
        animationFrameCallbackStorage(performance.now());

      simulation.pause();
      expect(simulation.isSimulationRunning()).toBe(false);
      // Check if the spy was called with the ID returned by requestAnimationFrameSpy
      // This requires requestAnimationFrameSpy to actually return an ID that cancelAnimationFrame would use.
      // Our mock returns 1, so we check for that.
      expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(1);
    });

    it("should not cancel animation frame if not running", () => {
      simulation.pause();
      expect(cancelAnimationFrameSpy).not.toHaveBeenCalled();
    });
  });

  describe("reset", () => {
    it("should pause the simulation, reset tickCount, and render", () => {
      simulation.start();
      if (animationFrameCallbackStorage)
        animationFrameCallbackStorage(performance.now());
      if (animationFrameCallbackStorage)
        animationFrameCallbackStorage(performance.now());

      simulation.reset();
      expect(simulation.isSimulationRunning()).toBe(false);
      expect(simulation.getTickCount()).toBe(0);
      expect(mockRenderer.render).toHaveBeenCalledWith(mockGridInstance);
      expect(cancelAnimationFrameSpy).toHaveBeenCalled();
    });
  });

  describe("step logic (via tick simulation)", () => {
    let mockCreature1: jest.Mocked<Creature>;
    let mockCreature2: jest.Mocked<Creature>;

    beforeEach(() => {
      const actualGridModule =
        jest.requireActual<typeof GridModuleType>("./grid");
      mockCreature1 = new actualGridModule.Creature(
        "C1",
        "#111111",
        "Creature",
        0,
        0,
        actualGridModule.DietType.HERBIVORE
      ) as jest.Mocked<Creature>;
      mockCreature1.getNextMove = jest.fn(() => ({ newX: 1, newY: 1 }));

      mockCreature2 = new actualGridModule.Creature(
        "C2",
        "#222222",
        "Creature",
        2,
        2,
        actualGridModule.DietType.CARNIVORE
      ) as jest.Mocked<Creature>;
      mockCreature2.getNextMove = jest.fn(() => null);

      (mockGridInstance.getCreatures as jest.Mock).mockReturnValue([
        mockCreature1,
        mockCreature2,
      ]);
      // Clear mocks that might be called by simulation.start() -> step()
      (mockGridInstance.getCreatures as jest.Mock).mockClear();
      (mockGridInstance.moveEntity as jest.Mock).mockClear();
      (mockRenderer.render as jest.Mock).mockClear();
      // Note: mockCreature1.getNextMove and mockCreature2.getNextMove are fresh from instantiation here.
    });

    it("should increment tickCount, process creatures, and render on each step", () => {
      simulation.start(); // Assumes this performs the first step (tickCount: 0 -> 1)

      // Assertions for the state *after* start() has run the first step
      expect(simulation.getTickCount()).toBe(1);
      expect(mockGridInstance.getCreatures).toHaveBeenCalledTimes(1);
      expect(mockCreature1.getNextMove).toHaveBeenCalledTimes(1);
      expect(mockCreature2.getNextMove).toHaveBeenCalledTimes(1);
      expect(mockGridInstance.moveEntity).toHaveBeenCalledWith(
        mockCreature1,
        1,
        1
      );
      expect(mockGridInstance.moveEntity).toHaveBeenCalledTimes(1); // Creature1 moves
      expect(mockRenderer.render).toHaveBeenCalledWith(mockGridInstance);
      expect(mockRenderer.render).toHaveBeenCalledTimes(1);

      // Manually trigger the *second* step (tickCount: 1 -> 2)
      if (animationFrameCallbackStorage)
        animationFrameCallbackStorage(performance.now());

      expect(simulation.getTickCount()).toBe(2);
      expect(mockGridInstance.getCreatures).toHaveBeenCalledTimes(2);
      expect(mockCreature1.getNextMove).toHaveBeenCalledTimes(2);
      expect(mockCreature2.getNextMove).toHaveBeenCalledTimes(2);
      expect(mockGridInstance.moveEntity).toHaveBeenCalledWith(
        mockCreature1,
        1,
        1
      ); // Creature1 moves again
      expect(mockGridInstance.moveEntity).toHaveBeenCalledTimes(2); // Total calls to moveEntity
      expect(mockRenderer.render).toHaveBeenCalledWith(mockGridInstance);
      expect(mockRenderer.render).toHaveBeenCalledTimes(2);

      // Manually trigger the *third* step (tickCount: 2 -> 3)
      if (animationFrameCallbackStorage)
        animationFrameCallbackStorage(performance.now());
      expect(simulation.getTickCount()).toBe(3);
      expect(mockGridInstance.getCreatures).toHaveBeenCalledTimes(3);
      expect(mockRenderer.render).toHaveBeenCalledTimes(3);
    });

    it("should not process steps if paused", () => {
      // Clear mocks before start, as start will call them once.
      (mockGridInstance.getCreatures as jest.Mock).mockClear();
      (mockRenderer.render as jest.Mock).mockClear();
      mockCreature1.getNextMove.mockClear();
      mockCreature2.getNextMove.mockClear();
      (mockGridInstance.moveEntity as jest.Mock).mockClear();

      simulation.start(); // tickCount becomes 1, first step processed. Mocks called once.

      // Store the call counts *after* start() has completed its synchronous step.
      const creatureCallsAfterStart = (
        mockGridInstance.getCreatures as jest.Mock
      ).mock.calls.length;
      const renderCallsAfterStart = (mockRenderer.render as jest.Mock).mock
        .calls.length;
      const moveCallsAfterStart = (mockGridInstance.moveEntity as jest.Mock)
        .mock.calls.length;
      const c1NextMoveCallsAfterStart =
        mockCreature1.getNextMove.mock.calls.length;

      simulation.pause();

      // Attempt to trigger animation frame callback (should not execute step logic if paused)
      if (animationFrameCallbackStorage)
        animationFrameCallbackStorage(performance.now());

      expect(simulation.getTickCount()).toBe(1); // Tick count should remain 1 (from start)
      expect(mockGridInstance.getCreatures).toHaveBeenCalledTimes(
        creatureCallsAfterStart
      );
      expect(mockRenderer.render).toHaveBeenCalledTimes(renderCallsAfterStart);
      expect(mockGridInstance.moveEntity).toHaveBeenCalledTimes(
        moveCallsAfterStart
      );
      expect(mockCreature1.getNextMove).toHaveBeenCalledTimes(
        c1NextMoveCallsAfterStart
      );
    });
  });
});

describe("Simulation - Feeding and Energy Dynamics", () => {
  let simulation: Simulation;
  let actualGridModule: typeof GridModuleType;
  let gridInstance: Grid; // Using a real grid instance for these tests
  let mockRendererInstance: jest.Mocked<IRenderer>;
  let requestAnimationFrameSpy: ReturnType<typeof jest.spyOn>;
  let cancelAnimationFrameSpy: ReturnType<typeof jest.spyOn>;
  let animationFrameCallbackStorage: FrameRequestCallback | null = null;

  beforeEach(() => {
    actualGridModule = jest.requireActual<typeof GridModuleType>("./grid");
    gridInstance = new actualGridModule.Grid(5, 5); // A small grid for focused tests
    mockRendererInstance = {
      setup: jest.fn(),
      render: jest.fn(),
    };
    simulation = new Simulation(gridInstance, mockRendererInstance);

    // Mock animation frames
    animationFrameCallbackStorage = null;
    requestAnimationFrameSpy = jest
      .spyOn(global, "requestAnimationFrame")
      .mockImplementation((cb: FrameRequestCallback) => {
        animationFrameCallbackStorage = cb;
        return 1;
      });
    cancelAnimationFrameSpy = jest
      .spyOn(global, "cancelAnimationFrame")
      .mockImplementation(() => {});

    // Mock console logs/errors for cleaner test output
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    simulation.pause();
    requestAnimationFrameSpy.mockRestore();
    cancelAnimationFrameSpy.mockRestore();
    jest.restoreAllMocks(); // Restore all mocks, including console
  });

  const tickSimulation = (count: number = 1) => {
    for (let i = 0; i < count; i++) {
      if (animationFrameCallbackStorage) {
        animationFrameCallbackStorage(performance.now());
      }
    }
  };

  it("creature should lose energy each tick and die when energy is zero or less", () => {
    const creature = actualGridModule.Creature.fromSeed(
      "H1VD100",
      0,
      0,
      undefined,
      undefined,
      2.5
    ); // Initial energy 2.5
    expect(creature).not.toBeNull();
    if (!creature) return;

    gridInstance.addEntity(creature, 0, 0);
    creature.getNextMove = jest.fn(() => null); // Prevent movement for this test

    // Tick 1 (occurs when simulation.start() calls step())
    simulation.start();
    // Energy: 2.5 (initial) - 1 (base) - 0.1 (sense) = 1.4 (no move attempt cost as getNextMove is null)
    expect(creature.energy).toBeCloseTo(1.4);
    expect(gridInstance.getCreatures()).toContain(creature);

    // Tick 2
    tickSimulation(1);
    // Energy: 1.4 (start of tick) - 1 (base) - 0.1 (sense) = 0.3
    expect(creature.energy).toBeCloseTo(0.3);
    expect(gridInstance.getCreatures()).toContain(creature);

    // Tick 3
    tickSimulation(1);
    // Energy: 0.3 (start of tick) - 1 (base) = -0.7. Creature removed after this base cost deduction.
    expect(gridInstance.getCreatures()).not.toContain(creature);
  });

  it("herbivore should eat ADJACENT plant, gain energy, plant removed, and not move", () => {
    const herbivore = actualGridModule.Creature.fromSeed(
      "H1VD100",
      0,
      0,
      undefined,
      undefined,
      100
    );
    expect(herbivore).not.toBeNull();
    if (!herbivore) return;

    const adjacentPlant = new actualGridModule.Plant(0, 1); // Plant is South of herbivore
    gridInstance.addEntity(adjacentPlant, 0, 1);
    gridInstance.addEntity(herbivore, 0, 0);
    const initialCreatureEnergy = herbivore.energy; // Should be 100

    // Mock getNextMove to ensure it doesn't try to move if it eats
    const getNextMoveSpy = jest.spyOn(herbivore, "getNextMove");

    simulation.start(); // This will call step once.
    // Expected energy: 100 (initial) - 1 (base) - 0.1 (sense) + 20 (eat plant) = 118.9
    // No movement costs because it ate.
    expect(herbivore.energy).toBeCloseTo(118.9);
    expect(gridInstance.getCell(0, 1)).toBeNull(); // Plant should be gone
    expect(gridInstance.getEntities().includes(adjacentPlant)).toBe(false);
    expect(gridInstance.getCreatures()).toContain(herbivore); // Herbivore still at (0,0)
    expect(herbivore.x).toBe(0);
    expect(herbivore.y).toBe(0);
    expect(getNextMoveSpy).not.toHaveBeenCalled(); // Should not attempt to move if it ate
  });

  // More tests to come for carnivores, omnivores, adjacent eating, movement costs, etc.
});
