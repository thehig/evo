import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"; // Added Vitest imports
// import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals"; // Removed for Vitest
import { Simulation } from "../src/simulation";
import type * as GridModuleType from "../src/grid"; // Import the module type
import {
  Grid,
  Creature,
  IRenderer,
  IEntity,
  DietType,
  ActivityCycle,
  PerceptionType,
} from "../src/grid";

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
    return setTimeout(callback, 0); // Use setTimeout for a basic polyfill
  };
}
if (typeof global.cancelAnimationFrame === "undefined") {
  global.cancelAnimationFrame = (id: number): void => {
    clearTimeout(id);
  };
}

// Mocks - TRYING TO SIMPLIFY/COMMENT OUT FOR NOW
/*
jest.mock("../src/grid", () => {
  const actualGridModule = jest.requireActual<typeof GridModuleType>("../src/grid");
  return {
    ...actualGridModule,
    Grid: vi.fn().mockImplementation(() => ({
      getCreatures: vi.fn(() => []),
      moveEntity: vi.fn(() => true),
      getCell: vi.fn((x, y) => null),
      removeEntity: vi.fn(() => true),
    })),
    Creature: vi.fn().mockImplementation((...args: any[]) => ({
      symbol: args[0] || "C",
      color: args[1] || "#FF0000",
      type: args[2] || "Creature",
      x: args[3] || 0,
      y: args[4] || 0,
      dietType: args[5] || actualGridModule.DietType.UNKNOWN,
      getNextMove: vi.fn(() => null),
    })),
  };
});
*/

const mockRenderer: IRenderer = {
  setup: vi.fn(),
  render: vi.fn(),
};

// Mock console.error and console.log to prevent log spamming
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let consoleLogSpy: ReturnType<typeof vi.spyOn>;

