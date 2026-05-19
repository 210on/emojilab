import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EmojiConfig, Language } from '../types';
import { locales } from '../locales';

interface ToolbarProps {
  config: EmojiConfig;
  onChange: (newConfig: Partial<EmojiConfig>) => void;
  lang: Language;
  presetColorSlots: string[];
  onChangePresetColorSlots: (next: string[]) => void;
  customColorSlots: string[];
  onChangeCustomColorSlots: (next: string[]) => void;
}

interface EditableNumericValueProps {
  value: number;
  min: number;
  max: number;
  step: number;
  density: ControlDensity;
  onCommit: (next: number) => void;
  className?: string;
  disabled?: boolean;
}

type Tab = 'text' | 'font' | 'color' | 'border' | 'size';
type ControlDensity = 'compact' | 'mobile' | 'full';
type FontWeightMode = 'continuous' | 'discrete';
type PendingFontWeightMode = FontWeightMode | 'none';

interface FontOption {
  name: string;
  value: string;
  supportsWeightAdjustment: boolean;
  familyKey?: string;
  weightMode?: FontWeightMode;
  availableWeights?: FontWeightOption[];
}

interface FontWeightOption {
  value: number;
  label: string;
}

interface PendingFontFace {
  file: File;
  familyKey: string;
  familyName: string;
  displayName: string;
  weightValue?: number;
  weightLabel?: string;
  weightDescriptor?: string;
  styleDescriptor?: 'normal' | 'italic';
  variable: boolean;
}

interface SystemFontCandidate {
  name: string;
  family: string;
  value: string;
  weights: FontWeightOption[];
}

const tabs: { id: Tab; icon: string }[] = [
  { id: 'text', icon: 'edit' },
  { id: 'font', icon: 'font_download' },
  { id: 'color', icon: 'palette' },
  { id: 'border', icon: 'border_outer' },
  { id: 'size', icon: 'aspect_ratio' },
];

const validHexColor = /^#([0-9A-F]{6})$/i;
const SPACING_DISPLAY_OFFSET = -50;
const MOBILE_PANEL_DRAG_THRESHOLD = 52;
const MOBILE_PANEL_DRAG_LIMIT = 140;
const MOBILE_MEDIA_QUERY = '(max-width: 1023px)';
const DESKTOP_FONT_UPLOAD_VALUE = '__upload_font__';

const sectionClass =
  'surface-subtle rounded-[1.15rem] border border-slate-200/80 p-2.5 dark:border-slate-700';
const mobileSectionClass =
  'surface-subtle rounded-[1.15rem] border border-slate-200/80 p-3 dark:border-slate-700';
const desktopSectionTitleClass = 'whitespace-nowrap text-sm font-black text-slate-900 dark:text-white';
const desktopSectionBadgeClass =
  'flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200';

const COMMON_SANS_WEIGHT_OPTIONS: FontWeightOption[] = [
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 700, label: 'Bold' },
  { value: 900, label: 'Ultra' },
];

const MINCHO_WEIGHT_OPTIONS: FontWeightOption[] = [
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 600, label: 'DeBold' },
  { value: 700, label: 'Bold' },
];

const SYSTEM_FONT_CANDIDATES: SystemFontCandidate[] = [
  { name: 'Hiragino Sans', family: 'Hiragino Sans', value: "'Hiragino Sans', sans-serif", weights: COMMON_SANS_WEIGHT_OPTIONS },
  { name: 'Hiragino Maru Gothic ProN', family: 'Hiragino Maru Gothic ProN', value: "'Hiragino Maru Gothic ProN', sans-serif", weights: COMMON_SANS_WEIGHT_OPTIONS },
  { name: 'Hiragino Mincho ProN', family: 'Hiragino Mincho ProN', value: "'Hiragino Mincho ProN', serif", weights: MINCHO_WEIGHT_OPTIONS },
  { name: 'Helvetica Neue', family: 'Helvetica Neue', value: "'Helvetica Neue', sans-serif", weights: COMMON_SANS_WEIGHT_OPTIONS },
  { name: 'SF Pro', family: 'SF Pro Text', value: "'SF Pro Text', system-ui, sans-serif", weights: COMMON_SANS_WEIGHT_OPTIONS },
  { name: 'Roboto', family: 'Roboto', value: "'Roboto', sans-serif", weights: COMMON_SANS_WEIGHT_OPTIONS },
  { name: 'Noto Sans JP', family: 'Noto Sans JP', value: "'Noto Sans JP', sans-serif", weights: COMMON_SANS_WEIGHT_OPTIONS },
  { name: 'Noto Serif JP', family: 'Noto Serif JP', value: "'Noto Serif JP', serif", weights: MINCHO_WEIGHT_OPTIONS },
];

const FONT_WEIGHT_RULES: Array<{ pattern: RegExp; weight: number; label: string }> = [
  { pattern: /\b(hairline|thin|w1)\b/i, weight: 100, label: 'Thin' },
  { pattern: /\b(extra[-_\s]?light|ultra[-_\s]?light|ex[-_\s]?light|exlight|el|w2)\b/i, weight: 200, label: 'ExLight' },
  { pattern: /\b(light|lt|l|w3)\b/i, weight: 300, label: 'Light' },
  { pattern: /\b(regular|normal|book|roman|r|w4)\b/i, weight: 400, label: 'Regular' },
  { pattern: /\b(medium|md|m|w5)\b/i, weight: 500, label: 'Medium' },
  { pattern: /\b(demi[-_\s]?bold|de[-_\s]?bold|debold|semi[-_\s]?bold|sb|db)\b/i, weight: 600, label: 'DeBold' },
  { pattern: /\b(bold|bd|b|w6)\b/i, weight: 700, label: 'Bold' },
  { pattern: /\b(extra[-_\s]?bold|ultra[-_\s]?bold|heavy|eb|hb|h|w7|w8)\b/i, weight: 800, label: 'Heavy' },
  { pattern: /\b(black|ultra|u|w9)\b/i, weight: 900, label: 'Ultra' },
];

const sanitizeFamilyName = (value: string) =>
  value
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeFamilyKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');

const deriveFontWeightInfo = (fileName: string) => {
  const normalized = sanitizeFamilyName(fileName);

  for (const entry of FONT_WEIGHT_RULES) {
    if (entry.pattern.test(normalized)) {
      return { value: entry.weight, label: entry.label };
    }
  }

  const numericMatch = normalized.match(/(?:^|[\s_-])(100|200|300|400|500|600|700|800|900)(?:$|[\s_-])/);
  return numericMatch
    ? {
        value: Number(numericMatch[1]),
        label: FONT_WEIGHT_RULES.find((entry) => entry.weight === Number(numericMatch[1]))?.label ?? String(numericMatch[1]),
      }
    : null;
};

const deriveFontStyle = (fileName: string): 'normal' | 'italic' =>
  /\bitalic\b/i.test(sanitizeFamilyName(fileName)) ? 'italic' : 'normal';

