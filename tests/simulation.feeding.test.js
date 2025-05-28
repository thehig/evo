import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { Simulation } from "../src/simulation";
import { Grid, Creature, Plant, 
// Rock, // Not used
// Water, // Not used
// Entity, // Not used
DietType, ActivityCycle, PerceptionType, } from "../src/grid";
import { mockAnimationFrames, } from "./vitest.setup"; // Import setup helpers
// Polyfill for requestAnimationFrame - REMOVED (handled by setup)
// consoleErrorSpy, consoleLogSpy - REMOVED (handled by setup)
describe("Simulation - Feeding and Energy Dynamics", () => {
    let gridInstance;
    // let mockRendererInstance: IRenderer; // Use global mock or a fresh one per test
    let simulationInstance;
    // let animationFrameCallbackStorage: FrameRequestCallback | null = null; // Handled by mockAnimationFrames
    let animationMocks;
    beforeEach(() => {
        gridInstance = new Grid(5, 5);
        // mockRendererInstance = { ...globalMockRenderer, setup: vi.fn(), render: vi.fn() }; // Create a fresh mock for each test if needed
        // For this test, a shared mock renderer that is cleared might be okay if its state isn't critical between tests.
        // However, it's safer to create a fresh one or ensure globalMockRenderer's spies are reset.
        // For simplicity, we will use a fresh mock based on the global one.
        const mockRendererInstance = {
            setup: vi.fn(),
            render: vi.fn(),
        };
        simulationInstance = new Simulation(gridInstance, mockRendererInstance);
        simulationInstance.simulationSpeed = 0; // Run as fast as possible for test
        animationMocks = mockAnimationFrames(); // Setup animation mocks for this describe block
        // Spies for console are now global and suppress output by default
        // If a specific test needs to assert console output, it can vi.spyOn(console, 'error').mockImplementationOnce(...);
    });
    afterEach(() => {
        simulationInstance.pause();
        animationMocks.requestAnimationFrameMock.mockRestore();
        animationMocks.cancelAnimationFrameMock.mockRestore();
        // vi.restoreAllMocks(); // This might be too broad if global spies are affected, rely on specific restores or Vitest's per-test isolation
    });
    it("creature should lose energy each step and die if energy reaches zero", () => {
        const creature = new Creature("C", "red", "Creature", 0, 0, DietType.HERBIVORE, 1, ActivityCycle.DIURNAL, PerceptionType.VISION, 1, 0, 0, 2); // Start with 2 energy
        gridInstance.addEntity(creature, 0, 0);
        vi.spyOn(creature, "getNextMove").mockReturnValue(null);
        vi.spyOn(creature, "findFood").mockReturnValue(null);
        vi.spyOn(creature, "eat").mockReturnValue(false);
        simulationInstance.start(); // This will use the mocked requestAnimationFrame
        // and trigger the first tick.
        // The first tick runs immediately upon calling start()
        // animationMocks.triggerAnimationFrame(); // No need to trigger first frame, start() does it.
        expect(creature.energy).toBe(0);
        expect(gridInstance.getCreatures()).not.toContain(creature);
    });
    it("herbivore should eat adjacent plant, gain energy, and plant should be removed", () => {
        const herbivore = new Creature("H", "green", "Creature", 0, 0, DietType.HERBIVORE, 1, ActivityCycle.DIURNAL, PerceptionType.VISION, 1, 0, 0, 50);
        const plant = new Plant(0, 1);
        gridInstance.addEntity(herbivore, 0, 0);
        gridInstance.addEntity(plant, 0, 1);
        const initialEnergy = herbivore.energy;
        const plantEnergyValue = 20;
        const baseMetabolicCost = 1;
        const findFoodCost = 0.5;
        const removeEntitySpy = vi.spyOn(gridInstance, "removeEntity");
        const eatSpy = vi.spyOn(herbivore, "eat");
        vi.spyOn(herbivore, "getNextMove").mockReturnValue(null);
        simulationInstance.start(); // First tick (eating occurs)
        // animationMocks.triggerAnimationFrame(); // No need to trigger first frame
        const expectedEnergyAfterEatingStep = initialEnergy - baseMetabolicCost - findFoodCost + plantEnergyValue;
        expect(herbivore.energy).toBe(expectedEnergyAfterEatingStep);
        expect(eatSpy).toHaveBeenCalledWith(plant, gridInstance);
        expect(removeEntitySpy).toHaveBeenCalledWith(plant);
        expect(gridInstance.getCell(plant.x, plant.y)).toBeNull();
    });
});
