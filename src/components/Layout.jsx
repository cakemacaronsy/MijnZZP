import { NavLink, Outlet } from 'react-router-dom';
import { useContext, useState } from 'react';
import { AppContext } from '../hooks/useAppData';
import { useTranslation } from '../hooks/useTranslation';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard, FileText, Receipt, User, Calculator,
  Users, Settings, LogOut, Menu, X, Bot, Upload
} from 'lucide-react';
import './Layout.css';

const navItems = [
  { to: '/', icon: LayoutDashboard, labelIdx: 0 },
  { to: '/invoices', icon: FileText, labelIdx: 1 },
  { to: '/expenses', icon: Receipt, labelIdx: 2 },
  { to: '/personal', icon: User, labelIdx: 3 },
  { to: '/tax', icon: Calculator, labelIdx: 4 },
  { to: '/clients', icon: Users, labelIdx: 5 },
];

const bottomItems = [
  { to: '/advisor', icon: Bot, label: 'AI Advisor' },
  { to: '/import', icon: Upload, label: 'Bank Import' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const { t } = useTranslation();
  const { settings, updateSettings, year } = useContext(AppContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleYearChange = (e) => {
    updateSettings({ year: parseInt(e.target.value) });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="layout">
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">M</span>
            <span className="logo-text">MijnZZP</span>
          </div>
          <select className="year-select" value={year} onChange={handleYearChange}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, labelIdx }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              <span>{t.tabs[labelIdx]}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-divider" />

        <nav className="sidebar-nav">
          {bottomItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
