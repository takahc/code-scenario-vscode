# Progress

- Branch: `feature/unread-focus-mode`
- Started: `2026-04-03 11:02:41`
- Task: `unread-focus-mode`

## Summary
Code Scenario の次の UX ループとして進めた **Unread Focus Mode** は実装・検証・release 判定を完了し、`feature/unread-focus-mode` から `pre-release` への反映と preview 公開トリガーまで完了した。

## Why
read/unread 状態、scenario 単位の progress、未読からの再開導線は揃ったが、ツリー自体は既読項目も常に全件表示のままで、項目数が増えるほど「次に読むべきもの」を視覚的に拾いづらい。read progress の価値を日常導線へ変えるには、残タスクだけを即座に見せる表示面の改善が必要だった。

## Goal
Code Scenario ビューに表示フィルタとしての Unread Focus Mode を追加し、未読 item とその文脈に必要な親だけを見せ、既読済みの枝や scenario を隠すことで未読消化に集中できる UX を実現する。

## Completed
- 現在の `feature/item-read-toggle` は pre-release `0.1.50` まで公開済みで、次の UX ループ選定フェーズに入っていることを確認した。
- ローカル本体 worktree には未追跡 `scripts/` があるため、そのままでは新規実装を混在させるリスクがあると判断した。
- idea-man の検討結果を受け、次の小さく出荷可能な改善として **Unread Focus Mode** を最優先に決定した。
- 仕様の骨子として、未読 item・未読子孫を持つ親 item・未読を含む scenario のみを表示し、これは read 状態を書き換えない表示フィルタであることを明確化した。
- hidden な既読 item を reveal する既存導線では、必要に応じてフィルタを外してから reveal する方針を採用した。
- `origin/pre-release` から専用 worktree を作成し、実装開始用ブランチ `feature/unread-focus-mode` を切った。
- implementer により `src/scenarioProvider.ts` へ未読フォーカス状態の workspace 永続化、親保持つき階層フィルタ、空状態メッセージ、hidden item reveal 前のフィルタ解除を実装した。
- implementer により `src/extension.ts` と `package.json` へ Enable/Disable Unread Focus Mode コマンドと view title トグルを追加し、treeView message と context key を連動させた。
- implementer により README へ Unread Focus Mode の挙動・制約・起動方法を追記した。
- implementer の報告と PM spot-check により、find/reveal/duplicate/repair/add 後 reveal が共通 helper `revealItemNode` を経由し、filter 中に隠れた item でも可視化してから reveal する構成になっていることを確認した。
- 実装 worktree で `npm install` と `npm run compile` が成功し、`npm run lint` は ESLint 設定ファイル不在という repo baseline で失敗する状態を再確認した。
- checker により `npm run compile` / `git diff --check` は通過した一方、filtered-out item を reveal する際に `Unread Focus Mode` が永続的に off へ保存される設計は release-blocking と判定された。
- blocker の論点を、Find / Reveal Active File / duplicate reveal / auto-reveal / repair など既存 reveal 導線が **一時可視化だけで済むべきところを persistent state まで変えてしまう** 点だと整理した。
- implementer により provider 中央で temporary reveal path を持つ方式へ修正し、README も「mode を off にせず一時可視化する」説明へ更新した。
- checker の再確認により、persisted off 化の blocker 自体は解消した一方、temporary reveal state が mode toggle まで残留し得るため「一時可視化」が十分に短命でない点が新たな release-blocking と判定された。
- implementer により shared reveal helper の `finally` で temporary reveal state を解放する修正が入り、provider 側の punched-through 可視化寿命を reveal 処理に閉じ込めた。
- 最終 checker により、temporary reveal state が後続 refresh へ持ち越されないことを確認し、残る「次回 refresh まで一時表示が見える場合がある」点は nice-to-have 扱いで出荷可能と判定された。
- `feature/unread-focus-mode` は merge commit `d5d7f97`（`merge: feature/unread-focus-mode into pre-release`）で `pre-release` へ取り込まれた。
- GitHub Actions `Publish Extension` run `#23931031040`（workflow run number `51`）は `pre-release` / head SHA `d5d7f97e165550411079de926b943cd4fa05b3dd` で成功し、preview 公開トリガーまで完了した。

## Uncompleted
- 必要であれば、公開済み preview に対する任意の手動 E2E spot-check。

## Cautions
`npm run lint` は今回も ESLint 設定ファイル不在という既知の repo baseline のままで、Unread Focus Mode 固有の release blocker ではない。manual E2E を行う場合は、Unread Focus Mode の on/off、find/reveal 系導線、read/unread progress 表示の最終体験確認に留めればよい。

## Next Steps
必要なら公開済み preview で手動 E2E を軽く実施する。
その後は `pre-release` を基準に次の UX ループ候補を選定する。
