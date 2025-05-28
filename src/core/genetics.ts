/**
 * Genetics System
 *
 * This module handles genetic traits, inheritance, mutations, and genetic
 * compatibility calculations for creature reproduction.
 */

import { Random } from "./random";

/**
 * Types of genetic traits that can be inherited
 */
export enum TraitType {
  SPEED = "speed",
  SIZE = "size",
  ENERGY_EFFICIENCY = "energy_efficiency",
  ATTACK_POWER = "attack_power",
  DEFENSE = "defense",
  PERCEPTION = "perception",
  INTELLIGENCE = "intelligence",
  FERTILITY = "fertility",
  LONGEVITY = "longevity",
  METABOLISM = "metabolism",
  AGGRESSION = "aggression",
  SOCIABILITY = "sociability",
}

/**
 * Mutation types that can occur during reproduction
 */
export enum MutationType {
  POINT = "point", // Single value change
  SHIFT = "shift", // Gradual value shift
  INVERSION = "inversion", // Trait value inversion
  NOVEL = "novel", // Completely new trait emergence
}

/**
 * Individual gene representing a single trait
 */
export interface Gene {
  /** Unique identifier for this trait */
  traitId: TraitType;

  /** Current value of the trait */
  value: number;

  /** Minimum possible value for this trait */
  minValue: number;

  /** Maximum possible value for this trait */
  maxValue: number;

  /** Dominance level (0-1, higher = more dominant) */
  dominance: number;

  /** Mutation rate for this specific gene */
  mutationRate: number;

  /** Whether this trait can be expressed (epigenetic factor) */
  expressed: boolean;

  /** Environmental factors affecting expression */
  environmentalModifier: number;
}

/**
 * Complete genetic makeup of a creature
 */
export interface Genome {
  /** Unique identifier for this genome */
  id: string;

  /** All genes in this genome */
  genes: Map<TraitType, Gene>;

  /** Generation number */
  generation: number;

  /** Parent genome IDs */
  parentIds: string[];

  /** Mutation history */
  mutations: MutationRecord[];

  /** Genetic diversity score */
  diversityScore: number;
}

/**
 * Record of a mutation that occurred
 */
export interface MutationRecord {
  /** Type of mutation */
  type: MutationType;

  /** Trait that was mutated */
  traitId: TraitType;

  /** Value before mutation */
  oldValue: number;

  /** Value after mutation */
  newValue: number;

  /** Generation when mutation occurred */
  generation: number;

  /** Environmental factors that influenced the mutation */
  environmentalFactors?: Record<string, number>;
}

/**
 * Configuration for genetic system
 */
export interface GeneticsConfig {
  /** Base mutation rate (0-1) */
  baseMutationRate: number;

  /** Chance of novel trait emergence (0-1) */
  novelTraitChance: number;

  /** Environmental mutation multiplier */
  environmentalMutationMultiplier: number;

  /** Whether to use epigenetic factors */
  enableEpigenetics: boolean;

  /** Minimum genetic diversity for reproduction */
  minGeneticDiversity: number;

  /** Maximum genetic distance for compatibility */
  maxGeneticDistance: number;
}

/**
 * Default genetics configuration
 */
const DEFAULT_GENETICS_CONFIG: GeneticsConfig = {
  baseMutationRate: 0.05,
  novelTraitChance: 0.01,
  environmentalMutationMultiplier: 1.0,
  enableEpigenetics: true,
  minGeneticDiversity: 0.1,
  maxGeneticDistance: 0.8,
};

/**
 * Default trait ranges and properties
 */
const DEFAULT_TRAIT_RANGES: Record<
  TraitType,
  {
    min: number;
    max: number;
    default: number;
    dominance: number;
    mutationRate: number;
  }
