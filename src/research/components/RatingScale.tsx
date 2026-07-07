import React from 'react';
import { Likert7 } from '../types';

interface RatingScaleProps {
  label: string;
  value: Likert7 | null;
  lowLabel: string;
  highLabel: string;
  onChange: (value: Likert7) => void;
}

const values: Likert7[] = [1, 2, 3, 4, 5, 6, 7];

const RatingScale: React.FC<RatingScaleProps> = ({ label, value, lowLabel, highLabel, onChange }) => (
  <fieldset className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800">
    <legend className="text-sm font-black text-neutral-900 dark:text-white">{label}</legend>
    <div className="mt-3 grid grid-cols-7 gap-2">
      {values.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`rounded-xl border px-0 py-2 text-sm font-black ${
            value === item
              ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
              : 'border-neutral-200 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200'
          }`}
        >
          {item}
        </button>
      ))}
    </div>
    <div className="mt-2 flex justify-between text-xs font-bold text-neutral-500">
      <span>{lowLabel}</span>
      <span>どちらともいえない</span>
      <span>{highLabel}</span>
    </div>
  </fieldset>
);

export default RatingScale;
