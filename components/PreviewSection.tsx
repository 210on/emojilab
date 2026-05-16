import React, {
  useImperativeHandle,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { EmojiConfig, Language, ScoreMetrics } from '../types';
import { locales } from '../locales';
import ChatPreview from './ChatPreview';
import DesignDiagnosis from './DesignDiagnosis';
import {
  getOpaqueBounds,
  renderEmojiToCanvas,
  trimTransparentBounds,
  waitForFonts,
} from '../utils/emojiCanvas';

interface PreviewSectionProps {
  config: EmojiConfig;
  lang: Language;
  previewSurfaces: {
    light: string;
    dark: string;
    customLight: string;
    customDark: string;
  };
      onPreviewSurfacesChange: React.Dispatch<React.SetStateAction<{
    light: string;
    dark: string;
    customLight: string;
    customDark: string;
  }>>;
  metrics: ScoreMetrics;
  aiTip: string;
  isAnalyzing: boolean;
  onRefreshAi: () => void;
}

const previewCards = [
  {
    id: 'light',
    label: 'Light',
    titleKey: 'lightPreview',
    presetColors: ['#FFFFFF', '#F2F3F5', '#F7F4EE', '#EEF3FA'],
    customKey: 'customLight',
  },
  {
    id: 'dark',
    label: 'Dark',
    titleKey: 'darkPreview',
    presetColors: ['#1D1C1D', '#23262B', '#2B2D31', '#111214'],
    customKey: 'customDark',
  },
] as const;

const buildChatSurfaceCandidates = (previewSurfaces: PreviewSectionProps['previewSurfaces']) => {
  const ordered: string[] = [];
  const pushUnique = (value: string) => {
    const normalized = value.toUpperCase();
    if (!ordered.includes(normalized)) {
      ordered.push(normalized);
    }
  };

  if (previewSurfaces.light === previewSurfaces.customLight) {
    pushUnique(previewSurfaces.customLight);
  }

  if (previewSurfaces.dark === previewSurfaces.customDark) {
    pushUnique(previewSurfaces.customDark);
  }

  pushUnique(previewSurfaces.light);
  pushUnique(previewSurfaces.dark);
  pushUnique(previewSurfaces.customLight);
  pushUnique(previewSurfaces.customDark);

  previewCards.forEach((card) => {
    card.presetColors.forEach((color) => pushUnique(color));
  });

  return ordered;
};

const getIconColorForBackground = (hex: string) => {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  return luminance > 0.72 ? '#0F172A' : '#FFFFFF';
};

const getGuideGridStyle = (hex: string) => {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  return luminance > 0.72
    ? {
        lineColor: 'rgba(15, 23, 42, 0.12)',
        edgeColor: 'rgba(15, 23, 42, 0.22)',
      }
    : {
        lineColor: 'rgba(255, 255, 255, 0.12)',
        edgeColor: 'rgba(255, 255, 255, 0.22)',
      };
};

const PreviewCanvas: React.FC<{ config: EmojiConfig; bg: string; size?: number }> = ({
  config,
  bg,
  size = 512,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const guideTone = getGuideGridStyle(bg);
  const [guideBox, setGuideBox] = useState<{ left: number; top: number; side: number } | null>(null);
  const [viewportSide, setViewportSide] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSide = () => {
      const nextSide = Math.max(0, Math.min(container.clientWidth, container.clientHeight));
      setViewportSide(nextSide);
    };

    updateSide();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => updateSide());
      observer.observe(container);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateSide);
    return () => window.removeEventListener('resize', updateSide);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = async () => {
      await waitForFonts();
      renderEmojiToCanvas(ctx, size, config);
      const bounds = getOpaqueBounds(canvas);

      if (!bounds) {
        setGuideBox(null);
        return;
      }

      const side = Math.max(bounds.width, bounds.height);
      const centerX = bounds.minX + bounds.width / 2;
      const centerY = bounds.minY + bounds.height / 2;
      const unclampedLeft = centerX - side / 2;
      const unclampedTop = centerY - side / 2;
      const left = Math.max(0, Math.min(unclampedLeft, size - side));
      const top = Math.max(0, Math.min(unclampedTop, size - side));

      setGuideBox({ left, top, side });
    };

    draw();
  }, [config, size]);

  return (
    <div
      ref={containerRef}
      className="flex h-[16.5vh] min-h-[128px] min-w-0 items-center justify-center overflow-hidden rounded-[1.25rem] border border-slate-200/70 p-1.5 shadow-inner dark:border-slate-700 sm:min-h-[190px] lg:h-full lg:min-h-[316px]"
      style={{ backgroundColor: bg }}
    >
      <div
        className="relative shrink-0"
        style={{
          width: viewportSide > 0 ? `${viewportSide}px` : undefined,
          height: viewportSide > 0 ? `${viewportSide}px` : undefined,
        }}
      >
        <canvas ref={canvasRef} width={size} height={size} className="h-full w-full object-contain" />
        {guideBox && (
          <div
            className="pointer-events-none absolute rounded-[0.85rem]"
            style={{
              left: `${(guideBox.left / size) * 100}%`,
              top: `${(guideBox.top / size) * 100}%`,
              width: `${(guideBox.side / size) * 100}%`,
              height: `${(guideBox.side / size) * 100}%`,
              boxShadow: `inset 0 0 0 1px ${guideTone.edgeColor}`,
            }}
            aria-hidden="true"
          >
            {[33.333, 66.666].map((position) => (
              <React.Fragment key={position}>
                <span
                  className="absolute bottom-0 top-0 w-px"
                  style={{ left: `${position}%`, backgroundColor: guideTone.lineColor }}
                />
                <span
                  className="absolute left-0 right-0 h-px"
                  style={{ top: `${position}%`, backgroundColor: guideTone.lineColor }}
                />
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const PreviewSection = forwardRef<{ exportPng: () => void }, PreviewSectionProps>(({
  config,
  lang,
  previewSurfaces,
  onPreviewSurfacesChange,
  metrics,
  aiTip,
  isAnalyzing,
  onRefreshAi,
}, ref) => {
  const t = locales[lang];
  const chatSurfaceCandidates = useMemo(
    () => buildChatSurfaceCandidates(previewSurfaces),
    [previewSurfaces],
  );

  const exportPng = async () => {
    const canvas = document.createElement('canvas');
    const size = 1024;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    await waitForFonts();
    renderEmojiToCanvas(ctx, size, config);
    const croppedCanvas = trimTransparentBounds(canvas);

    const link = document.createElement('a');
    link.download = `emoji-${config.textTop}${config.textBottom}.png`;
    link.href = croppedCanvas.toDataURL('image/png');
    link.click();
  };

  useImperativeHandle(ref, () => ({ exportPng }));

  return (
    <main className="flex min-w-0 flex-col gap-3 lg:min-h-0 lg:flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_332px]">
      <section className="surface-panel min-w-0 rounded-[1.8rem] border border-slate-200/80 p-3 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-700 lg:flex lg:min-h-0 lg:flex-col">
        <div className="grid min-h-0 min-w-0 grid-cols-2 gap-2 lg:flex-1 lg:gap-3">
          {previewCards.map((card) => (
            <div key={card.id} className="flex min-h-0 min-w-0 flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-800 dark:text-slate-300 lg:px-2.5 lg:text-[10px] lg:tracking-[0.18em]">
                  {card.label}
                </div>
                <div className="flex items-center gap-1">
                  {card.presetColors.map((bg) => {
                    const isSelected = previewSurfaces[card.id] === bg;

                    return (
                      <button
                        key={`${card.id}-${bg}`}
                        type="button"
                        onClick={() => onPreviewSurfacesChange((prev) => ({ ...prev, [card.id]: bg }))}
                        className={`h-5 w-5 rounded-full border-2 transition lg:h-6 lg:w-6 ${
                          isSelected ? 'border-indigo-600 shadow-sm shadow-indigo-500/20' : 'border-white/80 dark:border-slate-900'
                        }`}
                        style={{ backgroundColor: bg }}
                        aria-label={`${t[card.titleKey]} ${bg}`}
                        title={bg}
                      />
                    );
                  })}
                  <label
                    className={`relative flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-2 transition lg:h-6 lg:w-6 ${
                      previewSurfaces[card.id] === previewSurfaces[card.customKey]
                        ? 'border-indigo-600 shadow-sm shadow-indigo-500/20'
                        : 'border-white/80 dark:border-slate-900'
                    }`}
                    style={{ backgroundColor: previewSurfaces[card.customKey] }}
                    title={previewSurfaces[card.customKey]}
                  >
                    <span
                      className="material-symbols-outlined text-[10px] lg:text-[11px]"
                      style={{ color: getIconColorForBackground(previewSurfaces[card.customKey]) }}
                    >
                      palette
                    </span>
                    <input
                      type="color"
                      value={previewSurfaces[card.customKey]}
                      onChange={(event) => {
                        const next = event.target.value.toUpperCase();
                        onPreviewSurfacesChange((prev) => ({
                          ...prev,
                          [card.customKey]: next,
                          [card.id]: next,
                        }));
                      }}
                      className="color-input-reset absolute inset-0 cursor-pointer opacity-0"
                      aria-label={`${t[card.titleKey]} custom color`}
                    />
                  </label>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <PreviewCanvas config={config} bg={previewSurfaces[card.id]} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <aside className="flex min-w-0 flex-col gap-3 lg:min-h-0">
        <DesignDiagnosis
          metrics={metrics}
          tip={aiTip}
          isAnalyzing={isAnalyzing}
          onRefresh={onRefreshAi}
          lang={lang}
        />

        <div className="min-h-0 min-w-0 lg:min-h-[252px]">
          <ChatPreview config={config} lang={lang} surfaceCandidates={chatSurfaceCandidates} />
        </div>
      </aside>
    </main>
  );
});

export default PreviewSection;
