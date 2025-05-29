/**
 * UI Manager for Neural Evolution Simulator
 * Coordinates all user interface components and interactions
 */

import { WebGLRenderer, WebGLRendererConfig } from "../renderer/WebGLRenderer";
import { TrainingSimulator } from "../simulation/training-simulator";
import { WorldSimulator } from "../simulation/world-simulator";
import { WorldSnapshot } from "../renderer/WebGLRenderer";

export interface UIConfig {
  containerId: string;
  width?: number;
  height?: number;
  theme?: "light" | "dark";
  showStats?: boolean;
  showControls?: boolean;
  showLog?: boolean;
  autoResize?: boolean;
}

export interface UIState {
  isRunning: boolean;
  isPaused: boolean;
  currentMode: "training" | "world";
  selectedScenario?: string;
  generationCount: number;
  bestFitness: number;
  avgFitness: number;
  aliveCreatures: number;
  totalCreatures: number;
}

export class UIManager {
  private container: HTMLElement;
  private config: Required<UIConfig>;
  private state: UIState;
  private renderer: WebGLRenderer;
  private trainingSimulator: TrainingSimulator | null = null;
  private worldSimulator: WorldSimulator | null = null;

  // UI Elements
  private controlPanel: HTMLElement | null = null;
  private statsPanel: HTMLElement | null = null;
  private logPanel: HTMLElement | null = null;
  private rendererContainer: HTMLElement | null = null;

  // Event handlers
  private resizeObserver: ResizeObserver | null = null;

  constructor(config: UIConfig) {
    const containerElement = document.getElementById(config.containerId);
    if (!containerElement) {
      throw new Error(
        `Container element with ID '${config.containerId}' not found`
      );
    }

    this.container = containerElement;
    this.config = {
      containerId: config.containerId,
      width: config.width || 1200,
      height: config.height || 800,
      theme: config.theme || "dark",
      showStats: config.showStats !== false,
      showControls: config.showControls !== false,
      showLog: config.showLog !== false,
      autoResize: config.autoResize !== false,
    };

    this.state = {
      isRunning: false,
      isPaused: false,
      currentMode: "training",
      generationCount: 0,
      bestFitness: 0,
      avgFitness: 0,
      aliveCreatures: 0,
      totalCreatures: 0,
    };

    // Initialize renderer
    this.renderer = new WebGLRenderer({
      width: this.config.width * 0.7, // 70% of total width for renderer
      height: this.config.height,
      backgroundColor: this.config.theme === "dark" ? "#1a1a1a" : "#f0f0f0",
      showGrid: true,
      showLabels: true,
    });

    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Set up main container
    this.setupContainer();

    // Create UI layout
    this.createLayout();

    // Initialize renderer
    await this.initializeRenderer();

    // Set up event listeners
    this.setupEventListeners();

    // Apply theme
    this.applyTheme();

    console.log("UI Manager initialized successfully");
  }

  private setupContainer(): void {
    this.container.className = `evolution-ui-container theme-${this.config.theme}`;
    this.container.style.cssText = `
      width: ${this.config.width}px;
      height: ${this.config.height}px;
      display: flex;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg-primary);
      color: var(--text-primary);
      overflow: hidden;
      position: relative;
    `;
  }

  private createLayout(): void {
    this.container.innerHTML = `
      <div class="ui-main-content">
        <div class="ui-renderer-section">
          <div id="renderer-container" class="renderer-container"></div>
          <div class="renderer-overlay">
            <div class="ui-toolbar">
              <div class="mode-switcher">
                <button id="training-mode-btn" class="mode-btn active" data-mode="training">
                  🧬 Training Mode
                </button>
                <button id="world-mode-btn" class="mode-btn" data-mode="world">
                  🌍 World Mode
                </button>
              </div>
              <div class="simulation-controls">
                <button id="play-btn" class="control-btn" title="Start/Resume">
                  <span class="icon">▶️</span>
                </button>
                <button id="pause-btn" class="control-btn" title="Pause">
                  <span class="icon">⏸️</span>
                </button>
                <button id="reset-btn" class="control-btn" title="Reset">
                  <span class="icon">🔄</span>
                </button>
                <button id="step-btn" class="control-btn" title="Single Step">
                  <span class="icon">⏭️</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="ui-side-panel">
          ${this.config.showControls ? this.createControlPanelHTML() : ""}
          ${this.config.showStats ? this.createStatsPanelHTML() : ""}
          ${this.config.showLog ? this.createLogPanelHTML() : ""}
        </div>
      </div>
    `;

    // Get references to UI elements
    this.rendererContainer = document.getElementById("renderer-container");
    this.controlPanel = document.querySelector(".control-panel");
    this.statsPanel = document.querySelector(".stats-panel");
    this.logPanel = document.querySelector(".log-panel");
  }

