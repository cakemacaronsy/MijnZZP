import { useContext, useMemo } from 'react';
import { AppContext } from '../../hooks/useAppData';
import { useTranslation } from '../../hooks/useTranslation';
import { fmt } from '../../utils/format';
import { calcBox1, calcVatSummary, calcQuarterlyBtw, calcDepreciation } from '../../utils/tax-calc';
import { HOURS_CRITERION } from '../../constants/tax';
import Card from '../../components/shared/Card';
import Badge from '../../components/shared/Badge';
import { CheckCircle, XCircle } from 'lucide-react';
import '../../components/shared/shared.css';

export default function TaxOverviewScreen() {
  const { invoices, expenses, personalItems, settings, year } = useContext(AppContext);
  const { t } = useTranslation();

  const totalHours = (settings.workedHours || 0) + (settings.calendarHours || 0);
  const hoursMet = totalHours >= HOURS_CRITERION;
  const isStarter = !!settings.isStarter;

  const depTotal = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + calcDepreciation(exp, year), 0);
  }, [expenses, year]);

  const revenue = useMemo(() => invoices.reduce((s, i) => s + (i.amount || 0), 0), [invoices]);
  const expenseTotal = useMemo(() => expenses.reduce((s, e) => s + (e.amount || 0), 0), [expenses]);

  const box1 = useMemo(() => calcBox1(revenue, expenseTotal, depTotal, hoursMet, isStarter), [revenue, expenseTotal, depTotal, hoursMet, isStarter]);
  const vatSummary = useMemo(() => calcVatSummary(invoices, expenses), [invoices, expenses]);
  const quarterly = useMemo(() => calcQuarterlyBtw(invoices, expenses), [invoices, expenses]);

  const personalIncome = useMemo(() => {
    return (personalItems || []).filter(i => i.side === 'income').reduce((s, i) => s + (i.amount || 0), 0);
  }, [personalItems]);

  const personalExpense = useMemo(() => {
    return (personalItems || []).filter(i => i.side === 'expense').reduce((s, i) => s + (i.amount || 0), 0);
  }, [personalItems]);

  const quarterLabels = [t.btw.q1, t.btw.q2, t.btw.q3, t.btw.q4];

  return (
    <div>
      <div className="page-header">
        <h1>{t.tax.title} — {year}</h1>
      </div>

      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 20 }}>{t.tax.disc}</p>

      {/* Hours Tracker */}
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{t.tax.hrReq}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          {hoursMet ? (
            <CheckCircle size={20} color="var(--color-success)" />
          ) : (
            <XCircle size={20} color="var(--color-error)" />
          )}
          <span style={{ fontWeight: 600 }}>{hoursMet ? t.tax.met : t.tax.notMet}</span>
        </div>
        <div style={{ background: 'var(--color-bg-secondary, #f3f4f6)', borderRadius: 8, height: 24, overflow: 'hidden', marginBottom: 8 }}>
          <div
            style={{
              height: '100%',
              width: `${Math.min((totalHours / HOURS_CRITERION) * 100, 100)}%`,
              background: hoursMet ? 'var(--color-success)' : 'var(--color-primary)',
              borderRadius: 8,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span className="mono">{totalHours} {t.tax.totHrs.toLowerCase()}</span>
          <span className="mono">{HOURS_CRITERION} required</span>
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 8, fontSize: 13, color: 'var(--color-text-secondary)' }}>
          <span>{t.tax.manHrs}: {settings.workedHours || 0}</span>
          <span>{t.tax.calHrs}: {settings.calendarHours || 0}</span>
        </div>
      </Card>

      {/* Box 1 */}
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t.tax.box1}</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {[
              { label: t.tax.rev, value: revenue },
              { label: t.tax.costs, value: -expenseTotal },
              { label: t.exp.totalDep || 'Depreciation', value: -depTotal },
              { label: t.tax.gross, value: box1.gross, bold: true },
              { label: t.tax.sed, value: hoursMet ? -box1.sed : 0, note: !hoursMet ? `(${t.tax.notMet})` : '' },
              { label: t.tax.starter, value: isStarter && hoursMet ? -(box1.sed - (hoursMet ? 3750 : 0)) : 0, note: isStarter ? t.tax.yes : t.tax.no },
              { label: t.tax.mkb + ' (13.94%)', value: -box1.mkb },
              { label: t.tax.taxable, value: box1.taxable, bold: true, highlight: true },
            ].map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-border, #e5e7eb)' }}>
                <td style={{ padding: '8px 0', fontWeight: row.bold ? 700 : 400 }}>
                  {row.label} {row.note && <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>({row.note})</span>}
                </td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: row.bold ? 700 : 400 }}>
                  <span className="mono" style={row.highlight ? { color: 'var(--color-primary)' } : undefined}>
                    {fmt(row.value)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Personal Income in Box 1 */}
      {(personalIncome > 0 || personalExpense > 0) && (
        <Card style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t.tax.persIncome}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border, #e5e7eb)' }}>
                <td style={{ padding: '8px 0' }}>{t.priv.totalIncome}</td>
                <td className="mono" style={{ padding: '8px 0', textAlign: 'right' }}>{fmt(personalIncome)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border, #e5e7eb)' }}>
                <td style={{ padding: '8px 0' }}>{t.priv.totalExpense}</td>
                <td className="mono" style={{ padding: '8px 0', textAlign: 'right' }}>{fmt(-personalExpense)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border, #e5e7eb)' }}>
                <td style={{ padding: '8px 0', fontWeight: 700 }}>{t.tax.bizProfit}</td>
                <td className="mono" style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700 }}>{fmt(box1.taxable)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', fontWeight: 700 }}>{t.tax.totalBox1}</td>
                <td className="mono" style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {fmt(box1.taxable + personalIncome - personalExpense)}
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      {/* VAT Summary */}
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t.tax.vatSum}</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="label">{t.tax.vatCol}</span>
            <span className="value mono" style={{ color: 'var(--color-primary)' }}>{fmt(vatSummary.collected)}</span>
          </div>
          <div className="stat-card">
            <span className="label">{t.tax.vatPd}</span>
            <span className="value mono" style={{ color: 'var(--color-success)' }}>{fmt(vatSummary.paid)}</span>
          </div>
          <div className="stat-card">
            <span className="label">{t.tax.vatOwe}</span>
            <span className="value mono" style={{ color: vatSummary.owed >= 0 ? 'var(--color-error)' : 'var(--color-success)' }}>
              {fmt(vatSummary.owed)}
            </span>
          </div>
        </div>
      </Card>

      {/* Quarterly BTW */}
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{t.btw.title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
        {quarterly.map((q, i) => (
          <Card key={i}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{quarterLabels[i]}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>VAT 21%</span>
                <span className="mono">{fmt(q.vat21)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>VAT 9%</span>
                <span className="mono">{fmt(q.vat9)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{t.btw.paid}</span>
                <span className="mono">{fmt(-q.inputVat)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border, #e5e7eb)', paddingTop: 6, fontWeight: 600 }}>
                <span>{t.btw.owed}</span>
                <span className="mono" style={{ color: q.total >= 0 ? 'var(--color-error)' : 'var(--color-success)' }}>
                  {fmt(q.total)}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 20 }}>{t.btw.hint}</p>
    </div>
  );
}
