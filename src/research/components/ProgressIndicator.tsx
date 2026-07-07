import React from 'react';

interface ProgressIndicatorProps {
  current: number;
  total: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ current, total }) => {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="rounded-2xl bg-neutral-100 p-3 dark:bg-neutral-800">
      <div className="flex justify-between text-xs font-black text-neutral-500">
        <span>Progress</span>
        <span>{current} / {total}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700">
        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

export default ProgressIndicator;
