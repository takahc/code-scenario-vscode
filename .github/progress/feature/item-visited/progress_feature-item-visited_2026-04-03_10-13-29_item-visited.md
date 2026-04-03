# Progress

- Branch: `feature/item-visited`
- Started: `2026-04-03 10:13:29`
- Task: `item-visited`

## Summary
walkthrough を含む読解導線の次の UX 改善として、項目ごとの既読状態と scenario 単位の進捗表示を導入する方針を確定した。

## Why
現在の Code Scenario は項目を集めて順に辿る体験は整ってきた一方で、「どこまで読んだか」「どこから再開すべきか」を軽く把握する仕組みが弱い。recently shipped な walkthrough 系機能の価値を高めるには、読了の手がかりが必要だった。

## Goal
item を実際に開いたときだけ既読として記録し、tree 上で scenario 進捗と item の既読状態を控えめに見えるようにして、軽量な読解トラッキングを実現する。

## Completed
- 現在の published 状態を確認し、`feature/start-walkthrough-here` はすでに pre-release へ反映済みで次ループの実装先には使わないと判断した。
- idea-man の提案を比較し、次の小さく出荷可能な改善として `item visited/read state + scenario progress reset` を採用した。
- 実装の初期スコープを、`openItem` 成功時の既読記録、item/scenario の進捗表示、scenario 単位の reset コマンドに限定した。
- 実装用の新規ブランチ `feature/item-visited` を `origin/pre-release` から切り、隔離 worktree `.worktrees/feature-item-visited` を作成した。
- item に軽量な `visited` 状態を追加し、tree 表示で item は `read`、scenario は `x/y read` を出す実装を入れた。
- `openItem` 成功後のみ既読化するようにし、failed open / reveal-only では状態が付かない経路に揃えた。
- `Reset Visited State` コマンドを scenario 単位で追加し、`package.json` の command/menu と README 説明を更新した。
- copy は unread 開始、move は状態維持、undo restore は既存状態保持になるよう provider 側の clone/reset 挙動を調整した。
- `npm run compile` が成功し、`git diff --check` でも問題がないことを確認した。
- checker により、既読付与条件、reset、copy/move/undo の状態保持、README/package の配線に blocking issue がないことを確認した。
- `npm run lint` は今回の変更とは無関係に ESLint 設定ファイル欠如で失敗する既存状態であることを再確認した。

## Uncompleted
- feature のコミット作成。
- pre-release への反映と preview 公開。

## Cautions
既読化は「実際に open に成功したケース」のみに限定し、reveal や search、失敗した open、stale な項目では状態を汚さないことが重要。自動テストや lint による補強はまだ弱く、`npm run lint` は repo 側の ESLint 設定不足で引き続き機能していない。

## Next Steps
変更一式と progress を同じ論理単位でコミットし、その後 `pre-release` へ反映して preview 公開を進める。
