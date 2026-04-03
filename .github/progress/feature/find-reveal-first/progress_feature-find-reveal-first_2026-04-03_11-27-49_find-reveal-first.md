# Progress

- Branch: `feature/find-reveal-first`
- Started: `2026-04-03 11:27:49`
- Task: `find-reveal-first`

## Summary
Code Scenario の継続 UX 改善として、`Find Scenario Item...` が検索候補選択だけで項目を開いて既読化してしまう挙動を、ツリー上での reveal-first な探索体験へ変更した。

## Why
既読/未読や walkthrough による進捗管理が価値になっている一方で、検索コマンドが確認だけで open を発火すると、ユーザーが意図しない既読化や状態更新を招いてしまうため。

## Goal
`Find Scenario Item...` で候補選択時は対象項目をツリー上で reveal・select するだけにし、明示的な open 操作だけが既存の open/mark-read 挙動を起こすようにする。

## Completed
- infinityuxloop の次候補を整理し、低コスト高効果の改善として `Find Scenario Item` の reveal-first 化を選定した。
- 既存の `feature/infinityuxloop` が task-aligned ではなく `origin/pre-release` に対して追加差分も抱えていたため、`origin/pre-release` から専用ブランチ `feature/find-reveal-first` を切って clean な worktree を作成した。
- implementer が `code-scenario.findScenarioItem` の候補選択時に `openItem` を呼ばないよう変更し、既存の reveal helper を `ensureVisible` オプション付きで再利用する形に調整した。
- `Find Scenario Item` の README 説明を、open ではなく reveal/select する挙動に更新した。
- checker が周辺コードを確認し、明示的な open 導線は維持されたまま、find フロー単体では既読や cached line 更新を起こさないことを確認した。
- shared toolchain を使った TypeScript 型検証が成功した。
- ESLint は設定ファイル不在という既存リポジトリ事情により実行できないことを再確認した。

## Uncompleted
- 変更一式のコミット。
- リモートへの push。
- pre-release への反映と preview 公開。

## Cautions
検索結果を確実にユーザーへ見せるため、find フローでは `codeScenarioView.focus` を呼んでから reveal している。このためコマンド実行後にフォーカスがサイドバーへ移る。ESLint は設定ファイルがないため引き続き検証に使えない。

## Next Steps
変更と progress を同じ論理単位でコミットし、push 後に pre-release フローで preview 公開まで進める。
