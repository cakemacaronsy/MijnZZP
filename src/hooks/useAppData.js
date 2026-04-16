import { createContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import * as db from '../lib/db';
import { defaultSettings, defaultProfile } from '../data/initial';
import { genId } from '../utils/id';

export const AppContext = createContext(null);

export function useAppData() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(defaultSettings);
  const [profile, setProfile] = useState(defaultProfile);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [personalItems, setPersonalItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  const year = settings.year;

  // Auth listener — wait for initial session check before anything else
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load settings when user logs in — keep loading=true until done
  useEffect(() => {
    if (!authReady) return; // wait for initial auth check
    if (!user) { setLoading(false); return; }
    setLoading(true); // block UI while settings load
    (async () => {
      try {
        const data = await db.getUserSettings();
        if (data.settings) setSettings(s => ({ ...s, ...data.settings }));
        if (data.profile) setProfile(p => ({ ...p, ...data.profile }));
      } catch (e) {
        console.warn('Failed to load settings:', e);
        // Fall back to localStorage for onboarded flag so user isn't stuck in onboarding loop
        try {
          const cached = localStorage.getItem('mijnzzp_onboarded');
          if (cached === 'true') setSettings(s => ({ ...s, onboarded: true }));
        } catch (_) {}
      }
      setLoading(false);
    })();
  }, [user, authReady]);

  // Refresh data when year or user changes
  const refreshInvoices = useCallback(async () => {
    if (!user) return;
    try { setInvoices(await db.getInvoicesByYear(year)); } catch (e) { console.warn(e); }
  }, [user, year]);

  const refreshExpenses = useCallback(async () => {
    if (!user) return;
    try { setExpenses(await db.getExpensesByYear(year)); } catch (e) { console.warn(e); }
  }, [user, year]);

  const refreshQuotes = useCallback(async () => {
    if (!user) return;
    try { setQuotes(await db.getQuotesByYear(year)); } catch (e) { console.warn(e); }
  }, [user, year]);

  const refreshPersonal = useCallback(async () => {
    if (!user) return;
    try { setPersonalItems(await db.getPersonalItemsByYear(year)); } catch (e) { console.warn(e); }
  }, [user, year]);

  const refreshClients = useCallback(async () => {
    if (!user) return;
    try { setClients(await db.getAllClients()); } catch (e) { console.warn(e); }
  }, [user]);

  const refresh = useCallback(async () => {
    await Promise.all([refreshInvoices(), refreshExpenses(), refreshQuotes(), refreshPersonal(), refreshClients()]);
  }, [refreshInvoices, refreshExpenses, refreshQuotes, refreshPersonal, refreshClients]);

  useEffect(() => {
    if (!loading && user) refresh();
  }, [loading, user, year]);

  // Settings
  const updateSettings = useCallback(async (patch) => {
    let next;
    setSettings(prev => {
      next = { ...prev, ...patch };
      return next;
    });
    // Persist onboarded flag in localStorage as fast fallback
    if (patch.onboarded !== undefined) {
      try { localStorage.setItem('mijnzzp_onboarded', String(patch.onboarded)); } catch (_) {}
    }
    try { await db.saveUserSettings(next); } catch (e) { console.warn('Failed to save settings:', e); }
  }, []);

  const updateProfile = useCallback(async (p) => {
    const next = { ...profile, ...p };
    setProfile(next);
    try { await db.saveUserProfile(next); } catch (e) { console.warn(e); }
  }, [profile]);

  // Invoice CRUD
  const saveInvoice = useCallback(async (inv) => {
    if (inv.id) {
      await db.updateInvoice(inv);
    } else {
      await db.insertInvoice({ ...inv, id: genId() });
    }
    await refreshInvoices();
  }, [refreshInvoices]);

  const removeInvoice = useCallback(async (id) => {
    await db.deleteInvoice(id);
    await refreshInvoices();
  }, [refreshInvoices]);

  const payInvoice = useCallback(async (id) => {
    await db.markInvoicePaid(id);
    await refreshInvoices();
  }, [refreshInvoices]);

  // Expense CRUD
  const saveExpense = useCallback(async (exp) => {
    if (exp.id) {
      await db.updateExpense(exp);
    } else {
      await db.insertExpense({ ...exp, id: genId() });
    }
    await refreshExpenses();
  }, [refreshExpenses]);

  const removeExpense = useCallback(async (id) => {
    await db.deleteExpense(id);
    await refreshExpenses();
  }, [refreshExpenses]);

  // Quote CRUD
  const saveQuote = useCallback(async (q) => {
    if (q.id) {
      await db.updateQuote(q);
    } else {
      await db.insertQuote({ ...q, id: genId() });
    }
    await refreshQuotes();
  }, [refreshQuotes]);

  const removeQuote = useCallback(async (id) => {
    await db.deleteQuote(id);
    await refreshQuotes();
  }, [refreshQuotes]);

  const setQuoteStatus = useCallback(async (id, status) => {
    await db.updateQuoteStatus(id, status);
    await refreshQuotes();
  }, [refreshQuotes]);

  // Personal CRUD
  const savePersonalItem = useCallback(async (item) => {
    if (item.id) {
      await db.updatePersonalItem(item);
    } else {
      await db.insertPersonalItem({ ...item, id: genId() });
    }
    await refreshPersonal();
  }, [refreshPersonal]);

  const removePersonalItem = useCallback(async (id) => {
    await db.deletePersonalItem(id);
    await refreshPersonal();
  }, [refreshPersonal]);

  // Client CRUD
  const saveClient = useCallback(async (c) => {
    if (c.id) {
      await db.updateClient(c);
    } else {
      await db.insertClient({ ...c, id: genId() });
    }
    await refreshClients();
  }, [refreshClients]);

  const removeClient = useCallback(async (id) => {
    await db.deleteClient(id);
    await refreshClients();
  }, [refreshClients]);

  // Session CRUD
  const getSessionsForClient = useCallback(async (clientId) => {
    return await db.getClientSessions(clientId);
  }, []);

  const saveSession = useCallback(async (s) => {
    if (s.id) {
      await db.updateSession(s);
    } else {
      await db.insertSession({ ...s, id: genId() });
    }
  }, []);

  const removeSession = useCallback(async (id) => {
    await db.deleteSession(id);
  }, []);

  // Package CRUD
  const getPackagesForClient = useCallback(async (clientId) => {
    return await db.getClientPackages(clientId);
  }, []);

  const savePackage = useCallback(async (p) => {
    if (p.id) {
      await db.updatePackage(p);
    } else {
      await db.insertPackage({ ...p, id: genId() });
    }
  }, []);

  const removePackage = useCallback(async (id) => {
    await db.deletePackage(id);
  }, []);

  return {
    user, loading, settings, profile, year,
    invoices, expenses, quotes, personalItems, clients,
    updateSettings, updateProfile,
    saveInvoice, removeInvoice, payInvoice,
    saveExpense, removeExpense,
    saveQuote, removeQuote, setQuoteStatus,
    savePersonalItem, removePersonalItem,
    saveClient, removeClient,
    getSessionsForClient, saveSession, removeSession,
    getPackagesForClient, savePackage, removePackage,
    refresh, refreshInvoices, refreshExpenses, refreshQuotes, refreshPersonal, refreshClients,
  };
}
