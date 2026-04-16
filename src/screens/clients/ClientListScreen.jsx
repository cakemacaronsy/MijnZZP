import { useContext, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../hooks/useAppData';
import { useTranslation } from '../../hooks/useTranslation';
import Card from '../../components/shared/Card';
import { Plus, Search, User, Building, Mail, Phone } from 'lucide-react';
import '../../components/shared/shared.css';

export default function ClientListScreen() {
  const { clients } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  }, [clients, search]);

  return (
    <div>
      <div className="page-header">
        <h1>{t.clients.title}</h1>
        <button className="btn btn-primary" onClick={() => navigate('/clients/new')}>
          <Plus size={16} /> {t.clients.add}
        </button>
      </div>

      <div style={{ marginBottom: 20, position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
        <input
          className="input"
          type="text"
          placeholder={t.clients.search}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 36 }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">{t.clients.empty}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(client => (
            <Card
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={18} color="var(--color-primary)" />
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{client.name}</span>
                </div>
                {client.company && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    <Building size={14} />
                    <span>{client.company}</span>
                  </div>
                )}
                {client.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    <Mail size={14} />
                    <span>{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    <Phone size={14} />
                    <span>{client.phone}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
