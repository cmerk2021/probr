import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { PageErrorBoundary } from '@/components/shared/PageErrorBoundary';

export function AppShell() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar onMenu={() => setOpen(true)} />
        <main className="flex-1 px-4 md:px-8 py-6 max-w-[1400px] w-full mx-auto">
          <div key={window.location.pathname} className="animate-slide-up-fade">
            <PageErrorBoundary>
              <Outlet />
            </PageErrorBoundary>
          </div>
          <Footer />
        </main>
      </div>
      <MobileNav open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-10 pt-5 border-t border-surface-700 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
      <span>
        Powered by{' '}
        <a
          href="https://api.connormerk.dev"
          className="text-brand-300 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Alloy API
        </a>
      </span>
      <span className="mono">MIT · probr v0.1.0</span>
    </footer>
  );
}
