# Progress

- Branch: `feature/duplicate-scenario`
- Started: `2026-04-03 15:12:14`
- Task: `duplicate-scenario`

## Summary
**Duplicate Scenario** の実装を進め、scenario 行コンテキストメニューから scenario 全体を複製できる配線と provider 側の deep-copy ロジックを追加した。複製後 scenario は元の直後に挿入され、通常は tree 上で reveal/select される。あわせて checker 指摘だった **Unread Focus Mode 中に空 scenario を複製すると duplicate が不可視のままになる** edge case には、フィルタ仕様を変えずに明示メッセージを返す修正を加えた。

## Why
item 単位では copy/move ができる一方、scenario 全体を別案として派生させたいときは手作業が多く、レビュー観点の分岐や調査フローの派生を素早く始めづらい。既存の tree ベース UX を崩さずに、scenario レベルの複製操作を追加する価値が高い。

## Goal
scenario 行から **Duplicate Scenario** を実行すると、構造・順序・メモ・リンク情報を保ったまま scenario 全体を複製し、新しい scenario として直後に挿入できるようにする。複製された item は fresh work として unread で始まることを狙う。

## Completed
- `origin/pre-release` を基準に、dirty な detached root worktree と切り離した実装用ブランチ `feature/duplicate-scenario` を新規作成した。
- idea-man の候補比較を踏まえ、次の実装単位を **Duplicate Scenario** に決定した。
- 受け入れ条件の骨子として、scenario 行からの実行、名前入力、scenario 全体の deep copy、fresh ID 付与、read 状態の unread 化、元 scenario の直後への挿入、複製後 scenario の reveal/select、Quick Add target は自動変更しない、を確定した。
- `package.json` に `code-scenario.duplicateScenario` を追加し、scenario 行コンテキストメニューから実行できるようにした。
- `src/scenarioProvider.ts` に scenario 全体複製 API を追加し、scenario / item の fresh ID 再採番と duplicated item の unread 初期化を既存 copy-item ロジックに揃えて実装した。
- `src/extension.ts` に名前入力 UI・複製実行・複製後 scenario の reveal/select を追加した。
- `README.md` に Duplicate Scenario のユーザー向け説明を追記した。
- `npm ci` 実行後、`npm run compile` が成功することを確認した。
- checker の確認で、複製そのもの（構造保持・fresh ID・unread 初期化・挿入位置・Quick Add target 非変更）は妥当と判断された。
- checker から、**Unread Focus Mode 有効中に空 scenario を複製すると duplicate が tree 上で不可視のままになり、reveal/select 期待とずれる** という release-blocking 指摘が返った。
- `src/extension.ts` で duplicate 後の scenario が Unread Focus Mode により不可視かどうかを既存 visibility 判定で検出し、reveal/select を無理に続けず、**複製は成功したが Unread Focus Mode によって hidden** だとわかる情報メッセージを出すようにした。
- 修正後の再検証として `npm run compile` を再実行し、成功を確認した。
- checker の再確認で、上記 edge case は blocker 解消と判定され、non-blocking な残課題は UI 手動 smoke test と repo 側 ESLint 設定欠如のみになった。
- feature 開始元のローカル `pre-release` が `origin/pre-release` より古いことを確認し、release 前の整合性確保のため branch を最新 `origin/pre-release` 上へ載せ替えた。
- 載せ替え時の競合は `package.json` の command 追加位置に限られ、`Duplicate Scenario` と既存 `Edit Scenario Note...` を両立させる形で解消した。

## Uncompleted
- 実 UI での手動確認（context menu / reveal 挙動）。
- `npm run lint` は ESLint 設定ファイル不在のため未実施。
- コミット作成。
- pre-release 反映と preview 公開。

## Cautions
scenario 単位の複製では item subtree copy と read/unread progress の既存規約を揃える必要がある。特に「複製後 item の read 状態を引き継ぐか unread に戻すか」は UX の期待差が出やすいため、今回は fresh branch として unread 開始で統一する。あわせて、Unread Focus Mode は unread を含まない scenario を非表示にするため、空 scenario の複製後は **複製成功 + filter により hidden** を伝えるだけに留め、モード自体は自動変更しない。

## Next Steps
 最新 `origin/pre-release` 基準で `npm run compile` を再確認し、問題なければ変更一式と progress を同じ論理単位でコミットして pre-release フローへ進める。
