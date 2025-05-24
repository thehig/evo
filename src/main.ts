import p5 from "p5";
import {
  Grid,
  Plant,
  Rock,
  Water,
  Creature,
  P5CanvasRenderer,
  ConsoleRenderer,
} from "./grid.js"; // Note .js extension for browser ES modules
import { Simulation } from "./simulation";

const sketch = (p: p5) => {
  const GRID_WIDTH = 40;
  const GRID_HEIGHT = 25;
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 500;

  let grid: Grid;
  let renderer: P5CanvasRenderer; // Or ConsoleRenderer
  let simulation: Simulation;

  p.setup = () => {
    grid = new Grid(GRID_WIDTH, GRID_HEIGHT);
    // renderer = new ConsoleRenderer(); // For console output
    renderer = new P5CanvasRenderer(); // For p5 canvas output
    renderer.setup(GRID_WIDTH, GRID_HEIGHT, p, CANVAS_WIDTH, CANVAS_HEIGHT);

    simulation = new Simulation(grid, renderer);

    // Initial population
    grid.addEntity(new Rock(), 5, 5);
    grid.addEntity(new Rock(), 5, 6);
    grid.addEntity(new Plant(), 10, 10);
    const c1 = Creature.fromSeed("H1VD123", 1, 1);
    if (c1) grid.addEntity(c1, 1, 1);
    const c2 = Creature.fromSeed("C2SN311", 15, 15);
    if (c2) grid.addEntity(c2, 15, 15);
    const c3 = Creature.fromSeed("O3ED500", 20, 5);
    if (c3) grid.addEntity(c3, 20, 5);

    // Render initial state once before simulation starts its loop
    renderer.render(grid);

    // Setup UI controls (example)
    const startButton = p.createButton("Start");
    startButton.mousePressed(() => simulation.start());

    const pauseButton = p.createButton("Pause");
    pauseButton.mousePressed(() => simulation.pause());

    const resetButton = p.createButton("Reset");
    resetButton.mousePressed(() => {
      // For reset, we might need to re-initialize grid entities or the grid itself
      // A simple reset for now, then re-add initial entities:
      grid = new Grid(GRID_WIDTH, GRID_HEIGHT); // Create new grid
      // Re-populate (same as initial population)
      grid.addEntity(new Rock(), 5, 5);
      grid.addEntity(new Rock(), 5, 6);
      grid.addEntity(new Plant(), 10, 10);
      const c1_reset = Creature.fromSeed("H1VD123", 1, 1);
      if (c1_reset) grid.addEntity(c1_reset, 1, 1);
      const c2_reset = Creature.fromSeed("C2SN311", 15, 15);
      if (c2_reset) grid.addEntity(c2_reset, 15, 15);
      const c3_reset = Creature.fromSeed("O3ED500", 20, 5);
      if (c3_reset) grid.addEntity(c3_reset, 20, 5);

      simulation = new Simulation(grid, renderer); // Create new simulation with new grid
      renderer.render(grid); // Render the fresh grid
      // The simulation is reset to a paused state, user needs to press start.
      // Or, call simulation.start() here if auto-start after reset is desired.
      console.log("Grid reset and re-populated. Simulation ready to start.");
    });

    // simulation.start(); // Auto-start the simulation if desired
  };

  // p5.js draw loop - might be empty or used for UI updates not tied to simulation ticks
  // as the Simulation class now manages its own rendering loop via requestAnimationFrame.
  p.draw = () => {
    // The P5CanvasRenderer is called by the Simulation's internal loop.
    // So, this p.draw() might not need to do anything for the grid rendering itself.
    // It could be used for other p5.js specific drawing tasks if needed (e.g. UI overlays).
    // p.background(200); // Example: if you want p5 to clear canvas every frame by itself
    // renderer.render(grid); // This would cause double rendering if simulation is running
  };
};

// Attach the sketch to a new p5 instance
new p5(sketch);
