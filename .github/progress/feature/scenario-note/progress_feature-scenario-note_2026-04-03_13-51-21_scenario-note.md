# Progress

- Branch: `feature/scenario-note`
- Started: `2026-04-03 13:51:21`
- Task: `scenario-note`

## Summary
Code Scenario の次の UX ループとして、scenario 自体に目的や補足を残せる **Scenario Note** を次の小さな出荷単位に選定し、`origin/pre-release` から実装用ブランチを切った。

## Why
item 単位では note を残せる一方、scenario 全体には「何のためのシナリオか」を記録する場所がない。そのため複数 scenario を並行運用すると、名前だけでは意図や読み方針を思い出しにくい。

## Goal
scenario に任意メモを保存・編集できるようにし、ツリー・tooltip・scenario 選択 UI から文脈をすぐ再確認できるようにする。

## Completed
- `feature/infinityuxloop` は前ループの Item Notes がすでに pre-release へ取り込まれた後のオーケストレーション枝であり、新規実装先としては使わず次の task branch を切る方針を確定した。
- idea-man の比較結果を受け、近接候補の walkthrough step counter や open-to-side よりも、既存 item notes と対になる **Scenario Note** を次の最優先 UX 改善に決定した。
- 実装開始用ブランチ `feature/scenario-note` を `origin/pre-release` から専用 worktree に作成した。
- 受け入れ条件の叩き台として、`ScenarioData.description?` の永続化、scenario tooltip 表示、scenario 選択 Quick Pick detail、編集コマンド、README 追記、delete-undo 系 clone での保持、を確定した。
- implementer により `ScenarioData` へ optional note を追加し、workspaceState 永続化と delete-undo の clone 経路で保持される Scenario Note 実装が入った。
- implementer により `code-scenario.editScenarioNote` コマンド、scenario コンテキストメニュー、scenario tooltip、scenario Quick Pick detail、ツリー上の `✎` 表示、README 追記が追加された。
- implementer 報告と PM spot-check により、item note 用 webview editor を scenario note にも再利用しつつ、scenario 行へは新たな inline action を増やさない方針でまとまっていることを確認した。
- checker により `ScenarioData.note?` の後方互換、save/clear/cancel 分岐、rename/delete-undo 保持、Quick Pick/detail・tooltip・tree indicator の各表示面を確認し、今回スコープでは release-blocking なしと判定された。
- checker により `npm run compile` 成功を再確認し、lint 不成立は repo 既知課題で今回変更起因ではないことを確認した。

## Uncompleted
- コミット、pre-release 反映、preview 公開。

## Cautions
新しい feature は `origin/pre-release` 起点の clean worktree で進め、root worktree に残る detached 状態や他タスクの未整理差分を混ぜない。Scenario Note は additive な optional field に限定し、既存 workspaceState データとの後方互換性を崩さないことが重要。現時点の残リスクは、note 編集導線に自動テストがないことと、lint が repo 基盤未整備で有効化されていないことに限られる。

## Next Steps
変更一式と progress を同じ論理単位でコミットし、clean な状態で pre-release フローへ進める。
