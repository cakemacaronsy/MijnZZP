import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { callClaude, hasApiKey } from '../services/claude';
import Card from '../components/shared/Card';
import { Send, AlertTriangle, Bot, User, Key } from 'lucide-react';
import '../components/shared/shared.css';

const SYSTEM_PROMPT = `You are a helpful Dutch tax advisor AI for freelancers (ZZP'ers — Zelfstandige Zonder Personeel) in the Netherlands.

You know about:
- Dutch income tax (Box 1, Box 2, Box 3)
- VAT/BTW rules (21%, 9%, 0% rates, quarterly filing)
- Self-employed deduction (zelfstandigenaftrek): €3,750 (requires >=1,225 hours)
- Starter deduction (startersaftrek): €2,123 (first 5 years)
- SME profit exemption (MKB-winstvrijstelling): 13.94%
- Mileage allowance (kilometervergoeding): €0.23/km
- Business expense categories and deductibility rules
- Representation costs: 80% deductible
- Record retention requirement (bewaarplicht): 7 years
- KVK registration, BTW numbers, invoicing requirements

Always note that your advice is informational and users should consult a certified tax advisor for official returns.
Respond in the same language the user writes in (Dutch or English).`;

export default function AdvisorScreen() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const apiConfigured = hasApiKey();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const apiMessages = updated.map(m => ({ role: m.role, content: m.content }));
      const response = await callClaude({
        messages: apiMessages,
        system: SYSTEM_PROMPT,
        maxTokens: 2048,
      });

      if (response) {
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I could not generate a response. Please check your API key and try again.' }]);
      }
    } catch (err) {
      console.error('Advisor error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'An error occurred. Please try again.' }]);
    }

    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div className="page-header">
        <h1>{t.adv.title}</h1>
      </div>

      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
        <AlertTriangle size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
        {t.adv.disclaimer}
      </p>

      {!apiConfigured && (
        <Card style={{ marginBottom: 16, borderLeft: '3px solid var(--color-warning, #EAB308)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={16} color="var(--color-warning, #EAB308)" />
            <span style={{ fontSize: 14 }}>No Claude API key configured. Go to Settings to add your API key.</span>
          </div>
        </Card>
      )}

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Bot size={48} color="var(--color-text-secondary)" style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 20 }}>{t.adv.sub}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {t.adv.examples.map((ex, i) => (
                <button
                  key={i}
                  className="btn btn-secondary btn-sm"
                  onClick={() => setInput(ex)}
                  style={{ fontSize: 12 }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              gap: 8,
            }}
          >
            {msg.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={16} color="white" />
              </div>
            )}
            <div
              style={{
                maxWidth: '70%',
                padding: '10px 14px',
                borderRadius: 12,
                fontSize: 14,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-bg-secondary, #f3f4f6)',
                color: msg.role === 'user' ? 'white' : 'inherit',
              }}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={16} color="white" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={16} color="white" />
            </div>
            <span style={{ fontSize: 14, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>{t.adv.thinking}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 0', borderTop: '1px solid var(--color-border, #e5e7eb)' }}>
        <input
          className="input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.adv.placeholder}
          disabled={loading || !apiConfigured}
          style={{ flex: 1 }}
        />
        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={loading || !input.trim() || !apiConfigured}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
