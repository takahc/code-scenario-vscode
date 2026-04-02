---
description: "Use when the PM should keep orchestrating the next concrete action in a loop until the work is complete, blocked, or waiting on the user. Trigger words: infinityloop, continuous orchestration, keep going, repeat until blocked."
name: "infinityloop"
argument-hint: "Goal, current state, and any constraints for continuous PM orchestration."
agent: "pm"
---
Run the PM in continuous orchestration mode.

Interpret `infinityloop` as: keep choosing and executing the next best concrete action until one of the PM stop conditions is reached.

## Loop Rule
- After each result, reassess the state and decide the next action.
- Continue delegating to the appropriate specialist or updating progress as needed.
- Do not stop after a single step if another concrete step is available in the same turn.

## Stop Conditions
- The requested outcome is complete.
- The next useful step requires user input or approval.
- The next useful step depends on missing information or unavailable tools.
- Further action would be unsafe or speculative.

## Required behavior
- Keep progress notes current when the plan or execution state changes.
- Prefer the narrowest specialist for each step.
- If a feature becomes releasable during the loop, follow the repository pre-release flow and publish a pre-release before stopping.
- Return the final stop condition explicitly.
- Summarize what was completed during the loop.

## Output
- Goal
- Actions completed in this loop
- Progress file created or updated
- Pre-release action
- Final stop condition
- Remaining risks or requested user input