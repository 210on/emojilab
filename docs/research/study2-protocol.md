# Study 2 Protocol

## 目的

視認性支援の表示が、制作行動、主観的負担、成果物品質に与える影響を検証する。

## 条件

### baseline

編集機能、フォント候補、色候補、書き出し形式、タスク文、初期状態はsupport条件と同一にする。

非表示にするもの:

- 総合支援スコア
- APCAコントラスト
- 縮小耐性
- 改善コメント
- 支援パネル

### support

表示するもの:

- 総合支援スコア
- APCAコントラスト
- 縮小耐性
- 構成評価
- 改善コメント
- 背景別プレビュー
- 小サイズプレビュー

## 推奨デザイン

参加者内比較とし、条件順序はカウンターバランスする。

- Group A: baseline -> support
- Group B: support -> baseline

## 収集するログ

- `task_start`
- `task_end`
- `config_change`
- `preview_size_view`
- `background_switch`
- `score_view`
- `feedback_view`
- `export_png`
- `save_design`
- `undo`
- `reset`
- `idle_detected`

スライダー操作は300-500ms程度でdebounceし、最終configは必ず保存する。

## 主観評価

各タスク後:

- 自信
- 作業負担
- フラストレーション
- 満足度
- 支援条件のみ: 支援の有用性
- 支援条件のみ: 支援の煩わしさ

実験後:

- どちらが作りやすかったか
- どちらが見やすいものを作れたと思うか
- 自由記述
