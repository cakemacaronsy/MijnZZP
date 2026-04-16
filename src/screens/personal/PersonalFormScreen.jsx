import { useContext, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../../hooks/useAppData';
import { useTranslation } from '../../hooks/useTranslation';
import Card from '../../components/shared/Card';
import { Save, ArrowLeft } from 'lucide-react';
import '../../components/shared/shared.css';

export default function PersonalFormScreen() {
  const { personalItems, savePersonalItem } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();

  const isEdit = id && id !== 'new';
  const existing = isEdit ? personalItems.find(i => i.id === id) : null;

  const [form, setForm] = useState({
    side: 'income',
    subtype: '',
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (existing) {
      setForm({
        side: existing.side || 'income',
        subtype: existing.subtype || '',
        description: existing.description || '',
        amount: existing.amount?.toString() || '',
        date: existing.date || new Date().toISOString().slice(0, 10),
      });
    }
  }, [existing]);

  const subtypeOptions = form.side === 'income' ? t.priv.incomeTypes : t.priv.expenseTypes;

  const handleSave = async () => {
    const item = {
      ...(existing || {}),
      side: form.side,
      subtype: form.subtype,
      description: form.description,
      amount: parseFloat(form.amount) || 0,
      date: form.date,
    };
    await savePersonalItem(item);
    navigate('/personal');
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div>
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/personal')}>
          <ArrowLeft size={16} /> {t.priv.cancel}
        </button>
        <h1>{isEdit ? t.priv.edit : t.priv.add}</h1>
      </div>

      <Card style={{ maxWidth: 600 }}>
        <div className="form-group">
          <label>{t.priv.type}</label>
          <select className="input" value={form.side} onChange={e => { set('side', e.target.value); set('subtype', ''); }}>
            <option value="income">{t.priv.income}</option>
            <option value="expense">{t.priv.expenses}</option>
          </select>
        </div>

        <div className="form-group">
          <label>Subtype</label>
          <select className="input" value={form.subtype} onChange={e => set('subtype', e.target.value)}>
            <option value="">-- Select --</option>
            {Object.entries(subtypeOptions).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>{t.priv.desc}</label>
          <input
            className="input"
            type="text"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder={t.priv.desc}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t.priv.amount}</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label>{t.priv.date}</label>
            <input
              className="input"
              type="date"
              value={form.date}
              onChange={e => set('date', e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={16} /> {t.priv.save}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/personal')}>
            {t.priv.cancel}
          </button>
        </div>
      </Card>
    </div>
  );
}
