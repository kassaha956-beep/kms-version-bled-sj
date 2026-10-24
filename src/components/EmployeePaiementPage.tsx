import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, RefreshCw, Eye, DollarSign, TrendingUp,
  AlertCircle, CreditCard, ChevronLeft, ChevronRight, X,
  CheckCircle, Clock, Banknote, ArrowUpCircle, Trash2
} from 'lucide-react';
import { translations } from '../i18n';
import type { Language, Translations } from '../i18n';
import { hasPermission } from '../permissions';

interface User {
  id: number; full_name: string; username: string; role: string;
  email?: string; phone?: string; department?: string; position?: string;
  base_salary?: number; hire_date?: string; status?: string; emp_status?: string;
  total_advances: number; total_paid: number; total_debt: number;
}
interface Kpis { totalEmployees: number; masseSalariale: number; totalPaid: number; salaireRestant: number; totalAdvances: number; totalDebts: number; totalDepenses: number; }
interface Advance { id: number; amount: number; date: string; reason: string; payment_method: string; }
interface Payment { id: number; month: string; year: number; base_salary: number; bonuses: number; deductions: number; advance_deducted: number; net_paid: number; payment_method: string; payment_date: string; }
interface Debt    { id: number; amount: number; remaining: number; date: string; description: string; status: string; }
interface Props   { currentLang: Language; currentUser: any; }

const fmt = (n: number) => `${(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA`;
const api = (window as any).electronAPI;
const tod = () => new Date().toISOString().slice(0, 10);
const payLbl = (m: string) => ({ especes: 'Especes', virement: 'Virement', cheque: 'Cheque', autre: 'Autre' }[m] || m);

const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#0f172a', background: '#fff', outline: 'none', boxSizing: 'border-box' };
const inpSm: React.CSSProperties = { padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#334155', background: '#fff', outline: 'none' };
const btnG: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' };
const btnS: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' };
const btnO: React.CSSProperties = { ...btnG, background: '#ea580c' };
const btnP: React.CSSProperties = { ...btnG, background: '#7c3aed' };

function KpiCard({ icon, label, value, color, bg }: any) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', lineHeight: '1.3' }}>{label}</span>
      </div>
      <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{value}</div>
    </div>
  );
}

function Modal({ title, onClose, children, wide = false }: any) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: wide ? '760px' : '520px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

function Row({ children }: any) { return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>{children}</div>; }
function Field({ label, children }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{label}</label>
      {children}
    </div>
  );
}
function Footer({ children }: any) { return <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>{children}</div>; }

