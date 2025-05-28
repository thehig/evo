/**
 * Creature implementation
 *
 * This module implements the basic Creature class with neural network integration,
 * energy system, and action processing.
 */

import { ICreature } from "./interfaces";
import { INeuralNetwork } from "../neural/types";
import { SensorySystem } from "./sensory-system";
import {
  CreatureAction,
  ISensoryData,
  ICreatureState,
  ICreatureConfig,
  DEFAULT_CREATURE_CONFIG,
  EntityType,
} from "./creature-types";

/**
 * Basic creature implementation with neural network control
 */
export class Creature implements ICreature {
  private _id: string;
  private _position: { x: number; y: number };
  private _active: boolean = true;
  private _energy: number;
  private _age: number = 0;
  private _alive: boolean = true;
  private _brain: INeuralNetwork;
  private _genome: unknown; // Will be implemented with genetic system
  private _config: ICreatureConfig;
  private _state: ICreatureState;
  private _lastSensoryData: ISensoryData | null = null;
  private _lastOutput: number[] | null = null;
  private _sensorySystem: SensorySystem | null = null;

  constructor(
    id: string,
    brain: INeuralNetwork,
    initialPosition: { x: number; y: number },
    config: Partial<ICreatureConfig> = {}
  ) {
    this._id = id;
    this._brain = brain;
    this._position = { ...initialPosition };
    this._config = { ...DEFAULT_CREATURE_CONFIG, ...config };
    this._energy = this._config.initialEnergy;
    this._genome = null; // Placeholder for genetic system

    // Initialize internal state with memory arrays
    this._state = {
      hunger: 0.0,
      lastAction: null,
      ticksSinceLastAction: 0,
      energyHistory: [this._energy],
      actionHistory: [],
      encounterHistory: [],
      signalHistory: [],
      broadcastSignal: 0.0,
    };
  }

  /**
   * Set the sensory system (called when creature is added to world)
   */
  setSensorySystem(sensorySystem: SensorySystem): void {
    this._sensorySystem = sensorySystem;
  }

  // IEntity implementation
  get id(): string {
    return this._id;
  }

  get position(): { x: number; y: number } {
    return { ...this._position };
  }

  set position(value: { x: number; y: number }) {
    this._position = { ...value };
  }

  get active(): boolean {
    return this._active;
  }

  set active(value: boolean) {
    this._active = value;
  }

  // ICreature implementation
  get genome(): unknown {
    return this._genome;
  }

  get brain(): INeuralNetwork {
    return this._brain;
  }

  get energy(): number {
    return this._energy;
  }

  set energy(value: number) {
    this._energy = Math.max(0, Math.min(this._config.maxEnergy, value));

    // Update energy history
    this._state.energyHistory.push(this._energy);
    if (
      this._state.energyHistory.length > this._config.memory.energyHistorySize
    ) {
      this._state.energyHistory.shift();
    }

    // Update hunger based on energy level
    this._state.hunger = Math.max(0, 1 - this._energy);

    // Check if creature dies from energy depletion
    if (this._energy <= 0) {
      this._alive = false;
    }
  }

  get age(): number {
    return this._age;
  }

  get alive(): boolean {
    return this._alive && this._energy > 0 && this._age < this._config.maxAge;
  }

  /**
   * Update the creature for one simulation tick
   */
  update(_deltaTime: number): void {
    if (!this._active || !this._alive) {
      return;
    }

    // Age the creature
    this._age += 1;

    // Apply metabolic cost
    this.energy -= this._config.energyCosts.metabolism;

    // Update hunger based on energy level
    this._state.hunger = Math.max(0, 1.0 - this._energy);

    // Update action timing
    this._state.ticksSinceLastAction += 1;

    // Check if still alive after aging and metabolism
    if (!this.alive) {
      this._alive = false;
      return;
    }

    // Process neural network and perform actions
    this.think();
    this.act();
  }

  /**
   * Process sensory input and make decisions using neural network
   */
  think(): void {
    if (!this._alive || !this._sensorySystem) {
      return;
    }

    // Gather sensory data using the sensory system
    const sensoryData = this._sensorySystem.gatherSensoryData(
      this,
      this._config.vision,
      this._config.memory,
      this._config.signalRange,
      this._state.energyHistory,
      this._state.actionHistory,
      this._state.encounterHistory,
      this._state.signalHistory,
      this._state.broadcastSignal
    );

    this._lastSensoryData = sensoryData;

    // Convert sensory data to neural network input with memory configuration for consistent sizing
    const inputs = this._sensorySystem.convertToNeuralInputs(
      sensoryData,
      this._config.memory
    );

    // Process through neural network
    this._lastOutput = this._brain.process(inputs);
  }

