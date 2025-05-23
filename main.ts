import {
  Grid,
  Plant,
  Rock,
  Water,
  Creature,
  P5CanvasRenderer,
} from "./grid.js"; // Note .js extension for browser ES modules

document.addEventListener("DOMContentLoaded", () => {
  console.log(
    "DOM fully loaded and parsed. Initializing P5 Canvas Renderer..."
  );

  const cellSize = 20;
  const gridWidth = 20; // Example grid size
  const gridHeight = 10; // Example grid size

  const gameGrid = new Grid(gridWidth, gridHeight);

  // Populate the grid with some entities
  gameGrid.setCell(1, 1, new Plant());
  gameGrid.setCell(3, 3, new Rock());
  gameGrid.setCell(5, 5, new Water());
  gameGrid.setCell(2, 2, new Creature("C1", "#FF69B4")); // Hot pink creature
  gameGrid.setCell(8, 1, new Creature("C2", "#00CED1")); // Dark turquoise creature
  gameGrid.setCell(gridWidth - 1, gridHeight - 1, new Rock());

  const canvasWidth = gridWidth * cellSize;
  const canvasHeight = gridHeight * cellSize;

  // Create and use the P5CanvasRenderer
  // The P5CanvasRenderer constructor will create the p5 instance and canvas
  try {
    const p5Renderer = new P5CanvasRenderer(
      canvasWidth,
      canvasHeight,
      "canvas-container"
    );
    p5Renderer.setCellSize(cellSize);
    p5Renderer.render(gameGrid); // Assign the grid to the renderer
    console.log("P5CanvasRenderer initialized and grid assigned.");
  } catch (error) {
    console.error("Failed to initialize P5CanvasRenderer:", error);
    const container = document.getElementById("canvas-container");
    if (container) {
      container.innerHTML =
        "<p style='color:red;'>Error initializing p5.js canvas. See console for details.</p>";
    }
  }
});
