import {
  BehaviorTestFramework,
  ScenarioDefinition,
} from "./behaviorTesting.js";

export class BehaviorScenarios {
  private framework: BehaviorTestFramework;

  constructor() {
    this.framework = new BehaviorTestFramework();
    this.setupScenarios();
  }

  public getFramework(): BehaviorTestFramework {
    return this.framework;
  }

  private setupScenarios(): void {
    // Food Seeking Scenarios
    this.framework.addScenario(this.createHerbivoreSeeksPlantScenario());
    this.framework.addScenario(this.createCarnivoreHuntsPreyScenario());
    this.framework.addScenario(this.createOmnivoreChoiceScenario());

    // Threat Avoidance Scenarios
    this.framework.addScenario(this.createPreyEscapesPredatorScenario());
    this.framework.addScenario(this.createThreatDetectionScenario());

    // Reproduction Scenarios
    this.framework.addScenario(this.createMateSelectionScenario());
    this.framework.addScenario(this.createReproductionTimingScenario());

    // Movement Pattern Scenarios
    this.framework.addScenario(this.createExplorationVsExploitationScenario());
    this.framework.addScenario(this.createMovementEfficiencyScenario());

    // Energy Conservation Scenarios
    this.framework.addScenario(this.createRestVsActivityScenario());
    this.framework.addScenario(this.createStarvationAvoidanceScenario());
  }

  private createHerbivoreSeeksPlantScenario(): ScenarioDefinition {
    return {
      name: "herbivore_seeks_plant",
      description: "Herbivore should move towards nearby plants for food",
      initialState: `
..........
..........
....H.....
..........
....P.....
..........
..........
      `.trim(),
      expectedBehavior: "Herbivore moves towards plant and consumes it",
      maxTicks: 10,
      assertions: [
        {
          tick: 5,
          type: "position",
          target: "H",
          expected: { x: 4, y: 4 },
        },
        {
          tick: 6,
          type: "delta",
          target: "H",
          expected: { entity: "H", type: "energy_changed" },
        },
      ],
    };
  }

  private createCarnivoreHuntsPreyScenario(): ScenarioDefinition {
    return {
      name: "carnivore_hunts_prey",
      description: "Carnivore should hunt and consume herbivore prey",
      initialState: `
..........
..C.......
..........
..H.......
..........
      `.trim(),
      expectedBehavior: "Carnivore moves towards herbivore and consumes it",
      maxTicks: 15,
      assertions: [
        {
          tick: 3,
          type: "position",
          target: "C",
          expected: { x: 2, y: 3 },
        },
        {
          tick: 4,
          type: "delta",
          target: "H",
          expected: { entity: "H", type: "died" },
        },
      ],
    };
  }

  private createOmnivoreChoiceScenario(): ScenarioDefinition {
    return {
      name: "omnivore_food_choice",
      description:
        "Omnivore should choose between plant and prey based on proximity and energy needs",
      initialState: `
..........
..P.......
..........
....O.....
..........
......H...
..........
      `.trim(),
      expectedBehavior: "Omnivore chooses closest food source",
      maxTicks: 12,
      assertions: [
        {
          tick: 8,
          type: "energy",
          target: "O",
          expected: 110,
          tolerance: 10,
        },
      ],
    };
  }

  private createPreyEscapesPredatorScenario(): ScenarioDefinition {
    return {
      name: "prey_escapes_predator",
      description: "Herbivore should flee when carnivore approaches",
      initialState: `
..........
..H.......
..........
..C.......
..........
      `.trim(),
      expectedBehavior: "Herbivore moves away from carnivore",
      maxTicks: 8,
      assertions: [
        {
          tick: 3,
          type: "position",
          target: "H",
          expected: { x: 2, y: 0 },
        },
        {
          tick: 6,
          type: "delta",
          target: "H",
          expected: { entity: "H", type: "moved" },
        },
      ],
    };
  }

  private createThreatDetectionScenario(): ScenarioDefinition {
    return {
      name: "threat_detection_range",
      description: "Creature should detect threats within perception range",
      initialState: `
..........
..H.......
..........
..........
..C.......
..........
      `.trim(),
      expectedBehavior:
        "Herbivore detects distant carnivore and begins evasive movement",
      maxTicks: 10,
      assertions: [
        {
          tick: 2,
          type: "delta",
          target: "H",
          expected: { entity: "H", type: "moved" },
        },
      ],
    };
  }

  private createMateSelectionScenario(): ScenarioDefinition {
    return {
      name: "mate_selection",
      description: "Creatures with sufficient energy should seek mates",
      initialState: `
..........
..H.......
..........
......H...
..........
      `.trim(),
      expectedBehavior: "Herbivores move towards each other for reproduction",
      maxTicks: 20,
      assertions: [
        {
          tick: 15,
          type: "position",
          target: "H",
          expected: { x: 4, y: 2 },
        },
        {
          tick: 18,
          type: "delta",
          target: "H",
          expected: { entity: "H", type: "reproduced" },
        },
      ],
    };
  }