  /**
   * Execute actions based on neural network output
   */
  act(): void {
    if (!this._alive || !this._lastOutput) {
      return;
    }

    // Determine action from neural network output
    const action = this.outputToAction(this._lastOutput);

    // Execute the action
    this.executeAction(action);

    // Update state
    this._state.lastAction = action;
    this._state.ticksSinceLastAction = 0;

    // Update action history
    this._state.actionHistory.push(action);
    if (
      this._state.actionHistory.length > this._config.memory.actionHistorySize
    ) {
      this._state.actionHistory.shift();
    }

    // Update encounter history based on vision
    if (this._lastSensoryData) {
      for (const visionCell of this._lastSensoryData.vision) {
        if (visionCell.entityType !== EntityType.EMPTY) {
          this._state.encounterHistory.push(visionCell.entityType);
        }
      }

      // Trim encounter history
      if (
        this._state.encounterHistory.length >
        this._config.memory.encounterHistorySize
      ) {
        this._state.encounterHistory = this._state.encounterHistory.slice(
          -this._config.memory.encounterHistorySize
        );
      }
    }

    // Update signal history (placeholder for now)
    this._state.signalHistory.push(this._state.broadcastSignal);
    if (
      this._state.signalHistory.length > this._config.memory.signalHistorySize
    ) {
      this._state.signalHistory.shift();
    }
  }

  /**
   * Reproduce with another creature (placeholder implementation)
   */
  reproduce(_partner: ICreature): ICreature | null {
    // Placeholder - will be implemented with genetic system
    return null;
  }

  /**
   * Clean up resources when creature is destroyed
   */
  destroy(): void {
    this._active = false;
    this._alive = false;
  }

  /**
   * Get current creature configuration
   */
  getConfig(): ICreatureConfig {
    return { ...this._config };
  }

  /**
   * Get current internal state
   */
  getState(): ICreatureState {
    return { ...this._state };
  }

  /**
   * Get last sensory data (for testing/debugging)
   */
  getLastSensoryData(): ISensoryData | null {
    return this._lastSensoryData ? { ...this._lastSensoryData } : null;
  }

  /**
   * Get last neural network output (for testing/debugging)
   */
  getLastOutput(): number[] | null {
    return this._lastOutput ? [...this._lastOutput] : null;
  }

  /**
   * Set broadcast signal strength
   */
  setBroadcastSignal(signal: number): void {
    this._state.broadcastSignal = Math.max(0, Math.min(1, signal));
  }

  /**
   * Get current broadcast signal
   */
  getBroadcastSignal(): number {
    return this._state.broadcastSignal;
  }

  /**
   * Convert neural network output to creature action
   */
  private outputToAction(output: number[]): CreatureAction {
    if (output.length === 0) {
      return CreatureAction.REST;
    }

    // Find the output with the highest activation
    let maxIndex = 0;
    let maxValue = output[0];

    for (let i = 1; i < output.length; i++) {
      if (output[i] > maxValue) {
        maxValue = output[i];
        maxIndex = i;
      }
    }

    // Map output index to action
    const actions = [
      CreatureAction.MOVE_NORTH,
      CreatureAction.MOVE_SOUTH,
      CreatureAction.MOVE_EAST,
      CreatureAction.MOVE_WEST,
      CreatureAction.REST,
    ];

    return actions[maxIndex % actions.length];
  }

  /**
   * Execute a specific action
   */
  private executeAction(action: CreatureAction): void {
    switch (action) {
      case CreatureAction.MOVE_NORTH:
        this.move(0, -1);
        this.energy -= this._config.energyCosts.movement;
        break;

      case CreatureAction.MOVE_SOUTH:
        this.move(0, 1);
        this.energy -= this._config.energyCosts.movement;
        break;

      case CreatureAction.MOVE_EAST:
        this.move(1, 0);
        this.energy -= this._config.energyCosts.movement;
        break;

      case CreatureAction.MOVE_WEST:
        this.move(-1, 0);
        this.energy -= this._config.energyCosts.movement;
        break;

      case CreatureAction.REST:
        // Resting restores energy (negative cost)
        this.energy -= this._config.energyCosts.rest;
        break;

      default:
        // Unknown action, default to rest
        this.energy -= this._config.energyCosts.rest;
        break;
    }
  }

  /**
   * Move the creature by the specified offset
   */
  private move(dx: number, dy: number): void {
    const newX = this._position.x + dx;
    const newY = this._position.y + dy;

    // Clamp to world boundaries
    this._position.x = Math.max(
      0,
      Math.min(this._config.worldDimensions.width - 1, newX)
    );
    this._position.y = Math.max(
      0,
      Math.min(this._config.worldDimensions.height - 1, newY)
    );
  }
}
