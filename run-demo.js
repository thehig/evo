#!/usr/bin/env node

/**
 * Demo Script for Neural Evolution Simulator (JavaScript)
 *
 * This script demonstrates the simulation system by running a basic scenario
 * and showing real-time progress in the console.
 */

console.log("🧬 Neural Evolution Simulator Demo");
console.log("===================================\n");

async function runSimpleDemo() {
  try {
    // Import the built module
    const {
      TrainingSimulator,
      ScenarioManager,
      ScenarioType,
      ScenarioDifficulty,
      SelectionMethod,
      CrossoverMethod,
      MutationMethod,
    } = await import("./dist/neural-evolution-simulator.js");

    console.log("📋 Setting up Basic Survival Scenario...");

    // Get a basic survival scenario
    const scenario = ScenarioManager.getScenario(
      ScenarioType.SURVIVAL,
      ScenarioDifficulty.EASY
    );

    console.log(`📝 Scenario: ${scenario.name}`);
    console.log(`📖 Description: ${scenario.description}`);
    console.log(
      `🌍 World Size: ${scenario.worldConfig.width}x${scenario.worldConfig.height}`
    );
    console.log(`⚡ Max Simulation Ticks: ${scenario.maxSimulationTicks}`);
    console.log(
      `🧠 Neural Network: ${scenario.neuralNetworkConfig.inputSize} inputs → ${scenario.neuralNetworkConfig.hiddenLayers.length} hidden layers → ${scenario.neuralNetworkConfig.outputLayer.size} outputs\n`
    );

    // Create training simulator configuration
    const config = {
      seed: 12345,
      tickRate: 10, // Fast for demo
      maxTicks: 0,
      pauseOnError: true,
      geneticAlgorithm: {
        populationSize: 10, // Small population for demo
        maxGenerations: 3, // Few generations for quick demo
        elitismRate: 0.2,
        seed: 12345,
        selection: {
          method: SelectionMethod.TOURNAMENT,
          tournamentSize: 3,
        },
        crossover: {
          method: CrossoverMethod.SINGLE_POINT,
          rate: 0.8,
        },
        mutation: {
          method: MutationMethod.GAUSSIAN,
          rate: 0.15,
          magnitude: 0.2,
        },
      },
      scenario,
      autoAdvanceGenerations: true,
      saveInterval: 0, // No saving for demo
    };

    console.log("⚙️ Training Configuration:");
    console.log(
      `👥 Population Size: ${config.geneticAlgorithm.populationSize}`
    );
    console.log(
      `🔄 Max Generations: ${config.geneticAlgorithm.maxGenerations}`
    );
    console.log(`🧬 Mutation Rate: ${config.geneticAlgorithm.mutation.rate}`);
    console.log(
      `🔗 Crossover Rate: ${config.geneticAlgorithm.crossover.rate}\n`
    );

    // Create and start simulator
    console.log("🚀 Starting Training Simulator...\n");
    const simulator = new TrainingSimulator(config);

    // Set up progress monitoring
    let lastUpdate = Date.now();
    const updateInterval = 3000; // Update every 3 seconds

    const progressInterval = setInterval(() => {
      if (!simulator.isTraining) {
        clearInterval(progressInterval);
        return;
      }

      const progress = simulator.trainingProgress;
      const now = Date.now();

      if (now - lastUpdate >= updateInterval) {
        const currentStats =
          progress.generationStats[progress.generationStats.length - 1];

        console.log(
          `📊 Generation ${progress.currentGeneration}/${progress.totalGenerations}`
        );
        console.log(
          `   Best Fitness Overall: ${progress.bestOverallFitness.toFixed(3)}`
        );
        if (currentStats) {
          console.log(
            `   Current Best: ${currentStats.bestFitness.toFixed(3)}`
          );
          console.log(
            `   Population Average: ${currentStats.averageFitness.toFixed(3)}`
          );
          console.log(`   Simulation Ticks: ${currentStats.simulationTicks}`);
          console.log(
            `   Survival Rate: ${(currentStats.survivalRate * 100).toFixed(1)}%`
          );
        }
        console.log(
          `   Creatures Alive: ${simulator.creatures.length}/${config.geneticAlgorithm.populationSize}`
        );
        console.log("   ───────────────────────────────");
        lastUpdate = now;
      }
    }, 1000);

    // Start training and wait for completion
    console.log("🔄 Starting evolution...\n");
    await simulator.startTraining();

    // Clear the interval
    clearInterval(progressInterval);

    // Show final results
    const finalProgress = simulator.trainingProgress;

    console.log("\n🎉 Training Complete!");
    console.log("==================");
    console.log(
      `🏆 Final Best Fitness: ${finalProgress.bestOverallFitness.toFixed(3)}`
    );
    console.log(`📈 Total Generations: ${finalProgress.currentGeneration}`);
    console.log(
      `⏱️ Total Training Time: ${finalProgress.elapsedTime.toFixed(2)}ms`
    );
    console.log(
      `🧬 Evolution Progress: ${(
        (finalProgress.bestOverallFitness / 100) *
        100
      ).toFixed(1)}% estimated efficiency`
    );

    // Show best creature info if available
    if (simulator.creatures.length > 0) {
      const bestCreature = simulator.creatures[0];
      console.log("\n🥇 Best Creature:");
      console.log(`   Energy: ${bestCreature.energy.toFixed(1)}`);
      console.log(`   Age: ${bestCreature.age}`);
      console.log(
        `   Position: (${bestCreature.position.x}, ${bestCreature.position.y})`
      );
    }

    // Show generation statistics
    if (finalProgress.generationStats.length > 0) {
      console.log("\n📈 Evolution Progress:");
      finalProgress.generationStats.forEach((stats, gen) => {
        console.log(
          `   Gen ${gen + 1}: Best ${stats.bestFitness.toFixed(
            2
          )}, Avg ${stats.averageFitness.toFixed(2)}, Survival ${(
            stats.survivalRate * 100
          ).toFixed(1)}%`
        );
      });
    }

    console.log("\n✅ Demo completed successfully!");
    console.log("🔍 Try different scenarios:");
    console.log("   - SURVIVAL: Focus on staying alive");
    console.log("   - EXPLORATION: Discover new areas");
    console.log("   - ENERGY_EFFICIENCY: Optimize resource usage");
    console.log("   - MOVEMENT_OPTIMIZATION: Learn efficient movement");
  } catch (error) {
    console.error("❌ Demo failed:", error);
    console.error("Error details:", error.message || String(error));

    if (error.message && error.message.includes("Cannot resolve module")) {
      console.error("\n💡 Try running: npm run build");
      console.error("   This will generate the required dist files.");
    }
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n⚠️ Demo interrupted by user");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n⚠️ Demo terminated");
  process.exit(0);
});

// Run the demo
runSimpleDemo().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
