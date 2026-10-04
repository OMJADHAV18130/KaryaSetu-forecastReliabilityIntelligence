import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import Overview from './pages/Overview';
import ForecastMap from './pages/ForecastMap';
import Search from './pages/Search';
import BustDetection from './pages/BustDetection';
import TimeSeries from './pages/TimeSeries';
import Explainability from './pages/Explainability';
import Settings from './pages/Settings';
import { ThemeProvider } from './lib/theme';

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
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Overview />} />
              <Route path="/map" element={<ForecastMap />} />
              <Route path="/search" element={<Search />} />
              <Route path="/bust-detection" element={<BustDetection />} />
              <Route path="/time-series" element={<TimeSeries />} />
              <Route path="/explainability" element={<Explainability />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Overview />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
