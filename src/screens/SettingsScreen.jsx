import { useContext, useState, useEffect, useRef } from 'react';
import { AppContext } from '../hooks/useAppData';
import { useTranslation } from '../hooks/useTranslation';
import { getApiKey, setApiKey } from '../services/claude';
import Card from '../components/shared/Card';
import { useToast } from '../components/shared/Toast';
import { Save, Download, Upload, Eye, EyeOff, Globe, Clock, Key } from 'lucide-react';
import '../components/shared/shared.css';

export default function SettingsScreen() {
  const {
    settings, profile, updateSettings, updateProfile,
    invoices, expenses, quotes, personalItems, clients,
  } = useContext(AppContext);
  const { t } = useTranslation();
  const toast = useToast();

  // Profile form
  const [prof, setProf] = useState({
    companyName: '', address: '', postal: '', phone: '', email: '',
    web: '', kvk: '', btw: '', iban: '', paymentDays: '30',
  });

  // App settings form
  const [lang, setLang] = useState(settings.lang || 'en');
  const [isStarter, setIsStarter] = useState(!!settings.isStarter);
  const [workedHours, setWorkedHours] = useState(settings.workedHours?.toString() || '0');

  // API key
  const [apiKey, setApiKeyState] = useState('');
  const [showKey, setShowKey] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    setProf({
      companyName: profile.companyName || '',
      address: profile.address || '',
      postal: profile.postal || '',
      phone: profile.phone || '',
      email: profile.email || '',
      web: profile.web || '',
      kvk: profile.kvk || '',
      btw: profile.btw || '',
      iban: profile.iban || '',
      paymentDays: profile.paymentDays?.toString() || '30',
    });
  }, [profile]);

  useEffect(() => {
    setApiKeyState(getApiKey() || '');
  }, []);

  const saveProfile = async () => {
    try {
      await updateProfile({
        ...prof,
        paymentDays: parseInt(prof.paymentDays, 10) || 30,
      });
      toast.success(t.common.saved);
    } catch (e) {
      toast.error(`${t.common.saveFailed}: ${e.message}`);
    }
  };

  const saveAppSettings = async () => {
    try {
      await updateSettings({
        lang,
        isStarter,
        workedHours: parseInt(workedHours, 10) || 0,
      });
      toast.success(t.common.saved);
    } catch (e) {
      toast.error(`${t.common.saveFailed}: ${e.message}`);
    }
  };

  const saveApiKeyHandler = () => {
    setApiKey(apiKey.trim() || null);
    toast.success(t.common.saved);
  };

  const handleExport = () => {
    const data = {
      exportDate: new Date().toISOString(),
      settings,
      profile,
      invoices,
      expenses,
      quotes,
      personalItems,
      clients,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mijnzzp-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.settings) await updateSettings(data.settings);
      if (data.profile) await updateProfile(data.profile);
      toast.success(t.backup.restored);
    } catch (err) {
      console.error('Import failed:', err);
      toast.error('Import failed. Invalid file format.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const setP = (key, val) => setProf(p => ({ ...p, [key]: val }));

  return (
    <div>
      <div className="page-header">
        <h1>{t.common.settings}</h1>
      </div>

      {/* Company Profile */}
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t.inv.profileTitle}</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>{t.inv.profileHint}</p>

        <div className="form-row">
          <div className="form-group">
            <label>{t.inv.companyName}</label>
            <input className="input" type="text" value={prof.companyName} onChange={e => setP('companyName', e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t.inv.companyKvk}</label>
            <input className="input" type="text" value={prof.kvk} onChange={e => setP('kvk', e.target.value)} placeholder="12345678" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t.inv.companyAddress}</label>
            <input className="input" type="text" value={prof.address} onChange={e => setP('address', e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t.inv.companyPostal}</label>
            <input className="input" type="text" value={prof.postal} onChange={e => setP('postal', e.target.value)} placeholder="1234 AB Amsterdam" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t.inv.companyPhone}</label>
            <input className="input" type="tel" value={prof.phone} onChange={e => setP('phone', e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t.inv.companyEmail}</label>
            <input className="input" type="email" value={prof.email} onChange={e => setP('email', e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t.inv.companyWeb}</label>
            <input className="input" type="url" value={prof.web} onChange={e => setP('web', e.target.value)} placeholder="https://" />
          </div>
          <div className="form-group">
            <label>{t.inv.companyBtw}</label>
            <input className="input" type="text" value={prof.btw} onChange={e => setP('btw', e.target.value)} placeholder="NL000000000B01" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t.inv.companyIban}</label>
            <input className="input" type="text" value={prof.iban} onChange={e => setP('iban', e.target.value)} placeholder="NL00 BANK 0000 0000 00" />
          </div>
          <div className="form-group">
            <label>{t.inv.paymentTerms} ({t.inv.days})</label>
            <input className="input" type="number" min="1" value={prof.paymentDays} onChange={e => setP('paymentDays', e.target.value)} />
          </div>
        </div>

        <button className="btn btn-primary" onClick={saveProfile} style={{ marginTop: 12 }}>
          <Save size={16} /> {t.inv.saveProfile}
        </button>
      </Card>

      {/* App Settings */}
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          <Globe size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} />
          {t.common.appSettings}
        </h3>

        <div className="form-row">
          <div className="form-group">
            <label>{t.common.language}</label>
            <select className="input" value={lang} onChange={e => setLang(e.target.value)}>
              <option value="en">English</option>
              <option value="nl">Nederlands</option>
            </select>
          </div>
          <div className="form-group">
            <label>{t.tax.starter}</label>
            <select className="input" value={isStarter ? 'yes' : 'no'} onChange={e => setIsStarter(e.target.value === 'yes')}>
              <option value="yes">{t.tax.yes}</option>
              <option value="no">{t.tax.no}</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>
            <Clock size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
            {t.tax.manHrs}
          </label>
          <input
            className="input"
            type="number"
            min="0"
            value={workedHours}
            onChange={e => setWorkedHours(e.target.value)}
            style={{ maxWidth: 200 }}
          />
        </div>

        <button className="btn btn-primary" onClick={saveAppSettings} style={{ marginTop: 12 }}>
          <Save size={16} /> {t.common.saveSettings}
        </button>
      </Card>

      {/* API Key */}
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          <Key size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} />
          Claude API Key
        </h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
          Required for receipt scanning, bank categorization, and the tax advisor.
        </p>

        <div className="form-group">
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKeyState(e.target.value)}
              placeholder="sk-ant-..."
              style={{ paddingRight: 40 }}
            />
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowKey(!showKey)}
              style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button className="btn btn-primary" onClick={saveApiKeyHandler} style={{ marginTop: 8 }}>
          <Save size={16} /> Save API Key
        </button>
      </Card>

      {/* Backup */}
      <Card>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t.backup.title}</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>{t.backup.bewaarplicht}</p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={16} /> {t.backup.downloadData}
          </button>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> {t.backup.restoreBtn}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </div>
      </Card>
    </div>
  );
}
