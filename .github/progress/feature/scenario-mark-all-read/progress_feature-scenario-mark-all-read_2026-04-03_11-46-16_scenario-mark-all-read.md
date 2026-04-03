# Progress

- Branch: `feature/scenario-mark-all-read`
- Started: `2026-04-03 11:46:16`
- Task: `scenario-mark-all-read`

## Summary

シナリオレベルの一括既読操作 **Mark All as Read** を `pre-release` ベースで実装した。既存の **Reset Visited State** コマンドの対称として追加し、未読アイテムが何件既読になったかを成功メッセージで報告する UX に仕上げた。

## Why

PM がシナリオの進捗操作として「全アイテムを一括で既読にする」コマンドを選定した。Reset Visited State の逆方向にあたる操作が欠けており、ユーザーが手動で 1 件ずつ既読にするしかない状態だった。

## Goal

シナリオコンテキストメニューの `4_progress` グループに **Mark All as Read** を追加し、実行すると未読アイテムをすべて既読にして件数を通知する。全件既読済みのときは no-op メッセージを表示してツリーを変更しない。

## Completed

- PM がフィーチャーを選定し、`origin/pre-release` をベースに `feature/scenario-mark-all-read` ブランチおよびワークツリーを作成した。
- `src/scenarioProvider.ts` に `markAllVisited()` ヘルパーと `markAllScenarioItemsRead()` メソッドを追加した。未読 → 既読に変更したアイテム数を返し、変更なしのときは `0` を返して保存をスキップする。
- `src/extension.ts` に `code-scenario.markAllScenarioItemsRead` コマンドを登録した。`resolveScenarioSelection` で既存のシナリオ選択解決ロジックを再利用し、エディタを開かず、ウォークスルー位置を移動しない。
- `package.json` にコマンド宣言（`"title": "Mark All as Read"`, `"icon": "$(pass-filled)"`）を追加し、コンテキストメニューの `4_progress` グループへ `resetScenarioVisitedState` と同条件でエントリを追加した。
- `README.md` の「Reset read progress」セクションに **Mark All as Read** の簡潔な説明を追記した。
- 成功メッセージを `Marked N items as read in "Scenario".` 形式に改め、実際に変更された件数を通知するようにした。
- `npm run compile` が正常終了（TypeScript エラーなし）。

## Uncompleted

- この修正単位のコミットと push。
- pre-release への反映と preview publish の確認。

## Cautions

`pre-release` は別ワークツリーで checkout 済みのため、ブランチ作成や比較は `origin/pre-release` 基準で扱う。コミット時にワークツリー固有のパスや未追跡ファイルが混入しないよう注意する。

## Next Steps

progress を含めて fix をコミットし、`pre-release` へ反映して preview publish が正常に流れるか確認する。
