/**
 * Creature implementation
 *
 * This module implements the basic Creature class with neural network integration,
 * energy system, and action processing.
 */

import { ICreature } from "./interfaces";
import { INeuralNetwork } from "../neural/types";
import {
  CreatureAction,
  ISensoryData,
  ICreatureState,
  ICreatureConfig,
  DEFAULT_CREATURE_CONFIG,
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

    // Initialize internal state
    this._state = {
      hunger: 0.0,
      lastAction: null,
      ticksSinceLastAction: 0,
    };
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
  update(deltaTime: number): void {
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
    if (!this._alive) {
      return;
    }

    // Gather sensory data
    const sensoryData = this.gatherSensoryData();
    this._lastSensoryData = sensoryData;

    // Convert sensory data to neural network input
    const inputs = this.sensoryDataToInputs(sensoryData);

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
  }

  /**
   * Reproduce with another creature (placeholder implementation)
   */
  reproduce(partner: ICreature): ICreature | null {
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
   * Gather sensory information from the environment
   */
  private gatherSensoryData(): ISensoryData {
    // Normalize position to 0-1 range
    const positionX = this._position.x / this._config.worldDimensions.width;
    const positionY = this._position.y / this._config.worldDimensions.height;

    // Normalize age to 0-1 range
    const ageNormalized = this._age / this._config.maxAge;

    // Simple vision system - for now just return position-based values
    // This will be expanded when the world system is implemented
    const vision = this.generateSimpleVision();

    return {
      energy: this._energy,
      ageNormalized: Math.min(1.0, ageNormalized),
      positionX: Math.max(0, Math.min(1.0, positionX)),
      positionY: Math.max(0, Math.min(1.0, positionY)),
      vision,
      hunger: this._state.hunger,
    };
  }

  /**
   * Generate simple vision data based on position
   * This is a placeholder until the world system is implemented
   */
  private generateSimpleVision(): number[] {
    const visionSize = (this._config.visionRange * 2 + 1) ** 2;
    const vision: number[] = new Array(visionSize).fill(0);

    // For now, just fill with normalized position data
    // This will be replaced with actual world sensing
    for (let i = 0; i < vision.length; i++) {
      vision[i] = ((this._position.x + this._position.y + i) % 100) / 100;
    }

    return vision;
  }

  /**
   * Convert sensory data to neural network inputs
   */
  private sensoryDataToInputs(sensoryData: ISensoryData): number[] {
    const inputs: number[] = [
      sensoryData.energy,
      sensoryData.ageNormalized,
      sensoryData.positionX,
      sensoryData.positionY,
      sensoryData.hunger,
      ...sensoryData.vision,
    ];

    return inputs;
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
