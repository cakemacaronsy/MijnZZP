import { useContext, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../../hooks/useAppData';
import { useTranslation } from '../../hooks/useTranslation';
import Card from '../../components/shared/Card';
import { Save, ArrowLeft } from 'lucide-react';
import '../../components/shared/shared.css';

export default function PackageFormScreen() {
  const { savePackage } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: clientId } = useParams();

  const [form, setForm] = useState({
    name: '',
    totalSessions: '10',
    price: '',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    await savePackage({
      clientId,
      name: form.name,
      totalSessions: parseInt(form.totalSessions, 10) || 10,
      price: parseFloat(form.price) || 0,
    });
    navigate(`/clients/${clientId}`);
  };

  return (
    <div>
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate(`/clients/${clientId}`)}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1>{t.clients?.addPackage || 'Add Package'}</h1>
      </div>

      <Card style={{ maxWidth: 500 }}>
        <div className="form-group">
          <label>{t.clients?.pkgName || 'Package Name'}</label>
          <input className="input" type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. 10-Session Coaching" />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t.clients?.pkgSessions || 'Total Sessions'}</label>
            <input className="input" type="number" min="1" value={form.totalSessions} onChange={e => set('totalSessions', e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t.clients?.pkgPrice || 'Price'}</label>
            <input className="input" type="number" step="0.01" min="0" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={!form.name.trim()}>
            <Save size={16} /> Save
          </button>
          <button className="btn btn-secondary" onClick={() => navigate(`/clients/${clientId}`)}>
            Cancel
          </button>
        </div>
      </Card>
    </div>
  );
}
