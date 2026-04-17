import { useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../../hooks/useAppData';
import { useTranslation } from '../../hooks/useTranslation';
import { fmt } from '../../utils/format';
import Card from '../../components/shared/Card';
import Modal from '../../components/shared/Modal';
import Badge from '../../components/shared/Badge';
import { ArrowLeft, Edit, Trash2, Plus, User, Building, Mail, Phone, MapPin, FileText, Clock, Package } from 'lucide-react';
import '../../components/shared/shared.css';

export default function ClientDetailScreen() {
  const {
    clients, removeClient,
    getSessionsForClient, removeSession,
    getPackagesForClient, removePackage,
  } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();

  const client = clients.find(c => c.id === id);
  const [sessions, setSessions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState(null);
  const [deletePackageId, setDeletePackageId] = useState(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [s, p] = await Promise.all([
        getSessionsForClient(id),
        getPackagesForClient(id),
      ]);
      setSessions(s || []);
      setPackages(p || []);
    } catch (e) {
      console.warn('Failed to load client data:', e);
    }
  }, [id, getSessionsForClient, getPackagesForClient]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!client) {
    return (
      <div>
        <button className="btn btn-ghost" onClick={() => navigate('/clients')}>
          <ArrowLeft size={16} /> {t.common.back}
        </button>
        <div className="empty-state">Client not found</div>
      </div>
    );
  }

  const handleDeleteClient = async () => {
    await removeClient(id);
    navigate('/clients');
  };

  const handleDeleteSession = async () => {
    if (deleteSessionId) {
      await removeSession(deleteSessionId);
      setDeleteSessionId(null);
      loadData();
    }
  };

  const handleDeletePackage = async () => {
    if (deletePackageId) {
      await removePackage(deletePackageId);
      setDeletePackageId(null);
      loadData();
    }
  };

  return (
    <div>
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/clients')}>
          <ArrowLeft size={16} /> {t.common.back}
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => navigate(`/clients/${id}/edit`)}>
            <Edit size={16} /> {t.clients.edit}
          </button>
          <button className="btn btn-danger" onClick={() => setShowDeleteModal(true)}>
            <Trash2 size={16} /> {t.clients.del}
          </button>
        </div>
      </div>

      {/* Client Info */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <User size={24} color="var(--color-primary)" />
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>{client.name}</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
            {client.company && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building size={16} color="var(--color-text-secondary)" />
                <span>{client.company}</span>
              </div>
            )}
            {client.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={16} color="var(--color-text-secondary)" />
                <a href={`mailto:${client.email}`} style={{ color: 'var(--color-secondary)' }}>{client.email}</a>
              </div>
            )}
            {client.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={16} color="var(--color-text-secondary)" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={16} color="var(--color-text-secondary)" />
                <span>{client.address}</span>
              </div>
            )}
          </div>

          {client.notes && (
            <div style={{ marginTop: 8, padding: 12, background: 'var(--color-bg-secondary, #f9fafb)', borderRadius: 8, fontSize: 13 }}>
              <FileText size={14} style={{ display: 'inline', marginRight: 6 }} />
              {client.notes}
            </div>
          )}

          {client.followupDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <Clock size={14} color="var(--color-warning, #EAB308)" />
              <span>{t.clients.followup}: {client.followupDate}</span>
              <Badge status={client.followupDone ? 'completed' : 'pending'} />
            </div>
          )}
        </div>
      </Card>

      {/* Sessions */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>{t.clients.sessions}</h3>
          <button className="btn btn-sm btn-primary" onClick={() => navigate(`/clients/${id}/sessions/new`)}>
            <Plus size={14} /> {t.clients.addSession}
          </button>
        </div>

        {sessions.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{t.clients.noSessions}</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{t.clients.sessionDate}</th>
                  <th>{t.clients.sessionType}</th>
                  <th>{t.clients.sessionDuration}</th>
                  <th>{t.clients.sessionStatus}</th>
                  <th>{t.clients.sessionNotes}</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td>{s.date} {s.time && <span style={{ color: 'var(--color-text-secondary)' }}>{s.time}</span>}</td>
                    <td>{t.clients.sessionTypes?.[s.sessionType] || s.sessionType || '-'}</td>
                    <td>{s.duration ? `${s.duration} min` : '-'}</td>
                    <td><Badge status={s.status || 'scheduled'} /></td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.notes || '-'}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => setDeleteSessionId(s.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Packages */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>{t.clients.packages}</h3>
          <button className="btn btn-sm btn-primary" onClick={() => navigate(`/clients/${id}/packages/new`)}>
            <Plus size={14} /> {t.clients.addPackage}
          </button>
        </div>

        {packages.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{t.clients.noPkgs}</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{t.clients.pkgName}</th>
                  <th>{t.clients.pkgSessions}</th>
                  <th>{t.clients.pkgUsed}</th>
                  <th>{t.clients.pkgRemaining}</th>
                  <th>{t.clients.pkgPrice}</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {packages.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td className="mono">{p.totalSessions || 0}</td>
                    <td className="mono">{p.usedSessions || 0}</td>
                    <td className="mono">{(p.totalSessions || 0) - (p.usedSessions || 0)}</td>
                    <td className="mono">{fmt(p.price)}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => setDeletePackageId(p.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Delete Client Modal */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title={t.clients.del}>
        <p style={{ marginBottom: 16 }}>{t.common.confirmDeleteClient}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>{t.clients.cancel}</button>
          <button className="btn btn-danger" onClick={handleDeleteClient}>{t.clients.del}</button>
        </div>
      </Modal>

      {/* Delete Session Modal */}
      <Modal open={!!deleteSessionId} onClose={() => setDeleteSessionId(null)} title={t.common.deleteSession}>
        <p style={{ marginBottom: 16 }}>{t.common.confirmDeleteSession}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setDeleteSessionId(null)}>{t.common.cancel}</button>
          <button className="btn btn-danger" onClick={handleDeleteSession}>{t.common.delete}</button>
        </div>
      </Modal>

      {/* Delete Package Modal */}
      <Modal open={!!deletePackageId} onClose={() => setDeletePackageId(null)} title={t.common.deletePackage}>
        <p style={{ marginBottom: 16 }}>{t.common.confirmDeletePackage}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setDeletePackageId(null)}>{t.common.cancel}</button>
          <button className="btn btn-danger" onClick={handleDeletePackage}>{t.common.delete}</button>
        </div>
      </Modal>
    </div>
  );
}
