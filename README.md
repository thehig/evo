# Neural Evolution Simulator

A two-part evolutionary simulation game where creatures controlled by neural networks evolve through genetic algorithms, consisting of a Training Simulator for species development and a World Simulator for large-scale ecosystem interactions.

## Features

- **Training Simulator**: Develop and evolve creature species through controlled environments
- **World Simulator**: Large-scale ecosystem interactions with multiple species
- **Neural Networks**: Creatures controlled by configurable neural networks
- **Genetic Algorithms**: Evolution through selection, mutation, and crossover
- **Persistence System**: Save and load simulation states and evolved species
- **Multiple Renderers**: ASCII console output and WebGL visualization

## Project Structure

```
src/
├── core/           # Core simulation engine interfaces
├── simulation/     # Training and World simulators
├── neural/         # Neural network implementation
├── genetic/        # Genetic algorithm system
├── world/          # Grid-based world system
├── persistence/    # Save/load system
├── renderer/       # Rendering interfaces and implementations
├── types/          # TypeScript type definitions
└── utils/          # Utility functions

tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
└── fixtures/       # Test data and fixtures

assets/
├── images/         # Image assets
├── sounds/         # Audio assets
└── data/           # Data files
```

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Windows 10/11 (optimized for Windows development)

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run linting
npm run lint
```

### Scripts

- `npm run dev` - Start development server with Vite
- `npm run build` - Build for production (TypeScript + Vite)
- `npm run preview` - Preview production build
- `npm test` - Run tests with Vitest
- `npm run test:ui` - Run tests with Vitest UI
- `npm run test:run` - Run tests once (CI mode)
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically

## Technology Stack

- **TypeScript** - Type-safe JavaScript development
- **Vite** - Fast build tool and development server
- **Vitest** - Fast unit testing framework
- **ESLint** - Code linting and formatting
- **Node.js** - Runtime environment

## Windows Development

This project is optimized for Windows development with:

- CRLF line endings
- Windows-style path handling
- Case-insensitive file system support
- Command Prompt compatibility

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## Roadmap

- [ ] Core simulation engine
- [ ] Neural network implementation
- [ ] Genetic algorithm system
- [ ] Basic creature behavior
- [ ] World grid system
- [ ] Training simulator
- [ ] World simulator
- [ ] Persistence system
- [ ] ASCII renderer
- [ ] WebGL renderer
- [ ] User interfaces
- [ ] Performance optimization
- [ ] Documentation and examples
