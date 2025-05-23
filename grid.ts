/// <reference types="p5" />

interface IEntity {
  symbol: string;
  color?: string; // Optional: for canvas rendering
  toString(): string;
}

class Entity implements IEntity {
  constructor(public symbol: string, public color: string = "#FFFFFF") {} // Default color white

  toString(): string {
    return this.symbol;
  }
}

class Plant extends Entity {
  constructor() {
    super("P", "#00FF00"); // Green
  }
}

class Rock extends Entity {
  constructor() {
    super("R", "#808080"); // Grey
  }
}

class Water extends Entity {
  constructor() {
    super("W", "#0000FF"); // Blue
  }
}

class Creature extends Entity {
  constructor(symbol: string = "C", color: string = "#FF0000") {
    // Default Red for generic creature
    super(symbol, color);
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

// Example Usage (modified)
const grid = new Grid(10, 5);
grid.setCell(0, 0, new Rock());
grid.setCell(1, 1, new Plant());
grid.setCell(9, 4, new Creature("X", "#FFA500")); // Orange creature
grid.setCell(2, 2, new Water());

console.log(`Cell (0,0): ${grid.getCell(0, 0)}`);
console.log(`Cell (1,0): ${grid.getCell(1, 0)}`);
console.log(`Is (5,5) within bounds? ${grid.isWithinBounds(5, 5)}`);
console.log(`Is (10,5) within bounds? ${grid.isWithinBounds(10, 5)}`);

try {
  grid.setCell(10, 0, new Rock());
} catch (e: any) {
  if (e instanceof RangeError) {
    console.error(e.message);
  } else {
    console.error("An unexpected error occurred", e);
  }
}

// Using the ConsoleRenderer
const consoleRenderer = new ConsoleRenderer();
consoleRenderer.render(grid);

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
}; // Added P5CanvasRenderer
