# Testing Guide for Neural Evolution Simulator

This document outlines the testing strategy, conventions, and best practices for the Neural Evolution Simulator project.

## Test Organization

### Directory Structure

```
tests/
├── unit/           # Unit tests for individual components
├── integration/    # Integration tests for component interactions
├── core/          # Core system tests (random, events, simulation engine)
├── performance/   # Performance and scalability tests
├── scenarios/     # End-to-end scenario tests
├── regression/    # Regression tests for critical functionality
├── fixtures/      # Shared test data and fixtures
└── utils/         # Test utilities and helpers
    ├── test-data-generators.ts
    ├── assertion-helpers.ts
    └── mock-services.ts
```

### Test Types

#### 1. Unit Tests (`tests/unit/`)

- Test individual components in isolation
- Use mocks for dependencies
- Fast execution (< 10ms per test)
- High coverage target (>90%)

#### 2. Integration Tests (`tests/integration/`)

- Test component interactions
- Minimal mocking
- Moderate execution time (< 100ms per test)
- Focus on contracts between components

#### 3. Core Tests (`tests/core/`)

- Test fundamental system components
- Verify deterministic behavior
- Test random number generation, events, simulation engine

#### 4. Performance Tests (`tests/performance/`)

- Measure execution time and memory usage
- Test with different scales (small/medium/large)
- Run sequentially to avoid resource contention
- Longer execution time allowed (< 60s per test)

#### 5. Scenario Tests (`tests/scenarios/`)

- End-to-end simulation scenarios
- Verify expected outcomes
- Test complete workflows
- Use real components (minimal mocking)

#### 6. Regression Tests (`tests/regression/`)

- Protect against known issues
- Run critical functionality tests
- Quick to execute
- High priority for CI/CD

## Test Utilities

### Test Data Generators (`TestDataGenerators`)

Create consistent test data across all tests:

```typescript
import { TestDataGenerators } from "../utils/test-data-generators";

// Create test world
const world = TestDataGenerators.createWorld();

// Create test creatures
const creatures = TestDataGenerators.createCreaturePopulation(10);

// Create deterministic test set
const testSet = TestDataGenerators.createDeterministicTestSet(12345, "MyTest");
```

### Assertion Helpers (`AssertionHelpers`)

Use specialized assertions for simulation-specific validations:

```typescript
import { AssertionHelpers } from "../utils/assertion-helpers";

// Validate creature state
AssertionHelpers.assertCreatureValid(creature);

// Check neural network determinism
AssertionHelpers.assertNeuralNetworkDeterministic(network, inputs);

// Verify performance metrics
AssertionHelpers.assertPerformanceMetrics(metrics, thresholds);
```

### Mock Services (`MockServices`)

Create consistent mocks for different test scenarios:

```typescript
import { MockServices } from "../utils/mock-services";

// Create mock world
const mockWorld = MockServices.createMockWorld();

// Create integration mock set
const { world, creatures, networks } = MockServices.createIntegrationMockSet();

// Create performance-optimized mocks
const perfMocks = MockServices.createPerformanceMocks();
```

## Test Conventions

### Naming

- **Test files**: `{component-name}.test.ts`
- **Test suites**: Describe the component/module being tested
- **Test cases**: Use descriptive names starting with "should"

```typescript
describe("NeuralNetwork", () => {
  describe("Constructor", () => {
    it("should create network with correct layer sizes", () => {
      // Test implementation
    });
  });
});
```

### Test Structure

Follow the Arrange-Act-Assert pattern:

```typescript
it("should process inputs correctly", () => {
  // Arrange
  const network = TestDataGenerators.createNeuralNetwork();
  const inputs = [0.1, 0.2, 0.3];

  // Act
  const outputs = network.process(inputs);

  // Assert
  expect(outputs).toHaveLength(16);
  expect(outputs.every((x) => x >= 0 && x <= 1)).toBe(true);
});
```

### Deterministic Testing

Always use fixed seeds for reproducible tests:

```typescript
beforeEach(() => {
  // Set deterministic seed
  Math.seedrandom(12345);
});
```

### Performance Testing

Use performance measurement utilities:

