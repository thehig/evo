import {
  IEventSystem,
  ISimulationEvent,
  SimulationEventType,
  EventHandler,
} from "./interfaces";

/**
 * Event system implementation for simulation events
 *
 * Provides a type-safe event system for communication between simulation components.
 */
export class EventSystem implements IEventSystem {
  private handlers: Map<SimulationEventType, Set<EventHandler>> = new Map();

  /**
   * Subscribe to events of a specific type
   */
  on<T extends ISimulationEvent>(
    eventType: SimulationEventType,
    handler: EventHandler<T>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);
  }

  /**
   * Unsubscribe from events
   */
  off<T extends ISimulationEvent>(
    eventType: SimulationEventType,
    handler: EventHandler<T>
  ): void {
    const eventHandlers = this.handlers.get(eventType);
    if (eventHandlers) {
      eventHandlers.delete(handler as EventHandler);
      if (eventHandlers.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  /**
   * Emit an event to all registered handlers
   */
  emit(event: ISimulationEvent): void {
    const eventHandlers = this.handlers.get(event.type);
    if (eventHandlers) {
      // Create a copy of handlers to avoid issues if handlers are modified during emission
      const handlersCopy = Array.from(eventHandlers);
      for (const handler of handlersCopy) {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
        }
      }
    }
  }

  /**
   * Clear all event handlers
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Get the number of handlers for a specific event type
   */
  getHandlerCount(eventType: SimulationEventType): number {
    return this.handlers.get(eventType)?.size ?? 0;
  }

  /**
   * Get all registered event types
   */
  getRegisteredEventTypes(): SimulationEventType[] {
    return Array.from(this.handlers.keys());
  }
}

/**
 * Helper functions for creating simulation events
 */
export class SimulationEvents {
  /**
   * Create a tick event
   */
  static tick(
    tick: number,
    timestamp: number,
    deltaTime: number
  ): ISimulationEvent {
    return {
      type: SimulationEventType.TICK,
      timestamp,
      tick,
      data: { deltaTime },
    };
  }

  /**
   * Create an entity added event
   */
  static entityAdded(
    tick: number,
    timestamp: number,
    entityId: string
  ): ISimulationEvent {
    return {
      type: SimulationEventType.ENTITY_ADDED,
      timestamp,
      tick,
      data: { entityId },
    };
  }

  /**
   * Create an entity removed event
   */
  static entityRemoved(
    tick: number,
    timestamp: number,
    entityId: string
  ): ISimulationEvent {
    return {
      type: SimulationEventType.ENTITY_REMOVED,
      timestamp,
      tick,
      data: { entityId },
    };
  }

  /**
   * Create a creature born event
   */
  static creatureBorn(
    tick: number,
    timestamp: number,
    creatureId: string,
    parentIds?: string[]
  ): ISimulationEvent {
    return {
      type: SimulationEventType.CREATURE_BORN,
      timestamp,
      tick,
      data: { creatureId, parentIds },
    };
  }

  /**
   * Create a creature died event
   */
  static creatureDied(
    tick: number,
    timestamp: number,
    creatureId: string,
    cause?: string
  ): ISimulationEvent {
    return {
      type: SimulationEventType.CREATURE_DIED,
      timestamp,
      tick,
      data: { creatureId, cause },
    };
  }

  /**
   * Create a simulation started event
   */
  static simulationStarted(tick: number, timestamp: number): ISimulationEvent {
    return {
      type: SimulationEventType.SIMULATION_STARTED,
      timestamp,
      tick,
    };
  }

  /**
   * Create a simulation paused event
   */
  static simulationPaused(tick: number, timestamp: number): ISimulationEvent {
    return {
      type: SimulationEventType.SIMULATION_PAUSED,
      timestamp,
      tick,
    };
  }

  /**
   * Create a simulation stopped event
   */
  static simulationStopped(tick: number, timestamp: number): ISimulationEvent {
    return {
      type: SimulationEventType.SIMULATION_STOPPED,
      timestamp,
      tick,
    };
  }

  /**
   * Create a simulation reset event
   */
  static simulationReset(tick: number, timestamp: number): ISimulationEvent {
    return {
      type: SimulationEventType.SIMULATION_RESET,
      timestamp,
      tick,
    };
  }
}
