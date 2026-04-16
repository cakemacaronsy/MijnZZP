import { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../hooks/useAppData';
import { useTranslation } from '../../hooks/useTranslation';
import { fmt } from '../../utils/format';
import Card from '../../components/shared/Card';
import Badge from '../../components/shared/Badge';
import { AlertTriangle, Clock } from 'lucide-react';
import '../../components/shared/shared.css';

export default function DashboardScreen() {
  const { invoices, expenses, clients, settings } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();

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
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>{t.tabs[0]}</h1>

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
          { label: t.dash.rev, value: fmt(stats.revenue), color: 'var(--color-primary)' },
          { label: t.dash.exp, value: fmt(stats.expenses), color: 'var(--color-error)' },
          { label: t.dash.profit, value: fmt(stats.profit), color: 'var(--color-success)' },
          { label: t.dash.hrs, value: `${totalHours}`, sub: t.dash.of1225, color: 'var(--color-secondary)' },
        ].map(({ label, value, sub, color }) => (
          <Card key={label}>
            <div className="stat-card">
              <span className="label">{label}</span>
              <span className="value" style={{ color }}>{value}</span>
              {sub && <span className="text-xs text-secondary">{sub}</span>}
            </div>
          </Card>
        ))}
      </div>

      {/* Quarterly Revenue Chart */}
      <Card style={{ marginBottom: 20 }}>
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