```typescript
it("should process 1000 creatures within time limit", async () => {
  const { result, executionTime } = await AssertionHelpers.measureExecutionTime(
    () => processCreatures(creatures)
  );

  AssertionHelpers.assertPerformanceMetrics(
    { executionTime },
    { maxExecutionTime: 100 } // 100ms
  );
});
```

## Running Tests

### Command Reference

```bash
# Run all tests
npm test

# Run specific test type
npm run test:unit
npm run test:integration
npm run test:performance

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- creature.test.ts

# Run tests matching pattern
npm test -- --grep "Neural Network"
```

### Environment Variables

Set environment variables for different test scenarios:

```bash
# Enable debug logging
DEBUG=true npm test

# Run performance tests
PERFORMANCE_TEST=true npm run test:performance

# Set test timeout
TEST_TIMEOUT=30000 npm test
```

## Coverage Requirements

### Minimum Coverage Targets

- **Unit Tests**: 90% line coverage
- **Integration Tests**: 80% branch coverage
- **Overall Project**: 85% combined coverage

### Coverage Exclusions

Files excluded from coverage requirements:

- Test files (`*.test.ts`)
- Type definition files (`*.types.ts`)
- Configuration files
- Mock implementations

## Continuous Integration

### Test Pipeline

1. **Unit Tests**: Fast feedback (< 2 minutes)
2. **Integration Tests**: Component interactions (< 5 minutes)
3. **Performance Tests**: Resource validation (< 10 minutes)
4. **Regression Tests**: Critical functionality (< 3 minutes)

### Quality Gates

Tests must pass before:

- Merging pull requests
- Deploying to staging
- Creating releases

## Best Practices

### Do's

- ✅ Write tests before fixing bugs
- ✅ Use descriptive test names
- ✅ Test both success and failure cases
- ✅ Keep tests focused and atomic
- ✅ Use appropriate assertion helpers
- ✅ Mock external dependencies
- ✅ Verify deterministic behavior

### Don'ts

- ❌ Write tests that depend on external services
- ❌ Use random data without fixed seeds
- ❌ Test implementation details
- ❌ Write overly complex test setups
- ❌ Skip test cleanup
- ❌ Ignore flaky tests

## Debugging Tests

### Common Issues

1. **Non-deterministic behavior**

   - Solution: Use fixed seeds, avoid real timers

2. **Memory leaks in tests**

   - Solution: Proper cleanup in `afterEach`

3. **Slow test execution**

   - Solution: Use mocks, optimize test data

4. **Flaky tests**
   - Solution: Fix timing issues, improve assertions

### Debug Utilities

```typescript
// Enable debug logging
process.env.DEBUG = "true";

// Use console.log for debugging (remove before commit)
console.log("Debug info:", creature.state);

// Use debugger statement
debugger; // Will pause in debugger when running with --inspect
```

## Extending the Test Suite

### Adding New Test Types

1. Create new directory under `tests/`
2. Add appropriate configuration
3. Update this documentation
4. Add to CI pipeline

### Contributing Test Utilities

1. Add to appropriate utility file
2. Include JSDoc documentation
3. Add unit tests for utilities
4. Update examples in this guide

## Performance Benchmarks

### Current Targets

- **Small scale** (10 creatures, 100 ticks): < 10ms
- **Medium scale** (50 creatures, 500 ticks): < 50ms
- **Large scale** (200 creatures, 1000 ticks): < 200ms

### Memory Usage

- **Small simulation**: < 50MB
- **Medium simulation**: < 200MB
- **Large simulation**: < 500MB

## Troubleshooting

### Common Test Failures

1. **"Neural network input size mismatch"**

   - Check creature configuration matches neural network input size
   - Use `TestDataGenerators.createNeuralNetworkConfig()` for consistency

2. **"Creature not alive"**

   - Verify creature energy levels
   - Check age vs. maxAge limits

3. **"Performance threshold exceeded"**
   - Check system load during test execution
   - Verify test data size matches expectations

### Getting Help

- Check existing test examples in each directory
- Review assertion helper documentation
- Consult team for complex testing scenarios
- Refer to Vitest documentation for framework-specific issues