  private createControlPanelHTML(): string {
    return `
      <div class="control-panel ui-panel">
        <h3 class="panel-title">🎛️ Controls</h3>
        
        <div class="control-group">
          <label for="scenario-select">Scenario:</label>
          <select id="scenario-select" class="ui-select">
            <option value="survival">🛡️ Survival Training</option>
            <option value="exploration">🗺️ World Exploration</option>
            <option value="energy">⚡ Energy Efficiency</option>
            <option value="movement">🏃 Movement Optimization</option>
            <option value="social">👥 Social Behavior</option>
            <option value="predator">🦁 Predator-Prey</option>
          </select>
        </div>
        
        <div class="control-group">
          <label for="population-size">Population Size:</label>
          <input type="range" id="population-size" class="ui-slider" 
                 min="10" max="200" value="50" />
          <span id="population-value">50</span>
        </div>
        
        <div class="control-group">
          <label for="mutation-rate">Mutation Rate:</label>
          <input type="range" id="mutation-rate" class="ui-slider" 
                 min="0.01" max="0.5" step="0.01" value="0.1" />
          <span id="mutation-value">0.1</span>
        </div>
        
        <div class="control-group">
          <label for="simulation-speed">Speed:</label>
          <input type="range" id="simulation-speed" class="ui-slider" 
                 min="0.1" max="5" step="0.1" value="1" />
          <span id="speed-value">1x</span>
        </div>
        
        <div class="control-group">
          <label>
            <input type="checkbox" id="auto-evolve" checked />
            Auto-evolve generations
          </label>
        </div>
        
        <div class="control-group">
          <label>
            <input type="checkbox" id="show-neural-activity" />
            Show neural activity
          </label>
        </div>
        
        <div class="control-actions">
          <button id="save-simulation" class="ui-button secondary">
            💾 Save Simulation
          </button>
          <button id="load-simulation" class="ui-button secondary">
            📁 Load Simulation
          </button>
          <button id="export-data" class="ui-button secondary">
            📊 Export Data
          </button>
        </div>
      </div>
    `;
  }

