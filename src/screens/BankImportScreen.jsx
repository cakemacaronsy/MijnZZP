import { useContext, useState, useRef } from 'react';
import { AppContext } from '../hooks/useAppData';
import { useTranslation } from '../hooks/useTranslation';
import { fmt } from '../utils/format';
import { parseCSV } from '../utils/csv';
import Card from '../components/shared/Card';
import { Upload, Check, X, FileSpreadsheet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import '../components/shared/shared.css';

export default function BankImportScreen() {
  const { saveExpense } = useContext(AppContext);
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  const [transactions, setTransactions] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setDone(false);

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      setTransactions(parsed);
      // Select all expense (negative) transactions by default
      const defaultSelected = new Set();
      parsed.forEach((tx, i) => {
        if (tx.amount < 0) defaultSelected.add(i);
      });
      setSelected(defaultSelected);
    } catch (err) {
      console.error('CSV parse error:', err);
      setTransactions([]);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleSelect = (index) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    const all = new Set();
    transactions.forEach((_, i) => all.add(i));
    setSelected(all);
  };

  const selectNone = () => setSelected(new Set());

  const handleImport = async () => {
    setImporting(true);
    try {
      for (const idx of selected) {
        const tx = transactions[idx];
        if (!tx) continue;
        await saveExpense({
          description: [tx.counterparty, tx.description].filter(Boolean).join(' — '),
          amount: Math.abs(tx.amount),
          date: tx.date,
          category: 'other',
          vatRate: 21,
          supplier: tx.counterparty || '',
        });
      }
      setDone(true);
    } catch (err) {
      console.error('Import failed:', err);
    }
    setImporting(false);
  };

  const selectedCount = selected.size;
  const selectedTotal = [...selected].reduce((sum, i) => sum + Math.abs(transactions[i]?.amount || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1>{t.bank.title}</h1>
      </div>

      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>{t.bank.sub}</p>

      {/* Upload area */}
      <Card style={{ marginBottom: 20 }}>
        <div
          style={{
            border: '2px dashed var(--color-border, #d1d5db)',
            borderRadius: 12,
            padding: 40,
            textAlign: 'center',
            cursor: 'pointer',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <FileSpreadsheet size={40} color="var(--color-text-secondary)" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{t.bank.upload}</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{t.common.bankFormats}</p>
          {fileName && (
            <p style={{ fontSize: 13, color: 'var(--color-primary)', marginTop: 8 }}>{fileName}</p>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </Card>

      {/* Transaction preview */}
      {transactions.length > 0 && !done && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14 }}>
              {transactions.length} {t.bank.found}
              {selectedCount > 0 && (
                <span style={{ marginLeft: 8, color: 'var(--color-primary)' }}>
                  ({selectedCount} selected, {fmt(selectedTotal)})
                </span>
              )}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={selectAll}>{t.common.selectAll}</button>
              <button className="btn btn-ghost btn-sm" onClick={selectNone}>{t.common.selectNone}</button>
            </div>
          </div>

          <div className="table-wrapper" style={{ marginBottom: 20 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Date</th>
                  <th>Counterparty</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <tr
                    key={i}
                    style={{
                      opacity: selected.has(i) ? 1 : 0.5,
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleSelect(i)}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(i)}
                        onChange={() => toggleSelect(i)}
                        onClick={e => e.stopPropagation()}
                      />
                    </td>
                    <td>{tx.date}</td>
                    <td>{tx.counterparty || '-'}</td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.description || '-'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        className="mono"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          color: tx.amount < 0 ? 'var(--color-error)' : 'var(--color-success)',
                        }}
                      >
                        {tx.amount < 0 ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                        {fmt(tx.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={selectedCount === 0 || importing}
            >
              {importing ? t.bank.parsing : (
                <><Check size={16} /> {t.bank.bookSelected} ({selectedCount})</>
              )}
            </button>
            <button className="btn btn-secondary" onClick={() => { setTransactions([]); setSelected(new Set()); setFileName(''); }}>
              <X size={16} /> Cancel
            </button>
          </div>
        </>
      )}

      {/* Done state */}
      {done && (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <Check size={48} color="var(--color-success)" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            {selectedCount} transactions imported as expenses
          </p>
          <button
            className="btn btn-secondary"
            onClick={() => { setTransactions([]); setSelected(new Set()); setFileName(''); setDone(false); }}
            style={{ marginTop: 12 }}
          >
            Import More
          </button>
        </Card>
      )}
    </div>
  );
}
