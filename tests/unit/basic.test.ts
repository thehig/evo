import { describe, it, expect } from "vitest";
import { VERSION, NeuralEvolutionSimulator } from "@/index.js";

describe("Basic Project Setup", () => {
  it("should have correct version", () => {
    expect(VERSION).toBe("0.1.0");
  });

  it("should create simulator instance", () => {
    const simulator = new NeuralEvolutionSimulator();
    expect(simulator).toBeInstanceOf(NeuralEvolutionSimulator);
  });

  it("should export module versions", async () => {
    const { CORE_MODULE_VERSION } = await import("@/core/index.js");
    const { SIMULATION_MODULE_VERSION } = await import("@/simulation/index.js");
    const { NEURAL_MODULE_VERSION } = await import("@/neural/index.js");
    const { GENETIC_MODULE_VERSION } = await import("@/genetic/index.js");
    const { WORLD_MODULE_VERSION } = await import("@/world/index.js");
    const { PERSISTENCE_MODULE_VERSION } = await import(
      "@/persistence/index.js"
    );
    const { RENDERER_MODULE_VERSION } = await import("@/renderer/index.js");
    const { TYPES_MODULE_VERSION } = await import("@/types/index.js");
    const { UTILS_MODULE_VERSION } = await import("@/utils/index.js");

    expect(CORE_MODULE_VERSION).toBe("0.1.0");
    expect(SIMULATION_MODULE_VERSION).toBe("0.1.0");
    expect(NEURAL_MODULE_VERSION).toBe("0.1.0");
    expect(GENETIC_MODULE_VERSION).toBe("0.1.0");
    expect(WORLD_MODULE_VERSION).toBe("0.1.0");
    expect(PERSISTENCE_MODULE_VERSION).toBe("0.1.0");
    expect(RENDERER_MODULE_VERSION).toBe("0.1.0");
    expect(TYPES_MODULE_VERSION).toBe("0.1.0");
    expect(UTILS_MODULE_VERSION).toBe("0.1.0");
  });
});
