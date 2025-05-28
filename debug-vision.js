// Debug script to test vision generation
function calculateVisionCells(visionConfig) {
  const range = visionConfig.range;
  let cellCount = 0;

  console.log(
    `Testing vision with range ${range}, maxDistance ${visionConfig.maxDistance}, diagonals: ${visionConfig.includeDiagonals}`
  );

  // Simulate the same logic as generateVisionData
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
      console.log(`Cell (${dx}, ${dy}): distance = ${distance.toFixed(2)}`);

      if (distance > visionConfig.maxDistance) {
        console.log(`  -> Skipped (too far)`);
        continue; // Too far to see
      }

      console.log(`  -> Included`);
      cellCount++;
    }
  }

  return cellCount;
}

// Test with default configuration
const visionConfig = { range: 2, maxDistance: 3.0, includeDiagonals: true };
const cellCount = calculateVisionCells(visionConfig);
console.log(`\nTotal vision cells: ${cellCount}`);

// Calculate what this would give for input size
const memoryConfig = {
  energyHistorySize: 10,
  actionHistorySize: 5,
  encounterHistorySize: 8,
  signalHistorySize: 6,
};
const basicInputs = 6;
const visionInputs = cellCount * 5;
const memoryInputs =
  memoryConfig.energyHistorySize -
  1 +
  memoryConfig.actionHistorySize +
  memoryConfig.encounterHistorySize +
  memoryConfig.signalHistorySize;
const totalInputs = basicInputs + visionInputs + memoryInputs;

console.log(`\nInput size breakdown:`);
console.log(`Basic inputs: ${basicInputs}`);
console.log(`Vision inputs: ${cellCount} * 5 = ${visionInputs}`);
console.log(`Memory inputs: ${memoryInputs}`);
console.log(`Total: ${totalInputs}`);