export default function EmployeePaiementPage({ currentLang, currentUser: _cu }: Props) {
  const t: Translations = translations[currentLang] || translations.fr;
  const canPaySalary = hasPermission(_cu, 'paiement.salaries');
  const canAddAdvance = hasPermission(_cu, 'paiement.advances');
  const canAddDebt = hasPermission(_cu, 'paiement.debts');
  const months = t.empMonths || ['Jan','Fev','Mar','Avr','Mai','Jun','Jul','Aou','Sep','Oct','Nov','Dec'];
  const monthOpts = months.map((m: string, i: number) => ({ label: m, value: String(i + 1).padStart(2, '0') }));
  const now = new Date();

  const [users, setUsers]       = useState<User[]>([]);
  const [kpis, setKpis]         = useState<Kpis | null>(null);
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [totalCount, setTotal]  = useState(0);
  const [totalPages, setTPages] = useState(1);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [kpiMonth, setKpiMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [kpiYear, setKpiYear]   = useState(String(now.getFullYear()));

  const [payTarget, setPayTarget] = useState<User | null>(null);
  const [payForm, setPayForm]     = useState({ month: String(now.getMonth() + 1).padStart(2, '0'), year: String(now.getFullYear()), bonuses: '0', deductions: '0', advance_deducted: '0', payment_method: 'especes', payment_date: tod(), notes: '' });

  const [advTarget, setAdvTarget] = useState<User | null>(null);
  const [advForm, setAdvForm]     = useState({ amount: '', date: tod(), reason: '', payment_method: 'especes', reference: '' });

  const [debtTarget, setDebtTarget] = useState<User | null>(null);
  const [debtForm, setDebtForm]     = useState({ amount: '', date: tod(), description: '' });

  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [detailTab, setDetailTab]   = useState<'salaires' | 'avances' | 'dettes'>('salaires');
  const [detailPay, setDetailPay]   = useState<Payment[]>([]);
  const [detailAdv, setDetailAdv]   = useState<Advance[]>([]);
  const [detailDebt, setDetailDebt] = useState<Debt[]>([]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = api?.getEmployees ? await api.getEmployees({ search, page, pageSize: 10 }) : { success: false, employees: [], totalCount: 0, totalPages: 1 };
      if (res?.success) { setUsers(res.employees || []); setTotal(res.totalCount || 0); setTPages(res.totalPages || 1); }
    } finally { setLoading(false); }
  }, [search, page]);

  const loadKpis = useCallback(async () => {
    const res = api?.getEmployeeKpis ? await api.getEmployeeKpis({ month: kpiMonth, year: kpiYear }) : null;
    if (res?.success) setKpis(res.kpis);
  }, [kpiMonth, kpiYear]);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { loadKpis(); }, [loadKpis]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const basePay = payTarget?.base_salary || 0;
  const netPay  = Math.max(0, basePay + (parseFloat(payForm.bonuses) || 0) - (parseFloat(payForm.deductions) || 0) - (parseFloat(payForm.advance_deducted) || 0));

  const openPay    = (u: User) => { setPayTarget(u); setPayForm(p => ({ ...p, bonuses: '0', deductions: '0', advance_deducted: '0', payment_date: tod() })); };
  const openAdv    = (u: User) => { setAdvTarget(u);  setAdvForm({ amount: '', date: tod(), reason: '', payment_method: 'especes', reference: '' }); };
  const openDebt   = (u: User) => { setDebtTarget(u); setDebtForm({ amount: '', date: tod(), description: '' }); };
  const openDetail = async (u: User) => {
    setDetailUser(u); setDetailTab('salaires');
    const res = api?.getEmployeeById ? await api.getEmployeeById(u.id) : null;
    if (res?.success) { setDetailPay(res.payments || []); setDetailAdv(res.advances || []); setDetailDebt(res.debts || []); }
  };

  const handlePaySalary = async (e: React.FormEvent) => {
    e.preventDefault(); if (!payTarget) return; setSaving(true);
    try {
      const res = api?.paySalary ? await api.paySalary({ employee_id: payTarget.id, month: payForm.month, year: payForm.year, base_salary: basePay, bonuses: parseFloat(payForm.bonuses) || 0, deductions: parseFloat(payForm.deductions) || 0, advance_deducted: parseFloat(payForm.advance_deducted) || 0, net_paid: netPay, payment_method: payForm.payment_method, payment_date: payForm.payment_date, notes: payForm.notes }) : { success: true };
      if (res?.success) { showToast(`${t.empPayBtnSubmit}: ${fmt(netPay)}`); setPayTarget(null); loadUsers(); loadKpis(); }
      else showToast(res?.message || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const handleAddAdv = async (e: React.FormEvent) => {
    e.preventDefault(); if (!advTarget || !parseFloat(advForm.amount)) return showToast(t.empToastInvalidAmount, 'error'); setSaving(true);
    try {
      const res = api?.addEmployeeAdvance ? await api.addEmployeeAdvance({ employee_id: advTarget.id, ...advForm, amount: parseFloat(advForm.amount) }) : { success: true };
      if (res?.success) { showToast(`${t.empToastAdvGranted}: ${fmt(parseFloat(advForm.amount))}`); setAdvTarget(null); loadUsers(); loadKpis(); }
      else showToast(res?.message || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault(); if (!debtTarget || !parseFloat(debtForm.amount)) return showToast(t.empToastInvalidAmount, 'error'); setSaving(true);
    try {
      const res = api?.addEmployeeDebt ? await api.addEmployeeDebt({ employee_id: debtTarget.id, ...debtForm, amount: parseFloat(debtForm.amount) }) : { success: true };
      if (res?.success) { showToast(t.empToastDebtSaved); setDebtTarget(null); loadUsers(); loadKpis(); }
      else showToast(res?.message || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const delPay  = async (id: number) => { if (!window.confirm(t.empConfirmDeletePay))  return; const r = api?.deleteEmployeePayment ? await api.deleteEmployeePayment(id)  : { success: true }; if (r?.success) { setDetailPay(p  => p.filter(x => x.id !== id)); showToast(t.empToastPayDeleted);  loadKpis(); } };
  const delAdv  = async (id: number) => { if (!window.confirm(t.empConfirmDeleteAdv))  return; const r = api?.deleteEmployeeAdvance ? await api.deleteEmployeeAdvance(id)  : { success: true }; if (r?.success) { setDetailAdv(p  => p.filter(x => x.id !== id)); showToast(t.empToastAdvDeleted);  loadKpis(); } };
  const delDebt = async (id: number) => { if (!window.confirm(t.empConfirmDeleteDebt)) return; const r = api?.deleteEmployeeDebt    ? await api.deleteEmployeeDebt(id)    : { success: true }; if (r?.success) { setDetailDebt(p => p.filter(x => x.id !== id)); showToast(t.empToastDebtDeleted); loadKpis(); } };

  const TH = (h: string) => <th key={h} style={{ padding: '8px 10px', textAlign: 'left' as const, fontWeight: 700, color: '#64748b', fontSize: '10px', textTransform: 'uppercase' as const }}>{h}</th>;

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 2000, background: toast.type === 'success' ? '#15803d' : '#dc2626', color: '#fff', padding: '12px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{t.empPageTitle}</h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>{t.empPageSubtitle}</p>
        </div>
        <button onClick={() => { loadUsers(); loadKpis(); }} style={btnS}><RefreshCw size={14} /> {t.empRefresh}</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>{t.empKpiPeriod}</span>
        <select value={kpiMonth} onChange={e => setKpiMonth(e.target.value)} style={inpSm}>{monthOpts.map((m: any) => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
        <select value={kpiYear}  onChange={e => setKpiYear(e.target.value)}  style={inpSm}>{[2022,2023,2024,2025,2026,2027].map(y => <option key={y} value={String(y)}>{y}</option>)}</select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '14px' }}>
        <KpiCard icon={<Users size={18} />}         label={t.empTotalEmployees} value={kpis ? String(kpis.totalEmployees) : '-'} color="#3b82f6" bg="#eff6ff" />
        <KpiCard icon={<TrendingUp size={18} />}    label={t.empMasseSalariale} value={kpis ? fmt(kpis.masseSalariale) : '-'}    color="#8b5cf6" bg="#f5f3ff" />
        <KpiCard icon={<CheckCircle size={18} />}   label={t.empTotalPaid}      value={kpis ? fmt(kpis.totalPaid) : '-'}         color="#16a34a" bg="#f0fdf4" />
        <KpiCard icon={<Clock size={18} />}         label={t.empSalaireRestant} value={kpis ? fmt(kpis.salaireRestant) : '-'}    color="#f59e0b" bg="#fffbeb" />
        <KpiCard icon={<ArrowUpCircle size={18} />} label={t.empTotalAdvances}  value={kpis ? fmt(kpis.totalAdvances) : '-'}     color="#f97316" bg="#fff7ed" />
        <KpiCard icon={<AlertCircle size={18} />}   label={t.empTotalDebts}     value={kpis ? fmt(kpis.totalDebts) : '-'}        color="#ef4444" bg="#fef2f2" />
        <KpiCard icon={<Banknote size={18} />}      label={t.empTotalDepenses}  value={kpis ? fmt(kpis.totalDepenses) : '-'}     color="#0891b2" bg="#ecfeff" />
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={t.empSearchPlaceholder} style={{ ...inp, paddingLeft: '32px' }} />
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>{totalCount} {t.empColEmployee}{totalCount !== 1 ? 's' : ''}</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {[t.empColEmployee, t.empColDeptPost, t.empColBaseSalary, t.empColTotalPaid, t.empColAdvances, t.empColDebts, t.empColActions].map(h =>
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left' as const, fontWeight: 700, color: '#475569', fontSize: '11px', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>{t.empNoEmployees}</td></tr>
            ) : users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                      {u.full_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{u.full_name}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>{u.department || '-'}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{u.position || u.role}</div>
                </td>
                <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{u.base_salary ? fmt(u.base_salary) : '-'}</td>
                <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: 700 }}>{fmt(u.total_paid || 0)}</td>
                <td style={{ padding: '10px 14px', color: '#f97316', fontWeight: 700 }}>{fmt(u.total_advances || 0)}</td>
                <td style={{ padding: '10px 14px', color: '#ef4444', fontWeight: 700 }}>{fmt(u.total_debt || 0)}</td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button title={t.empTabInfo}         onClick={() => openDetail(u)} style={{ ...btnS, padding: '5px 8px', background: '#eff6ff', border: 'none', color: '#3b82f6' }}><Eye size={12} /></button>
                    {canPaySalary && (
                      <button title={t.empPayModalPrefix}  onClick={() => openPay(u)}    style={{ ...btnS, padding: '5px 8px', background: '#f0fdf4', border: 'none', color: '#16a34a' }}><DollarSign size={12} /></button>
                    )}
                    {canAddAdvance && (
                      <button title={t.empAdvModalPrefix}  onClick={() => openAdv(u)}    style={{ ...btnS, padding: '5px 8px', background: '#fff7ed', border: 'none', color: '#f97316' }}><ArrowUpCircle size={12} /></button>
                    )}
                    {canAddDebt && (
                      <button title={t.empDebtModalPrefix} onClick={() => openDebt(u)}   style={{ ...btnS, padding: '5px 8px', background: '#faf5ff', border: 'none', color: '#7c3aed' }}><CreditCard size={12} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div style={{ padding: '12px 18px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{t.empPage} {page} {t.empOf} {totalPages}</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={btnS}><ChevronLeft size={14} /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={btnS}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {payTarget && (
        <Modal title={`${t.empPayModalPrefix} - ${payTarget.full_name}`} onClose={() => setPayTarget(null)}>
          <form onSubmit={handlePaySalary} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px' }}>
              <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700, marginBottom: '4px' }}>{t.empPayBaseSalaryLabel}</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803d' }}>{fmt(basePay)}</div>
            </div>
            <Row>
              <Field label={t.empPayMonth}><select style={inp} value={payForm.month} onChange={e => setPayForm(p => ({ ...p, month: e.target.value }))}>{monthOpts.map((m: any) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></Field>
              <Field label={t.empPayYear}><select style={inp} value={payForm.year} onChange={e => setPayForm(p => ({ ...p, year: e.target.value }))}>{[2022,2023,2024,2025,2026,2027].map(y => <option key={y} value={String(y)}>{y}</option>)}</select></Field>
            </Row>
            <Row>
              <Field label={t.empPayBonuses}><input type="number" min="0" step="0.01" style={inp} value={payForm.bonuses} onChange={e => setPayForm(p => ({ ...p, bonuses: e.target.value }))} /></Field>
              <Field label={t.empPayDeductions}><input type="number" min="0" step="0.01" style={inp} value={payForm.deductions} onChange={e => setPayForm(p => ({ ...p, deductions: e.target.value }))} /></Field>
            </Row>
            <Row>
              <Field label={t.empPayAdvanceDeducted}><input type="number" min="0" step="0.01" style={inp} value={payForm.advance_deducted} onChange={e => setPayForm(p => ({ ...p, advance_deducted: e.target.value }))} /></Field>
              <Field label={t.empPayMethod}>
                <select style={inp} value={payForm.payment_method} onChange={e => setPayForm(p => ({ ...p, payment_method: e.target.value }))}>
                  <option value="especes">{t.empPayMethodCash}</option><option value="virement">{t.empPayMethodTransfer}</option><option value="cheque">{t.empPayMethodCheque}</option><option value="autre">{t.empPayMethodOther}</option>
                </select>
              </Field>
            </Row>
            <Row>
              <Field label={t.empPayDate}><input type="date" style={inp} value={payForm.payment_date} onChange={e => setPayForm(p => ({ ...p, payment_date: e.target.value }))} /></Field>
              <Field label={t.empPayNotes}><input style={inp} value={payForm.notes} onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optionnel..." /></Field>
            </Row>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#1e40af' }}>{t.empPayNetLabel}</span>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#1e40af' }}>{fmt(netPay)}</span>
            </div>
            <Footer>
              <button type="button" onClick={() => setPayTarget(null)} style={btnS}>{t.empBtnCancel}</button>
              <button type="submit" style={btnG} disabled={saving}><DollarSign size={14} /> {t.empPayBtnSubmit}</button>
            </Footer>
          </form>
        </Modal>
      )}

      {advTarget && (
        <Modal title={`${t.empAdvModalPrefix} - ${advTarget.full_name}`} onClose={() => setAdvTarget(null)}>
          <form onSubmit={handleAddAdv} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Row>
              <Field label={t.empAdvAmount}><input required type="number" min="1" step="0.01" style={inp} value={advForm.amount} onChange={e => setAdvForm(p => ({ ...p, amount: e.target.value }))} placeholder="5000" /></Field>
              <Field label={t.empAdvDate}><input type="date" style={inp} value={advForm.date} onChange={e => setAdvForm(p => ({ ...p, date: e.target.value }))} /></Field>
            </Row>
            <Field label={t.empAdvReason}><input style={inp} value={advForm.reason} onChange={e => setAdvForm(p => ({ ...p, reason: e.target.value }))} /></Field>
            <Row>
              <Field label={t.empAdvMethod}>
                <select style={inp} value={advForm.payment_method} onChange={e => setAdvForm(p => ({ ...p, payment_method: e.target.value }))}>
                  <option value="especes">{t.empPayMethodCash}</option><option value="virement">{t.empPayMethodTransfer}</option><option value="cheque">{t.empPayMethodCheque}</option><option value="autre">{t.empPayMethodOther}</option>
                </select>
              </Field>
              <Field label={t.empAdvReference}><input style={inp} value={advForm.reference} onChange={e => setAdvForm(p => ({ ...p, reference: e.target.value }))} /></Field>
            </Row>
            <Footer>
              <button type="button" onClick={() => setAdvTarget(null)} style={btnS}>{t.empBtnCancel}</button>
              <button type="submit" style={btnO} disabled={saving}><ArrowUpCircle size={14} /> {t.empAdvBtnSubmit}</button>
            </Footer>
          </form>
        </Modal>
      )}

      {debtTarget && (
        <Modal title={`${t.empDebtModalPrefix} - ${debtTarget.full_name}`} onClose={() => setDebtTarget(null)}>
          <form onSubmit={handleAddDebt} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Row>
              <Field label={t.empDebtAmount}><input required type="number" min="1" step="0.01" style={inp} value={debtForm.amount} onChange={e => setDebtForm(p => ({ ...p, amount: e.target.value }))} placeholder="2500" /></Field>
              <Field label={t.empDebtDate}><input type="date" style={inp} value={debtForm.date} onChange={e => setDebtForm(p => ({ ...p, date: e.target.value }))} /></Field>
            </Row>
            <Field label={t.empDebtDescription}><textarea style={{ ...inp, resize: 'vertical' }} rows={3} value={debtForm.description} onChange={e => setDebtForm(p => ({ ...p, description: e.target.value }))} /></Field>
            <Footer>
              <button type="button" onClick={() => setDebtTarget(null)} style={btnS}>{t.empBtnCancel}</button>
              <button type="submit" style={btnP} disabled={saving}><CreditCard size={14} /> {t.empDebtBtnSubmit}</button>
            </Footer>
          </form>
        </Modal>
      )}

      {detailUser && (
        <Modal title={`${t.empDetailPrefix} - ${detailUser.full_name}`} onClose={() => setDetailUser(null)} wide>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
            {(['salaires', 'avances', 'dettes'] as const).map(tab => (
              <button key={tab} onClick={() => setDetailTab(tab)} style={{ flex: 1, padding: '7px 4px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, background: detailTab === tab ? '#fff' : 'transparent', color: detailTab === tab ? '#15803d' : '#64748b' }}>
                {tab === 'salaires' ? t.empTabSalaires : tab === 'avances' ? t.empTabAvances : t.empTabDettes}
              </button>
            ))}
          </div>

          {detailTab === 'salaires' && (
            detailPay.length === 0 ? <p style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>{t.empEmptyPayments}</p> :
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead><tr style={{ background: '#f8fafc' }}>{[t.empSalColMonth, t.empSalColBase, t.empSalColBonuses, t.empSalColDeductions, t.empSalColAdvDed, t.empSalColNet, t.empSalColDate, ''].map(h => TH(h))}</tr></thead>
              <tbody>
                {detailPay.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>{months[(parseInt(p.month) - 1) % 12]} {p.year}</td>
                    <td style={{ padding: '8px 10px' }}>{fmt(p.base_salary)}</td>
                    <td style={{ padding: '8px 10px', color: '#16a34a' }}>+{fmt(p.bonuses)}</td>
                    <td style={{ padding: '8px 10px', color: '#ef4444' }}>-{fmt(p.deductions)}</td>
                    <td style={{ padding: '8px 10px', color: '#f97316' }}>-{fmt(p.advance_deducted)}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 800, color: '#15803d' }}>{fmt(p.net_paid)}</td>
                    <td style={{ padding: '8px 10px', color: '#64748b' }}>{p.payment_date}</td>
                    <td style={{ padding: '8px 10px' }}><button onClick={() => delPay(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex' }}><Trash2 size={12} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {detailTab === 'avances' && (
            detailAdv.length === 0 ? <p style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>{t.empEmptyAdvances}</p> :
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead><tr style={{ background: '#f8fafc' }}>{[t.empAdvColDate, t.empAdvColAmount, t.empAdvColReason, t.empAdvColMethod, ''].map(h => TH(h))}</tr></thead>
              <tbody>
                {detailAdv.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px', color: '#64748b' }}>{a.date}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#f97316' }}>{fmt(a.amount)}</td>
                    <td style={{ padding: '8px 10px' }}>{a.reason || '-'}</td>
                    <td style={{ padding: '8px 10px' }}>{payLbl(a.payment_method)}</td>
                    <td style={{ padding: '8px 10px' }}><button onClick={() => delAdv(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex' }}><Trash2 size={12} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {detailTab === 'dettes' && (
            detailDebt.length === 0 ? <p style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>{t.empEmptyDebts}</p> :
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead><tr style={{ background: '#f8fafc' }}>{[t.empDebtColDate, t.empDebtColAmount, t.empDebtColRemaining, t.empDebtColDesc, t.empDebtColStatus, ''].map(h => TH(h))}</tr></thead>
              <tbody>
                {detailDebt.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px', color: '#64748b' }}>{d.date}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#ef4444' }}>{fmt(d.amount)}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: d.remaining > 0 ? '#ef4444' : '#16a34a' }}>{fmt(d.remaining)}</td>
                    <td style={{ padding: '8px 10px' }}>{d.description || '-'}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ background: d.status === 'en_cours' ? '#fef2f2' : '#f0fdf4', color: d.status === 'en_cours' ? '#b91c1c' : '#15803d', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700 }}>
                        {d.status === 'en_cours' ? 'En cours' : 'Solde'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px' }}><button onClick={() => delDebt(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex' }}><Trash2 size={12} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <Footer><button onClick={() => setDetailUser(null)} style={btnS}>{t.close}</button></Footer>
        </Modal>
      )}
    </div>
  );
}
