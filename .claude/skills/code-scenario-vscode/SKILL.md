```markdown
# code-scenario-vscode Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill documents the core development patterns, coding conventions, and workflows used in the `code-scenario-vscode` repository. The project is written in TypeScript and focuses on feature development with progress tracking, as well as robust documentation practices. This guide will help you contribute effectively and maintain consistency across the codebase.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `itemEditorPanel.ts`, `scenarioModel.ts`

### Import Style
- Use **relative imports** for internal modules.
  ```typescript
  import { ScenarioModel } from './scenarioModel';
  import { openPanel } from './itemEditorPanel';
  ```

### Export Style
- Prefer **named exports**.
  ```typescript
  // src/scenarioModel.ts
  export function createScenario() { ... }
  export const SCENARIO_TYPE = 'scenario';
  ```

### Commit Message Style
- Use **Conventional Commits** with these prefixes:
  - `feat`: New features
  - `docs`: Documentation changes
  - `chore`: Maintenance tasks
  - `refactor`: Code refactoring
- Keep commit messages concise (average ~42 characters).
  - Example: `feat: add scenario model and editor panel`

## Workflows

### Feature Development with Progress Tracking
**Trigger:** When developing a new feature and documenting its progress and related skills  
**Command:** `/new-feature-with-progress`

1. **Create or update feature implementation files** in `src/`  
   - Example: Add or modify `src/extension.ts`, `src/itemEditorPanel.ts`, or `src/scenarioModel.ts`
2. **Update `package.json`** if dependencies or extension metadata change.
3. **Add or update progress tracking markdown files** in `.github/progress/feature/<feature-name>/`  
   - Example: `.github/progress/feature/item-editor/PROGRESS.md`
4. **Add or update skill documentation** in `.github/skills/<skill>/SKILL.md`  
   - Example: `.github/skills/item-editor/SKILL.md`

#### Example
```typescript
// src/itemEditorPanel.ts
export function openPanel(context: vscode.ExtensionContext) {
  // Implementation here
}
```
```markdown
// .github/progress/feature/item-editor/PROGRESS.md
## Item Editor Progress
- [x] UI Prototype
- [ ] Save/Load Logic
```

---

### Documentation and Guidance Update
**Trigger:** When updating documentation or workflow guidance for contributors or Copilot  
**Command:** `/update-docs-guidance`

1. **Update or add markdown files** for instructions in `.github/` or `.github/workflows/`
   - Example: `.github/copilot-instructions.md`
2. **Update or add progress tracking markdown files** in `.github/progress/feature/*/`
3. **Update or add skill documentation** in `.github/skills/*/SKILL.md`

#### Example
```markdown
// .github/copilot-instructions.md
# Copilot Usage Guidelines
- Use conventional commit messages
- Follow coding conventions as per SKILL.md
```

## Testing Patterns

- **Test files** use the pattern `*.test.*` (e.g., `scenarioModel.test.ts`).
- **Testing framework** is not specified; review test files for framework usage.
- Place test files alongside or near the modules they test.

#### Example
```typescript
// src/scenarioModel.test.ts
import { createScenario } from './scenarioModel';

test('should create a scenario', () => {
  const scenario = createScenario();
  expect(scenario).toBeDefined();
});
```

## Commands

| Command                    | Purpose                                                      |
|----------------------------|--------------------------------------------------------------|
| /new-feature-with-progress | Start a new feature and track its progress and skills         |
| /update-docs-guidance      | Update documentation or workflow guidance for contributors    |
```
