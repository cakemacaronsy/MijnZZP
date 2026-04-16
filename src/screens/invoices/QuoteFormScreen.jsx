import { useContext, useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../../hooks/useAppData';
import { useTranslation } from '../../hooks/useTranslation';
import { fmt } from '../../utils/format';
import { VAT_RATES } from '../../constants/categories';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import '../../components/shared/shared.css';

const emptyLine = { description: '', qty: 1, unitPrice: '', vatRate: 21 };

const emptyQuote = {
  number: '',
  client: '',
  clientEmail: '',
  clientAddress: '',
  date: new Date().toISOString().slice(0, 10),
  validUntil: '',
  lines: [{ ...emptyLine }],
  notes: '',
  downPercent: 0,
  paymentDays: 14,
  status: 'draft',
};

export default function QuoteFormScreen() {
  const { quotes, saveQuote, clients } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();

  const isEdit = !!id;
  const [form, setForm] = useState(emptyQuote);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      const existing = quotes.find((q) => q.id === id);
      if (existing) {
        setForm({
          ...emptyQuote,
          ...existing,
          lines: existing.lines && existing.lines.length > 0
            ? existing.lines.map((l) => ({
                description: l.description || '',
                qty: l.qty ?? 1,
                unitPrice: l.unitPrice != null ? String(l.unitPrice) : '',
                vatRate: l.vatRate ?? 21,
              }))
            : [{ ...emptyLine }],
          downPercent: existing.downPercent ?? 0,
          paymentDays: existing.paymentDays ?? 14,
        });
      }
    }
  }, [id, quotes, isEdit]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const updateLine = (index, key, value) => {
    setForm((prev) => {
      const lines = [...prev.lines];
      lines[index] = { ...lines[index], [key]: value };
      return { ...prev, lines };
    });
  };

  const addLine = () => setForm((prev) => ({ ...prev, lines: [...prev.lines, { ...emptyLine }] }));

  const removeLine = (index) => {
    setForm((prev) => {
      const lines = prev.lines.filter((_, i) => i !== index);
      return { ...prev, lines: lines.length > 0 ? lines : [{ ...emptyLine }] };
    });
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let vatTotal = 0;
    for (const line of form.lines) {
      const lineAmount = (parseFloat(line.qty) || 0) * (parseFloat(line.unitPrice) || 0);
      subtotal += lineAmount;
      vatTotal += lineAmount * ((parseInt(line.vatRate, 10) || 0) / 100);
    }
    const grandTotal = subtotal + vatTotal;
    const downAmount = grandTotal * ((parseInt(form.downPercent, 10) || 0) / 100);
    return { subtotal, vatTotal, grandTotal, downAmount };
  }, [form.lines, form.downPercent]);

  const handleSave = async () => {
    if (!form.client && !form.number) return;
    setSaving(true);
    try {
      const lines = form.lines.map((l) => ({
        description: l.description,
        qty: parseFloat(l.qty) || 1,
        unitPrice: parseFloat(l.unitPrice) || 0,
        vatRate: parseInt(l.vatRate, 10) || 0,
      }));

      await saveQuote({
        ...(isEdit ? { id } : {}),
        number: form.number,
        client: form.client,
        clientEmail: form.clientEmail,
        clientAddress: form.clientAddress,
        date: form.date,
        validUntil: form.validUntil,
        lines,
        notes: form.notes,
        downPercent: parseInt(form.downPercent, 10) || 0,
        paymentDays: parseInt(form.paymentDays, 10) || 14,
        amount: totals.grandTotal,
        status: form.status || 'draft',
      });
      navigate('/quotes');
    } catch (e) {
      console.error('Failed to save quote:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/quotes')}>
            <ArrowLeft size={16} />
          </button>
          <h1>{isEdit ? `${t.inv.edit} ${t.quote.offerteLabel}` : t.quote.add}</h1>
        </div>
      </div>

      <div className="card" style={{ padding: 24, maxWidth: 800 }}>
        {/* Quote number + Client */}
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>{t.quote.num}</label>
            <input
              type="text"
              className="input"
              value={form.number}
              onChange={(e) => set('number', e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>{t.inv.client}</label>
            <input
              type="text"
              className="input"
              list="client-suggestions"
              value={form.client}
              onChange={(e) => set('client', e.target.value)}
            />
            {clients && clients.length > 0 && (
              <datalist id="client-suggestions">
                {clients.map((c) => (
                  <option key={c.id} value={c.name || c.company} />
                ))}
              </datalist>
            )}
          </div>
        </div>

        {/* Client email + address */}
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>{t.inv.clientEmail}</label>
            <input
              type="email"
              className="input"
              value={form.clientEmail}
              onChange={(e) => set('clientEmail', e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>{t.inv.clientAddress}</label>
            <input
              type="text"
              className="input"
              value={form.clientAddress}
              onChange={(e) => set('clientAddress', e.target.value)}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>{t.inv.date}</label>
            <input
              type="date"
              className="input"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>{t.quote.validUntil}</label>
            <input
              type="date"
              className="input"
              value={form.validUntil}
              onChange={(e) => set('validUntil', e.target.value)}
            />
          </div>
        </div>

        {/* Down payment + Payment days */}
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>{t.quote.downPercent}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                className="input"
                min="0"
                max="100"
                value={form.downPercent}
                onChange={(e) => set('downPercent', e.target.value)}
              />
              <span>%</span>
            </div>
            <small style={{ color: 'var(--color-text-secondary)', marginTop: 4, display: 'block' }}>
              {t.quote.downHint}
            </small>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>{t.inv.paymentTerms}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                className="input"
                min="1"
                value={form.paymentDays}
                onChange={(e) => set('paymentDays', e.target.value)}
              />
              <span>{t.inv.days}</span>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>{t.inv.desc}</h3>
            <button className="btn btn-ghost btn-sm" onClick={addLine}>
              <Plus size={14} />
              {t.inv.addLine}
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{t.inv.desc}</th>
                  <th style={{ width: 80 }}>{t.inv.qty}</th>
                  <th style={{ width: 120 }}>{t.inv.unitPrice}</th>
                  <th style={{ width: 100 }}>{t.inv.vat}</th>
                  <th style={{ width: 120, textAlign: 'right' }}>{t.inv.lineTotal}</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {form.lines.map((line, i) => {
                  const lineTotal = (parseFloat(line.qty) || 0) * (parseFloat(line.unitPrice) || 0);
                  return (
                    <tr key={i}>
                      <td>
                        <input
                          type="text"
                          className="input"
                          value={line.description}
                          onChange={(e) => updateLine(i, 'description', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="input"
                          min="1"
                          value={line.qty}
                          onChange={(e) => updateLine(i, 'qty', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="input"
                          step="0.01"
                          min="0"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(i, 'unitPrice', e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          className="input"
                          value={line.vatRate}
                          onChange={(e) => updateLine(i, 'vatRate', e.target.value)}
                        >
                          {VAT_RATES.map((r) => (
                            <option key={r} value={r}>{r}%</option>
                          ))}
                        </select>
                      </td>
                      <td className="mono" style={{ textAlign: 'right' }}>
                        {fmt(lineTotal)}
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => removeLine(i)}
                          title={t.inv.removeLine}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
            <span>{t.inv.subtotal}</span>
            <span className="mono">{fmt(totals.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
            <span>{t.inv.vatAmount}</span>
            <span className="mono">{fmt(totals.vatTotal)}</span>
          </div>
          <div style={{ display: 'flex', gap: 24, fontSize: 15, fontWeight: 600 }}>
            <span>{t.inv.grandTotal}</span>
            <span className="mono">{fmt(totals.grandTotal)}</span>
          </div>
          {totals.downAmount > 0 && (
            <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--color-primary)' }}>
              <span>{t.quote.downAmount} ({form.downPercent}%)</span>
              <span className="mono">{fmt(totals.downAmount)}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="form-group" style={{ marginTop: 16 }}>
          <label>{t.inv.notes}</label>
          <textarea
            className="input"
            rows={3}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {t.inv.save}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/quotes')}>
            {t.inv.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
