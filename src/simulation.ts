import { Grid, Creature, IRenderer } from "./grid";

export class Simulation {
  private grid: Grid;
  private renderer: IRenderer;
  private isRunning: boolean = false;
  private tickCount: number = 0;
  private animationFrameId: number | null = null;

  constructor(grid: Grid, renderer: IRenderer) {
    this.grid = grid;
    this.renderer = renderer;
  }

  public start(): void {
    if (!this.isRunning) {
      this.isRunning = true;
      this.tick(); // Start the loop
      console.log("Simulation started.");
    }
  }

  public pause(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    console.log("Simulation paused.");
  }

  public reset(): void {
    this.pause();
    this.tickCount = 0;
    // For now, just clear entities. Grid re-population can be a separate method or enhancement.
    // This requires grid to have a method like clearAllEntities() or reinitialize()
    // For simplicity, let's assume we might re-initialize the grid instance or clear it manually for now.
    // For example, the main setup logic could handle creating a new grid and new simulation.
    console.log(
      "Simulation reset (tickCount to 0. Grid state to be handled by external re-initialization for now)."
    );
    // To re-render the reset state immediately:
    this.renderer.render(this.grid);
  }

  public isSimulationRunning(): boolean {
    return this.isRunning;
  }

  public getTickCount(): number {
    return this.tickCount;
  }

  // The main simulation step
  private step(): void {
    if (!this.isRunning) {
      return;
    }

    this.tickCount++;

    // Process creatures one by one
    // Iterate over a copy of the array in case creatures die and are removed during the loop
    const creatures = [...this.grid.getCreatures()];
    for (const creature of creatures) {
      // 1. Basic energy expenditure for existing
      creature.energy -= 1; // Example cost: 1 unit per tick

      // 2. Check for death
      if (creature.energy <= 0) {
        this.grid.removeEntity(creature);
        // console.log(\`Creature \${creature.symbol} starved at (\${creature.x}, \${creature.y}).\`);
        continue; // Skip to next creature
      }

      // 3. Attempt to find food and eat (simple adjacent check for now)
      // Energy cost for sensing (very basic)
      creature.energy -= 0.1;
      let ateThisTurn = false;
      const currentX = creature.x;
      const currentY = creature.y;

      // Check adjacent cells (N, E, S, W)
      const adjacentOffsets = [
        { dx: 0, dy: -1 }, // North
        { dx: 1, dy: 0 }, // East
        { dx: 0, dy: 1 }, // South
        { dx: -1, dy: 0 }, // West
      ];

      for (const offset of adjacentOffsets) {
        const foodX = currentX + offset.dx;
        const foodY = currentY + offset.dy;
        const potentialFood = this.grid.getCell(foodX, foodY);
        if (potentialFood && creature.eat(potentialFood, this.grid)) {
          ateThisTurn = true;
          break; // Ate, no need to check other adjacent cells or move this turn
        }
      }

      // 4. If didn't eat, attempt to move
      if (!ateThisTurn) {
        const nextMove = creature.getNextMove();
        if (nextMove) {
          creature.energy -= 1; // Cost for attempting to move
          const moved = this.grid.moveEntity(
            creature,
            nextMove.newX,
            nextMove.newY
          );
          if (moved) {
            creature.energy -= 2; // Additional cost for successful move
          }
        }
      }
      // Future actions: reproduce, more complex sensing, etc.
    }

    // Other non-creature updates could go here (e.g., plant growth)

    this.renderer.render(this.grid); // Render the updated grid
  }

  // Gameloop driven by requestAnimationFrame
  private tick = (): void => {
    // Use arrow function to preserve 'this' context
    if (!this.isRunning) {
      return;
    }
    this.step(); // Perform one simulation step
    this.animationFrameId = requestAnimationFrame(this.tick); // Schedule the next frame
  };
}
