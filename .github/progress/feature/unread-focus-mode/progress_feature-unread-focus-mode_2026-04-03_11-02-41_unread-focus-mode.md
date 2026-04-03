# Progress

- Branch: `feature/unread-focus-mode`
- Started: `2026-04-03 11:02:41`
- Task: `unread-focus-mode`

## Summary
Code Scenario の次の UX ループとして、未読項目だけに集中できる **Unread Focus Mode** を採用し、実装開始用の隔離 worktree とブランチを用意した。

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
- checker によりその後も、Find / Reveal Active File / stale repair / walkthrough 系の reveal 後に read item が次回 refresh まで可視のまま残る点が release-blocking として再報告された。
- implementer により `clearTemporaryRevealAfterUse()` で temporary reveal state 解放時に provider refresh も発火するよう修正し、reveal 完了直後に Unread Focus Mode の filtered UI を復元するようにした。
- checker の最終再確認により、temporary reveal cleanup 後に provider refresh が走ることで read item の居残りが解消し、reveal 動作・mode toggle・read state 永続化への回帰も見当たらないため release-ready と判定された。
- root worktree 側でも `npm run compile` は成功し、`npm run lint` は ESLint 設定ファイル不在という既知 baseline のまま失敗することを再確認した。

## Uncompleted
- コミット作成。
- pre-release への反映と preview 公開。

## Cautions
本体 worktree の未追跡 `scripts/` と別 feature の progress は今回の作業対象外なので、commit や pre-release merge に混入させない。表示フィルタ導入では、親保持付きの階層フィルタと既存 reveal 系コマンドの相性が主な実装リスクだったが、今回の release 判定は temporary reveal cleanup の即時 refresh までを対象にしている。手元 lint は ESLint 設定ファイル不在の repo baseline で失敗するため、compile と checker 判断を主な出荷根拠として扱う。

## Next Steps
変更一式と progress を同じ論理単位でコミットし、clean な pre-release 用 worktree で merge と preview 公開を進める。
