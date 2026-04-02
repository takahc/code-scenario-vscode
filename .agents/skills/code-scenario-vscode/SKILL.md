```markdown
# code-scenario-vscode Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you how to contribute to the `code-scenario-vscode` repository, a TypeScript-based Visual Studio Code extension. You'll learn about the project's coding conventions, how to add new features or modules, update project configurations, and write tests following the repository's established patterns.

## Coding Conventions

- **File Naming:**  
  Use `camelCase` for TypeScript source files.  
  *Example:*  
  ```
  scenarioModel.ts
  symbolResolver.ts
  ```

- **Import Style:**  
  Use relative imports for internal modules.  
  *Example:*  
  ```typescript
  import { ScenarioProvider } from './scenarioProvider';
  ```

- **Export Style:**  
  Use named exports for functions, classes, and constants.  
  *Example:*  
  ```typescript
  export function resolveSymbol() { ... }
  export class ScenarioModel { ... }
  ```

- **Commit Messages:**  
  Follow [Conventional Commits](https://www.conventionalcommits.org/) with prefixes like `feat` and `refactor`.  
  *Example:*  
  ```
  feat: add scenario provider for new model
  refactor: update symbol resolver logic
  ```

## Workflows

### Add New Feature Module
**Trigger:** When you want to add a significant new feature or capability to the VS Code extension.  
**Command:** `/new-feature-module`

1. **Create or update TypeScript source files** in `src/`  
   *Example:*  
   ```
   src/scenarioModel.ts
   src/scenarioProvider.ts
   src/symbolResolver.ts
   src/extension.ts
   ```
2. **Add or update `package.json`** to register new commands, menus, or contributions.
   ```json
   {
     "contributes": {
       "commands": [
         {
           "command": "extension.newScenario",
           "title": "New Scenario"
         }
       ]
     }
   }
   ```
3. **Update or add configuration files** such as `tsconfig.json` if new settings or paths are required.
4. **Add or update resource files** (e.g., icons in `resources/`).
   ```
   resources/newScenarioIcon.svg
   ```
5. **Update `.gitignore` and `.vscodeignore`** as needed to include/exclude new files.

### Add or Update Project Configuration
**Trigger:** When you want to set up, update, or enhance project configuration (e.g., CI/CD, launch tasks, licensing).  
**Command:** `/update-config`

1. **Add or update CI/CD workflows** in `.github/workflows/`  
   *Example:*  
   ```
   .github/workflows/ci.yml
   ```
2. **Add or update local development settings** in `.vscode/`  
   *Example:*  
   ```
   .vscode/launch.json
   .vscode/tasks.json
   ```
3. **Add or update `LICENSE.txt`** to reflect licensing changes.
4. **Update `package.json`** with publisher or repository information.
   ```json
   {
     "publisher": "your-publisher",
     "repository": {
       "type": "git",
       "url": "https://github.com/your-org/code-scenario-vscode.git"
     }
   }
   ```

## Testing Patterns

- **Test File Naming:**  
  Test files follow the `*.test.*` pattern.  
  *Example:*  
  ```
  scenarioProvider.test.ts
  ```

- **Testing Framework:**  
  The specific framework is not detected, but tests are written in TypeScript and placed alongside or near the code under test.

- **Test Example:**  
  ```typescript
  import { ScenarioProvider } from './scenarioProvider';

  describe('ScenarioProvider', () => {
    it('should resolve scenarios correctly', () => {
      // test implementation
    });
  });
  ```

## Commands

| Command              | Purpose                                                      |
|----------------------|--------------------------------------------------------------|
| /new-feature-module  | Scaffold and implement a new feature or module               |
| /update-config       | Add or update project-level configuration and metadata files  |
```
