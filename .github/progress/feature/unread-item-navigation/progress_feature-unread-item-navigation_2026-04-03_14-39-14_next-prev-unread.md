# Progress

- Branch: `feature/unread-item-navigation`
- Started: `2026-04-03 14:39:14`
- Task: `next-prev-unread`

## Summary

walkthrough の未読ナビゲーション UX を強化するため、「未読項目だけをスキップしながら前後に移動する」コマンドペアを追加する方針を PM が決定した。

## Why

既存の `Next/Previous Scenario Item` は既読・未読を区別せず全アイテムを順番に巡回する。walkthrough の途中で「次の未読だけ開きたい」という操作には `Resume from First Unread Item` しかなく、前方向への移動手段がなかった。この 2 コマンドを追加することで読み進め中の操作性が向上する。

## Goal

- `code-scenario.nextUnreadItem`（Next Unread Scenario Item）
- `code-scenario.previousUnreadItem`（Previous Unread Scenario Item）

を追加し、Command Palette とキーボードショートカットから使えるようにする。

## PM Direction

- walkthrough position が未設定のとき: nextUnreadItem はシナリオ順に全シナリオを横断して最初の未読を開く。previousUnreadItem は案内メッセージのみ。
- walkthrough position が設定済みのとき: 現在のシナリオ内のみで前後の未読を探索。他シナリオへラップしない。未読が見つからない場合は明確なメッセージ（シナリオ名含む）を表示。
- 成功ナビゲーションは既存の `activateWalkthroughItem` 経路を再利用し、read-state・reveal・walkthrough 位置更新を一貫させる。
- 削除済みシナリオは既存 walkthrough コマンドと同様に安全に処理する。

## Implementation Checkpoint

- `package.json` に 2 コマンドを宣言した（Command Palette に表示）。
- keybinding を `ctrl+shift+alt+.`（next unread）/ `ctrl+shift+alt+,`（previous unread）として追加した。`]`/`[` の自然な対称ペアとして機能する。
- `src/extension.ts` に `stepUnreadWalkthrough` 関数を追加し、next/prev の両方向の未読探索ロジックを実装した。
- 同ファイルに 2 コマンドの `registerCommand` ブロックを追加した（`previousItem` の直後）。
- README の「Sequential Scenario Walkthrough」セクションに新コマンドの説明・起動方法を追記し、「Keyboard Shortcuts」テーブルにも 2 行を追加した。
- checker により、未設定位置・現在位置あり・削除済み scenario・読了済み探索枯渇・既存 `activateWalkthroughItem` 再利用の各分岐が期待どおりで、release-blocking な懸念がないことを確認した。
- checker 指摘の軽微な polish として、`stepUnreadWalkthrough` 内の `activateWalkthroughItem` 呼び出し結果を `stepWalkthrough` と同様に `opened` で受けて早期 return する形へ揃えた。
- 作業 worktree で `npm install` と `npm run compile` が成功し、このブランチ単位でビルド可能な状態を確認した。

## Uncompleted

- コミット、pre-release 反映、preview publish。

## Cautions

- `ctrl+shift+alt+.` は macOS では `⌃⇧⌥.` に相当する。他の拡張機能と衝突する可能性は低いが、チェッカーが確認を推奨する場合は変更を検討する。
- `stepUnreadWalkthrough` の no-wrap 設計は意図的。wrap が必要になった場合は別途 UX 検討が必要。
- 自動テストは repo に未整備のため、今回の confidence は compile と checker のコードレビューに依存している。

## Next Steps

progress を含めて変更一式をコミットし、`pre-release` へ反映して GitHub Actions による preview publish を進める。
