# Progress

- Branch: `feature/item-read-toggle`
- Started: `2026-04-03 10:54:09`
- Task: `item-read-toggle`

## Summary
Code Scenario の次の UX ループとして、scenario item ごとの read/unread 状態を個別に切り替えられる改善を採用した。

## Why
直近の walkthrough 改善で read 状態が progress 表示や「最初の未読から再開」に直結するようになった一方、現状の補正手段は scenario 単位の Reset Visited State しかなく、誤って read になった item を細かく戻せない。UX の価値が上がった read 状態を、ユーザー自身が小さく整えられる必要がある。

## Goal
item 単位で Mark as Read / Mark as Unread を実行できるようにし、scenario progress と未読再開導線を壊さずに read 状態を正確にメンテできるようにする。

## Completed
- 現在の作業ブランチ `feature/resume-unread-walkthrough` は直前ループの完了済み機能であり、pre-release `0.1.49` として公開済みであることを確認した。
- README、package.json の command/menu 面、関連 progress を確認し、最近の walkthrough/read UX の流れを整理した。
- idea-man の整理結果を受け、次の小さく高価値な改善候補として **item 単位の read/unread 切り替え** を最優先に決定した。
- 実装開始用ブランチ `feature/item-read-toggle` を `origin/pre-release` から作成した。
- 受け入れ条件として、read item に Mark as Unread、unread item に Mark as Read を出し分けること、scenario progress が即時更新されること、walkthrough 位置は変えないこと、Resume from First Unread Item が切り替え結果を自然に反映することを明確化した。
- implementer により `Mark as Read` / `Mark as Unread` コマンド、item の read/unread 別 `viewItem`、provider の visited 更新 helper、README の read progress 説明追記を実装した。
- 実装は既存の visited 永続化を再利用し、toggle 操作で editor を開かず walkthrough 位置も変更しない構成に揃えた。
- `npm run compile` が成功した。
- checker により、command/menu/provider の結線に release-blocking な問題がないこと、`Resume from First Unread Item` と既存 open 経路の visited 利用を壊していないことを確認した。
- 変更一式を `feat: add item read toggles` としてコミットし、`feature/item-read-toggle` を origin へ push した。
- 未追跡 `scripts/` を避けるため別 worktree を `origin/pre-release` から作成し、feature ブランチをマージしたうえで `npm ci` と `npm run compile` を通して `pre-release` へ push した。
- GitHub Actions の `Publish Extension` workflow 実行 `#23930458650` が成功し、`Publish pre-release extension` ステップ完了と pre-release `0.1.50` の publish を確認した。

## Uncompleted
- VS Code 拡張ホストでの手動 E2E 確認（実際の item 状態に応じたコンテキストメニュー表示、toggle 時に editor を開かないこと、walkthrough 位置が変わらないこと）。

## Cautions
ワークツリーには今回タスク外の未追跡 `scripts/` が残っているため、コミットや release 作業へ混入させない。`npm run lint` は今回も ESLint 設定ファイル不在という repo baseline のため失敗シグナルとして使えない。GitHub Actions では `actions/checkout@v4` / `actions/setup-node@v4` の Node.js 20 廃止予告 warning が継続している。UI レベルの手動 E2E（実際のコンテキストメニュー表示確認）は未実施のまま。

## Next Steps
必要なら拡張ホストで item read toggle の手動 E2E を行い、別ループで GitHub Actions の Node.js 24 対応を進める。
