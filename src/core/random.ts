import { IRandom } from "./interfaces";

/**
 * Deterministic random number generator using Linear Congruential Generator (LCG)
 *
 * This implementation ensures reproducible results when given the same seed,
 * which is crucial for simulation determinism and testing.
 */
export class Random implements IRandom {
  private _seed: number;
  private _current: number;

  // LCG parameters (from Numerical Recipes)
  private static readonly A = 1664525;
  private static readonly C = 1013904223;
  private static readonly M = 2 ** 32;

  constructor(seed: number = Date.now()) {
    this._seed = seed;
    this._current = seed;
  }

  get seed(): number {
    return this._seed;
  }

  /**
   * Generate the next random number in sequence
   */
  private next(): number {
    this._current = (Random.A * this._current + Random.C) % Random.M;
    return this._current / Random.M;
  }

  /**
   * Generate a random number between 0 and 1
   */
  random(): number {
    return this.next();
  }

  /**
   * Generate a random integer between min (inclusive) and max (exclusive)
   */
  randomInt(min: number, max: number): number {
    if (min >= max) {
      throw new Error("min must be less than max");
    }
    return Math.floor(this.random() * (max - min)) + min;
  }

  /**
   * Generate a random number with normal distribution using Box-Muller transform
   */
  randomGaussian(mean: number = 0, standardDeviation: number = 1): number {
    // Use Box-Muller transform to generate normally distributed random numbers
    if (!this.hasSpare) {
      this.hasSpare = true;
      const u1 = this.random();
      const u2 = this.random();
      const mag = standardDeviation * Math.sqrt(-2 * Math.log(u1));
      this.spare = mag * Math.cos(2 * Math.PI * u2) + mean;
      return mag * Math.sin(2 * Math.PI * u2) + mean;
    } else {
      this.hasSpare = false;
      return this.spare!;
    }
  }

  private hasSpare = false;
  private spare?: number;

  /**
   * Choose a random element from an array
   */
  choice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error("Cannot choose from empty array");
    }
    const index = this.randomInt(0, array.length);
    return array[index];
  }

  /**
   * Shuffle an array in place using Fisher-Yates algorithm
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Reset the generator with a new seed
   */
  setSeed(seed: number): void {
    this._seed = seed;
    this._current = seed;
    this.hasSpare = false;
    this.spare = undefined;
  }
}
