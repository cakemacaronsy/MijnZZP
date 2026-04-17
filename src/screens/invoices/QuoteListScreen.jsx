import { useContext, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../hooks/useAppData';
import { useTranslation } from '../../hooks/useTranslation';
import { fmt } from '../../utils/format';
import Badge from '../../components/shared/Badge';
import Modal from '../../components/shared/Modal';
import { Plus, Search, Pencil, Trash2, FileText } from 'lucide-react';
import '../../components/shared/shared.css';

export default function QuoteListScreen() {
  const { quotes, removeQuote } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtered = useMemo(() => {
    let list = [...quotes];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (qt) =>
          (qt.client || '').toLowerCase().includes(q) ||
          (qt.number || '').toLowerCase().includes(q),
      );
    }

    if (filter !== 'all') {
      list = list.filter((qt) => qt.status === filter);
    }

    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return list;
  }, [quotes, search, filter]);

  const filters = [
    { key: 'all', label: t.inv.all },
    { key: 'draft', label: t.quote.draft },
    { key: 'sent', label: t.quote.sent },
    { key: 'accepted', label: t.quote.accepted },
    { key: 'invoiced', label: t.quote.invoiced },
  ];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await removeQuote(deleteTarget);
    setDeleteTarget(null);
  };

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <h1>{t.quote.title}</h1>
        <button className="btn btn-primary" onClick={() => navigate('/quotes/new')}>
          <Plus size={16} />
          {t.quote.add}
        </button>
      </div>

      {/* Search */}
      <div className="search-box" style={{ marginBottom: 12 }}>
        <Search size={16} />
        <input
          type="text"
          className="input"
          placeholder={t.quote.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filter pills */}
      <div className="filter-pills" style={{ marginBottom: 16 }}>
        {filters.map((f) => (
          <button
            key={f.key}
            className={`filter-pill ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table or empty state */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <p>{t.quote.empty}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{t.quote.num}</th>
                <th>{t.inv.client}</th>
                <th>{t.inv.date}</th>
                <th>{t.quote.validUntil}</th>
                <th style={{ textAlign: 'right' }}>{t.inv.amt}</th>
                <th>{t.quote.status}</th>
                <th style={{ textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((qt) => (
                <tr
                  key={qt.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/quotes/${qt.id}`)}
                >
                  <td style={{ fontWeight: 500 }}>{qt.number || '-'}</td>
                  <td>{qt.client || '-'}</td>
                  <td>{qt.date || '-'}</td>
                  <td>{qt.validUntil || '-'}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {fmt(qt.amount)}
                  </td>
                  <td>
                    <Badge status={qt.status || 'draft'} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div
                      style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="btn btn-ghost btn-sm"
                        title={t.inv.edit}
                        onClick={() => navigate(`/quotes/${qt.id}/edit`)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        title={t.inv.del}
                        onClick={() => setDeleteTarget(qt.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t.inv.del}>
        <p style={{ marginBottom: 16 }}>{t.common.confirmDeleteQuote}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
            {t.inv.cancel}
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            {t.inv.del}
          </button>
        </div>
      </Modal>
    </div>
  );
}
