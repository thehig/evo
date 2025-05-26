import { Grid, Creature, IRenderer } from "./grid";

export class Simulation {
  private grid: Grid;
  private renderer: IRenderer;
  private isRunning: boolean = false;
  private tickCount: number = 0;
  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;
  public simulationSpeed: number = 100; // Milliseconds per tick
  private newlyBornCreatures: Creature[] = []; // Added for reproduction

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
    if (!this.isRunning) return;

    // console.log(`Tick: ${this.tickCount}`);

    const creatures = [...this.grid.getCreatures()]; // Operate on a copy for consistent behavior during the tick

    // 1. Process existing creatures (energy, feeding, movement, reproduction attempts)
    for (const creature of creatures) {
      // Base metabolic cost
      creature.energy -= 1; // Example cost, can be tuned

      // Decrement reproduction cooldown
      if (creature.ticksUntilReadyToReproduce > 0) {
        creature.ticksUntilReadyToReproduce--;
      }

      if (creature.energy <= 0) {
        this.grid.removeEntity(creature);
        // console.log(`Creature ${creature.symbol} died of starvation.`);
        continue; // Skip further actions for this creature
      }

      let ateThisTurn = false;
      // Attempt to find and eat food in adjacent cells first
      const foodFound = creature.findFood(this.grid);
      if (foodFound) {
        if (creature.eat(foodFound, this.grid)) {
          // console.log(`Creature ${creature.symbol} ate ${foodFound.symbol}`);
          ateThisTurn = true;
        }
      }

      // If didn't eat, try to move
      if (!ateThisTurn) {
        // Cost for attempting to move (even if no valid move is found or move fails)
        creature.energy -= 1; // Example cost for thinking about moving
        if (creature.energy <= 0) {
          this.grid.removeEntity(creature);
          // console.log(
          //   `Creature ${creature.symbol} died after attempting to move.`
          // );
          continue;
        }

        const move = creature.getNextMove();
        if (move) {
          if (this.grid.moveEntity(creature, move.newX, move.newY)) {
            // console.log(
            //   `Creature ${creature.symbol} moved to (${move.newX}, ${move.newY})`
            // );
            // Cost for successful move
            creature.energy -= 2; // Example cost, can be tuned
            if (creature.energy <= 0) {
              this.grid.removeEntity(creature);
              // console.log(
              //   `Creature ${creature.symbol} died after successful move.`
              // );
              continue;
            }
          } else {
            // console.log(
            //   `Creature ${creature.symbol} failed to move to (${move.newX}, ${move.newY})`
            // );
          }
        }
      }

      // Attempt reproduction
      // Check energy again, as previous actions might have reduced it
      if (creature.energy > 0) {
        // Ensure creature is still alive
        const offspring = creature.attemptReproduction(this.grid);
        if (offspring) {
          this.newlyBornCreatures.push(offspring);
          // console.log(
          //   `Creature ${creature.symbol} produced offspring ${offspring.symbol} at (${offspring.x}, ${offspring.y})`
          // );
        }
      }
    }

    // 2. Add newly born creatures to the grid
    // This is done after iterating through the original list of creatures
    // to avoid modifying the list while iterating and to ensure they act next tick.
    // Note: The `attemptReproduction` already adds the offspring to the grid if successful.
    // So, we just need to clear the temporary list, or ensure they are part of the main entity list for next tick.
    // The current `grid.addEntity` in `Creature.procreate` handles adding them to the grid's internal entity list.
    // We might not need to explicitly add them here if `grid.getCreatures()` will pick them up next round.
    // However, if `grid.getCreatures()` is based on a snapshot, we might need to ensure they are added to that snapshot source.
    // For now, `grid.addEntity` should suffice. The `newlyBornCreatures` array can be used for logging or future batch operations.
    if (this.newlyBornCreatures.length > 0) {
      // console.log(`${this.newlyBornCreatures.length} offspring born this tick.`);
      this.newlyBornCreatures = []; // Clear for next tick
    }

    this.tickCount++;
    this.renderer.render(this.grid);
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
