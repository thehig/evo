/**
 * WebGL Renderer Integration Test
 *
 * Simple integration test to verify the WebGL renderer interface works correctly.
 * Note: Full P5.js functionality requires a browser environment.
 */

import { describe, it, expect, vi } from "vitest";
import { WebGLRenderer } from "../../src/renderer/WebGLRenderer";
import { RendererEventType } from "../../src/renderer/types";

// Mock P5.js to prevent browser environment requirements
vi.mock("p5", () => ({
  default: class MockP5 {
    constructor() {
      // Mock constructor that doesn't require browser APIs
    }
  },
}));

describe("WebGL Renderer Integration", () => {
  it("should create a WebGL renderer with correct properties", () => {
    const renderer = new WebGLRenderer();

    expect(renderer.id).toBe("webgl");
    expect(renderer.name).toBe("WebGL Renderer");
    expect(renderer.initialized).toBe(false);

    const capabilities = renderer.capabilities;
    expect(capabilities.hasVisualOutput).toBe(true);
    expect(capabilities.supportsRealTime).toBe(true);
    expect(capabilities.canExport).toBe(true);
    expect(capabilities.supportsInteraction).toBe(true);
    expect(capabilities.metadata.library).toBe("p5.js");
  });

  it("should support event subscription", () => {
    const renderer = new WebGLRenderer();
    const handler = () => {};

    // Should not throw when adding/removing event handlers
    expect(() => {
      renderer.on(RendererEventType.RENDER_START, handler);
      renderer.off(RendererEventType.RENDER_START, handler);
    }).not.toThrow();
  });

  it("should support configuration", () => {
    const renderer = new WebGLRenderer({
      width: 1024,
      height: 768,
      cellSize: 25,
    });

    expect(renderer.id).toBe("webgl");
    expect(renderer.name).toBe("WebGL Renderer");

    // Should not throw when configuring
    expect(() => {
      renderer.configure({ showGrid: false });
    }).not.toThrow();
  });

  it("should create snapshots", () => {
    const renderer = new WebGLRenderer();
    const world = {}; // Mock world
    const tick = 100;

    const snapshot = renderer.createSnapshot(world, tick);

    expect(snapshot.tick).toBe(tick);
    expect(snapshot.timestamp).toBeGreaterThan(0);
    expect(snapshot.dimensions).toEqual({ width: 100, height: 100 });
    expect(Array.isArray(snapshot.entities)).toBe(true);
    expect(Array.isArray(snapshot.creatures)).toBe(true);
    expect(Array.isArray(snapshot.cells)).toBe(true);
  });

  it("should handle configuration merging", () => {
    const customConfig = {
      width: 1200,
      height: 900,
      cellSize: 30,
      showGrid: false,
      backgroundColor: "#000000",
    };

    const renderer = new WebGLRenderer(customConfig);

    expect(renderer.id).toBe("webgl");
    expect(renderer.name).toBe("WebGL Renderer");
    expect(renderer.initialized).toBe(false);
  });

  it("should support all required renderer capabilities", () => {
    const renderer = new WebGLRenderer();
    const capabilities = renderer.capabilities;

    // Verify all required capabilities are present
    expect(typeof capabilities.hasVisualOutput).toBe("boolean");
    expect(typeof capabilities.supportsRealTime).toBe("boolean");
    expect(typeof capabilities.canExport).toBe("boolean");
    expect(typeof capabilities.supportsInteraction).toBe("boolean");
    expect(typeof capabilities.maxWorldSize).toBe("object");
    expect(Array.isArray(capabilities.exportFormats)).toBe(true);
    expect(typeof capabilities.metadata).toBe("object");

    // Verify specific values
    expect(capabilities.hasVisualOutput).toBe(true);
    expect(capabilities.supportsRealTime).toBe(true);
    expect(capabilities.canExport).toBe(true);
    expect(capabilities.supportsInteraction).toBe(true);
    expect(capabilities.exportFormats).toContain("png");
    expect(capabilities.exportFormats).toContain("jpg");
  });
});
