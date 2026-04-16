import { useContext, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../hooks/useAppData';
import { useTranslation } from '../../hooks/useTranslation';
import { fmt } from '../../utils/format';
import { CATS } from '../../constants/categories';
import Modal from '../../components/shared/Modal';
import { Plus, Search, Pencil, Trash2, Receipt } from 'lucide-react';
import '../../components/shared/shared.css';

export default function ExpenseListScreen() {
  const { expenses, removeExpense } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtered = useMemo(() => {
    let list = [...expenses];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          (e.description || '').toLowerCase().includes(q) ||
          (e.supplier || '').toLowerCase().includes(q) ||
          (e.category || '').toLowerCase().includes(q),
      );
    }

    if (filter !== 'all') {
      list = list.filter((e) => e.category === filter);
    }

    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return list;
  }, [expenses, search, filter]);

  const filters = [
    { key: 'all', label: t.exp.all },
    ...CATS.map((c) => ({ key: c, label: t.exp.cats[c] || c })),
  ];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await removeExpense(deleteTarget);
    setDeleteTarget(null);
  };

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <h1>{t.exp.title}</h1>
        <button className="btn btn-primary" onClick={() => navigate('/expenses/new')}>
          <Plus size={16} />
          {t.exp.add}
        </button>
      </div>

      {/* Search */}
      <div className="search-box" style={{ marginBottom: 12 }}>
        <Search size={16} />
        <input
          type="text"
          className="input"
          placeholder={t.exp.search}
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
          <Receipt size={48} />
          <p>{t.exp.empty}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{t.exp.date}</th>
                <th>{t.exp.desc}</th>
                <th>{t.exp.cat}</th>
                <th>{t.exp.sup}</th>
                <th style={{ textAlign: 'right' }}>{t.exp.amt}</th>
                <th>{t.exp.vat}</th>
                <th style={{ textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((exp) => (
                <tr
                  key={exp.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/expenses/${exp.id}/edit`)}
                >
                  <td>{exp.date || '-'}</td>
                  <td style={{ fontWeight: 500 }}>{exp.description || '-'}</td>
                  <td>{t.exp.cats[exp.category] || exp.category || '-'}</td>
                  <td>{exp.supplier || '-'}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {fmt(exp.amount)}
                  </td>
                  <td>{exp.vatRate != null ? `${exp.vatRate}%` : '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div
                      style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="btn btn-ghost btn-sm"
                        title={t.exp.edit}
                        onClick={() => navigate(`/expenses/${exp.id}/edit`)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        title={t.exp.del}
                        onClick={() => setDeleteTarget(exp.id)}
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
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t.exp.del}>
        <p style={{ marginBottom: 16 }}>Are you sure you want to delete this expense?</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
            {t.exp.cancel}
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            {t.exp.del}
          </button>
        </div>
      </Modal>
    </div>
  );
}
