# Progress

- Branch: `feature/tree-dnd-ux`
- Started: `2026-04-02 16:16:46`
- Task: `tree-dnd-ux`

## Summary
Code Scenario の UX 改善として、ツリー上で item を直接ドラッグ＆ドロップして並び替え・シナリオ間移動できる v1 機能を実装した。

## Why
既存の `Move Item...` は機能としては成立しているが、並び替えやシナリオ間移動のたびにコマンド起点の操作が必要で、ツリー UI としては回りくどい。頻度の高い移動操作を直接操作に寄せることで、日常利用の摩擦を下げたい。

## Goal
Code Scenario ツリーで item ノードを直接ドラッグできるようにし、並び替えとシナリオ間移動をより短い操作で完了できるようにする。

## Completed
- `pre-release` から `feature/tree-dnd-ux` ブランチを作成した。
- 現在の UX とコード構造を確認し、v1 は「item のみドラッグ可能」「scenario にドロップでその scenario 末尾へ移動」「item にドロップでその直後へ挿入」という方針に決定した。
- 実装範囲から、scenario ドラッグ、複数選択ドラッグ、外部ドロップ、drag-to-make-child を除外する判断を記録した。
- 実装前のベースライン確認として `npm run compile` と `npm run lint` を確認し、compile は通る一方で lint は ESLint 設定ファイル不在によりベースラインから失敗することを確認した。
- implementer から TreeView への drag and drop controller 追加、挿入位置を扱える item move ロジック追加、README 追記まで含む初回実装が返却された。
- checker による確認で、`npm run compile` は通ること、`npm run lint` は引き続きベースライン事情で使えないことを再確認した。
- checker 指摘の「同一 scenario の root へ drop した top-level item が末尾へ移動しない」不整合を修正し、同一 scenario root への drop は「すでに末尾のときのみ no-op」となるように調整した。
- `README.md`、`src/extension.ts`、`src/scenarioProvider.ts` により、item-only の tree drag and drop、scenario root への append、item 直後への挿入、自己・子孫への不正 drop 拒否、成功時の reveal/select を実装した。
- 最終確認で compile は成功し、checker から v1 スコープとして機能準備完了との判断を得た。

## Uncompleted
- pre-release への反映と preview 公開。

## Cautions
VS Code の Tree Drag and Drop API では drop 位置の意味付けが曖昧になりやすいため、v1 は「item に落としたら子にする」のような複雑な挙動を避け、再配置中心の仕様に限定する。

現時点ではリポジトリ標準の lint がベースラインから失敗しているため、今回の変更では compile を主な回帰確認の軸に置く必要がある。

## Next Steps
feature ブランチをコミット単位として確定し、pre-release フローで preview 公開を進める。
