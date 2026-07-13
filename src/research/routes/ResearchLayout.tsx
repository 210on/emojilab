import React from 'react';

interface ResearchLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const navItems = [
  { href: '/research/admin', label: 'Admin' },
  { href: '/research/study1', label: 'Study 1' },
  { href: '/research/export', label: 'Export' },
  { href: '/research/debug', label: 'Debug' },
];

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const withBasePath = (href: string) => `${basePath}${href}`;
const homeHref = basePath || '/';

const ResearchLayout: React.FC<ResearchLayoutProps> = ({ title, description, children }) => (
  <div className="min-h-screen bg-neutral-100 px-4 py-5 text-neutral-950 dark:bg-neutral-950 dark:text-white">
    <header className="mx-auto flex max-w-6xl flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <a href={homeHref} className="text-xs font-black uppercase tracking-[0.24em] text-[var(--accent)]">EmojiLab Research</a>
        <h1 className="mt-2 text-2xl font-black">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">{description}</p>
      </div>
      <nav className="flex flex-wrap gap-2">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={withBasePath(item.href)}
            className="rounded-full border border-neutral-200 px-3 py-2 text-xs font-black text-neutral-700 hover:border-[var(--accent)] hover:text-[var(--accent)] dark:border-neutral-700 dark:text-neutral-200"
          >
            {item.label}
          </a>
        ))}
      </nav>
    </header>
    <main className="mx-auto mt-5 max-w-6xl">{children}</main>
  </div>
);

export default ResearchLayout;