  private createStatsPanelHTML(): string {
    return `
      <div class="stats-panel ui-panel">
        <h3 class="panel-title">📊 Statistics</h3>
        
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value" id="generation-count">0</div>
            <div class="stat-label">Generation</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" id="best-fitness">0.00</div>
            <div class="stat-label">Best Fitness</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" id="avg-fitness">0.00</div>
            <div class="stat-label">Avg Fitness</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" id="alive-creatures">0</div>
            <div class="stat-label">Alive</div>
          </div>
        </div>
        
        <div class="progress-section">
          <div class="progress-label">Generation Progress</div>
          <div class="progress-bar">
            <div class="progress-fill" id="generation-progress"></div>
          </div>
          <div class="progress-text" id="progress-text">0/0 ticks</div>
        </div>
        
        <div class="fitness-chart">
          <div class="chart-header">Fitness Evolution</div>
          <canvas id="fitness-chart" width="280" height="120"></canvas>
        </div>
        
        <div class="best-creature-info">
          <h4>🏆 Best Creature</h4>
          <div class="creature-stats">
            <div class="creature-stat">
              <span class="label">Energy:</span>
              <span id="best-energy">100</span>
            </div>
            <div class="creature-stat">
              <span class="label">Age:</span>
              <span id="best-age">0</span>
            </div>
            <div class="creature-stat">
              <span class="label">Position:</span>
              <span id="best-position">(0, 0)</span>
            </div>
            <div class="creature-stat">
              <span class="label">Fitness:</span>
              <span id="best-fitness-detail">0.00</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private createLogPanelHTML(): string {
    return `
      <div class="log-panel ui-panel">
        <h3 class="panel-title">
          📝 Activity Log
          <button id="clear-log" class="clear-btn" title="Clear log">🗑️</button>
        </h3>
        
        <div class="log-filters">
          <button class="log-filter active" data-level="all">All</button>
          <button class="log-filter" data-level="info">Info</button>
          <button class="log-filter" data-level="warning">Warn</button>
          <button class="log-filter" data-level="error">Error</button>
        </div>
        
        <div class="log-content" id="log-content">
          <div class="log-entry info">
            <span class="log-time">${new Date().toLocaleTimeString()}</span>
            <span class="log-message">🎯 Neural Evolution Simulator ready</span>
          </div>
          <div class="log-entry info">
            <span class="log-time">${new Date().toLocaleTimeString()}</span>
            <span class="log-message">🔧 Select a scenario and start evolution</span>
          </div>
        </div>
      </div>
    `;
  }

  private async initializeRenderer(): Promise<void> {
    if (!this.rendererContainer) {
      throw new Error("Renderer container not found");
    }

    // Update renderer config with actual container
    await this.renderer.initialize({
      containerId: "renderer-container",
    });

    console.log("Renderer initialized");
  }

  private setupEventListeners(): void {
    // Mode switching
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;

      if (target.classList.contains("mode-btn")) {
        this.switchMode(target.dataset.mode as "training" | "world");
      }

      if (target.id === "play-btn") {
        this.startSimulation();
      }

      if (target.id === "pause-btn") {
        this.pauseSimulation();
      }

      if (target.id === "reset-btn") {
        this.resetSimulation();
      }

      if (target.id === "step-btn") {
        this.stepSimulation();
      }
    });

    // Control updates
    document.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;

      if (target.id === "population-size") {
        document.getElementById("population-value")!.textContent = target.value;
      }

      if (target.id === "mutation-rate") {
        document.getElementById("mutation-value")!.textContent = target.value;
      }

      if (target.id === "simulation-speed") {
        document.getElementById("speed-value")!.textContent =
          target.value + "x";
      }
    });

    // Resize handling
    if (this.config.autoResize) {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          this.handleResize(entry.contentRect);
        }
      });
      this.resizeObserver.observe(this.container);
    }

    // Window events
    window.addEventListener("beforeunload", () => {
      this.cleanup();
    });
  }

  private applyTheme(): void {
    const root = document.documentElement;

    if (this.config.theme === "dark") {
      root.style.setProperty("--bg-primary", "#1e1e1e");
      root.style.setProperty("--bg-secondary", "#2d2d2d");
      root.style.setProperty("--bg-panel", "#252525");
      root.style.setProperty("--text-primary", "#ffffff");
      root.style.setProperty("--text-secondary", "#cccccc");
      root.style.setProperty("--accent-color", "#0078d4");
      root.style.setProperty("--border-color", "#404040");
      root.style.setProperty("--success-color", "#4caf50");
      root.style.setProperty("--warning-color", "#ff9800");
      root.style.setProperty("--error-color", "#f44336");
    } else {
      root.style.setProperty("--bg-primary", "#ffffff");
      root.style.setProperty("--bg-secondary", "#f8f9fa");
      root.style.setProperty("--bg-panel", "#ffffff");
      root.style.setProperty("--text-primary", "#212529");
      root.style.setProperty("--text-secondary", "#6c757d");
      root.style.setProperty("--accent-color", "#0d6efd");
      root.style.setProperty("--border-color", "#dee2e6");
      root.style.setProperty("--success-color", "#198754");
      root.style.setProperty("--warning-color", "#fd7e14");
      root.style.setProperty("--error-color", "#dc3545");
    }

    // Inject CSS styles
    this.injectStyles();
  }

  private injectStyles(): void {
    const styleId = "evolution-ui-styles";
    if (document.getElementById(styleId)) {
      return; // Styles already injected
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .evolution-ui-container {
        --panel-width: 320px;
      }
      
      .ui-main-content {
        display: flex;
        width: 100%;
        height: 100%;
      }
      
      .ui-renderer-section {
        flex: 1;
        position: relative;
        background: var(--bg-secondary);
        border-right: 1px solid var(--border-color);
      }
      
      .renderer-container {
        width: 100%;
        height: 100%;
      }
      
      .renderer-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        pointer-events: none;
      }
      
      .ui-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
        border-radius: 0 0 12px 12px;
        margin: 0 16px 16px 16px;
        pointer-events: auto;
      }
      
      .mode-switcher {
        display: flex;
        gap: 8px;
      }
      
      .mode-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 14px;
        font-weight: 500;
      }
      
      .mode-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .mode-btn.active {
        background: var(--accent-color);
      }
      
      .simulation-controls {
        display: flex;
        gap: 8px;
      }
      
      .control-btn {
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      }
      
      .control-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.05);
      }
      
      .control-btn:active {
        transform: scale(0.95);
      }
      
      .ui-side-panel {
        width: var(--panel-width);
        background: var(--bg-primary);
        display: flex;
        flex-direction: column;
        overflow-y: auto;
      }
      
      .ui-panel {
        background: var(--bg-panel);
        border-bottom: 1px solid var(--border-color);
        padding: 16px;
      }
      
      .panel-title {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .control-group {
        margin-bottom: 16px;
      }
      
      .control-group label {
        display: block;
        margin-bottom: 6px;
        font-size: 14px;
        font-weight: 500;
        color: var(--text-secondary);
      }
      
      .ui-select, .ui-slider {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-size: 14px;
      }
      
      .ui-slider {
        padding: 0;
        height: 6px;
        background: var(--border-color);
        cursor: pointer;
      }
      
      .ui-slider::-webkit-slider-thumb {
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--accent-color);
        cursor: pointer;
      }
      
      .ui-button {
        padding: 10px 16px;
        border: none;
        border-radius: 6px;
        background: var(--accent-color);
        color: white;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
        width: 100%;
        margin-bottom: 8px;
      }
      
      .ui-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
      
      .ui-button.secondary {
        background: var(--bg-secondary);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
      }
      
      .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 20px;
      }
      
      .stat-item {
        background: var(--bg-secondary);
        padding: 12px;
        border-radius: 8px;
        text-align: center;
        border: 1px solid var(--border-color);
      }
      
      .stat-value {
        font-size: 20px;
        font-weight: 700;
        color: var(--accent-color);
        margin-bottom: 4px;
      }
      
      .stat-label {
        font-size: 12px;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .progress-section {
        margin-bottom: 20px;
      }
      
      .progress-label {
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 8px;
        color: var(--text-secondary);
      }
      
      .progress-bar {
        width: 100%;
        height: 8px;
        background: var(--border-color);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 6px;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--success-color), var(--accent-color));
        width: 0%;
        transition: width 0.3s ease;
      }
      
      .progress-text {
        font-size: 12px;
        color: var(--text-secondary);
        text-align: center;
      }
      
      .fitness-chart {
        margin-bottom: 20px;
      }
      
      .chart-header {
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 8px;
        color: var(--text-secondary);
      }
      
      #fitness-chart {
        width: 100%;
        border: 1px solid var(--border-color);
        border-radius: 6px;
      }
      
      .best-creature-info h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: var(--text-primary);
      }
      
      .creature-stats {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .creature-stat {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 8px;
        background: var(--bg-secondary);
        border-radius: 4px;
        border: 1px solid var(--border-color);
      }
      
      .creature-stat .label {
        font-size: 12px;
        color: var(--text-secondary);
      }
      
      .log-content {
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--bg-secondary);
      }
      
      .log-filters {
        display: flex;
        gap: 4px;
        margin-bottom: 12px;
      }
      
      .log-filter {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        background: var(--bg-secondary);
        color: var(--text-secondary);
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s ease;
      }
      
      .log-filter.active {
        background: var(--accent-color);
        color: white;
      }
      
      .log-entry {
        padding: 8px 12px;
        border-bottom: 1px solid var(--border-color);
        font-size: 13px;
        line-height: 1.4;
      }
      
      .log-entry:last-child {
        border-bottom: none;
      }
      
      .log-time {
        color: var(--text-secondary);
        font-size: 11px;
        margin-right: 8px;
      }
      
      .log-message {
        color: var(--text-primary);
      }
      
      .log-entry.warning .log-message {
        color: var(--warning-color);
      }
      
      .log-entry.error .log-message {
        color: var(--error-color);
      }
      
      .clear-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        font-size: 16px;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
      }
      
      .clear-btn:hover {
        background: var(--error-color);
        color: white;
      }
      
      /* Responsive design */
      @media (max-width: 1200px) {
        .evolution-ui-container {
          --panel-width: 280px;
        }
      }
      
      @media (max-width: 900px) {
        .ui-main-content {
          flex-direction: column;
        }
        
        .ui-side-panel {
          width: 100%;
          height: 300px;
          overflow-y: auto;
        }
        
        .ui-toolbar {
          flex-direction: column;
          gap: 12px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  // Public Methods

  public switchMode(mode: "training" | "world"): void {
    this.state.currentMode = mode;

    // Update UI
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelector(`[data-mode="${mode}"]`)?.classList.add("active");

    // Initialize appropriate simulator
    if (mode === "training") {
      this.initializeTrainingMode();
    } else {
      this.initializeWorldMode();
    }

    this.log(`Switched to ${mode} mode`, "info");
  }

  public startSimulation(): void {
    if (this.state.isPaused) {
      this.resumeSimulation();
      return;
    }

    this.state.isRunning = true;
    this.state.isPaused = false;

    // Start appropriate simulator
    if (this.state.currentMode === "training" && this.trainingSimulator) {
      this.trainingSimulator.start();
    } else if (this.state.currentMode === "world" && this.worldSimulator) {
      this.worldSimulator.start();
    }

    this.log("Simulation started", "info");
    this.updateControls();
  }

  public pauseSimulation(): void {
    this.state.isPaused = true;

    if (this.state.currentMode === "training" && this.trainingSimulator) {
      this.trainingSimulator.pause();
    } else if (this.state.currentMode === "world" && this.worldSimulator) {
      this.worldSimulator.pause();
    }

    this.log("Simulation paused", "info");
    this.updateControls();
  }

  public resumeSimulation(): void {
    this.state.isPaused = false;

    // Since pause() and resume() aren't available, we use start() to resume
    if (this.state.currentMode === "training" && this.trainingSimulator) {
      this.trainingSimulator.start();
    } else if (this.state.currentMode === "world" && this.worldSimulator) {
      this.worldSimulator.start();
    }

    this.log("Simulation resumed", "info");
    this.updateControls();
  }

  public resetSimulation(): void {
    this.state.isRunning = false;
    this.state.isPaused = false;
    this.state.generationCount = 0;
    this.state.bestFitness = 0;
    this.state.avgFitness = 0;
    this.state.aliveCreatures = 0;
    this.state.totalCreatures = 0;

    if (this.state.currentMode === "training" && this.trainingSimulator) {
      this.trainingSimulator.reset();
    } else if (this.state.currentMode === "world" && this.worldSimulator) {
      this.worldSimulator.reset();
    }

    this.updateStats();
    this.log("Simulation reset", "info");
    this.updateControls();
  }

  public stepSimulation(): void {
    if (this.state.currentMode === "training" && this.trainingSimulator) {
      this.trainingSimulator.step();
    } else if (this.state.currentMode === "world" && this.worldSimulator) {
      this.worldSimulator.step();
    }

    this.log("Single step executed", "info");
  }

  public updateStats(): void {
    // Update statistics display
    if (this.statsPanel) {
      const elements = {
        generationCount: document.getElementById("generation-count"),
        bestFitness: document.getElementById("best-fitness"),
        avgFitness: document.getElementById("avg-fitness"),
        aliveCreatures: document.getElementById("alive-creatures"),
      };

      if (elements.generationCount)
        elements.generationCount.textContent =
          this.state.generationCount.toString();
      if (elements.bestFitness)
        elements.bestFitness.textContent = this.state.bestFitness.toFixed(2);
      if (elements.avgFitness)
        elements.avgFitness.textContent = this.state.avgFitness.toFixed(2);
      if (elements.aliveCreatures)
        elements.aliveCreatures.textContent = `${this.state.aliveCreatures}/${this.state.totalCreatures}`;
    }
  }

  public log(
    message: string,
    level: "info" | "warning" | "error" = "info"
  ): void {
    if (!this.logPanel) return;

    const logContent = document.getElementById("log-content");
    if (!logContent) return;

    const entry = document.createElement("div");
    entry.className = `log-entry ${level}`;
    entry.innerHTML = `
      <span class="log-time">${new Date().toLocaleTimeString()}</span>
      <span class="log-message">${message}</span>
    `;

    logContent.appendChild(entry);
    logContent.scrollTop = logContent.scrollHeight;

    // Keep only last 100 entries
    while (logContent.children.length > 100) {
      logContent.removeChild(logContent.firstChild!);
    }
  }

  private initializeTrainingMode(): void {
    // Initialize training simulator if needed
    if (!this.trainingSimulator) {
      // Create basic training config
      const config = {
        maxTicks: 1000,
        ticksPerSecond: 60,
        geneticAlgorithm: {
          populationSize: 50,
          mutationRate: 0.1,
          crossoverRate: 0.7,
          elitismRate: 0.1,
          maxGenerations: 100,
        },
        scenario: {
          name: "survival",
          description: "Basic survival scenario",
          worldConfig: { width: 100, height: 100 },
          creatureConfig: {
            initialEnergy: 100,
            maxAge: 1000,
            reproductionThreshold: 80,
            mutationRate: 0.05,
          },
          neuralNetworkConfig: {
            inputSize: 8,
            hiddenSizes: [6, 4],
            outputSize: 4,
            activationFunction: "tanh",
          },
          fitnessFunction: (creature: any) =>
            creature.energy + creature.age * 0.1,
          maxSimulationTicks: 1000,
        },
        autoAdvanceGenerations: true,
        saveInterval: 10,
      };

      this.trainingSimulator = new TrainingSimulator(config);
    }

    this.log("Training mode initialized", "info");
  }

  private initializeWorldMode(): void {
    // Initialize world simulator if needed
    if (!this.worldSimulator) {
      // Create basic world config
      const config = {
        maxTicks: 10000,
        ticksPerSecond: 60,
        world: {
          width: 100,
          height: 100,
          seed: Date.now(),
        },
        creatures: {
          populationSize: 30,
          initialEnergy: 100,
          maxAge: 2000,
        },
        environment: {
          foodSpawnRate: 0.01,
          obstacleRatio: 0.1,
        },
      };

      this.worldSimulator = new WorldSimulator(config);
    }

    this.log("World mode initialized", "info");
  }

  private updateControls(): void {
    const playBtn = document.getElementById("play-btn");
    const pauseBtn = document.getElementById("pause-btn");

    if (playBtn && pauseBtn) {
      if (this.state.isRunning && !this.state.isPaused) {
        playBtn.style.opacity = "0.5";
        pauseBtn.style.opacity = "1";
      } else {
        playBtn.style.opacity = "1";
        pauseBtn.style.opacity = "0.5";
      }
    }
  }

  private handleResize(rect: DOMRectReadOnly): void {
    this.config.width = rect.width;
    this.config.height = rect.height;

    // Update renderer size
    if (this.renderer && this.renderer.initialized) {
      this.renderer.configure({
        width: this.config.width * 0.7,
        height: this.config.height,
      });
    }
  }

  public async render(snapshot: WorldSnapshot): Promise<void> {
    if (this.renderer && this.renderer.initialized) {
      await this.renderer.render(snapshot, {
        camera: { x: 0, y: 0 },
        viewport: {
          width: this.config.width * 0.7,
          height: this.config.height,
        },
      });
    }
  }

  public cleanup(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.renderer) {
      this.renderer.shutdown();
    }

    if (this.trainingSimulator) {
      this.trainingSimulator.stop();
    }

    if (this.worldSimulator) {
      this.worldSimulator.stop();
    }
  }

  // Getters
  public get isRunning(): boolean {
    return this.state.isRunning;
  }
  public get currentMode(): "training" | "world" {
    return this.state.currentMode;
  }
  public get stats(): Omit<UIState, "isRunning" | "isPaused" | "currentMode"> {
    return {
      selectedScenario: this.state.selectedScenario,
      generationCount: this.state.generationCount,
      bestFitness: this.state.bestFitness,
      avgFitness: this.state.avgFitness,
      aliveCreatures: this.state.aliveCreatures,
      totalCreatures: this.state.totalCreatures,
    };
  }
}
