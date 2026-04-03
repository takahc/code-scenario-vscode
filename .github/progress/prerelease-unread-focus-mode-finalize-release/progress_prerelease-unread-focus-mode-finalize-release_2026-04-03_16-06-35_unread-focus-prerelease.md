# Progress

- Branch: `prerelease-unread-focus-mode-finalize-release`
- Started: `2026-04-03 16:06:35`
- Task: `unread-focus-prerelease`

## Summary
`feature/unread-focus-mode-finalize` を最新の `origin/pre-release` 基点の release branch へ取り込み、preview 公開へ進める状態を整えた。

## Why
Unread Focus Mode は checker 判定上 release-ready だったが、公開は `pre-release` push 起点の GitHub Actions で行う必要がある。どの source branch をいつの `pre-release` に載せたかを追跡できるよう、merge と公開準備を release branch 側にも記録する必要があった。

## Goal
Unread Focus Mode の release-ready 状態を `pre-release` へ安全に反映し、preview publish workflow を起動できる状態にする。

## Completed
- `package.json` から VS Code extension であること、`publish-extension.yml` から `pre-release` push が `vsce publish --pre-release` を起動することを確認した。
- source branch `feature/unread-focus-mode-finalize` は `origin/pre-release` に対して release 対象の差分だけを持つ状態であることを確認した。
- source worktree に依存を入れて `npm run compile` を通し、`npm run lint` は ESLint 設定ファイル不在の baseline failure と再確認した。
- `origin/pre-release` から `prerelease-unread-focus-mode-finalize-release` を切り、`feature/unread-focus-mode-finalize` を merge した。
- release branch 側にも依存を入れて `npm run compile` を通し、merge 結果が build 可能であることを確認した。

## Uncompleted
- `pre-release` への push。
- GitHub Actions publish workflow の結果確認。

## Cautions
今回の merge で実際に増えた差分は progress 記録のみで、Unread Focus Mode の code fix 自体は pre-release 系履歴に実質反映済みとみられる。したがって publish は「新機能コードを初回投入する」というより、現在の pre-release 先頭に release bookkeeping を乗せて preview を更新する操作になる。

## Next Steps
release branch の progress を commit してから `pre-release` へ push し、GitHub Actions の publish workflow が起動・成功するか確認する。
