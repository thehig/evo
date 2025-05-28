import {
  Grid,
  Creature,
  DietType,
  IEntity,
  Plant,
  Rock,
  Water,
} from "../src/grid.js";
import { Simulation } from "../src/simulation.js";
import { CreatureBrain } from "../src/creatureBrain.js";
import { NeuralNetwork } from "../src/neuralNetwork.js";

export interface ScenarioDefinition {
  name: string;
  description: string;
  initialState: string; // ASCII representation
  expectedBehavior: string;
  maxTicks: number;
  assertions: BehaviorAssertion[];
}

export interface BehaviorAssertion {
  tick: number;
  type: "position" | "energy" | "action" | "state" | "delta";
  target: string; // creature symbol or entity identifier
  expected: any;
  tolerance?: number; // for numeric comparisons
}

export interface SimulationDelta {
  tick: number;
  changes: EntityChange[];
}

export interface EntityChange {
  entity: string;
  type: "moved" | "died" | "born" | "ate" | "reproduced" | "energy_changed";
  from?: { x: number; y: number } | number;
  to?: { x: number; y: number } | number;
  details?: any;
}

export class BehaviorTestRenderer {
  private deltas: SimulationDelta[] = [];
  private currentTick: number = 0;
  private previousState: Map<string, any> = new Map();

  setup(): void {
    this.deltas = [];
    this.currentTick = 0;
    this.previousState.clear();
    this.entityIdMap = new WeakMap<any, string>();
    this.entityIdCounter = 0;
  }

  reset(): void {
    this.deltas = [];
    this.currentTick = 0;
    this.previousState.clear();
    this.entityIdMap = new WeakMap<any, string>();
    this.entityIdCounter = 0;
  }

  render(grid: Grid): void {
    const changes: EntityChange[] = [];
    const currentState = new Map<string, any>();
    const currentPositions = new Map<string, { x: number; y: number }>();

    // Track all entities
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const entity = grid.getCell(x, y);
        if (entity) {
          // Use a unique identifier for each entity (symbol + creation order)
          // For now, we'll use symbol + position as a fallback, but track by entity reference
          const entityId = this.getEntityId(entity);
          const state = {
            x,
            y,
            type: entity.type,
            symbol: entity.symbol,
            energy: entity instanceof Creature ? entity.energy : undefined,
          };

          currentState.set(entityId, state);
          currentPositions.set(entityId, { x, y });

          // Check for changes
          const prevState = this.previousState.get(entityId);
          if (prevState) {
            if (prevState.x !== x || prevState.y !== y) {
              changes.push({
                entity: entity.symbol,
                type: "moved",
                from: { x: prevState.x, y: prevState.y },
                to: { x, y },
              });
            }

            if (entity instanceof Creature && prevState.energy !== undefined) {
              if (prevState.energy !== entity.energy) {
                changes.push({
                  entity: entity.symbol,
                  type: "energy_changed",
                  from: prevState.energy,
                  to: entity.energy,
                });
              }
            }
          } else {
            // New entity (born)
            changes.push({
              entity: entity.symbol,
              type: "born",
              to: { x, y },
            });
          }
        }
      }
    }

    // Check for removed entities (died)
    for (const [entityId, prevState] of this.previousState) {
      if (!currentState.has(entityId)) {
        changes.push({
          entity: prevState.symbol,
          type: "died",
          from: { x: prevState.x, y: prevState.y },
        });
      }
    }

    if (changes.length > 0) {
      this.deltas.push({
        tick: this.currentTick,
        changes,
      });
    }

    this.previousState = currentState;
    this.currentTick++;
  }

  private entityIdMap = new WeakMap<any, string>();
  private entityIdCounter = 0;

  private getEntityId(entity: any): string {
    if (!this.entityIdMap.has(entity)) {
      this.entityIdMap.set(
        entity,
        `${entity.symbol}_${this.entityIdCounter++}`
      );
    }
    return this.entityIdMap.get(entity)!;
  }

  getDeltas(): SimulationDelta[] {
    return [...this.deltas];
  }

  getLastDelta(): SimulationDelta | undefined {
    return this.deltas[this.deltas.length - 1];
  }
}

export class BehaviorTestFramework {
  private grid: Grid;
  private simulation: Simulation;
  private renderer: BehaviorTestRenderer;
  private scenarios: Map<string, ScenarioDefinition> = new Map();

  constructor() {
    this.renderer = new BehaviorTestRenderer();
    this.grid = new Grid(10, 10);
    this.simulation = new Simulation(this.grid, this.renderer);
  }

  public addScenario(scenario: ScenarioDefinition): void {
    this.scenarios.set(scenario.name, scenario);
  }

