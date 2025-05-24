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
    // console.log(`Simulation Tick: ${this.tickCount}`);

    const creatures = this.grid.getCreatures();
    for (const creature of creatures) {
      const nextMove = creature.getNextMove();
      if (nextMove) {
        // console.log(`Creature ${creature.symbol} at (${creature.x}, ${creature.y}) wants to move to (${nextMove.newX}, ${nextMove.newY})`);
        const moved = this.grid.moveEntity(
          creature,
          nextMove.newX,
          nextMove.newY
        );
        // if (moved) {
        //   console.log(`Creature ${creature.symbol} moved to (${creature.x}, ${creature.y})`);
        // } else {
        //   console.log(`Creature ${creature.symbol} move failed.`);
        // }
      }
      // Future actions: eat, reproduce, etc.
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
