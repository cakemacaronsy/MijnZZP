import { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../hooks/useAppData';
import { useTranslation } from '../../hooks/useTranslation';
import { fmt } from '../../utils/format';
import Card from '../../components/shared/Card';
import Badge from '../../components/shared/Badge';
import { useToast } from '../../components/shared/Toast';
import { seedDemoData } from '../../services/demo-seed';
import { getImportHistory } from '../../services/import-history';
import { AlertTriangle, Clock, Sparkles, Users, Receipt, Calendar, Upload } from 'lucide-react';
import '../../components/shared/shared.css';

export default function DashboardScreen() {
  const { invoices, expenses, clients, settings, year, refresh, user } = useContext(AppContext);
  const recentImports = useMemo(() => getImportHistory(user?.id).slice(0, 3), [user?.id, expenses.length]);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const [seeding, setSeeding] = useState(false);

  const isEmpty = invoices.length === 0 && expenses.length === 0 && clients.length === 0;

  // Count expenses with a receipt photo — we don't know without fetching, so use a proxy:
  // count of expenses created via scanner (those have descriptions that start with OCR-extracted supplier names,
  // but more reliably: any expense whose receipt photo exists). For MVP, count expenses that likely have receipts:
  // show the total expense count as a proxy, labeled as "logged" so we don't lie.
  const receiptCount = expenses.length;

  // Active clients: those with invoices or sessions or recent followup in the current year
  const activeClients = clients.length;

  const handleSeedDemo = async () => {
    if (seeding) return;
    setSeeding(true);
    try {
      const result = await seedDemoData();
      await refresh();
      toast.success(`${t.common.demoLoaded}: ${result.invoices + result.expenses + result.clients + result.personalItems} items`);
    } catch (e) {
      console.error('Seed failed:', e);
      toast.error(`${t.common.saveFailed}: ${e.message || 'Unknown error'}`);
    } finally {
      setSeeding(false);
    }
  };

  const totalHours = (settings.workedHours || 0) + (settings.calendarHours || 0);

  const stats = useMemo(() => {
    const revenue = invoices.reduce((s, i) => s + (i.amount || 0), 0);
    const exp = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    return { revenue, expenses: exp, profit: revenue - exp };
  }, [invoices, expenses]);

  const quarterlyRevenue = useMemo(() => {
    const q = [0, 0, 0, 0];
    for (const inv of invoices) {
      const month = parseInt(inv.date?.slice(5, 7), 10) || 1;
      q[Math.floor((month - 1) / 3)] += inv.amount || 0;
    }
    return q;
  }, [invoices]);

  const maxQ = Math.max(...quarterlyRevenue, 1);

  const overdueInvoices = useMemo(() => {
    const now = new Date().toISOString().slice(0, 10);
    return invoices.filter(i => i.status === 'unpaid' && i.dueDate && i.dueDate < now);
  }, [invoices]);

  const pendingFollowups = useMemo(() => {
    const now = new Date().toISOString().slice(0, 10);
    return clients.filter(c => c.followupDate && !c.followupDone && c.followupDate <= now);
  }, [clients]);

  const recentInvoices = useMemo(
    () => [...invoices].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5),
    [invoices],
  );

  const recentExpenses = useMemo(
    () => [...expenses].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5),
    [expenses],
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>{t.tabs[0]}</h1>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            borderRadius: 999,
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            fontSize: 12,
            color: 'var(--color-text-secondary)',
          }}>
            <Calendar size={12} /> {year}
          </span>
        </div>
        {isEmpty && (
          <button
            className="btn btn-secondary"
            onClick={handleSeedDemo}
            disabled={seeding}
          >
            <Sparkles size={16} />
            {seeding ? '...' : t.common.loadDemoData}
          </button>
        )}
      </div>

      {/* Empty state */}
      {isEmpty && !seeding && (
        <Card style={{ marginBottom: 20, textAlign: 'center', padding: 32 }}>
          <Sparkles size={40} style={{ color: 'var(--color-primary)', marginBottom: 12 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Welcome to MijnZZP</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 16, maxWidth: 420, margin: '0 auto 16px' }}>
            No data yet. Click "Load Demo Data" above to populate sample invoices, expenses, and a client so you can explore the app.
          </p>
        </Card>
      )}

      {/* Alerts */}
      {(overdueInvoices.length > 0 || pendingFollowups.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {overdueInvoices.map(inv => (
            <div key={inv.id} className="alert-item error" onClick={() => navigate(`/invoices/${inv.id}`)} style={{ cursor: 'pointer' }}>
              <AlertTriangle size={16} />
              <span>Invoice {inv.number || '#'} to {inv.client} is overdue — {fmt(inv.amount)}</span>
            </div>
          ))}
          {pendingFollowups.map(c => (
            <div key={c.id} className="alert-item warning" onClick={() => navigate(`/clients/${c.id}`)} style={{ cursor: 'pointer' }}>
              <Clock size={16} />
              <span>Follow-up due for {c.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          { label: t.dash.rev, value: fmt(stats.revenue), color: 'var(--color-primary)', onClick: () => navigate('/invoices') },
          { label: t.dash.exp, value: fmt(stats.expenses), color: 'var(--color-error)', onClick: () => navigate('/expenses') },
          { label: t.dash.profit, value: fmt(stats.profit), color: 'var(--color-success)' },
          { label: t.dash.hrs, value: `${totalHours}`, sub: t.dash.of1225, color: 'var(--color-secondary)', onClick: () => navigate('/settings') },
          { label: 'Clients', value: `${activeClients}`, icon: Users, color: 'var(--color-primary)', onClick: () => navigate('/clients') },
          { label: 'Expenses logged', value: `${receiptCount}`, icon: Receipt, color: 'var(--color-warning)', onClick: () => navigate('/expenses') },
        ].map(({ label, value, sub, color, onClick, icon: Icon }) => (
          <Card key={label} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
            <div className="stat-card">
              <span className="label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {Icon && <Icon size={12} />} {label}
              </span>
              <span className="value" style={{ color }}>{value}</span>
              {sub && <span className="text-xs text-secondary">{sub}</span>}
            </div>
          </Card>
        ))}
      </div>

      {/* Quarterly Revenue Chart + Clients side-by-side */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{t.dash.qRev}</h3>
          <div className="chart-bar-group">
            {quarterlyRevenue.map((val, i) => (
              <div key={i} className="chart-bar">
                <span className="chart-value">{fmt(val)}</span>
                <div className="bar" style={{ height: `${Math.max((val / maxQ) * 100, 4)}%` }} />
                <span className="chart-label">{t.dash.q[i]?.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Clients</h3>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/clients/new')}
              title="Add client"
            >
              +
            </button>
          </div>
          {clients.length === 0 ? (
            <p className="text-secondary text-sm">No clients yet. <a onClick={() => navigate('/clients/new')} style={{ cursor: 'pointer', color: 'var(--color-primary)' }}>Add one</a>.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {clients.slice(0, 5).map(c => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/clients/${c.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}
                >
                  <Users size={14} color="var(--color-text-secondary)" />
                  <span style={{ fontWeight: 500 }}>{c.name}</span>
                  {c.company && <span className="text-xs text-secondary"> — {c.company}</span>}
                </div>
              ))}
              {clients.length > 5 && (
                <a onClick={() => navigate('/clients')} style={{ fontSize: 12, color: 'var(--color-primary)', cursor: 'pointer', marginTop: 4 }}>
                  View all {clients.length} clients →
                </a>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Imports */}
      {recentImports.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Upload size={14} /> Recent CSV Imports
            </h3>
            <a onClick={() => navigate('/import')} style={{ fontSize: 12, color: 'var(--color-primary)', cursor: 'pointer' }}>
              View all →
            </a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentImports.map(rec => (
              <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {new Date(rec.importedAt).toLocaleDateString()}
                  </span>
                  <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rec.filename}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', whiteSpace: 'nowrap' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                    {rec.count} items · {rec.dominantYear || '—'}
                  </span>
                  <span className="mono" style={{ fontSize: 13 }}>{fmt(rec.totalAmount || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{t.dash.recInv}</h3>
          {recentInvoices.length === 0 ? (
            <p className="text-secondary text-sm">{t.dash.noInv}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentInvoices.map(inv => (
                <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => navigate(`/invoices/${inv.id}`)}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{inv.client || inv.number}</div>
                    <div className="text-xs text-secondary">{inv.date}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="mono" style={{ fontSize: 13 }}>{fmt(inv.amount)}</span>
                    <Badge status={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{t.dash.recExp}</h3>
          {recentExpenses.length === 0 ? (
            <p className="text-secondary text-sm">{t.dash.noExp}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentExpenses.map(exp => (
                <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => navigate(`/expenses/${exp.id}/edit`)}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{exp.description || exp.category}</div>
                    <div className="text-xs text-secondary">{exp.date}</div>
                  </div>
                  <span className="mono" style={{ fontSize: 13 }}>{fmt(exp.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
