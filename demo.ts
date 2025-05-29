#!/usr/bin/env node

/**
 * Demo Script for Neural Evolution Simulator
 *
 * This script demonstrates the simulation system by running a basic scenario
 * and showing real-time progress in the console.
 */

import {
  TrainingSimulator,
  ITrainingSimulatorConfig,
  ScenarioManager,
  ScenarioType,
  ScenarioDifficulty,
} from "./src/simulation/index.js";
import {
  SelectionMethod,
  CrossoverMethod,
  MutationMethod,
} from "./src/genetic/index.js";

async function runDemo() {
  console.log("🧬 Neural Evolution Simulator Demo");
  console.log("===================================\n");

  try {
    // Get a basic survival scenario
    console.log("📋 Setting up Basic Survival Scenario...");
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
    const config: ITrainingSimulatorConfig = {
      seed: 12345,
      tickRate: 10, // Fast for demo
      maxTicks: 0,
      pauseOnError: true,
      geneticAlgorithm: {
        populationSize: 20, // Small population for demo
        maxGenerations: 5, // Few generations for quick demo
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
    const updateInterval = 2000; // Update every 2 seconds

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
        const bestIndividual = simulator.getBestIndividual();

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
    }, 500);

    // Start training and wait for completion
    await simulator.startTraining();

    // Clear the interval
    clearInterval(progressInterval);

    // Show final results
    const finalProgress = simulator.trainingProgress;
    const bestIndividual = simulator.getBestIndividual();

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
      const bestCreature = simulator.creatures[0]; // First creature is typically best after evolution
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
    console.log(
      "🔍 You can modify the scenario type, difficulty, or genetic algorithm parameters to see different behaviors."
    );
  } catch (error) {
    console.error("❌ Demo failed:", error);
    console.error(
      "Error details:",
      error instanceof Error ? error.message : String(error)
    );
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

// Run the demo automatically when script is executed
runDemo().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

export { runDemo };
