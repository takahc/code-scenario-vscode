# Progress

- Branch: `feature/enhance-ux`
- Started: `2026-04-02 19:14:11`
- Task: `update-progress-path-rule`

## Summary

Progress ファイルの保存先ルールに branch のパス表現を使うことを明記した。

## Why

branch 名をファイル名用とディレクトリ用でどう扱うかが曖昧で、記録先の解釈がぶれやすかったため。

## Goal

Progress のディレクトリ名とファイル名に使う branch 名の扱いを分離して明確化する。

## Completed

- Progress の保存先を `<branchNameAsPath>` を使う形式に更新した。
- `<branchNameAsPath>` が branch 名の `/` をそのまま使うことを追記した。

## Uncompleted

- 既存の Progress ファイル配置の棚卸しや統一は未対応。

## Cautions

- ファイル名に使う `<branchName>` は引き続き `/` を `-` に置換する。
- ディレクトリに使う `<branchNameAsPath>` は branch 階層を保持する。

## Next Steps

- 必要であれば commit skill 側の Progress 保存先説明も同じ表現に揃える。