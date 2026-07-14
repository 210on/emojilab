# EmojiLab. Scoring Rule

Current version: **metric-rules-v1.4.0**

Implementation:

- src/research/metrics/designScore.ts
- services/designFeedbackService.ts
- scripts/auditDesignScore.ts

## 1. Scope

The Design Score is a rule-based design-support score for compact text emoji. It is not a standardized psychophysical measure, a WCAG conformance result, or a score of aesthetic preference.

The public UI exposes three values:

- Design Score: integrated support score, 0-100
- APCA Contrast: weakest displayed APCA magnitude, Lc
- Scalability: estimated resistance to loss at small display sizes, 0-100

Layout and composition are not a third independent score in v1.4.0. Width deformation, spacing, line balance, and square-area usage are geometric causes of small-size loss and are included in Scalability.

## 2. Evidence levels

Every rule belongs to one of three evidence levels.

1. External method: APCA calculation and Unicode Unihan stroke-count data
2. Literature-supported direction: high stroke count and narrow glyph width can increase the size needed for recognition
3. EmojiLab. operational heuristic: exact thresholds, weights, and deductions selected for the prototype and requiring calibration against Study 1 / Study 2 ratings

The numeric deductions in this document must not be presented as universal perceptual constants.

## 3. APCA Contrast

### 3.1 Reference implementation

EmojiLab. uses **apca-w3@0.1.9**:

~~~text
APCAcontrast(sRGBtoY(foreground), sRGBtoY(background))
~~~

APCA returns a signed value whose polarity distinguishes dark-on-light from light-on-dark. EmojiLab. displays the absolute magnitude so light and dark preview surfaces can be compared in one bar. The displayed number remains an APCA Lc magnitude; it is not the hidden 0-100 integration score.

APCA guidance relates acceptable Lc to font size, weight, and use case. EmojiLab. uses Lc 60 and 75 as operational bands for compact emoji, but this does not prove WCAG or APCA conformance for every glyph.

### 3.2 Effective outlines

An outline is included in contrast topology only when it is enabled and meets the initial effective-width rule:

~~~text
innerEffective = inner enabled AND inner width >= 2
outerEffective = outer enabled AND outer width >= 4
~~~

These cutoffs are prototype heuristics. They prevent a very thin high-contrast line from being treated as fully effective at 16-20px. A future version should replace UI-unit cutoffs with measured raster width at each target display size.

When a line is disabled, its width and color do not affect the score.

### 3.3 Layer topology

Contrast is evaluated in the rendered layer order:

~~~text
fill -> inner outline -> outer outline -> background
~~~

The strongest effective internal boundary is selected only from adjacent layers:

~~~text
internalBoundaryLc = max(
  APCA(fill, inner) if innerEffective,
  APCA(inner, outer) if both are effective,
  APCA(fill, outer) if only outer is effective
)
~~~

For each preview surface, the visible glyph boundary is the stronger of that internal boundary and the outermost-layer/background boundary:

~~~text
visibleBoundaryLc(surface) = max(
  internalBoundaryLc,
  APCA(outermost effective layer, surface)
)
~~~

The minimum result across the current light, dark, custom-light, and custom-dark surfaces is **backgroundSeparationLc**. If the internal boundary is below Lc 45, its two color bands are treated as one merged silhouette and the next visible boundary is used as **localTextLc**. Otherwise the internal boundary remains localTextLc.

The UI value is:

~~~text
displayedContrastLc = min(localTextLc, backgroundSeparationLc)
~~~

This uses no non-adjacent color pair. It also prevents a same-color fill and inner outline from creating a false Lc 0 failure when a contrasting adjacent outer boundary still defines the glyph.

### 3.4 Internal contrast fit

The Design Score cannot add an unbounded Lc value directly to a 0-100 Scalability score. A hidden integration value is therefore derived:

~~~text
normalizeLc(Lc):
  Lc >= 75: 88 + min(12, (Lc - 75) * 0.8)
  45 <= Lc < 75: 55 + (Lc - 45) * 1.1
  Lc < 45: max(12, 20 + Lc * 0.75)

contrastFitScore =
  normalizeLc(localTextLc) * 0.55
  + normalizeLc(backgroundSeparationLc) * 0.45
~~~

Additional controls:

- localTextLc below 45: cap at 68
- backgroundSeparationLc below 35: cap at 72

Inner-line necessity and thickness do not receive additional deductions here. Missing color separation is already represented by APCA, while an unnecessary or excessively thick line is a small-size geometry risk handled once in Scalability.

**contrastFitScore** is an EmojiLab. integration variable, not an APCA value. Research output must retain **displayedContrastLc** separately.

### 3.5 Color-support rule

The system does not recommend a black inner outline by hue name. It applies a general color/contrast rule:

~~~text
highLightness = OKLCH L >= 0.70
highChroma = OKLCH C >= 0.10
needsLocalContrastSupport =
  highLightness AND highChroma AND fill-on-light Lc < 60
~~~

If an effective inner outline reaches Lc 45 or more against the fill, support is present. In the current PCCS bright palette, this rule commonly identifies b6, b8, and b10; those color names are outcomes, not hard-coded exceptions.

The OKLCH thresholds are operational definitions chosen to make the rule reproducible. They are not established visibility constants and must be validated against human ratings.

## 4. Scalability

### 4.1 Definition

Scalability estimates whether the glyph structure is likely to survive compact rendering. It starts at 100 and subtracts named risks:

~~~text
scalabilityScore = clamp(round(100 - sum(penalties)), 0, 100)
~~~

There are no positive bonuses. This avoids concealing one risk with an unrelated favorable setting.

### 4.2 Penalty table

| Cause | Rule | Deduction |
|---|---|---:|
| Empty input | no non-space character | 100 |
| Characters per line | 1-2 / 3 / 4 / 5+ on the most crowded line | 0 / 19 / 29 / 32 |
| Three-kana exception | exactly 3 Hiragana/Katakana graphemes on a line | character-count deduction 0 |
| Thin weight | weight below 400 | 14 |
| Medium-light weight | 400-599 | 6 |
| Dense Kanji and weight | weight 900 or more | 8 |
| Maximum Kanji strokes | 14 / 16 / 20 or more | 6 / 10 / 16 |
| Number of dense Kanji | one / two or more | 5 / 10 |
| Unknown Han character | one / two or more | 4 / 7 |
| Inner outline | width 10 or more | 14 |
| Inner outline and dense Kanji | width 8 or more | 10 |
| Inner outline without dense Kanji | width 6 or more | 3 |
| Enabled outer outline | below 8 / 15-20 / above 20 | 4 / 2 / 7 |
| Unnecessary inner support | effective inner width 5 or more when fill-on-light Lc is 60 or more | 6 |
| Horizontal deformation | see 4.4 | 0-12 |
| Dense Kanji compressed below 90% | minimum effective width scale below 0.90 | 7 |
| Extreme letter spacing | outside -6 to 16 | 0-6 |
| Extreme two-line spacing | near contact or excessive gap | 0-5 |
| Unequal line widths | ratio above 1.55 | 0-8 |
| Opaque-area aspect | outside 0.80-1.25 | 0-6 |

Disabled outlines have no outline-width penalty. Lack of background separation is handled by APCA rather than by a universal “outline required” rule.

Character count is evaluated **per line**, and the larger of the top/bottom deductions is used. A balanced `2 + 2` design therefore receives no character-count deduction. A non-kana three-character line receives 19 points of deduction, which places an otherwise stable design in the yellow Scalability band. A four-character line receives 29 points, which places an otherwise stable design in the red band. Five or more characters on one line receive the 32-point cap.

