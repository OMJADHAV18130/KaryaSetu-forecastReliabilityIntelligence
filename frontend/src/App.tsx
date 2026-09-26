import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import Overview from './pages/Overview';
import ForecastMap from './pages/ForecastMap';
import BustDetection from './pages/BustDetection';
import Verification from './pages/Verification';
import HistoricalEvents from './pages/HistoricalEvents';
import Explainability from './pages/Explainability';
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
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Overview />} />
            <Route path="/map" element={<ForecastMap />} />
            <Route path="/bust-detection" element={<BustDetection />} />
            <Route path="/verification" element={<Verification />} />
            <Route path="/historical" element={<HistoricalEvents />} />
            <Route path="/explainability" element={<Explainability />} />
            <Route path="/model-performance" element={<ModelPerformance />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
