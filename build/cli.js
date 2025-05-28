var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Grid, Plant, Rock, Water, ConsoleRenderer, DietType, } from "./grid.js";
import { Simulation } from "./simulation.js";
import { CreatureFactory } from "./creatureFactory.js";
class CLISimulation {
    constructor(gridWidth = 40, gridHeight = 25) {
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        this.previousCreatureData = new Map();
        this.tickCount = 0;
        this.grid = new Grid(gridWidth, gridHeight);
        this.renderer = new ConsoleRenderer();
        this.renderer.setup(gridWidth, gridHeight, null); // p5 not needed for console
        this.simulation = new Simulation(this.grid, this.renderer);
        this.populateGrid();
    }
    populateGrid() {
        // Add environmental elements
        this.grid.addEntity(new Rock(), 5, 5);
        this.grid.addEntity(new Rock(), 5, 6);
        this.grid.addEntity(new Rock(), 15, 8);
        this.grid.addEntity(new Rock(), 25, 12);
        // Add plants for herbivores
        for (let i = 0; i < 15; i++) {
            const x = Math.floor(Math.random() * this.gridWidth);
            const y = Math.floor(Math.random() * this.gridHeight);
            if (!this.grid.getCell(x, y)) {
                this.grid.addEntity(new Plant(), x, y);
            }
        }
        // Add water sources
        this.grid.addEntity(new Water(), 10, 10);
        this.grid.addEntity(new Water(), 30, 15);
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
                const x = Math.floor(Math.random() * this.gridWidth);
                const y = Math.floor(Math.random() * this.gridHeight);
                if (!this.grid.getCell(x, y)) {
                    this.grid.addEntity(creature, x, y);
                    placed = true;
                }
                attempts++;
            }
        }
        console.log(`Population created: ${herbivores.length} herbivores, ${carnivores.length} carnivores, ${omnivores.length} omnivores`);
    }
    run() {
        return __awaiter(this, arguments, void 0, function* (maxTicks = 100) {
            console.log("=".repeat(80));
            console.log("NEURAL NETWORK EVOLUTION SIMULATOR - CLI MODE");
            console.log("=".repeat(80));
            console.log(`Grid: ${this.gridWidth}x${this.gridHeight}, Max Ticks: ${maxTicks}`);
            console.log("Legend: H=Herbivore, C=Carnivore, O=Omnivore, P=Plant, R=Rock, W=Water");
            console.log("=".repeat(80));
            // Initial render
            this.renderWithData();
            // Run simulation
            for (let tick = 0; tick < maxTicks; tick++) {
                this.simulation.manualStep();
                this.tickCount = this.simulation.getTickCount();
                // Render every few ticks or when significant changes occur
                if (tick % 5 === 0 || this.hasSignificantChanges()) {
                    console.log("\n" + "=".repeat(80));
                    console.log(`TICK ${this.tickCount}`);
                    console.log("=".repeat(80));
                    this.renderWithData();
                }
                // Check if simulation should continue
                const creatures = this.grid.getCreatures();
                if (creatures.length === 0) {
                    console.log("\n" + "=".repeat(80));
                    console.log("SIMULATION ENDED - NO CREATURES REMAINING");
                    console.log("=".repeat(80));
                    break;
                }
                // Small delay for readability
                if (process.stdout.isTTY) {
                    // Only add delay in interactive terminals
                    yield this.sleep(100);
                }
            }
            console.log("\n" + "=".repeat(80));
            console.log("SIMULATION COMPLETE");
            console.log("=".repeat(80));
            this.printFinalStats();
        });
    }
    renderWithData() {
        // Render the grid
        this.renderer.render(this.grid);
        // Show creature data and deltas
        this.showCreatureDeltas();
    }
    showCreatureDeltas() {
        const creatures = this.grid.getCreatures();
        const currentData = new Map();
        // Collect current creature data
        creatures.forEach((creature, index) => {
            const id = `${creature.symbol}-${index}`;
            const data = {
                id,
                symbol: creature.symbol,
                position: `(${creature.x},${creature.y})`,
                energy: creature.energy,
                dietType: creature.dietType,
                canReproduce: creature.canReproduce(),
                networkComplexity: creature.brain.getNeuralNetwork().getComplexity(),
            };
            currentData.set(id, data);
        });
        // Show deltas
        console.log("\nCREATURE STATUS:");
        console.log("-".repeat(80));
        if (this.previousCreatureData.size === 0) {
            // First tick - show all creatures
            currentData.forEach((data) => {
                console.log(`${data.symbol} ${data.position} E:${data.energy} ${data.dietType} ` +
                    `R:${data.canReproduce ? "Y" : "N"} C:${data.networkComplexity} [NEW]`);
            });
        }
        else {
            // Show changes
            const changes = [];
            // Check for new creatures
            currentData.forEach((current, id) => {
                const previous = this.previousCreatureData.get(id);
                if (!previous) {
                    changes.push(`${current.symbol} ${current.position} E:${current.energy} ` +
                        `${current.dietType} R:${current.canReproduce ? "Y" : "N"} ` +
                        `C:${current.networkComplexity} [BORN]`);
                }
                else {
                    // Check for significant changes
                    const energyDelta = current.energy - previous.energy;
                    const positionChanged = current.position !== previous.position;
                    const reproductionChanged = current.canReproduce !== previous.canReproduce;
                    if (Math.abs(energyDelta) > 5 ||
                        positionChanged ||
                        reproductionChanged) {
                        let changeStr = `${current.symbol} ${current.position}`;
                        if (Math.abs(energyDelta) > 5) {
                            changeStr += ` E:${current.energy}(${energyDelta > 0 ? "+" : ""}${energyDelta})`;
                        }
                        else {
                            changeStr += ` E:${current.energy}`;
                        }
                        if (positionChanged) {
                            changeStr += ` [MOVED]`;
                        }
                        if (reproductionChanged) {
                            changeStr += ` R:${current.canReproduce ? "Y" : "N"}`;
                        }
                        changes.push(changeStr);
                    }
                }
            });
            // Check for dead creatures
            this.previousCreatureData.forEach((previous, id) => {
                if (!currentData.has(id)) {
                    changes.push(`${previous.symbol} ${previous.position} [DIED]`);
                }
            });
            if (changes.length === 0) {
                console.log("No significant changes this tick.");
            }
            else {
                changes.forEach((change) => console.log(change));
            }
        }
        // Show summary stats
        const herbivores = creatures.filter((c) => c.dietType === DietType.HERBIVORE).length;
        const carnivores = creatures.filter((c) => c.dietType === DietType.CARNIVORE).length;
        const omnivores = creatures.filter((c) => c.dietType === DietType.OMNIVORE).length;
        const plants = this.grid
            .getEntities()
            .filter((e) => e.type === "Plant").length;
        console.log("-".repeat(80));
        console.log(`Population: H:${herbivores} C:${carnivores} O:${omnivores} | Plants: ${plants}`);
        // Update previous data
        this.previousCreatureData = currentData;
    }
    hasSignificantChanges() {
        const creatures = this.grid.getCreatures();
        // Always show if population changed
        if (creatures.length !== this.previousCreatureData.size) {
            return true;
        }
        // Check for significant energy changes or movements
        for (let i = 0; i < creatures.length; i++) {
            const creature = creatures[i];
            const id = `${creature.symbol}-${i}`;
            const previous = this.previousCreatureData.get(id);
            if (previous) {
                const energyDelta = Math.abs(creature.energy - previous.energy);
                const positionChanged = `(${creature.x},${creature.y})` !== previous.position;
                if (energyDelta > 10 || positionChanged) {
                    return true;
                }
            }
        }
        return false;
    }
    printFinalStats() {
        const creatures = this.grid.getCreatures();
        const plants = this.grid
            .getEntities()
            .filter((e) => e.type === "Plant").length;
        console.log(`Final Population: ${creatures.length} creatures, ${plants} plants`);
        if (creatures.length > 0) {
            const avgEnergy = creatures.reduce((sum, c) => sum + c.energy, 0) / creatures.length;
            const avgComplexity = creatures.reduce((sum, c) => sum + c.brain.getNeuralNetwork().getComplexity(), 0) / creatures.length;
            console.log(`Average Energy: ${avgEnergy.toFixed(1)}`);
            console.log(`Average Neural Network Complexity: ${avgComplexity.toFixed(1)}`);
            const dietCounts = {
                [DietType.HERBIVORE]: 0,
                [DietType.CARNIVORE]: 0,
                [DietType.OMNIVORE]: 0,
                [DietType.UNKNOWN]: 0,
            };
            creatures.forEach((c) => {
                if (c.dietType in dietCounts) {
                    dietCounts[c.dietType]++;
                }
            });
            console.log(`Diet Distribution: H:${dietCounts[DietType.HERBIVORE]} C:${dietCounts[DietType.CARNIVORE]} O:${dietCounts[DietType.OMNIVORE]}`);
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
// CLI entry point
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const args = process.argv.slice(2);
        const maxTicks = args.length > 0 ? parseInt(args[0]) || 100 : 100;
        const width = args.length > 1 ? parseInt(args[1]) || 40 : 40;
        const height = args.length > 2 ? parseInt(args[2]) || 25 : 25;
        console.log(`Starting CLI simulation with ${maxTicks} ticks on ${width}x${height} grid...`);
        const cliSim = new CLISimulation(width, height);
        yield cliSim.run(maxTicks);
    });
}
// Run the CLI
main().catch(console.error);
export { CLISimulation };
