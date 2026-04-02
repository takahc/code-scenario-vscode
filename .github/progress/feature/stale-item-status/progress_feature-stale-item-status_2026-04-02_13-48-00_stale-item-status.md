# Progress

- Branch: `feature/stale-item-status`
- Started: `2026-04-02 13:48:00`
- Task: `stale-item-status`

## Summary
Code Scenario の次のUX改善として、シナリオアイテムの状態をツリー上で可視化し、危険な open を抑止する方向で進めることにした。

## Why
最近の改善で追加導線や入力妥当性は強化されたが、保存済みアイテムが今も有効か、ファイル解決に問題があるかを一覧で判断しづらい状態だった。

## Goal
保存済みアイテムの状態をツリー上で把握しやすくし、移動・編集・マルチルート運用時の迷いを減らす。

## Completed
- `pre-release` ブランチ上の現状と作業ルールを確認した。
- 作業用ブランチ `feature/stale-item-status` を `pre-release` から作成した。
- 既存のUX改善履歴と現在の主要フローを確認し、次の改善対象を状態可視化に絞った。
- `idea-man` の整理により、今回の実装スコープを「Missing file」「Ambiguous workspace match」のツリー警告表示と、「Symbol location may be stale」の open 時警告に限定した。
- 今回は新しい一括検証コマンドや永続ステータス保存を追加せず、既存の `Refresh` と `Edit Item` を再利用する方針に決めた。
- `implementer` により、ファイル解決の派生ステータス、safe-open ガード、シンボル解決フォールバック警告の実装が入った。
- `checker` により、コンパイル成功と lint 未設定の既知失敗を確認しつつ、ツリー警告対象が広すぎるという差分を1点検出した。
- 指摘を受けてツリー警告表示を `fileMissing` と `ambiguous` のみに絞り込み、approved scope に合わせた。
- 再検証で、コンパイル成功・主要仕様一致・保存スキーマ非変更を確認し、preview 公開へ進める判断にした。

## Uncompleted
- preview 公開可否の判断と必要なら pre-release 反映。

## Cautions
状態判定ロジックは既存のファイル解決やシンボル解決と密結合になりやすく、表示だけ先行すると誤警告につながる可能性がある。
`workspacePaths.ts` の現状は相対パスが複数ワークスペースに一致した際に先頭候補へフォールバックするため、ここを安全側に変えると既存の open 挙動が変わる。
`npm run lint` はリポジトリに ESLint 設定が無いため引き続き失敗する。今回変更で増えた失敗ではないが、release confidence は compile とコードレビュー中心になる。

## Next Steps
進捗ファイルを含めてこの変更をコミットし、`pre-release` へ取り込んで preview 公開をトリガーする。
