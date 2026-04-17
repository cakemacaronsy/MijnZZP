import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--color-bg)',
      }}>
        <div style={{
          maxWidth: 480,
          width: '100%',
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: 32,
          textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 28,
            background: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--color-error)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            <AlertTriangle size={28} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 20 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={this.handleReset}>
              Try Again
            </button>
            <button className="btn btn-primary" onClick={this.handleReload}>
              Reload App
            </button>
          </div>
        </div>
      </div>
    );
  }
}
