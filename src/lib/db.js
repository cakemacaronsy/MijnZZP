import { supabase } from './supabase';

// Generic CRUD helpers for Supabase tables

async function getByYear(table, year) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .like('date', `${year}%`)
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getAll(table, orderBy = 'date') {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order(orderBy, { ascending: orderBy === 'name' });
  if (error) throw error;
  return data || [];
}

async function insert(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select();
  if (error) throw error;
  return data?.[0] || row;
}

async function update(table, id, row) {
  const { id: _id, user_id: _uid, created_at: _c, ...fields } = row;
  const { data, error } = await supabase.from(table).update(fields).eq('id', id).select();
  if (error) throw error;
  return data?.[0] || row;
}

async function remove(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

// Invoices
export const getInvoicesByYear = (year) => getByYear('invoices', year);
export const insertInvoice = (inv) => insert('invoices', inv);
export const updateInvoice = (inv) => update('invoices', inv.id, inv);
export const deleteInvoice = (id) => remove('invoices', id);
export const markInvoicePaid = async (id) => {
  const { error } = await supabase.from('invoices').update({ status: 'paid' }).eq('id', id);
  if (error) throw error;
};

// Expenses
export const getExpensesByYear = (year) => getByYear('expenses', year);
export const insertExpense = (exp) => insert('expenses', exp);
export const updateExpense = (exp) => update('expenses', exp.id, exp);
export const deleteExpense = (id) => remove('expenses', id);

// Quotes
export const getQuotesByYear = (year) => getByYear('quotes', year);
export const insertQuote = (q) => insert('quotes', q);
export const updateQuote = (q) => update('quotes', q.id, q);
export const deleteQuote = (id) => remove('quotes', id);
export const updateQuoteStatus = async (id, status) => {
  const { error } = await supabase.from('quotes').update({ status }).eq('id', id);
  if (error) throw error;
};

// Personal items
export const getPersonalItemsByYear = (year) => getByYear('personal_items', year);
export const insertPersonalItem = (item) => insert('personal_items', item);
export const updatePersonalItem = (item) => update('personal_items', item.id, item);
export const deletePersonalItem = (id) => remove('personal_items', id);

// Clients
export const getAllClients = () => getAll('clients', 'name');
export const insertClient = (c) => insert('clients', c);
export const updateClient = (c) => update('clients', c.id, c);
export const deleteClient = async (id) => {
  await supabase.from('sessions').delete().eq('clientId', id);
  await supabase.from('packages').delete().eq('clientId', id);
  await remove('clients', id);
};

// Sessions
export const getClientSessions = async (clientId) => {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('clientId', clientId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};
export const insertSession = (s) => insert('sessions', s);
export const updateSession = (s) => update('sessions', s.id, s);
export const deleteSession = (id) => remove('sessions', id);

// Packages
export const getClientPackages = async (clientId) => {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('clientId', clientId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
};
export const insertPackage = (p) => insert('packages', p);
export const updatePackage = (p) => update('packages', p.id, p);
export const deletePackage = (id) => remove('packages', id);

// User settings
export const getUserSettings = async () => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('settings, profile')
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || { settings: {}, profile: {} };
};

export const saveUserSettings = async (settings) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, settings, updated_at: new Date().toISOString() });
  if (error) throw error;
};

export const saveUserProfile = async (profile) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, profile, updated_at: new Date().toISOString() });
  if (error) throw error;
};

// Receipt photos (Supabase Storage)
export const uploadReceiptPhoto = async (expenseId, file) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const path = `${user.id}/${expenseId}.jpg`;
  const { error } = await supabase.storage.from('receipts').upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
};

export const getReceiptPhotoUrl = async (expenseId) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const path = `${user.id}/${expenseId}.jpg`;
  // Use signed URL for private buckets (works with RLS)
  const { data, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(path, 3600); // 1 hour
  if (error) return null;
  return data?.signedUrl || null;
};

export const deleteReceiptPhoto = async (expenseId) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const path = `${user.id}/${expenseId}.jpg`;
  await supabase.storage.from('receipts').remove([path]);
};
