# Scoring Rule Version

Current version: `metric-rules-v1.1.0`

## 構成

現行の総合支援スコアは以下の3要素で構成する。

- `contrastScore`: APCA-W3 由来の `localTextLc` と `backgroundSeparationLc` を、総合支援スコアに合成するため 0-100 に変換した内部適合点。実装上の詳細名は `contrastFitScore`
- `scalabilityScore`: 小サイズ表示時の保持性を推定するヒューリスティック
- `compositionScore`: 文字数、文字種、画数、字間、行間、横幅補正、線設定の構成評価

合成式:

```text
totalSupportScore =
  contrastScore * 0.45
  + scalabilityScore * 0.35
  + compositionScore * 0.20
```

## ステータス

- `excellent`: 90以上
- `good`: 70以上
- `needsWork`: 70未満

## 研究上の扱い

このスコアは人間の知覚を直接測定する客観尺度ではない。研究では、人間評価との対応を検証する対象として扱う。

UIや論文で APCA の値として参照するのは `displayedContrastLc` / `Lc` である。`contrastFitScore` は APCA 値そのものではなく、総合スコア計算のための派生指標として扱う。

実験開始後に計算式を変更する場合は、必ず `metricVersion` を上げ、異なるバージョンのデータを混在分析しない。

## v1.1.0: デザインスコア再設計

### 目的

v1.1.0 では、ユーザーに提示する数値は `デザインスコア` 1本に保ちつつ、内部評価を以下の3系統へ整理した。

```text
designScore =
  contrastFitScore * 0.45
  + scalabilityScore * 0.35
  + compositionStabilityScore * 0.20
```

ただし、この値は「客観的な視認性尺度」ではなく、カスタム絵文字制作を支援するためのルールベース設計支援指標である。

### 1. コントラスト適合

コントラスト評価では、塗り色・内側線・外側線・背景色をすべて評価対象にする。ただし、無効な線や細すぎる線は、実際には視覚的な境界として機能しにくいため、重みを下げるか評価対象から除外する。

#### 評価ペア

```text
fill vs innerStroke
fill vs outerStroke
outerStroke vs background
fill vs background
```

#### 有効線判定

```text
innerStrokeEffective =
  stroke1Enabled && stroke1Width >= 2

outerStrokeEffective =
  stroke2Enabled && stroke2Width >= 4

outerStrokeStable =
  stroke2Enabled && stroke2Width >= 8
```

線幅が閾値未満の場合、APCA値が高くても「境界として機能している」とは扱わない。これは、細すぎる線は小サイズ表示時にラスタライズやアンチエイリアスで失われやすく、コントラスト値だけでは効果を過大評価するためである。

現行実装では、UI上の線幅値による有効線判定を用いる。16px / 20px / 32px表示時の実効線幅への正規化は、実表示サイズの測定値が揃った後に導入する予定である。

```text
effectiveStrokePx =
  renderedStrokeWidthAtTargetSize

strokeWorksAsBoundary =
  effectiveStrokePx >= 1.0

innerStrokeCrowdingRisk =
  effectiveStrokePx >= 2.0
```

これにより、キャンバス上の数値では太く見えても、チャット上の実表示では効いていない線を過大評価しない設計へ拡張できる。

#### 背景分離

背景分離は、各背景に対して塗り色・有効な内側線・有効な外側線のうち最も背景と分離している層を採用する。

```text
backgroundSeparation =
  max(
    APCA(fillColor, backgroundColor),
    APCA(innerStrokeColor, backgroundColor) if innerStrokeEffective,
    APCA(outerStrokeColor, backgroundColor) if outerStrokeEffective
  )
```

ライト、ダーク、Slack、Discord、カスタム背景のうち、最も低い値を `worstBackgroundContrast` として採用する。

#### コントラスト不足色に対する内側線適合

黒い内側線は、すべての色に対して一律に有効とは扱わない。判定の基準は色名やPCCS番号ではなく、背景とのAPCAコントラストと線の有効幅である。

```text
needsLocalContrastSupport =
  fill vs targetBackground < Lc 45
  && fill is high-lightness / high-chroma

currentInnerStrokeWorks =
  stroke1Enabled
  && strokeWorksAsBoundary
  && APCA(fillColor, stroke1Color) >= Lc 45

recommendInnerStroke =
  needsLocalContrastSupport
  && !currentInnerStrokeWorks
```

