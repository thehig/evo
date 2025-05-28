import {
  ISimulationEngine,
  ISimulationConfig,
  IWorld,
  IEventSystem,
  IRandom,
  SimulationState,
} from "./interfaces";
import { EventSystem, SimulationEvents } from "./events";
import { Random } from "./random";
import { createLogger } from "../utils/logger";

// Create a logger for the simulation engine
const simulationLogger = createLogger("SimulationEngine");

/**
 * Default simulation configuration
 */
const DEFAULT_CONFIG: ISimulationConfig = {
  tickRate: 60, // 60 ticks per second
  seed: Date.now(),
  maxTicks: 0, // unlimited
  pauseOnError: true,
};

/**
 * Core simulation engine implementation
 *
 * Provides the main simulation loop with tick-based processing,
 * deterministic behavior, and event-driven architecture.
 */
export abstract class SimulationEngine implements ISimulationEngine {
  private _state: SimulationState = SimulationState.STOPPED;
  private _config: ISimulationConfig;
  private _currentTick: number = 0;
  private _currentTime: number = 0;
  private _lastTickTime: number = 0;
  private _tickInterval?: NodeJS.Timeout;
  private _events: IEventSystem;
  private _random: IRandom;

  constructor(config: Partial<ISimulationConfig> = {}) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._events = new EventSystem();
    this._random = new Random(this._config.seed);
  }

  // Abstract properties that must be implemented by subclasses
  abstract get world(): IWorld;

  // Getters
  get state(): SimulationState {
    return this._state;
  }

  get config(): ISimulationConfig {
    return { ...this._config };
  }

  get events(): IEventSystem {
    return this._events;
  }

  get currentTick(): number {
    return this._currentTick;
  }

  get currentTime(): number {
    return this._currentTime;
  }

  get random(): IRandom {
    return this._random;
  }

  /**
   * Start the simulation
   */
  start(): void {
    if (this._state === SimulationState.RUNNING) {
      return; // Already running
    }

    this._state = SimulationState.RUNNING;
    this._lastTickTime = performance.now();

    // Start the tick loop
    this._startTickLoop();

    // Emit start event
    this._events.emit(
      SimulationEvents.simulationStarted(this._currentTick, this._currentTime)
    );
  }

  /**
   * Pause the simulation
   */
  pause(): void {
    if (this._state !== SimulationState.RUNNING) {
      return; // Not running
    }

    this._state = SimulationState.PAUSED;
    this._stopTickLoop();

    // Emit pause event
    this._events.emit(
      SimulationEvents.simulationPaused(this._currentTick, this._currentTime)
    );
  }

  /**
   * Stop the simulation
   */
  stop(): void {
    if (this._state === SimulationState.STOPPED) {
      return; // Already stopped
    }

    this._state = SimulationState.STOPPED;
    this._stopTickLoop();

    // Emit stop event
    this._events.emit(
      SimulationEvents.simulationStopped(this._currentTick, this._currentTime)
    );
  }

  /**
   * Reset the simulation to initial state
   */
  reset(): void {
    const wasRunning = this._state === SimulationState.RUNNING;

    // Stop if running
    if (wasRunning) {
      this.stop();
    }

    // Reset state
    this._currentTick = 0;
    this._currentTime = 0;
    this._lastTickTime = 0;

    // Reset random generator
    this._random.setSeed(this._config.seed!);

    // Reset world
    this.world.reset();

    // Emit reset event before clearing events
    this._events.emit(
      SimulationEvents.simulationReset(this._currentTick, this._currentTime)
    );

    // Clear events
    this._events.clear();

    // Restart if it was running
    if (wasRunning) {
      this.start();
    }
  }

  /**
   * Step the simulation forward by one tick
   */
  step(): void {
    const currentTime = performance.now();
    const deltaTime =
      this._state === SimulationState.RUNNING
        ? currentTime - this._lastTickTime
        : 1000 / this._config.tickRate; // Use target delta time when stepping manually

    try {
      this._processTick(deltaTime);
    } catch (error) {
      if (this._config.pauseOnError) {
        this.pause();
      }
      throw error;
    }

    this._lastTickTime = currentTime;
  }

  /**
   * Update simulation configuration
   */
  configure(config: Partial<ISimulationConfig>): void {
    const oldConfig = this._config;
    this._config = { ...this._config, ...config };

    // If seed changed, update random generator
    if (config.seed !== undefined && config.seed !== oldConfig.seed) {
      this._random.setSeed(config.seed);
    }

    // If tick rate changed and simulation is running, restart tick loop
    if (
      config.tickRate !== undefined &&
      config.tickRate !== oldConfig.tickRate &&
      this._state === SimulationState.RUNNING
    ) {
      this._stopTickLoop();
      this._startTickLoop();
    }
  }

  /**
   * Start the tick loop based on configured tick rate
   */
  private _startTickLoop(): void {
    const tickInterval = 1000 / this._config.tickRate;
    this._tickInterval = setInterval(() => {
      if (this._state === SimulationState.RUNNING) {
        try {
          this.step();
        } catch (error) {
          simulationLogger.error("Error during simulation tick:", error);
          if (this._config.pauseOnError) {
            this.pause();
          }
        }
      }
    }, tickInterval);
  }

  /**
   * Stop the tick loop
   */
  private _stopTickLoop(): void {
    if (this._tickInterval) {
      clearInterval(this._tickInterval);
      this._tickInterval = undefined;
    }
  }

  /**
   * Process a single simulation tick
   */
  private _processTick(deltaTime: number): void {
    // Check if we've reached max ticks
    if (
      this._config.maxTicks &&
      this._config.maxTicks > 0 &&
      this._currentTick >= this._config.maxTicks
    ) {
      this.stop();
      return;
    }

    // Update current time
    this._currentTime += deltaTime;

    // Emit tick event
    this._events.emit(
      SimulationEvents.tick(this._currentTick, this._currentTime, deltaTime)
    );

    // Update the world
    this.world.update(deltaTime);

    // Increment tick counter
    this._currentTick++;
  }
}
