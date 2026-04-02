---
description: "Use when creating, naming, or updating progress records under .github/progress. Covers file naming rules, path derivation from branch names, Japanese writing, and the required granularity of progress updates."
applyTo: ".github/progress/**/*.md"
---
# Progress Writing Rules

## File Naming

- Store progress files under `.github/progress/<branchNameAsPath>/`.
- Use the file name format `progress_<branchName>_<startDateTime:YYYY-MM-DD_HH-mm-ss>_<shortTaskName>.md`.
- Replace `/` with `-` for `<branchName>` in the file name.
- Keep `/` as-is for `<branchNameAsPath>` in the directory path.
- Use a short ASCII task name for `<shortTaskName>` when possible.

## Required Template

Use this structure exactly.

```md
# Progress

- Branch: `feature/enhance-ux`
- Started: `2026-04-02 18:51:19`
- Task: `enhance-item-ux`

## Summary
(このセクションには、行った変更の概要を記述します。)

## Why
(このセクションには、なぜこの変更が必要だったのか、背景や目的を記述します。)

## Goal
(このセクションには、変更によって達成したい目標や、解決したい問題を記述します。)

## Completed
(このセクションには、完了した具体的なタスクや変更点を箇条書きで記述します。)

## Uncompleted
(このセクションには、未完了のタスクや、今後の課題などを記述します。)

## Cautions
(このセクションには、注意点や、変更に伴う影響などを記述します。)

## Next Steps
(このセクションには、次に行うべきタスクや、未解決の問題などを記述します。)
```

## Granularity

- Write progress in Japanese.
- Record milestone-level changes, not every small action.
- Update the file when one of these happens:
  - the plan changes
  - a specialist hands back a result that affects execution
  - implementation reaches a meaningful checkpoint
  - verification changes confidence or next steps
- In `Completed`, write concrete outcomes, not intentions.
- In `Uncompleted`, write only work that still matters.
- In `Cautions`, capture user-visible risk, technical debt, or verification gaps.
- In `Next Steps`, write the next concrete action, not a vague aspiration.

## PM Coordination

- The PM is responsible for recording its own instructions when they materially change execution.
- The PM is responsible for recording specialist handoff results in summarized form.
- Specialist reports should be condensed into decisions, findings, or outcomes.
- Avoid copying full chat transcripts into progress files.