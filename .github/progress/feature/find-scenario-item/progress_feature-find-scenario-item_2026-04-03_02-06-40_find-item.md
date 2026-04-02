# Progress

- Branch: `feature/find-scenario-item`
- Started: `2026-04-03 02:06:40`
- Task: `find-item`

## Summary
Code Scenario の次の UX 改善として、シナリオ項目を横断検索して目的の項目へ素早く移動できる検索ジャンプ機能を実装し、コミット可能な状態まで進めた。

## Why
既存機能でシナリオ作成、項目追加、移動、アクティブファイルからの reveal は揃っているが、項目数が増えたときに名前・パス・シナリオ名から直接探して移動する手段が不足しているため。

## Goal
Quick Pick ベースの検索 UI を追加し、ユーザーがツリーを手で辿らなくてもシナリオ項目を見つけて開ける状態にする。

## Completed
- 現在のリポジトリ状態と `pre-release` ブランチ上の作業可否を確認した。
- UX 改善候補を比較し、次の反復対象を「Find Scenario Item」機能に決定した。
- 実装用ブランチ `feature/find-scenario-item` を `pre-release` から作成した。
- 既存の `Reveal Active File in Scenarios` と重複しないことを確認した。
- `Find Scenario Item...` コマンドを追加し、Quick Pick から項目名・シナリオ名・パスで横断検索できるようにした。
- 選択した結果をツリーで reveal したうえで既存の open 動作につなぐ導線を追加した。
- コマンドパレット、ツリーツールバー、README に新機能の導線と説明を追加した。
- checker により compile 成功、`git diff --check` 成功、lint 失敗が既存設定不足に起因することを確認した。

## Uncompleted
- コミット作成。
- `pre-release` への反映と preview 公開。

## Cautions
既存の reveal 機能と役割が近いため、アクティブエディタ起点の機能ではなく「任意文字列で探す検索ジャンプ」であることを UI と説明文で明確に分けた。なお、リポジトリには ESLint 設定ファイルがなく `npm run lint` は現状のままでは失敗する。

## Next Steps
変更一式と progress を同じ論理単位でコミットし、pre-release フローで preview 公開まで進める。
