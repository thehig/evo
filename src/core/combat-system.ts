/**
 * Energy-Based Combat System
 *
 * This module implements combat mechanics between creatures using energy
 * as both health and action resource, with deterministic resolution algorithms.
 */

import { ICreature } from "./interfaces";
import {
  InteractionResult,
  MemoryEntry,
  InteractionType,
} from "./interaction-matrix";
import { EntityType } from "./creature-types";

/**
 * Combat outcome types
 */
export enum CombatOutcome {
  VICTORY = "victory",
  DEFEAT = "defeat",
  RETREAT = "retreat",
  STALEMATE = "stalemate",
  INTERRUPTED = "interrupted",
}

/**
 * Combat state for tracking ongoing battles
 */
export enum CombatState {
  INITIATING = "initiating",
  ENGAGED = "engaged",
  RETREATING = "retreating",
  RESOLVED = "resolved",
}

/**
 * Combat attributes derived from creature properties
 */
export interface CombatAttributes {
  /** Base attack power (derived from energy and size) */
  attackPower: number;

  /** Defensive capability (derived from energy and experience) */
  defense: number;

  /** Combat experience modifier */
  experience: number;

  /** Current combat fatigue (increases with consecutive fights) */
  fatigue: number;

  /** Retreat threshold (energy level at which creature will retreat) */
  retreatThreshold: number;
}

/**
 * Combat action types
 */
export enum CombatAction {
  AGGRESSIVE_ATTACK = "aggressive_attack",
  DEFENSIVE_ATTACK = "defensive_attack",
  DEFEND = "defend",
  RETREAT = "retreat",
  COUNTER_ATTACK = "counter_attack",
}

/**
 * Result of a combat round
 */
export interface CombatRoundResult {
  /** Damage dealt to defender */
  damageDealt: number;

  /** Damage received by attacker */
  damageReceived: number;

  /** Energy cost for attacker */
  attackerEnergyCost: number;

  /** Energy cost for defender */
  defenderEnergyCost: number;

  /** Combat action used by attacker */
  attackerAction: CombatAction;

  /** Combat action used by defender */
  defenderAction: CombatAction;

  /** Whether the round ended the combat */
  combatEnded: boolean;

  /** Final outcome if combat ended */
  outcome?: CombatOutcome;
}

/**
 * Complete combat result
 */
export interface CombatResult {
  /** Overall outcome */
  outcome: CombatOutcome;

  /** Winner of the combat (if any) */
  winner?: ICreature;

  /** Loser of the combat (if any) */
  loser?: ICreature;

  /** Number of rounds fought */
  rounds: number;

  /** Total damage dealt by initiator */
  totalDamageByInitiator: number;

  /** Total damage dealt by defender */
  totalDamageByDefender: number;

  /** Energy expended by initiator */
  initiatorEnergySpent: number;

  /** Energy expended by defender */
  defenderEnergySpent: number;

  /** Experience gained by participants */
  experienceGained: { initiator: number; defender: number };
}

/**
 * Combat configuration
 */
export interface CombatConfig {
  /** Base damage multiplier */
  baseDamageMultiplier: number;

  /** Maximum randomization factor (±) */
  randomizationFactor: number;

  /** Energy cost multiplier for aggressive actions */
  aggressiveEnergyCost: number;

  /** Energy cost multiplier for defensive actions */
  defensiveEnergyCost: number;

  /** Fatigue accumulation rate */
  fatigueRate: number;

  /** Maximum number of combat rounds */
  maxRounds: number;

  /** Minimum energy required to initiate combat */
  minCombatEnergy: number;

  /** Default retreat threshold (percentage of max energy) */
  defaultRetreatThreshold: number;
}

/**
 * Default combat configuration
 */
const DEFAULT_COMBAT_CONFIG: CombatConfig = {
  baseDamageMultiplier: 2.0,
  randomizationFactor: 0.15,
  aggressiveEnergyCost: 1.5,
  defensiveEnergyCost: 1.0,
  fatigueRate: 0.1,
  maxRounds: 10,
  minCombatEnergy: 20,
  defaultRetreatThreshold: 0.25,
};

