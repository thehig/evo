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

      // 2. Check for death (from existing cost or previous actions)
      if (creature.energy <= 0) {
        this.grid.removeEntity(creature);
        continue; // Skip to next creature
      }

      // 3. Attempt to find food and eat
      let ateThisTurn = false;
      const foundFood = creature.findFood(this.grid); // Uses new Creature method

      // Check for death again (from sensing cost in findFood)
      if (creature.energy <= 0) {
        // It's possible the creature died from the energy cost of findFood itself
        // If it was already very low on energy.
        // findFood already checks this, but if it returned null due to death,
        // we still need to ensure removal if not already handled by findFood's internal check.
        // However, findFood currently returns null if energy <=0 *after* deduction, so creature instance is still there.
        this.grid.removeEntity(creature);
        continue;
      }

      if (foundFood) {
        if (creature.eat(foundFood, this.grid)) {
          ateThisTurn = true;
        }
        // Check for death again (from eating related costs, though eat() currently only adds energy)
        // Or if eating failed but cost energy somehow (not current model of eat())
        if (creature.energy <= 0) {
          this.grid.removeEntity(creature);
          continue;
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
