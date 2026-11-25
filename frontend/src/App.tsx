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
import { PrivacyPolicy, Terms } from './pages/legal/Legal';
import { Welcome } from './pages/Welcome';
import { AdminOrders } from './pages/AdminOrders';
import { JoinTrip } from './pages/JoinTrip';
import { AdminOrderPrint } from './pages/AdminOrderPrint';
import { OrderDetail, Orders } from './pages/orders/Orders';

export function App() {
  return (
    <LangProvider>
      <AuthProvider publicContent={<BrowserRouter><PublicRoutes /></BrowserRouter>}>
        <MeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="books/:id" element={<BookEditor />} />
            <Route path="admin/orders/:id/print" element={<AdminOrderPrint />} />
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
              <Route path="admin/orders" element={<AdminOrders />} />
              <Route path="orders" element={<Orders />} />
              <Route path="join/:token" element={<JoinTrip />} />
              <Route path="orders/:id" element={<OrderDetail />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
        </MeProvider>
      </AuthProvider>
    </LangProvider>
  );
}

/** Pages anyone can open without an account. */
function PublicRoutes() {
  return (
    <Routes>
      <Route path="welcome" element={<Welcome />} />
      <Route path="privacy" element={<PrivacyPolicy />} />
      <Route path="terms" element={<Terms />} />
      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </Routes>
  );
}