const deriveFamilyStem = (fileName: string) => {
  const normalized = sanitizeFamilyName(fileName);

  const withoutDescriptors = FONT_WEIGHT_RULES.reduce(
    (current, rule) => current.replace(rule.pattern, ' '),
    normalized,
  );

  return withoutDescriptors
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/\([^)]+\)/g, ' ')
    .replace(/\b(variable|var)\b/gi, ' ')
    .replace(/\b(italic|oblique|it)\b/gi, ' ')
    .replace(/\b(100|200|300|400|500|600|700|800|900)\b/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const deriveFamilyKey = (fileName: string) => normalizeFamilyKey(deriveFamilyStem(fileName) || sanitizeFamilyName(fileName));

const deriveDisplayFamilyName = (fileName: string) => deriveFamilyStem(fileName) || sanitizeFamilyName(fileName);

const isVariableFontFile = (fileName: string) => /\b(variable|var)\b/i.test(sanitizeFamilyName(fileName));

const buildFontFamilyValue = (familyName: string) => `'${familyName.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', sans-serif`;

const mergeWeightOptions = (first: FontWeightOption[] = [], second: FontWeightOption[] = []) =>
  Array.from(new Map([...first, ...second].map((weight) => [weight.value, weight])).values())
    .sort((left, right) => left.value - right.value);

const buildPendingFontFamilies = (files: File[]) => {
  const familyMap = new Map<string, PendingFontFace[]>();

  files.forEach((file) => {
    const displayName = deriveDisplayFamilyName(file.name);
    const familyKey = deriveFamilyKey(file.name) || normalizeFamilyKey(sanitizeFamilyName(file.name)) || 'customfont';
    const familyName = `UploadedFont-${familyKey}`;
    const weightInfo = deriveFontWeightInfo(file.name);
    const style = deriveFontStyle(file.name);
    const variable = isVariableFontFile(file.name);

    const pending: PendingFontFace = {
      file,
      familyKey,
      familyName,
      displayName,
      weightValue: weightInfo?.value,
      weightLabel: weightInfo?.label,
      weightDescriptor: variable ? '100 900' : weightInfo ? String(weightInfo.value) : undefined,
      styleDescriptor: style,
      variable,
    };

    const existing = familyMap.get(familyKey) ?? [];
    existing.push(pending);
    familyMap.set(familyKey, existing);
  });

  return Array.from(familyMap.values()).map((faces) => {
    const baseFace = faces[0];
    const availableWeights = Array.from(
      new Map(
        faces
          .filter((face): face is PendingFontFace & { weightValue: number; weightLabel: string } => Boolean(face.weightValue && face.weightLabel))
          .map((face) => [face.weightValue, { value: face.weightValue, label: face.weightLabel }]),
      ).values(),
    ).sort((left, right) => left.value - right.value);

    const hasVariable = faces.some((face) => face.variable);
    const weightMode: PendingFontWeightMode = hasVariable ? 'continuous' : availableWeights.length > 1 ? 'discrete' : 'none';

    return {
      familyKey: baseFace.familyKey,
      familyName: baseFace.familyName,
      displayName: baseFace.displayName,
      faces,
      availableWeights,
      weightMode,
      supportsWeightAdjustment: hasVariable || availableWeights.length > 1,
    };
  });
};

const getNearestWeightOption = (weights: FontWeightOption[], value: number) =>
  weights.reduce((closest, current) => (
    Math.abs(current.value - value) < Math.abs(closest.value - value) ? current : closest
  ));

const mergeFontOptions = (existing: FontOption, incoming: FontOption): FontOption => {
  const mergedWeights = mergeWeightOptions(existing.availableWeights, incoming.availableWeights);
  const weightMode: FontWeightMode | undefined =
    existing.weightMode === 'continuous' || incoming.weightMode === 'continuous'
      ? 'continuous'
      : mergedWeights.length > 1
        ? 'discrete'
        : existing.weightMode ?? incoming.weightMode;

  const supportsWeightAdjustment =
    weightMode === 'continuous' || mergedWeights.length > 1 || existing.supportsWeightAdjustment || incoming.supportsWeightAdjustment;

  return {
    ...existing,
    ...incoming,
    name: mergedWeights.length > 1 ? `${incoming.name.replace(/\s\(\d+\)$/, '')} (${mergedWeights.length})` : incoming.name.replace(/\s\(\d+\)$/, ''),
    supportsWeightAdjustment,
    weightMode,
    availableWeights: mergedWeights.length > 0 ? mergedWeights : undefined,
  };
};

const clampNumericValue = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value));
};

const normalizeNumericValue = (value: number, min: number, max: number, step: number) => {
  const clamped = clampNumericValue(value, min, max);
  const stepped = step > 0 ? Math.round((clamped - min) / step) * step + min : clamped;
  return clampNumericValue(stepped, min, max);
};

const detectInstalledFont = (fontFamily: string) => {
  if (typeof document === 'undefined') {
    return false;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return false;
  }

  const sampleText = 'mmmmmmmmmwwwwwiiiiii漢字ひらがなカタカナ12345!?';
  const baseFamilies = ['monospace', 'sans-serif', 'serif'] as const;
  const baseSignatures = baseFamilies.map((baseFamily) => {
    ctx.font = `72px ${baseFamily}`;
    const metrics = ctx.measureText(sampleText);
    return {
      width: metrics.width,
      ascent: metrics.actualBoundingBoxAscent ?? 0,
      descent: metrics.actualBoundingBoxDescent ?? 0,
    };
  });

  return baseFamilies.some((baseFamily, index) => {
    ctx.font = `72px '${fontFamily}', ${baseFamily}`;
    const metrics = ctx.measureText(sampleText);
    const signature = {
      width: metrics.width,
      ascent: metrics.actualBoundingBoxAscent ?? 0,
      descent: metrics.actualBoundingBoxDescent ?? 0,
    };
    const baseline = baseSignatures[index];

    return (
      Math.abs(signature.width - baseline.width) > 0.25 ||
      Math.abs(signature.ascent - baseline.ascent) > 0.25 ||
      Math.abs(signature.descent - baseline.descent) > 0.25
    );
  });
};

