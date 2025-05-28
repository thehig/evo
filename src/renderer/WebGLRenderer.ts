/**
 * WebGL Renderer Implementation using P5.js
 *
 * This renderer provides hardware-accelerated 2D rendering for the simulation
 * using P5.js WebGL capabilities. It supports real-time visualization with
 * camera controls, entity rendering, and terrain visualization.
 */

import p5 from "p5";
import {
  IRenderer,
  RendererCapabilities,
  WorldSnapshot,
  RenderContext,
  RendererEventType,
  RendererEvent,
  RendererEventHandler,
} from "./types";
import { TerrainType, ResourceType } from "../world/types";
import { createLogger } from "../utils/logger";

// Create a logger for the WebGL renderer
const webglLogger = createLogger("WebGLRenderer");

/**
 * Configuration options for the WebGL renderer
 */
export interface WebGLRendererConfig {
  /** Canvas container element ID */
  containerId?: string;

  /** Canvas width */
  width?: number;

  /** Canvas height */
  height?: number;

  /** Background color */
  backgroundColor?: string;

  /** Grid size for world cells */
  cellSize?: number;

  /** Whether to show grid lines */
  showGrid?: boolean;

  /** Whether to show entity labels */
  showLabels?: boolean;

  /** Maximum zoom level */
  maxZoom?: number;

  /** Minimum zoom level */
  minZoom?: number;

  /** Camera movement speed */
  cameraSpeed?: number;

  /** Whether to enable smooth camera movement */
  smoothCamera?: boolean;
}

/**
 * Default configuration for the WebGL renderer
 */
const DEFAULT_CONFIG: Required<WebGLRendererConfig> = {
  containerId: "webgl-renderer",
  width: 800,
  height: 600,
  backgroundColor: "#2c3e50",
  cellSize: 20,
  showGrid: true,
  showLabels: false,
  maxZoom: 5.0,
  minZoom: 0.1,
  cameraSpeed: 5.0,
  smoothCamera: true,
};

/**
 * Color scheme for different entity types and terrain
 */
const COLORS = {
  terrain: {
    [TerrainType.GRASS]: "#7cb342",
    [TerrainType.WATER]: "#1976d2",
    [TerrainType.MOUNTAIN]: "#5d4037",
    [TerrainType.DESERT]: "#fbc02d",
    [TerrainType.FOREST]: "#388e3c",
    [TerrainType.SWAMP]: "#4a5d23",
  },
  resources: {
    [ResourceType.FOOD]: "#4caf50",
    [ResourceType.WATER]: "#03a9f4",
    [ResourceType.SHELTER]: "#795548",
    [ResourceType.MINERAL]: "#607d8b",
  },
  entities: {
    creature: "#e91e63",
    entity: "#9c27b0",
    dead: "#424242",
  },
  ui: {
    grid: "#37474f",
    text: "#ffffff",
    background: "#263238",
  },
};

/**
 * WebGL Renderer using P5.js
 */
export class WebGLRenderer implements IRenderer {
  public readonly id = "webgl";
  public readonly name = "WebGL Renderer";

  private _initialized = false;
  private _config: Required<WebGLRendererConfig>;
  private _p5Instance: p5 | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _eventHandlers: Map<RendererEventType, RendererEventHandler[]> =
    new Map();

  // Camera state
  private _camera = { x: 0, y: 0 };
  private _targetCamera = { x: 0, y: 0 };
  private _zoom = 1.0;
  private _targetZoom = 1.0;

  // Input state
  private _keys: Set<string> = new Set();
  private _isMousePressed = false;
  private _lastMouseX = 0;
  private _lastMouseY = 0;

  // Rendering state
  private _lastSnapshot: WorldSnapshot | null = null;

  constructor(config: WebGLRendererConfig = {}) {
    this._config = { ...DEFAULT_CONFIG, ...config };

    // Initialize event handler maps
    Object.values(RendererEventType).forEach((eventType) => {
      this._eventHandlers.set(eventType, []);
    });
  }

  public get capabilities(): RendererCapabilities {
    return {
      hasVisualOutput: true,
      supportsRealTime: true,
      canExport: true,
      supportsInteraction: true,
      maxWorldSize: { width: 10000, height: 10000 },
      exportFormats: ["png", "jpg"],
      metadata: {
        library: "p5.js",
        renderer: "webgl",
        version: "1.0.0",
      },
    };
  }

  public get initialized(): boolean {
    return this._initialized;
  }