  private createReproductionTimingScenario(): ScenarioDefinition {
    return {
      name: "reproduction_timing",
      description:
        "Creatures should only reproduce when energy threshold is met",
      initialState: `
..........
..H.......
..........
......H...
..........
      `.trim(),
      expectedBehavior:
        "Low energy creatures avoid reproduction until energy is sufficient",
      maxTicks: 25,
      assertions: [
        {
          tick: 10,
          type: "energy",
          target: "H",
          expected: 100,
          tolerance: 20,
        },
      ],
    };
  }

  private createExplorationVsExploitationScenario(): ScenarioDefinition {
    return {
      name: "exploration_vs_exploitation",
      description:
        "Creature should balance exploring new areas vs staying in food-rich areas",
      initialState: `
..........
..PPP.....
..PHP.....
..PPP.....
..........
      `.trim(),
      expectedBehavior:
        "Herbivore exploits local food cluster before exploring",
      maxTicks: 15,
      assertions: [
        {
          tick: 8,
          type: "position",
          target: "H",
          expected: { x: 3, y: 2 },
        },
        {
          tick: 12,
          type: "energy",
          target: "H",
          expected: 120,
          tolerance: 15,
        },
      ],
    };
  }

  private createMovementEfficiencyScenario(): ScenarioDefinition {
    return {
      name: "movement_efficiency",
      description:
        "Creature should move efficiently towards goals without unnecessary detours",
      initialState: `
..........
..H.......
..........
..........
......P...
..........
      `.trim(),
      expectedBehavior: "Herbivore takes direct path to plant",
      maxTicks: 8,
      assertions: [
        {
          tick: 4,
          type: "position",
          target: "H",
          expected: { x: 4, y: 3 },
        },
        {
          tick: 6,
          type: "position",
          target: "H",
          expected: { x: 6, y: 4 },
        },
      ],
    };
  }

  private createRestVsActivityScenario(): ScenarioDefinition {
    return {
      name: "rest_vs_activity",
      description: "Low energy creature should rest to conserve energy",
      initialState: `
..........
..H.......
..........
..........
..........
      `.trim(),
      expectedBehavior:
        "Low energy herbivore minimizes movement to conserve energy",
      maxTicks: 10,
      assertions: [
        {
          tick: 5,
          type: "position",
          target: "H",
          expected: { x: 2, y: 1 },
        },
        {
          tick: 8,
          type: "energy",
          target: "H",
          expected: 85,
          tolerance: 10,
        },
      ],
    };
  }

  private createStarvationAvoidanceScenario(): ScenarioDefinition {
    return {
      name: "starvation_avoidance",
      description:
        "Creature should prioritize food seeking when energy is critically low",
      initialState: `
..........
..H.......
..........
..........
....P.....
..........
      `.trim(),
      expectedBehavior: "Low energy herbivore urgently seeks food",
      maxTicks: 12,
      assertions: [
        {
          tick: 6,
          type: "position",
          target: "H",
          expected: { x: 4, y: 4 },
        },
        {
          tick: 7,
          type: "energy",
          target: "H",
          expected: 110,
          tolerance: 15,
        },
      ],
    };
  }

  public async runAllScenarios(): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    const scenarioNames = [
      "herbivore_seeks_plant",
      "carnivore_hunts_prey",
      "omnivore_food_choice",
      "prey_escapes_predator",
      "threat_detection_range",
      "mate_selection",
      "reproduction_timing",
      "exploration_vs_exploitation",
      "movement_efficiency",
      "rest_vs_activity",
      "starvation_avoidance",
    ];

    for (const scenarioName of scenarioNames) {
      try {
        const result = await this.framework.runScenario(scenarioName);
        results.set(scenarioName, result);
        console.log(
          `Scenario ${scenarioName}: ${result.passed ? "PASSED" : "FAILED"}`
        );
        if (!result.passed) {
          console.log(`  Errors: ${result.errors.join(", ")}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        results.set(scenarioName, { error: errorMessage });
        console.log(`Scenario ${scenarioName}: ERROR - ${errorMessage}`);
      }
    }

    return results;
  }

  public saveAllScenarios(outputDir: string): void {
    const scenarioNames = [
      "herbivore_seeks_plant",
      "carnivore_hunts_prey",
      "omnivore_food_choice",
      "prey_escapes_predator",
      "threat_detection_range",
      "mate_selection",
      "reproduction_timing",
      "exploration_vs_exploitation",
      "movement_efficiency",
      "rest_vs_activity",
      "starvation_avoidance",
    ];

    for (const scenarioName of scenarioNames) {
      this.framework.saveScenarioFile(
        scenarioName,
        `${outputDir}/${scenarioName}.json`
      );
    }
  }
}
