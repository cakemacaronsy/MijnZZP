import { useContext, useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../../hooks/useAppData';
import { useTranslation } from '../../hooks/useTranslation';
import { fmt } from '../../utils/format';
import Card from '../../components/shared/Card';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import '../../components/shared/shared.css';

const emptyLine = () => ({ description: '', qty: 1, unitPrice: 0 });

const VAT_OPTIONS = [
  { value: 0, label: '0%' },
  { value: 9, label: '9%' },
  { value: 21, label: '21%' },
];

export default function InvoiceFormScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices, saveInvoice } = useContext(AppContext);
  const { t } = useTranslation();

  const isEdit = !!id;
  const existing = isEdit ? invoices.find((inv) => inv.id === id) : null;

  const [number, setNumber] = useState('');
  const [client, setClient] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [vatRate, setVatRate] = useState(21);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([emptyLine()]);
  const [saving, setSaving] = useState(false);

  // Load existing invoice data for editing
  useEffect(() => {
    if (!existing) return;
    setNumber(existing.number || '');
    setClient(existing.client || '');
    setClientEmail(existing.clientEmail || '');
    setClientAddress(existing.clientAddress || '');
    setDate(existing.date || '');
    setDueDate(existing.dueDate || '');
    setVatRate(existing.vatRate ?? 21);
    setNotes(existing.notes || '');
    const parsed = typeof existing.lines === 'string'
      ? JSON.parse(existing.lines)
      : existing.lines;
    if (Array.isArray(parsed) && parsed.length > 0) {
      setLines(parsed);
    }
  }, [existing]);

  // Line item helpers
  const updateLine = (index, field, value) => {
    setLines((prev) =>
      prev.map((line, i) =>
        i === index ? { ...line, [field]: value } : line,
      ),
    );
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const removeLine = (index) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  // Calculations
  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + (parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0), 0),
    [lines],
  );

  const vatAmount = useMemo(() => subtotal * (vatRate / 100), [subtotal, vatRate]);
  const total = subtotal + vatAmount;

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const invoice = {
        ...(isEdit ? { id } : {}),
        number,
        client,
        clientEmail,
        clientAddress,
        date,
        dueDate,
        vatRate,
        notes,
        lines: JSON.stringify(lines),
        amount: subtotal,
        status: existing?.status || 'unpaid',
      };
      await saveInvoice(invoice);
      navigate('/invoices');
    } catch (e) {
      console.error('Failed to save invoice:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/invoices')}>
            <ArrowLeft size={18} />
          </button>
          <h1>{isEdit ? t.inv.edit : t.inv.add}</h1>
        </div>
      </div>

      {/* Invoice details */}
      <Card style={{ marginBottom: 16 }}>
        <div className="form-row">
          <div className="form-group">
            <label>{t.inv.num}</label>
            <input
              className="input"
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="INV-2026-001"
            />
          </div>
          <div className="form-group">
            <label>{t.inv.client}</label>
            <input
              className="input"
              type="text"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Client name"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t.inv.clientEmail}</label>
            <input
              className="input"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </div>
          <div className="form-group">
            <label>{t.inv.vat}</label>
            <select
              className="input"
              value={vatRate}
              onChange={(e) => setVatRate(Number(e.target.value))}
            >
              {VAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>{t.inv.clientAddress}</label>
          <textarea
            className="input"
            rows={2}
            value={clientAddress}
            onChange={(e) => setClientAddress(e.target.value)}
            placeholder="Street, postal code, city"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t.inv.date}</label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>{t.inv.due}</label>
            <input
              className="input"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Line items */}
      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Line Items</h3>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ width: '45%' }}>{t.inv.desc}</th>
                <th style={{ width: '15%', textAlign: 'right' }}>{t.inv.qty}</th>
                <th style={{ width: '20%', textAlign: 'right' }}>{t.inv.unitPrice}</th>
                <th style={{ width: '15%', textAlign: 'right' }}>{t.inv.lineTotal}</th>
                <th style={{ width: '5%' }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const lineTotal = (parseFloat(line.qty) || 0) * (parseFloat(line.unitPrice) || 0);
                return (
                  <tr key={index}>
                    <td>
                      <input
                        className="input"
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(index, 'description', e.target.value)}
                        placeholder="Description"
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.5"
                        value={line.qty}
                        onChange={(e) => updateLine(index, 'qty', e.target.value)}
                        style={{ textAlign: 'right' }}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(index, 'unitPrice', e.target.value)}
                        style={{ textAlign: 'right' }}
                      />
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {fmt(lineTotal)}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => removeLine(index)}
                        disabled={lines.length <= 1}
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

        <button className="btn btn-secondary btn-sm" onClick={addLine} style={{ marginTop: 8 }}>
          <Plus size={14} />
          {t.inv.addLine}
        </button>
      </Card>

      {/* Totals */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: 280 }}>
            <span>{t.inv.subtotal}</span>
            <span className="mono">{fmt(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: 280 }}>
            <span>{t.inv.vatAmount} ({vatRate}%)</span>
            <span className="mono">{fmt(vatAmount)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: 280,
              borderTop: '1px solid var(--color-border)',
              paddingTop: 8,
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            <span>{t.inv.grandTotal}</span>
            <span className="mono">{fmt(total)}</span>
          </div>
        </div>
      </Card>

      {/* Notes */}
      <Card style={{ marginBottom: 24 }}>
        <div className="form-group">
          <label>{t.inv.notes}</label>
          <textarea
            className="input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment terms, remarks..."
          />
        </div>
      </Card>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/invoices')}>
          {t.inv.cancel}
        </button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={16} />
          {saving ? 'Saving...' : t.inv.save}
        </button>
      </div>
    </div>
  );
}
