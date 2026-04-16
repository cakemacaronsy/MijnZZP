import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../hooks/useAppData';
import { useTranslation } from '../hooks/useTranslation';
import { BTYPES, CATS } from '../constants/categories';
import { Check } from 'lucide-react';
import '../components/shared/shared.css';

export default function OnboardingScreen() {
  const { updateSettings, updateProfile } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [businessType, setBusinessType] = useState('');
  const [favCats, setFavCats] = useState([]);
  const [isStarter, setIsStarter] = useState(false);
  const [meetsHours, setMeetsHours] = useState(true);
  const [finishing, setFinishing] = useState(false);

  const toggleCat = (cat) => {
    setFavCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const handleFinish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await updateSettings({
        businessType,
        favCats,
        isStarter,
        workedHours: meetsHours ? 1225 : 0,
        onboarded: true,
      });
      navigate('/');
    } catch (e) {
      console.error('Failed to save onboarding:', e);
      setFinishing(false);
    }
  };

  const steps = [
    // Step 0: Business Type
    <div key="btype" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600 }}>{t.ob.steps[0]}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
        {BTYPES.map(bt => (
          <button
            key={bt}
            className={`btn ${businessType === bt ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setBusinessType(bt)}
            style={{ justifyContent: 'flex-start' }}
          >
            {businessType === bt && <Check size={16} />}
            {t.ob.btype[bt] || bt}
          </button>
        ))}
      </div>
    </div>,

    // Step 1: Categories
    <div key="cats" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600 }}>{t.ob.selCat}</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {CATS.map(cat => (
          <button
            key={cat}
            className={`filter-pill ${favCats.includes(cat) ? 'active' : ''}`}
            onClick={() => toggleCat(cat)}
          >
            {t.exp?.cats?.[cat] || cat}
          </button>
        ))}
      </div>
    </div>,

    // Step 2: Starter
    <div key="starter" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600 }}>{t.ob.starter}</h2>
      <div style={{ display: 'flex', gap: 12 }}>
        <button className={`btn ${isStarter ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setIsStarter(true)}>{t.ob.yes}</button>
        <button className={`btn ${!isStarter ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setIsStarter(false)}>{t.ob.no}</button>
      </div>
    </div>,

    // Step 3: Hours
    <div key="hours" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600 }}>{t.ob.hours}</h2>
      <div style={{ display: 'flex', gap: 12 }}>
        <button className={`btn ${meetsHours ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMeetsHours(true)}>{t.ob.yes}</button>
        <button className={`btn ${!meetsHours ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMeetsHours(false)}>{t.ob.no}</button>
      </div>
    </div>,
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 560, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, #EA580C, #F97316)',
            color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, marginBottom: 12
          }}>M</div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>{t.ob.welcome}</h1>
          <p className="text-secondary">{t.ob.sub}</p>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: i <= step ? 'var(--color-primary)' : 'var(--color-border)',
            }} />
          ))}
        </div>

        <div className="card" style={{ padding: 24 }}>
          {steps[step]}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            {step > 0 ? (
              <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>{t.ob.back}</button>
            ) : <div />}
            {step < 3 ? (
              <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>{t.ob.next}</button>
            ) : (
              <button className="btn btn-primary" onClick={handleFinish} disabled={finishing}>{finishing ? '...' : t.ob.start}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