/**
 * Combat resolver class
 */
export class CombatResolver {
  private config: CombatConfig;
  private activeCombats: Map<string, CombatState> = new Map();
  private combatHistory: Map<string, CombatResult[]> = new Map();

  constructor(config: Partial<CombatConfig> = {}) {
    this.config = { ...DEFAULT_COMBAT_CONFIG, ...config };
  }

  /**
   * Calculate combat attributes for a creature
   */
  calculateCombatAttributes(creature: ICreature): CombatAttributes {
    const maxEnergy = (creature as any).getConfig?.()?.maxEnergy || 100;
    const energyRatio = creature.energy / maxEnergy;

    // Get combat history for experience calculation
    const history = this.combatHistory.get(creature.id) || [];
    const victories = history.filter(
      (r) => r.winner?.id === creature.id
    ).length;
    const totalCombats = history.length;

    return {
      attackPower: Math.floor(creature.energy * 0.1 + creature.age * 0.01),
      defense: Math.floor(creature.energy * 0.08 + victories * 0.5),
      experience: Math.min(totalCombats * 0.1, 2.0), // Cap at 2.0 multiplier
      fatigue: this.calculateFatigue(creature.id),
      retreatThreshold: maxEnergy * this.config.defaultRetreatThreshold,
    };
  }

  /**
   * Determine combat action based on creature state and strategy
   */
  determineCombatAction(
    creature: ICreature,
    opponent: ICreature,
    attributes: CombatAttributes
  ): CombatAction {
    const energyRatio =
      creature.energy / ((creature as any).getConfig?.()?.maxEnergy || 100);
    const opponentAttributes = this.calculateCombatAttributes(opponent);

    // Retreat if energy is too low
    if (creature.energy <= attributes.retreatThreshold) {
      return CombatAction.RETREAT;
    }

    // Defensive if significantly outmatched
    if (opponentAttributes.attackPower > attributes.attackPower * 1.5) {
      return energyRatio > 0.6
        ? CombatAction.DEFENSIVE_ATTACK
        : CombatAction.DEFEND;
    }

    // Aggressive if strong advantage
    if (attributes.attackPower > opponentAttributes.attackPower * 1.3) {
      return CombatAction.AGGRESSIVE_ATTACK;
    }

    // Balanced approach based on energy
    if (energyRatio > 0.7) {
      return CombatAction.AGGRESSIVE_ATTACK;
    } else if (energyRatio > 0.4) {
      return CombatAction.DEFENSIVE_ATTACK;
    } else {
      return CombatAction.DEFEND;
    }
  }

  /**
   * Calculate damage for a combat action
   */
  calculateDamage(
    attacker: ICreature,
    defender: ICreature,
    attackerAction: CombatAction,
    defenderAction: CombatAction
  ): { damage: number; counterDamage: number } {
    const attackerAttrs = this.calculateCombatAttributes(attacker);
    const defenderAttrs = this.calculateCombatAttributes(defender);

    // Base damage calculation
    let attackPower =
      attackerAttrs.attackPower * (1 + attackerAttrs.experience);
    let defensePower = defenderAttrs.defense * (1 + defenderAttrs.experience);

    // Apply action modifiers with more significant differences
    switch (attackerAction) {
      case CombatAction.AGGRESSIVE_ATTACK:
        attackPower *= 1.8; // Increased from 1.5 for more significant difference
        break;
      case CombatAction.DEFENSIVE_ATTACK:
        attackPower *= 1.0;
        break;
      case CombatAction.COUNTER_ATTACK:
        attackPower *= 1.3;
        break;
    }

    switch (defenderAction) {
      case CombatAction.DEFEND:
        defensePower *= 1.8;
        break;
      case CombatAction.RETREAT:
        defensePower *= 0.5; // Vulnerable while retreating
        break;
      case CombatAction.COUNTER_ATTACK:
        defensePower *= 0.8; // Less defensive when counter-attacking
        break;
    }

    // Apply fatigue
    attackPower *= 1 - attackerAttrs.fatigue;
    defensePower *= 1 - defenderAttrs.fatigue;

    // Calculate base damage with better scaling
    const attackDefenseRatio = attackPower / Math.max(0.1, defensePower); // Prevent division by zero
    const baseDamage = Math.max(
      0, // Allow zero damage when well defended
      attackDefenseRatio * this.config.baseDamageMultiplier
    );

    // Apply randomization
    const randomFactor =
      1 + (Math.random() - 0.5) * 2 * this.config.randomizationFactor;
    const damage = Math.max(0, Math.floor(baseDamage * randomFactor));

    // Calculate counter damage if defender is counter-attacking
    let counterDamage = 0;
    if (defenderAction === CombatAction.COUNTER_ATTACK) {
      const counterPower = defenderAttrs.attackPower * 0.8;
      const counterBase = Math.max(
        0, // Allow zero counter damage
        (counterPower / Math.max(0.1, attackerAttrs.defense)) *
          this.config.baseDamageMultiplier
      );
      counterDamage = Math.max(0, Math.floor(counterBase * randomFactor));
    }

    return { damage, counterDamage };
  }

