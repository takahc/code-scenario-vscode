# Progress

- Branch: `feature/scenario-dnd-reorder`
- Started: `2026-04-03 03:54:16`
- Task: `scenario-dnd-reorder`

## Summary
Code Scenario の Infinity UX loop の次手として、固定順だった scenario 行をドラッグ&ドロップで並べ替えられる UX 改善に着手した。

## Why
item はドラッグ&ドロップで並べ替えや移動ができる一方、scenario 行は作成順で固定されており、利用頻度や作業フェーズに応じた並び替えができない。

## Goal
scenario 行同士のドラッグ&ドロップで表示順を変更できるようにし、整理・再優先付け・アーカイブ運用をしやすくする。

## Completed
- 現在ブランチ `feature/copy-item` の内容を確認し、直前の `Copy Item...` 機能が `pre-release` へ取り込み済みであることを整理した。
- idea-man に次の小さく出荷可能な UX 改善候補を探索させ、既存 DnD と整合する `scenario` 行のドラッグ&ドロップ並べ替えを次テーマとして採用した。
- 実装開始用ブランチ `feature/scenario-dnd-reorder` を `pre-release` から作成した。
- implementer が `src/extension.ts` に scenario 用 DnD MIME を追加し、scenario 行だけを対象にした drag/drop 分岐を実装した。
- implementer が `src/scenarioProvider.ts` に `moveScenarioAfter` を追加し、scenario を target の直後へ並べ替えて既存保存フローで永続化する処理を実装した。
- README の Drag and Drop 説明を更新し、scenario 行もドラッグ可能であることと制約事項を現実装に合わせて反映した。
- `npm run compile` が成功し、TypeScript ビルドが通ることを確認した。
- checker が受け入れ条件 5 項目すべてを満たすと報告し、scenario 並べ替えの splice ロジック、自己ドロップ no-op、item DnD 非回帰、永続化、README 整合を確認した。
- checker 報告として `npm run lint` は既存の ESLint 設定ファイル不在により失敗継続であり、今回変更による regression ではないと整理した。

## Uncompleted
- コミット、push、pre-release 反映、preview 公開。

## Cautions
作業ツリーには未追跡の `scripts/` ディレクトリが存在するため、今回の変更やコミット対象へ誤って含めないよう注意が必要。`npm run lint` は今回の変更に起因せず ESLint 設定ファイル不在で失敗する状態が続いている。checker は blocking issue なしと判断したが、mixed selection drag と automated test 不在は低優先の残課題として残る。

## Next Steps
変更一式と progress を同じ論理単位でコミットし、feature ブランチを push したうえで pre-release フローに進める。
