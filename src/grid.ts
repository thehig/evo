import p5 from "p5";

export enum DietType {
  HERBIVORE = "Herbivore",
  CARNIVORE = "Carnivore",
  OMNIVORE = "Omnivore",
  UNKNOWN = "Unknown",
}

export enum ActivityCycle {
  DIURNAL = "Diurnal",
  NOCTURNAL = "Nocturnal",
  NONE = "None", // Always active or no specific cycle
}

export enum PerceptionType {
  VISION = "Vision",
  SCENT = "Scent",
  HEARING = "Hearing",
  NONE = "None", // No specific perception type, or blind/deaf
}

export interface IEntity {
  symbol: string;
  color?: string;
  type: string;
  x: number;
  y: number;
  toString(): string;
}

export class Entity implements IEntity {
  constructor(
    public symbol: string,
    public color: string = "#FFFFFF",
    public type: string = "Entity",
    public x: number = -1,
    public y: number = -1
  ) {}

  toString(): string {
    return this.symbol;
  }
}

export class Plant extends Entity {
  constructor(x: number = -1, y: number = -1) {
    super("P", "#00FF00", "Plant", x, y);
  }
}

export class Rock extends Entity {
  constructor(x: number = -1, y: number = -1) {
    super("R", "#808080", "Rock", x, y);
  }
}

export class Water extends Entity {
  constructor(x: number = -1, y: number = -1) {
    super("W", "#0000FF", "Water", x, y);
  }
}

import { parseSeed } from "./seedParser";

export class Creature extends Entity {
  public dietType: DietType;
  public movementSpeed: number;
  public activityCycle: ActivityCycle;
  public perceptionType: PerceptionType;
  public perceptionRange: number;
  public perceptionAngle: number;
  public perceptionArc: number;
  public energy: number;

  constructor(
    symbol: string = "C",
    color: string = "#FF0000",
    type: string = "Creature",
    x: number = -1,
    y: number = -1,
    dietType: DietType = DietType.UNKNOWN,
    movementSpeed: number = 1,
    activityCycle: ActivityCycle = ActivityCycle.NONE,
    perceptionType: PerceptionType = PerceptionType.NONE,
    perceptionRange: number = 1,
    perceptionAngle: number = 0,
    perceptionArc: number = 45,
    energy: number = 100
  ) {
    super(symbol, color, type, x, y);
    this.dietType = dietType;
    this.movementSpeed = movementSpeed;
    this.activityCycle = activityCycle;
    this.perceptionType = perceptionType;
    this.perceptionRange = perceptionRange;
    this.perceptionAngle = perceptionAngle;
    this.perceptionArc = perceptionArc;
    this.energy = energy;
  }

  static fromSeed(
    seed: string,
    x: number = -1,
    y: number = -1,
    defaultSymbol?: string,
    defaultColor?: string,
    initialEnergy: number = 100
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
        default:
          colorToUse = "#CCCCCC";
      }
    }

    return new Creature(
      symbolToUse,
      colorToUse,
      "Creature",
      x,
      y,
      attributes.dietType,
      attributes.movementSpeed,
      attributes.activityCycle,
      attributes.perceptionType,
      attributes.perceptionRange,
      attributes.perceptionAngle,
      attributes.perceptionArc,
      initialEnergy
    );
  }

  public eat(target: IEntity, grid: Grid): boolean {
    let energyGain = 0;
    let canEat = false;

    if (this.dietType === DietType.HERBIVORE && target instanceof Plant) {
      energyGain = 20;
      canEat = true;
    } else if (
      this.dietType === DietType.CARNIVORE &&
      target instanceof Creature
    ) {
      if (target !== this) {
        energyGain = 50;
        canEat = true;
      }
    } else if (this.dietType === DietType.OMNIVORE) {
      if (target instanceof Plant) {
        energyGain = 20;
        canEat = true;
      } else if (target instanceof Creature && target !== this) {
        energyGain = 50;
        canEat = true;
      }
    }

    if (canEat) {
      this.energy += energyGain;
      grid.removeEntity(target);
      return true;
    }
    return false;
  }

  getNextMove(): { newX: number; newY: number } | null {
    const possibleMoves = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    const move =
      possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

    return { newX: this.x + move.dx, newY: this.y + move.dy };
  }
}

