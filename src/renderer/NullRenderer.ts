/**
 * Null renderer implementation for headless operation
 */

import { World } from "../world/World";
import {
  IRenderer,
  RendererCapabilities,
  WorldSnapshot,
  RenderContext,
  RendererEventType,
  RendererEventHandler,
  RendererEvent,
} from "./types";
import { WorldSnapshotCreator } from "./WorldSnapshot";

/**
 * Null renderer for headless operation
 *
 * This renderer doesn't produce any visual output but can still create
 * snapshots and handle basic renderer operations for testing and
 * headless simulation scenarios.
 */
export class NullRenderer implements IRenderer {
  private _initialized: boolean = false;
  private eventHandlers: Map<RendererEventType, Set<RendererEventHandler>> =
    new Map();
  private config: Record<string, unknown> = {};

  readonly id: string = "null";
  readonly name: string = "Null Renderer";

  readonly capabilities: RendererCapabilities = {
    hasVisualOutput: false,
    supportsRealTime: true,
    canExport: false,
    supportsInteraction: false,
    maxWorldSize: {
      width: Number.MAX_SAFE_INTEGER,
      height: Number.MAX_SAFE_INTEGER,
    },
    exportFormats: [],
    metadata: {
      description:
        "Headless renderer for testing and simulation without visual output",
      performance: "high",
      memoryUsage: "minimal",
    },
  };

  get initialized(): boolean {
    return this._initialized;
  }

  async initialize(config?: Record<string, unknown>): Promise<void> {
    if (this._initialized) {
      return;
    }

    this.config = { ...config };
    this._initialized = true;

    this.emit({
      type: RendererEventType.RENDER_START,
      timestamp: Date.now(),
      data: { renderer: this.id, config: this.config },
    });
  }

  async shutdown(): Promise<void> {
    if (!this._initialized) {
      return;
    }

    this._initialized = false;
    this.eventHandlers.clear();

    this.emit({
      type: RendererEventType.RENDER_END,
      timestamp: Date.now(),
      data: { renderer: this.id },
    });
  }

  async render(snapshot: WorldSnapshot, context: RenderContext): Promise<void> {
    if (!this._initialized) {
      throw new Error("Renderer not initialized");
    }

    // Null renderer doesn't actually render anything
    // But we can emit events for monitoring/debugging
    this.emit({
      type: RendererEventType.RENDER_START,
      timestamp: Date.now(),
      data: {
        tick: context.tick,
        entityCount: snapshot.entities.length,
        creatureCount: snapshot.creatures.length,
      },
    });

    // Simulate minimal processing time
    await new Promise((resolve) => setTimeout(resolve, 0));

    this.emit({
      type: RendererEventType.RENDER_END,
      timestamp: Date.now(),
      data: {
        tick: context.tick,
        renderTime: 0,
      },
    });
  }

  createSnapshot(world: unknown, tick: number): WorldSnapshot {
    if (!this._initialized) {
      throw new Error("Renderer not initialized");
    }

    if (!(world instanceof World)) {
      throw new Error("NullRenderer requires a World instance");
    }

    const snapshot = WorldSnapshotCreator.createSnapshot(world, tick);

    this.emit({
      type: RendererEventType.SNAPSHOT_CREATED,
      timestamp: Date.now(),
      data: {
        tick,
        snapshotSize: {
          entities: snapshot.entities.length,
          creatures: snapshot.creatures.length,
          cells: snapshot.cells.length,
        },
      },
    });

    return snapshot;
  }

  on(eventType: RendererEventType, handler: RendererEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
  }

  off(eventType: RendererEventType, handler: RendererEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventType);
      }
    }
  }

  configure(config: Record<string, unknown>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Emit a renderer event
   */
  private emit(event: RendererEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (error) {
          // Emit error event if handler fails
          const errorHandlers = this.eventHandlers.get(RendererEventType.ERROR);
          if (errorHandlers) {
            const errorEvent: RendererEvent = {
              type: RendererEventType.ERROR,
              timestamp: Date.now(),
              data: { error, originalEvent: event },
            };
            for (const errorHandler of errorHandlers) {
              try {
                errorHandler(errorEvent);
              } catch {
                // Ignore errors in error handlers to prevent infinite loops
              }
            }
          }
        }
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Record<string, unknown>> {
    return { ...this.config };
  }

  /**
   * Get renderer statistics
   */
  getStatistics() {
    return {
      initialized: this._initialized,
      eventHandlerCount: Array.from(this.eventHandlers.values()).reduce(
        (sum, handlers) => sum + handlers.size,
        0
      ),
      memoryUsage: "minimal",
      performance: "optimal",
    };
  }
}
