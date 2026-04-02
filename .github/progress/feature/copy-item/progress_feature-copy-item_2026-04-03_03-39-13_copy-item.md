# Progress

- Branch: `feature/copy-item`
- Started: `2026-04-03 03:39:13`
- Task: `copy-item`

## Summary
Code Scenario の Infinity UX loop の次手として、既存項目を別シナリオや別親配下へ複製できる `Copy Item...` 改善を採用し、`pre-release` 起点の実装まで完了した。

## Why
現在は項目を移動することはできるが、複数シナリオで再利用したい項目やサブツリーを複製する導線がなく、同じ内容を手で作り直す負担がある。

## Goal
シナリオ項目とその子孫を保持したまま別位置へ複製できるようにし、コード読解用のシナリオ構成を速く再利用できる UX にする。

## Completed
- 現在ブランチと `pre-release` の関係を確認し、直近の Quick Add 可視化改善が `pre-release` に反映済みであることを確認した。
- README と package surface、既存 progress を読み、直近までの UX 改善履歴を把握した。
- idea-man に次の小さく出荷可能な改善候補を探索させ、今回の改善として `Copy Item...` を採用した。
- `Copy Item...` の期待 UX を、項目サブツリー保持・新規 ID 採番・コピー後 reveal・自己/子孫へのコピー禁止を含むスコープで整理した。
- 実装開始用ブランチ `feature/copy-item` を `pre-release` から作成した。
- implementer が `code-scenario.copyItem` command、item context menu、command palette 非表示設定、destination picker、provider の deep clone 処理、コピー後 reveal/通知、README 追記を実装した。
- subtree 複製時に各ノードへ fresh ID を振り直し、note や cached line、workspace folder、stale 系のデータを保持する方針で実装された。
- implementer 報告として `npm run compile` 成功、`npm run lint` は既存の ESLint 設定欠如により失敗継続であることを確認した。
- checker が command/menu wiring、複製先候補、自己/子孫へのコピー禁止、同一シナリオ/同一親へのコピー許可、subtree ごとの fresh ID 採番、コピー後 reveal/通知を確認し、blocking issue なしと報告した。
- checker 報告として `git diff --check` と `node -e \"require('./package.json')\"` が成功し、release confidence は moderate と整理された。

## Uncompleted
- コミット、push、pre-release 反映、preview 公開。

## Cautions
作業ツリーには未追跡の `scripts/` ディレクトリが存在するため、今回の実装やコミット対象へ誤って含めないよう注意が必要。複製機能では subtree 全体に新しい内部 ID を振り直さないと、編集や reveal の対象が衝突するおそれがある。なお、`npm run lint` は今回の変更に起因せず ESLint 設定ファイル不在で失敗する状態が続いている。

## Next Steps
変更一式と progress を同じ論理単位でコミットし、feature ブランチを push したうえで pre-release フローに進める。
