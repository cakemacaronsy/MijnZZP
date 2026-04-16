import { useContext, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../../hooks/useAppData';
import { useTranslation } from '../../hooks/useTranslation';
import Card from '../../components/shared/Card';
import { Save, ArrowLeft } from 'lucide-react';
import '../../components/shared/shared.css';

export default function ClientFormScreen() {
  const { clients, saveClient } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();

  const isEdit = id && id !== 'new';
  const existing = isEdit ? clients.find(c => c.id === id) : null;

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    notes: '',
    followupDate: '',
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || '',
        email: existing.email || '',
        phone: existing.phone || '',
        company: existing.company || '',
        address: existing.address || '',
        notes: existing.notes || '',
        followupDate: existing.followupDate || '',
      });
    }
  }, [existing]);

  const handleSave = async () => {
    const client = {
      ...(existing || {}),
      name: form.name,
      email: form.email,
      phone: form.phone,
      company: form.company,
      address: form.address,
      notes: form.notes,
      followupDate: form.followupDate || null,
    };
    await saveClient(client);
    navigate(isEdit ? `/clients/${id}` : '/clients');
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div>
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate(isEdit ? `/clients/${id}` : '/clients')}>
          <ArrowLeft size={16} /> {t.clients.cancel}
        </button>
        <h1>{isEdit ? t.clients.edit : t.clients.add}</h1>
      </div>

      <Card style={{ maxWidth: 600 }}>
        <div className="form-group">
          <label>{t.clients.name} *</label>
          <input
            className="input"
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder={t.clients.name}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t.clients.email}</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder={t.clients.email}
            />
          </div>
          <div className="form-group">
            <label>{t.clients.phone}</label>
            <input
              className="input"
              type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder={t.clients.phone}
            />
          </div>
        </div>

        <div className="form-group">
          <label>{t.clients.company}</label>
          <input
            className="input"
            type="text"
            value={form.company}
            onChange={e => set('company', e.target.value)}
            placeholder={t.clients.company}
          />
        </div>

        <div className="form-group">
          <label>{t.clients.address}</label>
          <textarea
            className="input"
            value={form.address}
            onChange={e => set('address', e.target.value)}
            placeholder={t.clients.address}
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>{t.clients.notes}</label>
          <textarea
            className="input"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder={t.clients.notes}
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>{t.clients.followupDate}</label>
          <input
            className="input"
            type="date"
            value={form.followupDate}
            onChange={e => set('followupDate', e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={!form.name.trim()}>
            <Save size={16} /> {t.clients.save}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate(isEdit ? `/clients/${id}` : '/clients')}>
            {t.clients.cancel}
          </button>
        </div>
      </Card>
    </div>
  );
}
