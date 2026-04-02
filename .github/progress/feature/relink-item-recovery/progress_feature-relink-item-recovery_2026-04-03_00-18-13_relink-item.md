# Progress

- Branch: `feature/relink-item-recovery`
- Started: `2026-04-03 00:18:13`
- Task: `relink-item`

## Summary
warning 状態のシナリオ項目に対して、壊れたリンクを修復する専用導線を追加した。stale / ambiguous item に `Relink Item` を出し、open 失敗時の回復ボタンも同じ操作名にそろえることで、壊れたリンクの復旧 UX を preview 候補としてまとまる状態まで進めた。

## Why
現在の preview では stale item を警告表示できるが、実際に直すには open 失敗後のメッセージから `Edit Item` に回る必要があり、復旧までの導線が遠い。壊れた項目を見つけた瞬間に修復へ進めるほうが、ナビゲーション拡張としての信頼感を高めやすい。

## Goal
warning 状態の item から直接「再リンク」操作へ進めるようにし、ファイル移動や multi-root ambiguity が起きても迷わず回復できるようにする。

## Completed
- 現在ブランチが `pre-release` で clean であることを確認した。
- publish workflow が `pre-release` push で preview 公開する構成であることを確認した。
- 既存 progress と直近 UX 改善履歴を確認し、次の改善候補を比較した。
- `idea-man` の提案を受け、次の改善対象を warning 状態 item 向け `Relink Item` 導線に決定した。
- `explore` の調査で、既存の `resolveScenarioItemLocation`、`showItemEditor`、`editItem` を再利用する実装経路を整理した。
- 実装開始前に `pre-release` から作業ブランチ `feature/relink-item-recovery` を作成した。
- `implementer` により `code-scenario.relinkItem` コマンド、stale item 専用 context value、inline relink action、open 失敗時の `Relink Item` 導線を実装した。
- `checker` により、`workspaceFolderMissing` が relink 導線に乗らない穴と、一部 item command の node guard 不足を検出した。
- 指摘を受けて `workspaceFolderMissing` を warning 状態に含め、`renameItem` / `editItem` / `relinkItem` / `deleteItem` に item-node guard を追加した。
- 追加 polish として `openItem` にも同種の guard を追加し、stale item の context menu から重複する `Relink Item` 項目を外して inline 導線を主導線に整理した。
- 最終確認で compile 成功、lint は repo 既存の ESLint 設定未配置で失敗という状態を再確認し、feature scope では preview 判定に進める状態になった。

## Uncompleted
- コミット、pre-release 反映、preview 公開。

## Cautions
`Relink Item` は既存の editor を再利用しているため、操作名は分かれていても実際に開くパネルは `Edit Item` と同じである。今回の狙いは recovery 導線の明示であり、専用 editor への分岐までは入れていない。`npm run lint` は今回差分ではなく repo 全体の ESLint 設定欠如で失敗するため、品質判断は compile と code review を中心にしている。

## Next Steps
進捗ファイルを含めて変更をコミットし、`pre-release` へ取り込んで preview 公開フローを実行する。
