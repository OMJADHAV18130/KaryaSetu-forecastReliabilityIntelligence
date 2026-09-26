import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ForecastMapPage from './pages/ForecastMapPage';
import BustDetection from './pages/BustDetection';
import Verification from './pages/Verification';
import AIExplanation from './pages/AIExplanation';
import HistoricalEvents from './pages/HistoricalEvents';
import ModelPerformance from './pages/ModelPerformance';
import Settings from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
          <Navbar />
          <Sidebar />

          {/* Main content — offset for fixed navbar (h-14) and sidebar (w-52) */}
          <main
            id="main-content"
            className="flex-1 overflow-y-auto pt-14 pl-52 transition-all duration-200"
          >
            <div className="p-5 min-h-full flex flex-col">
              <Routes>
                <Route path="/" element={<Navigate to="/overview" replace />} />
                <Route path="/overview"           element={<Dashboard />} />
                <Route path="/forecast-map"        element={<ForecastMapPage />} />
                <Route path="/bust-detection"      element={<BustDetection />} />
                <Route path="/verification"        element={<Verification />} />
                <Route path="/ai-explanation"      element={<AIExplanation />} />
                <Route path="/historical-events"   element={<HistoricalEvents />} />
                <Route path="/model-performance"   element={<ModelPerformance />} />
                <Route path="/settings"            element={<Settings />} />
                <Route path="*" element={<Navigate to="/overview" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
