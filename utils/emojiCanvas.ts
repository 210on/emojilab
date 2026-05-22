import { EmojiConfig } from '../types';

const BASE_FONT_RATIO = 0.21;
const ALIGN_PADDING_RATIO = 0.12;
const SAFE_CANVAS_PADDING = 4;
const MIN_WIDTH_FIT_SCALE = 0.62;
const MAX_WIDTH_FIT_SCALE = 1.75;

type LineKey = 'top' | 'bottom';

interface TextLayout {
  text: string;
  segments: string[];
  advances: number[];
  widthWithSpacing: number;
  ascent: number;
  descent: number;
}

interface LineRenderable {
  mask: HTMLCanvasElement;
  x: number;
  y: number;
  width: number;
  height: number;
  padding: number;
  contentHeight: number;
}

interface LayerRenderable {
  image: HTMLCanvasElement;
  x: number;
  y: number;
}

interface OpaqueBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

interface LineMeasurement {
  layout: TextLayout;
  fontSize: number;
  padding: number;
}

export interface RenderedEmojiAssets {
  baseCanvas: HTMLCanvasElement;
  trimmedCanvas: HTMLCanvasElement;
  squareCanvas: HTMLCanvasElement;
  bounds: OpaqueBounds | null;
}

const segmenterConstructor = (
  Intl as typeof Intl & {
    Segmenter?: new (
      locales?: string | string[],
      options?: { granularity?: 'grapheme' | 'word' | 'sentence' },
    ) => {
      segment: (input: string) => Iterable<{ segment: string }>;
    };
  }
).Segmenter;

const dilationOffsetCache = new Map<number, Array<[number, number]>>();
const renderAssetCache = new Map<string, Promise<RenderedEmojiAssets>>();
const MAX_RENDER_CACHE_ENTRIES = 40;
let measurementCanvas: HTMLCanvasElement | null = null;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const createCanvas = (width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));
  return canvas;
};

const cloneCanvas = (source: HTMLCanvasElement) => {
  const clone = createCanvas(source.width, source.height);
  const ctx = clone.getContext('2d');
  if (!ctx) return source;
  ctx.drawImage(source, 0, 0);
  return clone;
};

const getRenderCacheKey = (size: number, config: EmojiConfig) =>
  JSON.stringify({
    size,
    textTop: config.textTop,
    textBottom: config.textBottom,
    lineSizeBalance: config.lineSizeBalance,
    fontFamily: config.fontFamily,
    fontWeight: config.fontWeight,
    condense: config.condense,
    letterSpacing: config.letterSpacing,
    mainColor: config.mainColor,
    textAlign: config.textAlign,
    stroke1Enabled: config.stroke1Enabled,
    stroke1Color: config.stroke1Color,
    stroke1Width: config.stroke1Width,
    stroke2Enabled: config.stroke2Enabled,
    stroke2Color: config.stroke2Color,
    stroke2Width: config.stroke2Width,
    autoSquare: config.autoSquare,
    spacing: config.spacing,
  });

const trimCacheIfNeeded = () => {
  while (renderAssetCache.size > MAX_RENDER_CACHE_ENTRIES) {
    const oldestKey = renderAssetCache.keys().next().value;
    if (!oldestKey) return;
    renderAssetCache.delete(oldestKey);
  }
};

const getMeasurementContext = () => {
  if (!measurementCanvas) {
    measurementCanvas = createCanvas(1, 1);
  }

  const ctx = measurementCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create measurement context');
  }

  return ctx;
};

const normalizeLineSizeBalance = (value: number) => {
  if (value >= -2 && value <= 2 && Number.isInteger(value)) {
    return value * 25;
  }

  return clamp(Math.round(value / 5) * 5, -50, 50);
};

const getLineSizeMultiplier = (balance: number, line: LineKey) => {
  const normalized = normalizeLineSizeBalance(balance);
  const raw = line === 'top' ? 1 + normalized * 0.00857 : 1 - normalized * 0.00857;
  return clamp(raw, 0.56, 1.44);
};

const getSegments = (text: string) => {
  if (!text) return [];

  if (segmenterConstructor) {
    const segmenter = new segmenterConstructor(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (entry) => entry.segment);
  }

  return Array.from(text);
};

