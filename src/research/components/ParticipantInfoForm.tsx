import React, { useState } from 'react';
import { ParticipantProfile } from '../types';

interface ParticipantInfoFormProps {
  participantId: string;
  onSubmit: (profile: ParticipantProfile) => void;
}

const fieldClass = 'rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-bold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white';

const ParticipantInfoForm: React.FC<ParticipantInfoFormProps> = ({ participantId, onSubmit }) => {
  const [profile, setProfile] = useState<ParticipantProfile>({
    participantId,
    ageRange: '20-24',
    japaneseUsage: 'native',
    customEmojiExperience: 'used',
    slackExperience: 'user',
    discordExperience: 'user',
    designExperience: 'beginner',
  });

  const update = <K extends keyof ParticipantProfile>(key: K, value: ParticipantProfile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <form
      className="mx-auto max-w-3xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(profile);
      }}
    >
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">Participant</p>
      <h1 className="mt-2 text-2xl font-black text-neutral-950 dark:text-white">参加者属性</h1>
      <p className="mt-2 text-sm text-neutral-500">参加者ID: {participantId}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-200">
          年齢
          <select className={fieldClass} value={profile.ageRange} onChange={(event) => update('ageRange', event.target.value as ParticipantProfile['ageRange'])}>
            <option value="18-19">18-19</option>
            <option value="20-24">20-24</option>
            <option value="25-29">25-29</option>
            <option value="30-39">30-39</option>
            <option value="40-49">40-49</option>
            <option value="50+">50+</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-200">
          日本語利用
          <select className={fieldClass} value={profile.japaneseUsage} onChange={(event) => update('japaneseUsage', event.target.value as ParticipantProfile['japaneseUsage'])}>
            <option value="native">母語・同等</option>
            <option value="daily">日常的に使う</option>
            <option value="limited">限定的に使う</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-200">
          カスタム絵文字経験
          <select className={fieldClass} value={profile.customEmojiExperience} onChange={(event) => update('customEmojiExperience', event.target.value as ParticipantProfile['customEmojiExperience'])}>
            <option value="none">知らない</option>
            <option value="viewed">見たことがある</option>
            <option value="used">使ったことがある</option>
            <option value="created">作ったことがある</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-200">
          デザイン経験
          <select className={fieldClass} value={profile.designExperience} onChange={(event) => update('designExperience', event.target.value as ParticipantProfile['designExperience'])}>
            <option value="none">なし</option>
            <option value="beginner">初級</option>
            <option value="intermediate">中級</option>
            <option value="advanced">上級</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-200">
          Slack経験
          <select className={fieldClass} value={profile.slackExperience} onChange={(event) => update('slackExperience', event.target.value as ParticipantProfile['slackExperience'])}>
            <option value="none">なし</option>
            <option value="viewer">閲覧中心</option>
            <option value="user">利用経験あり</option>
            <option value="admin_or_creator">管理・作成経験あり</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-neutral-700 dark:text-neutral-200">
          Discord経験
          <select className={fieldClass} value={profile.discordExperience} onChange={(event) => update('discordExperience', event.target.value as ParticipantProfile['discordExperience'])}>
            <option value="none">なし</option>
            <option value="viewer">閲覧中心</option>
            <option value="user">利用経験あり</option>
            <option value="admin_or_creator">管理・作成経験あり</option>
          </select>
        </label>
      </div>

      <button type="submit" className="mt-6 rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-black text-white">
        次へ
      </button>
    </form>
  );
};

export default ParticipantInfoForm;
