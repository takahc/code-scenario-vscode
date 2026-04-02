```markdown
# code-scenario-vscode Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches the core development patterns and workflows for the `code-scenario-vscode` repository. The project is written in TypeScript, with a focus on clear commit conventions, modular code structure, and progressive documentation of features and agent workflows. The repository emphasizes maintainability through structured progress tracking and skill documentation.

## Coding Conventions

- **File Naming:**  
  Use `camelCase` for file names.  
  _Example:_  
  ```
  src/itemEditorPanel.ts
  src/scenarioModel.ts
  ```

- **Import Style:**  
  Use relative imports for internal modules.  
  _Example:_  
  ```typescript
  import { ScenarioModel } from './scenarioModel';
  ```

- **Export Style:**  
  Prefer named exports.  
  _Example:_  
  ```typescript
  export function createItemEditorPanel() { ... }
  export const EXTENSION_ID = 'code-scenario-vscode';
  ```

- **Commit Messages:**  
  Follow [Conventional Commits](https://www.conventionalcommits.org/) with prefixes like `feat`, `chore`, `docs`, `refactor`.  
  _Example:_  
  ```
  feat: add scenario model for item editing
  docs: update SKILL.md for commit workflow
  ```

## Workflows

### Feature Development with Progress Tracking
**Trigger:** When adding a new feature and tracking/documenting its development process  
**Command:** `/new-feature-with-progress`

1. Implement or update feature code in `src/` files and `package.json`.
2. Create or update progress markdown files in `.github/progress/feature/...` describing feature steps.
3. Update or add `.github/skills/.../SKILL.md` to document new skills or workflows.
4. Optionally update `.github/copilot-instructions.md` for commit guidance.

_Example:_
```typescript
// src/extension.ts
export function activate(context: vscode.ExtensionContext) {
  // New feature implementation
}
```
```markdown
// .github/progress/feature/enhance-ux/step1.md
## Step 1: Add basic UX enhancements
- [x] Implemented new panel layout
```

### Agent Orchestration and Prompt Workflow Update
**Trigger:** When introducing or modifying agent orchestration workflows and their prompts  
**Command:** `/update-agent-workflow`

1. Update or add `.github/agents/*.agent.md` files for new or changed agents.
2. Update or add `.github/prompts/*.prompt.md` files for new or changed prompts.
3. Update related progress documentation in `.github/progress/agents/orchestration/*.md`.
4. Optionally update `.github/instructions/*.instructions.md`.

_Example:_
```markdown
// .github/agents/scenario.agent.md
# Scenario Agent
Describes orchestration logic for scenario management.
```
```markdown
// .github/prompts/new-feature.prompt.md
Prompt: "Describe the user scenario for the new feature."
```

### Commit Workflow Guidance Documentation
**Trigger:** When clarifying or adding instructions for the commit workflow  
**Command:** `/document-commit-workflow`

1. Update `.github/copilot-instructions.md` with new or revised commit instructions.
2. Add or update progress documentation in `.github/progress/feature-enhance-ux/progress_feature-enhance-ux_*_commit-workflow-guidance.md`.
3. Update or add `.github/skills/commit/SKILL.md`.

_Example:_
```markdown
// .github/copilot-instructions.md
## Commit Guidelines
- Use conventional commit prefixes: feat, fix, docs, refactor, chore
- Keep messages concise (under 50 characters)
```

## Testing Patterns

- **Test File Naming:**  
  Test files use the pattern `*.test.*` (e.g., `scenarioModel.test.ts`).
- **Testing Framework:**  
  The specific framework is not detected; check existing test files for conventions.
- **Example Test File:**  
  ```typescript
  // src/scenarioModel.test.ts
  import { ScenarioModel } from './scenarioModel';

  describe('ScenarioModel', () => {
    it('should create a new scenario', () => {
      // test implementation
    });
  });
  ```

## Commands

| Command                    | Purpose                                                      |
|----------------------------|--------------------------------------------------------------|
| /new-feature-with-progress | Start a new feature with progress tracking and documentation  |
| /update-agent-workflow     | Update agent orchestration workflows and related prompts      |
| /document-commit-workflow  | Update or clarify commit workflow documentation              |
```
