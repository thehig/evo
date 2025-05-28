import { vi } from "vitest";
// Polyfill for requestAnimationFrame and cancelAnimationFrame
if (typeof global.requestAnimationFrame === "undefined") {
    global.requestAnimationFrame = (callback) => {
        return setTimeout(callback, 0);
    };
}
if (typeof global.cancelAnimationFrame === "undefined") {
    global.cancelAnimationFrame = (id) => {
        clearTimeout(id);
    };
}
// Global console spies
// Suppress console output during tests by default.
// Individual tests can override this if needed by calling .mockImplementationOnce() or .mockRestore()
vi.spyOn(console, "error").mockImplementation(() => { });
vi.spyOn(console, "log").mockImplementation(() => { });
vi.spyOn(console, "warn").mockImplementation(() => { });
vi.spyOn(console, "debug").mockImplementation(() => { });
// Helper to mock the global requestAnimationFrame and cancelAnimationFrame
// This allows tests to control the animation loop.
export function mockAnimationFrames() {
    let animationFrameCallbackStorage = null;
    const requestAnimationFrameMock = vi
        .spyOn(global, "requestAnimationFrame")
        .mockImplementation((cb) => {
        animationFrameCallbackStorage = cb;
        return 1; // Return a dummy ID
    });
    const cancelAnimationFrameMock = vi
        .spyOn(global, "cancelAnimationFrame")
        .mockImplementation((id) => {
        if (id === 1 && animationFrameCallbackStorage) {
            animationFrameCallbackStorage = null;
        }
    });
    const triggerAnimationFrame = (time = performance.now()) => {
        const callback = animationFrameCallbackStorage;
        if (callback) {
            animationFrameCallbackStorage = null; // rAF callbacks are typically one-shot
            callback(time);
        }
    };
    const getStoredCallback = () => animationFrameCallbackStorage;
    return {
        requestAnimationFrameMock,
        cancelAnimationFrameMock,
        triggerAnimationFrame,
        getStoredCallback, // Expose to check if a callback is pending
    };
}
// Mock renderer that can be used in tests
export const mockRenderer = {
    setup: vi.fn(),
    render: vi.fn(),
};
// You might also want a helper for creating a default simulation setup
// import { Grid } from '../src/grid';
// import { Simulation } from '../src/simulation';
//
// export function setupSimulationTest() {
//   const grid = new Grid(10, 10);
//   const renderer = { ...mockRenderer, setup: vi.fn(), render: vi.fn(), reset: vi.fn() };
//   const simulation = new Simulation(grid, renderer);
//   simulation.simulationSpeed = 0; // Run as fast as possible for tests
//   const animationMocks = mockAnimationFrames();
//
//   return { grid, renderer, simulation, ...animationMocks };
// }
// Ensure mocks are cleared before each test if they are stateful and reused
// However, mockAnimationFrames creates new spies each time it's called.
// The global console spies are fine as they are.
// Cleanup spies after all tests if necessary, though Vitest often handles this.
// afterAll(() => {
//   vi.restoreAllMocks();
// });
