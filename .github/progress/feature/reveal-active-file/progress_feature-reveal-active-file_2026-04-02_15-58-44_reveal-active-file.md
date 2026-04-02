# Progress

- Branch: `feature/reveal-active-file`
- Started: `2026-04-02 15:58:44`
- Task: `reveal-active-file`

## Summary
Code Scenario の次の UX 改善として、アクティブなエディタファイルに対応するシナリオ項目をツリーで reveal できる機能を実装した。手動コマンドを主軸にしつつ、既定 OFF の auto-reveal 設定と複数一致時の QuickPick を加え、checker で見つかった runtime blocker も解消した。

## Why
現状の拡張は「シナリオからコードへ移動する」導線は整っている一方で、エディタで開いているファイルがどのシナリオに属するかを逆引きする導線が弱い。ツリーとエディタが分断されているため、文脈復帰に余分な探索が必要になっている。

## Goal
アクティブファイルから Code Scenario ツリーへ文脈を戻せる操作を追加し、シナリオを単なる保存先ではなく双方向のナビゲーション手段として使える状態にする。

## Completed
- `pre-release` から `feature/reveal-active-file` ブランチを作成した。
- 既存の UX 改善履歴を確認し、次の改善テーマが「アクティブファイルの reveal」で妥当と判断した。
- UX 専門家の整理結果として、手動コマンド `Reveal Active File in Scenarios` を主機能にし、`codeScenario.autoRevealInTree` を既定 OFF のオプション設定として扱う方針を採用した。
- 受け入れ観点として、単一一致時の即時 reveal、複数一致時の QuickPick、ネスト項目対応、multi-root の識別、auto-reveal の非侵襲性を記録した。
- 実装担当が `code-scenario.revealActiveFileInTree` コマンド、`codeScenario.autoRevealInTree` 設定、複数一致時の QuickPick、README 追記を実装した。
- checker が指摘した blocker として、`treeView.reveal()` に必要な `getParent()` 未実装と stable id 未設定を確認した。
- 実装担当が `ScenarioProvider#getParent()`、`TreeItem.id`、auto-reveal timer の dispose を追加し、reveal 機能の runtime blocker を解消した。
- checker の再確認で blocker 解消済みとなり、今回の機能は commit 可能な状態と判断した。

## Uncompleted
- コミット作成。
- pre-release への反映と preview 公開。

## Cautions
auto-reveal は UX 破壊を避けるため既定 OFF のまま維持する必要がある。repo には有効な ESLint 設定や自動テスト基盤がなく、今回も compile 中心の検証に留まるため、VS Code Extension Host での実地確認余地は残る。

## Next Steps
変更と progress を論理単位でコミットし、pre-release フローで preview 公開を進める。
