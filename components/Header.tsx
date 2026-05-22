
import React from 'react';
import { Language } from '../types';
import { locales } from '../locales';

interface HeaderProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  lang: Language;
  toggleLang: () => void;
  onExport: () => void;
  onToggleSavedStyles: () => void;
  isSavedStylesOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({
  isDarkMode,
  toggleDarkMode,
  lang,
  toggleLang,
  onExport,
  onToggleSavedStyles,
  isSavedStylesOpen,
}) => {
  const t = locales[lang];

  return (
    <nav className="surface-header sticky top-0 z-40 border-b border-slate-200/80 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] shadow-sm transition-all dark:border-slate-700/80 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-[#F73D1B] sm:h-12 sm:w-12 dark:border-slate-700 dark:bg-slate-800 dark:text-[#F73D1B]">
            <span className="material-symbols-outlined text-[18px] sm:text-[20px]">auto_awesome</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-black tracking-tight text-[#F73D1B] dark:text-[#F73D1B] sm:text-2xl">
              {t.title}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={toggleLang}
            aria-label="Toggle language"
            className="hidden rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white sm:inline-flex"
          >
            {t.language}
          </button>
          <button
            onClick={onToggleSavedStyles}
            aria-label={t.save}
            title={t.saveHint}
            aria-expanded={isSavedStylesOpen}
            className={`inline-flex items-center gap-2 rounded-full border bg-white px-3 py-2.5 text-xs font-black text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-[#171717] dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white sm:px-4 sm:text-sm ${
              isSavedStylesOpen ? 'border-[#F73D1B] text-[#F73D1B] dark:border-[#F73D1B] dark:text-[#F97355]' : 'border-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">bookmark</span>
            <span className="hidden sm:inline">{t.save}</span>
          </button>
          <button 
            onClick={toggleDarkMode}
            aria-label="Toggle theme"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-[#171717] dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white sm:h-11 sm:w-11"
          >
            <span className="material-symbols-outlined text-[22px]">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          <button 
            onClick={onExport}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#F73D1B] px-3 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#DE3517] active:scale-[0.98] sm:gap-2 sm:px-5 sm:py-3 sm:text-sm"
          >
            <span className="max-[420px]:hidden">{t.export}</span>
            <span className="material-symbols-outlined text-[18px]">download</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default React.memo(Header);