  /**
   * Calculate energy costs for combat actions
   */
  calculateEnergyCosts(
    action: CombatAction,
    attributes: CombatAttributes
  ): number {
    const baseCost = 5; // Base energy cost
    let multiplier = 1.0;

    switch (action) {
      case CombatAction.AGGRESSIVE_ATTACK:
        multiplier = this.config.aggressiveEnergyCost;
        break;
      case CombatAction.DEFENSIVE_ATTACK:
        multiplier = this.config.defensiveEnergyCost;
        break;
      case CombatAction.DEFEND:
        multiplier = 0.5;
        break;
      case CombatAction.RETREAT:
        multiplier = 0.3;
        break;
      case CombatAction.COUNTER_ATTACK:
        multiplier = 1.2;
        break;
    }

    // Apply fatigue to energy costs
    multiplier *= 1 + attributes.fatigue;

    return Math.ceil(baseCost * multiplier);
  }

  /**
   * Resolve a single combat round
   */
  resolveCombatRound(
    attacker: ICreature,
    defender: ICreature
  ): CombatRoundResult {
    const attackerAttrs = this.calculateCombatAttributes(attacker);
    const defenderAttrs = this.calculateCombatAttributes(defender);

    const attackerAction = this.determineCombatAction(
      attacker,
      defender,
      attackerAttrs
    );
    const defenderAction = this.determineCombatAction(
      defender,
      attacker,
      defenderAttrs
    );

    // Calculate damage
    const { damage, counterDamage } = this.calculateDamage(
      attacker,
      defender,
      attackerAction,
      defenderAction
    );

    // Calculate energy costs
    const attackerEnergyCost = this.calculateEnergyCosts(
      attackerAction,
      attackerAttrs
    );
    const defenderEnergyCost = this.calculateEnergyCosts(
      defenderAction,
      defenderAttrs
    );

    // Apply damage and energy costs
    defender.energy = Math.max(0, defender.energy - damage);
    attacker.energy = Math.max(
      0,
      attacker.energy - counterDamage - attackerEnergyCost
    );
    defender.energy = Math.max(0, defender.energy - defenderEnergyCost);

    // Update fatigue
    this.updateFatigue(attacker.id);
    this.updateFatigue(defender.id);

    // Check for combat end conditions
    let combatEnded = false;
    let outcome: CombatOutcome | undefined;

    if (
      attackerAction === CombatAction.RETREAT ||
      defenderAction === CombatAction.RETREAT
    ) {
      combatEnded = true;
      outcome = CombatOutcome.RETREAT;
    } else if (attacker.energy <= 0 && defender.energy <= 0) {
      combatEnded = true;
      outcome = CombatOutcome.STALEMATE;
    } else if (attacker.energy <= 0) {
      combatEnded = true;
      outcome = CombatOutcome.DEFEAT;
    } else if (defender.energy <= 0) {
      combatEnded = true;
      outcome = CombatOutcome.VICTORY;
    }

    return {
      damageDealt: damage,
      damageReceived: counterDamage,
      attackerEnergyCost,
      defenderEnergyCost,
      attackerAction,
      defenderAction,
      combatEnded,
      outcome,
    };
  }

