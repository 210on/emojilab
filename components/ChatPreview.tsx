import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EmojiConfig, Language } from '../types';
import { getRenderedEmojiAssets } from '../utils/emojiCanvas';

interface ChatPreviewProps {
  config: EmojiConfig;
  lang: Language;
  surfaceCandidates: string[];
}

type ChatPlatform = 'slack' | 'discord';

const slackAvatarColors = ['#4A154B', '#36C5F0'];
const discordAvatarColors = ['#5865F2', '#404EED'];
const slackFontFamily = 'NotoSansJP, Slack-Lato, Slack-Fractions, appleLogo, sans-serif';
const discordFontFamily = '"gg sans", "Hiragino Sans", "ヒラギノ角ゴ ProN W3", "Hiragino Kaku Gothic ProN", メイリオ, Meiryo, Osaka, "MS PGothic", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif';

const getSurfaceLuminance = (hex: string) => {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const getPlatformCopy = (platform: ChatPlatform, lang: Language) => {
  if (platform === 'slack') {
    return {
      userLabel: lang === 'jp' ? 'えもじくん' : 'emoji-kun',
      bodyText: lang === 'jp' ? '新しい絵文字を追加しました。' : 'Added a new custom emoji.',
    };
  }

  return {
    userLabel: 'emoji-bot',
    bodyText: lang === 'jp' ? '新しいカスタム絵文字を追加しました。' : 'A new custom emoji has been added.',
  };
};

const ChatPreview: React.FC<ChatPreviewProps> = ({ config, lang, surfaceCandidates }) => {
  const [platform, setPlatform] = useState<ChatPlatform>('slack');
  const [surfaceIndex, setSurfaceIndex] = useState(0);
  const [isReactionSelected, setIsReactionSelected] = useState(false);
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
  const avatarGradient = platform === 'slack' ? slackAvatarColors : discordAvatarColors;
  const { userLabel, bodyText } = getPlatformCopy(platform, lang);

  const skin = useMemo(() => {
    const slackDark = {
      headerBg: 'rgba(29, 28, 29, 0.96)',
      text: 'text-[#F8F8F8]',
      body: 'text-[#F8F8F8]',
      subText: 'text-[#ABABAD]',
      border: 'border-white/10',
      messageHover: 'hover:bg-white/[0.05]',
      reaction: 'border-transparent bg-white/[0.06] text-[#F8F8F8] hover:bg-transparent hover:shadow-[0_0_0_1px_#7C7A7F]',
      reactionActive: 'border-transparent bg-[#004D76] text-[#F8F8F8] shadow-none hover:bg-[#004D76]',
      addReaction: 'border-transparent bg-white/[0.06] text-[#F8F8F8] hover:bg-transparent hover:shadow-[0_0_0_1px_#7C7A7F]',
      platformButton: 'border-white/10 bg-white/5 text-[#F8F8F8] hover:bg-white/10',
      platformActive: 'bg-[#F8F8F8] text-[#1D1C1D] shadow-sm',
      platformInactive: 'text-[#ABABAD] hover:text-[#F8F8F8]',
      surfaceArrow: 'bg-transparent text-white hover:bg-[#1D1C1D]/85 active:bg-[#1D1C1D] focus-visible:bg-[#1D1C1D]/85',
    };

    const slackLight = {
      headerBg: 'rgba(255, 255, 255, 0.96)',
      text: 'text-[#1D1C1D]',
      body: 'text-[#1D1C1D]',
      subText: 'text-[#616061]',
      border: 'border-[#DDDDDD]',
      messageHover: 'hover:bg-[#F8F8F8]',
      reaction: 'border-transparent bg-[#1D1C1D0F] text-[#1D1C1D] hover:bg-transparent hover:shadow-[0_0_0_1px_#7C7A7F]',
      reactionActive: 'border-transparent bg-[#E3F8FF] text-[#1264A3] shadow-[0_0_0_1px_#1264A3] hover:bg-[#E3F8FF]',
      addReaction: 'border-transparent bg-[#1D1C1D0F] text-[#1D1C1D] hover:bg-transparent hover:shadow-[0_0_0_1px_#7C7A7F]',
      platformButton: 'border-[#DDDDDD] bg-white text-[#616061] hover:text-[#1D1C1D]',
      platformActive: 'bg-[#1D1C1D] text-white shadow-sm',
      platformInactive: 'text-[#616061] hover:text-[#1D1C1D]',
      surfaceArrow: 'bg-transparent text-[#1D1C1D] hover:bg-white/95 active:bg-white focus-visible:bg-white/95',
    };

    const discordDark = {
      headerBg: 'rgba(49, 51, 56, 0.96)',
      text: 'text-[#B5BAC1]',
      body: 'text-[#DBDEE1]',
      subText: 'text-[#949BA4]',
      border: 'border-[#3F4147]',
      messageHover: 'hover:bg-[#2E3035]',
      reaction: 'border-transparent bg-[#2B2D31] text-[#DBDEE1] hover:bg-[#313338]',
      reactionActive: 'border-[#5865F2] bg-[#3B428A] text-[#F2F3F5] hover:bg-[#454C98]',
      addReaction: 'border-transparent bg-[#2B2D31] text-[#B5BAC1] hover:bg-[#313338] hover:text-[#F2F3F5]',
      platformButton: 'border-[#3F4147] bg-[#2B2D31] text-[#DBDEE1] hover:bg-[#383A40]',
      platformActive: 'bg-[#5865F2] text-white shadow-sm',
      platformInactive: 'text-[#B5BAC1] hover:text-[#F2F3F5]',
      surfaceArrow: 'bg-transparent text-white hover:bg-[#1E1F22]/90 active:bg-[#1E1F22] focus-visible:bg-[#1E1F22]/90',
    };

    const discordLight = {
      headerBg: 'rgba(255, 255, 255, 0.96)',
      text: 'text-[#060607]',
      body: 'text-[#313338]',
      subText: 'text-[#5C5E66]',
      border: 'border-[#E3E5E8]',
      messageHover: 'hover:bg-[#F2F3F5]',
      reaction: 'border-transparent bg-[#F2F3F5] text-[#313338] hover:bg-[#E3E5E8]',
      reactionActive: 'border-[#5865F2] bg-[#E0E3FF] text-[#5865F2] hover:bg-[#D6DAFF]',
      addReaction: 'border-transparent bg-[#F2F3F5] text-[#5C5E66] hover:bg-[#E3E5E8] hover:text-[#313338]',
      platformButton: 'border-[#E3E5E8] bg-[#F2F3F5] text-[#4E5058] hover:bg-[#E3E5E8]',
      platformActive: 'bg-[#5865F2] text-white shadow-sm',
      platformInactive: 'text-[#4E5058] hover:text-[#060607]',
      surfaceArrow: 'bg-transparent text-[#313338] hover:bg-white/95 active:bg-white focus-visible:bg-white/95',
    };

    if (platform === 'slack') {
      return isDarkSurface ? slackDark : slackLight;
    }

    return isDarkSurface ? discordDark : discordLight;
  }, [isDarkSurface, platform]);

  const avatarClass = platform === 'slack'
    ? 'mt-[3px] h-9 w-9 rounded-lg text-[11px]'
    : 'mt-0.5 h-8 w-8 rounded-full text-[10px]';
  const messagePadding = platform === 'slack' ? 'px-2 py-1.5' : 'px-2 py-2';
  const messageGap = platform === 'slack' ? 'gap-3' : 'gap-3';
  const nameClass = platform === 'slack'
    ? 'text-[15px] font-black tracking-[-0.01em]'
    : 'text-base font-normal leading-[22px] tracking-normal';
  const bodyClass = platform === 'slack'
    ? 'mt-0.5 text-[15px] leading-[22px]'
    : 'mt-[1px] text-base font-normal leading-[22px]';
  const timeClass = platform === 'slack'
    ? 'text-xs font-normal leading-[17.6px]'
    : 'text-[11px] font-medium';
  const reactionClass = platform === 'slack'
    ? 'h-6 rounded-full border px-2 text-xs font-bold leading-none active:scale-[0.94]'
    : 'h-8 rounded-lg border px-2 text-xs font-semibold leading-none';
  const addReactionClass = platform === 'slack'
    ? 'h-6 rounded-full border px-2 active:scale-[0.94]'
    : 'h-8 rounded-lg border px-2';
  const reactionEmojiClass = platform === 'slack'
    ? 'h-4 w-4'
    : 'h-5 w-5';
  const inlineEmojiClass = platform === 'slack'
    ? 'mx-0.5 inline-block h-4 w-4 align-[-0.18em] object-contain'
    : 'mx-0.5 inline-block h-[22px] w-[22px] align-[-0.22em] object-contain';
  const standaloneEmojiClass = platform === 'slack'
    ? 'h-8 w-8 object-contain'
    : 'h-12 w-12 object-contain';
  const hasMultipleSurfaces = surfaceCandidates.length > 1;
  const platformFontFamily = platform === 'slack' ? slackFontFamily : discordFontFamily;
  const previewHeaderFontFamily = 'Slack-Lato, "gg sans", "Helvetica Neue", Arial, sans-serif';

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

  const EmojiCanvas = ({ className }: { className: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const size = 512;

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let isCancelled = false;

      const draw = async () => {
        const assets = await getRenderedEmojiAssets(size, config);
        if (isCancelled) return;
        ctx.clearRect(0, 0, size, size);

        const inset = 8;
        const drawSide = size - inset * 2;
        ctx.drawImage(assets.squareCanvas, inset, inset, drawSide, drawSide);
      };

      draw();

      return () => {
        isCancelled = true;
      };
    }, [config]);

    return (
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className={className}
        style={{ imageRendering: 'auto' }}
      />
    );
  };

  return (
    <div
      className={`relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.5rem] border p-0 shadow-sm transition-colors ${skin.border}`}
      style={{ backgroundColor: currentSurface, fontFamily: platformFontFamily, touchAction: 'pan-y' }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        swipeStartX.current = null;
      }}
    >
      <div
        className={`flex h-[42px] shrink-0 items-center justify-between border-b px-4 ${skin.border}`}
        style={{ backgroundColor: skin.headerBg }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2" style={{ fontFamily: previewHeaderFontFamily }}>
            <span className={`text-[15px] font-bold leading-5 tracking-[-0.01em] ${skin.text}`}># emoji-preview</span>
            <div
              className={`grid grid-cols-2 rounded-full border p-0.5 text-[11px] font-bold leading-4 tracking-[-0.01em] transition ${skin.platformButton}`}
              role="group"
              aria-label="Preview platform"
            >
              {(['slack', 'discord'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPlatform(item)}
                  className={`rounded-full px-2.5 py-0.5 transition ${
                    platform === item ? skin.platformActive : skin.platformInactive
                  }`}
                  aria-pressed={platform === item}
                >
                  {item === 'slack' ? 'Slack' : 'Discord'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={platform === 'slack' ? 'flex-1 px-3 py-3.5' : 'flex-1 px-3 py-3'}>
        <div className={`rounded-lg transition ${messagePadding} ${skin.messageHover}`}>
          <div className={`flex items-start ${messageGap}`}>
            <div
              className={`flex shrink-0 items-center justify-center font-black text-white shadow-sm ${avatarClass}`}
              style={{ background: `linear-gradient(135deg, ${avatarGradient[0]}, ${avatarGradient[1]})` }}
            >
              {platform === 'slack' ? 'EK' : 'EM'}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className={`${nameClass} ${skin.text}`}>
                  {userLabel}
                </span>
                <span className={`${timeClass} ${skin.subText}`}>{timeLabel}</span>
              </div>

              <p className={`${bodyClass} ${skin.body}`}>
                {bodyText}
                <EmojiCanvas className={inlineEmojiClass} />
              </p>

              <div className={platform === 'slack' ? 'mt-2 flex flex-wrap items-center gap-1.5' : 'mt-2.5 flex flex-wrap items-center gap-1.5'}>
                <button
                  type="button"
                  onClick={() => setIsReactionSelected((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 transition ${reactionClass} ${
                    isReactionSelected ? skin.reactionActive : skin.reaction
                  }`}
                  aria-pressed={isReactionSelected}
                >
                  <EmojiCanvas className={`${reactionEmojiClass} object-contain`} />
                  <span>{isReactionSelected ? 3 : 2}</span>
                </button>

                <button
                  className={`inline-flex items-center justify-center transition ${addReactionClass} ${skin.addReaction}`}
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                </button>
              </div>

              <div className={platform === 'slack' ? 'mt-3 flex items-center' : 'mt-3.5 flex items-center'}>
                <EmojiCanvas className={standaloneEmojiClass} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {hasMultipleSurfaces && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              cycleSurface(-1);
            }}
            className={`group absolute left-2 top-1/2 z-10 flex h-1/3 min-h-[4.5rem] w-8 -translate-y-1/2 items-center justify-center rounded-full opacity-70 transition hover:opacity-100 active:opacity-100 ${skin.surfaceArrow}`}
            aria-label="Previous preview background"
          >
            <span className="block scale-y-[3] text-4xl font-light leading-none transition group-hover:font-black group-active:font-black">
              ‹
            </span>
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              cycleSurface(1);
            }}
            className={`group absolute right-2 top-1/2 z-10 flex h-1/3 min-h-[4.5rem] w-8 -translate-y-1/2 items-center justify-center rounded-full opacity-70 transition hover:opacity-100 active:opacity-100 ${skin.surfaceArrow}`}
            aria-label="Next preview background"
          >
            <span className="block scale-y-[3] text-4xl font-light leading-none transition group-hover:font-black group-active:font-black">
              ›
            </span>
          </button>
        </>
      )}
    </div>
  );
};

export default React.memo(ChatPreview);
