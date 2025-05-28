import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { Simulation } from "../src/simulation";
// import type * as GridModuleType from "../src/grid"; // Not strictly needed with explicit imports
import { Grid, Creature, // Use type import
// IEntity, // Not used directly
DietType,
// ActivityCycle, // Not used directly
// PerceptionType, // Not used directly
 } from "../src/grid";
import { mockAnimationFrames, } from "./vitest.setup"; // Import setup helpers
// Polyfills and global spies are now in vitest.setup.ts
// Mock console.error and console.log - REMOVED (handled by setup)
// let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
// let consoleLogSpy: ReturnType<typeof vi.spyOn>;
describe("Simulation", () => {
    let mockGridInstance;
    let simulation;
    let animationMocks;
    let testMockRenderer;
    beforeEach(() => {
        mockGridInstance = new Grid(10, 10); // Use actual Grid
        // Spy on methods of the actual instance if needed for specific assertions.
        // It's often better to spy only when necessary within a test or a nested describe.
        // For broad spying like this, ensure restoration in afterEach.
        vi.spyOn(mockGridInstance, "getCreatures");
        vi.spyOn(mockGridInstance, "moveEntity");
        vi.spyOn(mockGridInstance, "removeEntity");
        vi.spyOn(mockGridInstance, "getCell");
        vi.spyOn(mockGridInstance, "addEntity");
        // Create a fresh mock renderer for each test to avoid state leakage
        testMockRenderer = {
            setup: vi.fn(),
            render: vi.fn(),
        };
        simulation = new Simulation(mockGridInstance, testMockRenderer);
        animationMocks = mockAnimationFrames(); // Setup animation mocks
        // Global console spies are active from setup file.
    });
    afterEach(() => {
        simulation.pause();
        animationMocks.requestAnimationFrameMock.mockRestore();
        animationMocks.cancelAnimationFrameMock.mockRestore();
        vi.restoreAllMocks(); // Restore all mocks, including those on mockGridInstance and any others
    });
    it("should initialize with tickCount 0 and not running", () => {
        expect(simulation.getTickCount()).toBe(0);
        expect(simulation.isSimulationRunning()).toBe(false);
    });
    describe("start", () => {
        it("should set isRunning to true and request an animation frame", () => {
            simulation.start();
            expect(simulation.isSimulationRunning()).toBe(true);
            expect(animationMocks.requestAnimationFrameMock).toHaveBeenCalled();
        });
        it("should not start if already running", () => {
            simulation.start();
            const initialCallCount = animationMocks.requestAnimationFrameMock.mock.calls.length;
            simulation.start(); // Call start again
            expect(animationMocks.requestAnimationFrameMock.mock.calls.length).toBe(initialCallCount);
            expect(testMockRenderer.render).toHaveBeenCalledTimes(1); // Assuming start calls render once
        });
    });
    describe("pause", () => {
        it("should set isRunning to false and cancel animation frame if running", () => {
            simulation.start(); // This requests an animation frame
            simulation.pause();
            expect(simulation.isSimulationRunning()).toBe(false);
            expect(animationMocks.cancelAnimationFrameMock).toHaveBeenCalled();
        });
        it("should not cancel animation frame if not running", () => {
            simulation.pause();
            expect(animationMocks.cancelAnimationFrameMock).not.toHaveBeenCalled();
        });
    });
    describe("reset", () => {
        it("should pause the simulation, reset tickCount, and render", () => {
            simulation.start();
            // Manually trigger one frame to ensure simulation is in a state that can be reset
            animationMocks.triggerAnimationFrame();
            simulation.reset();
            expect(simulation.isSimulationRunning()).toBe(false);
            expect(simulation.getTickCount()).toBe(0);
            expect(testMockRenderer.render).toHaveBeenCalled(); // Reset should call render
        });
    });
    describe("step logic (via tick simulation)", () => {
        let mockCreature1;
        let mockCreature2;
        beforeEach(() => {
            // Clear mocks on gridInstance from parent beforeEach, or re-initialize grid here if preferred
            vi.mocked(mockGridInstance.getCreatures).mockClear();
            vi.mocked(mockGridInstance.moveEntity).mockClear();
            vi.mocked(mockGridInstance.removeEntity).mockClear();
            mockCreature1 = new Creature("C1", "#111111", "Creature", 0, 0, DietType.HERBIVORE);
            vi.spyOn(mockCreature1, "getNextMove").mockReturnValue({
                newX: 1,
                newY: 1,
            });
            mockCreature2 = new Creature("C2", "#222222", "Creature", 2, 2, DietType.CARNIVORE);
            vi.spyOn(mockCreature2, "getNextMove").mockReturnValue(null);
            vi.mocked(mockGridInstance.getCreatures).mockReturnValue([
                mockCreature1,
                mockCreature2,
            ]);
            vi.mocked(mockGridInstance.moveEntity).mockReturnValue(true); // Default mock for move
        });
        afterEach(() => {
            // Important to restore mocks on creatures if they are spied on in beforeEach of this describe block
            vi.restoreAllMocks();
        });
        it("should increment tickCount, process creatures, and render on each step", () => {
            expect(simulation.getTickCount()).toBe(0);
            simulation.start(); // First step/tick happens here, tickCount = 1
            expect(simulation.getTickCount()).toBe(1);
            expect(mockGridInstance.getCreatures).toHaveBeenCalledTimes(1);
            expect(mockCreature1.getNextMove).toHaveBeenCalledTimes(1);
            expect(mockCreature2.getNextMove).toHaveBeenCalledTimes(1);
            expect(mockGridInstance.moveEntity).toHaveBeenCalledWith(mockCreature1, 1, 1);
            expect(mockGridInstance.moveEntity).toHaveBeenCalledTimes(1); // Only C1 moves
            expect(testMockRenderer.render).toHaveBeenCalledTimes(1); // Render after first step
            animationMocks.triggerAnimationFrame(); // Simulate second step/tick
            expect(simulation.getTickCount()).toBe(2);
            expect(mockGridInstance.getCreatures).toHaveBeenCalledTimes(2);
            expect(mockCreature1.getNextMove).toHaveBeenCalledTimes(2);
            expect(mockCreature2.getNextMove).toHaveBeenCalledTimes(2);
            expect(mockGridInstance.moveEntity).toHaveBeenCalledTimes(2); // C1 moves again
            expect(testMockRenderer.render).toHaveBeenCalledTimes(2); // Render after second step
        });
        it("should not process further steps if paused immediately", () => {
            simulation.start(); // First step/tick (tickCount becomes 1), rAF for 2nd step scheduled.
            vi.clearAllMocks(); // Clear mocks after start to only count subsequent calls.
            // Re-mock returns for grid since clearAllMocks clears them.
            vi.mocked(mockGridInstance.getCreatures).mockReturnValue([
                mockCreature1,
                mockCreature2,
            ]);
            vi.mocked(mockGridInstance.moveEntity).mockReturnValue(true);
            simulation.pause(); // Pause immediately. This should cancel the scheduled rAF.
            // Try to trigger animation frame callback - it shouldn't run step() due to pause
            animationMocks.triggerAnimationFrame();
            // Assert that no processing methods were called after pause
            expect(mockGridInstance.getCreatures).not.toHaveBeenCalled();
            expect(mockCreature1.getNextMove).not.toHaveBeenCalled();
            expect(mockCreature2.getNextMove).not.toHaveBeenCalled();
            expect(mockGridInstance.moveEntity).not.toHaveBeenCalled();
            expect(testMockRenderer.render).not.toHaveBeenCalled(); // Render should not have been called after pause.
        });
    });
});