> = {
  [TraitType.SPEED]: {
    min: 0.5,
    max: 2.0,
    default: 1.0,
    dominance: 0.6,
    mutationRate: 0.08,
  },
  [TraitType.SIZE]: {
    min: 0.7,
    max: 1.5,
    default: 1.0,
    dominance: 0.8,
    mutationRate: 0.05,
  },
  [TraitType.ENERGY_EFFICIENCY]: {
    min: 0.6,
    max: 1.8,
    default: 1.0,
    dominance: 0.7,
    mutationRate: 0.06,
  },
  [TraitType.ATTACK_POWER]: {
    min: 0.3,
    max: 2.2,
    default: 1.0,
    dominance: 0.9,
    mutationRate: 0.07,
  },
  [TraitType.DEFENSE]: {
    min: 0.4,
    max: 1.8,
    default: 1.0,
    dominance: 0.8,
    mutationRate: 0.06,
  },
  [TraitType.PERCEPTION]: {
    min: 0.5,
    max: 2.5,
    default: 1.0,
    dominance: 0.5,
    mutationRate: 0.09,
  },
  [TraitType.INTELLIGENCE]: {
    min: 0.6,
    max: 2.0,
    default: 1.0,
    dominance: 0.4,
    mutationRate: 0.04,
  },
  [TraitType.FERTILITY]: {
    min: 0.3,
    max: 1.7,
    default: 1.0,
    dominance: 0.6,
    mutationRate: 0.05,
  },
  [TraitType.LONGEVITY]: {
    min: 0.5,
    max: 1.8,
    default: 1.0,
    dominance: 0.7,
    mutationRate: 0.03,
  },
  [TraitType.METABOLISM]: {
    min: 0.4,
    max: 1.6,
    default: 1.0,
    dominance: 0.8,
    mutationRate: 0.07,
  },
  [TraitType.AGGRESSION]: {
    min: 0.2,
    max: 2.0,
    default: 1.0,
    dominance: 0.9,
    mutationRate: 0.08,
  },
  [TraitType.SOCIABILITY]: {
    min: 0.1,
    max: 1.9,
    default: 1.0,
    dominance: 0.3,
    mutationRate: 0.06,
  },
};

/**
 * Genetics system managing genetic traits and inheritance
 */
export class GeneticsSystem {
  private config: GeneticsConfig;
  private random: Random;
  private genomeRegistry: Map<string, Genome> = new Map();
  private generationCounter: number = 0;

  constructor(config: Partial<GeneticsConfig> = {}, seed?: number) {
    this.config = { ...DEFAULT_GENETICS_CONFIG, ...config };
    this.random = new Random(seed);
  }

  /**
   * Create a new random genome
   */
  createRandomGenome(id?: string): Genome {
    const genomeId = id || this.generateGenomeId();
    const genes = new Map<TraitType, Gene>();

    // Create genes for all trait types
    for (const [traitType, ranges] of Object.entries(DEFAULT_TRAIT_RANGES)) {
      const trait = traitType as TraitType;
      const gene: Gene = {
        traitId: trait,
        value: this.random.random() * (ranges.max - ranges.min) + ranges.min,
        minValue: ranges.min,
        maxValue: ranges.max,
        dominance: ranges.dominance + this.random.randomGaussian(0, 0.1),
        mutationRate: ranges.mutationRate,
        expressed: true,
        environmentalModifier: 1.0,
      };

      // Clamp dominance to valid range
      gene.dominance = Math.max(0, Math.min(1, gene.dominance));

      genes.set(trait, gene);
    }

    const genome: Genome = {
      id: genomeId,
      genes,
      generation: 0,
      parentIds: [],
      mutations: [],
      diversityScore: this.calculateDiversityScore(genes),
    };

    this.genomeRegistry.set(genomeId, genome);
    return genome;
  }

  /**
   * Combine two parent genomes to create offspring genome
   */
  combineGenomes(
    parent1: Genome,
    parent2: Genome,
    offspringId?: string
  ): Genome {
    const genomeId = offspringId || this.generateGenomeId();
    const genes = new Map<TraitType, Gene>();
    const mutations: MutationRecord[] = [];

    // Combine genes from both parents
    for (const traitType of Object.values(TraitType)) {
      const gene1 = parent1.genes.get(traitType);
      const gene2 = parent2.genes.get(traitType);

      if (!gene1 || !gene2) {
        continue; // Skip if either parent lacks this trait
      }

      // Determine inheritance based on dominance
      const totalDominance = gene1.dominance + gene2.dominance;
      const inheritanceChance = gene1.dominance / totalDominance;
      const inheritFromParent1 = this.random.random() < inheritanceChance;

      const sourceGene = inheritFromParent1 ? gene1 : gene2;
      const otherGene = inheritFromParent1 ? gene2 : gene1;

      // Create offspring gene with potential blending
      let offspringValue = sourceGene.value;

      // Apply co-dominance blending for some traits
      if (Math.abs(gene1.dominance - gene2.dominance) < 0.3) {
        const blendFactor = this.random.random() * 0.4 + 0.3; // 0.3 to 0.7
        offspringValue =
          gene1.value * blendFactor + gene2.value * (1 - blendFactor);
      }

      // Create the offspring gene
      const offspringGene: Gene = {
        traitId: traitType,
        value: offspringValue,
        minValue: sourceGene.minValue,
        maxValue: sourceGene.maxValue,
        dominance:
          (gene1.dominance + gene2.dominance) / 2 +
          this.random.randomGaussian(0, 0.05),
        mutationRate: (gene1.mutationRate + gene2.mutationRate) / 2,
        expressed: sourceGene.expressed,
        environmentalModifier: 1.0,
      };

      // Clamp dominance
      offspringGene.dominance = Math.max(
        0,
        Math.min(1, offspringGene.dominance)
      );

      // Apply mutations
      const mutatedGene = this.applyMutations(offspringGene, mutations);
      genes.set(traitType, mutatedGene);
    }

    const offspring: Genome = {
      id: genomeId,
      genes,
      generation: Math.max(parent1.generation, parent2.generation) + 1,
      parentIds: [parent1.id, parent2.id],
      mutations,
      diversityScore: this.calculateDiversityScore(genes),
    };

    this.genomeRegistry.set(genomeId, offspring);
    return offspring;
  }

