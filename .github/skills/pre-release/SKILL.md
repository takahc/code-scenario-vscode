---
name: pre-release
description: 'Publish a VS Code extension as a pre-release by merging into the pre-release branch and letting GitHub Actions run the publish workflow. Use when the user asks for preview release publication without running vsce publish locally.'
argument-hint: 'Describe what should be included in the pre-release and whether the branch is ready to merge.'
user-invocable: true
---

# VS Code Pre-release Publishing

## When to Use

- User wants to publish a VS Code extension as a pre-release.
- Pre-release publication should be triggered by GitHub Actions instead of local `vsce publish`.
- A preview build is needed without replacing the normal stable release channel.
- The repository uses a dedicated `pre-release` branch to trigger publishing.

## Required Inputs

- The extension workspace containing `package.json`.
- The branch or commit range that should be included in the pre-release.
- The publish workflow definition in [publish-extension.yml](../../workflows/publish-extension.yml).
- The repository rules in [copilot-instructions.md](../../copilot-instructions.md) when commits are involved.

## Procedure

1. Inspect the current state.
	- Read `package.json` and confirm this is a VS Code extension.
	- Check the current version and publisher.
	- Read [publish-extension.yml](../../workflows/publish-extension.yml) and confirm that pushes to `pre-release` trigger `npx @vscode/vsce publish --pre-release`.
	- Run `git status --short` and identify whether the working tree is clean before any merge work.

2. Confirm branch strategy.
	- Identify the source branch or commits that should go into the pre-release.
	- Confirm the target branch is `pre-release`.
	- If the current branch is already `pre-release`, verify whether a merge is still needed or whether the user intends to push existing commits.
	- If the working tree is not clean, commit the pending changes first by following [commit](../commit/SKILL.md), then continue with the pre-release merge flow.

3. Verify pre-release readiness.
	- Run the repository build or compile step expected before release.
	- Check whether tests or other lightweight validation should run before merging.
	- Do not proceed to merge if validation fails.

4. Merge into the `pre-release` branch.
	- Switch to `pre-release` or create it locally if needed and the repository workflow expects it.
	- Merge the intended source branch into `pre-release` using the repository's preferred merge strategy.
	- Resolve conflicts before continuing.
	- Push `pre-release` so GitHub Actions starts automatically.

5. Verify the GitHub Actions publish flow.
	- Confirm that the push to `pre-release` triggered [publish-extension.yml](../../workflows/publish-extension.yml).
	- Check that the workflow reached the `Publish pre-release extension` step.
	- Report the workflow result back to the user.

6. Verify the result.
	- Report that the pre-release publication was triggered by the `pre-release` branch push.
	- If the workflow succeeds, report the published pre-release version if visible from logs or package metadata.
	- If the workflow fails, summarize the failing step and the next action needed.

## Decision Points

### Merge now or stop first

- Proceed when the source branch is ready and the working tree is clean, or after the pending work has been committed.
- Stop when validation is failing, merge conflicts are unresolved, or the user has not identified what should be included in the pre-release.

### What to do when the tree is dirty

- If the working tree has pending changes, commit them first by following [commit](../commit/SKILL.md).
- After the commit is created, re-check `git status --short` and only then continue with branch switching or merging.
- Do not switch to `pre-release` with uncommitted work still present.

### What to do with branch protection rules

- Follow [copilot-instructions.md](../../copilot-instructions.md) for protected branches such as `main` and `develop`.
- If the repository also protects `pre-release`, use the required Pull Request flow instead of direct pushes.

### What to do when GitHub Actions does not start

- Confirm the push actually reached `origin/pre-release`.
- Re-read [publish-extension.yml](../../workflows/publish-extension.yml) to verify the branch trigger.
- Tell the user if repository permissions or Actions settings need to be checked.

## Quality Checks

- `package.json` is confirmed to describe a VS Code extension.
- [publish-extension.yml](../../workflows/publish-extension.yml) is confirmed to publish on pushes to `pre-release`.
- Any previously dirty working tree was committed before the merge flow continued.
- Build or compile succeeds before merging.
- The correct source branch was merged into `pre-release`.
- The reported result includes workflow status and, when available, the published version.

## Output Expectations

- Tell the user which branch was merged into `pre-release`.
- If pending changes were found first, tell the user that they were committed before the merge flow continued.
- Report that publication is triggered by GitHub Actions, not by a local `vsce publish` command.
- Report workflow success or the blocking failure point.
- Mention blockers such as dirty tree, merge conflicts, or missing workflow trigger.

## Example Prompts

- `/pre-release この変更を pre-release ブランチに反映して preview 公開して`
- `/pre-release feature ブランチを pre-release にマージして GitHub Actions で公開して`
- `/pre-release pre-release ブランチの publish workflow が動くところまで確認して`