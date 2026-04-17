import { useContext, useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppContext } from '../../hooks/useAppData';
import { useTranslation } from '../../hooks/useTranslation';
import { fmt } from '../../utils/format';
import { CATS, VAT_RATES } from '../../constants/categories';
import { ArrowLeft, Upload } from 'lucide-react';
import ReceiptThumbnail from '../../components/shared/ReceiptViewer';
import '../../components/shared/shared.css';

const emptyExpense = {
  category: 'office',
  description: '',
  amount: '',
  vatRate: 21,
  date: new Date().toISOString().slice(0, 10),
  supplier: '',
  isAsset: false,
  depYears: 5,
  residualValue: '',
  receiptFile: null,
};

export default function ExpenseFormScreen() {
  const { expenses, saveExpense } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [searchParams] = useSearchParams();
  const isEdit = !!id;

  // Pre-fill from query params (e.g. from scanner OCR)
  const initialFromParams = () => {
    const has = searchParams.has('category') || searchParams.has('amount');
    if (!has) return emptyExpense;
    return {
      ...emptyExpense,
      category: searchParams.get('category') || emptyExpense.category,
      description: searchParams.get('description') || '',
      amount: searchParams.get('amount') || '',
      vatRate: parseInt(searchParams.get('vatRate'), 10) || 21,
      date: searchParams.get('date') || emptyExpense.date,
      supplier: searchParams.get('supplier') || '',
    };
  };

  const [form, setForm] = useState(initialFromParams);
  const [receiptName, setReceiptName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      const existing = expenses.find((e) => e.id === id);
      if (existing) {
        setForm({
          ...emptyExpense,
          ...existing,
          amount: existing.amount != null ? String(existing.amount) : '',
          residualValue: existing.residualValue != null ? String(existing.residualValue) : '',
          depYears: existing.depYears || 5,
        });
      }
    }
  }, [id, expenses, isEdit]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const annualDep = form.isAsset && form.amount && form.depYears
    ? ((parseFloat(form.amount) || 0) - (parseFloat(form.residualValue) || 0)) / (parseInt(form.depYears, 10) || 1)
    : 0;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptName(file.name);
      set('receiptFile', file.name);
    }
  };

  const handleSave = async () => {
    if (!form.description && !form.supplier) return;
    setSaving(true);
    try {
      await saveExpense({
        ...(isEdit ? { id } : {}),
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount) || 0,
        vatRate: parseInt(form.vatRate, 10),
        date: form.date,
        supplier: form.supplier,
        isAsset: form.isAsset,
        depYears: form.isAsset ? parseInt(form.depYears, 10) || 5 : 0,
        residualValue: form.isAsset ? parseFloat(form.residualValue) || 0 : 0,
      });
      navigate('/expenses');
    } catch (e) {
      console.error('Failed to save expense:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/expenses')}>
            <ArrowLeft size={16} />
          </button>
          <h1>{isEdit ? t.exp.edit : t.exp.add}</h1>
        </div>
      </div>

      <div className="card" style={{ padding: 24, maxWidth: 640 }}>
        {/* Category */}
        <div className="form-group">
          <label>{t.exp.cat}</label>
          <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATS.map((c) => (
              <option key={c} value={c}>
                {t.exp.cats[c] || c}
              </option>
            ))}
          </select>
          {t.exp.catDesc[form.category] && (
            <small style={{ color: 'var(--color-text-secondary)', marginTop: 4, display: 'block' }}>
              {t.exp.catDesc[form.category]}
            </small>
          )}
        </div>

        {/* Description */}
        <div className="form-group">
          <label>{t.exp.desc}</label>
          <input
            type="text"
            className="input"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>

        {/* Amount + VAT Rate */}
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>{t.exp.amt}</label>
            <input
              type="number"
              className="input"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>{t.exp.vat}</label>
            <select className="input" value={form.vatRate} onChange={(e) => set('vatRate', e.target.value)}>
              {VAT_RATES.map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date + Supplier */}
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>{t.exp.date}</label>
            <input
              type="date"
              className="input"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>{t.exp.sup}</label>
            <input
              type="text"
              className="input"
              value={form.supplier}
              onChange={(e) => set('supplier', e.target.value)}
            />
          </div>
        </div>

        {/* Asset depreciation toggle */}
        <div className="form-group" style={{ marginTop: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.isAsset}
              onChange={(e) => set('isAsset', e.target.checked)}
            />
            {t.exp.isAsset}
          </label>
          <small style={{ color: 'var(--color-text-secondary)', display: 'block', marginTop: 4 }}>
            {t.exp.depHint}
          </small>
        </div>

        {/* Depreciation fields */}
        {form.isAsset && (
          <div className="form-row" style={{ marginTop: 8 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>{t.exp.depYears}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  className="input"
                  min="1"
                  max="30"
                  value={form.depYears}
                  onChange={(e) => set('depYears', e.target.value)}
                />
                <span>{t.exp.years}</span>
              </div>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>{t.exp.residual}</label>
              <input
                type="number"
                className="input"
                step="0.01"
                min="0"
                value={form.residualValue}
                onChange={(e) => set('residualValue', e.target.value)}
              />
            </div>
          </div>
        )}

        {form.isAsset && annualDep > 0 && (
          <div style={{ marginTop: 8, padding: 12, background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
            <span style={{ fontWeight: 500 }}>{t.exp.annualDep}: </span>
            <span className="mono">{fmt(annualDep)}</span>
          </div>
        )}

        {/* Receipt upload + preview */}
        <div className="form-group" style={{ marginTop: 16 }}>
          <label>{t.scan.title}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isEdit && <ReceiptThumbnail expenseId={id} size={60} />}
            <label
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            >
              <Upload size={16} />
              {t.scan.upload}
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </label>
            {(receiptName || form.receiptFile) && (
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
                {receiptName || form.receiptFile}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {t.exp.save}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/expenses')}>
            {t.exp.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
