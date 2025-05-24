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

// Mocks
jest.mock("./grid", () => {
  const actualGridModule = jest.requireActual<typeof GridModuleType>("./grid");
  return {
    ...actualGridModule,
    Grid: jest.fn().mockImplementation(() => ({
      getCreatures: jest.fn(() => []),
      moveEntity: jest.fn(() => true),
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

// Mock console.error to prevent log spamming
let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
let consoleLogSpy: jest.SpiedFunction<typeof console.log>; // Added for console.log

describe("Simulation", () => {
  let mockGridInstance: jest.Mocked<Grid>;
  let simulation: Simulation;
  // Let TypeScript infer spy types from jest.spyOn
  let requestAnimationFrameSpy: ReturnType<typeof jest.spyOn>;
  let cancelAnimationFrameSpy: ReturnType<typeof jest.spyOn>;
  let animationFrameCallbackStorage: FrameRequestCallback | null = null;

  beforeEach(() => {
    // Polyfill for requestAnimationFrame and cancelAnimationFrame in Node.js environment
    if (typeof global.requestAnimationFrame === "undefined") {
      (global as any).requestAnimationFrame = (
        callback: FrameRequestCallback
      ): number => {
        // Simple immediate execution or timeout based for testing
        animationFrameCallbackStorage = callback; // Store it if needed for manual triggering
        return setTimeout(
          () => callback(performance.now()),
          0
        ) as unknown as number;
      };
    }
    if (typeof global.cancelAnimationFrame === "undefined") {
      (global as any).cancelAnimationFrame = (id: number): void => {
        clearTimeout(id);
      };
    }

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
        return 1 as any; // Return a number that acts as a request ID
      });
    cancelAnimationFrameSpy = jest
      .spyOn(global, "cancelAnimationFrame")
      .mockImplementation(jest.fn());

    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {}); // Mock console.log
  });

  afterEach(() => {
    simulation.pause();
    // Ensure spies are restored only if they were created
    if (requestAnimationFrameSpy) requestAnimationFrameSpy.mockRestore();
    if (cancelAnimationFrameSpy) cancelAnimationFrameSpy.mockRestore();
    animationFrameCallbackStorage = null;
    if (consoleErrorSpy) consoleErrorSpy.mockRestore();
    if (consoleLogSpy) consoleLogSpy.mockRestore(); // Restore console.log
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
      // Create actual creature instances, then mock their methods
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
    });

    it("should increment tickCount, process creatures, and render on each step", () => {
      simulation.start();
      expect(simulation.getTickCount()).toBe(0);

      if (animationFrameCallbackStorage)
        animationFrameCallbackStorage(performance.now());

      expect(simulation.getTickCount()).toBe(1);
      expect(mockGridInstance.getCreatures).toHaveBeenCalledTimes(1);
      expect(mockCreature1.getNextMove).toHaveBeenCalledTimes(1);
      expect(mockCreature2.getNextMove).toHaveBeenCalledTimes(1);
      expect(mockGridInstance.moveEntity).toHaveBeenCalledWith(
        mockCreature1,
        1,
        1
      );
      expect(mockGridInstance.moveEntity).toHaveBeenCalledTimes(1);
      expect(mockRenderer.render).toHaveBeenCalledWith(mockGridInstance);
      expect(mockRenderer.render).toHaveBeenCalledTimes(1);

      if (animationFrameCallbackStorage)
        animationFrameCallbackStorage(performance.now());
      expect(simulation.getTickCount()).toBe(2);
      expect(mockGridInstance.getCreatures).toHaveBeenCalledTimes(2);
      expect(mockRenderer.render).toHaveBeenCalledTimes(2);
    });

    it("should not process steps if paused", () => {
      simulation.start();
      simulation.pause();

      if (animationFrameCallbackStorage)
        animationFrameCallbackStorage(performance.now());

      expect(simulation.getTickCount()).toBe(0);
      expect(mockGridInstance.getCreatures).not.toHaveBeenCalled();
      // Renderer might have been called by reset() or initial setup, so check based on interaction count if needed
      // For this test, assuming mockRenderer.render.mockClear() in beforeEach is sufficient.
      expect(mockRenderer.render).not.toHaveBeenCalled();
    });
  });
});
