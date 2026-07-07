import React from 'react';
import ResearchAdminPage from './routes/ResearchAdminPage';
import Study1Page from './routes/Study1Page';
import ExportPage from './routes/ExportPage';
import DebugPage from './routes/DebugPage';

const ResearchApp: React.FC = () => {
  const path = window.location.pathname;

  if (path.startsWith('/research/study1')) return <Study1Page />;
  if (path.startsWith('/research/export')) return <ExportPage />;
  if (path.startsWith('/research/debug')) return <DebugPage />;

  return <ResearchAdminPage />;
};

export default ResearchApp;
