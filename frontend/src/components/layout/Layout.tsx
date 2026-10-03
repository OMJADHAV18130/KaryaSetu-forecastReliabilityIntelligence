import { Outlet } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import Sidebar from './Sidebar';
import { isMockMode } from '../../services/api';

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {isMockMode && (
          <div
            role="status"
            className="flex items-center justify-center gap-2 border-b border-amber-300 bg-amber-50 px-4 py-1.5 text-[11.5px] font-semibold text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
          >
            <FlaskConical className="h-3.5 w-3.5 flex-shrink-0" />
            DEMO DATA — the backend is not connected, so these values are fixed
            fixtures, not model output.
          </div>
        )}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
