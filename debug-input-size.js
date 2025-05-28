// Debug script to calculate input sizes
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

function calculateVisionCells(visionConfig) {
  const range = visionConfig.range;
  const totalCells = (range * 2 + 1) ** 2 - 1; // Exclude center cell

  if (visionConfig.includeDiagonals) {
    return totalCells;
  } else {
    // Only orthogonal cells
    return range * 4;
  }
}

// Test configurations
const visionConfig = { range: 2, maxDistance: 3.0, includeDiagonals: true };
const memoryConfig = {
  energyHistorySize: 10,
  actionHistorySize: 5,
  encounterHistorySize: 8,
  signalHistorySize: 6,
};

console.log("Vision config:", visionConfig);
console.log("Memory config:", memoryConfig);
console.log("Vision cells:", calculateVisionCells(visionConfig));
console.log(
  "Expected input size:",
  calculateInputSize(visionConfig, memoryConfig)
);

// Break down the calculation
console.log("\nBreakdown:");
console.log("Basic state inputs: 6");
console.log(
  "Vision cells:",
  calculateVisionCells(visionConfig),
  "* 5 =",
  calculateVisionCells(visionConfig) * 5
);
console.log("Energy changes:", memoryConfig.energyHistorySize - 1);
console.log("Recent actions:", memoryConfig.actionHistorySize);
console.log("Recent encounters:", memoryConfig.encounterHistorySize);
console.log("Recent signals:", memoryConfig.signalHistorySize);
console.log(
  "Total:",
  6 +
    calculateVisionCells(visionConfig) * 5 +
    (memoryConfig.energyHistorySize - 1) +
    memoryConfig.actionHistorySize +
    memoryConfig.encounterHistorySize +
    memoryConfig.signalHistorySize
);

// Reverse engineer what would give 127 inputs
console.log("\n--- Reverse engineering 127 inputs ---");
const targetInputs = 127;
const basicInputs = 6;
const memoryInputs =
  memoryConfig.energyHistorySize -
  1 +
  memoryConfig.actionHistorySize +
  memoryConfig.encounterHistorySize +
  memoryConfig.signalHistorySize;
console.log("Memory inputs:", memoryInputs);
const visionInputsNeeded = targetInputs - basicInputs - memoryInputs;
console.log("Vision inputs needed:", visionInputsNeeded);
const visionCellsNeeded = visionInputsNeeded / 5;
console.log("Vision cells needed:", visionCellsNeeded);

// Try different range values
for (let range = 1; range <= 4; range++) {
  const cells = (range * 2 + 1) ** 2 - 1;
  const cellsOrthogonal = range * 4;
  console.log(
    `Range ${range}: ${cells} cells (diagonal), ${cellsOrthogonal} cells (orthogonal)`
  );
}
