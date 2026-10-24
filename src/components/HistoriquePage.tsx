import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, RefreshCw, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  DollarSign, Trash2, X, Clock, Calendar, User,
  TrendingUp, Printer, FileText
} from 'lucide-react';
import type { Language, Translations } from '../i18n';
import { translations } from '../i18n';
import { hasPermission } from '../permissions';

interface Vente {
  id: number;
  sale_number: string;
  client_id?: number;
  client_name: string;
  user_id?: number;
  user_name: string;
  total_amount: number;
  total_cost?: number;
  cash_received: number;
  credit_amount: number;
  gross_profit: number;
  payment_status: string;
  created_at: string;
}

interface Props {
  currentLang: Language | string;
  currentUser: any;
}

const api = (window as any).electronAPI;
const fmt = (n: number) => `${(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA`;
const today = () => new Date().toISOString().slice(0, 10);

const inp: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '13px',
  color: '#0f172a',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box' as const
};
const inpSm: React.CSSProperties = { ...inp, padding: '6px 10px', fontSize: '12px' };
const btnG: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  background: '#16a34a',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer'
};
const btnS: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 12px',
  background: '#fff',
  color: '#475569',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer'
};
const btnR: React.CSSProperties = { ...btnG, background: '#ef4444' };

function Modal({ title, onClose, children, wide = false, isRtl = false }: any) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,23,42,0.65)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px',
      direction: isRtl ? 'rtl' : 'ltr'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: wide ? '960px' : '540px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          padding: '16px 22px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status, t }: { status: string; t: Translations }) {
  const map: Record<string, [string, string, string]> = {
    paye: ['#f0fdf4', '#15803d', '#bbf7d0'],
    partiel: ['#fffbeb', '#b45309', '#fde68a'],
    credit: ['#fef2f2', '#b91c1c', '#fecaca']
  };
  const [bg, color, border] = map[status] || ['#f1f5f9', '#475569', '#e2e8f0'];
  const label = status === 'paye' ? (t.histStatusPaid || 'Payé') : status === 'partiel' ? (t.histStatusPartial || 'Partiel') : (t.histStatusCredit || 'Crédit');
  return (
    <span style={{
      background: bg,
      color,
      border: `1px solid ${border}`,
      padding: '3px 9px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 800,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px'
    }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: color }}></span>
      {label}
    </span>
  );
}

