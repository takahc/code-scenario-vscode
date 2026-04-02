# Progress

- Branch: `feature/reveal-new-item-after-add`
- Started: `2026-04-03 04:08:24`
- Task: `reveal-new-item-after-add`

## Summary
Code Scenario の Infinity UX loop の次手として、項目追加直後にツリー上で新規項目を即座に見つけられる `Reveal New Item After Add` を実装し、compile と checker の確認まで完了した。

## Why
既存の Add Item / Add Child / Quick Add は追加成功後に通知は出るが、深いツリーや項目数の多い scenario では「どこに入ったか」をユーザーが探し直す必要がある。copy / move / reveal 系の導線と比べて追加フローだけ位置確認の一貫性が弱い。

## Goal
追加成功直後に新しい item を Scenarios ツリーで reveal / select し、作成フローの確認コストを下げつつ、既存の editor フォーカスや hidden view 時の安全性を損なわない。

## Completed
- `pre-release` 起点の clean な別 worktree を用意し、実装用ブランチ `feature/reveal-new-item-after-add` を作成した。
- idea-man に次の小さく出荷可能な UX 改善候補を再探索させ、`Reveal New Item After Add` を最優先候補として採用した。
- 受け入れ条件として、Add Item / Add Child / Quick Add Current File / Quick Add Selected Symbol の成功後に新規 item を reveal すること、editor-driven add ではフォーカスを奪わないこと、view 非表示時も失敗させないことを確定した。
- implementer が `src/scenarioProvider.ts` の `addItem` を item id 返却に変更し、`src/extension.ts` の Add Item / Quick Add 系から既存 reveal helper を再利用して新規 item を id ベースで reveal するよう実装した。
- duplicate label が存在しても新規 item を誤認しないよう、ラベルではなく provider が生成した一意な item id を reveal 対象に使う方針を採用した。
- checker が `npm install` 後に `npm run compile` 成功を確認し、受け入れ条件は既存 `revealDroppedItem` → `treeView.reveal(..., { select: true, focus: false, expand: true })` 経路のコードレビューで満たすと判断した。
- checker 報告として `npm run lint` は引き続き ESLint 設定ファイル不在の repo baseline で失敗し、今回変更の regression ではないと整理した。

## Uncompleted
- コミット、pre-release 反映、preview 公開。

## Cautions
元の作業ツリーには未追跡の `scripts/` ディレクトリがあるため、本ループは別 worktree で継続している。UI の実動確認はこの環境では行えず、checker はコード経路レビューで accept しているため、preview 公開後に Add Child と Quick Add の操作感を軽く実機確認すると安心。editor からの Quick Add では tree reveal が editor focus を奪わないことが重要。

## Next Steps
変更一式と progress を同じ論理単位でコミットし、feature ブランチを push して `pre-release` へ反映、preview 公開まで進める。
