import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import SavedStylesPanel from './components/SavedStylesPanel';
import Toolbar from './components/Toolbar';
import PreviewSection from './components/PreviewSection';
import { EmojiConfig, ScoreMetrics, Language, SavedEmoji } from './types';
import { analyzeAccessibility } from './services/geminiService';

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
  stroke2Width: 16,
  autoSquare: false,
  spacing: DEFAULT_SPACING,
};

const defaultMetrics: ScoreMetrics = {
  legibility: 85,
  contrastRatio: 90,
  scalability: 95,
};

const defaultPreviewSurfaces: PreviewSurfaceState = {
  light: '#FFFFFF',
  dark: '#1D1C1D',
  customLight: '#EEF3FA',
  customDark: '#2B2D31',
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
  if (!Array.isArray(slots)) {
    return Array(CUSTOM_COLOR_SLOT_COUNT).fill('');
  }

  const validHex = /^#([0-9A-F]{6})$/i;

  return Array.from({ length: CUSTOM_COLOR_SLOT_COUNT }, (_, index) => {
    const value = typeof slots[index] === 'string' ? slots[index].trim().toUpperCase() : '';
    return validHex.test(value) ? value : '';
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

const hexToLinear = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  return {
    r: Math.pow(r, 2.4),
    g: Math.pow(g, 2.4),
    b: Math.pow(b, 2.4),
  };
};

const getLuminance = (rgb: { r: number; g: number; b: number }) => {
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
};

const calculateAPCA = (fgHex: string, bgHex: string): number => {
  const txt = getLuminance(hexToLinear(fgHex));
  const bg = getLuminance(hexToLinear(bgHex));

  const contrast = bg > txt
    ? (Math.pow(bg, 0.56) - Math.pow(txt, 0.57)) * 100
    : (Math.pow(bg, 0.65) - Math.pow(txt, 0.62)) * 100;

  return Math.abs(contrast);
};

const calculateScalability = (config: EmojiConfig): number => {
  let score = 100;
  const charCount = config.textTop.length + config.textBottom.length;

  if (charCount > 2) score -= (charCount - 2) * 12;
  if (config.fontWeight < 400) score -= 20;
  if (config.fontWeight >= 700) score += 5;

  if (config.stroke1Enabled && config.stroke1Width > 8 && config.fontWeight > 500) {
    score -= 15;
  }

  if (config.stroke2Enabled && config.stroke2Width >= 2) {
    score += 10;
  } else {
    score -= 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};

const calculateMathMetrics = (config: EmojiConfig) => {
  const scalability = calculateScalability(config);

  let contrastRatio = 0;

  if (config.stroke2Enabled && config.stroke2Width > 2) {
    contrastRatio = config.stroke1Enabled && config.stroke1Width > 2
      ? calculateAPCA(config.mainColor, config.stroke1Color)
      : calculateAPCA(config.mainColor, config.stroke2Color);
  } else if (config.stroke1Enabled && config.stroke1Width > 2) {
    contrastRatio = calculateAPCA(config.mainColor, config.stroke1Color);
  } else {
    const onWhite = calculateAPCA(config.mainColor, '#FFFFFF');
    const onBlack = calculateAPCA(config.mainColor, '#000000');
    contrastRatio = Math.min(onWhite, onBlack);
  }

  return {
    contrastRatio: Math.round(contrastRatio),
    scalability,
  };
};

const App: React.FC = () => {
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
  const [aiTip, setAiTip] = useState<string>(
    storedState?.lang === 'en'
      ? 'The AI feedback updates automatically when you change the design.'
      : 'デザインを変更するとAIフィードバックが自動で更新されます。'
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const previewRef = useRef<{ exportPng: () => void }>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', isDarkMode ? '#151C28' : '#F8FAFC');
    }
  }, [isDarkMode]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ isDarkMode, lang, config, history, customColorSlots, previewSurfaces }),
      );
    } catch (error) {
      console.warn('Failed to store local state:', error);
    }
  }, [config, customColorSlots, history, isDarkMode, lang, previewSurfaces]);

  const handleConfigChange = (newConfig: Partial<EmojiConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  };

  const handleSave = () => {
    const newSaved: SavedEmoji = {
      ...config,
      id: Date.now().toString(),
      name: `${config.textTop}${config.textBottom}`,
      createdAt: new Date().toISOString(),
    };

    setHistory((prev) => [newSaved, ...prev].slice(0, 12));
  };

  const handleSelectSavedStyle = (saved: SavedEmoji) => {
    setConfig(normalizeSavedEmoji(saved));
    setIsSavedStylesOpen(false);
  };

  const performMathAnalysis = useCallback(() => {
    const nextMetrics = calculateMathMetrics(config);

    setMetrics((prev) => ({
      ...prev,
      ...nextMetrics,
    }));
  }, [config]);

  useEffect(() => {
    performMathAnalysis();
  }, [performMathAnalysis]);

  const runAiAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    const nextMetrics = calculateMathMetrics(config);

    try {
      const result = await analyzeAccessibility(
        `${config.textTop}${config.textBottom}`,
        config,
        lang,
        nextMetrics,
      );

      setMetrics((prev) => ({
        ...prev,
        legibility: result.score,
      }));
      setAiTip(result.tip);
    } catch (error) {
      console.error('AI Analysis failed', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [config, lang]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      runAiAnalysis();
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
    lang,
    runAiAnalysis,
  ]);

  return (
    <div className="h-screen overflow-hidden text-slate-900 dark:text-slate-100">
      <div className="mx-auto flex h-screen max-w-[1440px] flex-col">
        <Header
          isDarkMode={isDarkMode}
          toggleDarkMode={() => setIsDarkMode((prev) => !prev)}
          lang={lang}
          toggleLang={() => setLang((prev) => (prev === 'en' ? 'jp' : 'en'))}
          onExport={() => previewRef.current?.exportPng()}
          onToggleSavedStyles={() => setIsSavedStylesOpen((prev) => !prev)}
          isSavedStylesOpen={isSavedStylesOpen}
        />

        <SavedStylesPanel
          isOpen={isSavedStylesOpen}
          items={history}
          lang={lang}
          onClose={() => setIsSavedStylesOpen(false)}
          onSaveCurrent={handleSave}
          onSelect={handleSelectSavedStyle}
        />

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-3 pb-[34rem] sm:px-5 sm:py-4 sm:pb-[34.5rem] lg:overflow-hidden lg:px-6 lg:py-4 lg:pb-4">
          <div className="mx-auto flex min-h-full max-w-6xl min-w-0 flex-col gap-4 lg:h-full">
            <Toolbar
              config={config}
              onChange={handleConfigChange}
              lang={lang}
              customColorSlots={customColorSlots}
              onChangeCustomColorSlots={setCustomColorSlots}
            />

            <PreviewSection
              ref={previewRef}
              config={config}
              lang={lang}
              previewSurfaces={previewSurfaces}
              onPreviewSurfacesChange={setPreviewSurfaces}
              metrics={metrics}
              aiTip={aiTip}
              isAnalyzing={isAnalyzing}
              onRefreshAi={runAiAnalysis}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
