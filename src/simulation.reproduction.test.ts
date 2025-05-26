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
  Rock,
  DietType,
  // ActivityCycle, // Not directly used here
  // PerceptionType, // Not directly used here
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

describe("Simulation - Reproduction Dynamics", () => {
  let simulation: Simulation;
  let actualGridModule: typeof GridModuleType;
  let gridInstance: Grid;
  let mockRendererInstance: jest.Mocked<IRenderer>;
  let requestAnimationFrameSpy: ReturnType<typeof jest.spyOn>;
  let cancelAnimationFrameSpy: ReturnType<typeof jest.spyOn>;
  let animationFrameCallbackStorage: FrameRequestCallback | null = null;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn> | null = null;
  const originalConsoleError = console.error;

  beforeEach(() => {
    // jest.unmock("./grid"); // REVERT
    // jest.resetModules(); // REVERT
    actualGridModule = jest.requireActual<typeof GridModuleType>("./grid");

    gridInstance = new actualGridModule.Grid(10, 10);
    mockRendererInstance = {
      setup: jest.fn(),
      render: jest.fn(),
    };
    simulation = new Simulation(gridInstance, mockRendererInstance);

    animationFrameCallbackStorage = null;
    requestAnimationFrameSpy = jest
      .spyOn(global, "requestAnimationFrame")
      .mockImplementation((cb: FrameRequestCallback) => {
        animationFrameCallbackStorage = cb; // Store it
        return 1;
      });
    cancelAnimationFrameSpy = jest
      .spyOn(global, "cancelAnimationFrame")
      .mockImplementation(() => {});

    // jest.spyOn(console, "log").mockImplementation(() => {}); // Temporarily disable mock for this suite
    consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation((...args) => {
        originalConsoleError(...args);
      });
  });

  afterEach(() => {
    simulation.pause();
    requestAnimationFrameSpy.mockRestore();
    cancelAnimationFrameSpy.mockRestore();
    if (consoleErrorSpy) {
      consoleErrorSpy.mockRestore();
    }
    jest.restoreAllMocks();
  });

  const tickSimulation = (count: number = 1) => {
    for (let i = 0; i < count; i++) {
      const callbackToRun = animationFrameCallbackStorage;
      animationFrameCallbackStorage = null; // Clear before running to ensure step() can re-schedule one cleanly.
      if (callbackToRun) {
        callbackToRun(performance.now()); // This will run step(), which will call rAF, which will set animationFrameCallbackStorage again via the mock.
      }
    }
  };

  it("should allow two healthy creatures to reproduce successfully", () => {
    const parentASeed = "H1VDA11";
    const parentBSeed = "C2SNC22";

    // energyForReproduction is fixed at 150 in Creature class
    // energyCostOfReproduction is fixed at 50 in Creature class

    const actualEnergyForReproductionThreshold = 150;
    const actualEnergyCostOfReproduction = 50;

    // Set initial energy to a value that allows survival and actions
    // PA: needs to be > 150 to try repro. Pays 50 cost. Pays 1.5 turn costs.
    // PB: needs to survive PA's repro cost (50). Pays 1.5 turn costs. Eat.
    // Let's set initial energy to 160 for both.
    const initialEnergyForParents = 160.0;

    const parentA = actualGridModule.Creature.fromSeed(
      parentASeed,
      0,
      0,
      undefined,
      undefined,
      initialEnergyForParents
    );
    const parentB = actualGridModule.Creature.fromSeed(
      parentBSeed,
      0,
      1,
      undefined,
      undefined,
      initialEnergyForParents
    );

    expect(parentA).not.toBeNull();
    expect(parentB).not.toBeNull();
    if (!parentA || !parentB) return;

    // Verify their actual energyForReproduction threshold and cost
    expect(parentA.energyForReproduction).toBe(
      actualEnergyForReproductionThreshold
    );
    expect(parentA.energyCostOfReproduction).toBe(
      actualEnergyCostOfReproduction
    );
    expect(parentB.energyForReproduction).toBe(
      actualEnergyForReproductionThreshold
    );
    expect(parentB.energyCostOfReproduction).toBe(
      actualEnergyCostOfReproduction
    );

    gridInstance.addEntity(parentA, 0, 0);
    gridInstance.addEntity(parentB, 0, 1); // Parent B is at (0,1)

    // Fill cells to force offspring placement at (1,0) relative to Parent A (0,0)
    // Adjacent cells to Parent A (0,0): (0,1), (1,1), (1,0), (1,-1), (0,-1), (-1,-1), (-1,0), (-1,1)
    // (0,1) is Parent B.
    // We want (1,0) to be the only free spot.
    gridInstance.addEntity(new actualGridModule.Rock(), 1, 1);
    // gridInstance.addEntity(new actualGridModule.Rock(), 1, -1); // Invalid anyways
    // gridInstance.addEntity(new actualGridModule.Rock(), 0, -1); // Invalid anyways
    // gridInstance.addEntity(new actualGridModule.Rock(), -1, -1); // Invalid anyways
    gridInstance.addEntity(new actualGridModule.Rock(), -1, 0);
    gridInstance.addEntity(new actualGridModule.Rock(), -1, 1);

    const initialCreaturesCount = gridInstance.getCreatures().length;
    expect(initialCreaturesCount).toBe(2);

    parentA.getNextMove = jest.fn(() => null);
    parentB.getNextMove = jest.fn(() => null);

    parentA.ticksUntilReadyToReproduce = 0;
    parentB.ticksUntilReadyToReproduce = 0;

    // --- Simulate First Step ---
    simulation.start();

    const creaturesAfterFirstStep = gridInstance.getCreatures() as Creature[];
    expect(creaturesAfterFirstStep.length).toBe(2); // Parent B and Offspring should survive

    const foundParentA = creaturesAfterFirstStep.some(
      (c) => c.seed === parentA.seed
    );
    expect(foundParentA).toBe(false); // Parent A is eaten

    const currentParentBFromGrid = creaturesAfterFirstStep.find(
      (c) => c.seed === parentB.seed
    ) as Creature | undefined;
    const offspring = creaturesAfterFirstStep.find(
      (c) => c.seed !== parentA.seed && c.seed !== parentB.seed
    ) as Creature | undefined;

    expect(currentParentBFromGrid).toBeDefined();
    expect(offspring).toBeDefined();

    if (!currentParentBFromGrid || !offspring) return;

    // --- Assertions for Parent B after 1st step ---
    // Parent A's state when eaten:
    // Initial: 160.0
    // Metabolic cost (-1): 159.0
    // Reproduction cost (-50): 109.0
    // Sense cost (-0.5, during its turn actions): 108.5
    // const energyOfParentAWhenEaten_simulated = 108.5; // Not directly used by B's gain

    // Parent B's energy calculation:
    // Initial: 160.0
    // Pays its share of reproduction cost during A's turn (-50): 110.0
    // Metabolic cost for B's turn (-1): 109.0
    // Sense cost for B's turn (-0.5): 108.5
    // Eats Parent A, fixed gain (+50): 108.5 + 50 = 158.5
    const expectedParentBEnergyStep1 = 158.5; // This is the corrected expectation
    expect(currentParentBFromGrid.energy).toBeCloseTo(
      expectedParentBEnergyStep1
    );

    expect(currentParentBFromGrid.ticksUntilReadyToReproduce).toBe(
      parentB.reproductionCooldown - 1 // Cooldown set by procreate, then decremented by 1 in B's turn
    );

    // --- Assertions for Offspring after 1st step ---
    // Offspring is created with 100 energy in Creature.procreate
    const expectedOffspringEnergy = 100;
    expect(offspring.energy).toBeCloseTo(expectedOffspringEnergy);
    expect(offspring.ticksUntilReadyToReproduce).toBe(0); // Born this tick, doesn't act.

    // Offspring's energyForReproduction is the class default (150)
    expect(offspring.energyForReproduction).toBe(
      actualEnergyForReproductionThreshold
    );
    expect(offspring.energyCostOfReproduction).toBe(
      actualEnergyCostOfReproduction
    );

    // Offspring properties based on its actual seed
    expect(offspring.dietType).toBe(DietType.HERBIVORE); // Offspring seed varies, check general type
    // Offspring should be placed at (1,0)
    expect(offspring.x).toBe(1);
    expect(offspring.y).toBe(0);
  });

  it("should prevent reproduction if a parent has insufficient energy", () => {
    const parentASeed = "H1VDA11";
    const parentBSeed = "H1VDA22";

    const parentA = actualGridModule.Creature.fromSeed(
      parentASeed,
      0,
      0,
      undefined,
      undefined,
      200
    );
    const parentB = actualGridModule.Creature.fromSeed(
      parentBSeed,
      0,
      1,
      undefined,
      undefined,
      200
    );

    expect(parentA).not.toBeNull();
    expect(parentB).not.toBeNull();
    if (!parentA || !parentB) return;

    // Prevent movement to simplify energy calculations beyond reproduction checks
    parentA.getNextMove = jest.fn(() => null);
    parentB.getNextMove = jest.fn(() => null);

    gridInstance.addEntity(parentA, 0, 0);
    gridInstance.addEntity(parentB, 0, 1);

    // Parent A has insufficient energy
    parentA.energy = parentA.energyForReproduction - 1;
    parentB.energy = parentB.energyForReproduction; // Parent B is fine
    parentA.ticksUntilReadyToReproduce = 0;
    parentB.ticksUntilReadyToReproduce = 0;

    const initialCreaturesCount = gridInstance.getCreatures().length;

    simulation.start(); // Schedules step & runs step 1
    tickSimulation(1); // Execute step 2

    const creaturesAfterTick = gridInstance.getCreatures();
    expect(creaturesAfterTick.length).toBe(initialCreaturesCount); // No new creature

    // Parent B: (started with E_repro)
    // Step 1: No repro. Energy = E_repro - 1 (base) - 0.5 (sense) - 1 (move attempt) = E_repro - 2.5
    // Step 2: No repro. Energy = (E_repro - 2.5) - 1 - 0.5 - 1 = E_repro - 5
    const expectedParentBEnergy = parentB.energyForReproduction - 5;
    expect(parentB.energy).toBeCloseTo(expectedParentBEnergy);
    expect(parentB.ticksUntilReadyToReproduce).toBe(0); // Cooldown doesn't change if no repro

    // Parent A: (started with E_repro - 1)
    // Step 1: Energy = (E_repro - 1) - 1 - 0.5 - 1 = E_repro - 3.5
    // Step 2: Energy = (E_repro - 3.5) - 1 - 0.5 - 1 = E_repro - 6
    const expectedParentAEnergy = parentA.energyForReproduction - 1 - 5; // Initial was E_repro -1, then lost 5 over two steps
    expect(parentA.energy).toBeCloseTo(expectedParentAEnergy);
  });

  it("should prevent reproduction if a parent is on cooldown", () => {
    const parentASeed = "H1VDA11";
    const parentBSeed = "H1VDA22";

    const parentA = actualGridModule.Creature.fromSeed(
      parentASeed,
      0,
      0,
      undefined,
      undefined,
      200
    );
    const parentB = actualGridModule.Creature.fromSeed(
      parentBSeed,
      0,
      1,
      undefined,
      undefined,
      200
    );

    expect(parentA).not.toBeNull();
    expect(parentB).not.toBeNull();
    if (!parentA || !parentB) return;

    // Prevent movement to simplify energy calculations
    parentA.getNextMove = jest.fn(() => null);
    parentB.getNextMove = jest.fn(() => null);

    gridInstance.addEntity(parentA, 0, 0);
    gridInstance.addEntity(parentB, 0, 1);

    parentA.energy = parentA.energyForReproduction;
    parentB.energy = parentB.energyForReproduction;
    parentA.ticksUntilReadyToReproduce = 5; // Parent A is on cooldown
    parentB.ticksUntilReadyToReproduce = 0; // Parent B is ready

    const initialCreaturesCount = gridInstance.getCreatures().length;

    simulation.start(); // Schedules step & runs step 1
    tickSimulation(1); // Execute step 2

    const creaturesAfterTick = gridInstance.getCreatures();
    expect(creaturesAfterTick.length).toBe(initialCreaturesCount); // No new creature

    // Cooldown for parent A should decrement twice (5 -> 4 -> 3)
    expect(parentA.ticksUntilReadyToReproduce).toBe(3);
    // Parent B should not have its cooldown set as no reproduction occurred.
    // Parent B energy: E_repro - 5 (similar to insufficient energy case)
    const expectedParentBEnergy = parentB.energyForReproduction - 5;
    expect(parentB.ticksUntilReadyToReproduce).toBe(0);
    expect(parentB.energy).toBeCloseTo(expectedParentBEnergy);
  });

  it("should prevent reproduction if there is no space for offspring", () => {
    const parentASeed = "H1VDA11";
    const parentBSeed = "H1VDA22";

    gridInstance = new actualGridModule.Grid(3, 3); // Create a smaller grid for this test
    // Re-initialize simulation with the new gridInstance if not done in beforeEach for every test
    simulation = new Simulation(gridInstance, mockRendererInstance);

    const parentA = actualGridModule.Creature.fromSeed(
      parentASeed,
      1,
      0,
      undefined,
      undefined,
      200
    );
    const parentB = actualGridModule.Creature.fromSeed(
      parentBSeed,
      1,
      1,
      undefined,
      undefined,
      200
    );

    expect(parentA).not.toBeNull();
    expect(parentB).not.toBeNull();
    if (!parentA || !parentB) return;

    // Prevent movement
    parentA.getNextMove = jest.fn(() => null);
    parentB.getNextMove = jest.fn(() => null);

    gridInstance.addEntity(parentA, 1, 0);
    gridInstance.addEntity(parentB, 1, 1);

    // Fill all adjacent cells
    gridInstance.addEntity(new actualGridModule.Rock(0, 0), 0, 0);
    gridInstance.addEntity(new actualGridModule.Rock(0, 1), 0, 1);
    gridInstance.addEntity(new actualGridModule.Rock(0, 2), 0, 2);
    gridInstance.addEntity(new actualGridModule.Rock(1, 2), 1, 2);
    gridInstance.addEntity(new actualGridModule.Rock(2, 0), 2, 0);
    gridInstance.addEntity(new actualGridModule.Rock(2, 1), 2, 1);
    gridInstance.addEntity(new actualGridModule.Rock(2, 2), 2, 2);

    parentA.energy = parentA.energyForReproduction;
    parentB.energy = parentB.energyForReproduction;
    parentA.ticksUntilReadyToReproduce = 0;
    parentB.ticksUntilReadyToReproduce = 0;

    const initialCreaturesCount = gridInstance.getCreatures().length;

    simulation.start(); // Schedules step & runs step 1
    tickSimulation(1); // Execute step 2

    const creaturesAfterTick = gridInstance.getCreatures();
    expect(creaturesAfterTick.length).toBe(initialCreaturesCount); // No new creature

    // Parents should lose energy for 2 steps, each costing 2.5 (base+sense+move_attempt)
    // Total loss = 5
    const expectedEnergy = parentA.energyForReproduction - 5;
    expect(parentA.energy).toBeCloseTo(expectedEnergy);
    expect(parentB.energy).toBeCloseTo(expectedEnergy);
    expect(parentA.ticksUntilReadyToReproduce).toBe(0); // Cooldowns don't change
    expect(parentB.ticksUntilReadyToReproduce).toBe(0);
  });

  it("should decrement reproduction cooldown each tick", () => {
    const creature = actualGridModule.Creature.fromSeed(
      "H1VDA11",
      0,
      0,
      undefined,
      undefined,
      100
    );
    expect(creature).not.toBeNull();
    if (!creature) return;

    gridInstance.addEntity(creature, 0, 0);
    creature.ticksUntilReadyToReproduce = 5;

    simulation.start(); // Step 1: Cooldown 5 -> 4
    tickSimulation(1); // Step 2: Cooldown 4 -> 3
    expect(creature.ticksUntilReadyToReproduce).toBe(3); // After 2 steps total

    tickSimulation(1); // Step 3: Cooldown 3 -> 2
    expect(creature.ticksUntilReadyToReproduce).toBe(2); // After 3 steps total

    tickSimulation(1); // Step 4: Cooldown 2 -> 1
    expect(creature.ticksUntilReadyToReproduce).toBe(1); // After 4 steps total

    tickSimulation(1); // Step 5: Cooldown 1 -> 0
    expect(creature.ticksUntilReadyToReproduce).toBe(0); // After 5 steps total
  });
});
