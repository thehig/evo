import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventSystem, SimulationEvents } from "../../src/core/events";
import { SimulationEventType } from "../../src/core/interfaces";

describe("EventSystem", () => {
  let eventSystem: EventSystem;

  beforeEach(() => {
    eventSystem = new EventSystem();
  });

  describe("event subscription and emission", () => {
    it("should call handler when event is emitted", () => {
      const handler = vi.fn();
      const event = SimulationEvents.tick(1, 100, 16.67);

      eventSystem.on(SimulationEventType.TICK, handler);
      eventSystem.emit(event);

      expect(handler).toHaveBeenCalledWith(event);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should call multiple handlers for same event type", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const event = SimulationEvents.simulationStarted(0, 0);

      eventSystem.on(SimulationEventType.SIMULATION_STARTED, handler1);
      eventSystem.on(SimulationEventType.SIMULATION_STARTED, handler2);
      eventSystem.emit(event);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
    });

    it("should not call handlers for different event types", () => {
      const tickHandler = vi.fn();
      const startHandler = vi.fn();

      eventSystem.on(SimulationEventType.TICK, tickHandler);
      eventSystem.on(SimulationEventType.SIMULATION_STARTED, startHandler);

      const tickEvent = SimulationEvents.tick(1, 100, 16.67);
      eventSystem.emit(tickEvent);

      expect(tickHandler).toHaveBeenCalledWith(tickEvent);
      expect(startHandler).not.toHaveBeenCalled();
    });
  });

  describe("event unsubscription", () => {
    it("should remove handler when off is called", () => {
      const handler = vi.fn();
      const event = SimulationEvents.tick(1, 100, 16.67);

      eventSystem.on(SimulationEventType.TICK, handler);
      eventSystem.off(SimulationEventType.TICK, handler);
      eventSystem.emit(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it("should only remove specific handler", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const event = SimulationEvents.tick(1, 100, 16.67);

      eventSystem.on(SimulationEventType.TICK, handler1);
      eventSystem.on(SimulationEventType.TICK, handler2);
      eventSystem.off(SimulationEventType.TICK, handler1);
      eventSystem.emit(event);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith(event);
    });

    it("should handle removing non-existent handler gracefully", () => {
      const handler = vi.fn();

      expect(() => {
        eventSystem.off(SimulationEventType.TICK, handler);
      }).not.toThrow();
    });
  });

  describe("clear functionality", () => {
    it("should remove all handlers when clear is called", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventSystem.on(SimulationEventType.TICK, handler1);
      eventSystem.on(SimulationEventType.SIMULATION_STARTED, handler2);

      eventSystem.clear();

      eventSystem.emit(SimulationEvents.tick(1, 100, 16.67));
      eventSystem.emit(SimulationEvents.simulationStarted(0, 0));

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should continue emitting to other handlers if one throws", () => {
      const errorHandler = vi.fn(() => {
        throw new Error("Handler error");
      });
      const normalHandler = vi.fn();
      const event = SimulationEvents.tick(1, 100, 16.67);

      // Mock console.error to avoid test output pollution
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      eventSystem.on(SimulationEventType.TICK, errorHandler);
      eventSystem.on(SimulationEventType.TICK, normalHandler);

      expect(() => eventSystem.emit(event)).not.toThrow();

      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("utility methods", () => {
    it("should return correct handler count", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      expect(eventSystem.getHandlerCount(SimulationEventType.TICK)).toBe(0);

      eventSystem.on(SimulationEventType.TICK, handler1);
      expect(eventSystem.getHandlerCount(SimulationEventType.TICK)).toBe(1);

      eventSystem.on(SimulationEventType.TICK, handler2);
      expect(eventSystem.getHandlerCount(SimulationEventType.TICK)).toBe(2);

      eventSystem.off(SimulationEventType.TICK, handler1);
      expect(eventSystem.getHandlerCount(SimulationEventType.TICK)).toBe(1);
    });

    it("should return registered event types", () => {
      const handler = vi.fn();

      expect(eventSystem.getRegisteredEventTypes()).toEqual([]);

      eventSystem.on(SimulationEventType.TICK, handler);
      eventSystem.on(SimulationEventType.SIMULATION_STARTED, handler);

      const registeredTypes = eventSystem.getRegisteredEventTypes();
      expect(registeredTypes).toContain(SimulationEventType.TICK);
      expect(registeredTypes).toContain(SimulationEventType.SIMULATION_STARTED);
      expect(registeredTypes).toHaveLength(2);
    });
  });
});

describe("SimulationEvents", () => {
  describe("event creation helpers", () => {
    it("should create tick event with correct properties", () => {
      const event = SimulationEvents.tick(5, 1000, 16.67);

      expect(event.type).toBe(SimulationEventType.TICK);
      expect(event.tick).toBe(5);
      expect(event.timestamp).toBe(1000);
      expect(event.data).toEqual({ deltaTime: 16.67 });
    });

    it("should create entity added event", () => {
      const event = SimulationEvents.entityAdded(10, 2000, "entity-123");

      expect(event.type).toBe(SimulationEventType.ENTITY_ADDED);
      expect(event.tick).toBe(10);
      expect(event.timestamp).toBe(2000);
      expect(event.data).toEqual({ entityId: "entity-123" });
    });

    it("should create entity removed event", () => {
      const event = SimulationEvents.entityRemoved(15, 3000, "entity-456");

      expect(event.type).toBe(SimulationEventType.ENTITY_REMOVED);
      expect(event.tick).toBe(15);
      expect(event.timestamp).toBe(3000);
      expect(event.data).toEqual({ entityId: "entity-456" });
    });

    it("should create creature born event", () => {
      const event = SimulationEvents.creatureBorn(20, 4000, "creature-789", [
        "parent1",
        "parent2",
      ]);

      expect(event.type).toBe(SimulationEventType.CREATURE_BORN);
      expect(event.tick).toBe(20);
      expect(event.timestamp).toBe(4000);
      expect(event.data).toEqual({
        creatureId: "creature-789",
        parentIds: ["parent1", "parent2"],
      });
    });

    it("should create creature died event", () => {
      const event = SimulationEvents.creatureDied(
        25,
        5000,
        "creature-999",
        "starvation"
      );

      expect(event.type).toBe(SimulationEventType.CREATURE_DIED);
      expect(event.tick).toBe(25);
      expect(event.timestamp).toBe(5000);
      expect(event.data).toEqual({
        creatureId: "creature-999",
        cause: "starvation",
      });
    });

    it("should create simulation control events", () => {
      const startEvent = SimulationEvents.simulationStarted(0, 0);
      const pauseEvent = SimulationEvents.simulationPaused(100, 10000);
      const stopEvent = SimulationEvents.simulationStopped(200, 20000);
      const resetEvent = SimulationEvents.simulationReset(0, 0);

      expect(startEvent.type).toBe(SimulationEventType.SIMULATION_STARTED);
      expect(pauseEvent.type).toBe(SimulationEventType.SIMULATION_PAUSED);
      expect(stopEvent.type).toBe(SimulationEventType.SIMULATION_STOPPED);
      expect(resetEvent.type).toBe(SimulationEventType.SIMULATION_RESET);
    });
  });
});
