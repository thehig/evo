import p5 from "p5";
import { Grid, Plant, Rock, Water, P5CanvasRenderer, DietType, } from "./grid.js"; // Note .js extension for browser ES modules
import { Simulation } from "./simulation";
import { CreatureFactory } from "./creatureFactory";
const sketch = (p) => {
    const GRID_WIDTH = 40;
    const GRID_HEIGHT = 25;
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 500;
    let grid;
    let renderer; // Or ConsoleRenderer
    let simulation;
    function populateGrid() {
        // Add environmental elements
        grid.addEntity(new Rock(), 5, 5);
        grid.addEntity(new Rock(), 5, 6);
        grid.addEntity(new Rock(), 15, 8);
        grid.addEntity(new Rock(), 25, 12);
        // Add plants for herbivores
        for (let i = 0; i < 15; i++) {
            const x = Math.floor(Math.random() * GRID_WIDTH);
            const y = Math.floor(Math.random() * GRID_HEIGHT);
            if (!grid.getCell(x, y)) {
                grid.addEntity(new Plant(), x, y);
            }
        }
        // Add water sources
        grid.addEntity(new Water(), 10, 10);
        grid.addEntity(new Water(), 30, 15);
        // Create neural network-based creatures
        const herbivores = CreatureFactory.createSpeciesPopulation(3, DietType.HERBIVORE, 0.3);
        const carnivores = CreatureFactory.createSpeciesPopulation(2, DietType.CARNIVORE, 0.5);
        const omnivores = CreatureFactory.createSpeciesPopulation(2, DietType.OMNIVORE, 0.7);
        // Place creatures randomly
        const allCreatures = [...herbivores, ...carnivores, ...omnivores];
        for (const creature of allCreatures) {
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 50) {
                const x = Math.floor(Math.random() * GRID_WIDTH);
                const y = Math.floor(Math.random() * GRID_HEIGHT);
                if (!grid.getCell(x, y)) {
                    grid.addEntity(creature, x, y);
                    placed = true;
                }
                attempts++;
            }
        }
        console.log(`Population created: ${herbivores.length} herbivores, ${carnivores.length} carnivores, ${omnivores.length} omnivores`);
    }
    p.setup = () => {
        grid = new Grid(GRID_WIDTH, GRID_HEIGHT);
        // renderer = new ConsoleRenderer(); // For console output
        renderer = new P5CanvasRenderer(); // For p5 canvas output
        renderer.setup(GRID_WIDTH, GRID_HEIGHT, p, CANVAS_WIDTH, CANVAS_HEIGHT);
        simulation = new Simulation(grid, renderer);
        // Initial population with neural network creatures
        populateGrid();
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
            // Re-populate with neural network creatures
            populateGrid();
            simulation = new Simulation(grid, renderer); // Create new simulation with new grid
            renderer.render(grid); // Render the fresh grid
            // The simulation is reset to a paused state, user needs to press start.
            // Or, call simulation.start() here if auto-start after reset is desired.
            console.log("Grid reset and re-populated with neural network creatures. Simulation ready to start.");
        });
        const stepButton = p.createButton("Step");
        stepButton.mousePressed(() => {
            if (!simulation.isSimulationRunning()) {
                simulation.manualStep();
            }
            // If simulation is running, Step button does nothing
        });
        // Add button to add more plants during simulation
        const addPlantsButton = p.createButton("Add Plants");
        addPlantsButton.mousePressed(() => {
            for (let i = 0; i < 5; i++) {
                const x = Math.floor(Math.random() * GRID_WIDTH);
                const y = Math.floor(Math.random() * GRID_HEIGHT);
                if (!grid.getCell(x, y)) {
                    grid.addEntity(new Plant(), x, y);
                }
            }
            console.log("Added 5 new plants to the ecosystem");
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
