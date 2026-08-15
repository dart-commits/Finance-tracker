import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

const CATEGORIES = [
  { name: 'Food', color: '#B5563C' },
  { name: 'Transport', color: '#8B7355' },
  { name: 'Books', color: '#4A6B7C' },
  { name: 'Entertainment', color: '#9C6B98' },
  { name: 'Rent', color: '#6B5B4A' },
  { name: 'Other', color: '#7A7A6E' },
];

const INCOME_COLOR = '#4A7862';

function formatMoney(n) {
  const sign = n < 0 ? '-' : '';
  return sign + '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function monthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export default function FinanceTracker() {
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    category: 'Food',
    note: '',
    date: new Date().toISOString().slice(0, 10),
  });
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ledger-entries');
      if (raw) setEntries(JSON.parse(raw));
    } catch (e) {
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem('ledger-entries', JSON.stringify(entries));
    } catch (e) {
      console.error('Save failed', e);
    }
  }, [entries, loaded]);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => new Date(a.date) - new Date(b.date)),
    [entries]
  );

  const ledgerRows = useMemo(() => {
    let balance = 0;
    const withBalance = sorted.map((e) => {
      balance += e.type === 'income' ? e.amount : -e.amount;
      return { ...e, balance };
    });
    return [...withBalance].reverse();
  }, [sorted]);

  const totalBalance = ledgerRows.length ? ledgerRows[0].balance : 0;
  const totalIncome = entries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const totalExpense = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0);

  const monthlyData = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      const k = monthKey(e.date);
      if (!map[k]) map[k] = { key: k, income: 0, expense: 0 };
      if (e.type === 'income') map[k].income += e.amount;
      else map[k].expense += e.amount;
    });
    return Object.values(map)
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-6)
      .map((m) => ({ ...m, label: monthLabel(m.key), net: m.income - m.expense }));
  }, [entries]);

  const categoryBreakdown = useMemo(() => {
    const now = new Date();
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const map = {};
    entries
      .filter((e) => e.type === 'expense' && monthKey(e.date) === curKey)
      .forEach((e) => {
        map[e.category] = (map[e.category] || 0) + e.amount;
      });
    return CATEGORIES.map((c) => ({ ...c, amount: map[c.name] || 0 })).filter((c) => c.amount > 0);
  }, [entries]);

  function addEntry() {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    setError('');
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      type: form.type,
      amount: amt,
      category: form.type === 'income' ? 'Income' : form.category,
      note: form.note.trim(),
      date: form.date,
    };
    setEntries((prev) => [...prev, entry]);
    setForm((f) => ({ ...f, amount: '', note: '' }));
  }

  function removeEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const categoryColor = (name) =>
    name === 'Income' ? INCOME_COLOR : CATEGORIES.find((c) => c.name === name)?.color || '#7A7A6E';

  return (
    <div style={{ minHeight: '100vh', background: '#1B2430', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .mono { font-family: 'JetBrains Mono', 'Courier New', monospace; }
        .passbook { background: #F7F4EE; border-radius: 4px; box-shadow: 0 12px 40px rgba(0,0,0,0.35); }
        .stamp { border: 2px solid currentColor; border-radius: 999px; padding: 2px 10px; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; display: inline-block; }
        input, select { font-family: inherit; }
        .ledger-row { border-bottom: 1px dashed #D8D2C4; }
        .ledger-row:last-child { border-bottom: none; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-thumb { background: #3A4658; border-radius: 4px; }
      `}</style>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px 64px' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#D4A24C', marginBottom: 4 }}>
            <Wallet size={18} />
            <span className="mono" style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Passbook</span>
          </div>
          <h1 style={{ color: '#F7F4EE', fontSize: 28, fontWeight: 700, margin: 0 }}>Your Ledger</h1>
        </div>

        <div className="passbook" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div className="mono" style={{ fontSize: 11, color: '#8A8373', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Current Balance</div>
              <div className="mono" style={{ fontSize: 32, fontWeight: 700, color: totalBalance >= 0 ? '#2F4A3C' : '#8B3A24' }}>{formatMoney(totalBalance)}</div>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#4A7862' }}>
                  <TrendingUp size={14} />
                  <span className="mono" style={{ fontSize: 11, textTransform: 'uppercase' }}>In</span>
                </div>
                <div className="mono" style={{ fontSize: 15, fontWeight: 600, color: '#2F4A3C' }}>{formatMoney(totalIncome)}</div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#B5563C' }}>
                  <TrendingDown size={14} />
                  <span className="mono" style={{ fontSize: 11, textTransform: 'uppercase' }}>Out</span>
                </div>
                <div className="mono" style={{ fontSize: 15, fontWeight: 600, color: '#8B3A24' }}>{formatMoney(totalExpense)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="passbook" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {['expense', 'income'].map((t) => (
              <button key={t} onClick={() => setForm((f) => ({ ...f, type: t }))} style={{ flex: 1, padding: '8px 12px', borderRadius: 4, border: `1px solid ${form.type === t ? (t === 'income' ? '#4A7862' : '#B5563C') : '#D8D2C4'}`, background: form.type === t ? (t === 'income' ? '#4A7862' : '#B5563C') : 'transparent', color: form.type === t ? '#F7F4EE' : '#4A453A', fontSize: 13, fontWeight: 600, textTransform: 'capitalize', cursor: 'pointer' }}>
                {t}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <input type="number" placeholder="Amount (₹)" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 4, border: '1px solid #D8D2C4', fontSize: 14, background: '#FFFEFC' }} />
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 4, border: '1px solid #D8D2C4', fontSize: 14, background: '#FFFEFC' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: form.type === 'expense' ? '1fr 1fr' : '1fr', gap: 8, marginBottom: 8 }}>
            {form.type === 'expense' && (
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 4, border: '1px solid #D8D2C4', fontSize: 14, background: '#FFFEFC' }}>
                {CATEGORIES.map((c) => (<option key={c.name} value={c.name}>{c.name}</option>))}
              </select>
            )}
            <input type="text" placeholder="Note (optional)" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 4, border: '1px solid #D8D2C4', fontSize: 14, background: '#FFFEFC' }} />
          </div>

          {error && <div style={{ color: '#8B3A24', fontSize: 12, marginBottom: 8 }}>{error}</div>}

          <button onClick={addEntry} style={{ width: '100%', padding: '10px', borderRadius: 4, border: 'none', background: '#1B2430', color: '#F7F4EE', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Plus size={16} /> Add Entry
          </button>
        </div>

        {monthlyData.length > 0 && (
          <div className="passbook" style={{ padding: 20, marginBottom: 20 }}>
            <div className="mono" style={{ fontSize: 11, color: '#8A8373', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Monthly Summary</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D4" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8A8373' }} axisLine={{ stroke: '#D8D2C4' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8A8373' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatMoney(v)} contentStyle={{ background: '#1B2430', border: 'none', borderRadius: 4, fontSize: 12 }} labelStyle={{ color: '#F7F4EE' }} itemStyle={{ color: '#F7F4EE' }} />
                <Bar dataKey="income" fill={INCOME_COLOR} radius={[3, 3, 0, 0]} name="Income" />
                <Bar dataKey="expense" fill="#B5563C" radius={[3, 3, 0, 0]} name="Expense" />
              </BarChart>
            </ResponsiveContainer>

            {categoryBreakdown.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed #D8D2C4' }}>
                <div className="mono" style={{ fontSize: 11, color: '#8A8373', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>This Month by Category</div>
                {categoryBreakdown.map((c) => {
                  const max = Math.max(...categoryBreakdown.map((x) => x.amount));
                  return (
                    <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 70, fontSize: 12, color: '#4A453A' }}>{c.name}</div>
                      <div style={{ flex: 1, background: '#EDE8DC', borderRadius: 3, height: 8, overflow: 'hidden' }}>
                        <div style={{ width: `${(c.amount / max) * 100}%`, background: c.color, height: '100%' }} />
                      </div>
                      <div className="mono" style={{ fontSize: 12, width: 70, textAlign: 'right', color: '#4A453A' }}>{formatMoney(c.amount)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="passbook" style={{ padding: '8px 20px' }}>
          <div className="mono" style={{ fontSize: 11, color: '#8A8373', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '12px 0 8px' }}>Entries</div>
          {ledgerRows.length === 0 && (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#A39C8C', fontSize: 13 }}>No entries yet. Add your first one above.</div>
          )}
          {ledgerRows.map((e) => (
            <div key={e.id} className="ledger-row" style={{ display: 'flex', alignItems: 'center', padding: '10px 0', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span className="stamp" style={{ color: categoryColor(e.category), fontSize: 10, padding: '1px 8px' }}>{e.category}</span>
                  <span className="mono" style={{ fontSize: 11, color: '#A39C8C' }}>{e.date}</span>
                </div>
                {e.note && <div style={{ fontSize: 13, color: '#4A453A', marginTop: 2 }}>{e.note}</div>}
              </div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: e.type === 'income' ? '#2F4A3C' : '#8B3A24', whiteSpace: 'nowrap' }}>{e.type === 'income' ? '+' : '-'}{formatMoney(e.amount).replace('-', '')}</div>
              <div className="mono" style={{ fontSize: 12, color: '#8A8373', width: 90, textAlign: 'right', whiteSpace: 'nowrap' }}>bal {formatMoney(e.balance)}</div>
              <button onClick={() => removeEntry(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C7C0B0', padding: 4 }} aria-label="Delete entry">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
                                     }
