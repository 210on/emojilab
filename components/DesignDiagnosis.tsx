import React, { useState } from 'react';
import { ScoreMetrics, Language } from '../types';
import { locales } from '../locales';

interface DesignDiagnosisProps {
  metrics: ScoreMetrics;
  tip: string;
  isAnalyzing: boolean;
  onRefresh: () => void;
  lang: Language;
}

const DesignDiagnosis: React.FC<DesignDiagnosisProps> = ({
  metrics,
  tip,
  isAnalyzing,
  onRefresh,
  lang,
}) => {
  const t = locales[lang];
  const [isContrastHelpOpen, setIsContrastHelpOpen] = useState(false);

  const getStatusLabel = (score: number) => {
    if (metrics.contrastRatio >= 75 && metrics.scalability >= 82 && score >= 84) return t.excellent;
    if (metrics.contrastRatio >= 60 && metrics.scalability >= 72 && score >= 70) return t.good;
    return t.needsWork;
  };

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (metrics.legibility / 100) * circumference;
  const ringColor =
    metrics.contrastRatio >= 75 && metrics.scalability >= 82 && metrics.legibility >= 84
      ? 'text-emerald-500'
      : metrics.contrastRatio >= 60 && metrics.scalability >= 72 && metrics.legibility >= 70
        ? 'text-amber-500'
        : 'text-rose-500';

  return (
    <section className="flex h-full flex-col gap-3 rounded-[1.7rem] border border-slate-200/80 bg-white/92 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-700 dark:bg-[#151c28]/94 lg:min-h-[236px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white lg:text-xl">
            {t.accessibility}
          </h2>
          <div className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            {getStatusLabel(metrics.legibility)}
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isAnalyzing}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-[#182233] dark:text-slate-300"
          aria-label={t.refresh}
        >
          <span className={`material-symbols-outlined text-[20px] ${isAnalyzing ? 'animate-spin' : ''}`}>
            refresh
          </span>
        </button>
      </div>

      <div className="grid min-h-0 grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-4 lg:grid-cols-[6.5rem_minmax(0,1fr)] lg:gap-5">
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
                {metrics.legibility}
              </span>
            </div>
          </div>
        </div>

        <div className="flex h-full min-h-[5.5rem] flex-col justify-start gap-4 pt-1 lg:min-h-[6.5rem]">
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-black text-slate-500 dark:text-slate-400">
              <div className="group/contrast relative flex items-center gap-1.5">
                <span>{t.contrast}</span>
                <button
                  type="button"
                  onClick={() => setIsContrastHelpOpen((prev) => !prev)}
                  onBlur={() => setTimeout(() => setIsContrastHelpOpen(false), 120)}
                  className="inline-flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full border border-slate-300 text-[10px] font-black text-slate-400 transition hover:border-slate-400 hover:text-slate-600 dark:border-slate-600 dark:text-slate-500 dark:hover:border-slate-500 dark:hover:text-slate-300"
                  aria-label={`${t.contrast} help`}
                  aria-expanded={isContrastHelpOpen}
                >
                  ?
                </button>
                <div
                  className={`absolute left-0 top-full z-10 mt-2 w-[13.5rem] rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-semibold leading-5 text-slate-600 shadow-xl transition dark:border-slate-700 dark:bg-[#182233] dark:text-slate-200 ${
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
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full transition-all duration-700 ${
                  metrics.contrastRatio >= 75
                    ? 'bg-emerald-500'
                    : metrics.contrastRatio >= 60
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min((metrics.contrastRatio / 90) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-black text-slate-500 dark:text-slate-400">
              <span>{t.scale}</span>
              <span>{`${metrics.scalability}%`}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full transition-all duration-700 ${
                  metrics.scalability >= 82
                    ? 'bg-emerald-500'
                    : metrics.scalability >= 72
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                }`}
                style={{ width: `${metrics.scalability}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {tip && (
        <p className="min-h-0 text-sm font-semibold leading-5 text-slate-600 dark:text-slate-200">
          {tip}
        </p>
      )}
    </section>
  );
};

export default DesignDiagnosis;
