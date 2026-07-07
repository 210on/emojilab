import React, { useState } from 'react';

interface ConsentScreenProps {
  onAccept: () => void;
}

const ConsentScreen: React.FC<ConsentScreenProps> = ({ onAccept }) => {
  const [checked, setChecked] = useState(false);

  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">Consent</p>
      <h1 className="mt-2 text-2xl font-black text-neutral-950 dark:text-white">研究参加への同意</h1>
      <div className="mt-5 space-y-3 text-sm leading-7 text-neutral-700 dark:text-neutral-300">
        <p>この実験では、日本語カスタム絵文字の見え方や意味の分かりやすさに関する回答を収集します。</p>
        <p>収集する情報は、匿名の参加者ID、回答内容、回答時間、ブラウザと画面サイズの情報です。氏名、メールアドレス、学籍番号、SNSアカウントは収集しません。</p>
        <p>参加は任意であり、途中で中止できます。途中までのデータはブラウザ内に一時保存され、終了時にJSON / CSVとしてダウンロードできます。</p>
      </div>

      <label className="mt-6 flex items-start gap-3 rounded-2xl bg-neutral-50 p-4 text-sm font-bold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          className="mt-1 h-5 w-5 rounded border-neutral-300 text-[var(--accent)] focus:ring-[var(--accent)]"
        />
        上記の内容を理解し、匿名データの研究利用に同意します。
      </label>

      <button
        type="button"
        disabled={!checked}
        onClick={onAccept}
        className="mt-6 rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        実験を開始
      </button>
    </section>
  );
};

export default ConsentScreen;
