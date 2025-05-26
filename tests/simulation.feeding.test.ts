import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { Simulation } from "../src/simulation";
import {
  Grid,
  Creature,
  Plant,
  Rock,
  Water,
  Entity,
  DietType,
  ActivityCycle,
  PerceptionType,
  IEntity,
  IRenderer,
} from "../src/grid";

// Extend the NodeJS.Global interface
declare global {
  namespace NodeJS {
    interface Global {
      requestAnimationFrame: (callback: FrameRequestCallback) => number;
      cancelAnimationFrame: (id: number) => void;
    }
  }
}

// Polyfill for requestAnimationFrame
if (typeof global.requestAnimationFrame === "undefined") {
  global.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    return setTimeout(callback, 0);
  };
}
if (typeof global.cancelAnimationFrame === "undefined") {
  global.cancelAnimationFrame = (id: number): void => {
    clearTimeout(id);
  };
}

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let consoleLogSpy: ReturnType<typeof vi.spyOn>;

describe("Simulation - Feeding and Energy Dynamics", () => {
  let gridInstance: Grid;
  let mockRendererInstance: IRenderer;
  let simulationInstance: Simulation;
  let animationFrameCallbackStorage: FrameRequestCallback | null = null;

  beforeEach(() => {
    gridInstance = new Grid(5, 5);
    mockRendererInstance = {
      setup: vi.fn(),
      render: vi.fn(),
    };
    simulationInstance = new Simulation(gridInstance, mockRendererInstance);
    simulationInstance.simulationSpeed = 0; // Run as fast as possible for test

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
    simulationInstance.pause();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("creature should lose energy each step and die if energy reaches zero", () => {
    const creature = new Creature(
      "C",
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
      0,
      2
    ); // Start with 2 energy
    gridInstance.addEntity(creature, 0, 0);
    vi.spyOn(creature, "getNextMove").mockReturnValue(null);
    vi.spyOn(creature, "findFood").mockReturnValue(null);
    vi.spyOn(creature, "eat").mockReturnValue(false);

    simulationInstance.start();

    // Tick 1
    // Simulation.start() executes the first tick immediately.
    // Energy: 2 (start)
    // -1 (base cost in Simulation.step) -> 1
    // findFood mock is called, ateThisTurn = false
    // -1 (cost for attempting to move, because !ateThisTurn) -> 0
    // getNextMove mock is called.
    // Creature energy is 0, so it dies at the end of this first step processing loop or beginning of next.
    // The check for energy <=0 and removal happens *before* findFood/move in the loop for *that creature*.
    // However, after all costs, energy is 0. So removeEntity will be called.

    // Let's check state *after* the first tick completes (which is done by simulation.start() itself)
    expect(creature.energy).toBe(0); // Energy should be 0 after all costs in the first step
    expect(gridInstance.getCreatures()).not.toContain(creature); // Should be removed as energy is 0

    // No second tick needed to test death if energy is 0 after first tick's actions.
    // If we were to simulate a second tick, the creature would already be gone.
  });

  it("herbivore should eat adjacent plant, gain energy, and plant should be removed", () => {
    const herbivore = new Creature(
      "H",
      "green",
      "Creature",
      0,
      0,
      DietType.HERBIVORE,
      1,
      ActivityCycle.DIURNAL,
      PerceptionType.VISION,
      1,
      0,
      0,
      50
    );
    const plant = new Plant(0, 1); // Plant south of herbivore
    gridInstance.addEntity(herbivore, 0, 0);
    gridInstance.addEntity(plant, 0, 1);

    const initialEnergy = herbivore.energy; // 50
    const plantEnergyValue = 20; // From Creature.eat()
    const baseMetabolicCost = 1; // From Simulation.step()
    const findFoodCost = 0.5; // From Creature.findFood()

    const removeEntitySpy = vi.spyOn(gridInstance, "removeEntity");
    const eatSpy = vi.spyOn(herbivore, "eat");
    vi.spyOn(herbivore, "getNextMove").mockReturnValue(null);

    // simulation.start() will execute the first step where eating occurs.
    simulationInstance.start();

    // Expected energy after the first step (where eating occurs):
    // Initial (50) - baseMetabolicCost (1) - findFoodCost (0.5) + plantEnergyValue (20) = 68.5
    const expectedEnergyAfterEatingStep =
      initialEnergy - baseMetabolicCost - findFoodCost + plantEnergyValue;
    expect(herbivore.energy).toBe(expectedEnergyAfterEatingStep);
    expect(eatSpy).toHaveBeenCalledWith(plant, gridInstance);
    expect(removeEntitySpy).toHaveBeenCalledWith(plant);
    expect(gridInstance.getCell(plant.x, plant.y)).toBeNull();

    // To be very clear, we are not triggering a second animation frame here for this specific test's assertions.
  });
});
