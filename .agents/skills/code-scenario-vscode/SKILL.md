```markdown
# code-scenario-vscode Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill introduces the development patterns and conventions used in the `code-scenario-vscode` repository, a TypeScript project without a specific framework. You'll learn about file organization, code style, commit patterns, and testing strategies to maintain consistency and quality in this codebase.

## Coding Conventions

### File Naming
- Use **camelCase** for all file names.
  - Example: `scenarioManager.ts`, `userActions.test.ts`

### Import Style
- Use **relative imports** for all modules.
  - Example:
    ```typescript
    import { getScenario } from './scenarioManager';
    ```

### Export Style
- Use **named exports** for all modules.
  - Example:
    ```typescript
    // scenarioManager.ts
    export function getScenario(id: string) { ... }
    export function listScenarios() { ... }
    ```

### Commit Patterns
- Commit types are **mixed**, with common prefixes like `refactor` and `feat`.
- Keep commit messages concise (~30 characters).
  - Example: `feat: add scenario loader`
  - Example: `refactor: update import paths`

## Workflows

### Refactoring Code
**Trigger:** When improving code structure or readability without changing functionality  
**Command:** `/refactor`

1. Identify code that can be improved for clarity or maintainability.
2. Make changes using camelCase file names and relative imports.
3. Use named exports for any new or updated modules.
4. Commit changes with a message starting with `refactor:`.
   - Example: `refactor: simplify scenario loader`

### Adding a New Feature
**Trigger:** When implementing a new functionality  
**Command:** `/add-feature`

1. Create new files using camelCase naming.
2. Use relative imports to integrate with existing code.
3. Export new functions or classes as named exports.
4. Write corresponding tests in a `*.test.ts` file.
5. Commit changes with a message starting with `feat:`.
   - Example: `feat: add user scenario tracking`

## Testing Patterns

- Test files follow the `*.test.*` pattern (e.g., `userActions.test.ts`).
- The testing framework is **unknown**, but tests are colocated with source files or in a dedicated test directory.
- Example test file:
  ```typescript
  // userActions.test.ts
  import { getScenario } from './scenarioManager';

  describe('getScenario', () => {
    it('returns the correct scenario', () => {
      // test implementation
    });
  });
  ```

## Commands

| Command        | Purpose                                      |
|----------------|----------------------------------------------|
| /refactor      | Refactor code for clarity or maintainability |
| /add-feature   | Add a new feature to the codebase            |
```