export default function HistoriqueVentesPage({ currentLang, currentUser }: Props) {
  const t: Translations = translations[currentLang as Language] || translations.fr;
  const isRtl = currentLang === 'ar';
  const canDeleteSale = hasPermission(currentUser, 'historique.delete');
  const canViewFinancials = hasPermission(currentUser, 'dashboard.financials');
  const isAdmin = currentUser?.role === 'admin' || canViewFinancials;

  const [ventes, setVentes] = useState<Vente[]>([]);
  const [ventesTotal, setVentesTotal] = useState(0);
  const [ventesPages, setVentesPages] = useState(1);
  const [ventesPage, setVentesPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [stats, setStats] = useState<any>(null);

  // Filters
  const [histSearch, setHistSearch] = useState('');
  const [histStatus, setHistStatus] = useState('all');
  const [histDateFrom, setHistDateFrom] = useState(today());
  const [histDateTo, setHistDateTo] = useState(today());
  const [selectedUserFilter, setSelectedUserFilter] = useState('all');
  const [selectedClientFilter, setSelectedClientFilter] = useState('all');

  // Lists for dropdown filters
  const [usersList, setUsersList] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);

  const [loadingHist, setLoadingHist] = useState(false);
  const [selectedVente, setSelectedVente] = useState<any>(null);

  const [caisses, setCaisses] = useState<any[]>([]);
  const [selectedCaisse, setSelectedCaisse] = useState<number | null>(null);

  // Payment modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', notes: '' });

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadVentes = useCallback(async () => {
    setLoadingHist(true);
    try {
      const res = api?.getVentes ? await api.getVentes({
        search: histSearch,
        payment_status: histStatus,
        date_from: histDateFrom,
        date_to: histDateTo,
        user_id: selectedUserFilter !== 'all' ? selectedUserFilter : undefined,
        client_id: selectedClientFilter !== 'all' ? selectedClientFilter : undefined,
        page: ventesPage,
        pageSize
      }) : null;
      if (res?.success) {
        setVentes(res.ventes || []);
        setVentesTotal(res.total || 0);
        setVentesPages(res.totalPages || 1);
        if (res.stats) setStats(res.stats);
      }
    } finally {
      setLoadingHist(false);
    }
  }, [histSearch, histStatus, histDateFrom, histDateTo, selectedUserFilter, selectedClientFilter, ventesPage, pageSize]);

  const loadCaisses = useCallback(async () => {
    const res = api?.getCaisses ? await api.getCaisses() : null;
    if (res?.success) {
      const list = res.caisses || [];
      setCaisses(list);
      if (!selectedCaisse && list.length > 0) setSelectedCaisse(list[0].id);
    }
  }, [selectedCaisse]);

  const loadUsersAndClients = useCallback(async () => {
    try {
      if (api?.getUsers) {
        const u = await api.getUsers();
        if (Array.isArray(u)) setUsersList(u);
      }
      if (api?.getClients) {
        const c = await api.getClients({ pageSize: 500 });
        if (c?.success && Array.isArray(c.clients)) setClientsList(c.clients);
      }
    } catch {}
  }, []);

  useEffect(() => { loadVentes(); }, [loadVentes]);
  useEffect(() => { loadCaisses(); }, [loadCaisses]);
  useEffect(() => { loadUsersAndClients(); }, [loadUsersAndClients]);

  // Quick date presets
  const applyDatePreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'all') => {
    const now = new Date();
    setVentesPage(1);
    if (preset === 'today') {
      const d = today();
      setHistDateFrom(d);
      setHistDateTo(d);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const ds = y.toISOString().slice(0, 10);
      setHistDateFrom(ds);
      setHistDateTo(ds);
    } else if (preset === 'week') {
      const w = new Date();
      w.setDate(w.getDate() - 7);
      setHistDateFrom(w.toISOString().slice(0, 10));
      setHistDateTo(today());
    } else if (preset === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setHistDateFrom(start);
      setHistDateTo(today());
    } else if (preset === 'all') {
      setHistDateFrom('');
      setHistDateTo('');
    }
  };

  const openVenteDetail = async (v: Vente) => {
    const res = api?.getVenteById ? await api.getVenteById(v.id) : null;
    if (res?.success) setSelectedVente(res);
  };

  const handleAddPayment = async () => {
    if (!selectedVente || !parseFloat(payForm.amount)) return showToast(t.empToastInvalidAmount || 'Montant invalide', 'error');
    const res = api?.addVentePaiement ? await api.addVentePaiement({
      vente_id: selectedVente.vente.id,
      amount: parseFloat(payForm.amount),
      user_id: currentUser?.id,
      user_name: currentUser?.full_name || currentUser?.username,
      caisse_id: selectedCaisse,
      notes: payForm.notes
    }) : { success: false };
    if (res?.success) {
      showToast(t.histPaymentSavedToast || 'Paiement enregistré avec succès');
      setShowPayModal(false);
      setPayForm({ amount: '', notes: '' });
      const updated = api?.getVenteById ? await api.getVenteById(selectedVente.vente.id) : null;
      if (updated?.success) setSelectedVente(updated);
      loadVentes();
    } else {
      showToast(res?.message || 'Erreur', 'error');
    }
  };

  const deleteVente = async (id: number, saleNumber: string) => {
    const confirmMsg = `ATTENTION: Êtes-vous sûr de vouloir supprimer la vente ${saleNumber} ?\n\nCette action va automatiquement :\n✔ Réintégrer tous les articles au stock\n✔ Déduire l'argent des caisses\n✔ Annuler la dette du client (si vente à crédit)\n✔ Supprimer l'opération des transactions`;
    if (!window.confirm(confirmMsg)) return;

    const res = api?.deleteVente
      ? await api.deleteVente({ id, user_name: currentUser?.full_name || currentUser?.username || 'Admin' })
      : { success: false };

    if (res?.success) {
      showToast(t.histSaleDeletedToast || 'Vente supprimée et données restaurées (stock, caisse, dette) avec succès !');
      setSelectedVente(null);
      loadVentes();
    } else {
      showToast(res?.message || 'Erreur lors de la suppression', 'error');
    }
  };

  return (
    <div style={{
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      minHeight: 'calc(100vh - 60px)',
      direction: isRtl ? 'rtl' : 'ltr'
    }}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          [isRtl ? 'left' : 'right']: '20px',
          zIndex: 2000,
          background: toast.type === 'success' ? '#15803d' : '#dc2626',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '10px',
          fontWeight: 700,
          fontSize: '13px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={22} color="#16a34a" /> {t.histTitle || 'Historique des Ventes'}
          </h1>
          <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0' }}>
            {t.histSubtitle || 'Consulter, filtrer par caissier/client et gérer les ventes effectuées'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={loadVentes} className="btn-secondary" style={{ fontSize: '12px', padding: '7px 14px' }}>
            <RefreshCw size={13} className={loadingHist ? 'animate-spin' : ''} /> {t.dashRefresh || 'Actualiser'}
          </button>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        {/* Total Ventes Count */}
        <div style={{
          background: '#fff',
          padding: '14px 16px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
            Total Ventes
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
            {ventesTotal}
          </div>
        </div>

        {/* Chiffre d'Affaires */}
        <div style={{
          background: '#fff',
          padding: '14px 16px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
            Chiffre d'Affaires
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#0284c7', marginTop: '4px' }}>
            {fmt(stats?.total_amount_sum || 0)}
          </div>
        </div>

        {/* Encaissé */}
        <div style={{
          background: '#fff',
          padding: '14px 16px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
            Total Encaissé
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#16a34a', marginTop: '4px' }}>
            {fmt(stats?.cash_received_sum || 0)}
          </div>
        </div>

        {/* Crédit Restant */}
        <div style={{
          background: '#fff',
          padding: '14px 16px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
            Total Crédit (Dettes)
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#dc2626', marginTop: '4px' }}>
            {fmt(stats?.credit_amount_sum || 0)}
          </div>
        </div>

        {/* Bénéfice Net Total (si admin/manager) */}
        {isAdmin && (
          <div style={{
            background: '#f0fdf4',
            padding: '14px 16px',
            borderRadius: '10px',
            border: '1px solid #86efac',
            boxShadow: '0 1px 3px rgba(22,163,74,0.08)'
          }}>
            <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Bénéfice Net (Profit)</span>
              <TrendingUp size={14} color="#16a34a" />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#15803d', marginTop: '4px' }}>
              {fmt(stats?.gross_profit_sum || 0)}
            </div>
            <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 700, marginTop: '2px' }}>
              Marge: {stats?.total_amount_sum > 0 ? ((stats.gross_profit_sum / stats.total_amount_sum) * 100).toFixed(1) : '0.0'}%
            </div>
          </div>
        )}
      </div>

      {/* ADVANCED FILTERS PANEL */}
      <div style={{
        background: '#fff',
        padding: '14px 16px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {/* Quick Date Range Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginRight: '4px' }}>
            Période :
          </span>
          {[
            { id: 'today', label: "Aujourd'hui" },
            { id: 'yesterday', label: 'Hier' },
            { id: 'week', label: '7 Derniers Jours' },
            { id: 'month', label: 'Ce Mois' },
            { id: 'all', label: 'Tout' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => applyDatePreset(p.id as any)}
              style={{
                padding: '4px 9px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Filters Controls Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px', alignItems: 'center' }}>
          {/* Live Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              value={histSearch}
              onChange={e => { setHistSearch(e.target.value); setVentesPage(1); }}
              placeholder="N° Vente, client..."
              style={{ ...inpSm, [isRtl ? 'paddingRight' : 'paddingLeft']: '30px' }}
            />
          </div>

          {/* Filter by User / Cashier */}
          <div>
            <select
              value={selectedUserFilter}
              onChange={e => { setSelectedUserFilter(e.target.value); setVentesPage(1); }}
              style={inpSm}
            >
              <option value="all">👤 Tous les vendeurs</option>
              {usersList.map(u => (
                <option key={u.id} value={u.id}>
                  👤 {u.full_name || u.username} ({u.role || 'caissier'})
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Client */}
          <div>
            <select
              value={selectedClientFilter}
              onChange={e => { setSelectedClientFilter(e.target.value); setVentesPage(1); }}
              style={inpSm}
            >
              <option value="all">👥 Tous les clients</option>
              {clientsList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Status */}
          <div>
            <select
              value={histStatus}
              onChange={e => { setHistStatus(e.target.value); setVentesPage(1); }}
              style={inpSm}
            >
              <option value="all">🏷️ Tous les statuts</option>
              <option value="paye">✅ {t.histStatusPaid || 'Payé'}</option>
              <option value="partiel">⏳ {t.histStatusPartial || 'Partiel'}</option>
              <option value="credit">❌ {t.histStatusCredit || 'Crédit'}</option>
            </select>
          </div>

          {/* Date Range Inputs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={13} color="#64748b" />
            <input
              type="date"
              value={histDateFrom}
              onChange={e => { setHistDateFrom(e.target.value); setVentesPage(1); }}
              style={{ ...inpSm, padding: '4px 6px', fontSize: '11px' }}
            />
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>à</span>
            <input
              type="date"
              value={histDateTo}
              onChange={e => { setHistDateTo(e.target.value); setVentesPage(1); }}
              style={{ ...inpSm, padding: '4px 6px', fontSize: '11px' }}
            />
          </div>

          {/* Page Size Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', fontWeight: 700 }}>Par page :</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setVentesPage(1); }}
              style={{ ...inpSm, width: '70px', padding: '4px 6px' }}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      {/* MAIN SALES TABLE */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {[
                t.histColSaleNum || 'N° Vente',
                t.histColDate || 'Date & Heure',
                t.histColClient || 'Client',
                'Vendeur / Caissier',
                t.histColTotal || 'Total',
                t.histColPaid || 'Encaissé',
                t.histColCredit || 'Crédit',
                ...(isAdmin ? ['Bénéfice'] : []),
                t.histColStatus || 'Statut',
                t.histColActions || 'Actions'
              ].map(h => (
                <th key={h} style={{
                  padding: '10px 14px',
                  textAlign: isRtl ? 'right' : 'left',
                  fontWeight: 800,
                  color: '#475569',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap'
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadingHist ? (
              <tr>
                <td colSpan={isAdmin ? 10 : 9} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px', color: '#16a34a', display: 'block' }} />
                  {t.histLoading || 'Chargement des ventes...'}
                </td>
              </tr>
            ) : ventes.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 10 : 9} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  <FileText size={30} style={{ margin: '0 auto 8px', opacity: 0.3, display: 'block' }} />
                  {t.histNoSales || 'Aucune vente trouvée'}
                </td>
              </tr>
            ) : (
              ventes.map(v => (
                <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                  <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a' }}>
                    {v.sale_number}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '11px', whiteSpace: 'nowrap' }}>
                    {new Date(v.created_at).toLocaleString(currentLang === 'ar' ? 'ar-DZ' : currentLang === 'en' ? 'en-US' : 'fr-FR', {
                      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#334155' }}>
                    {v.client_name || 'Client Anonyme'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#f1f5f9',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}>
                      <User size={11} color="#64748b" />
                      {v.user_name}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 900, color: '#0f172a' }}>
                    {fmt(v.total_amount)}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: 800 }}>
                    {fmt(v.cash_received)}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#ef4444', fontWeight: 800 }}>
                    {v.credit_amount > 0 ? fmt(v.credit_amount) : '—'}
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '10px 14px', color: v.gross_profit >= 0 ? '#15803d' : '#dc2626', fontWeight: 800 }}>
                      {fmt(v.gross_profit)}
                    </td>
                  )}
                  <td style={{ padding: '10px 14px' }}>
                    <StatusBadge status={v.payment_status} t={t} />
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => openVenteDetail(v)}
                        title={t.histViewDetails || 'Voir détails'}
                        style={{ ...btnS, padding: '5px 8px' }}
                      >
                        <Eye size={13} />
                      </button>
                      {v.credit_amount > 0 && (
                        <button
                          onClick={() => { openVenteDetail(v); setShowPayModal(true); }}
                          title={t.histCollectCredit || 'Encaisser crédit'}
                          style={{ ...btnG, padding: '5px 8px', fontSize: '11px' }}
                        >
                          <DollarSign size={13} />
                        </button>
                      )}
                      {canDeleteSale && (
                        <button
                          onClick={() => deleteVente(v.id, v.sale_number)}
                          title={t.histDeleteSale || 'Supprimer cette vente'}
                          style={{ ...btnR, padding: '5px 8px', fontSize: '11px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* PAGINATION BAR ("system of par page") */}
        <div style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #f1f5f9',
          background: '#f8fafc',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
            Affichage de {ventesTotal === 0 ? 0 : (ventesPage - 1) * pageSize + 1} à {Math.min(ventesPage * pageSize, ventesTotal)} sur {ventesTotal} ventes
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              disabled={ventesPage <= 1}
              onClick={() => setVentesPage(1)}
              style={{ ...btnS, padding: '4px 8px' }}
              title="Première page"
            >
              <ChevronsLeft size={13} />
            </button>
            <button
              disabled={ventesPage <= 1}
              onClick={() => setVentesPage(p => p - 1)}
              style={{ ...btnS, padding: '4px 8px' }}
              title="Page précédente"
            >
              <ChevronLeft size={13} />
            </button>

            {/* Current page indicator */}
            <span style={{
              background: '#16a34a',
              color: '#fff',
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 800
            }}>
              {ventesPage} / {ventesPages}
            </span>

            <button
              disabled={ventesPage >= ventesPages}
              onClick={() => setVentesPage(p => p + 1)}
              style={{ ...btnS, padding: '4px 8px' }}
              title="Page suivante"
            >
              <ChevronRight size={13} />
            </button>
            <button
              disabled={ventesPage >= ventesPages}
              onClick={() => setVentesPage(ventesPages)}
              style={{ ...btnS, padding: '4px 8px' }}
              title="Dernière page"
            >
              <ChevronsRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ENHANCED VENTE DETAIL MODAL ("better design for vente detaills and also show benifit") */}
      {selectedVente && !showPayModal && (
        <Modal
          title={`Détails de la vente ${selectedVente.vente.sale_number}`}
          onClose={() => setSelectedVente(null)}
          wide
          isRtl={isRtl}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Top Cards: General Info & Financials */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '10px'
            }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Total Vente</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                  {fmt(selectedVente.vente.total_amount)}
                </div>
              </div>

              <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 800, textTransform: 'uppercase' }}>Montant Encaissé</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#15803d', marginTop: '2px' }}>
                  {fmt(selectedVente.vente.cash_received)}
                </div>
              </div>

              <div style={{ background: selectedVente.vente.credit_amount > 0 ? '#fef2f2' : '#f8fafc', padding: '12px', borderRadius: '8px', border: `1px solid ${selectedVente.vente.credit_amount > 0 ? '#fecaca' : '#e2e8f0'}` }}>
                <div style={{ fontSize: '10px', color: selectedVente.vente.credit_amount > 0 ? '#b91c1c' : '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Crédit Restant</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: selectedVente.vente.credit_amount > 0 ? '#dc2626' : '#64748b', marginTop: '2px' }}>
                  {fmt(selectedVente.vente.credit_amount)}
                </div>
              </div>

              {isAdmin && (
                <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '8px', border: '1px solid #6ee7b7' }}>
                  <div style={{ fontSize: '10px', color: '#065f46', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Bénéfice (Marge)</span>
                    <TrendingUp size={13} color="#059669" />
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#047857', marginTop: '2px' }}>
                    {fmt(selectedVente.vente.gross_profit)}
                  </div>
                  <div style={{ fontSize: '10px', color: '#059669', fontWeight: 700 }}>
                    Marge: {selectedVente.vente.total_amount > 0 ? ((selectedVente.vente.gross_profit / selectedVente.vente.total_amount) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              )}
            </div>

            {/* Metadata banner: User & Client details */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: '#64748b' }}>Vendeur :</span>
                <span style={{ fontWeight: 800, color: '#0f172a', background: '#e2e8f0', padding: '2px 8px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <User size={11} /> {selectedVente.vente.user_name}
                </span>
                <span style={{ color: '#94a3b8' }}>•</span>
                <span style={{ color: '#64748b' }}>
                  {new Date(selectedVente.vente.created_at).toLocaleString()}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: '#64748b' }}>Client :</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>
                  {selectedVente.vente.client_full_name || selectedVente.vente.client_name || 'Client Anonyme'}
                </span>
                {selectedVente.vente.client_phone && (
                  <span style={{ color: '#64748b', fontSize: '11px' }}>({selectedVente.vente.client_phone})</span>
                )}
                <StatusBadge status={selectedVente.vente.payment_status} t={t} />
              </div>
            </div>

            {/* Sold Items Table with Benefit per line */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={15} color="#16a34a" /> Articles Vendus ({selectedVente.lignes?.length || 0})
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '11px' }}>Produit</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: '#475569', fontSize: '11px' }}>Qté</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#475569', fontSize: '11px' }}>Prix Vente</th>
                      {isAdmin && (
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#475569', fontSize: '11px' }}>Prix Achat</th>
                      )}
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#475569', fontSize: '11px' }}>Total</th>
                      {isAdmin && (
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#047857', fontSize: '11px' }}>Bénéfice</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVente.lignes?.map((l: any) => {
                      const lineProfit = l.line_profit !== undefined ? l.line_profit : ((l.selling_price_snapshot - l.cost_price_snapshot) * l.quantity);
                      return (
                        <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>
                            {l.product_name}
                            <span style={{ fontSize: '9px', background: '#f1f5f9', color: '#64748b', padding: '1px 5px', borderRadius: '4px', marginLeft: '6px' }}>
                              {l.unit_name}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800 }}>
                            {l.quantity}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            {fmt(l.selling_price_snapshot)}
                          </td>
                          {isAdmin && (
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b' }}>
                              {fmt(l.cost_price_snapshot)}
                            </td>
                          )}
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                            {fmt(l.line_total)}
                          </td>
                          {isAdmin && (
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: lineProfit >= 0 ? '#16a34a' : '#dc2626' }}>
                              {fmt(lineProfit)}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Received Payments History (if credit sale) */}
            {selectedVente.paiements?.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  Paiements Reçus ({selectedVente.paiements.length})
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', background: '#f8fafc' }}>
                  {selectedVente.paiements.map((p: any) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
                      <span style={{ color: '#475569' }}>
                        📅 {p.payment_date} {p.user_name ? `• Par ${p.user_name}` : ''} {p.notes ? `(${p.notes})` : ''}
                      </span>
                      <span style={{ fontWeight: 800, color: '#16a34a' }}>{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => setSelectedVente(null)} style={btnS}>
                Fermer
              </button>
              <button onClick={() => window.print()} style={{ ...btnS, color: '#0284c7', borderColor: '#bae6fd' }}>
                <Printer size={13} /> Imprimer Reçu
              </button>
              {selectedVente.vente.credit_amount > 0 && (
                <button onClick={() => setShowPayModal(true)} style={btnG}>
                  <DollarSign size={14} /> Encaisser le Crédit
                </button>
              )}
              {isAdmin && (
                <button onClick={() => deleteVente(selectedVente.vente.id, selectedVente.vente.sale_number)} style={btnR}>
                  <Trash2 size={14} /> Supprimer & Restaurer Stock/Caisse
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* PAYMENT MODAL */}
      {showPayModal && selectedVente && (
        <Modal
          title={`Encaisser Crédit — ${selectedVente.vente.sale_number}`}
          onClose={() => setShowPayModal(false)}
          isRtl={isRtl}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', direction: isRtl ? 'rtl' : 'ltr' }}>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: 600 }}>Crédit Restant à Payer</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#b91c1c' }}>{fmt(selectedVente.vente.credit_amount)}</div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Caisse Destination</label>
              <select style={inp} value={selectedCaisse || ''} onChange={e => setSelectedCaisse(parseInt(e.target.value))}>
                <option value="">Aucune caisse</option>
                {caisses.map(c => <option key={c.id} value={c.id}>{c.name} ({fmt(c.current_balance || 0)})</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Montant Reçu (DA)</label>
              <input
                type="number"
                min="0.01"
                max={selectedVente.vente.credit_amount}
                step="0.01"
                style={inp}
                value={payForm.amount}
                onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Notes (Optionnel)</label>
              <input style={inp} value={payForm.notes} onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} placeholder="Ex: Règlement partiel client" />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button onClick={() => setShowPayModal(false)} style={btnS}>{t.cancel || 'Annuler'}</button>
              <button onClick={handleAddPayment} style={btnG}><DollarSign size={14} /> Confirmer l'encaissement</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
