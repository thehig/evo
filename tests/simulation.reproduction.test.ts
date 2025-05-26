import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"; // Added Vitest imports
// import { describe, it, expect, beforeEach, jest, afterEach } from "@jest/globals"; // Removed for Vitest
import { Simulation } from "../src/simulation";
import {
  Grid,
  Creature,
  Plant,
  DietType,
  ActivityCycle,
  PerceptionType,
  IRenderer,
} from "../src/grid";

// Declare global requestAnimationFrame/cancelAnimationFrame for Node.js if not already present
declare global {
  namespace NodeJS {
    interface Global {
      requestAnimationFrame: (callback: FrameRequestCallback) => number;
      cancelAnimationFrame: (id: number) => void;
    }
  }
}

if (typeof global.requestAnimationFrame === "undefined") {
  global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
}
if (typeof global.cancelAnimationFrame === "undefined") {
  global.cancelAnimationFrame = (id) => clearTimeout(id);
}

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let consoleLogSpy: ReturnType<typeof vi.spyOn>;
let grid: Grid;
let simulation: Simulation;
let mockRenderer: IRenderer;
let animationFrameCallbackStorage: FrameRequestCallback | null = null;

describe("Simulation - Reproduction Dynamics", () => {
  beforeEach(() => {
    grid = new Grid(10, 10);
    mockRenderer = { setup: vi.fn(), render: vi.fn() };
    simulation = new Simulation(grid, mockRenderer);

    animationFrameCallbackStorage = null;
    vi.spyOn(global, "requestAnimationFrame").mockImplementation(
      (cb: FrameRequestCallback) => {
        animationFrameCallbackStorage = cb;
        return 1;
      }
    );
    vi.spyOn(global, "cancelAnimationFrame").mockImplementation(() => {
      animationFrameCallbackStorage = null;
    });

    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("two creatures should reproduce when conditions are met", () => {
    const parentA = new Creature(
      "A",
      "red",
      "Creature",
      0,
      0,
      DietType.HERBIVORE,
      1,
      ActivityCycle.DIURNAL,
      PerceptionType.VISION,
      1,
      0,
      45,
      200,
      "PA_SEED"
    );
    const parentB = new Creature(
      "B",
      "blue",
      "Creature",
      1,
      0,
      DietType.HERBIVORE,
      1,
      ActivityCycle.DIURNAL,
      PerceptionType.VISION,
      1,
      0,
      45,
      200,
      "PB_SEED"
    );
    parentA.ticksUntilReadyToReproduce = 0;
    parentB.ticksUntilReadyToReproduce = 0;

    grid.addEntity(parentA, 0, 0);
    grid.addEntity(parentB, 1, 0);

    // Spy on the static Creature.procreate method
    const procreateSpy = vi.spyOn(Creature, "procreate");
    // Spy on grid.addEntity to check if offspring is added
    const addEntitySpy = vi.spyOn(grid, "addEntity");

    simulation.start();
    if (animationFrameCallbackStorage)
      animationFrameCallbackStorage(performance.now()); // Trigger one step

    expect(procreateSpy).toHaveBeenCalled();
    // Check if addEntity was called for the offspring (the third entity after parents)
    expect(
      addEntitySpy.mock.calls.some(
        (call) =>
          call[0] instanceof Creature &&
          call[0] !== parentA &&
          call[0] !== parentB
      )
    ).toBe(true);
    const creatures = grid.getCreatures();
    expect(creatures.length).toBe(3); // ParentA, ParentB, Offspring
  });

  // Add more tests, ensuring jest specific functions are replaced with vi
});

// ... (The rest of the file, if any, should be similarly updated)
