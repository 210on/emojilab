import React, { Suspense, lazy, useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Toolbar from './components/Toolbar';
import PreviewSection from './components/PreviewSection';
import { EmojiConfig, ScoreMetrics, Language, SavedEmoji } from './types';
import { analyzeDesignSupport } from './services/designFeedbackService';
import ResearchApp from './src/research/ResearchApp';
import { calculateMathMetrics } from './src/research/metrics/scoringRules';
import { DEFAULT_PRESET_COLOR_SLOTS } from './constants/colorPalettes';
import { ensureEmojiGoogleFontFamilyLoaded, ensureEmojiGoogleFontLoaded, preloadDeferredGoogleEmojiFonts } from './utils/googleFontLoader';

const SavedStylesPanel = lazy(() => import('./components/SavedStylesPanel'));

const STORAGE_KEY = 'custom-emoji-studio-state-v1';
const CUSTOM_COLOR_SLOT_COUNT = 6;
const MAX_STROKE_WIDTH = 30;
const DEFAULT_SPACING = -50;

interface PreviewSurfaceState {
  light: string;
  dark: string;
  customLight: string;
  customDark: string;
}

const defaultConfig: EmojiConfig = {
  textTop: 'あり',
  textBottom: 'がと',
  lineSizeBalance: 0,
  fontFamily: "'Noto Sans JP', sans-serif",
  fontWeight: 900,
  condense: 100,
  letterSpacing: 0,
  mainColor: '#FFCC00',
  textAlign: 'center',
  stroke1Enabled: true,
  stroke1Color: '#000000',
  stroke1Width: 4,
  stroke2Enabled: true,
  stroke2Color: '#FFFFFF',
  stroke2Width: 10,
  autoSquare: false,
  spacing: DEFAULT_SPACING,
};

const defaultMetrics: ScoreMetrics = {
  overallScore: 85,
  contrastRatio: 90,
  scalability: 95,
};

const defaultPreviewSurfaces: PreviewSurfaceState = {
  light: '#FFFFFF',
  dark: '#1D1C1D',
  customLight: '#EEF3FA',
  customDark: '#2B2D31',
};

const getRoutePath = () => {
  const basePath = new URL(import.meta.env.BASE_URL, window.location.origin).pathname.replace(/\/$/, '');
  const pathname = window.location.pathname;

  if (basePath && pathname.startsWith(basePath)) {
    return pathname.slice(basePath.length) || '/';
  }

  return pathname;
};

const clampStrokeWidth = (value: number) => Math.max(0, Math.min(MAX_STROKE_WIDTH, value));

const normalizeLineSizeBalance = (value: unknown) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  if (value >= -2 && value <= 2 && Number.isInteger(value)) {
    return value * 25;
  }

  return Math.max(-50, Math.min(50, Math.round(value / 5) * 5));
};

const normalizeSavedEmoji = (saved: SavedEmoji): EmojiConfig => ({
  textTop: saved.textTop,
  textBottom: saved.textBottom,
  lineSizeBalance: normalizeLineSizeBalance(saved.lineSizeBalance),
  fontFamily: saved.fontFamily,
  fontWeight: saved.fontWeight,
  condense: saved.condense,
  letterSpacing: saved.letterSpacing ?? 0,
  mainColor: saved.mainColor,
  textAlign: saved.textAlign,
  stroke1Enabled: saved.stroke1Enabled,
  stroke1Color: saved.stroke1Color,
  stroke1Width: clampStrokeWidth(saved.stroke1Width),
  stroke2Enabled: saved.stroke2Enabled,
  stroke2Color: saved.stroke2Color,
  stroke2Width: clampStrokeWidth(saved.stroke2Width),
  autoSquare: saved.autoSquare,
  spacing: saved.spacing ?? DEFAULT_SPACING,
});

const normalizeSavedHistoryItem = (saved: SavedEmoji): SavedEmoji => ({
  ...saved,
  ...normalizeSavedEmoji(saved),
});

const loadStoredState = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Failed to load local state:', error);
    return null;
  }
};

const normalizeCustomColorSlots = (slots: unknown): string[] => {
  return normalizeColorSlots(slots, Array(CUSTOM_COLOR_SLOT_COUNT).fill(''));
};