const getFontRenderSignature = (fontFamily: string, weight: number) => {
  if (typeof document === 'undefined') {
    return '';
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return '';
  }

  canvas.width = 280;
  canvas.height = 92;

  const sampleText = 'Hamburgefonstiv 漢字かな 123!?';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${weight} 48px '${fontFamily}', sans-serif`;
  ctx.fillText(sampleText, 8, 62);

  const metrics = ctx.measureText(sampleText);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let alphaHash = 0;

  for (let index = 3; index < imageData.length; index += 16) {
    alphaHash = (alphaHash + imageData[index] * ((index / 4) % 97)) % 10000019;
  }

  return [
    metrics.width.toFixed(2),
    (metrics.actualBoundingBoxAscent ?? 0).toFixed(2),
    (metrics.actualBoundingBoxDescent ?? 0).toFixed(2),
    alphaHash,
  ].join(':');
};

const detectSupportedSystemWeights = (candidate: SystemFontCandidate) => {
  const uniqueWeights = new Map<string, FontWeightOption>();

  candidate.weights.forEach((weight) => {
    const signature = getFontRenderSignature(candidate.family, weight.value);
    if (!uniqueWeights.has(signature)) {
      uniqueWeights.set(signature, weight);
    }
  });

  const weights = Array.from(uniqueWeights.values()).sort((left, right) => left.value - right.value);
  return weights.length > 0 ? weights : [{ value: 400, label: 'Regular' }];
};

const EditableNumericValue: React.FC<EditableNumericValueProps> = ({
  value,
  min,
  max,
  step,
  density,
  onCommit,
  className = '',
  disabled = false,
}) => {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitDraft = () => {
    const trimmed = draft.trim();
    if (trimmed === '' || trimmed === '-') {
      setDraft(String(value));
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }

    const normalized = normalizeNumericValue(parsed, min, max, step);
    onCommit(normalized);
    setDraft(String(normalized));
  };

  const handleChange = (next: string) => {
    const sanitized = next
      .replace(/[^\d-]/g, '')
      .replace(/(?!^)-/g, '');

    setDraft(sanitized);
  };

  const sizeClass =
    density === 'compact'
      ? 'w-[3rem] text-xs'
      : density === 'mobile'
        ? 'w-[3.4rem] text-base'
        : 'w-[3rem] text-sm';

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="-?[0-9]*"
      enterKeyHint="done"
      value={draft}
      disabled={disabled}
      onChange={(event) => handleChange(event.target.value)}
      onBlur={commitDraft}
      onFocus={(event) => event.target.select()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        } else if (event.key === 'Escape') {
          setDraft(String(value));
          event.currentTarget.blur();
        }
      }}
      className={`toolbar-number-input appearance-none rounded-md border border-transparent bg-transparent px-1 py-0 text-right font-black text-slate-900 transition focus:border-slate-200/70 focus:bg-slate-100/65 focus:outline-none focus:ring-1 focus:ring-slate-300/40 disabled:cursor-not-allowed disabled:text-slate-300 disabled:focus:border-transparent disabled:focus:bg-transparent disabled:focus:ring-0 dark:text-white dark:focus:border-slate-600/60 dark:focus:bg-slate-800/70 dark:focus:ring-slate-500/30 dark:disabled:text-slate-600 ${sizeClass} ${className}`}
      aria-label="Numeric value"
    />
  );
};

const Toolbar: React.FC<ToolbarProps> = ({
  config,
  onChange,
  lang,
  presetColorSlots,
  onChangePresetColorSlots,
  customColorSlots,
  onChangeCustomColorSlots,
}) => {
  const t = locales[lang];
  const [activeTab, setActiveTab] = useState<Tab>('text');
  const [customFonts, setCustomFonts] = useState<FontOption[]>([]);
  const [systemFonts, setSystemFonts] = useState<FontOption[]>([]);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(true);
  const [mobilePanelDragY, setMobilePanelDragY] = useState(0);
  const [isMobilePanelDragging, setIsMobilePanelDragging] = useState(false);
  const [isMobileHandleActive, setIsMobileHandleActive] = useState(false);
  const [mainColorDraft, setMainColorDraft] = useState(config.mainColor.toUpperCase());
  const presetColorInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const customColorInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const desktopFontUploadInputRef = useRef<HTMLInputElement | null>(null);
  const mobilePanelStartYRef = useRef<number | null>(null);

  useEffect(() => {
    setMainColorDraft(config.mainColor.toUpperCase());
  }, [config.mainColor]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const updateMobileViewport = () => setIsMobileViewport(mediaQuery.matches);
    updateMobileViewport();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateMobileViewport);
      return () => mediaQuery.removeEventListener('change', updateMobileViewport);
    }

    mediaQuery.addListener(updateMobileViewport);
    return () => mediaQuery.removeListener(updateMobileViewport);
  }, []);

  useEffect(() => {
    if (!isMobileViewport) {
      setSystemFonts([]);
      return;
    }

    const nextFonts = SYSTEM_FONT_CANDIDATES.filter((candidate) => detectInstalledFont(candidate.family)).map((candidate) => {
      const availableWeights = detectSupportedSystemWeights(candidate);
      const supportsWeightAdjustment = availableWeights.length > 1;

      return {
        name: supportsWeightAdjustment ? `${candidate.name} (${availableWeights.length})` : candidate.name,
        value: candidate.value,
        supportsWeightAdjustment,
        weightMode: supportsWeightAdjustment ? 'discrete' as const : undefined,
        availableWeights,
      };
    });

    setSystemFonts(nextFonts);
  }, [isMobileViewport]);

  const defaultFonts: FontOption[] = useMemo(() => ([
    { name: lang === 'jp' ? 'ゴシック' : 'Gothic Bold', value: "'Noto Sans JP', sans-serif", supportsWeightAdjustment: true },
    { name: lang === 'jp' ? '丸ゴシック' : 'Rounded', value: "'M PLUS Rounded 1c', sans-serif", supportsWeightAdjustment: true },
    { name: lang === 'jp' ? '明朝' : 'Mincho', value: "'Shippori Mincho', serif", supportsWeightAdjustment: true },
    { name: lang === 'jp' ? '筆文字風' : 'Kaisei', value: "'Kaisei Tokumin', serif", supportsWeightAdjustment: true },
    { name: 'Dela Gothic', value: "'Dela Gothic One', cursive", supportsWeightAdjustment: false },
  ]), [lang]);

  const availableSystemFonts = useMemo(
    () => systemFonts.filter((systemFont) => !defaultFonts.some((font) => font.value === systemFont.value)),
    [defaultFonts, systemFonts],
  );
  const allFonts = useMemo(
    () => [...defaultFonts, ...availableSystemFonts, ...customFonts],
    [availableSystemFonts, customFonts, defaultFonts],
  );
  const selectedFont = useMemo(
    () => allFonts.find((font) => font.value === config.fontFamily),
    [allFonts, config.fontFamily],
  );

  useEffect(() => {
    if (selectedFont?.weightMode !== 'discrete' || !selectedFont.availableWeights?.length) {
      return;
    }

    const nearestWeight = getNearestWeightOption(selectedFont.availableWeights, config.fontWeight);
    if (nearestWeight.value !== config.fontWeight) {
      onChange({ fontWeight: nearestWeight.value });
    }
  }, [config.fontFamily, config.fontWeight, onChange, selectedFont]);

  const handleFileLoad = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList?.length) return;

    const files: File[] = Array.from(fileList);

    try {
      const groupedFontFaces = buildPendingFontFamilies(files);
      const loadedFonts: FontOption[] = [];

      for (const family of groupedFontFaces) {
        for (const face of family.faces) {
          const objectUrl = URL.createObjectURL(face.file);
          try {
            const fontFace = new FontFace(face.familyName, `url(${objectUrl})`, {
              weight: face.weightDescriptor,
              style: face.styleDescriptor,
            });
            await fontFace.load();
            document.fonts.add(fontFace);
          } finally {
            URL.revokeObjectURL(objectUrl);
          }
        }

        const weightCount = family.availableWeights.length;
        loadedFonts.push({
          name: weightCount > 1 ? `${family.displayName} (${weightCount})` : family.displayName,
          value: buildFontFamilyValue(family.familyName),
          supportsWeightAdjustment: family.supportsWeightAdjustment,
          familyKey: family.familyKey,
          weightMode: family.weightMode === 'none' ? undefined : family.weightMode,
          availableWeights: weightCount > 0 ? family.availableWeights : undefined,
        });
      }

      if (loadedFonts.length > 0) {
        setCustomFonts((prev) => {
          const incomingKeys = new Set(
            loadedFonts
              .map((font) => font.familyKey)
              .filter((value): value is string => Boolean(value)),
          );
          const next = prev.filter((entry) => {
            const entryKey = entry.familyKey ?? normalizeFamilyKey(entry.name.replace(/\s\(\d+\)$/, ''));
            return !incomingKeys.has(entryKey);
          });

          loadedFonts.forEach((font) => {
            const existingIndex = next.findIndex(
              (entry) => entry.familyKey === font.familyKey || entry.value === font.value,
            );
            if (existingIndex >= 0) {
              next[existingIndex] = mergeFontOptions(next[existingIndex], font);
            } else {
              next.push(font);
            }
          });
          return next;
        });

        const primaryFont = loadedFonts[0];
        const nextWeight =
          primaryFont.weightMode === 'discrete' && primaryFont.availableWeights?.length
            ? getNearestWeightOption(primaryFont.availableWeights, config.fontWeight).value
            : config.fontWeight;

        onChange({ fontFamily: primaryFont.value, fontWeight: nextWeight });
      }
    } catch (error) {
      console.error('Failed to load font:', error);
    } finally {
      event.target.value = '';
    }
  };

  const renderSlider = (
    label: string,
    value: number,
    min: number,
    max: number,
    onValueChange: (next: number) => void,
    step = 1,
    density: ControlDensity = 'full',
    displayValue = value,
    disabled = false,
  ) => {
    const isCompact = density === 'compact';
    const isMobile = density === 'mobile';

    return (
    <label className={`flex flex-col gap-2 ${disabled ? 'opacity-45' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`font-bold text-slate-500 dark:text-slate-400 ${isCompact ? 'text-xs' : isMobile ? 'text-sm' : 'text-sm'}`}>{label}</span>
        <EditableNumericValue
          value={displayValue}
          min={min}
          max={max}
          step={step}
          density={density}
          onCommit={onValueChange}
          disabled={disabled}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange(parseInt(event.target.value, 10))}
        className={`w-full accent-[#F73D1B] disabled:cursor-not-allowed disabled:opacity-70 ${isMobile ? 'mobile-range min-h-8' : ''}`}
      />
    </label>
    );
  };

  const renderInlineSlider = (
    label: string,
    value: number,
    min: number,
    max: number,
    onValueChange: (next: number) => void,
    step = 1,
    density: ControlDensity = 'full',
    displayValue = value,
    tightCompact = false,
  ) => {
    const isCompact = density === 'compact';
    const isMobile = density === 'mobile';
    const labelWidth = isCompact
      ? tightCompact
        ? 'w-[2.35rem]'
        : 'w-[2.7rem]'
      : isMobile
        ? 'w-[4.9rem]'
        : 'w-[5.2rem]';
    const sliderInset = isCompact ? (tightCompact ? '' : '') : isMobile ? 'pl-2.5' : 'pl-2';
    const rowGap = isCompact ? (tightCompact ? 'gap-0' : 'gap-0.5') : isMobile ? 'gap-2' : 'gap-2';

    return (
      <label className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center ${rowGap}`}>
        <span
          className={`${labelWidth} truncate text-left font-bold text-slate-500 dark:text-slate-400 ${
            isCompact ? 'text-xs' : isMobile ? 'text-sm' : 'text-sm'
          }`}
        >
          {label}
        </span>
        <div className={sliderInset}>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => onValueChange(parseInt(event.target.value, 10))}
            className={`w-full accent-[#F73D1B] ${isMobile ? 'mobile-range min-h-8' : ''}`}
          />
        </div>
        <EditableNumericValue
          value={displayValue}
          min={min}
          max={max}
          step={step}
          density={density}
          onCommit={onValueChange}
          className={isCompact ? (tightCompact ? 'w-[2.05rem]' : 'w-[2.45rem]') : '-ml-1'}
        />
      </label>
    );
  };

  const renderMobileTabIcon = (tab: Tab) => {
    if (tab === 'border') {
      return (
        <svg
          viewBox="0 0 10.92 11.46"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M6.65,11.46c-.28,0-.5-.15-.6-.41l-.54-1.38c-.31.29-.65.56-1.01.8-.55.37-1.18.57-1.81.57-1.12,0-2.04-.62-2.46-1.66-.15-.4-.23-.82-.23-1.23,0-1.52.94-2.99,2.46-3.88,0-.14,0-.28,0-.42v-.08H.93c-.35,0-.6-.25-.6-.6v-1.5c0-.35.25-.6.6-.6h1.62s0-.04,0-.06l.02-.41c.03-.35.28-.57.62-.57l1.71.04h0c.22,0,.36.1.44.18.08.08.16.23.15.46-.01.12-.02.24-.03.36h4.26c.35,0,.6.25.6.6v1.5c0,.35-.25.6-.6.6h-1.78c.1.03.2.05.29.08,1.62.53,2.7,1.99,2.7,3.64s-1.1,3.61-4.19,3.98c-.03,0-.05,0-.08,0ZM6.76,10.78l-.35.14.35-.13s0,0,0,0ZM6.21,9.39l.51,1.31c2.54-.34,3.44-1.94,3.44-3.23s-.88-2.5-2.19-2.93c-.76-.25-1.97-.36-3.07-.24-.11.01-.22-.03-.3-.1-.08-.08-.12-.18-.12-.3l.04-.56c.01-.2.18-.35.37-.35h4.65v-1.21h-4.51c-.1,0-.2-.04-.27-.12-.07-.07-.11-.17-.1-.28.01-.2.03-.41.05-.62l-1.4-.03c0,.09-.01.18-.02.28l-.02.41c0,.2-.17.36-.38.36h-1.83v1.21h1.77c.1,0,.2.04.28.12.07.08.11.18.1.28-.01.15-.01.28-.01.43,0,.2,0,.41.01.62,0,.15-.07.28-.2.35-1.38.74-2.27,2.05-2.27,3.34,0,.32.06.65.18.96.3.75.94,1.19,1.76,1.19.48,0,.97-.15,1.4-.44,1.53-1.01,2.57-2.63,3.31-3.93.05-.09.14-.16.25-.18.1-.02.21,0,.3.06.47.34.77.9.77,1.47,0,.41-.18,1.75-2.5,2.13ZM7.8,6.71c-.35.59-.76,1.23-1.25,1.84.9-.24,1.41-.7,1.41-1.29,0-.19-.06-.38-.16-.55ZM2.89,9.03c-.31,0-.58-.18-.73-.47-.11-.23-.16-.46-.16-.72,0-.56.25-1.14.71-1.64.1-.11.25-.15.39-.1.14.04.24.17.26.31.09.71.22,1.33.4,1.9.05.16,0,.34-.15.43-.09.06-.13.08-.17.11-.19.13-.38.19-.56.19ZM2.79,7.54c-.02.1-.04.2-.04.3,0,.14.03.27.08.39.05.04.09.04.13.02-.07-.23-.13-.47-.18-.72ZM5,7.37s-.05,0-.07,0c-.14-.03-.25-.13-.29-.27-.1-.35-.16-.78-.17-1.3,0-.19.13-.35.31-.38.29-.05.68-.09,1.1-.04.13.01.24.09.3.21.06.11.05.25-.01.36-.27.45-.57.89-.86,1.28-.07.09-.18.15-.3.15Z"
          />
        </svg>
      );
    }

    const currentTab = tabs.find((item) => item.id === tab);
    return <span className="material-symbols-outlined text-[20px]">{currentTab?.icon}</span>;
  };

  const renderAutoSquareToggle = (density: ControlDensity = 'full') => {
    const isCompact = density === 'compact';
    const isMobile = density === 'mobile';

    return (
    <label className={`inline-flex items-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950 ${isCompact ? 'gap-1.5 px-2 py-1.5' : isMobile ? 'gap-2.5 px-3 py-2' : 'gap-2 px-2.5 py-1.5'}`}>
      <span className={`whitespace-nowrap font-black text-slate-900 dark:text-white ${isCompact ? 'text-[10px]' : isMobile ? 'text-sm' : 'text-sm'}`}>{t.autoSquare}</span>
      <input
        type="checkbox"
        checked={config.autoSquare}
        onChange={(event) => onChange({ autoSquare: event.target.checked })}
        className={`${isMobile ? 'h-[1.125rem] w-[1.125rem]' : 'h-4 w-4'} rounded border-slate-300 text-[#F73D1B] focus:ring-[#F73D1B]`}
      />
    </label>
    );
  };

  const updateCustomColorSlot = (index: number, color: string) => {
    const nextSlots = [...customColorSlots];
    nextSlots[index] = color.toUpperCase();
    onChangeCustomColorSlots(nextSlots);
  };

  const updatePresetColorSlot = (index: number, color: string) => {
    const nextSlots = [...presetColorSlots];
    nextSlots[index] = color.toUpperCase();
    onChangePresetColorSlots(nextSlots);
  };

  const applyMainColor = (color: string) => {
    const nextColor = color.toUpperCase();
    setMainColorDraft(nextColor);
    onChange({ mainColor: nextColor });
  };

  const handleMainColorDraftChange = (value: string) => {
    const normalized = value.toUpperCase();
    setMainColorDraft(normalized);

    if (validHexColor.test(normalized)) {
      onChange({ mainColor: normalized });
    }
  };

  const renderPaletteTiles = (density: ControlDensity = 'full') => {
    const isCompact = density === 'compact';
    const isMobile = density === 'mobile';
    const dotSize = isCompact ? 'h-6 w-6' : isMobile ? 'h-[1.8rem] w-[1.8rem]' : 'h-[1.55rem] w-[1.55rem]';

    return (
      <div className={`grid grid-cols-6 ${isMobile ? 'gap-2' : 'gap-1.5'}`}>
        {presetColorSlots.map((color, index) => {
          const normalizedColor = color.toUpperCase();
          const isActive = config.mainColor.toUpperCase() === normalizedColor;
          const isEditable = isActive;

          return (
            <button
              key={`preset-color-slot-${index}`}
              type="button"
              onClick={() => {
                if (isEditable) {
                  return;
                }

                applyMainColor(normalizedColor);
              }}
              className={`${dotSize} relative rounded-full border-2 transition hover:scale-[1.03] ${
                isActive ? 'border-[#F73D1B] shadow-lg shadow-[#F73D1B]/20' : 'border-transparent'
              }`}
              style={{ backgroundColor: normalizedColor }}
              aria-label={normalizedColor}
              title={normalizedColor}
            >
              <input
                type="color"
                value={normalizedColor}
                ref={(node) => {
                  presetColorInputRefs.current[index] = node;
                }}
                onChange={(event) => {
                  const nextColor = event.target.value.toUpperCase();
                  updatePresetColorSlot(index, nextColor);
                  applyMainColor(nextColor);
                }}
                className={`color-input-reset absolute inset-0 z-10 opacity-0 ${
                  isEditable ? 'cursor-pointer' : 'pointer-events-none'
                }`}
                aria-label={`Edit preset color slot ${index + 1}`}
                tabIndex={-1}
              />
            </button>
          );
        })}
        {customColorSlots.map((color, index) => {
          const hasColor = Boolean(color);
          const normalizedColor = hasColor ? color.toUpperCase() : config.mainColor.toUpperCase();
          const isActive = hasColor && config.mainColor.toUpperCase() === normalizedColor;
          const isEditable = isActive;

          return (
            <button
              key={`custom-color-slot-${index}`}
              type="button"
              onClick={() => {
                if (!hasColor) {
                  updateCustomColorSlot(index, config.mainColor.toUpperCase());
                  return;
                }

                if (isEditable) {
                  return;
                }

                applyMainColor(normalizedColor);
              }}
              className={`relative flex ${dotSize} items-center justify-center rounded-full border-2 transition hover:scale-[1.03] ${
                hasColor
                  ? isActive
                    ? 'border-[#F73D1B] shadow-lg shadow-[#F73D1B]/20'
                    : 'border-transparent'
                  : 'border-dashed border-slate-300 bg-slate-100/80 dark:border-slate-700 dark:bg-[#111827]'
              }`}
              style={hasColor ? { backgroundColor: normalizedColor } : undefined}
              title={hasColor ? normalizedColor : config.mainColor.toUpperCase()}
              aria-label={hasColor ? `Custom color slot ${index + 1}` : `Create custom color slot ${index + 1}`}
            >
              {!hasColor && (
                <span className={`material-symbols-outlined text-slate-400 dark:text-slate-500 ${isMobile ? 'text-[16px]' : 'text-[14px]'}`}>add</span>
              )}
              <input
                type="color"
                value={normalizedColor}
                ref={(node) => {
                  customColorInputRefs.current[index] = node;
                }}
                onChange={(event) => {
                  const nextColor = event.target.value.toUpperCase();
                  updateCustomColorSlot(index, nextColor);
                  applyMainColor(nextColor);
                }}
                className={`color-input-reset absolute inset-0 z-10 opacity-0 ${
                  isEditable ? 'cursor-pointer' : 'pointer-events-none'
                }`}
                aria-label={`Edit custom color slot ${index + 1}`}
                tabIndex={-1}
              />
            </button>
          );
        })}
      </div>
    );
  };

  const renderMainColorEditor = (density: ControlDensity = 'full') => {
    const isCompact = density === 'compact';
    const isMobile = density === 'mobile';
    const colorPickerSize = isCompact ? 'h-8 w-8' : isMobile ? 'h-10 w-10' : 'h-9 w-9';

    return (
      <div className={`flex items-center ${isCompact ? 'w-[9.25rem] gap-2.5' : 'gap-3'}`}>
        <div className={`overflow-hidden rounded-xl border border-slate-200 shadow-sm dark:border-slate-700 ${colorPickerSize}`}>
          <input
            type="color"
            value={config.mainColor}
            onChange={(event) => {
              const nextColor = event.target.value.toUpperCase();
              setMainColorDraft(nextColor);
              onChange({ mainColor: nextColor });
            }}
            className="color-input-reset h-full w-full cursor-pointer bg-transparent"
          />
        </div>
        <input
          type="text"
          inputMode="text"
          maxLength={7}
          value={mainColorDraft}
          onChange={(event) => handleMainColorDraftChange(event.target.value)}
          className={`min-w-0 flex-1 rounded-xl border border-slate-200 bg-white font-black uppercase tracking-[0.08em] text-slate-900 outline-none transition focus:border-[#F73D1B] focus:ring-4 focus:ring-[#F73D1B]/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-[#F73D1B]/20 ${
            isCompact ? 'px-3 py-2 text-xs' : isMobile ? 'px-4 py-3 text-sm' : 'px-3 py-2 text-sm'
          }`}
          aria-label="Main color hex code"
        />
      </div>
    );
  };

  const renderTextControls = (density: ControlDensity = 'full') => {
    const isCompact = density === 'compact';
    const isMobile = density === 'mobile';
    const controlHeight = isCompact ? 'h-10' : isMobile ? 'h-[3.4rem]' : 'h-[3.25rem]';
    const rowLabel = lang === 'en' ? { top: t.topShortText, bottom: t.bottomShortText } : { top: t.topText, bottom: t.bottomText };
    const gridClass = isCompact
      ? "grid-cols-[1.25rem_minmax(0,1fr)]"
      : isMobile
        ? "grid-cols-[1.5rem_minmax(0,1fr)]"
        : "grid-cols-[1.5rem_minmax(0,1fr)]";

    const inputClass = `w-full rounded-2xl border border-slate-200 bg-white text-slate-900 outline-none transition focus:border-[#F73D1B] focus:ring-4 focus:ring-[#F73D1B]/10 dark:border-slate-700 dark:bg-[#111827] dark:text-white dark:focus:ring-[#F73D1B]/20 ${
      isCompact ? 'h-10 px-3.5 text-[1.1rem] font-black tracking-tight' : isMobile ? 'h-[3.4rem] px-4 text-lg' : 'h-[3.25rem] px-4 text-2xl'
    }`;
    const labelClass = `flex items-center justify-center font-black text-slate-500 dark:text-slate-300 ${
      isCompact ? 'text-[1.2rem]' : isMobile ? 'text-base' : 'text-lg'
    }`;

    const textFields = (
      <div className={`flex flex-col ${isCompact ? 'gap-1.5' : 'gap-2'}`}>
        <label className={`grid items-center gap-3 ${gridClass}`}>
          <span className={`${labelClass} ${controlHeight}`} title={t.topText} aria-label={t.topText}>{rowLabel.top}</span>
          <input
            className={inputClass}
            type="text"
            value={config.textTop}
            onChange={(event) => onChange({ textTop: event.target.value })}
          />
        </label>
        <label className={`grid items-center gap-3 ${gridClass}`}>
          <span className={`${labelClass} ${controlHeight}`} title={t.bottomText} aria-label={t.bottomText}>{rowLabel.bottom}</span>
          <input
            className={inputClass}
            type="text"
            value={config.textBottom}
            onChange={(event) => onChange({ textBottom: event.target.value })}
          />
        </label>
      </div>
    );

    if (isCompact || isMobile) {
      return textFields;
    }
  };

  const renderLineSizeBalanceControl = (density: ControlDensity = 'full') => {
    const isCompact = density === 'compact';
    const isMobile = density === 'mobile';
    const sliderWidth = isCompact ? 'w-[7.4rem]' : isMobile ? 'w-[7.4rem]' : 'w-[6.4rem]';

    if (isCompact || isMobile) {
      const containerClass = isCompact
        ? 'relative h-full min-h-[8.15rem] px-0.5'
        : 'relative h-full min-h-[11rem] px-1';
      const labelTextClass = isCompact ? 'text-[0.75rem]' : 'text-[0.72rem]';
      const sliderInsetClass = isCompact ? 'top-0 bottom-0' : 'top-0 bottom-0';
      const thumbPadClass = isCompact ? 'py-3' : 'py-6';
      const valueDensity: ControlDensity = isMobile ? 'mobile' : 'compact';
      const sliderAnchorClass = isCompact ? 'left-[14%]' : 'left-[38%]';
      const labelRailClass = isCompact ? 'left-[0.9rem] w-[2rem]' : 'right-0 w-[1.85rem]';

      return (
        <div className={containerClass}>
          <div className={`absolute ${sliderAnchorClass} ${sliderInsetClass} flex -translate-x-1/2 items-center justify-center`}>
            <div className={`flex h-full items-center justify-center ${thumbPadClass}`}>
              <input
                type="range"
                min={-50}
                max={50}
                step={5}
                value={config.lineSizeBalance}
                aria-label={t.lineSizeBalance}
                onChange={(event) => onChange({ lineSizeBalance: parseInt(event.target.value, 10) })}
                className={`-rotate-90 accent-[#F73D1B] ${sliderWidth} ${isMobile ? 'mobile-range' : ''}`}
              />
            </div>
          </div>
          {isCompact ? (
            <div className={`absolute bottom-0 top-0 ${labelRailClass}`}>
              <span
                className={`absolute right-0 top-[0.55rem] text-right font-black leading-none text-slate-400 dark:text-slate-500 ${labelTextClass}`}
                title={t.topText}
                aria-label={t.topText}
              >
                {t.topShortText}
              </span>
              <EditableNumericValue
                value={config.lineSizeBalance}
                min={-50}
                max={50}
                step={5}
                density={valueDensity}
                onCommit={(next) => onChange({ lineSizeBalance: next })}
                className="absolute right-[-0.25rem] top-1/2 w-[2.35rem] -translate-y-1/2 px-0 text-right"
              />
              <span
                className={`absolute bottom-[0.85rem] right-0 text-right font-black leading-none text-slate-400 dark:text-slate-500 ${labelTextClass}`}
                title={t.bottomText}
                aria-label={t.bottomText}
              >
                {t.bottomShortText}
              </span>
            </div>
          ) : (
            <div className={`absolute bottom-0 top-0 flex flex-col items-center justify-between ${labelRailClass}`}>
              <span
                className={`font-black leading-none text-slate-400 dark:text-slate-500 ${labelTextClass}`}
                title={t.topText}
                aria-label={t.topText}
              >
                {t.topShortText}
              </span>
              <EditableNumericValue
                value={config.lineSizeBalance}
                min={-50}
                max={50}
                step={5}
                density={valueDensity}
                onCommit={(next) => onChange({ lineSizeBalance: next })}
                className="w-[2.65rem] px-0 text-center"
              />
              <span
                className={`font-black leading-none text-slate-400 dark:text-slate-500 ${labelTextClass}`}
                title={t.bottomText}
                aria-label={t.bottomText}
              >
                {t.bottomShortText}
              </span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-between px-0.5 py-1.5">
        <span className="font-black text-[11px] text-slate-400 dark:text-slate-500">
          {config.lineSizeBalance}
        </span>
        <div className="flex h-full items-center justify-center">
          <input
            type="range"
            min={-50}
            max={50}
            step={5}
            value={config.lineSizeBalance}
            aria-label={t.lineSizeBalance}
            onChange={(event) => onChange({ lineSizeBalance: parseInt(event.target.value, 10) })}
            className={`-rotate-90 accent-[#F73D1B] ${sliderWidth}`}
          />
        </div>
      </div>
    );
  };

  const renderDesktopSectionHeader = (index: number, title: string, action?: React.ReactNode) => (
    <div className={`mb-2 flex items-center ${action ? 'justify-between gap-3' : 'gap-2'}`}>
      <div className="flex items-center gap-2">
        <span className={desktopSectionBadgeClass}>{index}</span>
        <p className={desktopSectionTitleClass}>{title}</p>
      </div>
      {action}
    </div>
  );

  const renderWeightControl = (density: ControlDensity = 'full') => {
    const isWeightAdjustable = selectedFont?.supportsWeightAdjustment ?? true;
    const discreteWeights = selectedFont?.weightMode === 'discrete' ? selectedFont.availableWeights ?? [] : [];

    if (!discreteWeights.length) {
      return renderSlider(
        t.weight,
        config.fontWeight,
        100,
        900,
        (value) => onChange({ fontWeight: value }),
        100,
        density,
        config.fontWeight,
        !isWeightAdjustable,
      );
    }

    const currentWeight = getNearestWeightOption(discreteWeights, config.fontWeight);
    const currentIndex = Math.max(0, discreteWeights.findIndex((weight) => weight.value === currentWeight.value));
    const labelDensityClass =
      density === 'compact'
        ? 'text-[10px]'
        : density === 'mobile'
          ? 'text-xs'
          : 'text-[11px]';

    return (
      <label className={`flex flex-col gap-2 ${!isWeightAdjustable ? 'opacity-45' : ''}`}>
        <div className="flex items-center justify-between gap-3">
          <span className={`font-bold text-slate-500 dark:text-slate-400 ${density === 'compact' ? 'text-xs' : density === 'mobile' ? 'text-sm' : 'text-sm'}`}>
            {t.weight}
          </span>
          <div className="flex items-center gap-2">
            <span className={`min-w-[3.8rem] text-right font-bold text-slate-400 dark:text-slate-500 ${labelDensityClass}`}>
              {currentWeight.label}
            </span>
            <EditableNumericValue
              value={currentWeight.value}
              min={discreteWeights[0].value}
              max={discreteWeights[discreteWeights.length - 1].value}
              step={100}
              density={density}
              disabled={!isWeightAdjustable}
              onCommit={(next) => onChange({ fontWeight: getNearestWeightOption(discreteWeights, next).value })}
            />
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={discreteWeights.length - 1}
          step={1}
          value={currentIndex}
          disabled={!isWeightAdjustable}
          onChange={(event) => onChange({ fontWeight: discreteWeights[parseInt(event.target.value, 10)]?.value ?? currentWeight.value })}
          className={`w-full accent-[#F73D1B] disabled:cursor-not-allowed disabled:opacity-70 ${density === 'mobile' ? 'mobile-range min-h-8' : ''}`}
        />
        {discreteWeights.length <= 5 && (
          <div
            className="grid gap-1 text-center"
            style={{ gridTemplateColumns: `repeat(${discreteWeights.length}, minmax(0, 1fr))` }}
          >
            {discreteWeights.map((weight) => (
              <span
                key={weight.value}
                className={`${labelDensityClass} font-bold ${
                  weight.value === currentWeight.value ? 'text-[#F73D1B] dark:text-[#F97355]' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {weight.label}
              </span>
            ))}
          </div>
        )}
      </label>
    );
  };

  const renderFontControls = (density: ControlDensity = 'full') => {
    const isCompact = density === 'compact';
    const isMobile = density === 'mobile';

    return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1.5">
        <select
          value={config.fontFamily}
          onChange={(event) => {
            if (!isMobile && event.target.value === DESKTOP_FONT_UPLOAD_VALUE) {
              desktopFontUploadInputRef.current?.click();
              return;
            }

            const nextFont = allFonts.find((font) => font.value === event.target.value);
            const nextWeight =
              nextFont?.weightMode === 'discrete' && nextFont.availableWeights?.length
                ? getNearestWeightOption(nextFont.availableWeights, config.fontWeight).value
                : config.fontWeight;

            onChange({ fontFamily: event.target.value, fontWeight: nextWeight });
          }}
          className={`w-full rounded-2xl border border-slate-200 bg-white text-slate-900 outline-none transition focus:border-[#F73D1B] focus:ring-4 focus:ring-[#F73D1B]/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-[#F73D1B]/20 ${isCompact ? 'px-3 py-2 text-sm' : isMobile ? 'px-4 py-3 text-base' : 'px-4 py-3 text-base'}`}
        >
          {allFonts.map((font) => (
            <option key={font.value} value={font.value}>
              {font.name}
            </option>
          ))}
          {!isMobile && (
            <option value={DESKTOP_FONT_UPLOAD_VALUE}>
              {t.loadFont}
            </option>
          )}
        </select>
        {!isMobile && (
          <input
            ref={desktopFontUploadInputRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            multiple
            onChange={handleFileLoad}
            className="hidden"
          />
        )}
      </label>

      {renderWeightControl(density)}
    </div>
    );
  };

  const renderSizeControls = (density: ControlDensity = 'full') => (
    <div className="flex flex-col gap-2">
      {renderInlineSlider(
        lang === 'jp' ? '字間' : 'Letter Spacing',
        config.letterSpacing,
        -20,
        48,
        (value) => onChange({ letterSpacing: value }),
        1,
        density,
        config.letterSpacing,
        density === 'compact',
      )}
      {renderInlineSlider(
        t.spacing,
        config.spacing - SPACING_DISPLAY_OFFSET,
        -80,
        80,
        (value) => onChange({ spacing: value + SPACING_DISPLAY_OFFSET }),
        1,
        density,
        config.spacing - SPACING_DISPLAY_OFFSET,
        density === 'compact',
      )}
      {renderInlineSlider(
        t.stretch,
        config.condense,
        60,
        140,
        (value) => onChange({ condense: value }),
        10,
        density,
        config.condense,
        density === 'compact',
      )}
    </div>
  );

  const renderBorderControls = (
    key: 'stroke1' | 'stroke2',
    label: string,
    enabled: boolean,
    color: string,
    width: number,
    density: ControlDensity = 'full',
  ) => {
    const isCompact = density === 'compact';
    const isMobile = density === 'mobile';

    return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <p className={`truncate font-black text-slate-500 dark:text-slate-400 ${isCompact ? 'text-xs' : isMobile ? 'text-sm' : 'text-sm'}`}>{label}</p>
          {!isMobile && (
            <div className="h-8 w-8 overflow-hidden rounded-xl border border-slate-200 shadow-sm dark:border-slate-700">
              <input
                type="color"
                className="color-input-reset h-full w-full cursor-pointer bg-transparent"
                value={color}
                onChange={(event) => onChange({ [`${key}Color`]: event.target.value } as Partial<EmojiConfig>)}
              />
            </div>
          )}
        </div>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onChange({ [`${key}Enabled`]: event.target.checked } as Partial<EmojiConfig>)}
          className={`${isMobile ? 'h-[1.375rem] w-[1.375rem]' : 'h-5 w-5'} rounded border-slate-300 text-[#F73D1B] focus:ring-[#F73D1B]`}
        />
      </div>

      {isMobile ? (
        <div className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 ${enabled ? '' : 'pointer-events-none opacity-40'}`}>
          <label className="flex items-center">
            <div className="h-10 w-10 overflow-hidden rounded-xl border border-slate-200 shadow-sm dark:border-slate-700">
              <input
                type="color"
                className="color-input-reset h-full w-full cursor-pointer bg-transparent"
                value={color}
                onChange={(event) => onChange({ [`${key}Color`]: event.target.value } as Partial<EmojiConfig>)}
              />
            </div>
          </label>
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={width}
            onChange={(event) => onChange({ [`${key}Width`]: parseInt(event.target.value, 10) } as Partial<EmojiConfig>)}
            className="mobile-range min-h-8 w-full accent-[#F73D1B]"
          />
          <EditableNumericValue
            value={width}
            min={0}
            max={30}
            step={1}
            density="mobile"
            onCommit={(value) => onChange({ [`${key}Width`]: value } as Partial<EmojiConfig>)}
          />
        </div>
      ) : (
        <div className={`flex flex-col gap-2 ${enabled ? '' : 'pointer-events-none opacity-40'}`}>
          <div className="pt-1">
            {renderSlider(t.width, width, 0, 30, (value) => onChange({ [`${key}Width`]: value } as Partial<EmojiConfig>), 1, density)}
          </div>
        </div>
      )}
    </div>
    );
  };

  const renderColorControls = (density: ControlDensity = 'full') => {
    const isCompact = density === 'compact';
    const isMobile = density === 'mobile';

    return (
    <div className="flex flex-col gap-2">
      {!isCompact && !isMobile && renderMainColorEditor(density)}
      {renderPaletteTiles(density)}
    </div>
    );
  };

  const resetMobilePanelGesture = () => {
    mobilePanelStartYRef.current = null;
    setMobilePanelDragY(0);
    setIsMobilePanelDragging(false);
    setIsMobileHandleActive(false);
  };

  const handleMobilePanelPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    mobilePanelStartYRef.current = event.clientY;
    setIsMobilePanelDragging(true);
    setIsMobileHandleActive(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleMobilePanelPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (mobilePanelStartYRef.current === null) return;

    const rawDelta = event.clientY - mobilePanelStartYRef.current;
    const constrainedDelta = isMobileOpen
      ? Math.max(0, Math.min(MOBILE_PANEL_DRAG_LIMIT, rawDelta))
      : Math.min(0, Math.max(-MOBILE_PANEL_DRAG_LIMIT, rawDelta));

    setMobilePanelDragY(constrainedDelta);
  };

  const handleMobilePanelPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (mobilePanelStartYRef.current === null) return;

    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (isMobileOpen) {
      if (mobilePanelDragY >= MOBILE_PANEL_DRAG_THRESHOLD) {
        setIsMobileOpen(false);
      }
    } else if (mobilePanelDragY <= -MOBILE_PANEL_DRAG_THRESHOLD) {
      setIsMobileOpen(true);
    }

    resetMobilePanelGesture();
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-transparent transition-opacity lg:hidden ${
          isMobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsMobileOpen(false)}
        aria-hidden="true"
      />
      <section
        className={`fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.22)] backdrop-blur-xl transition-transform duration-300 ease-out dark:border-slate-700 dark:bg-[#151c28] lg:hidden ${
          isMobilePanelDragging ? 'duration-0' : ''
        }`}
        style={{
          transform: mobilePanelDragY === 0 ? undefined : `translateY(${mobilePanelDragY}px)`,
        }}
      >
        <div
          className="touch-none select-none border-b border-slate-200/80 px-4 pt-3 pb-2 dark:border-slate-700 sm:px-5"
          onPointerDown={handleMobilePanelPointerDown}
          onPointerMove={handleMobilePanelPointerMove}
          onPointerUp={handleMobilePanelPointerEnd}
          onPointerCancel={resetMobilePanelGesture}
        >
          <div
            className={`mx-auto h-1.5 w-14 rounded-full transition-colors hover:bg-slate-400/90 dark:hover:bg-slate-600/90 ${
              isMobileHandleActive
                ? 'bg-slate-400 dark:bg-slate-500'
                : 'bg-slate-300/90 dark:bg-slate-700/90'
            }`}
          />

          <div className="flex items-center justify-between gap-3">
            <div />
            <button
              onClick={() => setIsMobileOpen((prev) => !prev)}
              onPointerDown={(event) => event.stopPropagation()}
              aria-label={isMobileOpen ? t.collapseEditor : t.expandEditor}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-[#171717] dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
            >
              <span className={`material-symbols-outlined text-[20px] transition-transform ${isMobileOpen ? '' : 'rotate-180'}`}>
                expand_more
              </span>
            </button>
          </div>
        </div>

        <div
          className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
            isMobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          style={{ maxHeight: isMobileOpen ? '66vh' : '0px' }}
        >
          <div className="border-b border-slate-200/80 px-1.5 py-1 dark:border-slate-700">
            <div className="grid grid-cols-5 gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex h-11 min-w-0 items-center justify-center rounded-xl transition ${
                    activeTab === tab.id
                      ? 'bg-[#F73D1B]/10 text-[#F73D1B] dark:bg-[#F73D1B]/12 dark:text-[#F97355]'
                      : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                  }`}
                >
                  {renderMobileTabIcon(tab.id)}
                  {activeTab === tab.id && <span className="absolute inset-x-3.5 bottom-0 h-0.5 rounded-full bg-[#F73D1B]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[31vh] overflow-y-auto px-4 pt-3 pb-2 sm:h-[32vh] sm:px-5">
            {activeTab === 'text' && (
              <div>
                <div className="grid grid-cols-[minmax(0,1fr)_4.35rem] items-stretch gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">1</span>
                        <p className="text-base font-black text-slate-900 dark:text-white">{t.inputLabel}</p>
                      </div>
                      {renderAutoSquareToggle('mobile')}
                    </div>
                    {renderTextControls('mobile')}
                  </div>
                  {renderLineSizeBalanceControl('mobile')}
                </div>
              </div>
            )}

            {activeTab === 'font' && (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">2</span>
                  <p className="text-base font-black text-slate-900 dark:text-white">{t.typoLabel}</p>
                </div>
                {renderFontControls('mobile')}
              </div>
            )}

            {activeTab === 'color' && (
              <div>
                <div className="mb-2 grid grid-cols-[minmax(0,1fr)_minmax(0,11rem)] items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">3</span>
                    <p className="text-base font-black text-slate-900 dark:text-white">{t.fill}</p>
                  </div>
                  {renderMainColorEditor('mobile')}
                </div>
                {renderPaletteTiles('mobile')}
              </div>
            )}

            {activeTab === 'border' && (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">4</span>
                  <p className="text-base font-black text-slate-900 dark:text-white">{lang === 'jp' ? '線' : 'Stroke'}</p>
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    {renderBorderControls('stroke1', t.stroke1Label, config.stroke1Enabled, config.stroke1Color, config.stroke1Width, 'mobile')}
                  </div>
                  <div>
                    {renderBorderControls('stroke2', t.stroke2Label, config.stroke2Enabled, config.stroke2Color, config.stroke2Width, 'mobile')}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'size' && (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">5</span>
                  <p className="text-base font-black text-slate-900 dark:text-white">{t.dimLabel}</p>
                </div>
                {renderSizeControls('mobile')}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="surface-toolbar hidden overflow-hidden rounded-[2rem] border border-slate-200/80 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-700 lg:block">
        <div className="p-3">
          <div className="grid gap-2 xl:grid-cols-[1.28fr_0.92fr_0.86fr_1.14fr_0.98fr]">
            <div className={sectionClass}>
              <div className="grid grid-cols-[minmax(0,1fr)_3.8rem] items-stretch gap-3">
                <div className="flex flex-col gap-2">
                  {renderDesktopSectionHeader(1, t.inputLabel, renderAutoSquareToggle('compact'))}
                  {renderTextControls('compact')}
                </div>
                {renderLineSizeBalanceControl('compact')}
              </div>
            </div>

            <div className={sectionClass}>
              {renderDesktopSectionHeader(2, t.typoLabel)}
              {renderFontControls('compact')}
            </div>

            <div className={sectionClass}>
              {renderDesktopSectionHeader(3, t.fill, renderMainColorEditor('compact'))}
              {renderColorControls('compact')}
            </div>

            <div className={sectionClass}>
              {renderDesktopSectionHeader(4, lang === 'jp' ? '線' : 'Stroke')}
              <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2.5">
                <div>
                  {renderBorderControls('stroke1', t.stroke1Label, config.stroke1Enabled, config.stroke1Color, config.stroke1Width, 'compact')}
                </div>
                <div className="mt-1 h-full w-px self-stretch bg-slate-200 dark:bg-slate-800" />
                <div>
                  {renderBorderControls('stroke2', t.stroke2Label, config.stroke2Enabled, config.stroke2Color, config.stroke2Width, 'compact')}
                </div>
              </div>
            </div>

            <div className={sectionClass}>
              {renderDesktopSectionHeader(5, t.dimLabel)}
              {renderSizeControls('compact')}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Toolbar;
