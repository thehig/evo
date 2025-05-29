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
    // Ensure value is a valid number
    if (isNaN(value) || !isFinite(value)) {
      console.warn(
        `Invalid energy value ${value} for creature ${this._id}, setting to 0`
      );
      value = 0;
    }

    this._energy = Math.max(0, Math.min(this._config.maxEnergy, value));

    // Update energy history
    this._state.energyHistory.push(this._energy);
    if (
      this._state.energyHistory.length > this._config.memory.energyHistorySize
    ) {
      this._state.energyHistory.shift();
    }

    // Update hunger based on energy level
    const energyRatio = this._energy / this._config.maxEnergy;
    this._state.hunger = Math.max(0, Math.min(1, 1 - energyRatio));

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
   * Update creature state each tick
   */
  update(_deltaTime: number): void {
    if (!this._active || !this._alive) {
      return;
    }

    // Age the creature
    this._age += 1;

    // Apply metabolic cost
    this.energy -= this._config.energyCosts.metabolism;

    // Update energy history
    this._state.energyHistory.push(this._energy);
    if (
      this._state.energyHistory.length > this._config.memory.energyHistorySize
    ) {
      this._state.energyHistory.shift();
    }

    // Update hunger based on energy level
    const energyRatio = this._energy / this._config.maxEnergy;
    this._state.hunger = Math.max(0, Math.min(1, 1 - energyRatio));

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

    // Convert neural output to action
    const action = this.outputToAction(this._lastOutput);

    // Execute the action
    this.executeAction(action);
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

    // Map output index to action - expanded to include all new actions
    const actions = [
      // Movement actions (8-directional)
      CreatureAction.MOVE_NORTH,
      CreatureAction.MOVE_SOUTH,
      CreatureAction.MOVE_EAST,
      CreatureAction.MOVE_WEST,
      CreatureAction.MOVE_NORTHEAST,
      CreatureAction.MOVE_NORTHWEST,
      CreatureAction.MOVE_SOUTHEAST,
      CreatureAction.MOVE_SOUTHWEST,

      // Energy conservation
      CreatureAction.REST,
      CreatureAction.SLEEP,

      // Communication
      CreatureAction.EMIT_SIGNAL,

      // Special actions
      CreatureAction.EAT,
      CreatureAction.DRINK,
      CreatureAction.GATHER,
      CreatureAction.ATTACK,
      CreatureAction.DEFEND,
    ];

    return actions[maxIndex % actions.length];
  }

  /**
   * Execute a specific action with boundary checking and proper energy management
   */
  private executeAction(action: CreatureAction): void {
    // Store the action for the action system to process
    this._state.lastAction = action;
    this._state.ticksSinceLastAction = 0;

    // Update action history
    this._state.actionHistory.push(action);
    if (
      this._state.actionHistory.length > this._config.memory.actionHistorySize
    ) {
      this._state.actionHistory.shift();
    }

    // Apply action effects with boundary checking
    switch (action) {
      case CreatureAction.MOVE_NORTH:
        if (this._position.y > 0) {
          this._position.y -= 1;
        }
        this.energy -= this._config.energyCosts.movement;
        break;

      case CreatureAction.MOVE_SOUTH:
        if (this._position.y < this._config.worldDimensions.height - 1) {
          this._position.y += 1;
        }
        this.energy -= this._config.energyCosts.movement;
        break;

      case CreatureAction.MOVE_EAST:
        if (this._position.x < this._config.worldDimensions.width - 1) {
          this._position.x += 1;
        }
        this.energy -= this._config.energyCosts.movement;
        break;

      case CreatureAction.MOVE_WEST:
        if (this._position.x > 0) {
          this._position.x -= 1;
        }
        this.energy -= this._config.energyCosts.movement;
        break;

      case CreatureAction.MOVE_NORTHEAST:
        if (
          this._position.x < this._config.worldDimensions.width - 1 &&
          this._position.y > 0
        ) {
          this._position.x += 1;
          this._position.y -= 1;
        }
        this.energy -= this._config.energyCosts.diagonalMovement;
        break;

      case CreatureAction.MOVE_NORTHWEST:
        if (this._position.x > 0 && this._position.y > 0) {
          this._position.x -= 1;
          this._position.y -= 1;
        }
        this.energy -= this._config.energyCosts.diagonalMovement;
        break;

      case CreatureAction.MOVE_SOUTHEAST:
        if (
          this._position.x < this._config.worldDimensions.width - 1 &&
          this._position.y < this._config.worldDimensions.height - 1
        ) {
          this._position.x += 1;
          this._position.y += 1;
        }
        this.energy -= this._config.energyCosts.diagonalMovement;
        break;

      case CreatureAction.MOVE_SOUTHWEST:
        if (
          this._position.x > 0 &&
          this._position.y < this._config.worldDimensions.height - 1
        ) {
          this._position.x -= 1;
          this._position.y += 1;
        }
        this.energy -= this._config.energyCosts.diagonalMovement;
        break;

      case CreatureAction.REST:
        this.energy -= this._config.energyCosts.rest;
        break;

      case CreatureAction.SLEEP:
        this.energy -= this._config.energyCosts.sleep;
        break;

      case CreatureAction.EMIT_SIGNAL:
        this.energy -= this._config.energyCosts.emitSignal;
        break;

      case CreatureAction.EAT:
        this.energy -= this._config.energyCosts.eat;
        break;

      case CreatureAction.DRINK:
        this.energy -= this._config.energyCosts.drink;
        break;

      case CreatureAction.GATHER:
        this.energy -= this._config.energyCosts.gather;
        break;

      case CreatureAction.ATTACK:
        this.energy -= this._config.energyCosts.attack;
        break;

      case CreatureAction.DEFEND:
        this.energy -= this._config.energyCosts.defend;
        break;

      default:
        // Unknown action, default to rest
        this.energy -= this._config.energyCosts.rest;
        break;
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

    // Update signal history
    this._state.signalHistory.push(this._state.broadcastSignal);
    if (
      this._state.signalHistory.length > this._config.memory.signalHistorySize
    ) {
      this._state.signalHistory.shift();
    }
  }
}