  /**
   * Resolve complete combat between two creatures
   */
  resolveCombat(initiator: ICreature, defender: ICreature): CombatResult {
    // Check if combat can be initiated
    if (
      initiator.energy < this.config.minCombatEnergy ||
      defender.energy < this.config.minCombatEnergy
    ) {
      return {
        outcome: CombatOutcome.INTERRUPTED,
        rounds: 0,
        totalDamageByInitiator: 0,
        totalDamageByDefender: 0,
        initiatorEnergySpent: 0,
        defenderEnergySpent: 0,
        experienceGained: { initiator: 0, defender: 0 },
      };
    }

    // Mark combat as active
    this.activeCombats.set(initiator.id, CombatState.ENGAGED);
    this.activeCombats.set(defender.id, CombatState.ENGAGED);

    let rounds = 0;
    let totalDamageByInitiator = 0;
    let totalDamageByDefender = 0;
    let initiatorEnergySpent = 0;
    let defenderEnergySpent = 0;
    let outcome = CombatOutcome.STALEMATE;

    const initialInitiatorEnergy = initiator.energy;
    const initialDefenderEnergy = defender.energy;

    // Combat loop
    while (rounds < this.config.maxRounds) {
      const roundResult = this.resolveCombatRound(initiator, defender);

      rounds++;
      totalDamageByInitiator += roundResult.damageDealt;
      totalDamageByDefender += roundResult.damageReceived;
      initiatorEnergySpent += roundResult.attackerEnergyCost;
      defenderEnergySpent += roundResult.defenderEnergyCost;

      if (roundResult.combatEnded) {
        outcome = roundResult.outcome!;
        break;
      }
    }

    // Calculate experience gained
    const experienceGained = this.calculateExperienceGained(
      initiator,
      defender,
      outcome,
      rounds
    );

    // Create combat result
    const result: CombatResult = {
      outcome,
      winner:
        outcome === CombatOutcome.VICTORY
          ? initiator
          : outcome === CombatOutcome.DEFEAT
          ? defender
          : undefined,
      loser:
        outcome === CombatOutcome.VICTORY
          ? defender
          : outcome === CombatOutcome.DEFEAT
          ? initiator
          : undefined,
      rounds,
      totalDamageByInitiator,
      totalDamageByDefender,
      initiatorEnergySpent,
      defenderEnergySpent,
      experienceGained,
    };

    // Record combat history
    this.recordCombatHistory(initiator.id, result);
    this.recordCombatHistory(defender.id, result);

    // Clear active combat state
    this.activeCombats.delete(initiator.id);
    this.activeCombats.delete(defender.id);

    return result;
  }

  /**
   * Create interaction result for combat
   */
  createCombatInteractionResult(
    initiator: ICreature,
    target: ICreature
  ): InteractionResult {
    const combatResult = this.resolveCombat(initiator, target);

    // Create memory entry
    const memoryEntry: MemoryEntry = {
      interactionType: InteractionType.COMBAT,
      entityId: target.id,
      entityType: EntityType.CREATURE_FRIEND, // Simplified
      outcome:
        combatResult.outcome === CombatOutcome.VICTORY
          ? "success"
          : combatResult.outcome === CombatOutcome.DEFEAT
          ? "failure"
          : "neutral",
      tick: Date.now(), // Simplified tick tracking
      context: {
        rounds: combatResult.rounds,
        damageDealt: combatResult.totalDamageByInitiator,
        damageReceived: combatResult.totalDamageByDefender,
        outcome: combatResult.outcome,
      },
    };

    return {
      success: combatResult.outcome !== CombatOutcome.INTERRUPTED,
      energyChange: -combatResult.initiatorEnergySpent,
      damageDealt: combatResult.totalDamageByInitiator,
      damageReceived: combatResult.totalDamageByDefender,
      memoryEntry,
      effects: {
        combatOutcome: combatResult.outcome,
        rounds: combatResult.rounds,
        experienceGained: combatResult.experienceGained.initiator,
      },
    };
  }

