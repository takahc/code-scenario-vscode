# Progress

- Branch: `feature/tree-item-actions`
- Started: `2026-04-02 15:48:32`
- Task: `tree-actions`

## Summary

サイドバーのツリー項目操作を見つけやすくする改善を次の実装テーマとして選定し、専用ブランチを作成した。

## Why

現在のアイテム操作の多くが右クリックのコンテキストメニュー依存で、機能自体は揃っていても発見しづらく、日常利用の操作速度も上がりにくいため。

## Goal

シナリオツリー上で主要なアイテム操作をより発見しやすくし、開く・編集する・整理するといった導線を強化する。

## Completed

- 現在の UX と既存機能を確認し、次の改善候補を整理した。
- 次の実装単位を「ツリー項目アクションの改善」に決定した。
- `pre-release` から `feature/tree-item-actions` ブランチを作成した。
- implementer へ実装を委譲し、右クリック依存だった主要操作をホバー時の inline action として露出する方針で変更を反映した。
- `package.json` の command icon と `view/item/context` の `inline` action を拡張し、Scenario / Item 行から主要操作に直接触れられる状態にした。
- `README.md` と一部メッセージ文言を更新し、新しい操作導線を説明する状態にした。
- checker による確認で、TypeScript compile は成功し、この変更起因のブロッカーがないことを確認した。
- `npm run lint` の失敗は既存の ESLint 設定不備に起因するもので、今回変更による回帰ではないと整理した。

## Uncompleted

- 実装後の第三者視点での検証は未実施。
- コミットは未実施。
- pre-release への反映と preview 公開は未実施。

## Cautions

- 既存コマンド実装はあるため、ロジック追加よりも VS Code の view item action への適切な露出が主眼になる。
- discoverability を改善しつつ、既存の右クリック運用は壊さない方針で進める。
- VS Code の TreeView API ではネイティブなインライン rename 編集は扱いにくいため、今回は安定した hover action 露出を優先した。
- inline action の実際の表示とクリック体験は、VS Code 上での軽い手動確認があるとより確度が上がる。

## Next Steps

- 変更を 1 つの論理単位としてコミットし、pre-release 反映と preview 公開フローへ進める。
