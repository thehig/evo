/// <reference types="p5" />

export enum DietType {
  HERBIVORE = "Herbivore",
  CARNIVORE = "Carnivore",
  OMNIVORE = "Omnivore",
  UNKNOWN = "Unknown",
}

export enum ActivityCycle {
  NOCTURNAL = "Nocturnal",
  DIURNAL = "Diurnal",
  NONE = "None",
}

export enum PerceptionType {
  VISION = "Vision",
  SCENT = "Scent",
  HEARING = "Hearing",
  NONE = "None", // Default or for non-creatures
}

interface IEntity {
  symbol: string;
  color?: string;
  type: string;
  toString(): string;
}

class Entity implements IEntity {
  constructor(
    public symbol: string,
    public color: string = "#FFFFFF",
    public type: string = "Entity"
  ) {}

  toString(): string {
    return this.symbol;
  }
}

class Plant extends Entity {
  constructor() {
    super("P", "#00FF00", "Plant");
  }
}

class Rock extends Entity {
  constructor() {
    super("R", "#808080", "Rock");
  }
}

class Water extends Entity {
  constructor() {
    super("W", "#0000FF", "Water");
  }
}

import { parseSeed, CreatureAttributes } from "./seedParser";

class Creature extends Entity {
  public dietType: DietType;
  public movementSpeed: number;
  public activityCycle: ActivityCycle;
  public perceptionType: PerceptionType; // New
  public perceptionRange: number; // Renamed from visionRange
  public perceptionAngle: number; // New (0-359 degrees)
  public perceptionArc: number; // New (0-360 degrees)

  constructor(
    symbol: string = "C",
    color: string = "#FF0000",
    type: string = "Creature",
    dietType: DietType = DietType.UNKNOWN,
    movementSpeed: number = 1,
    activityCycle: ActivityCycle = ActivityCycle.NONE,
    perceptionType: PerceptionType = PerceptionType.NONE, // New
    perceptionRange: number = 1, // Default vision/perception 1
    perceptionAngle: number = 0, // Default forward
    perceptionArc: number = 45 // Default narrow cone
  ) {
    super(symbol, color, type);
    this.dietType = dietType;
    this.movementSpeed = movementSpeed;
    this.activityCycle = activityCycle;
    this.perceptionType = perceptionType; // New
    this.perceptionRange = perceptionRange; // Renamed
    this.perceptionAngle = perceptionAngle; // New
    this.perceptionArc = perceptionArc; // New
  }

  static fromSeed(
    seed: string,
    defaultSymbol?: string,
    defaultColor?: string
  ): Creature | null {
    const attributes = parseSeed(seed);
    if (!attributes) {
      return null;
    }

    let symbolToUse = defaultSymbol;
    if (!symbolToUse) {
      switch (attributes.dietType) {
        case DietType.HERBIVORE:
          symbolToUse = "H";
          break;
        case DietType.CARNIVORE:
          symbolToUse = "C";
          break;
        case DietType.OMNIVORE:
          symbolToUse = "O";
          break;
        default:
          symbolToUse = "Z";
      }
    }

    let colorToUse = defaultColor;
    if (!colorToUse) {
      switch (attributes.dietType) {
        case DietType.HERBIVORE:
          colorToUse = "#22DD22";
          break;
        case DietType.CARNIVORE:
          colorToUse = "#DD2222";
          break;
        case DietType.OMNIVORE:
          colorToUse = "#DADA22";
          break;
        // Add color based on perception type if desired, or keep it diet-based
        default:
          colorToUse = "#CCCCCC";
      }
    }

    return new Creature(
      symbolToUse,
      colorToUse,
      "Creature",
      attributes.dietType,
      attributes.movementSpeed,
      attributes.activityCycle,
      attributes.perceptionType, // New
      attributes.perceptionRange, // Updated
      attributes.perceptionAngle, // New
      attributes.perceptionArc // New
    );
  }
}

class Grid {
  private _grid: (Entity | null)[][];
  public readonly width: number;
  public readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this._grid = Array(height)
      .fill(null)
      .map(() => Array(width).fill(null));
  }

  setCell(x: number, y: number, value: Entity | null): void {
    if (this.isWithinBounds(x, y)) {
      this._grid[y][x] = value;
    } else {
      throw new RangeError("Grid coordinates out of bounds");
    }
  }

  getCell(x: number, y: number): Entity | null {
    if (this.isWithinBounds(x, y)) {
      return this._grid[y][x];
    } else {
      throw new RangeError("Grid coordinates out of bounds");
    }
  }

  isWithinBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  // display(): void { // REMOVED
  // ... previous display logic ...
  // }
}

