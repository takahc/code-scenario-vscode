# Progress

- Branch: `agents/orchestration`
- Started: `2026-04-02 20:52:25`
- Task: `prerelease-branch-strategy`

## Summary
PM と継続実行系 prompt、pre-release skill に、`pre-release` を基点に作業ブランチを切る運用を追加した。

## Why
preview 公開の基準線を `pre-release` に揃えないと、作業ブランチと公開ブランチの差分管理が曖昧になり、pre-release 反映時の判断コストが増えるため。

## Goal
実装前にブランチの適性を確認し、必要なら `pre-release` からタスク向けブランチを作成して作業する流れを PM が扱えるようにする。

## Completed
- PM agent に `pre-release` 起点の作業ブランチ確認と分岐責務を追加した
- `infinityloop` に実装前のブランチ確認と分岐ルールを追加した
- `infinityuxloop` に `pre-release` 起点のブランチ戦略と出力項目を追加した
- pre-release skill に source branch の起点確認ルールを追加した

## Uncompleted
- 実際にブランチ自動作成まで行う prompt や skill は未追加
- 運用時のブランチ命名規則はまだ固定していない

## Cautions
- `pre-release` 自体で直接実装を進めるのではなく、`pre-release` から切った作業ブランチで実装する前提である
- repository の branch protection や運用ルールによっては分岐手順の追加調整が必要になる

## Next Steps
- 必要なら `pre-release` から適切な作業ブランチを自動作成する prompt を追加する
- ブランチ命名規則を PM 向け instruction として固定する