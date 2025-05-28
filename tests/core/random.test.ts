import { describe, it, expect, beforeEach } from "vitest";
import { Random } from "../../src/core/random";

describe("Random", () => {
  let random: Random;

  beforeEach(() => {
    random = new Random(12345); // Fixed seed for deterministic tests
  });

  describe("deterministic behavior", () => {
    it("should produce identical sequences with the same seed", () => {
      const random1 = new Random(42);
      const random2 = new Random(42);

      const sequence1 = Array.from({ length: 10 }, () => random1.random());
      const sequence2 = Array.from({ length: 10 }, () => random2.random());

      expect(sequence1).toEqual(sequence2);
    });

    it("should produce different sequences with different seeds", () => {
      const random1 = new Random(42);
      const random2 = new Random(43);

      const sequence1 = Array.from({ length: 10 }, () => random1.random());
      const sequence2 = Array.from({ length: 10 }, () => random2.random());

      expect(sequence1).not.toEqual(sequence2);
    });

    it("should reset to same sequence when seed is reset", () => {
      const sequence1 = Array.from({ length: 5 }, () => random.random());

      random.setSeed(12345); // Reset to original seed
      const sequence2 = Array.from({ length: 5 }, () => random.random());

      expect(sequence1).toEqual(sequence2);
    });
  });

  describe("random()", () => {
    it("should generate numbers between 0 and 1", () => {
      for (let i = 0; i < 100; i++) {
        const value = random.random();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it("should generate different values in sequence", () => {
      const values = Array.from({ length: 10 }, () => random.random());
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe("randomInt()", () => {
    it("should generate integers within specified range", () => {
      for (let i = 0; i < 100; i++) {
        const value = random.randomInt(5, 15);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(5);
        expect(value).toBeLessThan(15);
      }
    });

    it("should throw error when min >= max", () => {
      expect(() => random.randomInt(10, 10)).toThrow(
        "min must be less than max"
      );
      expect(() => random.randomInt(15, 10)).toThrow(
        "min must be less than max"
      );
    });

    it("should handle negative ranges", () => {
      for (let i = 0; i < 50; i++) {
        const value = random.randomInt(-10, -5);
        expect(value).toBeGreaterThanOrEqual(-10);
        expect(value).toBeLessThan(-5);
      }
    });
  });

  describe("randomGaussian()", () => {
    it("should generate numbers with approximately correct mean", () => {
      const mean = 10;
      const samples = Array.from({ length: 1000 }, () =>
        random.randomGaussian(mean, 1)
      );
      const actualMean =
        samples.reduce((sum, val) => sum + val, 0) / samples.length;

      // Allow for some variance due to random sampling
      expect(actualMean).toBeCloseTo(mean, 0);
    });

    it("should use default parameters when not specified", () => {
      const samples = Array.from({ length: 1000 }, () =>
        random.randomGaussian()
      );
      const actualMean =
        samples.reduce((sum, val) => sum + val, 0) / samples.length;

      // Should be close to 0 (default mean)
      expect(Math.abs(actualMean)).toBeLessThan(0.2);
    });
  });

  describe("choice()", () => {
    it("should choose elements from array", () => {
      const array = ["a", "b", "c", "d", "e"];

      for (let i = 0; i < 50; i++) {
        const choice = random.choice(array);
        expect(array).toContain(choice);
      }
    });

    it("should throw error for empty array", () => {
      expect(() => random.choice([])).toThrow("Cannot choose from empty array");
    });

    it("should return the only element for single-element array", () => {
      const result = random.choice(["only"]);
      expect(result).toBe("only");
    });
  });

  describe("shuffle()", () => {
    it("should shuffle array in place", () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const array = [...original];

      const result = random.shuffle(array);

      // Should return the same array reference
      expect(result).toBe(array);

      // Should contain all original elements (sort a copy to avoid modifying shuffled array)
      expect([...array].sort((a, b) => a - b)).toEqual(original);

      // Should be shuffled (very unlikely to be in original order)
      expect(array).not.toEqual(original);
    });

    it("should handle empty array", () => {
      const array: number[] = [];
      const result = random.shuffle(array);
      expect(result).toEqual([]);
    });

    it("should handle single element array", () => {
      const array = [42];
      const result = random.shuffle(array);
      expect(result).toEqual([42]);
    });

    it("should produce deterministic shuffles with same seed", () => {
      const array1 = [1, 2, 3, 4, 5];
      const array2 = [1, 2, 3, 4, 5];

      const random1 = new Random(999);
      const random2 = new Random(999);

      random1.shuffle(array1);
      random2.shuffle(array2);

      expect(array1).toEqual(array2);
    });
  });

  describe("seed management", () => {
    it("should return current seed", () => {
      expect(random.seed).toBe(12345);
    });

    it("should update seed when setSeed is called", () => {
      random.setSeed(54321);
      expect(random.seed).toBe(54321);
    });

    it("should reset gaussian state when seed is changed", () => {
      // Generate a gaussian number to set internal state
      random.randomGaussian();

      // Reset seed should clear internal gaussian state
      random.setSeed(12345);

      // Should not throw or behave unexpectedly
      expect(() => random.randomGaussian()).not.toThrow();
    });
  });
});
