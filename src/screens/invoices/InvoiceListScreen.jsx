import { useContext, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../hooks/useAppData';
import { useTranslation } from '../../hooks/useTranslation';
import { fmt } from '../../utils/format';
import Badge from '../../components/shared/Badge';
import Modal from '../../components/shared/Modal';
import { Plus, Search, Pencil, Trash2, FileText } from 'lucide-react';
import '../../components/shared/shared.css';

export default function InvoiceListScreen() {
  const { invoices, removeInvoice } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const now = new Date().toISOString().slice(0, 10);

  const getStatus = (inv) => {
    if (inv.status === 'paid') return 'paid';
    if (inv.dueDate && inv.dueDate < now) return 'overdue';
    return 'unpaid';
  };

  const filtered = useMemo(() => {
    let list = [...invoices];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (inv) =>
          (inv.client || '').toLowerCase().includes(q) ||
          (inv.number || '').toLowerCase().includes(q),
      );
    }

    // Status filter
    if (filter === 'paid') {
      list = list.filter((inv) => inv.status === 'paid');
    } else if (filter === 'unpaid') {
      list = list.filter((inv) => inv.status !== 'paid' && !(inv.dueDate && inv.dueDate < now));
    } else if (filter === 'overdue') {
      list = list.filter((inv) => inv.status !== 'paid' && inv.dueDate && inv.dueDate < now);
    }

    // Sort by date descending
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return list;
  }, [invoices, search, filter, now]);

  const filters = [
    { key: 'all', label: t.inv.all },
    { key: 'unpaid', label: t.inv.unpaid },
    { key: 'paid', label: t.inv.paid },
    { key: 'overdue', label: t.inv.overdue },
  ];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await removeInvoice(deleteTarget);
    setDeleteTarget(null);
  };

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <h1>{t.inv.title}</h1>
        <button className="btn btn-primary" onClick={() => navigate('/invoices/new')}>
          <Plus size={16} />
          {t.inv.add}
        </button>
      </div>

      {/* Search */}
      <div className="search-box" style={{ marginBottom: 12 }}>
        <Search size={16} />
        <input
          type="text"
          className="input"
          placeholder={t.inv.search}
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
          <p>{t.inv.empty}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{t.inv.num}</th>
                <th>{t.inv.client}</th>
                <th>{t.inv.date}</th>
                <th>{t.inv.due}</th>
                <th style={{ textAlign: 'right' }}>{t.inv.amt}</th>
                <th>{t.inv.status}</th>
                <th style={{ textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const status = getStatus(inv);
                return (
                  <tr
                    key={inv.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                  >
                    <td style={{ fontWeight: 500 }}>{inv.number || '-'}</td>
                    <td>{inv.client || '-'}</td>
                    <td>{inv.date || '-'}</td>
                    <td>{inv.dueDate || '-'}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {fmt(inv.amount)}
                    </td>
                    <td>
                      <Badge status={status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div
                        style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="btn btn-ghost btn-sm"
                          title={t.inv.edit}
                          onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          title={t.inv.del}
                          onClick={() => setDeleteTarget(inv.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t.inv.del}>
        <p style={{ marginBottom: 16 }}>Are you sure you want to delete this invoice?</p>
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