export class Grid {
  public cells: (IEntity | null)[][];
  private entities: IEntity[] = [];

  constructor(public width: number, public height: number) {
    this.cells = Array(height)
      .fill(null)
      .map(() => Array(width).fill(null));
  }

  addEntity(entity: IEntity, x: number, y: number): boolean {
    if (this.isValidPosition(x, y) && !this.cells[y][x]) {
      this.cells[y][x] = entity;
      entity.x = x;
      entity.y = y;
      this.entities.push(entity);
      return true;
    }
    return false;
  }

  removeEntity(entity: IEntity): boolean {
    if (
      this.isValidPosition(entity.x, entity.y) &&
      this.cells[entity.y][entity.x] === entity
    ) {
      this.cells[entity.y][entity.x] = null;
      const entityIndex = this.entities.indexOf(entity);
      if (entityIndex > -1) {
        this.entities.splice(entityIndex, 1);
      }
      return true;
    }
    return false;
  }

  moveEntity(entity: IEntity, newX: number, newY: number): boolean {
    if (!this.isValidPosition(newX, newY)) {
      return false;
    }

    const targetCell = this.cells[newY][newX];
    if (targetCell && targetCell.type === "Rock") {
      return false;
    }

    if (targetCell && targetCell !== entity && targetCell.type !== "Plant") {
      return false;
    }

    if (
      this.isValidPosition(entity.x, entity.y) &&
      this.cells[entity.y][entity.x] === entity
    ) {
      this.cells[entity.y][entity.x] = null;
    }

    entity.x = newX;
    entity.y = newY;
    this.cells[newY][newX] = entity;
    return true;
  }

  getCreatures(): Creature[] {
    return this.entities.filter((e) => e instanceof Creature) as Creature[];
  }

  isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  getEntities(): IEntity[] {
    return this.entities.slice();
  }

  getCell(x: number, y: number): IEntity | null {
    if (this.isValidPosition(x, y)) {
      return this.cells[y][x];
    }
    return null;
  }
}

export interface IRenderer {
  render(grid: Grid): void;
  setup(
    gridWidth: number,
    gridHeight: number,
    p5Instance: p5,
    canvasWidth?: number,
    canvasHeight?: number
  ): void;
}

export class ConsoleRenderer implements IRenderer {
  setup(
    _gridWidth: number,
    _gridHeight: number,
    _p5Instance: p5,
    _canvasWidth?: number,
    _canvasHeight?: number
  ) {
    console.log("ConsoleRenderer setup complete.");
  }

  render(grid: Grid): void {
    let output = "";
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.getCell(x, y);
        output += cell ? cell.toString() + " " : ". ";
      }
      output += "\n";
    }
    console.log(output);
  }
}

export class P5CanvasRenderer implements IRenderer {
  private p: p5 | null = null;
  private canvasWidth: number = 600;
  private canvasHeight: number = 400;
  private cellWidth: number = 0;
  private cellHeight: number = 0;

  setup(
    gridWidth: number,
    gridHeight: number,
    p5Instance: p5,
    canvasWidth: number = 600,
    canvasHeight: number = 400
  ): void {
    this.p = p5Instance;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.cellWidth = this.canvasWidth / gridWidth;
    this.cellHeight = this.canvasHeight / gridHeight;
    if (this.p) {
      this.p.createCanvas(this.canvasWidth, this.canvasHeight);
    }
    console.log(
      `P5CanvasRenderer setup: Canvas ${this.canvasWidth}x${this.canvasHeight}, Cell ${this.cellWidth}x${this.cellHeight}`
    );
  }

  render(grid: Grid): void {
    if (!this.p) {
      console.error("P5 instance not available for rendering.");
      return;
    }
    this.p.background(220);
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const entity = grid.getCell(x, y);
        if (entity) {
          this.p.fill(entity.color || "#FFFFFF");
          this.p.stroke(0);
          this.p.rect(
            x * this.cellWidth,
            y * this.cellHeight,
            this.cellWidth,
            this.cellHeight
          );
        } else {
          this.p.fill(240);
          this.p.stroke(200);
          this.p.rect(
            x * this.cellWidth,
            y * this.cellHeight,
            this.cellWidth,
            this.cellHeight
          );
        }
      }
    }
  }
}