interface IRenderer {
  render(grid: Grid): void;
}

class ConsoleRenderer implements IRenderer {
  render(grid: Grid): void {
    console.log("\n--- Console Render ---");
    for (let y = 0; y < grid.height; y++) {
      let rowDisplay: string[] = [];
      for (let x = 0; x < grid.width; x++) {
        const cellContent = grid.getCell(x, y);
        if (cellContent === null) {
          rowDisplay.push(".");
        } else {
          rowDisplay.push(cellContent.toString());
        }
      }
      console.log(rowDisplay.join(" "));
    }
    console.log("---------------------");
  }
}

// The example usage block below was causing the 10x5 grid to be printed to the console
// when grid.ts was imported by main.ts. It should be removed or commented out.

/* 
// Example Usage - THIS BLOCK IS NOW COMMENTED OUT
const grid_example = new Grid(10, 5); // Renamed to avoid conflict if not fully removed
grid_example.setCell(0, 0, new Rock());
grid_example.setCell(1, 1, new Plant());
grid_example.setCell(9, 4, new Creature('X', '#FFA500'));
grid_example.setCell(2, 2, new Water());

console.log(`Cell (0,0): ${grid_example.getCell(0,0)}`);
console.log(`Cell (1,0): ${grid_example.getCell(1,0)}`); 
console.log(`Is (5,5) within bounds? ${grid_example.isWithinBounds(5,5)}`);
console.log(`Is (10,5) within bounds? ${grid_example.isWithinBounds(10,5)}`);

try {
    grid_example.setCell(10, 0, new Rock());
} catch (e: any) {
    if (e instanceof RangeError) {
        console.error(e.message);
    } else {
        console.error("An unexpected error occurred in example block", e);
    }
}

const consoleRenderer_example = new ConsoleRenderer();
consoleRenderer_example.render(grid_example);
*/

class P5CanvasRenderer implements IRenderer {
  private p5Instance: any; // Changed from p5 to any
  private cellSize: number = 20;
  private gridToRender: Grid | null = null;

  constructor(
    private canvasWidth: number,
    private canvasHeight: number,
    parentElementId: string = "canvas-container"
  ) {
    const sketch = (s: any) => {
      s.setup = () => {
        s.createCanvas(this.canvasWidth, this.canvasHeight).parent(
          parentElementId
        );
      };

      s.draw = () => {
        if (this.gridToRender) {
          s.background(240); // Light grey background for the canvas
          for (let y = 0; y < this.gridToRender.height; y++) {
            for (let x = 0; x < this.gridToRender.width; x++) {
              const entity = this.gridToRender.getCell(x, y);
              if (entity) {
                s.fill(entity.color || "#FFFFFF"); // Use entity color or default white
                s.rect(
                  x * this.cellSize,
                  y * this.cellSize,
                  this.cellSize,
                  this.cellSize
                );
                // Optional: Draw symbol if needed (can make it cluttered)
                // p.fill(0); // Black text
                // p.textAlign(p.CENTER, p.CENTER);
                // p.text(entity.symbol, x * this.cellSize + this.cellSize / 2, y * this.cellSize + this.cellSize / 2);
              } else {
                // p.fill(220); // Slightly darker grey for empty cell background if needed, or just use canvas background
                // p.rect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
              }
              s.stroke(200); // Cell borders
              s.noFill(); // Ensure next rect is not filled if it's an empty cell and we don't draw it
            }
          }
        }
      };
    };

    const p5Constructor = (window as any).p5;
    if (typeof p5Constructor === "function") {
      this.p5Instance = new p5Constructor(sketch);
    } else {
      console.error(
        "Global p5 constructor not found. p5.js may not have loaded correctly via the script tag."
      );
      throw new Error("Global p5 constructor not found.");
    }
  }

  render(grid: Grid): void {
    this.gridToRender = grid;
    if (this.p5Instance && !this.gridToRender) {
      this.p5Instance.background(240);
    }
  }

  // Optional: method to explicitly update cell size or other params
  setCellSize(size: number): void {
    this.cellSize = size;
  }
}

// To make this a module and avoid global scope issues if other files are added:
export {
  Entity,
  Plant,
  Rock,
  Water,
  Creature,
  Grid,
  IRenderer,
  ConsoleRenderer,
  P5CanvasRenderer,
  // DietType, ActivityCycle, PerceptionType are already exported where defined.
};
