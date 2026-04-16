import { useContext, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../hooks/useAppData';
import { useTranslation } from '../../hooks/useTranslation';
import { fmt } from '../../utils/format';
import Card from '../../components/shared/Card';
import Modal from '../../components/shared/Modal';
import { Plus, Trash2, Edit, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import '../../components/shared/shared.css';

export default function PersonalListScreen() {
  const { personalItems, removePersonalItem } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [deleteId, setDeleteId] = useState(null);

  const filtered = useMemo(() => {
    let items = [...personalItems].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (filter === 'income') items = items.filter(i => i.side === 'income');
    if (filter === 'expense') items = items.filter(i => i.side === 'expense');
    return items;
  }, [personalItems, filter]);

  const totals = useMemo(() => {
    const inc = personalItems.filter(i => i.side === 'income').reduce((s, i) => s + (i.amount || 0), 0);
    const exp = personalItems.filter(i => i.side === 'expense').reduce((s, i) => s + (i.amount || 0), 0);
    return { income: inc, expense: exp };
  }, [personalItems]);

  const handleDelete = async () => {
    if (deleteId) {
      await removePersonalItem(deleteId);
      setDeleteId(null);
    }
  };

  const filters = [
    { key: 'all', label: t.inv.all },
    { key: 'income', label: t.priv.income },
    { key: 'expense', label: t.priv.expenses },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>{t.priv.title}</h1>
        <button className="btn btn-primary" onClick={() => navigate('/personal/new')}>
          <Plus size={16} /> {t.priv.add}
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <Card>
          <div className="stat-card">
            <span className="label">{t.priv.totalIncome}</span>
            <span className="value" style={{ color: 'var(--color-success)' }}>{fmt(totals.income)}</span>
          </div>
        </Card>
        <Card>
          <div className="stat-card">
            <span className="label">{t.priv.totalExpense}</span>
            <span className="value" style={{ color: 'var(--color-error)' }}>{fmt(totals.expense)}</span>
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {filters.map(f => (
          <button
            key={f.key}
            className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">{t.priv.noItems}</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{t.priv.date}</th>
                <th>{t.priv.type}</th>
                <th>Subtype</th>
                <th>{t.priv.desc}</th>
                <th style={{ textAlign: 'right' }}>{t.priv.amount}</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td>{item.date}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {item.side === 'income' ? (
                        <ArrowUpCircle size={14} color="var(--color-success)" />
                      ) : (
                        <ArrowDownCircle size={14} color="var(--color-error)" />
                      )}
                      {item.side === 'income' ? t.priv.income : t.priv.expenses}
                    </span>
                  </td>
                  <td>{item.subtype || '-'}</td>
                  <td>{item.description || '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="mono" style={{ color: item.side === 'income' ? 'var(--color-success)' : 'var(--color-error)' }}>
                      {fmt(item.amount)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/personal/${item.id}/edit`)}>
                        <Edit size={14} />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setDeleteId(item.id)}>
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

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title={t.priv.del}>
        <p style={{ marginBottom: 16 }}>Are you sure you want to delete this item?</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>{t.priv.cancel}</button>
          <button className="btn btn-danger" onClick={handleDelete}>{t.priv.del}</button>
        </div>
      </Modal>
    </div>
  );
}
