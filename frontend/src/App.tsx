import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { MeProvider } from './auth/MeProvider';
import { Layout } from './components/Layout';
import { LangProvider } from './lib/i18n';
import { Account } from './pages/Account';
import { AdminUsers } from './pages/AdminUsers';
import { Alerts } from './pages/Alerts';
import { BookEditor } from './pages/books/BookEditor';
import { Books } from './pages/books/Books';
import { Coverage } from './pages/Coverage';
import { Creator } from './pages/Creator';
import { Dashboard } from './pages/Dashboard';
import { Home } from './pages/Home';
import { Memories } from './pages/memories/Memories';

export function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <MeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="books/:id" element={<BookEditor />} />
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="memories" element={<Memories />} />
              <Route path="books" element={<Books />} />
              <Route path="coverage" element={<Coverage />} />
              <Route path="creator" element={<Creator />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="account" element={<Account />} />
              <Route path="admin/users" element={<AdminUsers />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
        </MeProvider>
      </AuthProvider>
    </LangProvider>
  );
}
