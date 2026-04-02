# Progress

- Branch: `feature/quick-add-dedup`
- Started: `2026-04-03 05:24:27`
- Task: `quick-add-dedup`

## Summary
Infinity UX loop の次手として、Quick Add 系導線で同じ file / symbol を同一 scenario に重複追加してしまう問題を防ぐ小さな UX 改善を次の preview 単位に採用した。

## Why
現在の Quick Add Current File / Quick Add Selected Symbol / Explorer からの Add to Scenario は、すでに追加済みの対象でもそのまま新規 item を作れてしまう。重複はその場で気づきにくく、tree の信頼感を落とし、後から整理コストを生む。特に Explorer 導線を追加した今は、同じ問題が 3 つの入口に広がっている。

## Goal
Quick Add 系 3 導線で同一 scenario 内の重複追加を事前に検知し、既存 item を見に行くか、それでも追加するかを user が選べるようにして、誤重複を減らしつつ既存 workflow の速さは保つ。

## Completed
- 現在の `feature/add-from-explorer` はすでに `pre-release` に取り込み済みで preview 公開まで完了しているため、次の Infinity UX loop を新規 branch で開始する判断を行った。
- idea-man に現行 product surface を踏まえた次の UX 改善候補を比較させ、重複追加ガード / scenario description / item label polish の 3 案を評価した。
- 採用候補として、`quickAddCurrentFile` / `quickAddSelectionSymbol` / `addFileFromExplorer` の 3 導線に共通で効き、model 変更なし・`src/extension.ts` 中心で閉じる `quick-add-dedup` を最優先と判断した。
- 受け入れ条件として、同一 scenario 内での file 重複と symbol 重複を検知し、`Reveal` または `Add anyway` を選べる notification を出すこと、重複がない場合の既存挙動は変えないこと、別 scenario への追加は阻害しないことを定義した。
- 実装開始用 branch `feature/quick-add-dedup` を `pre-release` から作成した。
- implementer が `src/extension.ts` に `checkQuickAddDuplicate` / `findDuplicatesInScenario` / `collectDuplicateItems` を追加し、3 導線それぞれに重複チェックを組み込んだ。README に Duplicate-Add Guard セクションを追加した。
- checker が 10 個の受け入れ条件をすべて満たすこと、重複検知が target scenario に限定されていること、Reveal / Add anyway / dismiss の分岐が期待どおりであることを確認し、release blocker なしと報告した。
- 検証結果として `npm run compile` は成功し、`npm run lint` は既存の ESLint 設定ファイル不在による baseline failure のままだと再確認した。
- 変更一式を progress と合わせて `feat: guard quick add duplicates` (`741ab88`) として commit し、`origin/feature/quick-add-dedup` へ push した。
- 未追跡の `scripts/` を避けるため一時 worktree で `origin/pre-release` に `origin/feature/quick-add-dedup` を `merge: feature/quick-add-dedup into pre-release` (`172ccbb`) として取り込み、push した。
- `Publish Extension` workflow (run `23920818104`) が成功し、`Publish pre-release extension` step まで完了して version `0.1.33` の preview 公開が走った。

## Uncompleted
(なし)

## Cautions
作業ツリーには未追跡の `scripts/` ディレクトリが存在するため、今回の commit 対象へ含めないよう注意が必要。重複検知は target scenario のみに限定しないと、意図的に別 scenario へ同じ file を置く workflow を壊す。symbol 重複の判定は file path と symbol 名の両方を使い、別 file の同名 symbol を誤検知しないようにする必要がある。

## Next Steps
必要に応じて Marketplace 上の preview 反映を確認し、次の Infinity UX loop 候補の選定へ進む。
