# Contributing to ST Open Source

Thank you for your interest in contributing to ST Open Source! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### 1. Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/st-open-source.git
   cd st-open-source
   ```

### 2. Setup Development Environment

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Copy environment file:
   ```bash
   cp env.example .env
   ```

3. Configure your environment variables in `.env`

4. Start the development server:
   ```bash
   pnpm dev
   ```

### 3. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
# or
git checkout -b docs/your-documentation-update
```

### 4. Make Your Changes

- Write your code following our [coding standards](#coding-standards)
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass

### 5. Commit Your Changes

Follow our [commit message conventions](#commit-message-conventions):

```bash
git add .
git commit -m "feat: add new lookup validation feature"
```

### 6. Push and Create a Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with a clear description of your changes.

## 📋 Pull Request Guidelines

### Before Submitting

- [ ] Code follows our coding standards
- [ ] All tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Type checking passes (`pnpm type-check`)
- [ ] Documentation is updated
- [ ] Commit messages follow conventions

### Pull Request Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

## 🎯 Coding Standards

### TypeScript

- Use TypeScript for all new code
- Prefer `const` over `let`, avoid `var`
- Use explicit return types for public functions
- Use interfaces for object shapes
- Use enums for constants
- Use union types for better type safety

### Code Style

We use **Biome** for linting and formatting. Run these commands:

```bash
# Format code
pnpm format

# Check formatting
pnpm format:check

# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix
```

### File Organization

```
src/
├── controllers/     # Request handlers
├── models/         # Data models
├── services/       # Business logic
├── middleware/     # Express middleware
├── routes/         # Route definitions
├── utils/          # Utility functions
├── types/          # TypeScript type definitions
├── tests/          # Test files
└── index.ts        # Application entry point
```

### Naming Conventions

- **Files**: kebab-case (`user-controller.ts`)
- **Classes**: PascalCase (`UserController`)
- **Functions**: camelCase (`getUserById`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)
- **Interfaces**: PascalCase with `I` prefix (`IUser`)
- **Types**: PascalCase (`UserResponse`)

### Error Handling

```typescript
// Good
try {
  const result = await someAsyncOperation();
  return result;
} catch (error) {
  logger.error('Failed to perform operation', { error });
  throw new AppError('Operation failed', 500);
}

// Bad
try {
  const result = await someAsyncOperation();
  return result;
} catch (error) {
  console.log(error); // Don't use console.log
  throw error; // Don't re-throw raw errors
}
```

### Testing

- Write unit tests for all new functionality
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Test both success and error cases

```typescript
describe('UserService', () => {
  describe('getUserById', () => {
    it('should return user when valid ID is provided', async () => {
      // Arrange
      const userId = '123';
      const expectedUser = { id: userId, name: 'John' };
      jest.spyOn(UserModel, 'findById').mockResolvedValue(expectedUser);

      // Act
      const result = await UserService.getUserById(userId);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(UserModel.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const userId = 'invalid-id';
      jest.spyOn(UserModel, 'findById').mockResolvedValue(null);

      // Act & Assert
      await expect(UserService.getUserById(userId)).rejects.toThrow('User not found');
    });
  });
});
```

## 📝 Commit Message Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Examples
```bash
feat: add user authentication middleware
fix(auth): resolve JWT token validation issue
docs: update API documentation
style: format code with biome
refactor(services): extract common database operations
test: add unit tests for user service
chore: update dependencies
```

## 🐛 Reporting Bugs

### Before Creating an Issue

1. Check if the bug has already been reported
2. Try to reproduce the bug with the latest version
3. Check the documentation and existing issues

### Bug Report Template

```markdown
## Bug Description
Clear and concise description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
What you expected to happen

## Actual Behavior
What actually happened

## Environment
- OS: [e.g. macOS, Windows, Linux]
- Node.js version: [e.g. 18.0.0]
- pnpm version: [e.g. 8.0.0]
- Database: [e.g. MongoDB 6.0]

## Additional Context
Add any other context about the problem here
```

## 💡 Feature Requests

### Before Creating a Feature Request

1. Check if the feature has already been requested
2. Consider if the feature aligns with the project's goals
3. Think about the implementation complexity

### Feature Request Template

```markdown
## Feature Description
Clear and concise description of the feature

## Problem Statement
What problem does this feature solve?

## Proposed Solution
Describe the solution you'd like to see

## Alternative Solutions
Describe any alternative solutions you've considered

## Additional Context
Add any other context or screenshots about the feature request
```

## 🏷️ Issue Labels

We use the following labels to categorize issues:

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements or additions to documentation
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `priority: high`: High priority issue
- `priority: low`: Low priority issue
- `priority: medium`: Medium priority issue

## 🚀 Development Workflow

### Daily Development

1. **Start your day**:
   ```bash
   git checkout main
   git pull origin main
   pnpm install
   ```

2. **Create feature branch**:
   ```bash
   git checkout -b feature/your-feature
   ```

3. **Make changes and test**:
   ```bash
   pnpm dev          # Start development server
   pnpm test         # Run tests
   pnpm lint         # Check linting
   pnpm type-check   # Check types
   ```

4. **Commit and push**:
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature
   ```

### Code Review Process

1. Create a Pull Request
2. Ensure CI checks pass
3. Request review from maintainers
4. Address feedback and make changes
5. Once approved, merge to main

## 📚 Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [Biome Documentation](https://biomejs.dev/)

## 🆘 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Email**: opensource@stratagems.com

## 🙏 Recognition

Contributors will be recognized in:
- The project's README.md
- Release notes
- GitHub contributors page

Thank you for contributing to ST Open Source! 🎉 