Exactly three Hiragana or Katakana grapheme clusters on one line are exempted because their structures are generally less dense than a mixed or Han-character line. This script exception and the 19/29/32 deductions are EmojiLab. operational hypotheses, not externally standardized limits. Study 1 must compare transcription accuracy and response time by per-line count and script type before these values can be treated as calibrated.

Counts use Unicode grapheme clusters through `Intl.Segmenter` when available, with `Array.from` as the compatibility fallback. This prevents a joined emoji sequence or a base character plus combining mark from being counted as several visible characters in supported browsers.

### 4.3 Kanji stroke data

Stroke count is read from Unicode Unihan **kTotalStrokes**. The local dictionary includes characters tagged by kJoyoKanji, kJinmeiyoKanji, kJis0, kJis1, or kJIS0213, plus 髙.

- entries: 13,110
- 14 strokes or more: 5,427
- 16 strokes or more: 3,469
- 20 strokes or more: 1,081

The source snapshot was downloaded from the Unicode latest URL on 2026-07-09. The generator did not record the Unicode version or archive hash. This is a reproducibility limitation; the next dictionary regeneration must pin both.

kTotalStrokes is a reproducible structural feature, not a legibility score. Studies of Chinese-character recognition report that characters with more strokes require larger minimal legible sizes, which supports the direction of the rule. The exact 14/16/20 bands and deductions remain EmojiLab. heuristics.

### 4.4 Horizontal deformation

The score uses the effective horizontal scale after Width Fit and the user Width setting. The largest departure from 100% is penalized:

~~~text
deviation <= 10 percentage points: 0
10-15: 0 to 3
15-20: 3 to 7
20-45: 7 to 12
above 45: 12
~~~

Width Fit is not awarded a fixed bonus. It may reduce line-balance loss while increasing deformation loss. The result, not the button state, is scored.

Published work shows that font width can change eye-movement behavior, while the cited study did not find a significant main effect on reading time or comprehension accuracy. This justifies testing width as a candidate factor; it does not establish recognition loss or EmojiLab.'s exact 90%, 85%, or 80% boundaries. Those boundaries are initial operating bands for later calibration.

### 4.5 Geometric subfactors

Geometry is part of Scalability, not a public third score.

- effectiveTopWidthScale and effectiveBottomWidthScale: Width Fit multiplied by Width
- lineBalanceRisk: unequal final line widths
- letterSpacingRisk: spacing outside the initial safe band
- lineSpacingRisk: near-contact or excessive two-line gap
- coreAspectRatio: approximate fill width / height
- fullAspectRatio: approximate fill-plus-outline width / height
- aspectRatioRisk: weak penalty outside 0.80-1.25

The square-area rule is deliberately weak. A non-square expression is not inherently wrong; the rule only represents potential loss of usable pixels in a square emoji slot.

The scorer uses script-category width approximations rather than browser font raster bounds. Exact font-specific geometry is a known limitation and should be compared with rendered-mask measurements in a later metric version.

## 5. Design Score

### 5.1 Deduction model

~~~text
contrastRisk = (100 - contrastFitScore) * 0.50
scalabilityRisk = (100 - scalabilityScore) * 0.50

criticalRisk =
  +10 if displayedContrastLc < 45
  +10 if scalabilityScore < 60

rawScore =
  100 - contrastRisk - scalabilityRisk - criticalRisk
~~~

The equal 50/50 weights are an interpretable prototype choice, not an empirically fitted coefficient.

### 5.2 Condition caps

~~~text
if Lc < 60 OR Scalability < 72:
  conditionCap = 69
else if Lc < 75 OR Scalability < 82:
  conditionCap = 79
else:
  conditionCap = 100

Design Score = min(round(rawScore), conditionCap)
~~~

This guarantees:

- a red public component cannot produce a yellow or green total
- a yellow public component cannot produce a green total
- 80 or more requires both Lc 75 or more and Scalability 82 or more

### 5.3 UI status

- 80-100: Good / green
- 70-79: Adjust / amber
- 0-69: Needs Work / red

The status thresholds are interface decision bands. Study 1 must test whether their ordering and separation correspond to human legibility ratings.

