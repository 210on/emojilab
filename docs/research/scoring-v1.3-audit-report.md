# Scoring v1.3 Audit Report

Date: 2026-07-15
Metric: **metric-rules-v1.3.0**

## 0. 日本語要約

現行スコアを、APCAコントラストと縮小耐性の2軸によるリスク減点方式へ統一した。構成安定性は独立加算せず、横幅変形、字間、行間、上下幅差、縦横比を縮小耐性の原因別減点として扱う。

監査では、無効な線の設定漏れ、同一原因の二重減点、赤い下位指標と高い総合点の逆転、同色レイヤーの誤ったLc 0判定、旧3軸記述、改善コメントの抽象化を修正した。1,125通りの組合せと個別境界ケースはすべて通過した。

ただし、この結果が証明するのは実装の内部整合性であり、人間の知覚に対する外的妥当性ではない。APCA計算とUnicode画数値は外部手法に基づくが、線幅、画数、文字数、横幅、総合点の具体的な減点値と色帯はEmojiLab.の操作的仮説である。論文ではStudy 1 / Study 2による校正前の普遍的尺度として扱ってはならない。

## 1. Audit objective

This audit checked whether the scoring update:

- keeps the public score, component colors, and feedback tone consistent
- excludes disabled visual layers
- evaluates double outlines in rendered layer order
- avoids rewarding an unrelated setting for a serious weakness
- reports the largest actionable problem rather than a generic warning
- distinguishes external evidence from prototype heuristics

## 2. Changes audited

- removed independent Composition score
- integrated width, spacing, line balance, and aspect deductions into Scalability
- removed all positive bonuses, including the former fixed Width Fit bonus
- changed total integration to equal contrast/scalability risk deductions
- aligned total caps with the same bands used by the UI
- changed feedback priority to named penalty causes
- changed contrast evaluation to follow fill, inner, outer, and background adjacency
- changed research output from compositionScore to geometryPenalty

## 3. Automated result

Command:

~~~bash
npm run audit:score
~~~

Result:

- 1,125 combinatorial matrix cases passed
- targeted empty-input, low-contrast, dense-Kanji, line-disable, width-transform, Width Fit, and outer-width cases passed
- joined emoji and combining-mark strings were counted as visible grapheme clusters rather than raw code points
- all totals and components stayed in 0-100
- every red component constrained the total to 69 or below
- every yellow component constrained the total to 79 or below
- disabled outline width/color changes did not alter the score
- changing only fill hue did not change Scalability when outline geometry was unchanged
- representative corrective actions increased the intended component: contrasting boundaries, outer width 10, lighter dense-text inner stroke, and neutralized spacing
- every non-Good Japanese feedback string included a concrete action

Representative outputs:

| Case | Design Score | Lc | Scalability | Interpretation |
|---|---:|---:|---:|---|
| default あり / がと | 92 | 106 | 84 | Good |
| empty input | 0 | 0 | 0 | input required; no visual sample to evaluate |
| white fill, no outlines | 42 | 0 | 84 | contrast failure |
| 確認 / 中, width 100 | 79 | 106 | 74 | dense Kanji and three-character risk |
| 確認 / 中, width 85 | 69 | 106 | 64 | density plus horizontal compression |
| 魑魅 / 魍魎, weight 900, inner 8, width 80 | 56 | 106 | 32 | multiple small-size risks |
| same dense text, weight 700, inner 4, width 100 | 69 | 106 | 64 | improved but still high complexity |
| stable outer width 10 | 92 | 106 | 84 | no outer-width penalty |
| thin outer width 3 | 79 | 80 | 80 | thin-boundary penalty |
| heavy outer width 25 | 79 | 106 | 77 | area-consumption penalty |

## 4. Contradictions found and resolved

### Independent composition double counting

Before v1.3, width and layout risks appeared in a separate Composition score while related risks also appeared in Scalability. This made causal explanation ambiguous. They now appear once as named Scalability penalties.

### Status-color reversal

Before v1.3, total caps used weaker thresholds than the UI bars. A red or yellow component could therefore coexist with a more positive total color. v1.3 uses identical boundary values for component status and total caps.