  /**
   * Apply mutations to a gene
   */
  private applyMutations(gene: Gene, mutationHistory: MutationRecord[]): Gene {
    const mutatedGene = { ...gene };
    const effectiveMutationRate =
      gene.mutationRate *
      this.config.baseMutationRate *
      this.config.environmentalMutationMultiplier;

    // Check if mutation occurs
    if (this.random.random() > effectiveMutationRate) {
      return mutatedGene; // No mutation
    }

    const oldValue = mutatedGene.value;
    let newValue = oldValue;
    let mutationType: MutationType;

    // Determine mutation type
    const mutationRoll = this.random.random();
    if (mutationRoll < this.config.novelTraitChance) {
      // Novel trait emergence
      mutationType = MutationType.NOVEL;
      newValue =
        this.random.random() * (gene.maxValue - gene.minValue) + gene.minValue;
    } else if (mutationRoll < 0.1) {
      // Inversion mutation
      mutationType = MutationType.INVERSION;
      const range = gene.maxValue - gene.minValue;
      const normalizedValue = (oldValue - gene.minValue) / range;
      newValue = gene.minValue + (1 - normalizedValue) * range;
    } else if (mutationRoll < 0.4) {
      // Shift mutation
      mutationType = MutationType.SHIFT;
      const shiftAmount = this.random.randomGaussian(0, 0.1);
      newValue = oldValue + shiftAmount;
    } else {
      // Point mutation
      mutationType = MutationType.POINT;
      const mutationStrength = this.random.randomGaussian(0, 0.05);
      newValue = oldValue * (1 + mutationStrength);
    }

    // Clamp to valid range
    newValue = Math.max(gene.minValue, Math.min(gene.maxValue, newValue));

    // Record mutation
    if (Math.abs(newValue - oldValue) > 0.001) {
      mutationHistory.push({
        type: mutationType,
        traitId: gene.traitId,
        oldValue,
        newValue,
        generation: this.generationCounter,
      });

      mutatedGene.value = newValue;
    }

    return mutatedGene;
  }

  /**
   * Calculate genetic compatibility between two genomes
   */
  calculateCompatibility(genome1: Genome, genome2: Genome): number {
    let totalDistance = 0;
    let traitCount = 0;

    for (const traitType of Object.values(TraitType)) {
      const gene1 = genome1.genes.get(traitType);
      const gene2 = genome2.genes.get(traitType);

      if (gene1 && gene2) {
        // Normalize values to 0-1 range
        const range1 = gene1.maxValue - gene1.minValue;
        const range2 = gene2.maxValue - gene2.minValue;
        const norm1 = (gene1.value - gene1.minValue) / range1;
        const norm2 = (gene2.value - gene2.minValue) / range2;

        // Calculate distance
        const distance = Math.abs(norm1 - norm2);
        totalDistance += distance;
        traitCount++;
      }
    }

    if (traitCount === 0) return 0;

    const averageDistance = totalDistance / traitCount;

    // Convert distance to compatibility (inverse relationship)
    // Optimal compatibility is at moderate genetic distance
    const optimalDistance = 0.3;
    let compatibility: number;

    if (averageDistance < optimalDistance) {
      // Too similar - reduced compatibility
      compatibility = averageDistance / optimalDistance;
    } else {
      // Too different - reduced compatibility
      compatibility = Math.max(
        0,
        1 - (averageDistance - optimalDistance) / (1 - optimalDistance)
      );
    }

    return Math.max(0, Math.min(1, compatibility));
  }

  /**
   * Calculate genetic diversity score for a genome
   */
  calculateDiversityScore(genes: Map<TraitType, Gene>): number {
    let diversitySum = 0;
    let traitCount = 0;

    for (const gene of genes.values()) {
      // Calculate how far this trait is from the default value
      const range = gene.maxValue - gene.minValue;
      const defaultValue = DEFAULT_TRAIT_RANGES[gene.traitId].default;
      const normalizedDefault = (defaultValue - gene.minValue) / range;
      const normalizedValue = (gene.value - gene.minValue) / range;

      const diversity = Math.abs(normalizedValue - normalizedDefault);
      diversitySum += diversity;
      traitCount++;
    }

    return traitCount > 0 ? diversitySum / traitCount : 0;
  }

