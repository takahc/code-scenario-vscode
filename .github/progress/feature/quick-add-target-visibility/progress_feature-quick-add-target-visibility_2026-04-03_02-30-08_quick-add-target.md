# Progress

- Branch: `feature/quick-add-target-visibility`
- Started: `2026-04-03 02:30:08`
- Task: `quick-add-target`

## Summary
Code Scenario の次の UX 改善として、Quick Add の対象シナリオをツリー上で見えるようにし、シナリオ行から直接設定できる改善を進める方針を確定した。

## Why
Quick Add は日常的に使う導線だが、現在どのシナリオが既定の追加先なのかが UI から分かりづらく、意図しないシナリオへ追加してしまう負担がある。

## Goal
現在の Quick Add 対象をユーザーが一目で把握でき、Command Palette に回らずツリーから直接設定・変更できるようにして、追加先の誤りと操作コストを下げる。

## Completed
- `pre-release` と直近の preview 公開状態を確認し、前回の Item Notes 改善が公開済みであることを確認した。
- README と主要実装を読み、現行 UX 表面を把握した。
- idea-man に UX 改善候補を出してもらい、価値と実装コストを比較した。
- 今回の改善として「Quick Add 対象の見える化 + ツリーからの直接設定」を採用した。
- `pre-release` から実装用ブランチ `feature/quick-add-target-visibility` を作成した。
- implementer が、現在の Quick Add 対象シナリオをツリー行の description/tooltip で見える化し、シナリオ行から直接 `Set Quick Add Scenario` / `Clear Quick Add Scenario` を実行できるようにした。
- `code-scenario.setQuickAddScenario` をシナリオ行引数ありでも使えるよう拡張し、新規 `code-scenario.clearQuickAddScenario` を追加した。
- Quick Add 対象シナリオの削除時に保存済みターゲットが自動で解除されるようにした。
- README と package.json の command/menu 定義を更新し、新しい操作導線を反映した。
- `npm run compile` の成功を確認した。
- `npm run lint` が既存の ESLint 設定ファイル欠如により失敗する状態であることを再確認した。
- checker が command/menu wiring、scenario と scenarioQuickAdd の状態遷移、削除時の解除挙動を確認し、blocking issue がないことを報告した。
- `git diff --check` の成功を確認した。

## Uncompleted
- コミットと push。
- pre-release への反映と preview 公開。

## Cautions
Quick Add 対象の表示は description の `Quick Add` ラベルと tooltip に留めており、stale 警告より目立ちすぎないよう抑えている。一方で inline action の発見性や codicon の見え方は実際の VS Code UI 上で未確認であり、release 前の軽い手動確認余地は残る。なお、`npm run lint` は今回の変更とは無関係に ESLint 設定ファイル不在で失敗する。

## Next Steps
変更一式と progress を同じ論理単位でコミットして push し、pre-release へ反映して preview 公開を実行する。
