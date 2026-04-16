import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppData, AppContext } from './hooks/useAppData';
import Layout from './components/Layout';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import DashboardScreen from './screens/dashboard/DashboardScreen';
import InvoiceListScreen from './screens/invoices/InvoiceListScreen';
import InvoiceFormScreen from './screens/invoices/InvoiceFormScreen';
import InvoicePreviewScreen from './screens/invoices/InvoicePreviewScreen';
import QuoteListScreen from './screens/invoices/QuoteListScreen';
import QuoteFormScreen from './screens/invoices/QuoteFormScreen';
import QuotePreviewScreen from './screens/invoices/QuotePreviewScreen';
import ExpenseListScreen from './screens/expenses/ExpenseListScreen';
import ExpenseFormScreen from './screens/expenses/ExpenseFormScreen';
import PersonalListScreen from './screens/personal/PersonalListScreen';
import PersonalFormScreen from './screens/personal/PersonalFormScreen';
import TaxOverviewScreen from './screens/tax/TaxOverviewScreen';
import ClientListScreen from './screens/clients/ClientListScreen';
import ClientDetailScreen from './screens/clients/ClientDetailScreen';
import ClientFormScreen from './screens/clients/ClientFormScreen';
import SettingsScreen from './screens/SettingsScreen';
import AdvisorScreen from './screens/AdvisorScreen';
import BankImportScreen from './screens/BankImportScreen';

function AuthGuard({ children, user, loading }) {
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #EA580C, #F97316)',
            color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800, marginBottom: 12
          }}>M</div>
          <p style={{ color: '#6B7280' }}>Loading...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const appData = useAppData();
  const { user, loading, settings } = appData;

  return (
    <AppContext.Provider value={appData}>
      <HashRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginScreen />} />
          <Route path="/signup" element={user ? <Navigate to="/" replace /> : <SignupScreen />} />

          {/* Onboarding */}
          <Route path="/onboarding" element={
            <AuthGuard user={user} loading={loading}>
              <OnboardingScreen />
            </AuthGuard>
          } />

          {/* Protected routes with layout */}
          <Route element={
            <AuthGuard user={user} loading={loading}>
              {!settings.onboarded ? <Navigate to="/onboarding" replace /> : <Layout />}
            </AuthGuard>
          }>
            <Route index element={<DashboardScreen />} />
            <Route path="invoices" element={<InvoiceListScreen />} />
            <Route path="invoices/new" element={<InvoiceFormScreen />} />
            <Route path="invoices/:id" element={<InvoicePreviewScreen />} />
            <Route path="invoices/:id/edit" element={<InvoiceFormScreen />} />
            <Route path="quotes" element={<QuoteListScreen />} />
            <Route path="quotes/new" element={<QuoteFormScreen />} />
            <Route path="quotes/:id" element={<QuotePreviewScreen />} />
            <Route path="quotes/:id/edit" element={<QuoteFormScreen />} />
            <Route path="expenses" element={<ExpenseListScreen />} />
            <Route path="expenses/new" element={<ExpenseFormScreen />} />
            <Route path="expenses/:id/edit" element={<ExpenseFormScreen />} />
            <Route path="personal" element={<PersonalListScreen />} />
            <Route path="personal/new" element={<PersonalFormScreen />} />
            <Route path="personal/:id/edit" element={<PersonalFormScreen />} />
            <Route path="tax" element={<TaxOverviewScreen />} />
            <Route path="clients" element={<ClientListScreen />} />
            <Route path="clients/new" element={<ClientFormScreen />} />
            <Route path="clients/:id" element={<ClientDetailScreen />} />
            <Route path="clients/:id/edit" element={<ClientFormScreen />} />
            <Route path="settings" element={<SettingsScreen />} />
            <Route path="settings/backup" element={<SettingsScreen />} />
            <Route path="advisor" element={<AdvisorScreen />} />
            <Route path="import" element={<BankImportScreen />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AppContext.Provider>
  );
}
