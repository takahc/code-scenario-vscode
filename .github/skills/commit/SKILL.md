---
name: commit
description: 'Create git commits from current workspace changes. Use when the user asks to commit, split changes into appropriate commit units, review diffs, follow .github/copilot-instructions.md rules, write a matching progress file, and use conventional commit messages.'
argument-hint: 'Describe what should be committed or which changes to group.'
user-invocable: true
---

# Commit Workflow

## When to Use

- User asks to commit current changes.
- User wants changes split into appropriate commit units.
- User expects conventional commits and repository-specific progress logging.
- There are multiple changed files and the correct commit grouping needs judgement.

## Required Inputs

- The user's intent about what should be committed now.
- Current git working tree state.
- Current git branch name.
- Repository rules in [copilot-instructions.md](../../copilot-instructions.md).

## Procedure

1. Inspect the working tree.
	- Run `git status --short`.
	- Review unstaged and staged diffs for the relevant files.
	- Identify unrelated changes and keep them out of the commit unless the user explicitly asks to include them.

2. Confirm the current branch.
	- Run `git branch --show-current`.
	- Use the branch name when deciding the progress directory path.
	- If the repository rule requires branch-name normalization, apply it when creating the progress file path.
	- Confirm [copilot-instructions.md](../../copilot-instructions.md) rules about branch restrictions.
	- If the current branch is `main` or `develop`, do not create a direct commit. Tell the user those branches must be updated through a Pull Request and switch to a working branch first.

3. Decide commit units.
	- Group files by a single logical purpose.
	- If the tree contains more than one logical change, create separate commits.
	- Do not mix feature work, refactors, docs-only updates, and instruction changes in one commit unless they are inseparable.

4. Read repository commit rules.
	- Open [copilot-instructions.md](../../copilot-instructions.md).
	- Follow its progress-file naming rule exactly.
	- Follow any branch-name normalization rule defined there.

5. Create a matching progress file for each commit unit.
	- Put it under `.github/progress/<branchName>/`.
	- Use the filename pattern required by [copilot-instructions.md](../../copilot-instructions.md).
	- If the branch name contains `/`, replace it with `-` in the path component when the repository rule says to do so.
	- Write the progress file in Japanese.
	- Summarize what is included in that specific commit only.

6. Stage only the files for the current commit unit.
	- Add the code or docs files for that unit.
	- Add the matching progress file in the same commit.
	- Leave unrelated files untouched.

7. Commit with a conventional commit message.
	- Choose the smallest correct type such as `feat`, `fix`, `docs`, `refactor`, `test`, or `chore`.
	- Keep the subject concise and specific to the staged unit.
	- Prefer lowercase subjects.

8. Verify the result.
	- Run `git status --short` after each commit.
	- Confirm only intended files were committed.
	- If multiple commit units remain, repeat from step 3.
	- Report the created commit hash and message back to the user.

## Decision Points

### One commit or multiple commits

- Use one commit when all changed files serve one user-visible change.
- Split commits when there are separable concerns, such as:
  - feature behavior and docs or instructions
  - code change and unrelated repository maintenance
  - one fix plus another independent fix

### What to do with unrelated changes

- If unrelated files are present, exclude them from staging.
- Mention them after committing so the user knows they remain in the working tree.
- Never revert them unless the user explicitly requests that.

### What to do on protected branches

- If the current branch is `main` or `develop`, stop before staging or committing.
- Tell the user that `main` and `develop` are updated only through Pull Request merges.
- Ask them to switch to or create a working branch before continuing.

### When to amend

- Amend only if the user explicitly asks, or when you just created the immediately previous commit in this session and need to fix its message or attach the missing matching progress file.
- Otherwise prefer a new commit.

## Quality Checks

- Every commit follows conventional commit format.
- Every commit includes exactly one matching progress file.
- The progress file reflects only the files in that commit unit.
- Unrelated changes remain unstaged.
- Final status is reported clearly.

## Output Expectations

- Tell the user which commit units were identified.
- For each commit, provide the hash and commit message.
- Mention any remaining uncommitted files.

## Example Prompts

- `/commit この差分を適切な単位でコミットして`
- `/commit docs の変更だけ先にコミットして`
- `/commit 今の差分を見て、必要なら複数コミットに分けて`
