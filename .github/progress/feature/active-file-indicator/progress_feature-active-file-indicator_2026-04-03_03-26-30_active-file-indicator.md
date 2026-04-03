# Progress

- Branch: `feature/active-file-indicator`
- Started: `2026-04-03 03:26:30`
- Task: `active-file-indicator`

## Summary
`/infinityuxloop` の次ユニットとして、現在開いているファイルに対応する scenario item を tree 上で受動的に把握できる **Active File Indicator** を今回の実装対象に確定した。

## Why
この時点の `pre-release` ベースには walkthrough / read-progress 系はまだ入っておらず、その上に依存する改善はそのままでは出荷単位にできない。一方で、既存の Reveal Active File は明示操作が必要で、auto reveal は tree のスクロールや選択を動かし得るため常時有効化しにくい。編集中ファイルが scenario に含まれているかを tree 上で静かに伝える受動的な合図は、小さな差分で日常利用価値が高い。

## Goal
アクティブ editor のファイルと一致する scenario item を tree 上で強調表示し、ユーザーが Reveal ボタンや auto reveal に頼らず「いま見ているファイルがどこに登録されているか」を一目で把握できるようにする。

## Completed
- root worktree は detached HEAD かつ別タスクの差分を含むため、実装先には使わないと判断した。
- `feature/infinityuxloop` には未コミット差分があり、このターンでは安全に継続利用しない方針にした。
- `pre-release` から clean worktree を作成し、作業ブランチを `feature/active-file-indicator` に整えた。
- idea-man に現行 `pre-release` ベース限定で次の UX 改善候補を比較させ、walkthrough 非依存で preview 出荷しやすい **Active File Indicator** を採用した。
- 採用案の要件として、active editor に一致する item の icon 強調、editor 切替時の即時更新、該当なし時の解除、stale warning の優先維持、selection/scroll/focus 非変更、初期 editor 反映、複数 scenario 同時強調を整理した。
- implementer により `ScenarioProvider` へ active file reference を保持する仕組みと一致 item の highlighted icon 表示を追加し、`extension.ts` から activation 時と `onDidChangeActiveTextEditor` 時に provider を更新するよう配線した。
- README の **Reveal Active File in Scenarios** 節へ、active editor 中は一致 item が受動的に強調表示されることを追記した。
- checker により `pre-release` との差分確認と TypeScript compile の成功を確認し、初期 editor 反映・editor 未選択時の解除・stale warning 優先・nested item 対応・既存 reveal/autoReveal 非干渉の観点で blocker なしと判定した。
- checker からは、editor 切替ごとに full tree refresh が走る点と `workspaceFolderUri` optional 型が実運用では過剰な点が低優先の polish 候補として挙がった。

## Uncompleted
- コミット作成。
- pre-release 反映と preview 公開。

## Cautions
`feature/infinityuxloop` worktree には README / extension / progress の未コミット変更があり、今回のブランチへ混入させない。`pre-release` ベースには walkthrough/read-progress が無いので、それらに依存する UI 改善へ途中で逸れない。checker は lint 実行について repo 側の既存 ESLint 設定不備で成立しないことも確認しており、これは今回機能の回帰ではなく既存基盤の制約として扱う。active-file indicator 自体は full refresh ベースで成立しているため、大規模 tree での最適化は将来の磨き込み候補。

## Next Steps
progress を feature ブランチ上の実装コミットと整合する形でコミットし、作業 tree を clean にしたうえで pre-release フローへ進める。
