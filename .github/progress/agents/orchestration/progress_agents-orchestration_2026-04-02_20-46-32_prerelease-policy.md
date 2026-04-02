# Progress

- Branch: `agents/orchestration`
- Started: `2026-04-02 20:46:32`
- Task: `prerelease-policy`

## Summary
PM と継続実行用 prompt に、機能完成時は pre-release を必須で実施する運用を追加した。

## Why
機能が完成しても preview 公開が抜けると、継続改善フローの出口が不明確になり、検証や共有のタイミングがぶれるため。

## Goal
PM が feature-complete を検知したら、pre-release スキルに従ってプレリリース版の公開まで責務として扱うようにする。

## Completed
- PM agent に pre-release 必須化の責務と制約を追加した
- `infinityloop` に feature 完成時の pre-release 実施要件を追加した
- `infinityuxloop` に pre-release 必須ルールと出力項目を追加した

## Uncompleted
- pre-release 実行結果をどの粒度で progress に追記するかの詳細運用は未調整
- 実際の pre-release workflow をこの変更自体では実行していない

## Cautions
- pre-release は `.github/skills/pre-release/SKILL.md` に従う前提であり、repository 側の workflow や権限状況に依存する
- branch や workflow 状態によっては、機能完成でも即時公開できず停止条件になる

## Next Steps
- 実際の feature 完了タスクで PM から pre-release フローが期待どおり案内されるか確認する
- 必要なら pre-release 実行後の記録フォーマットを追加で定義する