### Disabled outlines

An absent outer outline formerly received a universal Scalability penalty. This could penalize a design even when the fill or inner boundary already separated from all backgrounds. Disabled outline parameters are now ignored; actual separation remains an APCA issue.

### Non-adjacent color pairs

The older contrast aggregation could select the strongest color pair even when those layers did not touch. v1.3 only compares adjacent layers and takes the strongest glyph-defining adjacent boundary for each surface.

### Same-color layer false failure

An intermediate version treated fill/inner contrast as mandatory, so a black fill with a black inner outline incorrectly produced Lc 0 even when a white adjacent outer outline clearly defined the glyph. The final rule treats sub-critical internal bands as a merged silhouette and evaluates the next adjacent boundary.

### Contrast/Scalability double deduction

Missing color separation was initially deducted once in contrastFitScore and again in Scalability as missing support. This mixed the two public axes and overstated one cause. The final v1.3 implementation leaves color-separation loss in APCA/contrastFit only; unnecessary or excessively thick outline geometry is deducted once in Scalability.

### Width Fit bonus

The older model could award Width Fit merely because the toggle was enabled. v1.3 scores the resulting line balance and deformation. Width Fit can help, hurt, or leave the score unchanged.

### Generic feedback

Generic “adjust the red metric” feedback did not identify an editable cause. v1.3 candidates map to a named deficit and contain a problem-to-action sentence.

## 5. Academic consistency

### Supported direction

- APCA magnitude is computed with the approved apca-w3 package
- Unicode Unihan provides reproducible stroke-count properties
- published Chinese-character studies support stroke count, character width, and character height as factors in minimal legible size
- published font-width work supports testing width as a candidate factor, but does not validate the present deduction bands

### Not externally calibrated

- UI outline-width cutoffs 2, 4, and stable range 8-14
- exact deductions for character count, stroke count, weight, spacing, and aspect
- equal 50/50 total-risk weights
- OKLCH L 0.70 and C 0.10 support thresholds
- status bands 80 and 70
- feedback priority constants

These are deterministic operational definitions. They are academically usable as independent variables or hypotheses, but not as validated perceptual constants.

## 6. Remaining limitations

### APCA context

The displayed Lc is an absolute magnitude. APCA polarity, font size, weight, and x-height are not fully represented by one bar. EmojiLab. must not label this output as WCAG conformance.

### Outline effectiveness

Effective-line thresholds use editor units, not measured final pixels at 16px or 20px. A raster-based effective-width measurement would be stronger.

### Geometry approximation

The scoring path approximates Japanese, Latin, and punctuation widths. The renderer itself uses loaded-font canvas measurement. A later metric should score the rendered opaque mask so unusual fonts cannot diverge from the approximation.

### Kanji data snapshot

The Unihan file was fetched through an unversioned latest URL on 2026-07-09. The next regeneration must record Unicode version, archive checksum, generator source, and output count.

### Human validation

The audit proves internal consistency, not perceptual validity. Study 1 should test score ordering against recognition/legibility ratings. Study 2 should test whether feedback improves the final human-rated result compared with a no-feedback condition.

## 7. Recommended validation analyses

Study 1:

- present stratified samples across Lc and Scalability bands at 16px, 20px, and 32px
- collect transcription accuracy, 7-point legibility, confidence, and response time
- test monotonic association with displayed Lc, Scalability, and Design Score
- estimate whether current 60/75 and 72/82 boundaries separate rating distributions

Study 2:

- compare editor with score/feedback against editor without feedback
- pre-register primary outcomes: final transcription accuracy and human legibility rating
- secondary outcomes: editing time, number of parameter changes, score gain, and self-efficacy
- record whether the recommended control was changed and whether the predicted weak component improved

## 8. Conclusion

No internal status reversal or disabled-layer leakage remained in the tested matrix. The implementation is now more explainable and less contradictory than v1.2.1.

The score is suitable as a versioned research prototype and testable hypothesis. It is not yet suitable to claim a universally valid readability score until the operational thresholds and weights are calibrated against participant data.
