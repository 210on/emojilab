# Research Data Schema

## ExperimentSession

1セッション単位のメタデータ。匿名の参加者ID、研究ID、バージョン、画面情報、同意状態を保存する。

主要フィールド:

- `sessionId`
- `participantId`
- `studyId`
- `startedAt`
- `completedAt`
- `appVersion`
- `metricVersion`
- `stimulusSetVersion`
- `userAgent`
- `screen`
- `consentAccepted`

## ParticipantProfile

個人を直接特定しない範囲の属性のみ収集する。

収集するもの:

- 年齢範囲
- 日本語利用状況
- カスタム絵文字経験
- Slack経験
- Discord経験
- デザイン経験

収集しないもの:

- 氏名
- メールアドレス
- 学籍番号
- 電話番号
- SNSアカウント

## Study1Response

1試行につき1行で保存する。

主要フィールド:

- `sessionId`
- `participantId`
- `trialId`
- `stimulusId`
- `stimulusSetVersion`
- `metricVersion`
- `displaySizePx`
- `backgroundCondition`
- `contrastScore`
- `scalabilityScore`
- `geometryPenalty`
- `totalSupportScore`
- `legibilityRating`
- `meaningClarityRating`
- `confidenceRating`
- `meaningFreeText`
- `transcriptionText`
- `responseTimeMs`
- `submittedAt`

`geometryPenalty` は独立スコアではなく、縮小耐性に含まれる横幅変形・字間・行間・上下幅差・縦横比の減点合計である。`metric-rules-v1.2.1` 以前の既存CSVを読み込む場合に限り、旧 `compositionScore` 列が残ることがある。v1.3.0以降の新規回答では `geometryPenalty` を使用し、異なる `metricVersion` を同一分析に混在させない。

## ResearchEventLog

Study 2で制作行動を分析するためのイベントログ形式。Phase 1ではStudy 1の回答送信イベントも保存する。

主要フィールド:

- `eventId`
- `sessionId`
- `participantId`
- `studyId`
- `timestamp`
- `elapsedMs`
- `eventType`
- `payload`
