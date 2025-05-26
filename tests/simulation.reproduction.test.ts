import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { Simulation } from "../src/simulation";
import {
  Grid,
  Creature,
  // Plant, // Not used
  DietType,
  ActivityCycle,
  PerceptionType,
  type IRenderer, // Use type import
} from "../src/grid";
import {
  mockAnimationFrames,
  mockRenderer as globalMockRenderer,
} from "./vitest.setup"; // Import setup helpers

// Polyfills and global spies are now in vitest.setup.ts

// let consoleErrorSpy: ReturnType<typeof vi.spyOn>; // Handled by setup
// let consoleLogSpy: ReturnType<typeof vi.spyOn>; // Handled by setup
let grid: Grid;
let simulation: Simulation;
// let mockRenderer: IRenderer; // Use a fresh mock or reset globalMockRenderer
// let animationFrameCallbackStorage: FrameRequestCallback | null = null; // Handled by mockAnimationFrames
let animationMocks: ReturnType<typeof mockAnimationFrames>;
let testMockRenderer: IRenderer;

describe("Simulation - Reproduction Dynamics", () => {
  beforeEach(() => {
    grid = new Grid(10, 10);
    // Create a fresh mock renderer for each test
    testMockRenderer = {
      setup: vi.fn(),
      render: vi.fn(),
    };
    simulation = new Simulation(grid, testMockRenderer);
    simulation.simulationSpeed = 0; // Ensure simulation runs fast for tests

    animationMocks = mockAnimationFrames(); // Setup animation mocks

    // Global console spies are active.
  });

  afterEach(() => {
    simulation.pause();
    animationMocks.requestAnimationFrameMock.mockRestore();
    animationMocks.cancelAnimationFrameMock.mockRestore();
    vi.restoreAllMocks(); // Restore all other mocks
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

    const procreateSpy = vi.spyOn(Creature, "procreate");
    const addEntitySpy = vi.spyOn(grid, "addEntity");

    simulation.start(); // First tick
    // The actual reproduction logic might happen in the first tick or might require a subsequent one
    // depending on Simulation.step() logic. Assuming reproduction check is part of the first step.
    // animationMocks.triggerAnimationFrame(); // If a second frame/tick is needed to see reproduction

    expect(procreateSpy).toHaveBeenCalled();
    expect(
      addEntitySpy.mock.calls.some(
        (call) =>
          call[0] instanceof Creature &&
          call[0] !== parentA &&
          call[0] !== parentB
      )
    ).toBe(true);
    const creatures = grid.getCreatures();
    expect(creatures.length).toBe(3);
  });
});

// ... (The rest of the file, if any, should be similarly updated)
