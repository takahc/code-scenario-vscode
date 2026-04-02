
## コミット
- 適切な単位でgitコミットする。
- conventional commitの形式を守る。
- コミット時に対応するProgressも一緒にコミットする。

## Progress
- 進捗を`$workspaceRoot/.github/progress/<branchName>/progress_<branchName>_<startDateTime:YYYY-MM-DD_HH-mm-ss>_<shortTaskName>.md`に記録する。
- 日本語で記述する。
- 内容は以下のテンプレートに従う。
```md
# Progress

- Branch: `feature/enhance-ux`
- Started: `2026-04-02 18:51:19`
- Task: `enhance-item-ux`

## Summary
(このセクションには、行った変更の概要を記述します。)

## Completed
(このセクションには、完了した具体的なタスクや変更点を箇条書きで記述します。)

## Cautions
(このセクションには、注意点や、変更に伴う影響などを記述します。)

## Next Steps
(このセクションには、次に行うべきタスクや、未解決の問題などを記述します。)
```
