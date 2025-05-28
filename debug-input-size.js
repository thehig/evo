// Manual calculation of input size to debug the mismatch

// Test configuration from the failing tests
const testConfig = {
  vision: {
    range: 1,
    maxDistance: 2.0,
    includeDiagonals: true,
  },
  memory: {
    energyHistorySize: 5,
    actionHistorySize: 3,
    encounterHistorySize: 4,
    signalHistorySize: 3,
  },
};

console.log("Test config:", testConfig);

// Manual calculation of vision cells (same logic as SensorySystem.calculateVisionCells)
function calculateVisionCells(visionConfig) {
  const range = visionConfig.range;
  let cellCount = 0;

  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      // Skip center cell (creature's own position)
      if (dx === 0 && dy === 0) {
        continue;
      }

      // Skip diagonal cells if not included
      if (!visionConfig.includeDiagonals && dx !== 0 && dy !== 0) {
        continue;
      }

      // Calculate distance and check if within maxDistance
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > visionConfig.maxDistance) {
        continue; // Too far to see
      }

      cellCount++;
      console.log(
        `Vision cell (${dx}, ${dy}): distance ${distance.toFixed(2)}`
      );
    }
  }

  return cellCount;
}

// Manual calculation of input size (same logic as SensorySystem.calculateInputSize)
function calculateInputSize(visionConfig, memoryConfig) {
  // Basic state inputs
  let inputSize = 6; // energy, age, positionX, positionY, hunger, currentSignal

  // Vision inputs (5 values per vision cell)
  const visionCells = calculateVisionCells(visionConfig);
  inputSize += visionCells * 5;

  // Memory inputs
  inputSize += memoryConfig.energyHistorySize - 1; // Energy changes
  inputSize += memoryConfig.actionHistorySize; // Recent actions
  inputSize += memoryConfig.encounterHistorySize; // Recent encounters
  inputSize += memoryConfig.signalHistorySize; // Recent signals

  return inputSize;
}

// Calculate expected input size
const expectedInputSize = calculateInputSize(
  testConfig.vision,
  testConfig.memory
);

console.log("\nExpected input size:", expectedInputSize);

// Break down the calculation
console.log("\nBreakdown:");
console.log("Basic state inputs: 6"); // energy, age, positionX, positionY, hunger, currentSignal

const visionCells = calculateVisionCells(testConfig.vision);
console.log(`Vision cells: ${visionCells}`);
console.log(`Vision inputs: ${visionCells * 5} (5 values per cell)`);

console.log(
  `Energy history: ${testConfig.memory.energyHistorySize - 1} (changes)`
);
console.log(`Action history: ${testConfig.memory.actionHistorySize}`);
console.log(`Encounter history: ${testConfig.memory.encounterHistorySize}`);
console.log(`Signal history: ${testConfig.memory.signalHistorySize}`);

const totalMemory =
  testConfig.memory.energyHistorySize -
  1 +
  testConfig.memory.actionHistorySize +
  testConfig.memory.encounterHistorySize +
  testConfig.memory.signalHistorySize;

console.log(`Total memory inputs: ${totalMemory}`);

const totalCalculated = 6 + visionCells * 5 + totalMemory;
console.log(`Total calculated: ${totalCalculated}`);

// Now let's see what the actual vision generation produces
console.log("\n--- Simulating actual vision generation ---");
const range = testConfig.vision.range;
let actualVisionCells = 0;

for (let dy = -range; dy <= range; dy++) {
  for (let dx = -range; dx <= range; dx++) {
    // Skip center cell
    if (dx === 0 && dy === 0) {
      continue;
    }

    // Skip diagonal cells if not included
    if (!testConfig.vision.includeDiagonals && dx !== 0 && dy !== 0) {
      continue;
    }

    // Calculate distance and check if within maxDistance
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > testConfig.vision.maxDistance) {
      console.log(
        `Cell (${dx}, ${dy}): distance ${distance.toFixed(2)} > ${
          testConfig.vision.maxDistance
        } - SKIPPED`
      );
      continue;
    }

    actualVisionCells++;
    console.log(
      `Cell (${dx}, ${dy}): distance ${distance.toFixed(2)} - INCLUDED`
    );
  }
}

console.log(`\nActual vision cells: ${actualVisionCells}`);
console.log(`Should match calculated: ${visionCells}`);

// Test with different memory states to see what might cause size differences
console.log("\n--- Testing memory state effects ---");
console.log("Empty memory arrays:");
const emptyEnergyHistory = [];
const emptyActionHistory = [];
const emptyEncounterHistory = [];
const emptySignalHistory = [];

console.log(
  `Energy changes from empty history: ${Math.max(
    0,
    emptyEnergyHistory.length - 1
  )}`
);
console.log(`Action history length: ${emptyActionHistory.length}`);
console.log(`Encounter history length: ${emptyEncounterHistory.length}`);
console.log(`Signal history length: ${emptySignalHistory.length}`);

console.log("\nPartially filled memory arrays:");
const partialEnergyHistory = [0.8, 0.7]; // 1 change
const partialActionHistory = [0]; // 1 action
const partialEncounterHistory = [0, 1]; // 2 encounters
const partialSignalHistory = [0.5]; // 1 signal

console.log(
  `Energy changes from partial history: ${Math.max(
    0,
    partialEnergyHistory.length - 1
  )}`
);
console.log(`Action history length: ${partialActionHistory.length}`);
console.log(`Encounter history length: ${partialEncounterHistory.length}`);
console.log(`Signal history length: ${partialSignalHistory.length}`);

const partialMemoryInputs =
  Math.max(0, partialEnergyHistory.length - 1) +
  partialActionHistory.length +
  partialEncounterHistory.length +
  partialSignalHistory.length;

console.log(`Total partial memory inputs: ${partialMemoryInputs}`);
console.log(
  `Total with partial memory: ${6 + visionCells * 5 + partialMemoryInputs}`
);