describe("Simulation", () => {
  let mockGridInstance: Grid; // Will use actual grid and spy on methods
  let simulation: Simulation;
  let requestAnimationFrameSpy: ReturnType<typeof vi.spyOn>;
  let cancelAnimationFrameSpy: ReturnType<typeof vi.spyOn>;
  let animationFrameCallbackStorage: FrameRequestCallback | null = null;

  beforeEach(() => {
    animationFrameCallbackStorage = null;

    mockGridInstance = new Grid(10, 10); // Use actual Grid

    // Spy on methods of the actual instance.
    // These spies will be active for all tests in this describe block.
    // Individual tests or nested describe blocks can further refine mockReturnValueOnce etc.
    vi.spyOn(mockGridInstance, "getCreatures");
    vi.spyOn(mockGridInstance, "moveEntity");
    vi.spyOn(mockGridInstance, "removeEntity");
    vi.spyOn(mockGridInstance, "getCell");
    vi.spyOn(mockGridInstance, "addEntity");

    (mockRenderer.render as ReturnType<typeof vi.fn>).mockClear();
    (mockRenderer.setup as ReturnType<typeof vi.fn>).mockClear();

    simulation = new Simulation(mockGridInstance, mockRenderer);

    requestAnimationFrameSpy = vi
      .spyOn(global, "requestAnimationFrame")
      .mockImplementation((cb: FrameRequestCallback) => {
        animationFrameCallbackStorage = cb;
        return 1; // Return a dummy ID
      });

    cancelAnimationFrameSpy = vi
      .spyOn(global, "cancelAnimationFrame")
      .mockImplementation((id: number) => {
        if (id === 1 && animationFrameCallbackStorage) {
          animationFrameCallbackStorage = null;
        }
      });

    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
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
    });

    it("should not start if already running", () => {
      simulation.start();
      simulation.start();
    });
  });

  describe("pause", () => {
    it("should set isRunning to false and cancel animation frame if running", () => {
      simulation.start();
      simulation.pause();
      expect(simulation.isSimulationRunning()).toBe(false);
    });

    it("should not cancel animation frame if not running", () => {
      simulation.pause();
    });
  });

  describe("reset", () => {
    it("should pause the simulation, reset tickCount, and render", () => {
      simulation.start();
      simulation.reset();
      expect(simulation.isSimulationRunning()).toBe(false);
      expect(simulation.getTickCount()).toBe(0);
    });
  });

  describe("step logic (via tick simulation)", () => {
    let mockCreature1: Creature;
    let mockCreature2: Creature;

    beforeEach(() => {
      mockCreature1 = new Creature(
        "C1",
        "#111111",
        "Creature",
        0,
        0,
        DietType.HERBIVORE
      );
      vi.spyOn(mockCreature1, "getNextMove").mockReturnValue({
        newX: 1,
        newY: 1,
      });

      mockCreature2 = new Creature(
        "C2",
        "#222222",
        "Creature",
        2,
        2,
        DietType.CARNIVORE
      );
      vi.spyOn(mockCreature2, "getNextMove").mockReturnValue(null); // Creature 2 will not move

      // Reset and re-configure mocks for gridInstance for this describe block
      vi.mocked(mockGridInstance.getCreatures)
        .mockReset()
        .mockReturnValue([mockCreature1, mockCreature2]);
      vi.mocked(mockGridInstance.moveEntity).mockReset().mockReturnValue(true);
      vi.mocked(mockGridInstance.removeEntity)
        .mockReset()
        .mockReturnValue(true);
    });

    it("should increment tickCount, process creatures, and render on each step", () => {
      // Before start, tickCount is 0
      expect(simulation.getTickCount()).toBe(0);

      simulation.start(); // This executes the first step synchronously via this.tick() -> this.step()

      // After start() (which includes the first step):
      expect(simulation.getTickCount()).toBe(1);
      expect(mockGridInstance.getCreatures).toHaveBeenCalledTimes(1); // Called once in the first step
      expect(mockCreature1.getNextMove).toHaveBeenCalledTimes(1);
      expect(mockCreature2.getNextMove).toHaveBeenCalledTimes(1);
      expect(mockGridInstance.moveEntity).toHaveBeenCalledWith(
        mockCreature1,
        1,
        1
      );
      expect(mockGridInstance.moveEntity).toHaveBeenCalledTimes(1); // Only creature1 generates a move object

      // Manually trigger the animation frame callback to simulate the second step
      if (animationFrameCallbackStorage) {
        animationFrameCallbackStorage(performance.now());
      }
      expect(simulation.getTickCount()).toBe(2); // Tick count should be 2 after second step
      expect(mockGridInstance.getCreatures).toHaveBeenCalledTimes(2); // Called again in the second step
      expect(mockCreature1.getNextMove).toHaveBeenCalledTimes(2);
      expect(mockCreature2.getNextMove).toHaveBeenCalledTimes(2);
      // moveEntity for creature1 would be called again if it moved again.
      // Assuming getNextMove for C1 is still {1,1} and it can move there again.
      expect(mockGridInstance.moveEntity).toHaveBeenCalledTimes(2);
    });

    it("should not process further steps if paused immediately", () => {
      vi.mocked(mockGridInstance.getCreatures).mockClear();
      vi.mocked(mockGridInstance.moveEntity).mockClear();
      vi.mocked(mockCreature1.getNextMove as any).mockClear(); // Cast to any if type issue
      vi.mocked(mockCreature2.getNextMove as any).mockClear();

      simulation.start(); // First step executes, tickCount becomes 1. Animation frame for 2nd step is scheduled.
      simulation.pause(); // Pause immediately. This should cancel the scheduled animation frame.

      expect(simulation.getTickCount()).toBe(1); // First step ran before pause

      // Try to trigger animation frame callback - it shouldn't run step() due to pause
      if (animationFrameCallbackStorage) {
        // console.log("Manually calling stored rAF callback while paused");
        animationFrameCallbackStorage(performance.now());
      }

      expect(simulation.getTickCount()).toBe(1); // Tick count should remain 1

      // getCreatures was called once by the initial step triggered by start()
      expect(mockGridInstance.getCreatures).toHaveBeenCalledTimes(1);
      expect(mockCreature1.getNextMove).toHaveBeenCalledTimes(1);
      expect(mockCreature2.getNextMove).toHaveBeenCalledTimes(1);
      expect(mockGridInstance.moveEntity).toHaveBeenCalledTimes(1); // For creature1 from the first step
    });
  });
});
