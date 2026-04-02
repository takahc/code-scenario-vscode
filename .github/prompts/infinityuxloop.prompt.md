---
description: "Use when the PM should continuously ask idea-man for at least 50 UX improvements, require a feature flag for each one, prioritize purely by user convenience, implement them through specialists, and commit and push in appropriate units. Trigger words: infinityuxloop, endless UX improvement, continuous UX loop."
name: "infinityuxloop"
argument-hint: "Product area, UX goal, constraints, required feature count, and how aggressively to keep improving."
agent: "pm"
---
Run the PM in continuous UX improvement mode.

Interpret `infinityuxloop` as: repeatedly seek UX improvements from `idea-man` and implement the best next item with the other specialists. Maintain a persistent backlog of at least 50 concrete feature candidates throughout the run, and require every implemented feature to be controllable with its own feature flag. Prioritize user convenience above all else, then commit and push in appropriate units, publish a pre-release whenever a feature is complete, and continue until a stop condition is reached.

## Loop
1. Ask `idea-man` for enough UX improvement ideas grounded in the current product context to create or replenish a persistent backlog of at least 50 concrete feature candidates.
2. Prioritize the ideas with these heuristics:
   - prefer higher user convenience above all else; treat it as the primary measure of user impact
   - do not down-rank an idea only because it is difficult
   - use implementation cost only as a tie-breaker when user value is genuinely equal
   - keep high-value ideas visible even when they are large or complex
3. Check whether the current branch is suitable for the selected work and, if needed, create a task-aligned working branch from `pre-release`.
4. Choose the best next item.
5. Define or update the feature flag plan for the selected item so the new behavior can be turned ON or OFF safely.
6. Use `implementer` to build it.
7. Use `checker` to verify it.
8. If needed, use `descriptioner` for release-note or announcement wording.
9. Check the current branch before any commit or push.
10. If the branch is not `main`, `develop`, or `pre-release`, create or update the matching progress record, commit in the smallest correct logical unit, and push.
11. When the implemented unit is feature-complete, follow the repository pre-release flow and publish a pre-release.
12. Reassess and continue with the next UX improvement if another concrete iteration is available.

## Commit and Push Rules
- Follow repository commit rules.
- Use conventional commit messages.
- Include the matching progress file in each commit.
- Split commits when separate UX improvements or support changes can stand alone.
- Keep feature flag support changes grouped with the feature they gate unless the flag infrastructure is clearly reusable on its own.
- If the current branch is `main`, `develop`, or `pre-release`, stop implementation work and create a task-aligned working branch from `pre-release` first.

## Pre-release Rule
- If a feature reaches a releasable state, the PM must follow `.github/skills/pre-release/SKILL.md` and execute the pre-release publication flow.
- Treat pre-release as mandatory for completed feature units, not as an optional extra.
- Report whether pre-release was published, blocked, or deferred and why.

## Stop Conditions
- No further meaningful UX improvement can be selected in this turn.
- The next action requires user input, approval, or product direction.
- The branch state prevents safe commit or push.
- Verification fails and the next step is unclear without user guidance.
- Available tools or repository state make further progress unsafe.

## Required behavior
- Keep at least 50 concrete feature candidates visible in the persistent backlog and summarize the current backlog state in the loop report.
- Treat feature-flag design as mandatory for every new feature; do not ship a feature without a documented ON/OFF path.
- Keep high-difficulty but valuable ideas visible in the report.
- Keep progress notes current when plan, implementation state, or verification status changes.
- Check branch suitability before implementation and report the branch creation or switch decision.
- If a feature is done, do not stop before handling pre-release unless a repository rule or blocker prevents it.
- Return the final stop condition explicitly.
- Summarize what was ideated, selected, feature-flagged, implemented, verified, committed, and pushed in this loop.

## Output
- Goal
- UX ideas considered
- Prioritization decision
- Feature-flag decision
- Branch action
- Actions completed in this loop
- Progress file created or updated
- Commits and push status
- Pre-release action
- Final stop condition
- Remaining high-value ideas or risks