const getTextLayout = (
  ctx: CanvasRenderingContext2D,
  text: string,
  letterSpacing: number,
  fallbackFontSize: number,
): TextLayout => {
  if (!text) {
    return {
      text,
      segments: [],
      advances: [],
      widthWithSpacing: 0,
      ascent: fallbackFontSize * 0.78,
      descent: fallbackFontSize * 0.22,
    };
  }

  const segments = getSegments(text);
  const fullMetrics = ctx.measureText(text);
  let previousWidth = 0;
  let cumulative = '';

  const advances = segments.map((segment) => {
    cumulative += segment;
    const currentWidth = ctx.measureText(cumulative).width;
    const advance = currentWidth - previousWidth;
    previousWidth = currentWidth;
    return advance;
  });

  return {
    text,
    segments,
    advances,
    widthWithSpacing: fullMetrics.width + Math.max(segments.length - 1, 0) * letterSpacing,
    ascent: fullMetrics.actualBoundingBoxAscent || fallbackFontSize * 0.78,
    descent: fullMetrics.actualBoundingBoxDescent || fallbackFontSize * 0.22,
  };
};

const drawTextLayout = (
  ctx: CanvasRenderingContext2D,
  layout: TextLayout,
  letterSpacing: number,
) => {
  if (!layout.text) return;

  if (Math.abs(letterSpacing) < 0.001 || layout.segments.length <= 1) {
    ctx.fillText(layout.text, 0, 0);
    return;
  }

  let cursor = 0;
  layout.segments.forEach((segment, index) => {
    ctx.fillText(segment, cursor, 0);
    cursor += layout.advances[index] + letterSpacing;
  });
};

const getBandThickness = (strokeWidth: number, size: number) => {
  if (strokeWidth <= 0) return 0;
  return Math.max(1, Math.round(strokeWidth * (size / 332)));
};

const getTargetLineWidth = (size: number, totalStrokeExtent: number) => {
  const sidePadding = size * ALIGN_PADDING_RATIO + totalStrokeExtent + SAFE_CANVAS_PADDING;
  return Math.max(size * 0.28, size - sidePadding * 2);
};

const getWidthFitScales = (config: EmojiConfig, widths: number[], targetWidth: number) => {
  if (!config.autoSquare) {
    return widths.map(() => 1);
  }

  const activeWidths = widths.filter((width) => width > 0);
  if (activeWidths.length === 0) {
    return widths.map(() => 1);
  }

  if (activeWidths.length === 1) {
    const [onlyWidth] = activeWidths;
    const soloScale = clamp(targetWidth / onlyWidth, MIN_WIDTH_FIT_SCALE, MAX_WIDTH_FIT_SCALE);
    return widths.map((width) => (width > 0 ? soloScale : 1));
  }

  const minWidth = Math.min(...activeWidths);
  const maxWidth = Math.max(...activeWidths);
  const geometricMean = Math.sqrt(activeWidths.reduce((product, width) => product * width, 1));
  const nudgedTarget = geometricMean * clamp(targetWidth / geometricMean, 0.92, 1.08);
  const sharedTarget = clamp(nudgedTarget, minWidth, maxWidth);

  return widths.map((width) => {
    if (width <= 0) return 1;
    return clamp(sharedTarget / width, MIN_WIDTH_FIT_SCALE, MAX_WIDTH_FIT_SCALE);
  });
};

const getCircleOffsets = (radius: number) => {
  const roundedRadius = Math.max(0, Math.round(radius));

  const cached = dilationOffsetCache.get(roundedRadius);
  if (cached) return cached;

  const offsets: Array<[number, number]> = [];

  for (let y = -roundedRadius; y <= roundedRadius; y += 1) {
    for (let x = -roundedRadius; x <= roundedRadius; x += 1) {
      if (x * x + y * y <= roundedRadius * roundedRadius) {
        offsets.push([x, y]);
      }
    }
  }

  dilationOffsetCache.set(roundedRadius, offsets);
  return offsets;
};