  /**
   * Initialize the WebGL renderer
   */
  public async initialize(config: Record<string, unknown> = {}): Promise<void> {
    if (this._initialized) {
      webglLogger.warn("Renderer already initialized");
      return;
    }

    try {
      // Update configuration
      this.configure(config);

      // Emit initialization start event
      this._emitEvent(RendererEventType.RENDER_START, {
        phase: "initialization",
      });

      // Create P5.js instance
      await this._createP5Instance();

      this._initialized = true;
      webglLogger.info("WebGL renderer initialized successfully");
    } catch (error) {
      webglLogger.error("Failed to initialize WebGL renderer:", error);
      this._emitEvent(RendererEventType.ERROR, { error });
      throw error;
    }
  }

  /**
   * Shutdown the renderer and clean up resources
   */
  public async shutdown(): Promise<void> {
    if (!this._initialized) {
      return;
    }

    try {
      // Remove P5.js instance
      if (this._p5Instance) {
        this._p5Instance.remove();
        this._p5Instance = null;
      }

      // Clear canvas reference
      this._canvas = null;

      // Clear event handlers
      this._eventHandlers.clear();

      this._initialized = false;
      webglLogger.info("WebGL renderer shutdown successfully");
    } catch (error) {
      webglLogger.error("Error during renderer shutdown:", error);
      this._emitEvent(RendererEventType.ERROR, { error });
    }
  }

  /**
   * Render a world snapshot
   */
  public async render(
    snapshot: WorldSnapshot,
    context: RenderContext
  ): Promise<void> {
    if (!this._initialized || !this._p5Instance) {
      throw new Error("Renderer not initialized");
    }

    try {
      this._emitEvent(RendererEventType.RENDER_START, { tick: context.tick });

      // Store current snapshot and context
      this._lastSnapshot = snapshot;

      // Update camera from context
      this._targetCamera.x = context.camera.x;
      this._targetCamera.y = context.camera.y;
      this._targetZoom = context.zoom;

      // The actual rendering happens in the P5.js draw loop
      // This method just updates the data to be rendered

      this._emitEvent(RendererEventType.RENDER_END, { tick: context.tick });
    } catch (error) {
      webglLogger.error("Error during rendering:", error);
      this._emitEvent(RendererEventType.ERROR, { error });
      throw error;
    }
  }

  /**
   * Create a snapshot from the current world state
   */
  public createSnapshot(_world: any, tick: number): WorldSnapshot {
    // This is a simplified implementation
    // In a real scenario, this would extract data from the world object
    return {
      timestamp: Date.now(),
      tick,
      dimensions: { width: 100, height: 100 },
      entities: [],
      creatures: [],
      cells: [],
      statistics: {
        totalEntities: 0,
        totalCreatures: 0,
        livingCreatures: 0,
        averageEnergy: 0,
        totalResources: {
          [ResourceType.FOOD]: 0,
          [ResourceType.WATER]: 0,
          [ResourceType.SHELTER]: 0,
          [ResourceType.MINERAL]: 0,
        },
      },
      metadata: {},
    };
  }

  /**
   * Export the current render to a file
   */
  public async export(
    format: string,
    _options: Record<string, unknown> = {}
  ): Promise<Blob> {
    if (!this._initialized || !this._p5Instance || !this._canvas) {
      throw new Error("Renderer not initialized");
    }

    try {
      this._emitEvent(RendererEventType.EXPORT_START, { format });

      // Use P5.js save functionality
      const dataURL = this._canvas.toDataURL(`image/${format}`);
      const response = await fetch(dataURL);
      const blob = await response.blob();

      this._emitEvent(RendererEventType.EXPORT_END, {
        format,
        size: blob.size,
      });

      return blob;
    } catch (error) {
      webglLogger.error("Error during export:", error);
      this._emitEvent(RendererEventType.ERROR, { error });
      throw error;
    }
  }

  /**
   * Subscribe to renderer events
   */
  public on(eventType: RendererEventType, handler: RendererEventHandler): void {
    const handlers = this._eventHandlers.get(eventType);
    if (handlers) {
      handlers.push(handler);
    }
  }

