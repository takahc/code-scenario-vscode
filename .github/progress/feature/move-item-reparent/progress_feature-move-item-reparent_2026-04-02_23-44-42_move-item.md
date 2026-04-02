# Progress

- Branch: `feature/move-item-reparent`
- Started: `2026-04-02 23:44:42`
- Task: `move-item`

## Summary
Code Scenario の次の preview 向け UX 改善として、既存 item を別 scenario や別 parent item 配下へ安全に移動できる `Move Item...` を実装し、階層ツリーの整理し直しを delete / recreate なしで行えるようにした。

## Why
現状の tree では nested item を追加できても、追加先を誤った場合や構造を整理し直したい場合に、delete と再作成で対処するしかなく、日常的なメンテナンス負荷が高い。整理操作を補うことで tree を「追加するだけ」ではなく「育てる」体験に寄せられるため。

## Goal
scenario item の context menu から安全に移動先を選び、subtree を保持したまま別 scenario root または別 item 配下へ付け替えられるようにする。

## Completed
- 現在の baseline が `pre-release` であり、実装を直接進めない判断を再確認した。
- 既存の UX 改善履歴と現在の主要コード面 (`extension.ts`, `scenarioProvider.ts`, `itemEditorPanel.ts`) を確認した。
- `idea-man` の検討結果を踏まえ、次の改善対象を `Move Item...` に決定した。
- 比較候補のうち stale repair shortcut と duplicate item よりも、日常利用での能力欠落を埋める価値が高いと判断した。
- 実装用ブランチ `feature/move-item-reparent` を `pre-release` から作成した。
- 今回のスコープを item context menu の移動導線、scenario root / item 配下への移動、subtree 保持、self / descendant / no-op 防止に限定した。
- `implementer` により、`package.json` に `code-scenario.moveItem` を追加し、item context menu から `Move Item...` を起動できるようにした。
- `implementer` により、`src/extension.ts` に移動先 Quick Pick を追加し、scenario root と item 配下の両方を path 文脈付きラベルで選べるようにした。
- `implementer` により、`src/scenarioProvider.ts` に provider 側 move ロジックを追加し、cross-scenario move、subtree 保持、append-only 挿入、self / descendant / no-op 防止を一元化した。
- checker 指摘を受け、`Move Item...` を Command Palette から隠し、引数なし実行でも落ちない runtime guard を追加した。
- `checker` により、当初の Command Palette 露出バグ以外に本質的な問題がないことを確認した。
- 修正後の再確認で、preview scope として commit 可能の判定を得た。
- `npm run compile` は通過した。
- `npm run lint` は ESLint 設定ファイル不在の既存問題で失敗することを再確認した。

## Uncompleted
- 論理単位でのコミット
- pre-release 反映と preview 公開

## Cautions
- 移動先一覧は deep tree で分かりづらくなりやすいため、path 文脈を持つ表示が必要になる可能性がある。
- subtree を持つ item の cross-scenario move では children を失わないことが最重要。
- self や descendant 配下への移動を許すと循環構造になるため、候補生成段階または provider 側の両方で防御したい。
- 今回は drag-and-drop や sibling reorder まで広げず、append-only move に絞る。
- 自動テストは存在せず、lint も現状使えないため、検証信頼度は compile と差分レビュー中心になる。

## Next Steps
- 進捗ファイルを含めて feature ブランチでコミットする。
- pre-release フローを実行して preview 公開まで進める。
