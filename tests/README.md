# Neural Network Behavior Testing System

This directory contains the new behavior testing framework that replaces traditional unit tests with scenario-based testing for neural network-driven creature behavior.

## Overview

The behavior testing system validates neural network decision-making through ASCII-defined scenarios that test:

- **Food Seeking**: Herbivore plant consumption, carnivore hunting, omnivore choices
- **Threat Avoidance**: Prey escape behaviors, threat detection ranges
- **Reproduction**: Mate selection, reproduction timing based on energy
- **Movement Patterns**: Exploration vs exploitation, movement efficiency
- **Energy Conservation**: Rest vs activity decisions, starvation avoidance

## Files

### Core Framework

- `behaviorTesting.ts` - Main testing framework with ASCII parsing and simulation stepping
- `behaviorScenarios.ts` - Predefined scenarios for different behavior types
- `neuralNetworkBehavior.test.ts` - Vitest test suite that runs all scenarios

### Key Classes

#### `BehaviorTestFramework`

- Parses ASCII scenario definitions into grid states
- Steps through simulation ticks manually
- Tracks entity changes (deltas) between ticks
- Validates assertions against expected behaviors
- Generates scenario files for HTML viewer

#### `BehaviorTestRenderer`

- Custom renderer that captures simulation deltas
- Tracks entity movements, energy changes, births, deaths
- Provides delta history for analysis

#### `BehaviorScenarios`

- Collection of predefined test scenarios
- Covers all major neural network behaviors
- Provides batch execution and reporting

## ASCII Scenario Format

Scenarios use ASCII characters to define initial world states:

```
..........
..H.......  <- H = Herbivore
..........
....P.....  <- P = Plant
..........
```

### Entity Symbols

- `H` - Herbivore creature
- `C` - Carnivore creature
- `O` - Omnivore creature
- `P` - Plant (food for herbivores/omnivores)
- `R` - Rock (obstacle)
- `W` - Water (environmental feature)
- `.` - Empty space

## Running Tests

### All Behavior Tests

```bash
npm run test:behavior
```

### Specific Scenarios

```bash
# Run individual scenario
const framework = new BehaviorTestFramework();
const result = await framework.runScenario("herbivore_seeks_plant");
```

### Full Test Suite

```bash
npm test
```

## Scenario Types

### Food Seeking Scenarios

1. **herbivore_seeks_plant** - Tests plant detection and consumption
2. **carnivore_hunts_prey** - Tests predator hunting behavior
3. **omnivore_food_choice** - Tests food source prioritization

### Threat Avoidance Scenarios

4. **prey_escapes_predator** - Tests escape behaviors
5. **threat_detection_range** - Tests perception-based threat detection

### Reproduction Scenarios

6. **mate_selection** - Tests mate-seeking behavior
7. **reproduction_timing** - Tests energy-based reproduction decisions

### Movement Pattern Scenarios

8. **exploration_vs_exploitation** - Tests area exploitation vs exploration
9. **movement_efficiency** - Tests optimal pathfinding

### Energy Conservation Scenarios

10. **rest_vs_activity** - Tests energy conservation decisions
11. **starvation_avoidance** - Tests urgent food-seeking when energy is low

## Assertions

Each scenario can include multiple assertions:

```typescript
{
  tick: 5,                    // When to check
  type: 'position',           // What to check
  target: 'H',               // Which entity
  expected: { x: 4, y: 4 },  // Expected value
  tolerance: 1               // Numeric tolerance (optional)
}
```

### Assertion Types

- `position` - Entity coordinates
- `energy` - Creature energy levels
- `delta` - Specific changes (movement, death, etc.)
- `state` - General entity state
- `action` - Specific actions taken

## Delta Tracking

The system tracks all entity changes between ticks:

```typescript
interface EntityChange {
  entity: string;
  type: "moved" | "died" | "born" | "ate" | "reproduced" | "energy_changed";
  from?: { x: number; y: number } | number;
  to?: { x: number; y: number } | number;
  details?: any;
}
```

## HTML Viewer Integration

Scenarios can be saved as JSON files for loading into the HTML viewer:

```typescript
framework.saveScenarioFile(
  "herbivore_seeks_plant",
  "scenarios/herbivore_seeks_plant.json"
);
```

This allows visual playback and analysis of neural network behavior patterns.

## Extending the Framework

### Adding New Scenarios

1. Create scenario definition in `behaviorScenarios.ts`
2. Add to scenario list in `setupScenarios()`
3. Include in test suite in `neuralNetworkBehavior.test.ts`

### Custom Assertions

Extend the `checkAssertion()` method in `BehaviorTestFramework` to support new assertion types.

### Additional Entity Types

Update the `parseASCIIScenario()` method to support new entity symbols and types.

## Benefits Over Traditional Unit Tests

1. **Behavioral Focus** - Tests actual neural network decision-making
2. **Visual Scenarios** - ASCII representations are easy to understand
3. **Temporal Testing** - Tests behavior over multiple simulation ticks
4. **Integration Testing** - Tests complete creature-environment interactions
5. **Reproducible** - Deterministic scenarios for consistent testing
6. **Debuggable** - Delta tracking shows exactly what happened each tick
