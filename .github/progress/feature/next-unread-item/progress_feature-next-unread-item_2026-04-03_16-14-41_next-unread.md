# Progress

- Branch: `feature/next-unread-item`
- Started: `2026-04-03 16:14:41`
- Task: `next-unread`

## Summary
Unread Focus Mode まで揃った現状を踏まえ、次の UX ループとして **Next Unread Scenario Item** を追加し、未読消化の導線を一手で進められるようにする方針を確定した。

## Why
現状でも read/unread 状態、scenario progress、Resume from First Unread、Sequential Walkthrough は揃っているが、未読だけを連続で進めるには「最初に未読へ飛ぶ」「次は通常 walkthrough で既読も混ざる」という段差が残っている。残作業の消化フローを自然につなぐには、既存 progress と walkthrough を活かした unread 専用の次移動が必要だった。

## Goal
`Next Unread Scenario Item` コマンドを追加し、scenario 行・ビュー title・Command Palette から、現在の walkthrough 位置を踏まえて次の未読 item を開けるようにする。データモデルは変更せず、既存の open/reveal/read-progress/walkthrough 状態と整合した一出荷単位に収める。

## Completed
- `origin/pre-release` に unread focus mode 系の直近 release 済み差分が含まれていることを確認し、次の UX ループへ進める判断をした。
- idea-man の比較結果から、次の小さく高価値な改善候補として **Next Unread Scenario Item** を採用した。
- 既存の root worktree は detached HEAD かつ別ループ由来の未コミット差分を含んでいたため、混線回避のために `origin/pre-release` から専用 worktree `/Users/aki/.copilot/session-state/2617f925-6d44-4d91-b0a2-8bb5d20fa049/files/next-unread-item` と作業ブランチ `feature/next-unread-item` を作成した。
- 受け入れ条件の初期案として、scenario 解決は既存 walkthrough ルール再利用、walkthrough 位置があればその次の未読へ進む、位置がなければ最初の未読へ進む、未読なし時は情報メッセージ、を採用した。
- `code-scenario.nextUnreadItem` の実装を、scenario 行ではその scenario を直接使い、それ以外では既存 walkthrough 解決（effective Quick Add → 単一 scenario → picker）を使う形に更新した。
- `Next Unread Scenario Item` を scenario row context menu と Scenarios view title に追加し、README の walkthrough/progress 節も新しい未読継続フローに合わせて更新した。
- worktree 直下では `npm run compile` が local `tsc` 不足で失敗する環境だったため、repo 既存 `node_modules` の TypeScript binary と shared `@types` を使って等価 compile を実行し、今回の変更範囲で TypeScript compile が通ることを確認した。
- checker により、`origin/pre-release` 差分としての scope は menu 露出と `nextUnreadItem` の scenario-scoped refinement に収まっており、scenario row/title/Command Palette の導線、同一 scenario 内での next unread / wrap / no-unread 挙動、既存 open/reveal/read-progress 連携に blocker がないことを確認した。

## Uncompleted
- コミット作成。
- pre-release 反映と preview 公開。

## Cautions
通常の `Next Scenario Item` や `Resume from First Unread` と責務が重なりやすいため、新コマンドのスコープを「未読のみへ進む」ことに限定し、既存コマンドの意味は変えない。checker は blocker なしと判定したが、この repo には walkthrough/menu 導線の自動テストがないため、preview では scenario row / title からの discoverability と wrap/no-unread メッセージの体感確認が主な実運用確認点になる。

## Next Steps
変更一式とこの progress を同じ論理単位でコミットし、`pre-release` へ反映して preview 公開をトリガーする。
