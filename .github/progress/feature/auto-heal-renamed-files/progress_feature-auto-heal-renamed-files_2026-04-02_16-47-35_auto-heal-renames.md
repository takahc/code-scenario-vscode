# Progress

- Branch: `feature/auto-heal-renamed-files`
- Started: `2026-04-02 16:47:35`
- Task: `auto-heal-renames`

## Summary
VS Code 上でのファイル名変更・移動に追従して、Scenario item の参照先と表示ラベルを自動更新する改善を実装し、preview 公開候補として妥当な状態まで確認した。

## Why
現在の拡張はファイル rename / move イベントを監視しておらず、通常の VS Code 操作でファイルを移動しただけでも item が stale 状態になり、手動 relink が必要になるため。

## Goal
VS Code 内で実行したファイル rename / move の後でも、Scenario item が壊れずに有効な参照を維持できるようにする。

## Completed
- `pre-release` から `feature/auto-heal-renamed-files` ブランチを作成した。
- コードベースと README を確認し、最優先の UX 改善候補として rename 自動追従を選定した。
- 専門エージェントの調査結果として、`onDidRenameFiles` 未対応が直接原因であることを記録した。
- 変更対象の中心が `src/extension.ts` と `src/scenarioProvider.ts` であることを特定した。
- `src/extension.ts` に `vscode.workspace.onDidRenameFiles` の購読を追加し、rename / move イベントを `ScenarioProvider` に渡すようにした。
- `src/scenarioProvider.ts` に rename 自動追従ロジックを追加し、ファイル単体の rename だけでなくフォルダ移動配下の item も再帰的に更新するようにした。
- 新しい保存先が workspace 内なら相対パス + `workspaceFolderUri`、workspace 外なら絶対パスとして保持するよう整理した。
- `file` kind の item では rename 後に `item.name` も `item.filePath` に同期し、ツリー表示ラベルが古いまま残らないよう修正した。
- `checker` によるレビューで初回実装の表示ラベル不整合を検出し、修正後に blocker がないことを再確認した。
- `npm run compile` が成功することを確認した。
- `npm run lint` は ESLint 設定ファイル不在により失敗するが、既存ベースライン由来で今回変更の回帰ではないことを確認した。

## Uncompleted
- コミット作成
- pre-release への取り込みと preview 公開フロー実行

## Cautions
`onDidRenameFiles` は VS Code 経由の rename / move にのみ反応し、CLI や外部ツールによる移動は自動追従対象外である。
- `workspaceFolderUri` を持たない相対パス item は rename 元の絶対位置を安全に特定できないため、自動追従を行わない。
- `npm run lint` はリポジトリ全体で ESLint 設定が欠けているため現状では有効な品質ゲートになっていない。

## Next Steps
変更と progress を feature ブランチでコミットし、pre-release フローで preview 公開を実行する。
