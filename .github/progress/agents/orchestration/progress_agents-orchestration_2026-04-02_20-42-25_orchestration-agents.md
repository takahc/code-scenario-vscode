# Progress

- Branch: `agents/orchestration`
- Started: `2026-04-02 20:42:25`
- Task: `orchestration-agents`

## Summary
custom agent によるオーケストレーション運用を追加し、PM と specialist 群、progress 記録、継続ループ用 prompt を整備した。

## Why
複数の specialist agent を役割分担させつつ、PM が進行管理、progress 記録、継続改善フローを一貫して扱えるようにする必要があった。

## Goal
UX 改善や実装、検証、説明、progress 記録を custom agent 群で分担し、継続的に回せる作業基盤を整える。

## Completed
- PM、idea-man、implementer、checker、descriptioner の agent 定義を追加した
- PM 用 progress 記録 prompt を追加した
- progress の命名規則と記録粒度を固定する instruction を追加した
- 継続オーケストレーション用の `infinityloop` prompt を追加した
- UX 改善を反復実行する `infinityuxloop` prompt を追加した

## Uncompleted
- 実運用での prompt 精度や handoff の粒度調整は未検証
- ブランチ自動作成や PR 作成まで含む運用補助は未追加

## Cautions
- `infinityloop` と `infinityuxloop` は停止条件付きの反復であり、文字通りの無限実行ではない
- `main` または `develop` では repository ルールにより直接コミットできない

## Next Steps
- 実際のタスクで各 agent と prompt を試し、handoff と progress 記録の粒度を調整する
- 必要なら作業ブランチ作成や PR 補助の prompt を追加する