この条件に該当する場合、塗り色を暗くして WCAG AA に近づけるより、黒い内側線で局所コントラストを補う提案を優先する。PCCS bright tone の現行12色では、このルールの結果として `b6`, `b8`, `b10` が主な該当色になる。

一方、白背景とのAPCAが十分に高い色では、黒い内側線が太いと字面の複雑性を増やし、小サイズでの潰れを招く可能性がある。そのため、コントラスト補助の必要性が低い色で太い黒内側線が使われている場合は、縮小耐性側で軽い減点または改善コメントの対象にする。

#### OKLCH による高明度・高彩度の定義

`high-lightness / high-chroma` は主観的な色名ではなく、OKLCH の `L` と `C` を用いて近似する。

初期値:

```text
highLightness = OKLCH_L >= 0.70
highChroma = OKLCH_C >= 0.10
```

この閾値は「視認性の普遍的基準」ではない。OKLCH は明度・彩度・色相を分けて扱えるため、色の特徴量を実装上安定して扱うために用いる。`0.70` と `0.10` は、現行PCCS bright tone と decomoji抽出色、ならびに研究画面のOKLCH比較パレットを観察したうえでの初期ヒューリスティックであり、Study 1 / Study 2 の人間評価との対応を見て調整する。

論文では以下のように記述する。

```text
本研究では、高明度・高彩度色をOKLCH空間上の暫定閾値で定義した。この閾値は色彩知覚の絶対基準ではなく、色特徴量を再現可能に扱うための操作的定義であり、人間評価との対応を検証する対象である。
```

#### 背景条件の扱い

すべての背景の最小値を常に通常UIのスコアへ使うと、過剰に厳しい評価になりやすい。そのため、v1.1.0 では評価対象を分ける。

```text
authoringScore:
  currentLightPreview
  currentDarkPreview
  currentChatPreview

researchBreakdown:
  all registered preview backgrounds
  Slack / Discord representative surfaces
  custom backgrounds
```

通常UIでは、制作時に見ている代表背景でスコアを出し、研究画面では全背景条件のbreakdownを表示する。

### 2. 縮小耐性

縮小耐性は、16px〜32px程度のチャット表示で文字形状が保持されるかを推定するヒューリスティックである。

評価対象:

```text
characterCount
lineCount
maxKanjiStrokeCount
totalKanjiStrokeCount
denseKanjiCount
fontWeight
innerStrokeWidth
outerStrokeWidth
condense
letterSpacing
lineSpacing
lineSizeBalance
```

#### 画数

高画数漢字は、小サイズ表示で内部空間が潰れやすい。そのため、最大画数・合計画数・高画数漢字数を縮小耐性に含める。

```text
maxStrokeCount >= 14: caution
maxStrokeCount >= 16: penalty
maxStrokeCount >= 20: strong penalty
totalStrokeCount >= 24: string density penalty
totalStrokeCount >= 36: strong string density penalty
```

#### 相互作用

単独の画数だけでなく、以下の相互作用を重視する。

```text
highStrokeKanji × fontWeight >= 800
highStrokeKanji × innerStrokeWidth >= 6
highStrokeKanji × condense < 90
characterCount >= 5 × twoLineLayout
outerStrokeWidth >= 16 × small preview
```

ここでの `small preview` は、Slack / Discord でのリアクションや本文内表示を想定した 16px〜20px 程度の表示を指す。具体的な表示サイズはプラットフォーム実測値に基づき、研究画面で記録する。

#### 内側線の扱い

内側線は、黄色系のように白背景で埋もれやすい塗り色には有効な補助となる。一方で、青・紫系や高画数漢字では、内側線が字面を侵食し、縮小耐性を下げる場合がある。

そのため、内側線はコントラスト評価だけで加点せず、縮小耐性側で「太すぎる線」として再評価する。

### 3. 構成安定性

構成安定性は、文字絵文字全体のプロポーションとレイアウトの安定性を評価する。

評価対象:

```text
overallOpaqueBoundsAspectRatio
lineWidthBalance
condense
letterSpacing
lineSpacing
lineSizeBalance
autoSquare
```

#### 正方形プロポーション

Slack/Discordのカスタム絵文字は正方形領域内で表示されるため、実際の不透明領域が極端に縦長・横長になると、使用できる表示面積が減り、視認性上のロスが生じる。

ただし、正方形性は意味・表現意図より優先されるべきではない。そのため、構成安定性における弱い補助指標として扱う。

```text
aspectRatio = opaqueWidth / opaqueHeight

0.80 <= aspectRatio <= 1.25: no penalty
0.70 <= aspectRatio < 0.80 or 1.25 < aspectRatio <= 1.40: small penalty
aspectRatio < 0.70 or aspectRatio > 1.40: medium penalty
```

