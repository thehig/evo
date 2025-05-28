/**
 * Renderer registry for managing multiple renderer implementations
 */

import {
  IRenderer,
  RendererRegistration,
  RendererFactory,
  RendererCapabilities,
} from "./types";
import { NullRenderer } from "./NullRenderer";

/**
 * Registry for managing renderer implementations
 */
export class RendererRegistry {
  private static instance: RendererRegistry | null = null;
  private registrations: Map<string, RendererRegistration> = new Map();
  private activeRenderer: IRenderer | null = null;

  private constructor() {
    // Register built-in renderers
    this.registerBuiltInRenderers();
  }

  /**
   * Get the singleton instance of the renderer registry
   */
  static getInstance(): RendererRegistry {
    if (!RendererRegistry.instance) {
      RendererRegistry.instance = new RendererRegistry();
    }
    return RendererRegistry.instance;
  }

  /**
   * Register a new renderer
   */
  register(registration: RendererRegistration): void {
    if (this.registrations.has(registration.id)) {
      throw new Error(
        `Renderer with ID '${registration.id}' is already registered`
      );
    }

    // Validate registration
    this.validateRegistration(registration);

    this.registrations.set(registration.id, registration);
  }

  /**
   * Unregister a renderer
   */
  unregister(rendererId: string): boolean {
    if (this.activeRenderer && this.activeRenderer.id === rendererId) {
      throw new Error(
        `Cannot unregister active renderer '${rendererId}'. Switch to another renderer first.`
      );
    }

    return this.registrations.delete(rendererId);
  }

  /**
   * Get a list of all registered renderers
   */
  getRegisteredRenderers(): RendererRegistration[] {
    return Array.from(this.registrations.values());
  }

  /**
   * Get a specific renderer registration
   */
  getRegistration(rendererId: string): RendererRegistration | undefined {
    return this.registrations.get(rendererId);
  }

  /**
   * Create a renderer instance
   */
  createRenderer(
    rendererId: string,
    config?: Record<string, unknown>
  ): IRenderer {
    const registration = this.registrations.get(rendererId);
    if (!registration) {
      throw new Error(`Renderer '${rendererId}' is not registered`);
    }

    const mergedConfig = {
      ...registration.defaultConfig,
      ...config,
    };

    return registration.factory(mergedConfig);
  }

  /**
   * Set the active renderer
   */
  async setActiveRenderer(
    rendererId: string,
    config?: Record<string, unknown>
  ): Promise<IRenderer> {
    // Shutdown current active renderer if any
    if (this.activeRenderer) {
      await this.activeRenderer.shutdown();
    }

    // Create and initialize new renderer
    const renderer = this.createRenderer(rendererId, config);
    await renderer.initialize(config);

    this.activeRenderer = renderer;
    return renderer;
  }

  /**
   * Get the currently active renderer
   */
  getActiveRenderer(): IRenderer | null {
    return this.activeRenderer;
  }

  /**
   * Check if a renderer is registered
   */
  isRegistered(rendererId: string): boolean {
    return this.registrations.has(rendererId);
  }

  /**
   * Get renderers by capability
   */
  getRenderersByCapability(
    capability: keyof RendererCapabilities,
    value: boolean
  ): RendererRegistration[] {
    return Array.from(this.registrations.values()).filter(
      (registration) => registration.capabilities[capability] === value
    );
  }

  /**
   * Get renderers that support a specific export format
   */
  getRenderersByExportFormat(format: string): RendererRegistration[] {
    return Array.from(this.registrations.values()).filter((registration) =>
      registration.capabilities.exportFormats.includes(format)
    );
  }

  /**
   * Get renderers that can handle a specific world size
   */
  getRenderersByWorldSize(
    width: number,
    height: number
  ): RendererRegistration[] {
    return Array.from(this.registrations.values()).filter(
      (registration) =>
        registration.capabilities.maxWorldSize.width >= width &&
        registration.capabilities.maxWorldSize.height >= height
    );
  }

  /**
   * Shutdown the active renderer and clear the registry
   */
  async shutdown(): Promise<void> {
    if (this.activeRenderer) {
      await this.activeRenderer.shutdown();
      this.activeRenderer = null;
    }
  }

  /**
   * Reset the registry to default state
   */
  async reset(): Promise<void> {
    await this.shutdown();
    this.registrations.clear();
    this.registerBuiltInRenderers();
  }

  /**
   * Register built-in renderers
   */
  private registerBuiltInRenderers(): void {
    // Register the null renderer
    this.register({
      id: "null",
      name: "Null Renderer",
      factory: (config) => new NullRenderer(),
      defaultConfig: {
        enableEvents: true,
        logLevel: "info",
      },
      capabilities: {
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
      },
    });
  }

  /**
   * Validate a renderer registration
   */
  private validateRegistration(registration: RendererRegistration): void {
    if (!registration.id || typeof registration.id !== "string") {
      throw new Error("Renderer registration must have a valid string ID");
    }

    if (!registration.name || typeof registration.name !== "string") {
      throw new Error("Renderer registration must have a valid string name");
    }

    if (!registration.factory || typeof registration.factory !== "function") {
      throw new Error(
        "Renderer registration must have a valid factory function"
      );
    }

    if (
      !registration.capabilities ||
      typeof registration.capabilities !== "object"
    ) {
      throw new Error("Renderer registration must have valid capabilities");
    }

    if (
      !registration.defaultConfig ||
      typeof registration.defaultConfig !== "object"
    ) {
      throw new Error(
        "Renderer registration must have valid default configuration"
      );
    }

    // Validate capabilities structure
    const caps = registration.capabilities;
    if (typeof caps.hasVisualOutput !== "boolean") {
      throw new Error(
        "Renderer capabilities must specify hasVisualOutput as boolean"
      );
    }

    if (typeof caps.supportsRealTime !== "boolean") {
      throw new Error(
        "Renderer capabilities must specify supportsRealTime as boolean"
      );
    }

    if (typeof caps.canExport !== "boolean") {
      throw new Error(
        "Renderer capabilities must specify canExport as boolean"
      );
    }

    if (typeof caps.supportsInteraction !== "boolean") {
      throw new Error(
        "Renderer capabilities must specify supportsInteraction as boolean"
      );
    }

    if (
      !caps.maxWorldSize ||
      typeof caps.maxWorldSize.width !== "number" ||
      typeof caps.maxWorldSize.height !== "number"
    ) {
      throw new Error("Renderer capabilities must specify valid maxWorldSize");
    }

    if (!Array.isArray(caps.exportFormats)) {
      throw new Error(
        "Renderer capabilities must specify exportFormats as array"
      );
    }
  }

  /**
   * Get registry statistics
   */
  getStatistics() {
    const registrations = Array.from(this.registrations.values());

    return {
      totalRegistered: registrations.length,
      activeRenderer: this.activeRenderer?.id || null,
      renderersByCapability: {
        withVisualOutput: registrations.filter(
          (r) => r.capabilities.hasVisualOutput
        ).length,
        withRealTimeSupport: registrations.filter(
          (r) => r.capabilities.supportsRealTime
        ).length,
        withExportSupport: registrations.filter((r) => r.capabilities.canExport)
          .length,
        withInteractionSupport: registrations.filter(
          (r) => r.capabilities.supportsInteraction
        ).length,
      },
      availableExportFormats: Array.from(
        new Set(registrations.flatMap((r) => r.capabilities.exportFormats))
      ),
    };
  }
}