  /**
   * Calculate fatigue for a creature
   */
  private calculateFatigue(creatureId: string): number {
    const history = this.combatHistory.get(creatureId) || [];
    const recentCombats = history.filter(
      (r) => Date.now() - (r as any).timestamp < 10000 // Last 10 seconds
    ).length;

    return Math.min(recentCombats * this.config.fatigueRate, 0.8); // Cap at 80% fatigue
  }

  /**
   * Update fatigue for a creature
   */
  private updateFatigue(creatureId: string): void {
    // Fatigue is calculated dynamically, no need to store
  }

  /**
   * Calculate experience gained from combat
   */
  private calculateExperienceGained(
    initiator: ICreature,
    defender: ICreature,
    outcome: CombatOutcome,
    rounds: number
  ): { initiator: number; defender: number } {
    const baseExperience = rounds * 0.1;

    let initiatorExp = baseExperience;
    let defenderExp = baseExperience;

    // Bonus for victory
    if (outcome === CombatOutcome.VICTORY) {
      initiatorExp += 0.5;
    } else if (outcome === CombatOutcome.DEFEAT) {
      defenderExp += 0.5;
    }

    // Bonus for fighting stronger opponents
    const initiatorAttrs = this.calculateCombatAttributes(initiator);
    const defenderAttrs = this.calculateCombatAttributes(defender);

    if (defenderAttrs.attackPower > initiatorAttrs.attackPower) {
      initiatorExp *= 1.5; // Bonus for fighting stronger opponent
    }

    if (initiatorAttrs.attackPower > defenderAttrs.attackPower) {
      defenderExp *= 1.5;
    }

    return {
      initiator: Math.round(initiatorExp * 100) / 100,
      defender: Math.round(defenderExp * 100) / 100,
    };
  }

  /**
   * Record combat history
   */
  private recordCombatHistory(creatureId: string, result: CombatResult): void {
    if (!this.combatHistory.has(creatureId)) {
      this.combatHistory.set(creatureId, []);
    }

    const history = this.combatHistory.get(creatureId)!;
    history.push({ ...result, timestamp: Date.now() } as any);

    // Keep only last 50 combats
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
  }

  /**
   * Get combat statistics for a creature
   */
  getCombatStatistics(creatureId: string) {
    const history = this.combatHistory.get(creatureId) || [];

    const victories = history.filter((r) => r.winner?.id === creatureId).length;
    const defeats = history.filter((r) => r.loser?.id === creatureId).length;
    const retreats = history.filter(
      (r) => r.outcome === CombatOutcome.RETREAT
    ).length;
    const stalemates = history.filter(
      (r) => r.outcome === CombatOutcome.STALEMATE
    ).length;

    const totalDamageDealt = history.reduce(
      (sum, r) =>
        sum +
        (r.winner?.id === creatureId
          ? r.totalDamageByInitiator
          : r.totalDamageByDefender),
      0
    );

    const totalDamageReceived = history.reduce(
      (sum, r) =>
        sum +
        (r.winner?.id === creatureId
          ? r.totalDamageByDefender
          : r.totalDamageByInitiator),
      0
    );

    return {
      totalCombats: history.length,
      victories,
      defeats,
      retreats,
      stalemates,
      winRate: history.length > 0 ? victories / history.length : 0,
      totalDamageDealt,
      totalDamageReceived,
      averageRoundsPerCombat:
        history.length > 0
          ? history.reduce((sum, r) => sum + r.rounds, 0) / history.length
          : 0,
      currentFatigue: this.calculateFatigue(creatureId),
    };
  }

  /**
   * Check if a creature is currently in combat
   */
  isInCombat(creatureId: string): boolean {
    return this.activeCombats.has(creatureId);
  }

  /**
   * Get combat configuration
   */
  getConfig(): Readonly<CombatConfig> {
    return { ...this.config };
  }

  /**
   * Update combat configuration
   */
  updateConfig(newConfig: Partial<CombatConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Reset combat system
   */
  reset(): void {
    this.activeCombats.clear();
    this.combatHistory.clear();
  }
}
