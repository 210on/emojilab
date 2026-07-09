interface GoogleFontDefinition {
  family: string;
  cssFamily: string;
  weights: number[];
  critical?: boolean;
}

const FONT_LOAD_SAMPLE = '確認ありがとうEmojiLab.漢字かなカナ123!?';

const GOOGLE_EMOJI_FONTS: GoogleFontDefinition[] = [
  {
    family: 'Noto Sans JP',
    cssFamily: 'Noto+Sans+JP:wght@400;700;900',
    weights: [400, 700, 900],
    critical: true,
  },
  {
    family: 'M PLUS Rounded 1c',
    cssFamily: 'M+PLUS+Rounded+1c:wght@400;700;900',
    weights: [400, 700, 900],
  },
  {
    family: 'Shippori Mincho',
    cssFamily: 'Shippori+Mincho:wght@400;700',
    weights: [400, 700],
  },
  {
    family: 'Kaisei Tokumin',
    cssFamily: 'Kaisei+Tokumin:wght@400;700',
    weights: [400, 700],
  },
  {
    family: 'Dela Gothic One',
    cssFamily: 'Dela+Gothic+One',
    weights: [400],
  },
];

const cssLoadPromises = new Map<string, Promise<void>>();
const fontLoadPromises = new Map<string, Promise<void>>();
let deferredPreloadPromise: Promise<void> | null = null;

const buildGoogleFontsUrl = (definitions: GoogleFontDefinition[]) => {
  const families = definitions.map((definition) => `family=${definition.cssFamily}`).join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
};

const loadStylesheet = (id: string, href: string) => {
  if (typeof document === 'undefined') {
    return Promise.resolve();
  }

  const existing = (
    document.getElementById(id) ??
    Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
      .find((link) => link.href === href)
  ) as HTMLLinkElement | null;
  if (existing) {
    if (!existing.id) {
      existing.id = id;
    }

    if (existing.sheet) {
      return Promise.resolve();
    }

    const existingPromise = cssLoadPromises.get(id);
    if (existingPromise) {
      return existingPromise;
    }

    const promise = new Promise<void>((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => {
        cssLoadPromises.delete(id);
        reject(new Error(`Failed to load stylesheet: ${href}`));
      }, { once: true });
    });

    cssLoadPromises.set(id, promise);
    return promise;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => {
      cssLoadPromises.delete(id);
      reject(new Error(`Failed to load stylesheet: ${href}`));
    };
    document.head.appendChild(link);
  });

  cssLoadPromises.set(id, promise);
  return promise;
};

const loadGoogleFontCss = (definition: GoogleFontDefinition) => {
  const id = `google-font-${definition.family.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return loadStylesheet(id, buildGoogleFontsUrl([definition]));
};

const getNearestWeight = (weights: number[], requestedWeight: number) =>
  weights.reduce((closest, current) => (
    Math.abs(current - requestedWeight) < Math.abs(closest - requestedWeight) ? current : closest
  ));

export const findGoogleEmojiFont = (fontFamilyValue: string) =>
  GOOGLE_EMOJI_FONTS.find((definition) => fontFamilyValue.includes(definition.family));

export const ensureEmojiGoogleFontLoaded = async (fontFamilyValue: string, requestedWeight: number) => {
  if (typeof document === 'undefined' || !('fonts' in document)) {
    return;
  }

  const definition = findGoogleEmojiFont(fontFamilyValue);
  if (!definition) {
    return;
  }

  const weight = getNearestWeight(definition.weights, requestedWeight);
  const key = `${definition.family}:${weight}`;
  const existing = fontLoadPromises.get(key);
  if (existing) {
    await existing;
    return;
  }

  const promise = (async () => {
    await loadGoogleFontCss(definition);
    await document.fonts.load(`${weight} 64px '${definition.family}'`, FONT_LOAD_SAMPLE);
  })().catch((error) => {
    fontLoadPromises.delete(key);
    throw error;
  });

  fontLoadPromises.set(key, promise);
  await promise;
};

export const ensureEmojiGoogleFontFamilyLoaded = async (fontFamilyValue: string) => {
  const definition = findGoogleEmojiFont(fontFamilyValue);
  if (!definition) {
    return;
  }

  for (const weight of definition.weights) {
    await ensureEmojiGoogleFontLoaded(definition.family, weight);
  }
};

export const preloadDeferredGoogleEmojiFonts = () => {
  if (deferredPreloadPromise || typeof window === 'undefined') {
    return deferredPreloadPromise ?? Promise.resolve();
  }

  const run = async () => {
    for (const definition of GOOGLE_EMOJI_FONTS.filter((font) => !font.critical)) {
      try {
        await loadGoogleFontCss(definition);
        await ensureEmojiGoogleFontFamilyLoaded(definition.family);
      } catch (error) {
        console.warn(`Failed to preload ${definition.family}:`, error);
      }
    }
  };

  deferredPreloadPromise = new Promise<void>((resolve) => {
    const start = () => {
      run().finally(resolve);
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(start, { timeout: 2500 });
    } else {
      globalThis.setTimeout(start, 1200);
    }
  });

  return deferredPreloadPromise;
};