const normalizeColorSlots = (slots: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(slots)) {
    return [...fallback];
  }

  const validHex = /^#([0-9A-F]{6})$/i;

  return Array.from({ length: fallback.length }, (_, index) => {
    const fallbackValue = fallback[index] ?? '';
    const value = typeof slots[index] === 'string' ? slots[index].trim().toUpperCase() : fallbackValue;
    return validHex.test(value) ? value : fallbackValue;
  });
};

const normalizePreviewSurfaces = (value: unknown): PreviewSurfaceState => {
  const validHex = /^#([0-9A-F]{6})$/i;
  const source = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  const read = (key: keyof PreviewSurfaceState, fallback: string) => {
    const raw = typeof source[key] === 'string' ? source[key].trim().toUpperCase() : fallback;
    return validHex.test(raw) ? raw : fallback;
  };

  return {
    light: read('light', defaultPreviewSurfaces.light),
    dark: read('dark', defaultPreviewSurfaces.dark),
    customLight: read('customLight', defaultPreviewSurfaces.customLight),
    customDark: read('customDark', defaultPreviewSurfaces.customDark),
  };
};

const App: React.FC = () => {
  const routePath = getRoutePath();

  if (routePath.startsWith('/research')) {
    return <ResearchApp routePath={routePath} />;
  }

  const storedStateRef = useRef(loadStoredState());
  const storedState = storedStateRef.current;

  const [isDarkMode, setIsDarkMode] = useState<boolean>(storedState?.isDarkMode ?? false);
  const [lang, setLang] = useState<Language>(storedState?.lang ?? 'jp');
  const [config, setConfig] = useState<EmojiConfig>({
    ...defaultConfig,
    ...(storedState?.config ?? {}),
    lineSizeBalance: normalizeLineSizeBalance(
      storedState?.config?.lineSizeBalance ?? defaultConfig.lineSizeBalance,
    ),
    stroke1Width: clampStrokeWidth(storedState?.config?.stroke1Width ?? defaultConfig.stroke1Width),
    stroke2Width: clampStrokeWidth(storedState?.config?.stroke2Width ?? defaultConfig.stroke2Width),
  });
  const [customColorSlots, setCustomColorSlots] = useState<string[]>(
    normalizeCustomColorSlots(storedState?.customColorSlots),
  );
  const [presetColorSlots, setPresetColorSlots] = useState<string[]>(
    normalizeColorSlots(storedState?.presetColorSlots, DEFAULT_PRESET_COLOR_SLOTS),
  );
  const [previewSurfaces, setPreviewSurfaces] = useState<PreviewSurfaceState>(
    normalizePreviewSurfaces(storedState?.previewSurfaces),
  );
  const [metrics, setMetrics] = useState<ScoreMetrics>(defaultMetrics);
  const [history, setHistory] = useState<SavedEmoji[]>(
    Array.isArray(storedState?.history)
      ? storedState.history.map(normalizeSavedHistoryItem)
      : [],
  );
  const [isSavedStylesOpen, setIsSavedStylesOpen] = useState(false);
  const [fontReadyRevision, setFontReadyRevision] = useState(0);
  const [designTip, setDesignTip] = useState<string>(
    storedState?.lang === 'en'
      ? 'Design feedback updates automatically when you change the design.'
      : 'デザインを変更すると改善コメントが自動で更新されます。'
  );
  const [isScoring, setIsScoring] = useState(false);

  const previewRef = useRef<{ exportPng: () => void }>(null);
  const scoreRequestRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const prepareFonts = async () => {
      try {
        await ensureEmojiGoogleFontLoaded(config.fontFamily, config.fontWeight);
        await ensureEmojiGoogleFontFamilyLoaded(config.fontFamily);
      } catch (error) {
        console.warn('Failed to prepare current Google font:', error);
      } finally {
        if (!cancelled) {
          setFontReadyRevision((value) => value + 1);
        }
      }

      void preloadDeferredGoogleEmojiFonts();
    };

    void prepareFonts();

    return () => {
      cancelled = true;
    };
  }, [config.fontFamily, config.fontWeight]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'en' ? 'jp' : 'en'));
  }, []);

  const toggleSavedStyles = useCallback(() => {
    setIsSavedStylesOpen((prev) => !prev);
  }, []);

  const closeSavedStyles = useCallback(() => {
    setIsSavedStylesOpen(false);
  }, []);

  const handleExport = useCallback(() => {
    previewRef.current?.exportPng();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', isDarkMode ? '#121212' : '#F5F5F4');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            isDarkMode,
            lang,
            config,
            history,
            customColorSlots,
            presetColorSlots,
            previewSurfaces,
          }),
        );
      } catch (error) {
        console.warn('Failed to store local state:', error);
      }
    }, 240);

    return () => window.clearTimeout(timer);
  }, [config, customColorSlots, history, isDarkMode, lang, presetColorSlots, previewSurfaces]);

  const handleConfigChange = useCallback((newConfig: Partial<EmojiConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  }, []);

  const handleSave = useCallback(() => {
    const newSaved: SavedEmoji = {
      ...config,
      id: Date.now().toString(),
      name: `${config.textTop}${config.textBottom}`,
      createdAt: new Date().toISOString(),
    };

    setHistory((prev) => [newSaved, ...prev].slice(0, 12));
  }, [config]);

  const handleSelectSavedStyle = useCallback((saved: SavedEmoji) => {
    setConfig(normalizeSavedEmoji(saved));
    setIsSavedStylesOpen(false);
  }, []);

  const performMathAnalysis = useCallback(() => {
    const nextMetrics = calculateMathMetrics(config, previewSurfaces);

    setMetrics((prev) => ({
      ...prev,
      ...nextMetrics,
    }));
  }, [config, previewSurfaces]);

  useEffect(() => {
    performMathAnalysis();
  }, [performMathAnalysis]);

  const runDesignFeedback = useCallback(async () => {
    const requestId = ++scoreRequestRef.current;
    setIsScoring(true);
    const nextMetrics = calculateMathMetrics(config, previewSurfaces);

    try {
      const result = await analyzeDesignSupport(
        `${config.textTop}${config.textBottom}`,
        config,
        lang,
        nextMetrics,
      );

      if (requestId !== scoreRequestRef.current) {
        return;
      }

      setMetrics((prev) => ({
        ...prev,
        ...nextMetrics,
        overallScore: result.score,
      }));
      setDesignTip(result.tip);
    } catch (error) {
      console.error('Design feedback failed', error);
    } finally {
      if (requestId === scoreRequestRef.current) {
        setIsScoring(false);
      }
    }
  }, [config, lang, previewSurfaces]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      runDesignFeedback();
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [
    config.textTop,
    config.textBottom,
    config.mainColor,
    config.fontFamily,
    config.fontWeight,
    config.autoSquare,
    config.condense,
    config.spacing,
    config.lineSizeBalance,
    config.stroke1Enabled,
    config.stroke1Color,
    config.stroke1Width,
    config.stroke2Enabled,
    config.stroke2Color,
    config.stroke2Width,
    config.letterSpacing,
    previewSurfaces,
    lang,
    runDesignFeedback,
  ]);

  return (
    <div className="h-screen overflow-hidden text-slate-900 dark:text-slate-100">
      <div className="mx-auto flex h-screen max-w-[1440px] flex-col">
        <Header
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          lang={lang}
          toggleLang={toggleLang}
          onExport={handleExport}
          onToggleSavedStyles={toggleSavedStyles}
          isSavedStylesOpen={isSavedStylesOpen}
        />

        {isSavedStylesOpen && (
          <Suspense fallback={null}>
            <SavedStylesPanel
              isOpen={isSavedStylesOpen}
              items={history}
              lang={lang}
              onClose={closeSavedStyles}
              onSaveCurrent={handleSave}
              onSelect={handleSelectSavedStyle}
            />
          </Suspense>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-3 pb-[34rem] sm:px-5 sm:py-4 sm:pb-[34.5rem] lg:overflow-hidden lg:px-6 lg:py-4 lg:pb-4">
          <div className="mx-auto flex min-h-full max-w-6xl min-w-0 flex-col gap-4 lg:h-full">
            <Toolbar
              config={config}
              onChange={handleConfigChange}
              lang={lang}
              presetColorSlots={presetColorSlots}
              onChangePresetColorSlots={setPresetColorSlots}
              customColorSlots={customColorSlots}
              onChangeCustomColorSlots={setCustomColorSlots}
            />

            <PreviewSection
              key={fontReadyRevision}
              ref={previewRef}
              config={config}
              lang={lang}
              previewSurfaces={previewSurfaces}
              onPreviewSurfacesChange={setPreviewSurfaces}
              metrics={metrics}
              designTip={designTip}
              isScoring={isScoring}
              onRefreshScore={runDesignFeedback}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
