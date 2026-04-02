# Progress

- Branch: `feature/enhance-ux`
- Started: `2026-04-02 20:15:49`
- Task: `add-pre-release-skill`

## Summary

pre-release 公開手順を GitHub Actions 起点で扱う skill を追加した。

## Why

preview 公開の方法をローカルの `vsce publish` 実行ではなく、`pre-release` ブランチ反映による自動公開へ統一したいため。

## Goal

pre-release ブランチへのマージと GitHub Actions 起動を前提とした再利用可能な workflow を定義する。

## Completed

- `.github/skills/pre-release/SKILL.md` を追加した。
- `pre-release` ブランチ push で publish workflow が起動する前提を手順に反映した。
- dirty tree の場合は先に commit workflow を実行する分岐を追加した。

## Uncompleted

- `pre-release` ブランチ自体の保護ルールは instructions に未記載。

## Cautions

- local `vsce publish` は使わず、GitHub Actions で pre-release 公開する前提。
- merge 前に作業ツリーを clean にする必要がある。

## Next Steps

- `feature/enhance-ux` を `pre-release` にマージして push し、publish workflow を起動する。