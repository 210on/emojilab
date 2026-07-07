import React, { useMemo, useState } from 'react';
import ResearchLayout from './ResearchLayout';
import { clearResearchStore, loadResearchStore } from '../storage/researchStorage';
import { downloadTextFile } from '../storage/downloadFile';
import { toPrettyJson } from '../storage/jsonExport';
import { toCsv } from '../storage/csvExport';
import { exportStudy1ResponsesCsv } from '../study1/study1Exporter';
import { getDateStamp } from '../utils/timestamp';

const ExportPage: React.FC = () => {
  const [revision, setRevision] = useState(0);
  const store = useMemo(() => loadResearchStore(), [revision]);

  const downloadAllJson = () => {
    downloadTextFile(`research_all_${getDateStamp()}.json`, toPrettyJson(store), 'application/json;charset=utf-8');
  };

  const downloadStudy1Csv = () => {
    downloadTextFile(`study1_responses_${getDateStamp()}.csv`, exportStudy1ResponsesCsv(store.study1Responses), 'text/csv;charset=utf-8');
  };

  const downloadEventLogCsv = () => {
    downloadTextFile(
      `research_event_logs_${getDateStamp()}.csv`,
      toCsv(
        store.eventLogs.map((event) => ({
          ...event,
          payload: JSON.stringify(event.payload),
        })),
        ['eventId', 'sessionId', 'participantId', 'studyId', 'timestamp', 'elapsedMs', 'eventType', 'payload'],
        { bom: true },
      ),
      'text/csv;charset=utf-8',
    );
  };

  return (
    <ResearchLayout
      title="データエクスポート"
      description="ブラウザ内に保存された研究データをJSON / CSVとして回収します。外部DBを使わない初期運用向けです。"
    >
      <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800">
            <p className="text-xs font-bold text-neutral-500">Sessions</p>
            <p className="mt-1 text-3xl font-black">{store.sessions.length}</p>
          </div>
          <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800">
            <p className="text-xs font-bold text-neutral-500">Profiles</p>
            <p className="mt-1 text-3xl font-black">{store.profiles.length}</p>
          </div>
          <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800">
            <p className="text-xs font-bold text-neutral-500">Study 1 Responses</p>
            <p className="mt-1 text-3xl font-black">{store.study1Responses.length}</p>
          </div>
          <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800">
            <p className="text-xs font-bold text-neutral-500">Event Logs</p>
            <p className="mt-1 text-3xl font-black">{store.eventLogs.length}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={downloadAllJson} className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-black text-white">
            Download all JSON
          </button>
          <button type="button" onClick={downloadStudy1Csv} className="rounded-2xl border border-neutral-200 px-5 py-3 text-sm font-black dark:border-neutral-700">
            Download Study 1 CSV
          </button>
          <button type="button" onClick={downloadEventLogCsv} className="rounded-2xl border border-neutral-200 px-5 py-3 text-sm font-black dark:border-neutral-700">
            Download event logs CSV
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('ブラウザ内の研究データを削除します。よろしいですか？')) {
                clearResearchStore();
                setRevision((prev) => prev + 1);
              }
            }}
            className="rounded-2xl border border-red-200 px-5 py-3 text-sm font-black text-red-600 dark:border-red-900"
          >
            Clear local research data
          </button>
        </div>
      </section>
    </ResearchLayout>
  );
};

export default ExportPage;
