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
  public seed: string;

  public energyForReproduction: number = 150;
  public energyCostOfReproduction: number = 50;
  public reproductionCooldown: number = 20;
  public ticksUntilReadyToReproduce: number = 0;

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
    energy: number = 100,
    seed: string = ""
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
    this.seed = seed;
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
      initialEnergy,
      seed
    );
  }

  // Method to check if the creature can reproduce
  public canReproduce(): boolean {
    return (
      this.energy >= this.energyForReproduction &&
      this.ticksUntilReadyToReproduce <= 0
    );
  }

  // Static method to combine seeds from two parents
  static combineSeeds(seedA: string, seedB: string): string {
    if (seedA.length !== seedB.length) {
      // This case should ideally not happen if creatures are from compatible species
      // or if seed length is standardized. For now, return a mix based on shorter length
      // or error out. Let's assume they are the same length based on current seed structure.
      console.error("Parent seeds have different lengths. This is unexpected.");
      // Fallback: use seedA or implement a more robust mixing strategy
      return seedA;
    }
    let offspringSeed = "";
    for (let i = 0; i < seedA.length; i++) {
      offspringSeed += Math.random() < 0.5 ? seedA[i] : seedB[i];
    }
    return offspringSeed;
  }

  // Static method to handle the creation and placement of an offspring
  static procreate(
    parentA: Creature,
    parentB: Creature,
    grid: Grid
  ): Creature | null {
    console.log(
      "[Debug] procreate called by:",
      parentA.symbol,
      parentA.x,
      parentA.y,
      "&",
      parentB.symbol,
      parentB.x,
      parentB.y
    );
    // 1. Combine parent seeds
    const offspringSeed = Creature.combineSeeds(parentA.seed, parentB.seed);
    console.log("[Debug] Offspring seed:", offspringSeed);

    // 2. Create offspring (it won't have a position yet)
    const offspringInitialEnergy = 100;
    const offspring = Creature.fromSeed(
      offspringSeed,
      -1,
      -1,
      undefined,
      undefined,
      offspringInitialEnergy
    );
    console.log(
      "[Debug] Offspring created:",
      offspring ? offspring.symbol : "null"
    );

    if (!offspring) {
      console.error(
        "[Debug] Failed to create offspring from seed:",
        offspringSeed
      );
      return null;
    }

    // 3. Attempt to find an empty adjacent cell for placement
    let placed = false;
    let offspringX = -1;
    let offspringY = -1;

    const placementAttempts = [
      { parent: parentA, name: "parentA" },
      { parent: parentB, name: "parentB" },
    ];

    for (const attempt of placementAttempts) {
      const adjacentOffsets = [
        { dx: 0, dy: -1 }, // North
        { dx: 1, dy: 0 }, // East
        { dx: 0, dy: 1 }, // South
        { dx: -1, dy: 0 }, // West
        { dx: -1, dy: -1 }, // NW
        { dx: 1, dy: -1 }, // NE
        { dx: -1, dy: 1 }, // SW
        { dx: 1, dy: 1 }, // SE
      ];
      // Shuffle offsets to make placement less deterministic
      for (let i = adjacentOffsets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [adjacentOffsets[i], adjacentOffsets[j]] = [
          adjacentOffsets[j],
          adjacentOffsets[i],
        ];
      }

      for (const offset of adjacentOffsets) {
        const x = attempt.parent.x + offset.dx;
        const y = attempt.parent.y + offset.dy;
        console.log(
          `[Debug] Attempting placement for offspring at ${x},${y} around ${attempt.name}`
        );
        if (grid.isValidPosition(x, y)) {
          const cellContent = grid.getCell(x, y);
          console.log(
            `[Debug] Cell ${x},${y} content:`,
            cellContent ? cellContent.symbol : "null"
          );
          if (cellContent === null) {
            offspringX = x;
            offspringY = y;
            const addResult = grid.addEntity(offspring, offspringX, offspringY);
            console.log(
              `[Debug] grid.addEntity to ${x},${y} result:`,
              addResult
            );
            if (addResult) {
              placed = true;
              console.log("[Debug] Offspring placed successfully.");
              break;
            } else {
              console.error(
                `[Debug] Failed to add offspring at ${x},${y} even if cell was reported null.`
              );
            }
          }
        } else {
          console.log(`[Debug] Position ${x},${y} is invalid.`);
        }
      }
      if (placed) break;
    }

    if (!placed) {
      console.log("[Debug] No space to place offspring around parents.");
      return null;
    }

    parentA.energy -= parentA.energyCostOfReproduction;
    parentB.energy -= parentB.energyCostOfReproduction;
    parentA.ticksUntilReadyToReproduce = parentA.reproductionCooldown;
    parentB.ticksUntilReadyToReproduce = parentB.reproductionCooldown;

    return offspring;
  }

  // Instance method for a creature to attempt reproduction
  public attemptReproduction(grid: Grid): Creature | null {
    if (!this.canReproduce()) {
      return null;
    }

    const adjacentOffsets = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }, // Cardinal
      { dx: -1, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
      { dx: 1, dy: 1 }, // Diagonal
    ];

    for (const offset of adjacentOffsets) {
      const mateX = this.x + offset.dx;
      const mateY = this.y + offset.dy;
      const potentialMateEntity = grid.getCell(mateX, mateY);

      if (
        potentialMateEntity &&
        potentialMateEntity instanceof Creature &&
        potentialMateEntity !== this && // Cannot mate with oneself
        potentialMateEntity.canReproduce()
      ) {
        const mate = potentialMateEntity as Creature;
        // Both this creature and the mate are ready and capable.
        // Call the static procreate method.
        const offspring = Creature.procreate(this, mate, grid);
        if (offspring) {
          // console.log(`Offspring ${offspring.symbol} created at ${offspring.x},${offspring.y}`);
          return offspring;
        } else {
          // Procreation attempt failed (e.g. no space, or seed error)
          // console.log("Procreation attempt failed."); // Can be noisy
        }
      }
    }
    return null; // No suitable mate found or procreation failed
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

  // Method for creature to find food in adjacent cells
  public findFood(grid: Grid): IEntity | null {
    // Energy cost for basic adjacent scan
    this.energy -= 0.5; // Example cost, can be tuned
    if (this.energy <= 0) return null; // Died from sensing

    const currentX = this.x;
    const currentY = this.y;

    const adjacentOffsets = [
      { dx: 0, dy: -1 }, // North
      { dx: 1, dy: 0 }, // East
      { dx: 0, dy: 1 }, // South
      { dx: -1, dy: 0 }, // West
    ];

    for (const offset of adjacentOffsets) {
      const foodX = currentX + offset.dx;
      const foodY = currentY + offset.dy;
      const potentialFood = grid.getCell(foodX, foodY);

      if (potentialFood) {
        // Check if this creature can eat the potential food
        let canEatThis = false;
        if (
          this.dietType === DietType.HERBIVORE &&
          potentialFood instanceof Plant
        ) {
          canEatThis = true;
        } else if (
          this.dietType === DietType.CARNIVORE &&
          potentialFood instanceof Creature &&
          potentialFood !== this
        ) {
          canEatThis = true;
        } else if (this.dietType === DietType.OMNIVORE) {
          if (potentialFood instanceof Plant) {
            canEatThis = true;
          } else if (
            potentialFood instanceof Creature &&
            potentialFood !== this
          ) {
            canEatThis = true;
          }
        }
        if (canEatThis) {
          return potentialFood; // Found edible food
        }
      }
    }
    return null; // No edible food found in adjacent cells
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
