import React, { useEffect, useMemo, useRef } from 'react';
import { Language, SavedEmoji } from '../types';
import { locales } from '../locales';
import { getRenderedEmojiAssets } from '../utils/emojiCanvas';

interface SavedStylesPanelProps {
  isOpen: boolean;
  items: SavedEmoji[];
  lang: Language;
  onClose: () => void;
  onSaveCurrent: () => void;
  onSelect: (saved: SavedEmoji) => void;
}

const SavedStyleThumbnail: React.FC<{ saved: SavedEmoji }> = ({ saved }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isCancelled = false;

    const draw = async () => {
      const assets = await getRenderedEmojiAssets(240, saved);
      if (isCancelled) return;
      ctx.clearRect(0, 0, 240, 240);
      ctx.drawImage(assets.baseCanvas, 0, 0);
    };

    draw();

    return () => {
      isCancelled = true;
    };
  }, [saved]);

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-[#171717]">
      <canvas ref={canvasRef} width={240} height={240} className="h-14 w-14 object-contain" />
    </div>
  );
};

const SavedStylesPanel: React.FC<SavedStylesPanelProps> = ({
  isOpen,
  items,
  lang,
  onClose,
  onSaveCurrent,
  onSelect,
}) => {
  const t = locales[lang];
  const desktopPanelRef = useRef<HTMLDivElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        desktopPanelRef.current?.contains(target) ||
        mobilePanelRef.current?.contains(target)
      ) {
        return;
      }

      onClose();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(lang === 'jp' ? 'ja-JP' : 'en-US', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [lang],
  );

  if (!isOpen) {
    return null;
  }

  const renderItems = (dense = false) => (
    <div className={`space-y-2 ${dense ? '' : 'max-h-[22rem] overflow-y-auto pr-1'}`}>
      {items.length === 0 ? (
        <div className="rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm font-bold text-slate-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-500">
          {t.noHistory}
        </div>
      ) : (
        items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onSelect(item);
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-3 py-3 text-left transition hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-[#141414] dark:hover:bg-[#1b1b1b]"
          >
            <SavedStyleThumbnail saved={item} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-black text-slate-900 dark:text-white">
                {item.name || `${item.textTop}${item.textBottom}`}
              </div>
              <div className="mt-1 truncate text-xs font-semibold text-slate-400 dark:text-slate-500">
                {formatter.format(new Date(item.createdAt))}
              </div>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black text-slate-600 shadow-sm dark:border-slate-700 dark:bg-[#171717] dark:text-slate-300">
              {t.restore}
            </span>
          </button>
        ))
      )}
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-slate-950/36 lg:hidden" onClick={onClose} />

      <div
        ref={desktopPanelRef}
        className="surface-popover fixed top-[5.25rem] z-[70] hidden w-[23rem] rounded-[1.6rem] border border-slate-200/80 p-4 shadow-lg dark:border-slate-700 lg:block"
        style={{ right: 'max(1.5rem, calc((100vw - 72rem) / 2 + 1.5rem))' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 dark:text-white">{t.styleHistory}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
              {t.savedStylesDescription}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-[#171717] dark:text-slate-500 dark:hover:border-slate-600 dark:hover:text-slate-200"
            aria-label="Close saved styles"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onSaveCurrent}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-[#171717] dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white"
        >
          <span className="material-symbols-outlined text-[18px]">bookmark_add</span>
          {t.saveCurrent}
        </button>

        <div className="mt-4">{renderItems()}</div>
      </div>

      <div className="fixed inset-x-3 bottom-3 z-[70] lg:hidden" ref={mobilePanelRef}>
        <div className="surface-popover rounded-[1.8rem] border border-slate-200/80 p-4 shadow-lg dark:border-slate-700">
          <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-300/80 dark:bg-slate-700/80" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-black text-slate-900 dark:text-white">{t.styleHistory}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
                {t.savedStylesDescription}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-[#171717] dark:text-slate-500 dark:hover:border-slate-600 dark:hover:text-slate-200"
              aria-label="Close saved styles"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onSaveCurrent}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-black text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-[#171717] dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white"
          >
            <span className="material-symbols-outlined text-[18px]">bookmark_add</span>
            {t.saveCurrent}
          </button>

          <div className="mt-4 max-h-[52vh] overflow-y-auto pr-1">{renderItems(true)}</div>
        </div>
      </div>
    </>
  );
};

export default React.memo(SavedStylesPanel);
