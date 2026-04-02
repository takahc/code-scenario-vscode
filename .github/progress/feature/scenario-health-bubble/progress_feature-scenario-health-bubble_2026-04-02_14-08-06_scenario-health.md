# Progress

- Branch: `feature/scenario-health-bubble`
- Started: `2026-04-02 14:08:06`
- Task: `scenario-health`

## Summary
Code Scenario の次のUX改善として、シナリオ配下の stale アイテムをシナリオ行だけで把握できる軽量な health 表示を追加する方針に決めた。

## Why
既存の stale item warning により個別アイテムの異常は見えるようになったが、シナリオを展開しないとどこに問題があるか分からず、一覧性が不足していた。

## Goal
シナリオツリーを開かなくても、どのシナリオに stale な参照が含まれているかを即座に判断できるようにする。

## Completed
- `pre-release` ブランチの状態、publish workflow、既存 feature ブランチの履歴を確認した。
- 現在の製品UXを整理し、次の改善候補を比較したうえで、stale 状態のシナリオ集約表示を最優先候補に決定した。
- `idea-man` の整理により、今回の preview スコープを「scenario node の warning icon」「stale 件数付き description」「stale 要約付き tooltip」に限定した。
- 新コマンド、bulk repair、dashboard 画面、並び替えなどは今回のスコープ外として明示した。
- 作業用ブランチ `feature/scenario-health-bubble` を `pre-release` から作成した。
- `implementer` により `src/scenarioProvider.ts` のみを変更し、scenario node に再帰的 stale 件数を反映する warning icon・description・tooltip 要約を追加した。
- `checker` により、compile 成功、スコープ逸脱なし、scenario level の件数集計が item warning 判定と一致していることを確認し、commit / preview 可能の判断を得た。

## Uncompleted
- 必要なコミット作成と pre-release 反映。

## Cautions
今回の集約件数は既存の item warning 判定と一致している必要があり、別ロジックを作ると表示不整合が起きる。
表示対象を広げすぎると、workspace 設定由来の問題まで stale と見えてしまい、誤解を招く可能性がある。
scenario node 側の件数集計でも `resolveScenarioItemLocation` が再帰的に走るため、大きなツリーでは同期的なファイル解決コストが積み上がる。
`workspaceFolderMissing` や `noWorkspaceFolder` は現行 item icon ロジックと揃えるため件数対象外であり、tooltip warning との見え方の差は今後のUX論点として残る。

## Next Steps
進捗ファイルを含めてこの変更をコミットし、`pre-release` に取り込んで preview 公開フローを進める。
