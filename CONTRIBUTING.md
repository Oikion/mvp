# Contributing to Oikion

Thank you for your interest in contributing to Oikion! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and professional in all interactions.

### Our Standards

- **Be respectful**: Treat everyone with respect and consideration
- **Be collaborative**: Work together to achieve common goals
- **Be constructive**: Provide helpful feedback and suggestions
- **Be inclusive**: Welcome diverse perspectives and experiences
- **Be professional**: Maintain a professional demeanor in all communications

## Getting Started

### Prerequisites

Before contributing, ensure you have the following installed:

- **Node.js** 20 or higher
- **pnpm** 10 or higher (recommended package manager)
- **PostgreSQL** database (or Neon account)
- **Git** for version control

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/mvp.git
   cd mvp
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/Oikion/mvp.git
   ```

4. **Install dependencies**
   ```bash
   pnpm install
   ```

5. **Set up environment variables**
   ```bash
   cp .env.example .env
   cp .env.local.example .env.local
   ```
   
   Update the `.env` and `.env.local` files with your credentials.

6. **Initialize the database**
   ```bash
   pnpm prisma generate
   pnpm prisma db push
   ```

7. **Start the development server**
   ```bash
   pnpm dev
   ```

## Development Workflow

### Branching Strategy

We use a feature branch workflow:

- `main` - Production-ready code
- `develop` - Integration branch for features (if applicable)
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates
- `refactor/*` - Code refactoring
- `test/*` - Test additions or updates

### Creating a Feature Branch

```bash
# Update your local main branch
git checkout main
git pull upstream main

# Create a new feature branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. Make your changes in your feature branch
2. Write or update tests as needed
3. Update documentation if necessary
4. Ensure all tests pass
5. Commit your changes following our [commit guidelines](#commit-guidelines)

### Keeping Your Branch Up to Date

```bash
# Fetch latest changes from upstream
git fetch upstream

# Rebase your branch on upstream/main
git rebase upstream/main
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Provide proper type annotations
- Avoid using `any` type unless absolutely necessary
- Use interfaces for object shapes
- Use type aliases for unions and intersections

### React Components

- Use functional components with hooks
- Follow React 19 best practices
- Use proper prop types with TypeScript interfaces
- Implement proper error boundaries
- Use React Server Components where appropriate

### File Naming

- Use **kebab-case** for file names: `user-profile.tsx`, `api-client.ts`
- Use **PascalCase** for component files: `UserProfile.tsx`, `DataTable.tsx`
- Use descriptive, meaningful names

### Code Style

- Follow the existing code style in the project
- Use ESLint for linting: `pnpm lint`
- Format code consistently
- Use meaningful variable and function names
- Write self-documenting code with clear intent

### Comments

- Write comments for complex logic
- Document function parameters and return values
- Explain "why" rather than "what" when commenting
- Keep comments up to date with code changes

### Internationalization

- All user-facing strings must be internationalized
- Add translations to both `locales/en/` and `locales/el/`
- Use the `useTranslations()` hook from `next-intl`
- Follow the existing namespace structure

Example:
```typescript
import { useTranslations } from 'next-intl';

function MyComponent() {
  const t = useTranslations('myNamespace');
  return <h1>{t('title')}</h1>;
}
```

### Database Changes

- All database changes must go through Prisma migrations
- Test migrations locally before committing
- Document breaking schema changes
- Consider backwards compatibility

```bash
# Create a new migration
pnpm prisma migrate dev --name your-migration-name
```

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (formatting, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Changes to build process or auxiliary tools

### Scope

The scope should indicate the area of the codebase affected:

- `crm`: CRM-related changes
- `mls`: MLS-related changes
- `feed`: Activity feed changes
- `auth`: Authentication changes
- `api`: API changes
- `ui`: UI component changes
- `db`: Database schema changes
- `i18n`: Internationalization changes

### Examples

```
feat(crm): add client tagging functionality

Implement tagging system for clients with color-coded tags.
Includes UI components and server actions.

Closes #123
```

```
fix(mls): resolve property image upload issue

Fix file size validation and improve error handling
for property photo uploads.

Fixes #456
```

```
docs(readme): update installation instructions

Add troubleshooting section and clarify environment
variable setup process.
```

## Pull Request Process

### Before Submitting

1. ✅ Ensure all tests pass: `pnpm test` (if applicable)
2. ✅ Run linter: `pnpm lint`
3. ✅ Update documentation if needed
4. ✅ Add translations for new UI strings
5. ✅ Rebase on latest `main` branch
6. ✅ Write a clear PR description

### PR Title

Follow the same format as commit messages:

```
feat(crm): add client tagging functionality
```

### PR Description Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Changes Made
- List of specific changes
- Another change
- Yet another change

## Testing
Describe how you tested your changes

## Screenshots (if applicable)
Add screenshots to help explain your changes

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings or errors
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] I have added translations for any new UI strings

## Related Issues
Closes #issue_number
```

### Review Process

1. Submit your pull request
2. Wait for automated checks to complete
3. Address any feedback from reviewers
4. Make requested changes in new commits
5. Once approved, a maintainer will merge your PR

### After Your PR is Merged

1. Delete your feature branch
2. Pull the latest changes from `main`
3. Celebrate! 🎉

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run Cypress E2E tests
pnpm cypress:open
```

### Writing Tests

- Write tests for new features
- Update tests when modifying existing features
- Ensure tests are deterministic and reliable
- Mock external dependencies appropriately

## Documentation

### Code Documentation

- Document complex functions and algorithms
- Use JSDoc comments for public APIs
- Keep documentation up to date with code changes

### User Documentation

- Update README.md for user-facing changes
- Add documentation to `docs/` directory for new features
- Include examples and usage instructions
- Update translations in documentation

### API Documentation

- Document all API endpoints
- Include request/response examples
- Document authentication requirements
- Specify rate limits and error codes

## Community

### Getting Help

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Documentation**: Check the `docs/` directory

### Reporting Bugs

When reporting bugs, please include:

1. **Description**: Clear description of the bug
2. **Steps to Reproduce**: Detailed steps to reproduce the issue
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**: OS, Node version, browser, etc.
6. **Screenshots**: If applicable
7. **Error Messages**: Full error messages and stack traces

### Suggesting Features

When suggesting features, please include:

1. **Use Case**: Why is this feature needed?
2. **Proposed Solution**: How should it work?
3. **Alternatives**: What alternatives have you considered?
4. **Additional Context**: Any other relevant information

## License

By contributing to Oikion, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Oikion! Your efforts help make this project better for everyone. 🙏
