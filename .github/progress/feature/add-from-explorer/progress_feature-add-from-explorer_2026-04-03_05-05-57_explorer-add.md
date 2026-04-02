# Progress

- Branch: `feature/add-from-explorer`
- Started: `2026-04-03 05:05:57`
- Task: `explorer-add`

## Summary
Infinity UX loop の次手として、Explorer から file を直接 scenario へ追加できる導線を次の出荷単位に選定した。

## Why
現状の追加導線は editor 起点か手入力フォーム中心で、Explorer で対象 file を見つけた瞬間にそのまま bookmark できない。file を一度開いてから追加する回り道が必要で、Quick Add workflow の気持ちよさを Explorer 上で活かし切れていない。

## Goal
VS Code Explorer の file context menu から scenario 追加を行えるようにし、Quick Add target と既存の scenario 選択 UX を再利用しながら、file 発見から追加までの手数を減らす。

## Completed
- 現在の `feature/quick-add-target-status-bar` は実装差分がすでに `pre-release` へ取り込み済みで、現ブランチとの差分が progress 更新のみであることを確認した。
- `Publish Extension` workflow は `pre-release` push で pre-release publish を行う設定であることを再確認した。
- idea-man に次の UX 改善候補を比較させ、Explorer context menu からの scenario 追加を次の実装テーマとして採用した。
- 採用理由として、日常的な file 発見フローの摩擦を直接下げられ、既存 Quick Add target / scenario 選択ロジックを再利用でき、単独 preview 単位として小さく出荷しやすいことを整理した。
- 実装開始用ブランチ `feature/add-from-explorer` を `pre-release` から作成した。
- 初期受け入れ条件として、file のみ表示、Quick Add target 優先、single scenario 自動選択、multi-scenario 時 Quick Pick、成功通知、Command Palette 非表示を定義した。
- implementer が `code-scenario.addFileFromExplorer` command を追加し、Explorer の file context menu から `Add to Scenario...` を表示できるようにした。
- 実装は `resolveQuickAddTarget` と `createQuickItemData` を再利用する構成で、saved target / single scenario 自動選択 / multi-scenario Quick Pick を既存 Quick Add と同じ分岐で処理する形にそろえた。
- `package.json` に command 定義、`explorer/context` menu、Command Palette 非表示設定を追加し、README に Explorer 追加導線の説明を追記した。
- implementer 報告として `npm run compile` は成功し、`npm run lint` は既存の ESLint 設定ファイル不在による baseline failure のままだと整理した。
- checker が受け入れ条件を確認し、Explorer menu の対象制御、workspace 外 file のガード、Quick Add target 分岐、作成 item の構造が要求どおりであると報告した。
- checker 指摘として Explorer context menu の group が `navigation` だと上位に出すぎるため、preview 前に `2_workspace` へ下げる小修正を入れる方針にした。
- PM 判断で `package.json` の Explorer menu group を `2_workspace` に調整し、右クリックメニューでの主張が強すぎない配置へ整えた。
- checker の最終確認で release blocker はなし、`npm run compile` 成功・`npm run lint` は既存 baseline failure のままと再確認した。

## Uncompleted
- 完了時の commit / pre-release 反映。

## Cautions
作業ツリーには未追跡の `scripts/` ディレクトリが存在するため、今回ブランチでの commit 対象へ含めないよう注意が必要。Explorer menu は folder や workspace 外 resource に誤表示すると user-facing ノイズになるため、表示条件と URI 解決条件を慎重に確認する。`npm run lint` は今回変更起因ではなく、既存の ESLint 設定ファイル不在により baseline failure のままである。

## Next Steps
変更一式と progress を適切な commit にまとめ、`pre-release` へ取り込んで preview publish を走らせる。
