# Progress

- Branch: `feature/add-item-below`
- Started: `2026-04-03 07:38:32`
- Task: `add-item-below`

## Summary
Code Scenario の次の UX 改善候補を再評価し、選択中の項目の直後に兄弟項目を追加できる「Add Item Below」を今回の作業単位として採用した。

## Why
現在のツリー操作では項目行からの **Add Item** が常に子項目追加として扱われるため、線形なシナリオを組み立てたい場面では「子として追加してから移動で直す」余分な操作が発生する。

## Goal
項目行から同階層の直後へ新規項目を追加できる導線を追加し、連続的なシナリオ編集を一手で行えるようにする。

## Completed
- 現在のチェックアウトが stale であり、`feature/infinityuxloop` も `origin/pre-release` に吸収済みであることを確認した。
- 最新の `origin/pre-release` を取得し、次の作業基点として扱う判断を行った。
- idea-man の提案を比較し、次の小さく出荷可能な改善として「Add Item Below」を採用した。
- `origin/pre-release` から新しい作業ブランチ `feature/add-item-below` を別 worktree で作成した。
- implementer が item 行向けの新コマンド `Add Item Below`、既存子追加の `Add Child Item` への分離、同親直後への兄弟挿入ロジック、追加後の reveal/select 維持、README 追記を実装した。
- checker が差分レビューを行い、scenario 行は既存の `Add Item` のまま・item 行は `Add Child Item` と `Add Item Below` に分離されていること、トップレベル/ネスト両方で同親直後へ挿入されること、追加後の reveal/select が維持されていることを確認した。
- checker が worktree に依存関係を導入した上で `npm run compile` 成功を確認した。
- `npm run lint` は ESLint 設定ファイル不在という既存リポジトリ課題で失敗することを再確認した。

## Uncompleted
- コミット作成。
- pre-release への反映と preview 公開。

## Cautions
元の作業ツリーには今回の変更対象外の未追跡 `scripts/` ディレクトリがあるため、以降の作業は別 worktree で進める。今回の確認は compile とコードレビュー中心で、`Add Item Below` の UI 操作感までは自動化されていない。なお `npm run lint` は今回の変更とは無関係に ESLint 設定ファイル不在で失敗する状態が続いている。

## Next Steps
変更一式と progress を同じ論理単位でコミットし、pre-release フローで preview 公開まで進める。
