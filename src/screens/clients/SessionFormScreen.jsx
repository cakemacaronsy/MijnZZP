import { useContext, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../../hooks/useAppData';
import { useTranslation } from '../../hooks/useTranslation';
import Card from '../../components/shared/Card';
import { Save, ArrowLeft } from 'lucide-react';
import '../../components/shared/shared.css';

export default function SessionFormScreen() {
  const { saveSession } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: clientId } = useParams();

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: '',
    duration: '60',
    sessionType: 'consultation',
    notes: '',
    status: 'scheduled',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    await saveSession({
      clientId,
      date: form.date,
      time: form.time,
      duration: parseInt(form.duration, 10) || 60,
      sessionType: form.sessionType,
      notes: form.notes,
      status: form.status,
    });
    navigate(`/clients/${clientId}`);
  };

  const sessionTypes = t.clients?.sessionTypes || {
    consultation: 'Consultation',
    coaching: 'Coaching',
    training: 'Training',
    workshop: 'Workshop',
    other: 'Other',
  };

  return (
    <div>
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate(`/clients/${clientId}`)}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1>{t.clients?.addSession || 'Add Session'}</h1>
      </div>

      <Card style={{ maxWidth: 500 }}>
        <div className="form-row">
          <div className="form-group">
            <label>{t.clients?.sessionDate || 'Date'}</label>
            <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t.clients?.sessionTime || 'Time'}</label>
            <input className="input" type="time" value={form.time} onChange={e => set('time', e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t.clients?.sessionDuration || 'Duration (min)'}</label>
            <input className="input" type="number" min="1" value={form.duration} onChange={e => set('duration', e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t.clients?.sessionType || 'Type'}</label>
            <select className="input" value={form.sessionType} onChange={e => set('sessionType', e.target.value)}>
              {Object.entries(sessionTypes).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>{t.clients?.sessionStatus || 'Status'}</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="form-group">
          <label>{t.clients?.sessionNotes || 'Notes'}</label>
          <textarea className="input" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button className="btn btn-primary" onClick={handleSave}>
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
