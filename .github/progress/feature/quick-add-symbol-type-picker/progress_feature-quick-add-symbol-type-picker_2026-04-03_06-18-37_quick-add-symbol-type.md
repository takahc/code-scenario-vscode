# Progress

- Branch: `feature/quick-add-symbol-type-picker`
- Started: `2026-04-03 06:18:37`
- Task: `quick-add-symbol-type`

## Summary
Infinity UX loop の次手として、**Quick Add Selected Symbol** 実行時に item type をその場で選べるようにする改善を次の preview 単位に採用した。

## Why
現状の symbol 向け Quick Add は item type を常に `definition` で保存するため、call / reference など別の意味で記録したい場合でも追加後に Edit Item を開き直す必要がある。Quick Add の速さを保ったまま記録精度も上げたい。

## Goal
**Quick Add Selected Symbol** の完了前に軽量な選択 UI を挟み、既定値は `definition` のまま維持しつつ、必要な場合だけ item type を即座に切り替えられるようにする。

## Completed
- README と直近の progress を確認し、直前の preview 単位 `add-item-target-default` が公開済みであることを確認した。
- idea-man に現行プロダクト面を踏まえた UX 改善候補を比較させ、`quick-add-symbol-type-picker` を次の有力候補として採用した。
- 現在の作業 branch `feature/add-item-target-default` は既に preview 公開済みで新規実装には不向きと判断し、`pre-release` から `feature/quick-add-symbol-type-picker` を作成した。
- implementer が `src/extension.ts` の `quickAddSelectionSymbol` に type 選択 Quick Pick を追加し、duplicate guard 後に `definition` を既定値として `declare` / `definition` / `call` / `codeblock` / `reference` を選べるよう実装した。
- README に、**Quick Add Selected Symbol to Scenario** 実行時は type picker が表示され、Enter で既定値 `definition` を選び、Escape で追加を中止できることを追記した。
- checker が受け入れ条件 8 項目を確認し、symbol quick add 以外の導線を変えていないこと、`file` type を出していないこと、選択した type が保存されること、README が実装順序と一致することを確認した。
- `npm run compile` は成功し、`npm run lint` は既存どおり ESLint 設定ファイル不在の baseline failure のままだと再確認した。
- 変更一式を progress と合わせて `feat: add symbol type picker` (`d5aaf0d`) として commit し、`origin/feature/quick-add-symbol-type-picker` へ push した。
- 未追跡の `scripts/` を含む作業ツリーを汚さないため、detached worktree で `feature/quick-add-symbol-type-picker` を `pre-release` へ merge し、`origin/pre-release` の merge commit `70894bf` を push した。
- `Publish Extension` workflow (run `23922775792`) が成功し、`Publish pre-release extension` step まで完了して version `0.1.36` の preview 公開が走った。

## Uncompleted
(なし)

## Cautions
変更対象は **Quick Add Selected Symbol** の導線に限定し、既存の **Quick Add Current File** や通常の **Add Item** フローを巻き込まないことが重要。type picker の既定値は `definition` を維持し、Quick Add の速さを損なわないことが前提。作業ツリーには未追跡の `scripts/` ディレクトリがあるため commit 対象へ含めない。なお、`npm run lint` は今回の変更とは無関係に ESLint 設定ファイル不在で失敗する状態が続いている。

## Next Steps
必要に応じて Marketplace 上の preview 反映を確認し、次の Infinity UX loop 候補の選定へ進む。
