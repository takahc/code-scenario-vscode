# Progress

- Branch: `feature/open-item-recovery`
- Started: `2026-04-02 14:30:19`
- Task: `open-item-recovery`

## Summary

シナリオ項目を開く際に、対象ファイル欠落時とシンボル解決失敗時の案内と復旧導線を追加した。

## Why

現在の open flow では、ファイル欠落やシンボル未解決時にユーザーが原因を把握しづらく、編集画面へ戻る導線も弱かったため。

## Goal

通常の成功時は静かなままにしつつ、失敗やフォールバック時だけ明確なメッセージと `Edit Item` アクションを提示する。

## Completed

- `code-scenario.openItem` で対象ファイルの存在確認を行い、欠落時に警告と `Edit Item` 復旧導線を表示するようにした。
- シンボル解決結果を構造化し、キャッシュまたは既定行へのフォールバック有無を判定できるようにした。
- シンボル未解決でフォールバック位置を開いた場合に、警告メッセージと `Edit Item` アクションを表示するようにした。
- 通常解決時のみ行番号キャッシュを更新するように調整した。

## Uncompleted

- 依存関係未導入のため、`npm run compile` と `npm run lint` は環境起因の失敗が継続している。

## Cautions

- `npm run lint` は `eslint: not found`、`npm run compile` は `vscode` / `@types/node` 未解決で失敗する状態がベースラインから継続している。

## Next Steps

- 依存関係を復元できる環境で compile/lint を再実行し、型エラーと lint 実行可否を確認する。