  public parseASCIIScenario(ascii: string): {
    grid: Grid;
    creatures: Creature[];
  } {
    const lines = ascii.trim().split("\n");
    const height = lines.length;
    const width = Math.max(...lines.map((line) => line.length));

    const grid = new Grid(width, height);
    const creatures: Creature[] = [];

    for (let y = 0; y < height; y++) {
      const line = lines[y] || "";
      for (let x = 0; x < width; x++) {
        const char = line[x] || " ";

        switch (char) {
          case "H": // Herbivore
            const herbivore = new Creature(
              "H",
              "#00FF00",
              "Creature",
              x,
              y,
              DietType.HERBIVORE
            );
            herbivore.energy = 100;
            grid.addEntity(herbivore, x, y);
            creatures.push(herbivore);
            break;
          case "C": // Carnivore
            const carnivore = new Creature(
              "C",
              "#FF0000",
              "Creature",
              x,
              y,
              DietType.CARNIVORE
            );
            carnivore.energy = 100;
            grid.addEntity(carnivore, x, y);
            creatures.push(carnivore);
            break;
          case "O": // Omnivore
            const omnivore = new Creature(
              "O",
              "#FFFF00",
              "Creature",
              x,
              y,
              DietType.OMNIVORE
            );
            omnivore.energy = 100;
            grid.addEntity(omnivore, x, y);
            creatures.push(omnivore);
            break;
          case "P": // Plant
            const plant = new Plant(x, y);
            grid.addEntity(plant, x, y);
            break;
          case "R": // Rock
            const rock = new Rock(x, y);
            grid.addEntity(rock, x, y);
            break;
          case "W": // Water
            const water = new Water(x, y);
            grid.addEntity(water, x, y);
            break;
          case " ":
          case ".":
            // Empty space
            break;
        }
      }
    }

    return { grid, creatures };
  }

  public gridToASCII(grid: Grid): string {
    const lines: string[] = [];

    for (let y = 0; y < grid.height; y++) {
      let line = "";
      for (let x = 0; x < grid.width; x++) {
        const entity = grid.getCell(x, y);
        line += entity ? entity.symbol : ".";
      }
      lines.push(line);
    }

    return lines.join("\n");
  }

  public async runScenario(scenarioName: string): Promise<BehaviorTestResult> {
    const scenario = this.scenarios.get(scenarioName);
    if (!scenario) {
      throw new Error(`Scenario '${scenarioName}' not found`);
    }

    // Parse initial state
    const { grid, creatures } = this.parseASCIIScenario(scenario.initialState);
    this.grid = grid;
    this.simulation = new Simulation(this.grid, this.renderer);
    this.renderer.setup();

    // Reset renderer to clear any initial state tracking from parsing
    this.renderer.reset();

    // Render initial state to establish baseline for delta tracking
    this.renderer.render(this.grid);

    const result: BehaviorTestResult = {
      scenarioName,
      passed: true,
      errors: [],
      deltas: [],
      finalState: "",
      ticksRun: 0,
    };

    // Run simulation for specified ticks
    for (let tick = 0; tick < scenario.maxTicks; tick++) {
      this.simulation.manualStep();
      result.ticksRun = tick + 1;

      // Check assertions for this tick
      for (const assertion of scenario.assertions) {
        if (assertion.tick === tick) {
          const assertionResult = this.checkAssertion(assertion, creatures);
          if (!assertionResult.passed) {
            result.passed = false;
            result.errors.push(`Tick ${tick}: ${assertionResult.error}`);
          }
        }
      }

      // Early exit if all creatures are dead
      if (this.grid.getCreatures().length === 0) {
        break;
      }
    }

    result.deltas = this.renderer.getDeltas();
    result.finalState = this.gridToASCII(this.grid);

    return result;
  }

  private checkAssertion(
    assertion: BehaviorAssertion,
    creatures: Creature[]
  ): { passed: boolean; error?: string } {
    const creature = creatures.find((c) => c.symbol === assertion.target);

    switch (assertion.type) {
      case "position":
        if (!creature)
          return {
            passed: false,
            error: `Creature ${assertion.target} not found`,
          };
        const expectedPos = assertion.expected as { x: number; y: number };
        if (creature.x !== expectedPos.x || creature.y !== expectedPos.y) {
          return {
            passed: false,
            error: `Expected ${assertion.target} at (${expectedPos.x},${expectedPos.y}), found at (${creature.x},${creature.y})`,
          };
        }
        break;

      case "energy":
        if (!creature)
          return {
            passed: false,
            error: `Creature ${assertion.target} not found`,
          };
        const expectedEnergy = assertion.expected as number;
        const tolerance = assertion.tolerance || 0;
        if (Math.abs(creature.energy - expectedEnergy) > tolerance) {
          return {
            passed: false,
            error: `Expected ${assertion.target} energy ${expectedEnergy}±${tolerance}, found ${creature.energy}`,
          };
        }
        break;

      case "delta":
        const lastDelta = this.renderer.getLastDelta();
        if (!lastDelta)
          return { passed: false, error: "No delta found for this tick" };

        const expectedChange = assertion.expected as EntityChange;
        const matchingChange = lastDelta.changes.find(
          (change) =>
            change.entity === expectedChange.entity &&
            change.type === expectedChange.type
        );

        if (!matchingChange) {
          return {
            passed: false,
            error: `Expected ${expectedChange.type} for ${expectedChange.entity}, not found in deltas`,
          };
        }
        break;
    }

    return { passed: true };
  }

  public saveScenarioFile(scenarioName: string, outputPath: string): void {
    const scenario = this.scenarios.get(scenarioName);
    if (!scenario) {
      throw new Error(`Scenario '${scenarioName}' not found`);
    }

    // This would save the scenario in a format that can be loaded by the HTML viewer
    // For now, we'll just prepare the data structure
    const scenarioData = {
      name: scenario.name,
      description: scenario.description,
      initialState: scenario.initialState,
      expectedBehavior: scenario.expectedBehavior,
    };

    // In a real implementation, this would write to file
    console.log(
      `Scenario data for ${scenarioName}:`,
      JSON.stringify(scenarioData, null, 2)
    );
  }
}

export interface BehaviorTestResult {
  scenarioName: string;
  passed: boolean;
  errors: string[];
  deltas: SimulationDelta[];
  finalState: string;
  ticksRun: number;
}
