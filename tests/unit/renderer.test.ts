/**
 * Renderer system tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  RendererEventType,
  NullRenderer,
  RendererRegistry,
  WorldSnapshotCreator,
  createNullRenderer,
  getRendererRegistry,
} from "../../src/renderer";
import { World } from "../../src/world/World";
import { ResourceType } from "../../src/world/types";
import { Random } from "../../src/core/random";

describe("Renderer System", () => {
  let world: World;
  let random: Random;

  beforeEach(() => {
    random = new Random(12345);
    world = new World(random, {
      width: 10,
      height: 10,
      seed: 12345,
      useChunking: false,
    });
  });

  afterEach(() => {
    // Clean up any active renderers
    const registry = getRendererRegistry();
    registry.shutdown();
  });

  describe("WorldSnapshotCreator", () => {
    it("should create a complete world snapshot", () => {
      const tick = 100;
      const snapshot = WorldSnapshotCreator.createSnapshot(world, tick);

      expect(snapshot).toBeDefined();
      expect(snapshot.tick).toBe(tick);
      expect(snapshot.timestamp).toBeGreaterThan(0);
      expect(snapshot.dimensions).toEqual({ width: 10, height: 10 });
      expect(snapshot.entities).toEqual([]);
      expect(snapshot.creatures).toEqual([]);
      expect(Array.isArray(snapshot.cells)).toBe(true);
      expect(snapshot.statistics).toBeDefined();
      expect(snapshot.metadata).toBeDefined();
    });

    it("should create a minimal snapshot", () => {
      const tick = 50;
      const snapshot = WorldSnapshotCreator.createMinimalSnapshot(world, tick);

      expect(snapshot.tick).toBe(tick);
      expect(snapshot.timestamp).toBeGreaterThan(0);
      expect(snapshot.dimensions).toEqual({ width: 10, height: 10 });
      expect(snapshot.statistics).toBeDefined();
      expect(snapshot.metadata?.snapshotType).toBe("minimal");
    });

    it("should include statistics in snapshot", () => {
      const snapshot = WorldSnapshotCreator.createSnapshot(world, 1);

      expect(snapshot.statistics.totalEntities).toBe(0);
      expect(snapshot.statistics.totalCreatures).toBe(0);
      expect(snapshot.statistics.livingCreatures).toBe(0);
      expect(snapshot.statistics.averageEnergy).toBe(0);
      expect(snapshot.statistics.totalResources).toBeDefined();
      expect(
        snapshot.statistics.totalResources[ResourceType.FOOD]
      ).toBeGreaterThanOrEqual(0);
    });

    it("should handle sparse cell representation", () => {
      const snapshot = WorldSnapshotCreator.createSnapshot(world, 1);

      // With an empty world, cells array should be sparse (only interesting cells)
      // Since we have obstacles and resources generated, there should be some cells
      expect(Array.isArray(snapshot.cells)).toBe(true);
    });
  });

  describe("NullRenderer", () => {
    let renderer: NullRenderer;

    beforeEach(() => {
      renderer = new NullRenderer();
    });

    afterEach(async () => {
      if (renderer.initialized) {
        await renderer.shutdown();
      }
    });

    it("should have correct properties", () => {
      expect(renderer.id).toBe("null");
      expect(renderer.name).toBe("Null Renderer");
      expect(renderer.initialized).toBe(false);
    });

    it("should have correct capabilities", () => {
      const caps = renderer.capabilities;
      expect(caps.hasVisualOutput).toBe(false);
      expect(caps.supportsRealTime).toBe(true);
      expect(caps.canExport).toBe(false);
      expect(caps.supportsInteraction).toBe(false);
      expect(caps.exportFormats).toEqual([]);
      expect(caps.maxWorldSize.width).toBe(Number.MAX_SAFE_INTEGER);
      expect(caps.maxWorldSize.height).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("should initialize and shutdown correctly", async () => {
      expect(renderer.initialized).toBe(false);

      await renderer.initialize({ test: true });
      expect(renderer.initialized).toBe(true);

      await renderer.shutdown();
      expect(renderer.initialized).toBe(false);
    });

    it("should handle multiple initialization calls", async () => {
      await renderer.initialize();
      await renderer.initialize(); // Should not throw
      expect(renderer.initialized).toBe(true);
    });

    it("should handle multiple shutdown calls", async () => {
      await renderer.initialize();
      await renderer.shutdown();
      await renderer.shutdown(); // Should not throw
      expect(renderer.initialized).toBe(false);
    });

    it("should create snapshots", async () => {
      await renderer.initialize();

      const snapshot = renderer.createSnapshot(world, 42);
      expect(snapshot).toBeDefined();
      expect(snapshot.tick).toBe(42);
      expect(snapshot.dimensions).toEqual({ width: 10, height: 10 });
    });

    it("should throw when creating snapshot without initialization", () => {
      expect(() => renderer.createSnapshot(world, 1)).toThrow(
        "Renderer not initialized"
      );
    });

    it("should throw when rendering without initialization", async () => {
      const snapshot = WorldSnapshotCreator.createSnapshot(world, 1);
      const context = {
        tick: 1,
        deltaTime: 16,
        paused: false,
        zoom: 1.0,
        camera: { x: 0, y: 0 },
        viewport: { width: 800, height: 600 },
        metadata: {},
      };

      await expect(renderer.render(snapshot, context)).rejects.toThrow(
        "Renderer not initialized"
      );
    });

    it("should render successfully when initialized", async () => {
      await renderer.initialize();

      const snapshot = WorldSnapshotCreator.createSnapshot(world, 1);
      const context = {
        tick: 1,
        deltaTime: 16,
        paused: false,
        zoom: 1.0,
        camera: { x: 0, y: 0 },
        viewport: { width: 800, height: 600 },
        metadata: {},
      };

      await expect(renderer.render(snapshot, context)).resolves.not.toThrow();
    });

    it("should handle event subscription and emission", async () => {
      const events: any[] = [];
      const handler = (event: any) => events.push(event);

      renderer.on(RendererEventType.RENDER_START, handler);

      await renderer.initialize();

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe(RendererEventType.RENDER_START);
    });

    it("should handle event unsubscription", async () => {
      const events: any[] = [];
      const handler = (event: any) => events.push(event);

      renderer.on(RendererEventType.RENDER_START, handler);
      renderer.off(RendererEventType.RENDER_START, handler);

      await renderer.initialize();

      // Should not receive events after unsubscribing
      expect(events.length).toBe(0);
    });

    it("should handle configuration", () => {
      const config = { test: "value", number: 42 };
      renderer.configure(config);

      const retrievedConfig = renderer.getConfig();
      expect(retrievedConfig.test).toBe("value");
      expect(retrievedConfig.number).toBe(42);
    });

    it("should provide statistics", () => {
      const stats = renderer.getStatistics();
      expect(stats.initialized).toBe(false);
      expect(stats.eventHandlerCount).toBe(0);
      expect(stats.memoryUsage).toBe("minimal");
      expect(stats.performance).toBe("optimal");
    });
  });

  describe("RendererRegistry", () => {
    let registry: RendererRegistry;

    beforeEach(() => {
      registry = RendererRegistry.getInstance();
    });

    afterEach(async () => {
      await registry.reset();
    });

    it("should be a singleton", () => {
      const registry1 = RendererRegistry.getInstance();
      const registry2 = RendererRegistry.getInstance();
      expect(registry1).toBe(registry2);
    });

    it("should have null renderer registered by default", () => {
      expect(registry.isRegistered("null")).toBe(true);

      const registration = registry.getRegistration("null");
      expect(registration).toBeDefined();
      expect(registration!.name).toBe("Null Renderer");
    });

    it("should register and unregister renderers", () => {
      const testRegistration = {
        id: "test",
        name: "Test Renderer",
        factory: () => new NullRenderer(),
        defaultConfig: {},
        capabilities: {
          hasVisualOutput: true,
          supportsRealTime: false,
          canExport: true,
          supportsInteraction: true,
          maxWorldSize: { width: 1000, height: 1000 },
          exportFormats: ["png", "jpg"],
          metadata: {},
        },
      };

      registry.register(testRegistration);
      expect(registry.isRegistered("test")).toBe(true);

      const success = registry.unregister("test");
      expect(success).toBe(true);
      expect(registry.isRegistered("test")).toBe(false);
    });

    it("should throw when registering duplicate renderer", () => {
      const testRegistration = {
        id: "null", // Duplicate ID
        name: "Duplicate Renderer",
        factory: () => new NullRenderer(),
        defaultConfig: {},
        capabilities: {
          hasVisualOutput: false,
          supportsRealTime: true,
          canExport: false,
          supportsInteraction: false,
          maxWorldSize: { width: 100, height: 100 },
          exportFormats: [],
          metadata: {},
        },
      };

      expect(() => registry.register(testRegistration)).toThrow(
        "already registered"
      );
    });

    it("should create renderer instances", () => {
      const renderer = registry.createRenderer("null", { test: true });
      expect(renderer).toBeInstanceOf(NullRenderer);
      expect(renderer.id).toBe("null");
    });

    it("should throw when creating unknown renderer", () => {
      expect(() => registry.createRenderer("unknown")).toThrow(
        "not registered"
      );
    });

    it("should set and get active renderer", async () => {
      expect(registry.getActiveRenderer()).toBeNull();

      const renderer = await registry.setActiveRenderer("null");
      expect(renderer).toBeInstanceOf(NullRenderer);
      expect(renderer.initialized).toBe(true);
      expect(registry.getActiveRenderer()).toBe(renderer);
    });

    it("should shutdown previous renderer when setting new active renderer", async () => {
      const renderer1 = await registry.setActiveRenderer("null");
      expect(renderer1.initialized).toBe(true);

      const renderer2 = await registry.setActiveRenderer("null");
      expect(renderer1.initialized).toBe(false); // Previous renderer should be shut down
      expect(renderer2.initialized).toBe(true);
    });

    it("should get renderers by capability", () => {
      const visualRenderers = registry.getRenderersByCapability(
        "hasVisualOutput",
        true
      );
      expect(visualRenderers.length).toBe(0); // Only null renderer is registered

      const headlessRenderers = registry.getRenderersByCapability(
        "hasVisualOutput",
        false
      );
      expect(headlessRenderers.length).toBe(1);
      expect(headlessRenderers[0].id).toBe("null");
    });

    it("should get renderers by export format", () => {
      const pngRenderers = registry.getRenderersByExportFormat("png");
      expect(pngRenderers.length).toBe(0); // Null renderer doesn't support export

      const noExportRenderers =
        registry.getRenderersByExportFormat("nonexistent");
      expect(noExportRenderers.length).toBe(0);
    });

    it("should get renderers by world size", () => {
      const smallWorldRenderers = registry.getRenderersByWorldSize(100, 100);
      expect(smallWorldRenderers.length).toBe(1); // Null renderer supports any size

      const largeWorldRenderers = registry.getRenderersByWorldSize(
        10000,
        10000
      );
      expect(largeWorldRenderers.length).toBe(1); // Null renderer supports any size
    });

    it("should provide statistics", () => {
      const stats = registry.getStatistics();
      expect(stats.totalRegistered).toBe(1);
      expect(stats.activeRenderer).toBeNull();
      expect(stats.renderersByCapability.withVisualOutput).toBe(0);
      expect(stats.renderersByCapability.withRealTimeSupport).toBe(1);
      expect(stats.availableExportFormats).toEqual([]);
    });

    it("should validate renderer registrations", () => {
      const invalidRegistrations = [
        {
          id: "",
          name: "Test",
          factory: () => new NullRenderer(),
          defaultConfig: {},
          capabilities: {},
        },
        {
          id: "test",
          name: "",
          factory: () => new NullRenderer(),
          defaultConfig: {},
          capabilities: {},
        },
        {
          id: "test",
          name: "Test",
          factory: null,
          defaultConfig: {},
          capabilities: {},
        },
        {
          id: "test",
          name: "Test",
          factory: () => new NullRenderer(),
          defaultConfig: null,
          capabilities: {},
        },
        {
          id: "test",
          name: "Test",
          factory: () => new NullRenderer(),
          defaultConfig: {},
          capabilities: null,
        },
      ];

      for (const invalid of invalidRegistrations) {
        expect(() => registry.register(invalid as any)).toThrow();
      }
    });
  });

  describe("Utility Functions", () => {
    it("should create null renderer", () => {
      const renderer = createNullRenderer({ test: true });
      expect(renderer).toBeInstanceOf(NullRenderer);
      expect(renderer.id).toBe("null");
    });

    it("should get renderer registry", () => {
      const registry = getRendererRegistry();
      expect(registry).toBeInstanceOf(RendererRegistry);
    });
  });

  describe("Integration Tests", () => {
    it("should work with world and simulation", async () => {
      const registry = getRendererRegistry();
      const renderer = await registry.setActiveRenderer("null");

      // Create a snapshot
      const snapshot = renderer.createSnapshot(world, 1);
      expect(snapshot).toBeDefined();

      // Render the snapshot
      const context = {
        tick: 1,
        deltaTime: 16,
        paused: false,
        zoom: 1.0,
        camera: { x: 0, y: 0 },
        viewport: { width: 800, height: 600 },
        metadata: {},
      };

      await expect(renderer.render(snapshot, context)).resolves.not.toThrow();
    });

    it("should handle renderer switching", async () => {
      const registry = getRendererRegistry();

      const renderer1 = await registry.setActiveRenderer("null");
      expect(renderer1.initialized).toBe(true);

      const renderer2 = await registry.setActiveRenderer("null");
      expect(renderer1.initialized).toBe(false);
      expect(renderer2.initialized).toBe(true);
      expect(renderer1).not.toBe(renderer2); // Different instances
    });
  });
});
