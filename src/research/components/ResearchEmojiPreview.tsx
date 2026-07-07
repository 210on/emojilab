import React, { useEffect, useState } from 'react';
import { EmojiConfig } from '../../../types';
import { getRenderedEmojiAssets } from '../../../utils/emojiCanvas';

interface ResearchEmojiPreviewProps {
  config: EmojiConfig;
  size?: number;
  background?: 'light' | 'dark' | 'chat-light' | 'chat-dark';
}

const backgroundClass = {
  light: 'bg-white',
  dark: 'bg-neutral-950',
  'chat-light': 'bg-[#f8f8f8]',
  'chat-dark': 'bg-[#1d1c1d]',
};

const ResearchEmojiPreview: React.FC<ResearchEmojiPreviewProps> = ({
  config,
  size = 96,
  background = 'chat-light',
}) => {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;

    getRenderedEmojiAssets(320, config).then((assets) => {
      if (!cancelled) {
        setSrc(assets.squareCanvas.toDataURL('image/png'));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [config]);

  return (
    <div className={`flex items-center justify-center rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800 ${backgroundClass[background]}`}>
      {src ? (
        <img
          src={src}
          alt=""
          style={{ width: size, height: size }}
          className="object-contain"
        />
      ) : (
        <div style={{ width: size, height: size }} className="animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
      )}
    </div>
  );
};

export default ResearchEmojiPreview;