  /**
   * Unsubscribe from renderer events
   */
  public off(
    eventType: RendererEventType,
    handler: RendererEventHandler
  ): void {
    const handlers = this._eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Update renderer configuration
   */
  public configure(config: Record<string, unknown>): void {
    this._config = { ...this._config, ...config };
    webglLogger.debug("Renderer configuration updated:", config);
  }

  /**
   * Create the P5.js instance
   */
  private async _createP5Instance(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const sketch = (p: p5) => {
          p.setup = () => this._setup(p);
          p.draw = () => this._draw(p);
          p.keyPressed = () => this._keyPressed(p);
          p.keyReleased = () => this._keyReleased(p);
          p.mousePressed = () => this._mousePressed(p);
          p.mouseReleased = () => this._mouseReleased(p);
          p.mouseDragged = () => this._mouseDragged(p);
          p.mouseWheel = (event: any) => this._mouseWheel(p, event);
        };

        // Create P5.js instance - pass container element or undefined for body
        const container = document.getElementById(this._config.containerId);
        this._p5Instance = new p5(sketch, container || undefined);

        // Wait a bit for setup to complete
        setTimeout(() => resolve(), 100);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * P5.js setup function
   */
  private _setup(p: p5): void {
    // Create canvas with WebGL renderer
    const canvas = p.createCanvas(
      this._config.width,
      this._config.height,
      p.WEBGL
    );
    this._canvas = (canvas as any).canvas as HTMLCanvasElement;

    // Set background color
    p.background(this._config.backgroundColor);

    webglLogger.debug("P5.js setup completed");
  }

  /**
   * P5.js draw function
   */
  private _draw(p: p5): void {
    // Clear background
    p.background(this._config.backgroundColor);

    // Update camera position smoothly
    if (this._config.smoothCamera) {
      this._camera.x += (this._targetCamera.x - this._camera.x) * 0.1;
      this._camera.y += (this._targetCamera.y - this._camera.y) * 0.1;
      this._zoom += (this._targetZoom - this._zoom) * 0.1;
    } else {
      this._camera.x = this._targetCamera.x;
      this._camera.y = this._targetCamera.y;
      this._zoom = this._targetZoom;
    }

    // Handle keyboard input for camera movement
    this._handleCameraInput(p);

    // Apply camera transformations
    p.push();
    p.scale(this._zoom);
    p.translate(-this._camera.x, -this._camera.y);

    // Render the world if we have a snapshot
    if (this._lastSnapshot) {
      this._renderWorld(p, this._lastSnapshot);
    }

    p.pop();

    // Render UI elements
    this._renderUI(p);
  }

  /**
   * Handle camera input
   */
  private _handleCameraInput(_p: p5): void {
    const speed = this._config.cameraSpeed / this._zoom;

    if (this._keys.has("ArrowUp") || this._keys.has("w")) {
      this._targetCamera.y -= speed;
    }
    if (this._keys.has("ArrowDown") || this._keys.has("s")) {
      this._targetCamera.y += speed;
    }
    if (this._keys.has("ArrowLeft") || this._keys.has("a")) {
      this._targetCamera.x -= speed;
    }
    if (this._keys.has("ArrowRight") || this._keys.has("d")) {
      this._targetCamera.x += speed;
    }
  }

  /**
   * Render the world
   */
  private _renderWorld(p: p5, snapshot: WorldSnapshot): void {
    // Render terrain and cells
    this._renderTerrain(p, snapshot);

    // Render entities
    this._renderEntities(p, snapshot);

    // Render creatures
    this._renderCreatures(p, snapshot);

    // Render grid if enabled
    if (this._config.showGrid) {
      this._renderGrid(p, snapshot);
    }
  }

  /**
   * Render terrain
   */
  private _renderTerrain(p: p5, snapshot: WorldSnapshot): void {
    const cellSize = this._config.cellSize;

    snapshot.cells.forEach((cell) => {
      const color =
        COLORS.terrain[cell.terrain] || COLORS.terrain[TerrainType.GRASS];
      p.fill(color);
      p.noStroke();

      const x = cell.position.x * cellSize;
      const y = cell.position.y * cellSize;

      p.rect(x, y, cellSize, cellSize);

      // Render resources
      cell.resources.forEach((resource) => {
        const resourceColor =
          COLORS.resources[resource.type] ||
          COLORS.resources[ResourceType.FOOD];
        p.fill(resourceColor);
        p.circle(x + cellSize / 2, y + cellSize / 2, cellSize * 0.3);
      });
    });
  }

  /**
   * Render entities
   */
  private _renderEntities(p: p5, snapshot: WorldSnapshot): void {
    const cellSize = this._config.cellSize;

    snapshot.entities.forEach((entity) => {
      if (entity.type === "creature") return; // Creatures are rendered separately

      p.fill(COLORS.entities.entity);
      p.noStroke();

      const x = entity.position.x * cellSize + cellSize / 2;
      const y = entity.position.y * cellSize + cellSize / 2;

      p.circle(x, y, cellSize * 0.6);

      if (this._config.showLabels) {
        p.fill(COLORS.ui.text);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(entity.id.substring(0, 4), x, y + cellSize);
      }
    });
  }

  /**
   * Render creatures
   */
  private _renderCreatures(p: p5, snapshot: WorldSnapshot): void {
    const cellSize = this._config.cellSize;

    snapshot.creatures.forEach((creature) => {
      const color = creature.alive
        ? COLORS.entities.creature
        : COLORS.entities.dead;
      p.fill(color);
      p.noStroke();

      const x = creature.position.x * cellSize + cellSize / 2;
      const y = creature.position.y * cellSize + cellSize / 2;

      // Draw creature as a triangle pointing in movement direction
      p.push();
      p.translate(x, y);

      // Simple triangle shape
      p.beginShape();
      p.vertex(0, -cellSize * 0.4);
      p.vertex(-cellSize * 0.3, cellSize * 0.2);
      p.vertex(cellSize * 0.3, cellSize * 0.2);
      p.endShape(p.CLOSE);

      p.pop();

      // Show energy bar
      if (creature.alive) {
        const energyRatio = Math.max(0, Math.min(1, creature.energy / 100)); // Assume max energy is 100
        const barWidth = cellSize * 0.8;
        const barHeight = 3;

        p.fill(COLORS.ui.background);
        p.rect(x - barWidth / 2, y - cellSize * 0.6, barWidth, barHeight);

        p.fill(energyRatio > 0.3 ? "#4caf50" : "#f44336");
        p.rect(
          x - barWidth / 2,
          y - cellSize * 0.6,
          barWidth * energyRatio,
          barHeight
        );
      }

      if (this._config.showLabels) {
        p.fill(COLORS.ui.text);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(creature.id.substring(0, 4), x, y + cellSize);
      }
    });
  }

  /**
   * Render grid
   */
  private _renderGrid(p: p5, snapshot: WorldSnapshot): void {
    const cellSize = this._config.cellSize;
    const { width, height } = snapshot.dimensions;

    p.stroke(COLORS.ui.grid);
    p.strokeWeight(1);

    // Vertical lines
    for (let x = 0; x <= width; x++) {
      p.line(x * cellSize, 0, x * cellSize, height * cellSize);
    }

    // Horizontal lines
    for (let y = 0; y <= height; y++) {
      p.line(0, y * cellSize, width * cellSize, y * cellSize);
    }
  }

  /**
   * Render UI elements
   */
  private _renderUI(p: p5): void {
    // Reset transformations for UI
    p.resetMatrix();

    // Show camera info
    p.fill(COLORS.ui.text);
    p.textAlign(p.LEFT, p.TOP);
    p.text(
      `Camera: (${this._camera.x.toFixed(1)}, ${this._camera.y.toFixed(1)})`,
      10,
      10
    );
    p.text(`Zoom: ${this._zoom.toFixed(2)}x`, 10, 30);

    if (this._lastSnapshot) {
      p.text(`Tick: ${this._lastSnapshot.tick}`, 10, 50);
      p.text(
        `Creatures: ${this._lastSnapshot.statistics.livingCreatures}/${this._lastSnapshot.statistics.totalCreatures}`,
        10,
        70
      );
    }

    // Show controls
    p.textAlign(p.RIGHT, p.TOP);
    p.text("WASD/Arrows: Move Camera", this._config.width - 10, 10);
    p.text("Mouse Wheel: Zoom", this._config.width - 10, 30);
    p.text("Mouse Drag: Pan", this._config.width - 10, 50);
  }

  /**
   * Handle key press events
   */
  private _keyPressed(p: p5): boolean {
    this._keys.add(p.key);
    return false;
  }

  /**
   * Handle key release events
   */
  private _keyReleased(p: p5): boolean {
    this._keys.delete(p.key);
    return false;
  }

  /**
   * Handle mouse press events
   */
  private _mousePressed(p: p5): boolean {
    this._isMousePressed = true;
    this._lastMouseX = p.mouseX;
    this._lastMouseY = p.mouseY;
    return false;
  }

  /**
   * Handle mouse release events
   */
  private _mouseReleased(_p: p5): boolean {
    this._isMousePressed = false;
    return false;
  }

  /**
   * Handle mouse drag events
   */
  private _mouseDragged(p: p5): boolean {
    if (this._isMousePressed) {
      const deltaX = (p.mouseX - this._lastMouseX) / this._zoom;
      const deltaY = (p.mouseY - this._lastMouseY) / this._zoom;

      this._targetCamera.x -= deltaX;
      this._targetCamera.y -= deltaY;

      this._lastMouseX = p.mouseX;
      this._lastMouseY = p.mouseY;
    }
    return false;
  }

  /**
   * Handle mouse wheel events
   */
  private _mouseWheel(_p: p5, event: any): boolean {
    const zoomFactor = event.delta > 0 ? 0.9 : 1.1;
    this._targetZoom = Math.max(
      this._config.minZoom,
      Math.min(this._config.maxZoom, this._targetZoom * zoomFactor)
    );
    return false;
  }

  /**
   * Emit a renderer event
   */
  private _emitEvent(eventType: RendererEventType, data?: unknown): void {
    const event: RendererEvent = {
      type: eventType,
      timestamp: Date.now(),
      data,
    };

    const handlers = this._eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          webglLogger.error("Error in event handler:", error);
        }
      });
    }
  }
}
