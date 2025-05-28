import { describe, it, expect, beforeEach } from "vitest";
import { BehaviorScenarios } from "./behaviorScenarios.js";
import { BehaviorTestFramework } from "./behaviorTesting.js";

describe("Neural Network Behavior Testing", () => {
  let behaviorScenarios: BehaviorScenarios;
  let framework: BehaviorTestFramework;

  beforeEach(() => {
    behaviorScenarios = new BehaviorScenarios();
    framework = behaviorScenarios.getFramework();
  });

  describe("Food Seeking Behavior", () => {
    it("should test herbivore seeking plants", async () => {
      const result = await framework.runScenario("herbivore_seeks_plant");
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.deltas.length).toBeGreaterThan(0);
    });

    it("should test carnivore hunting prey", async () => {
      const result = await framework.runScenario("carnivore_hunts_prey");
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should test omnivore food choice", async () => {
      const result = await framework.runScenario("omnivore_food_choice");
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Threat Avoidance Behavior", () => {
    it("should test prey escaping predator", async () => {
      const result = await framework.runScenario("prey_escapes_predator");
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should test threat detection range", async () => {
      const result = await framework.runScenario("threat_detection_range");
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Reproduction Behavior", () => {
    it("should test mate selection", async () => {
      const result = await framework.runScenario("mate_selection");
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should test reproduction timing", async () => {
      const result = await framework.runScenario("reproduction_timing");
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Movement Patterns", () => {
    it("should test exploration vs exploitation", async () => {
      const result = await framework.runScenario("exploration_vs_exploitation");
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should test movement efficiency", async () => {
      const result = await framework.runScenario("movement_efficiency");
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Energy Conservation", () => {
    it("should test rest vs activity decisions", async () => {
      const result = await framework.runScenario("rest_vs_activity");
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should test starvation avoidance", async () => {
      const result = await framework.runScenario("starvation_avoidance");
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("ASCII Scenario Parsing", () => {
    it("should correctly parse ASCII scenarios", () => {
      const ascii = `
..........
..H.......
..........
....P.....
..........
      `.trim();

      const { grid, creatures } = framework.parseASCIIScenario(ascii);

      expect(grid.width).toBe(10);
      expect(grid.height).toBe(5);
      expect(creatures).toHaveLength(1);
      expect(creatures[0].symbol).toBe("H");
      expect(creatures[0].x).toBe(2);
      expect(creatures[0].y).toBe(1);

      const plant = grid.getCell(4, 3);
      expect(plant).toBeTruthy();
      expect(plant?.symbol).toBe("P");
    });

    it("should convert grid back to ASCII", () => {
      const ascii = `
..........
..H.......
..........
....P.....
..........
      `.trim();

      const { grid } = framework.parseASCIIScenario(ascii);
      const convertedASCII = framework.gridToASCII(grid);

      expect(convertedASCII).toContain("H");
      expect(convertedASCII).toContain("P");
      expect(convertedASCII.split("\n")).toHaveLength(5);
    });
  });

  describe("Delta Tracking", () => {
    it("should track entity movements", async () => {
      const result = await framework.runScenario("herbivore_seeks_plant");

      expect(result.deltas).toBeDefined();
      expect(result.deltas.length).toBeGreaterThan(0);

      // Check for movement deltas
      const movementDeltas = result.deltas.filter((delta) =>
        delta.changes.some((change) => change.type === "moved")
      );
      expect(movementDeltas.length).toBeGreaterThan(0);
    });

    it("should track energy changes", async () => {
      const result = await framework.runScenario("herbivore_seeks_plant");

      // Check for energy change deltas
      const energyDeltas = result.deltas.filter((delta) =>
        delta.changes.some((change) => change.type === "energy_changed")
      );
      expect(energyDeltas.length).toBeGreaterThan(0);
    });
  });

  describe("Scenario File Generation", () => {
    it("should generate scenario files for HTML viewer", () => {
      // This test verifies that scenario data can be saved
      // In a real implementation, this would write actual files
      expect(() => {
        framework.saveScenarioFile("herbivore_seeks_plant", "test_output.json");
      }).not.toThrow();
    });
  });

  describe("Integration Test - Full Scenario Suite", () => {
    it("should run all scenarios and report results", async () => {
      const results = await behaviorScenarios.runAllScenarios();

      expect(results.size).toBeGreaterThan(0);

      // Check that each scenario either passed or has error details
      for (const [scenarioName, result] of results) {
        expect(scenarioName).toBeTruthy();
        expect(result).toBeDefined();

        if (result.error) {
          console.log(`Scenario ${scenarioName} had error: ${result.error}`);
        } else {
          expect(typeof result.passed).toBe("boolean");
          expect(Array.isArray(result.errors)).toBe(true);
          expect(typeof result.ticksRun).toBe("number");
        }
      }
    }, 30000); // 30 second timeout for full suite
  });
});
