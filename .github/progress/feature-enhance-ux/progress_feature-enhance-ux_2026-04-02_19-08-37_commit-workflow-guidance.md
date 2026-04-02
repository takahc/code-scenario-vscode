# Progress

- Branch: `feature/enhance-ux`
- Started: `2026-04-02 19:08:37`
- Task: `commit-workflow-guidance`

## Summary

Copilot 向けのコミット運用ルールと、コミット作業を実行する skill を追加・整理した。

## Why

コミット時の判断基準や Progress 記録ルールが会話依存になっており、毎回同じ運用を安定して再現しづらかったため。

## Goal

差分確認、ブランチ確認、コミット単位の分割、Progress 作成、conventional commit 実行を一貫したルールで行えるようにする。

## Completed

- `.github/copilot-instructions.md` を追加し、コミットと Progress のルールを整理した。
- `main` と `develop` への直接コミット禁止、Pull Request 経由のみで反映するルールを追加した。
- `.github/skills/commit/SKILL.md` を追加し、commit workflow を手順化した。
- commit skill に branch 確認と protected branch の扱いを含めた。

## Uncompleted

- 既存の古い progress ディレクトリ命名との整合整理は未対応。

## Cautions

- 旧パス `.github/workflows/copilot-instructions.md` から新パス `.github/copilot-instructions.md` への移設を含む。
- progress 保存先は現行ルールに合わせて `feature-enhance-ux` を使用した。

## Next Steps

- 必要であれば progress ディレクトリの既存命名を現行ルールへ統一する。
- 必要であれば commit workflow を強制する hook を追加する。