  /**
   * Get trait value from genome with environmental modifiers
   */
  getTraitValue(genome: Genome, traitType: TraitType): number {
    const gene = genome.genes.get(traitType);
    if (!gene || !gene.expressed) {
      return DEFAULT_TRAIT_RANGES[traitType].default;
    }

    return gene.value * gene.environmentalModifier;
  }

  /**
   * Apply environmental factors to genome expression
   */
  applyEnvironmentalFactors(
    genome: Genome,
    factors: Record<string, number>
  ): void {
    for (const gene of genome.genes.values()) {
      // Environmental factors can affect gene expression
      let modifier = 1.0;

      // Example environmental effects
      if (factors.temperature) {
        if (gene.traitId === TraitType.METABOLISM) {
          modifier *= 1 + (factors.temperature - 0.5) * 0.2;
        }
      }

      if (factors.foodScarcity) {
        if (gene.traitId === TraitType.ENERGY_EFFICIENCY) {
          modifier *= 1 + factors.foodScarcity * 0.3;
        }
      }

      if (factors.predatorPressure) {
        if (
          gene.traitId === TraitType.SPEED ||
          gene.traitId === TraitType.PERCEPTION
        ) {
          modifier *= 1 + factors.predatorPressure * 0.25;
        }
      }

      gene.environmentalModifier = Math.max(0.5, Math.min(2.0, modifier));
    }
  }

  /**
   * Generate unique genome ID
   */
  private generateGenomeId(): string {
    return `genome_${Date.now()}_${this.random.randomInt(1000, 10000)}`;
  }

  /**
   * Get genome by ID
   */
  getGenome(id: string): Genome | undefined {
    return this.genomeRegistry.get(id);
  }

  /**
   * Get all registered genomes
   */
  getAllGenomes(): Genome[] {
    return Array.from(this.genomeRegistry.values());
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<GeneticsConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<GeneticsConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get statistics about the genetic system
   */
  getStatistics() {
    const genomes = this.getAllGenomes();
    const totalMutations = genomes.reduce(
      (sum, genome) => sum + genome.mutations.length,
      0
    );
    const averageDiversity =
      genomes.length > 0
        ? genomes.reduce((sum, genome) => sum + genome.diversityScore, 0) /
          genomes.length
        : 0;

    const generationDistribution = new Map<number, number>();
    for (const genome of genomes) {
      const count = generationDistribution.get(genome.generation) || 0;
      generationDistribution.set(genome.generation, count + 1);
    }

    const mutationTypeDistribution = new Map<MutationType, number>();
    for (const genome of genomes) {
      for (const mutation of genome.mutations) {
        const count = mutationTypeDistribution.get(mutation.type) || 0;
        mutationTypeDistribution.set(mutation.type, count + 1);
      }
    }

    return {
      totalGenomes: genomes.length,
      totalMutations,
      averageDiversity,
      generationDistribution,
      mutationTypeDistribution,
      currentGeneration: this.generationCounter,
    };
  }

  /**
   * Reset the genetics system
   */
  reset(): void {
    this.genomeRegistry.clear();
    this.generationCounter = 0;
  }

  /**
   * Advance generation counter
   */
  advanceGeneration(): void {
    this.generationCounter++;
  }

  /**
   * Set trait value for a genome
   */
  setTraitValue(genome: Genome, traitType: TraitType, value: number): boolean {
    const gene = genome.genes.get(traitType);
    if (!gene) {
      return false;
    }

    // Clamp value to valid range
    gene.value = Math.max(gene.minValue, Math.min(gene.maxValue, value));

    // Update diversity score
    genome.diversityScore = this.calculateDiversityScore(genome.genes);

    return true;
  }

  /**
   * Set environmental modifier for a trait
   */
  setEnvironmentalModifier(
    genome: Genome,
    traitType: TraitType,
    modifier: number
  ): boolean {
    const gene = genome.genes.get(traitType);
    if (!gene) {
      return false;
    }

    gene.environmentalModifier = Math.max(0.1, Math.min(5.0, modifier));
    return true;
  }

  /**
   * Set trait expression status
   */
  setTraitExpression(
    genome: Genome,
    traitType: TraitType,
    expressed: boolean
  ): boolean {
    const gene = genome.genes.get(traitType);
    if (!gene) {
      return false;
    }

    gene.expressed = expressed;
    return true;
  }
}
