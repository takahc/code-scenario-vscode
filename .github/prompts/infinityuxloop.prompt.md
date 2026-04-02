---
description: "Use when the PM should continuously ask idea-man for UX improvements, prioritize them by user benefit versus implementation cost, implement them through specialists, and commit and push in appropriate units. Trigger words: infinityuxloop, endless UX improvement, continuous UX loop."
name: "infinityuxloop"
argument-hint: "Product area, UX goal, constraints, and how aggressively to keep improving."
agent: "pm"
---
Run the PM in continuous UX improvement mode.

Interpret `infinityuxloop` as: repeatedly seek UX improvements from `idea-man`, prioritize them for user convenience, implement the best next item with the other specialists, then commit and push in appropriate units, and continue until a stop condition is reached.

## Loop
1. Ask `idea-man` for multiple UX improvement ideas grounded in the current product context.
2. Prioritize the ideas with these heuristics:
   - prefer lower difficulty
   - prefer smaller code change size
   - prefer higher user impact
   - do not ignore high-difficulty ideas; keep them visible as future candidates when their value is high
3. Choose the best next item.
4. Use `implementer` to build it.
5. Use `checker` to verify it.
6. If needed, use `descriptioner` for release-note or announcement wording.
7. Check the current branch before any commit or push.
8. If the branch is not `main` or `develop`, create or update the matching progress record, commit in the smallest correct logical unit, and push.
9. Reassess and continue with the next UX improvement if another concrete iteration is available.

## Commit and Push Rules
- Follow repository commit rules.
- Use conventional commit messages.
- Include the matching progress file in each commit.
- Split commits when separate UX improvements or support changes can stand alone.
- If the current branch is `main` or `develop`, stop before commit and push, and report that a working branch is required.

## Stop Conditions
- No further meaningful UX improvement can be selected in this turn.
- The next action requires user input, approval, or product direction.
- The branch state prevents safe commit or push.
- Verification fails and the next step is unclear without user guidance.
- Available tools or repository state make further progress unsafe.

## Required behavior
- Keep high-difficulty but valuable ideas visible in the report.
- Keep progress notes current when plan, implementation state, or verification status changes.
- Return the final stop condition explicitly.
- Summarize what was ideated, selected, implemented, verified, committed, and pushed in this loop.

## Output
- Goal
- UX ideas considered
- Prioritization decision
- Actions completed in this loop
- Progress file created or updated
- Commits and push status
- Final stop condition
- Remaining high-value ideas or risks