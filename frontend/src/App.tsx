import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { Layout } from './components/Layout';
import { LangProvider } from './lib/i18n';
import { Alerts } from './pages/Alerts';
import { Books } from './pages/Books';
import { Coverage } from './pages/Coverage';
import { Creator } from './pages/Creator';
import { Home } from './pages/Home';
import { Memories } from './pages/memories/Memories';

export function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="memories" element={<Memories />} />
              <Route path="books" element={<Books />} />
              <Route path="coverage" element={<Coverage />} />
              <Route path="creator" element={<Creator />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LangProvider>
  );
}
