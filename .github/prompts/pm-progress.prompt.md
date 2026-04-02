---
description: "Use when the PM needs to create or update a progress record under .github/progress for the current branch and task."
name: "PM Progress Writer"
argument-hint: "Task goal, what changed, current status, and any unfinished work."
agent: "pm"
---
Create or update a progress record for the current task under `.github/progress`.

Follow the repository progress rules and keep the record in Japanese.

## What to do
- Determine the current branch name and derive the required path and file name.
- If a matching progress file for the active task already exists, update it.
- If not, create a new file with the required template.
- Record only factual progress that affects planning, implementation, verification, or release readiness.
- Keep entries concise and specific.

## Required content
- `Summary`: what changed overall
- `Why`: background or reason for the work
- `Goal`: what this task is trying to achieve
- `Completed`: concrete finished work as short bullets
- `Uncompleted`: remaining work or unresolved items
- `Cautions`: risks, side effects, or things to watch
- `Next Steps`: the next concrete actions

## Writing standard
- Write in Japanese.
- Prefer short, factual sentences.
- Do not repeat chat history verbatim.
- Do not log trivial micro-steps unless they changed the plan or state.
- If specialists reported back, summarize the decision or outcome, not the whole transcript.

## Output
- State whether you created a new progress file or updated an existing one.
- Include the final progress file path.
- Summarize the key new entries in 3-5 short bullets.