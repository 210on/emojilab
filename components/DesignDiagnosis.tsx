import React, { useState } from 'react';
import { ScoreMetrics, Language } from '../types';
import { locales } from '../locales';
import { DESIGN_SCORE_THRESHOLDS } from '../src/research/metrics/designScore';

interface DesignDiagnosisProps {
  metrics: ScoreMetrics;
  tip: string;
  isScoring: boolean;
  onRefresh: () => void;
  lang: Language;
}

const DesignDiagnosis: React.FC<DesignDiagnosisProps> = ({
  metrics,
  tip,
  isScoring,
  onRefresh,
  lang,
}) => {
  const t = locales[lang];
  const [isOverallHelpOpen, setIsOverallHelpOpen] = useState(false);
  const [isContrastHelpOpen, setIsContrastHelpOpen] = useState(false);
  const [isScaleHelpOpen, setIsScaleHelpOpen] = useState(false);
  const [isContrastDetailsOpen, setIsContrastDetailsOpen] = useState(false);
  const [isScaleDetailsOpen, setIsScaleDetailsOpen] = useState(false);

  const penaltyLabels = lang === 'jp'
    ? {
        emptyText: '文字未入力',
        characterCount: '文字数',
        fontWeight: 'フォントの太さ',
        kanjiComplexity: '漢字の画数',
        unknownKanji: '画数未収録漢字',
        innerStroke: '内側線の太さ',
        outerStroke: '外側線の太さ',
        unnecessaryInnerStroke: '不要な内側線',
        widthTransform: '横幅変形',
        denseWidthInteraction: '高画数 × 横幅圧縮',
        letterSpacing: '字間',
        lineSpacing: '行間',
        lineBalance: '上下幅の偏り',
        aspectRatio: '全体の縦横比',
      }
    : {
        emptyText: 'Empty text',
        characterCount: 'Character count',
        fontWeight: 'Font weight',
        kanjiComplexity: 'Kanji stroke count',
        unknownKanji: 'Unknown stroke count',
        innerStroke: 'Inner outline',
        outerStroke: 'Outer outline',
        unnecessaryInnerStroke: 'Unnecessary inner outline',
        widthTransform: 'Width transform',
        denseWidthInteraction: 'Dense Kanji × compression',
        letterSpacing: 'Letter spacing',
        lineSpacing: 'Line spacing',
        lineBalance: 'Line-width balance',
        aspectRatio: 'Overall aspect ratio',
      };

  const activePenalties = metrics.designScore
    ? Object.entries(metrics.designScore.scalabilityPenalties)
        .flatMap(([key, value]) =>
          key !== 'total' && typeof value === 'number' && value > 0
            ? [[key as keyof typeof penaltyLabels, value] as const]
            : [],
        )
        .sort((left, right) => right[1] - left[1])
    : [];

  const getStatusLabel = (score: number) => {
    if (score >= DESIGN_SCORE_THRESHOLDS.totalGood) return t.good;
    if (score >= DESIGN_SCORE_THRESHOLDS.totalAcceptable) return lang === 'jp' ? '調整推奨' : 'Adjust';
    return t.needsWork;
  };

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (metrics.overallScore / 100) * circumference;
  const ringColor =
    metrics.overallScore >= DESIGN_SCORE_THRESHOLDS.totalGood
      ? 'text-emerald-500'
      : metrics.overallScore >= DESIGN_SCORE_THRESHOLDS.totalAcceptable
        ? 'text-amber-500'
        : 'text-rose-500';

  return (
    <section className="surface-panel flex flex-col gap-2.5 rounded-[1.5rem] border border-slate-200/80 p-4 shadow-sm dark:border-slate-700 lg:min-h-[252px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="group/overall relative flex items-center gap-2">
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white lg:text-xl">
              {t.accessibility}
            </h2>
            <button
              type="button"
              onClick={() => setIsOverallHelpOpen((previous) => !previous)}
              onBlur={() => setTimeout(() => setIsOverallHelpOpen(false), 120)}
              className="inline-flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full border border-slate-300 text-[10px] font-black text-slate-400 transition hover:border-slate-400 hover:text-slate-700 dark:border-slate-600 dark:text-slate-500 dark:hover:border-slate-500 dark:hover:text-slate-200"
              aria-label={`${t.accessibility} help`}
              aria-expanded={isOverallHelpOpen}
            >
              ?
            </button>
            <div
              className={`absolute left-0 top-full z-20 mt-2 w-[16rem] rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-semibold leading-5 text-slate-600 shadow-lg transition dark:border-slate-700 dark:bg-[#171717] dark:text-slate-200 ${
                isOverallHelpOpen
                  ? 'translate-y-0 opacity-100'
                  : 'pointer-events-none -translate-y-1 opacity-0 group-hover/overall:translate-y-0 group-hover/overall:opacity-100 group-focus-within/overall:translate-y-0 group-focus-within/overall:opacity-100'
              }`}
            >
              {t.overallScoreHelp}
            </div>
          </div>
          <div className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            {getStatusLabel(metrics.overallScore)}
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isScoring}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-[#171717] dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
          aria-label={t.refresh}
        >
          <span className={`material-symbols-outlined text-[20px] ${isScoring ? 'animate-spin' : ''}`}>
            refresh
          </span>
        </button>
      </div>

      <div className="grid min-h-0 grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-4 lg:grid-cols-[6.5rem_minmax(0,1fr)] lg:gap-4">
        <div className="flex h-full items-start justify-center pt-1">
          <div className="relative h-[5.5rem] w-[5.5rem] shrink-0 lg:h-[6.5rem] lg:w-[6.5rem]">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="currentColor"
                strokeWidth="9"
                fill="transparent"
                className="text-slate-100 dark:text-slate-800"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="currentColor"
                strokeWidth="9"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={`transition-all duration-700 ${ringColor}`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[1.75rem] font-black text-slate-900 dark:text-white lg:text-[2.2rem]">
                {metrics.overallScore}
              </span>
            </div>
          </div>
        </div>

        <div className="flex h-full min-h-[5.5rem] flex-col justify-start gap-3.5 pt-1 lg:min-h-[6.5rem]">
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-black text-slate-500 dark:text-slate-400">
              <div className="group/contrast relative flex items-center gap-1.5">
                <span>{t.contrast}</span>
                <button
                  type="button"
                  onClick={() => setIsContrastHelpOpen((prev) => !prev)}
                  onBlur={() => setTimeout(() => setIsContrastHelpOpen(false), 120)}
                  className="inline-flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full border border-slate-300 text-[10px] font-black text-slate-400 transition hover:border-slate-400 hover:text-slate-700 dark:border-slate-600 dark:text-slate-500 dark:hover:border-slate-500 dark:hover:text-slate-200"
                  aria-label={`${t.contrast} help`}
                  aria-expanded={isContrastHelpOpen}
                >
                  ?
                </button>
                <div
                  className={`absolute left-0 top-full z-10 mt-2 w-[13.5rem] rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-semibold leading-5 text-slate-600 shadow-lg transition dark:border-slate-700 dark:bg-[#171717] dark:text-slate-200 ${
                    isContrastHelpOpen
                      ? 'translate-y-0 opacity-100'
                      : 'pointer-events-none -translate-y-1 opacity-0 group-hover/contrast:translate-y-0 group-hover/contrast:opacity-100 group-focus-within/contrast:translate-y-0 group-focus-within/contrast:opacity-100'
                  }`}
                >
                  {t.contrastHelp}
                </div>
              </div>
              <span>{`Lc ${metrics.contrastRatio}`}</span>
            </div>
            <div className="group/contrastbar relative">
              <button
                type="button"
                onClick={() => setIsContrastDetailsOpen((previous) => !previous)}
                onBlur={() => setTimeout(() => setIsContrastDetailsOpen(false), 120)}
                className="block h-2.5 w-full cursor-help overflow-hidden rounded-full bg-slate-100 text-left outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-[#F73D1B] dark:bg-slate-800 dark:ring-offset-[#171717]"
                aria-label={t.contrastDetails}
                aria-expanded={isContrastDetailsOpen}
              >
                <span
                  className={`block h-full transition-all duration-700 ${
                    metrics.contrastRatio >= DESIGN_SCORE_THRESHOLDS.contrastGood
                      ? 'bg-emerald-500'
                      : metrics.contrastRatio >= DESIGN_SCORE_THRESHOLDS.contrastAcceptable
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min((metrics.contrastRatio / 90) * 100, 100)}%` }}
                />
              </button>
              {metrics.designScore && (
                <div
                  className={`absolute right-0 top-full z-30 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 text-[11px] font-semibold leading-5 text-slate-600 shadow-lg transition dark:border-slate-700 dark:bg-[#171717] dark:text-slate-200 ${
                    isContrastDetailsOpen
                      ? 'translate-y-0 opacity-100'
                      : 'pointer-events-none -translate-y-1 opacity-0 group-hover/contrastbar:translate-y-0 group-hover/contrastbar:opacity-100 group-focus-within/contrastbar:translate-y-0 group-focus-within/contrastbar:opacity-100'
                  }`}
                >
                  <p className="mb-1.5 font-black text-slate-900 dark:text-white">{t.contrastDetails}</p>
                  <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 tabular-nums">
                    <dt>{t.localBoundaryContrast}</dt>
                    <dd className="font-black">Lc {metrics.designScore.contrast.localTextLc}</dd>
                    <dt>{t.backgroundBoundaryContrast}</dt>
                    <dd className="font-black">Lc {metrics.designScore.contrast.backgroundSeparationLc}</dd>
                    <dt>{t.fillOnLightContrast}</dt>
                    <dd className="font-black">Lc {metrics.designScore.contrast.fillOnLightLc}</dd>
                    <dt>{t.fillOnDarkContrast}</dt>
                    <dd className="font-black">Lc {metrics.designScore.contrast.fillOnDarkLc}</dd>
                    <dt className="mt-1 border-t border-slate-200 pt-1 dark:border-slate-700">{t.contrastFit}</dt>
                    <dd className="mt-1 border-t border-slate-200 pt-1 font-black dark:border-slate-700">
                      {metrics.designScore.contrastFitScore} / 100
                    </dd>
                  </dl>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-black text-slate-500 dark:text-slate-400">
              <div className="group/scalehelp relative flex items-center gap-1.5">
                <span>{t.scale}</span>
                <button
                  type="button"
                  onClick={() => setIsScaleHelpOpen((previous) => !previous)}
                  onBlur={() => setTimeout(() => setIsScaleHelpOpen(false), 120)}
                  className="inline-flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full border border-slate-300 text-[10px] font-black text-slate-400 transition hover:border-slate-400 hover:text-slate-700 dark:border-slate-600 dark:text-slate-500 dark:hover:border-slate-500 dark:hover:text-slate-200"
                  aria-label={`${t.scale} help`}
                  aria-expanded={isScaleHelpOpen}
                >
                  ?
                </button>
                <div
                  className={`absolute bottom-full left-0 z-40 mb-2 w-[14.5rem] rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-semibold leading-5 text-slate-600 shadow-lg transition dark:border-slate-700 dark:bg-[#171717] dark:text-slate-200 ${
                    isScaleHelpOpen
                      ? 'translate-y-0 opacity-100'
                      : 'pointer-events-none translate-y-1 opacity-0 group-hover/scalehelp:translate-y-0 group-hover/scalehelp:opacity-100 group-focus-within/scalehelp:translate-y-0 group-focus-within/scalehelp:opacity-100'
                  }`}
                >
                  {t.scaleHelp}
                </div>
              </div>
              <span>{`${metrics.scalability}%`}</span>
            </div>
            <div className="group/scalebar relative">
              <button
                type="button"
                onClick={() => setIsScaleDetailsOpen((previous) => !previous)}
                onBlur={() => setTimeout(() => setIsScaleDetailsOpen(false), 120)}
                className="block h-2.5 w-full cursor-help overflow-hidden rounded-full bg-slate-100 text-left outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-[#F73D1B] dark:bg-slate-800 dark:ring-offset-[#171717]"
                aria-label={t.scalabilityDetails}
                aria-expanded={isScaleDetailsOpen}
              >
                <span
                  className={`block h-full transition-all duration-700 ${
                    metrics.scalability >= DESIGN_SCORE_THRESHOLDS.scalabilityGood
                      ? 'bg-emerald-500'
                      : metrics.scalability >= DESIGN_SCORE_THRESHOLDS.scalabilityAcceptable
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                  }`}
                  style={{ width: `${metrics.scalability}%` }}
                />
              </button>
              {metrics.designScore && (
                <div
                  className={`absolute right-0 top-full z-30 mt-2 max-h-[15rem] w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 text-[11px] font-semibold leading-5 text-slate-600 shadow-lg transition dark:border-slate-700 dark:bg-[#171717] dark:text-slate-200 ${
                    isScaleDetailsOpen
                      ? 'translate-y-0 opacity-100'
                      : 'pointer-events-none -translate-y-1 opacity-0 group-hover/scalebar:translate-y-0 group-hover/scalebar:opacity-100 group-focus-within/scalebar:translate-y-0 group-focus-within/scalebar:opacity-100'
                  }`}
                >
                  <p className="mb-1.5 font-black text-slate-900 dark:text-white">{t.scalabilityDetails}</p>
                  {activePenalties.length > 0 ? (
                    <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 tabular-nums">
                      {activePenalties.map(([key, value]) => (
                        <React.Fragment key={key}>
                          <dt>{penaltyLabels[key]}</dt>
                          <dd className="font-black text-rose-500">-{Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 1)}</dd>
                        </React.Fragment>
                      ))}
                      <dt className="mt-1 border-t border-slate-200 pt-1 dark:border-slate-700">{t.totalDeduction}</dt>
                      <dd className="mt-1 border-t border-slate-200 pt-1 font-black dark:border-slate-700">
                        -{metrics.designScore.scalabilityPenalties.total}
                      </dd>
                    </dl>
                  ) : (
                    <p>{t.noDeductions}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {tip && (
        <p className="min-h-0 text-sm font-semibold leading-[1.55] text-slate-600 dark:text-slate-200">
          {tip}
        </p>
      )}
    </section>
  );
};

export default React.memo(DesignDiagnosis);