const dilateMask = (source: HTMLCanvasElement, radius: number) => {
  const roundedRadius = Math.max(0, Math.round(radius));
  if (roundedRadius === 0) {
    const clone = createCanvas(source.width, source.height);
    const cloneCtx = clone.getContext('2d');
    if (!cloneCtx) return source;
    cloneCtx.drawImage(source, 0, 0);
    return clone;
  }

  const canvas = createCanvas(source.width, source.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return source;

  ctx.imageSmoothingEnabled = true;
  const offsets = getCircleOffsets(roundedRadius);

  offsets.forEach(([x, y]) => {
    ctx.drawImage(source, x, y);
  });

  return canvas;
};

const colorizeMask = (
  source: HTMLCanvasElement,
  color: string,
  subtract?: HTMLCanvasElement,
) => {
  const canvas = createCanvas(source.width, source.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return source;

  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (subtract) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(subtract, 0, 0);
  }

  ctx.globalCompositeOperation = 'source-over';
  return canvas;
};

const getAlignedX = (
  size: number,
  align: EmojiConfig['textAlign'],
  finalWidth: number,
  padding: number,
) => {
  if (align === 'left') {
    return size * ALIGN_PADDING_RATIO - padding;
  }

  if (align === 'right') {
    return size * (1 - ALIGN_PADDING_RATIO) - finalWidth - padding;
  }

  return size / 2 - finalWidth / 2 - padding;
};

const createLineMeasurement = (
  text: string,
  line: LineKey,
  size: number,
  config: EmojiConfig,
  totalStrokeExtent: number,
): LineMeasurement | null => {
  if (!text) return null;

  const fontSize = size * BASE_FONT_RATIO * getLineSizeMultiplier(config.lineSizeBalance, line);
  const measureCtx = getMeasurementContext();
  measureCtx.font = `${config.fontWeight} ${fontSize}px ${config.fontFamily}`;
  measureCtx.textAlign = 'left';
  measureCtx.textBaseline = 'alphabetic';

  const layout = getTextLayout(measureCtx, text, config.letterSpacing, fontSize);
  const padding = totalStrokeExtent + SAFE_CANVAS_PADDING;

  return {
    layout,
    fontSize,
    padding,
  };
};

const createLineRenderable = (
  measurement: LineMeasurement,
  size: number,
  config: EmojiConfig,
  widthFitScale: number,
): LineRenderable | null => {
  const scaleX = widthFitScale * (config.condense / 100);
  const finalWidth = Math.max(1, measurement.layout.widthWithSpacing * scaleX);
  const height = measurement.layout.ascent + measurement.layout.descent + measurement.padding * 2;
  const mask = createCanvas(finalWidth + measurement.padding * 2, height);
  const maskCtx = mask.getContext('2d');

  if (!maskCtx) return null;

  maskCtx.font = `${config.fontWeight} ${measurement.fontSize}px ${config.fontFamily}`;
  maskCtx.textAlign = 'left';
  maskCtx.textBaseline = 'alphabetic';
  maskCtx.fillStyle = '#FFFFFF';
  maskCtx.translate(measurement.padding, measurement.padding + measurement.layout.ascent);
  maskCtx.scale(scaleX, 1);
  drawTextLayout(maskCtx, measurement.layout, config.letterSpacing);

  return {
    mask,
    x: getAlignedX(size, config.textAlign, finalWidth, measurement.padding),
    y: 0,
    width: mask.width,
    height: mask.height,
    padding: measurement.padding,
    contentHeight: measurement.layout.ascent + measurement.layout.descent,
  };
};

const getLineGap = (size: number, config: EmojiConfig) => {
  const desiredGap = size * 0.082 + config.spacing * (size / 700);
  const minGap = 0;
  return clamp(desiredGap, minGap, size * 0.22);
};

const positionLineRenderables = (
  size: number,
  renderables: LineRenderable[],
  lineGap: number,
) => {
  if (renderables.length === 0) return [];

  const first = renderables[0];
  const last = renderables[renderables.length - 1];
  const totalHeight = first.padding
    + renderables.reduce((sum, renderable) => sum + renderable.contentHeight, 0)
    + Math.max(renderables.length - 1, 0) * lineGap
    + last.padding;
  let cursorY = size / 2 - totalHeight / 2;

  return renderables.map((renderable) => {
    const positioned = {
      ...renderable,
      y: cursorY,
    };

    cursorY += renderable.contentHeight + lineGap;
    return positioned;
  });
};

export const waitForFonts = async () => {
  if ('fonts' in document) {
    await document.fonts.ready;
  }
};

export const renderEmojiToCanvas = (
  ctx: CanvasRenderingContext2D,
  size: number,
  config: EmojiConfig,
) => {
  ctx.clearRect(0, 0, size, size);

  const innerThickness = config.stroke1Enabled ? getBandThickness(config.stroke1Width, size) : 0;
  const outerThickness = config.stroke2Enabled ? getBandThickness(config.stroke2Width, size) : 0;
  const totalStrokeExtent = innerThickness + outerThickness;
  const targetWidth = getTargetLineWidth(size, totalStrokeExtent);
  const lineGap = getLineGap(size, config);
  const measurements = [
    createLineMeasurement(config.textTop, 'top', size, config, totalStrokeExtent),
    createLineMeasurement(config.textBottom, 'bottom', size, config, totalStrokeExtent),
  ].filter(Boolean) as LineMeasurement[];
  const widthFitScales = getWidthFitScales(
    config,
    measurements.map((measurement) => measurement.layout.widthWithSpacing),
    targetWidth,
  );

  const renderables = positionLineRenderables(
    size,
    measurements.map((measurement, index) => createLineRenderable(measurement, size, config, widthFitScales[index])).filter(Boolean) as LineRenderable[],
    lineGap,
  );

  const outerLayers: LayerRenderable[] = [];
  const innerLayers: LayerRenderable[] = [];
  const fillLayers: LayerRenderable[] = [];

  renderables.forEach((renderable) => {
    const innerBoundary = innerThickness > 0 ? dilateMask(renderable.mask, innerThickness) : null;
    const outerBase = innerBoundary ?? renderable.mask;
    const outerBoundary = outerThickness > 0 ? dilateMask(outerBase, outerThickness) : null;

    if (outerBoundary) {
      outerLayers.push({
        image: colorizeMask(outerBoundary, config.stroke2Color, outerBase),
        x: renderable.x,
        y: renderable.y,
      });
    }

    if (innerBoundary) {
      innerLayers.push({
        image: colorizeMask(innerBoundary, config.stroke1Color, renderable.mask),
        x: renderable.x,
        y: renderable.y,
      });
    }

    fillLayers.push({
      image: colorizeMask(renderable.mask, config.mainColor),
      x: renderable.x,
      y: renderable.y,
    });
  });

  outerLayers.forEach((layer) => {
    ctx.drawImage(layer.image, layer.x, layer.y);
  });

  innerLayers.forEach((layer) => {
    ctx.drawImage(layer.image, layer.x, layer.y);
  });

  fillLayers.forEach((layer) => {
    ctx.drawImage(layer.image, layer.x, layer.y);
  });
};

export const trimTransparentBounds = (sourceCanvas: HTMLCanvasElement) => {
  const bounds = getOpaqueBounds(sourceCanvas);
  if (!bounds) {
    return sourceCanvas;
  }

  const croppedCanvas = createCanvas(bounds.width, bounds.height);

  const croppedCtx = croppedCanvas.getContext('2d');
  if (!croppedCtx) return sourceCanvas;

  croppedCtx.drawImage(
    sourceCanvas,
    bounds.minX,
    bounds.minY,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height,
  );

  return croppedCanvas;
};

export const createSquareTrimmedCanvas = (sourceCanvas: HTMLCanvasElement) => {
  const bounds = getOpaqueBounds(sourceCanvas);
  if (!bounds) return sourceCanvas;

  const side = Math.max(bounds.width, bounds.height);
  const squareCanvas = document.createElement('canvas');
  squareCanvas.width = side;
  squareCanvas.height = side;

  const squareCtx = squareCanvas.getContext('2d');
  if (!squareCtx) return sourceCanvas;

  const offsetX = (side - bounds.width) / 2;
  const offsetY = (side - bounds.height) / 2;

  squareCtx.drawImage(
    sourceCanvas,
    bounds.minX,
    bounds.minY,
    bounds.width,
    bounds.height,
    offsetX,
    offsetY,
    bounds.width,
    bounds.height,
  );

  return squareCanvas;
};

export const getOpaqueBounds = (sourceCanvas: HTMLCanvasElement): OpaqueBounds | null => {
  const ctx = sourceCanvas.getContext('2d');
  if (!ctx) return null;

  const { width, height } = sourceCanvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha === 0) continue;

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
};

export const getRenderedEmojiAssets = async (
  size: number,
  config: EmojiConfig,
): Promise<RenderedEmojiAssets> => {
  const cacheKey = getRenderCacheKey(size, config);
  const cached = renderAssetCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const renderPromise = (async () => {
    await waitForFonts();

    const baseCanvas = createCanvas(size, size);
    const baseCtx = baseCanvas.getContext('2d');
    if (!baseCtx) {
      throw new Error('Could not create emoji render context');
    }

    renderEmojiToCanvas(baseCtx, size, config);
    const bounds = getOpaqueBounds(baseCanvas);

    return {
      baseCanvas,
      trimmedCanvas: cloneCanvas(trimTransparentBounds(baseCanvas)),
      squareCanvas: cloneCanvas(createSquareTrimmedCanvas(baseCanvas)),
      bounds,
    };
  })();

  renderAssetCache.set(cacheKey, renderPromise);
  trimCacheIfNeeded();

  try {
    return await renderPromise;
  } catch (error) {
    renderAssetCache.delete(cacheKey);
    throw error;
  }
};
