# Progress

- Branch: `feature/unread-focus-mode-refresh-fix`
- Started: `2026-04-03 13:08:56`
- Task: `unread-focus-refresh-fix`

## Summary
`pre-release` 上の Unread Focus Mode 実装に対し、reveal フロー後に一時表示された既読項目がフィルタに戻らない release-blocking 不具合を修正する後続ブランチ。元の修正はローカルで dirty worktree に加えられ検証済みだったが、detached dirty worktree のまま出荷できないため `pre-release` ベースの新ブランチへ再適用した。

## Why
`clearTemporaryRevealAfterUse()` で temporary reveal state を解放しても `this.refresh()` を呼んでいなかったため、Unread Focus Mode 中に reveal 系フロー（Find / Reveal Active File / repair / duplicate 等）で一時表示された既読項目が、次回の自然な refresh が来るまでツリーに残り続けていた。

## Goal
`clearTemporaryRevealAfterUse()` が状態を実際にクリアした場合に即座に `this.refresh()` を呼び出すことで、Unread Focus Mode のフィルタ表示を reveal フロー完了後すぐに復元する。

## Completed
- PM が `pre-release` ベースの新ブランチ `feature/unread-focus-mode-refresh-fix` を指定し、detached dirty worktree からの再適用を決定した。
- checker によりロジックの正当性が確認された（state が実際にクリアされた場合のみ refresh を呼ぶ最小変更）。
- implementer により `src/scenarioProvider.ts` の `clearTemporaryRevealAfterUse()` を修正した。具体的には `return this.clearTemporaryRevealState()` を `const cleared = this.clearTemporaryRevealState(); if (cleared) { this.refresh(); } return cleared;` に変更した。
- checker により `npm ci` 後の `npm run compile` が通過し、この修正が commit と pre-release フローへ進める準備ができていることを確認した。
- `npm run lint` は ESLint 設定ファイル不在により失敗する repo baseline であり、今回の修正起因ではないことを再確認した。

## Uncompleted
- コミット作成。
- pre-release へのマージと preview 公開。

## Cautions
変更は `clearTemporaryRevealAfterUse()` 1 メソッドのみに閉じており、他の refresh パスや永続化ロジックには触れていない。reveal フロー中の `finally` で呼ばれる場合を含め、状態が実際にクリアされた時だけ refresh が走るため二重 refresh のリスクは最小限。UI 上の最終確認は VS Code host 上でしか完全には再現できないため、release 判定は compile とロジックレビュー中心で行っている。

## Next Steps
変更と progress を同じ論理単位でコミットし、`feature/unread-focus-mode-refresh-fix` を `pre-release` へ反映して preview 公開まで進める。