## 6. Improvement feedback

Feedback candidates correspond to named score causes. Each sentence contains:

~~~text
observed problem -> concrete control or content change
~~~

Examples:

- weak fill/inner boundary -> separate fill and inner colors
- weak surface separation -> change or strengthen the outer outline
- dense Kanji -> use a lower-stroke expression or reduce weight/inner outline
- strong width deformation -> move Width toward 100 and adjust line-size balance
- excessive character count -> shorten or split the expression

Candidate priority is an estimate, not an exact counterfactual score delta.

- contrast candidates use Lc deficit plus a severity constant
- scalability candidates use their named deduction or a sum of interacting deductions
- geometric candidates use the corresponding geometry deductions
- Good designs are not forced to show an improvement merely because a minor deduction exists

Current contrast priority formulas:

~~~text
missing inner support:
  (75 - min(displayed Lc, 75)) * 0.45 + 10

local Lc below 45:
  (45 - local Lc) * 0.60 + 16

background separation below 45:
  (45 - background Lc) * 0.55 + 14
~~~

This ranking is deterministic and auditable, but its constants are heuristic. It should be validated by testing whether following the selected message improves both score and human ratings.

## 7. Automated audit

Run:

~~~bash
npm run audit:score
~~~

The audit checks:

- empty and whitespace-only input
- disabled-outline invariance
- horizontal-deformation boundaries
- dense Kanji interactions
- low contrast
- Width Fit behavior
- thin, stable, and heavy outer outlines
- score ranges and status-cap consistency across a combinatorial matrix
- Japanese feedback contains a concrete action and avoids generic “look at the red bar” text

## 8. Academic interpretation

Claims supported by implementation and external methods:

- APCA Lc is calculated by the approved apca-w3 implementation
- stroke count comes from Unicode Unihan
- higher character complexity and strong width changes are plausible small-size risks supported in direction by prior legibility studies
- score logic is deterministic and versioned

Claims that require experiment:

- exact deductions and thresholds are perceptually optimal
- 80/70 status bands map to participant judgments
- a one-sentence recommendation produces the largest human-legibility improvement
- the integrated score predicts recognition at Slack/Discord display sizes

Do not claim that the Design Score is a validated universal measure until these relations are tested.

## 9. References

- Myndex, apca-w3 and APCA documentation: <https://github.com/Myndex/SAPC-APCA>
- APCA use cases and size/weight guidance: <https://github.com/Myndex/SAPC-APCA/discussions/39>
- Unicode Consortium, Unicode Han Database (UAX #38): <https://www.unicode.org/reports/tr38/>
- Chi, Cai, and You (2003), “Applying image descriptors to the assessment of legibility in Chinese characters,” doi:10.1080/0014013031000109214
- Zhang et al. (2006), “Effects of numbers of strokes on Chinese character recognition during a normal reading condition,” PMID 16491688
- Minakata and Beier (2021), “The effect of font width on eye movements during reading,” doi:10.1016/j.apergo.2021.103523

## 10. Version history

### v1.4.0

- changed character quantity from total-count deduction to maximum characters per line
- removed the false character-count penalty from balanced two-by-two layouts
- added a three-kana exemption
- aligned three-character and four-character line penalties with yellow and red Scalability bands
- made feedback suggest line splitting only for single-line input and redistribution for existing two-line input
- added per-line counts to research audit output

### v1.3.0

- merged composition into Scalability
- removed the fixed Width Fit bonus
- changed all scalability factors to named nonnegative deductions
- aligned total caps with public red/yellow/green bands
- excluded disabled-outline parameters
- evaluated contrast through adjacent rendered layers
- changed feedback priority to named deductions
- added a combinatorial audit

### v1.2.1

- introduced public-component caps, but used older red thresholds

### v1.2.0

- introduced the risk-deduction total with three independent axes

### v1.1.0 and earlier

- used weighted additive integration and a separate composition score
