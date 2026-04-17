import { useContext, useState, useRef } from 'react';
import { AppContext } from '../hooks/useAppData';
import { useTranslation } from '../hooks/useTranslation';
import { fmt } from '../utils/format';
import { parseCSV } from '../utils/csv';
import Card from '../components/shared/Card';
import { useToast } from '../components/shared/Toast';
import { Upload, Check, X, FileSpreadsheet, ArrowDownCircle, ArrowUpCircle, AlertCircle } from 'lucide-react';
import '../components/shared/shared.css';

export default function BankImportScreen() {
  const { saveExpense, refresh } = useContext(AppContext);
  const { t } = useTranslation();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [transactions, setTransactions] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [importedCount, setImportedCount] = useState(0);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setDone(false);
    setParseError('');
    setParsing(true);
    setTransactions([]);
    setSelected(new Set());

    try {
      const text = await file.text();
      if (!text || text.trim().length === 0) {
        throw new Error('File is empty');
      }
      const parsed = parseCSV(text);

      if (parsed.length === 0) {
        throw new Error('No transactions found in file. Check that it has at least a header row and one data row.');
      }

      setTransactions(parsed);
      // Select all expense (negative) transactions by default
      const defaultSelected = new Set();
      parsed.forEach((tx, i) => {
        if (tx.amount < 0) defaultSelected.add(i);
      });
      setSelected(defaultSelected);
      toast.success(`Found ${parsed.length} transactions (${defaultSelected.size} selected)`);
    } catch (err) {
      console.error('CSV parse error:', err);
      setParseError(err.message || 'Failed to parse CSV');
      toast.error(err.message || 'Failed to parse CSV');
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
    setImportProgress(0);
    const total = selected.size;
    let ok = 0;
    let failed = 0;

    try {
      const indices = [...selected];
      for (let i = 0; i < indices.length; i++) {
        const idx = indices[i];
        const tx = transactions[idx];
        if (!tx) continue;
        try {
          await saveExpense({
            description: [tx.counterparty, tx.description].filter(Boolean).join(' — ') || 'Bank import',
            amount: Math.abs(tx.amount),
            date: tx.date,
            category: 'other',
            vatRate: 21,
            supplier: tx.counterparty || '',
            isAsset: false,
            depYears: 0,
            residualValue: 0,
          });
          ok++;
        } catch (e) {
          console.error('Failed to save transaction', tx, e);
          failed++;
        }
        setImportProgress(i + 1);
      }
      setImportedCount(ok);
      setDone(true);
      await refresh();
      if (failed > 0) {
        toast.error(`Imported ${ok}/${total} — ${failed} failed. Check console.`);
      } else {
        toast.success(`Imported ${ok} transactions as expenses`);
      }
    } catch (err) {
      console.error('Import failed:', err);
      toast.error(`Import failed: ${err.message}`);
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
          {parsing && (
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 8 }}>Parsing...</p>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,application/vnd.ms-excel"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </Card>

      {/* Parse error */}
      {parseError && (
        <Card style={{ marginBottom: 20, borderLeft: '3px solid var(--color-error)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <AlertCircle size={20} color="var(--color-error)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>Could not parse CSV</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{parseError}</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 8 }}>
                Try downloading a fresh CSV export from your bank. Supported: ING, ABN AMRO, Rabobank.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Import progress */}
      {importing && (
        <Card style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 14, marginBottom: 8 }}>
            Importing {importProgress} of {selected.size}...
          </p>
          <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: 'var(--color-primary)',
                width: `${(importProgress / Math.max(selected.size, 1)) * 100}%`,
                transition: 'width 0.2s',
              }}
            />
          </div>
        </Card>
      )}

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
            <button className="btn btn-secondary" onClick={() => { setTransactions([]); setSelected(new Set()); setFileName(''); setParseError(''); }}>
              <X size={16} /> {t.common.cancel}
            </button>
          </div>
        </>
      )}

      {/* Done state */}
      {done && (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <Check size={48} color="var(--color-success)" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            {importedCount} transactions imported as expenses
          </p>
          <button
            className="btn btn-secondary"
            onClick={() => { setTransactions([]); setSelected(new Set()); setFileName(''); setDone(false); setImportedCount(0); setImportProgress(0); }}
            style={{ marginTop: 12 }}
          >
            Import More
          </button>
        </Card>
      )}
    </div>
  );
}
