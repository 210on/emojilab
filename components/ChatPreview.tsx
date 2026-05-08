import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EmojiConfig, Language } from '../types';
import { renderEmojiToCanvas, trimTransparentBounds, waitForFonts } from '../utils/emojiCanvas';

interface ChatPreviewProps {
  config: EmojiConfig;
  lang: Language;
  surfaceCandidates: string[];
}

const slackAvatarColors = ['#611f69', '#1264a3'];
const discordAvatarColors = ['#5865F2', '#7983F5'];

const getSurfaceLuminance = (hex: string) => {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ChatPreview: React.FC<ChatPreviewProps> = ({ config, lang, surfaceCandidates }) => {
  const [platform, setPlatform] = useState<'slack' | 'discord'>('slack');
  const [surfaceIndex, setSurfaceIndex] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const swipeStartX = useRef<number | null>(null);

  const candidateKey = surfaceCandidates.join('|');

  useEffect(() => {
    setSurfaceIndex(0);
  }, [candidateKey]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  const timeLabel = useMemo(() => {
    return new Intl.DateTimeFormat(lang === 'jp' ? 'ja-JP' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(now);
  }, [lang, now]);

  const currentSurface = surfaceCandidates[surfaceIndex] ?? '#FFFFFF';
  const isDarkSurface = getSurfaceLuminance(currentSurface) < 0.46;
  const textColor = isDarkSurface ? 'text-[#f8f8f8]' : 'text-[#1d1c1d]';
  const bodyColor = isDarkSurface ? 'text-[#d7dbe1]' : 'text-[#1d1c1d]';
  const subTextColor = isDarkSurface ? 'text-slate-400' : 'text-slate-400';
  const borderColor = isDarkSurface ? 'border-white/10' : 'border-slate-200/90';
  const hoverColor = isDarkSurface ? 'hover:bg-white/[0.04]' : 'hover:bg-white/75';
  const platformLabel = platform === 'slack' ? 'Slack' : 'Discord';
  const avatarGradient = platform === 'slack' ? slackAvatarColors : discordAvatarColors;
  const userLabel = platform === 'slack'
    ? (lang === 'jp' ? 'えもじくん' : 'emoji-kun')
    : 'emoji-bot';
  const bodyText = platform === 'slack'
    ? (lang === 'jp' ? '新しい絵文字を追加しました。' : 'Added a new custom emoji.')
    : (lang === 'jp' ? '新しいカスタム絵文字を追加しました。' : 'A new custom emoji has been added.');

  const cycleSurface = (direction: 1 | -1) => {
    if (surfaceCandidates.length <= 1) return;
    setSurfaceIndex((prev) => (prev + direction + surfaceCandidates.length) % surfaceCandidates.length);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    swipeStartX.current = event.clientX;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (swipeStartX.current === null) return;

    const delta = event.clientX - swipeStartX.current;
    swipeStartX.current = null;

    if (delta >= 32) {
      cycleSurface(-1);
    } else if (delta <= -32) {
      cycleSurface(1);
    }
  };

  const ReactionEmojiCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const size = 256;

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const draw = async () => {
        await waitForFonts();
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = size;
        sourceCanvas.height = size;

        const sourceCtx = sourceCanvas.getContext('2d');
        if (!sourceCtx) return;

        renderEmojiToCanvas(sourceCtx, size, config);

        const trimmedCanvas = trimTransparentBounds(sourceCanvas);
        ctx.clearRect(0, 0, size, size);

        // Fill almost the whole reaction slot so the emoji reads larger,
        // while keeping the pill, count, and spacing unchanged.
        const inset = 8;
        ctx.drawImage(trimmedCanvas, inset, inset, size - inset * 2, size - inset * 2);
      };

      draw();
    }, [config]);

    return (
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="h-[22px] w-[22px] object-contain"
        style={{ imageRendering: 'auto' }}
      />
    );
  };

  return (
    <div
      className={`flex h-full min-h-0 flex-col rounded-[1.7rem] border p-0 shadow-[0_16px_36px_rgba(15,23,42,0.08)] transition-colors ${borderColor}`}
      style={{ backgroundColor: currentSurface, touchAction: 'pan-y' }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        swipeStartX.current = null;
      }}
    >
      <div className={`flex items-center justify-between border-b px-4 py-2.5 ${borderColor}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-black ${textColor}`}># emoji-preview</span>
            <button
              type="button"
              onClick={() => setPlatform((prev) => (prev === 'slack' ? 'discord' : 'slack'))}
              className={`rounded-full px-2 py-0.5 text-[10px] font-black shadow-sm transition ${
                isDarkSurface
                  ? 'bg-white/10 text-slate-200 hover:bg-white/16'
                  : 'bg-white text-slate-500 hover:text-slate-700'
              }`}
            >
              {platformLabel}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4">
        <div className={`rounded-xl px-2 py-2 transition ${hoverColor}`}>
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center text-xs font-black text-white shadow-sm ${
                platform === 'slack' ? 'rounded-lg' : 'rounded-full'
              }`}
              style={{ background: `linear-gradient(135deg, ${avatarGradient[0]}, ${avatarGradient[1]})` }}
            >
              {platform === 'slack' ? 'EK' : 'EM'}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className={`text-[15px] font-black tracking-tight ${textColor}`}>
                  {userLabel}
                </span>
                <span className={`text-[11px] font-semibold ${subTextColor}`}>{timeLabel}</span>
              </div>

              <p className={`mt-0.5 text-[15px] leading-6 ${bodyColor}`}>
                {bodyText}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <button
                  className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-black transition ${
                    platform === 'slack'
                      ? isDarkSurface
                        ? 'border-[#365072] bg-[#213044] text-[#8bc2ff]'
                        : 'border-[#87b4f9] bg-[#e8f2ff] text-[#1264a3]'
                      : isDarkSurface
                        ? 'border-[#6772f8]/35 bg-[#5865f2]/16 text-[#c6cbff]'
                        : 'border-[#6772f8]/25 bg-[#5865f2]/10 text-[#4955d6]'
                  }`}
                >
                  <ReactionEmojiCanvas />
                  <span>2</span>
                </button>

                <button
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black transition ${
                    isDarkSurface
                      ? 'border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'
                      : 'border-slate-200 bg-white text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPreview;
