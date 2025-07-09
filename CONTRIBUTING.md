# Contributing to Bilan

Thank you for your interest in contributing to Bilan! We welcome contributions from the community and are excited to see what you'll build.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Community Guidelines](#community-guidelines)

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 8 or higher
- Git

### Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/bilan.git
   cd bilan
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your local settings
   ```

4. **Run the development environment:**
   ```bash
   npm run dev
   ```

5. **Verify everything works:**
   ```bash
   npm test
   npm run build
   ```

## How to Contribute

### Types of Contributions

We welcome several types of contributions:

- **🐛 Bug Reports** - Found something broken? Let us know!
- **✨ Feature Requests** - Have an idea? We'd love to hear it!
- **📝 Documentation** - Help improve our docs and examples
- **🔧 Code Contributions** - Bug fixes, features, optimizations
- **🧪 Testing** - Write tests, find edge cases
- **🎨 Design** - UI/UX improvements for the dashboard

### Areas Needing Help

- **SDK improvements** - New platforms, better APIs
- **Analytics algorithms** - Better trust scoring methods
- **Dashboard features** - New visualizations, better UX
- **Documentation** - Guides, examples, API docs
- **Testing** - Unit tests, integration tests, E2E tests
- **Performance** - Bundle size optimization, runtime performance
- **Accessibility** - Making the dashboard more accessible

## Code Standards

### TypeScript

- Use strict TypeScript configuration
- Prefer interfaces over types for public APIs
- Use branded types for IDs
- Export all public interfaces
- Add JSDoc comments for public methods

### React/Next.js

- Use App Router (not Pages Router)
- Prefer server components when possible
- Use TypeScript with proper typing
- Implement error boundaries
- Use Tailwind for styling

### Code Style

- Use Prettier for formatting
- Follow ESLint rules
- Use meaningful variable names
- Keep functions small and focused
- Add comments for complex logic

### Git Workflow

- Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`
- Create feature branches from `main`
- Keep commits atomic and well-described
- Squash commits before merging

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific package
npm test -- packages/sdk

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Writing Tests

- Write unit tests for all new functions
- Include integration tests for API endpoints
- Test error conditions and edge cases
- Use descriptive test names
- Mock external dependencies

### Test Structure

```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  })

  it('should do something specific', () => {
    // Test implementation
  })

  it('should handle error cases', () => {
    // Error testing
  })
})
```

## Submitting Changes

### Pull Request Process

1. **Create an issue first** (for non-trivial changes)
2. **Fork the repository**
3. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make your changes:**
   - Follow code standards
   - Add tests
   - Update documentation

5. **Test your changes:**
   ```bash
   npm test
   npm run build
   npm run lint
   ```

6. **Commit with conventional format:**
   ```bash
   git commit -m "feat: add new analytics algorithm"
   ```

7. **Push and create PR:**
   ```bash
   git push origin feature/your-feature-name
   ```

### PR Guidelines

- **Title:** Use conventional commit format
- **Description:** Explain what and why, not how
- **Testing:** Describe how you tested the changes
- **Breaking Changes:** Clearly mark any breaking changes
- **Documentation:** Update relevant docs

### Review Process

- All PRs require at least one review
- Address review feedback promptly
- Keep discussions respectful and constructive
- Maintainers may request changes or additional tests

## Package-Specific Guidelines

### SDK (`packages/sdk`)

- Keep bundle size under 5KB
- Maintain zero dependencies
- Support both browser and Node.js
- Add comprehensive TypeScript types
- Include usage examples

### Server (`packages/server`)

- Use Fastify for API endpoints
- Include proper error handling
- Add request validation
- Write API documentation
- Support multiple databases

### Dashboard (`packages/dashboard`)

- Use Next.js App Router
- Implement responsive design
- Add proper error boundaries
- Use Tailwind for styling
- Include accessibility features

## Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help newcomers get started
- Celebrate diverse perspectives
- Report inappropriate behavior

### Communication

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - Questions and general discussion
- **Discord** - Real-time chat and support
- **Pull Requests** - Code review and collaboration

### Getting Help

- Check existing issues and documentation first
- Ask questions in GitHub Discussions
- Join our Discord for real-time help
- Tag maintainers if needed: `@bilan-ai/maintainers`

## Recognition

Contributors will be:
- Added to the CONTRIBUTORS.md file
- Mentioned in release notes
- Invited to our Discord community
- Given credit in documentation

## Questions?

Feel free to reach out:
- 💬 [Discord](https://discord.gg/bilan)
- 🐛 [GitHub Issues](https://github.com/bilan-ai/bilan/issues)
- 📖 [GitHub Discussions](https://github.com/bilan-ai/bilan/discussions)

Thank you for contributing to Bilan! 🎉 