ただし、外側線込みの不透明領域だけを見ると、太い外側線によって正方形に近く見える場合がある。そのため、実装では2種類の縦横比を分ける。

```text
coreAspectRatio = fill mask bounds width / height
fullAspectRatio = fill + stroke bounds width / height
```

縮小耐性には `coreAspectRatio` を優先し、改善コメントや書き出し領域の利用効率には `fullAspectRatio` を用いる。

改善コメント例:

```text
全体が縦長になっているため、横幅を少し広げるか幅揃えを使うと、正方形の絵文字枠をより有効に使えます。
```

### 4. 横幅圧縮の扱い

横幅補正は、文字列を正方形領域に収めるために有効である。一方で、字形骨格から大きく逸脱した condensed / expanded は字形判別性を損ねやすい。

現時点では、既存の可読性研究とUD/可読性書体に関する一般的知見をもとに、以下の運用値を採用する。

```text
90-110: natural
85-115: acceptable
80-120: strong but allowed
<80 or >120: penalty
<72 or >132: strong penalty
```

この数値は普遍的な最適値ではない。研究では、横幅補正量と人間評価の対応を検証対象として扱う。

### 5. 改善コメント

UI上で多数の専門指標を出すと解釈負荷が高くなるため、表示する数値はデザインスコア、コントラスト、縮小耐性を基本とする。詳細な原因は改善コメントで提示する。

改善コメントは、固定順序で機械的に選ぶのではなく、問題候補ごとに推定改善インパクトを与え、最もスコア上昇幅が大きいと見込まれる候補を選ぶ。

```text
candidateImpact =
  scoreDeficit
  + directPenaltyEstimate
  + actionabilityBonus
```

候補例:

```text
- 明るい塗り色が白背景で埋もれる
- 塗りと線の局所コントラストが弱い
- 背景分離が弱い
- 高画数漢字に太ウェイトが重なる
- 内側線が太く、塗り面積を圧迫する
- 外側線が細く、輪郭として機能しにくい
- 全体の縦横比が偏る
```

ただし、すでに許容域に入っている場合は、強い改善指示ではなく、軽い調整または肯定コメントに切り替える。

例:

```text
白背景で塗り色が埋もれやすいため、塗り色を暗くするより黒い内側線を少し足すと、色の印象を保ったまま見やすくできます。
```

```text
この青紫系は白背景で十分に差があるため、黒い内側線を強めすぎると16px表示で字面が詰まりやすくなります。
```

```text
画数の多い漢字に太いウェイトと内側線が重なっているため、小サイズでは潰れやすいです。
```

## Planned validation

v1.1.0 の重みと閾値は初期ヒューリスティックであり、Study 1 / Study 2 で人間評価との対応を検証する。

### 検証可能性

一般参加者に対して、すべての内部要素を直接評価させるのは負荷が高い。そのため、検証は以下のように分解する。

#### Study 1: 受動評価

目的:

```text
システムスコアと第三者の視認性評価が対応するか確認する。
```

参加者タスク:

- 小さなカスタム絵文字を見る
- 何と書かれているかを答える
- 読みやすさを7件法で評価する
- 意味が分かるかを7件法で評価する

分析:

- `designScore` と読みやすさ評価の相関
- `scalabilityScore` と文字転記正答率の関係
- `contrastFitScore` と読みやすさ評価の関係
- 高画数漢字 × 太ウェイト × 内側線の条件で評価が下がるか

#### Study 2: 制作支援比較

目的:

```text
スコアと改善コメントの提示が、制作行動と成果物に影響するか確認する。
```

比較条件:

- supportなし
- supportあり

参加者タスク:

- 指定された意味のカスタム絵文字を制作する
- 完成後に主観評価を行う

分析:

- supportあり条件で `designScore` が上がるか
- supportあり条件で制作時間や操作回数がどう変わるか
- supportあり条件の成果物が第三者評価で高くなるか
- 改善コメントが示した問題点が、実際に操作ログ上で修正されているか

#### 第三者評価

目的:

```text
制作者本人ではなく、別の評価者が成果物をどう評価するか確認する。
```

評価項目:

- 読みやすさ
- 文字転記正答
- 意味理解
- 色・印象が用途に合っているか
- 実際に使いたいか

この設計により、スコアの妥当性を「単一の完全な正解」としてではなく、複数の人間評価との対応として検証する。
