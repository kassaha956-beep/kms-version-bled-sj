import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, DollarSign, Package, AlertCircle, RefreshCw,
  Calendar, BarChart2, Users, ShoppingBag, ShieldCheck,
  CheckCircle, Wallet, CreditCard, Activity, Layers,
  ChevronRight, Check
} from 'lucide-react';
import type { Language, Translations } from '../i18n';
import { translations } from '../i18n';

interface Props {
  currentLang: Language | string;
  currentUser: any;
}

const api = (window as any).electronAPI;
const fmt = (n: number) => `${(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA`;
const fmtNum = (n: number) => (n || 0).toLocaleString('fr-FR');

function getPresetDates(preset: string): { from: string; to: string } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (preset === 'today') {
    return { from: today, to: today };
  }
  if (preset === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yStr = y.toISOString().slice(0, 10);
    return { from: yStr, to: yStr };
  }
  if (preset === '7days') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { from: d.toISOString().slice(0, 10), to: today };
  }
  if (preset === 'thisMonth') {
    const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    return { from, to: today };
  }
  if (preset === 'lastMonth') {
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      from: prevMonth.toISOString().slice(0, 10),
      to: lastDay.toISOString().slice(0, 10)
    };
  }
  if (preset === 'thisYear') {
    return { from: `${now.getFullYear()}-01-01`, to: today };
  }
  return { from: today, to: today };
}

// Visual Mini-Bar Component for Tables
function MiniBar({ percent, color }: { percent: number; color: string }) {
  const p = Math.min(100, Math.max(0, percent));
  return (
    <div style={{ width: '100%', maxWidth: '100px', height: '6px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle' }}>
      <div style={{ width: `${p}%`, height: '100%', background: color, borderRadius: '4px' }} />
    </div>
  );
}

// KPI Card Component
function KpiCard({ icon, label, value, sub, color, bg, badge }: any) {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '14px',
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: bg,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {icon}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>{label}</span>
        </div>
        {badge && (
          <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', background: bg, color }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.3px', marginTop: '2px' }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage({ currentLang, currentUser }: Props) {
  const t: Translations = translations[currentLang as Language] || translations.fr;
  const isRtl = currentLang === 'ar';
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  // Active view tab
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'products' | 'cashiers' | 'treasury' | 'credits' | 'employees' | 'reconciliation'>('overview');

  // Filter state
  const [filterPreset, setFilterPreset] = useState<string>('thisMonth');
  const [dateFrom, setDateFrom] = useState<string>(() => getPresetDates('thisMonth').from);
  const [dateTo, setDateTo] = useState<string>(() => getPresetDates('thisMonth').to);

  // Data state
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [reconLogs, setReconLogs] = useState<any[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Change preset
  const handlePresetChange = (preset: string) => {
    setFilterPreset(preset);
    if (preset !== 'custom') {
      const dates = getPresetDates(preset);
      setDateFrom(dates.from);
      setDateTo(dates.to);
    }
  };

  // Load dashboard from precomputed tables
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = api?.getStatsDashboard
        ? await api.getStatsDashboard({ date_from: dateFrom, date_to: dateTo })
        : api?.getVentesDashboard
        ? await api.getVentesDashboard({ date_from: dateFrom, date_to: dateTo })
        : null;

      if (res?.success) {
        setData(res);
      } else if (res?.message) {
        showToast(res.message, 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Erreur lors du chargement des statistiques', 'error');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  // Load reconciliation logs
  const loadReconLogs = useCallback(async () => {
    if (!isAdmin) return;
    try {
      if (api?.getStatsReconciliationLogs) {
        const res = await api.getStatsReconciliationLogs();
        if (res?.success) setReconLogs(res.logs || []);
      }
    } catch (_) {}
  }, [isAdmin]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (activeTab === 'reconciliation') {
      loadReconLogs();
    }
  }, [activeTab, loadReconLogs]);

  // Execute admin reconciliation
  const handleRunReconciliation = async () => {
    if (!isAdmin) return;
    setReconciling(true);
    try {
      if (api?.reconcileStats) {
        const res = await api.reconcileStats({
          date_from: dateFrom,
          date_to: dateTo,
          user_name: currentUser?.full_name || currentUser?.username || 'Admin'
        });
        if (res?.success) {
          showToast(t.statsReconcileSuccess || 'Réconciliation terminée avec succès !');
          await loadDashboard();
          await loadReconLogs();
        } else {
          showToast(res?.message || 'Erreur lors de la réconciliation', 'error');
        }
      }
    } catch (e: any) {
      showToast(e.message || 'Erreur réconciliation', 'error');
    } finally {
      setReconciling(false);
    }
  };

  const kpi = data?.kpi || {};
  const inventory = data?.inventory || {};
  const authoritative = data?.authoritative || {};
  const dailyTrend = data?.dailyTrend || [];
  const byUser = data?.byUser || [];
  const byProduct = data?.byProduct || [];
  const byCaisse = data?.byCaisse || [];
  const creditSummary = data?.creditSummary || {};
  const employeeSummary = data?.employeeSummary || {};

  // Maximum revenue in daily trend for SVG chart scaling
  const maxDayRevenue = useMemo(() => {
    if (!dailyTrend.length) return 1;
    return Math.max(...dailyTrend.map((d: any) => d.total_revenue || 0), 100);
  }, [dailyTrend]);

  return (
    <div style={{
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      minHeight: 'calc(100vh - 60px)',
      background: '#f8fafc',
      direction: isRtl ? 'rtl' : 'ltr'
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: isRtl ? 'auto' : '20px',
          left: isRtl ? '20px' : 'auto',
          zIndex: 9999,
          background: toast.type === 'success' ? '#15803d' : '#dc2626',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 700,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '18px 22px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(22,163,74,0.25)' }}>
              <BarChart2 size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                {t.dashTitle || 'Statistiques & Performance'}
              </h1>
              <p style={{ color: '#64748b', fontSize: '12px', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{t.dashSubtitle || 'Indicateurs clés précalculés par triggers en temps réel'}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#15803d', padding: '1px 8px', borderRadius: '10px', fontWeight: 800, fontSize: '10px' }}>
                  <Activity size={10} /> Temps Réel
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Date Filters & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          {/* Preset Buttons */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', gap: '2px' }}>
            {[
              { id: 'today', label: t.statsFilterToday || "Aujourd'hui" },
              { id: 'yesterday', label: t.statsFilterYesterday || 'Hier' },
              { id: '7days', label: t.statsFilter7Days || '7 jours' },
              { id: 'thisMonth', label: t.statsFilterThisMonth || 'Ce mois' },
              { id: 'thisYear', label: t.statsFilterThisYear || 'Cette année' },
              { id: 'custom', label: t.statsFilterCustom || 'Perso' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '7px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: filterPreset === p.id ? '#ffffff' : 'transparent',
                  color: filterPreset === p.id ? '#15803d' : '#64748b',
                  boxShadow: filterPreset === p.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date Pickers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '10px' }}>
            <Calendar size={14} color="#64748b" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setFilterPreset('custom'); }}
              style={{ border: 'none', fontSize: '12px', color: '#0f172a', outline: 'none', background: 'transparent' }}
            />
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>→</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setFilterPreset('custom'); }}
              style={{ border: 'none', fontSize: '12px', color: '#0f172a', outline: 'none', background: 'transparent' }}
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadDashboard}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {t.dashRefresh || 'Actualiser'}
          </button>

          {/* Admin Reconcile Shortcut */}
          {isAdmin && (
            <button
              onClick={handleRunReconciliation}
              disabled={reconciling}
              title={t.statsReconcileDesc || "Recalcule et réconcilie les statistiques avec les tables de transactions"}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(22,163,74,0.2)'
              }}
            >
              <ShieldCheck size={14} className={reconciling ? 'animate-spin' : ''} />
              {reconciling ? (t.statsReconcileRunning || 'Vérification...') : (t.statsReconcileBtn || 'Réconcilier')}
            </button>
          )}
        </div>
      </div>

      {/* Authoritative Live Balances Callout (Real-Time Safety Ledger) */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        color: '#ffffff',
        borderRadius: '14px',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 4px 16px rgba(15,23,42,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={18} color="#4ade80" />
          </div>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', fontWeight: 800 }}>
              {t.statsLiveCashRegisters || 'Trésorerie Réelle En Direct (Toutes Caisses Ouvertes)'}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#4ade80' }}>
              {fmt(authoritative.liveTotalCash || 0)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={18} color="#f87171" />
          </div>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', fontWeight: 800 }}>
              {t.statsLiveClientDebt || 'Créances Clients Totales En Cours (Dettes Actives)'}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#f87171' }}>
              {fmt(authoritative.liveTotalCredit || 0)}
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#cbd5e1', marginLeft: '8px' }}>
                ({authoritative.activeDebtorsCount || 0} {t.statsActiveDebtors || 'clients endettés'})
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={18} color="#60a5fa" />
          </div>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', fontWeight: 800 }}>
              {t.statsInventoryValuationCost || 'Valeur Globale du Stock (Prix d’Achat)'}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#60a5fa' }}>
              {fmt(inventory.total_inventory_valuation_cost || 0)}
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#cbd5e1', marginLeft: '8px' }}>
                ({fmtNum(inventory.total_units_stock || 0)} unités)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div style={{
        display: 'flex',
        gap: '6px',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '2px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'overview', label: t.statsTabOverview || 'Aperçu & KPIs', icon: <Layers size={15} /> },
          { id: 'trends', label: t.statsTabTrends || 'Tendances Ventes', icon: <TrendingUp size={15} /> },
          { id: 'products', label: t.statsTabProducts || 'Produits & Rentabilité', icon: <Package size={15} /> },
          { id: 'cashiers', label: t.statsTabCashiers || 'Caissiers & Vendeurs', icon: <Users size={15} /> },
          { id: 'treasury', label: t.statsTabTreasury || 'Trésorerie & Caisses', icon: <Wallet size={15} /> },
          { id: 'credits', label: t.statsTabCredit || 'Crédits & Recouvrements', icon: <CreditCard size={15} /> },
          { id: 'employees', label: t.statsTabEmployees || 'Paie & Avances', icon: <DollarSign size={15} /> },
          ...(isAdmin ? [{ id: 'reconciliation', label: t.statsTabReconciliation || 'Audit & Réconciliation', icon: <ShieldCheck size={15} /> }] : [])
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              border: 'none',
              borderRadius: '10px 10px 0 0',
              fontSize: '12px',
              fontWeight: activeTab === tab.id ? 800 : 600,
              cursor: 'pointer',
              background: activeTab === tab.id ? '#ffffff' : 'transparent',
              color: activeTab === tab.id ? '#15803d' : '#64748b',
              borderBottom: activeTab === tab.id ? '2px solid #16a34a' : '2px solid transparent',
              boxShadow: activeTab === tab.id ? '0 -1px 3px rgba(0,0,0,0.02)' : 'none',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading Placeholder */}
      {loading && !data && (
        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', fontWeight: 600 }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          {t.dashLoading || 'Chargement des statistiques...'}
        </div>
      )}

      {/* Main Content Sections */}
      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* Primary KPI Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
                <KpiCard
                  icon={<TrendingUp size={20} />}
                  label={t.dashTotalRevenue || "Chiffre d'Affaires"}
                  value={fmt(kpi.total_ca || 0)}
                  color="#15803d"
                  bg="#f0fdf4"
                  sub={`${kpi.nb_completed || 0} ventes validées`}
                />
                <KpiCard
                  icon={<DollarSign size={20} />}
                  label={t.dashGrossProfit || "Marge Brute"}
                  value={fmt(kpi.total_profit || 0)}
                  color="#16a34a"
                  bg="#ecfdf5"
                  badge={`${kpi.margin_rate || 0}% marge`}
                  sub={`Coût d'achat: ${fmt(kpi.total_cout || 0)}`}
                />
                <KpiCard
                  icon={<Wallet size={20} />}
                  label={t.statsCashCollected || "Cash Encaissé"}
                  value={fmt(kpi.total_cash || 0)}
                  color="#0891b2"
                  bg="#ecfeff"
                  sub="Encaissé directement en caisse"
                />
                <KpiCard
                  icon={<CreditCard size={20} />}
                  label={t.dashNewCredit || "Crédits Émis"}
                  value={fmt(kpi.total_credit || 0)}
                  color="#dc2626"
                  bg="#fef2f2"
                  sub="Part des ventes portée en compte"
                />
                <KpiCard
                  icon={<ShoppingBag size={20} />}
                  label={t.statsAvgBasket || "Panier Moyen"}
                  value={fmt(kpi.panier_moyen || 0)}
                  color="#2563eb"
                  bg="#eff6ff"
                  sub={`${kpi.nb_ventes || 0} opérations totales`}
                />
              </div>

              {/* Chart & Quick Insights */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '18px' }}>
                {/* Daily Trend Chart (Visual SVG/CSS Bars) */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {t.statsTabTrends || 'Évolution Journalière des Ventes'}
                      </h3>
                      <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>
                        Chiffre d'affaires et marge brute par date
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', fontWeight: 700 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#15803d' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#16a34a' }} /> CA
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#0891b2' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#0891b2' }} /> Marge
                      </span>
                    </div>
                  </div>

                  {dailyTrend.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                      Aucune transaction enregistrée pour cette période.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '180px', paddingTop: '10px', overflowX: 'auto' }}>
                      {dailyTrend.map((d: any) => {
                        const hCa = Math.max(8, (d.total_revenue / maxDayRevenue) * 150);
                        const hProfit = Math.max(4, (d.gross_profit / maxDayRevenue) * 150);
                        return (
                          <div key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '40px', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '150px' }}>
                              <div
                                title={`${d.date} - CA: ${fmt(d.total_revenue)}`}
                                style={{ width: '12px', height: `${hCa}px`, background: '#16a34a', borderRadius: '3px 3px 0 0' }}
                              />
                              <div
                                title={`${d.date} - Marge: ${fmt(d.gross_profit)}`}
                                style={{ width: '12px', height: `${hProfit}px`, background: '#0891b2', borderRadius: '3px 3px 0 0' }}
                              />
                            </div>
                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b' }}>
                              {d.date.slice(5)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Stock & Valuation Card */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Package size={16} color="#16a34a" /> Valorisation & État du Stock
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Valeur Marchande (Prix Vente)</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                        {fmt(inventory.total_inventory_valuation_selling || 0)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, marginTop: '2px' }}>
                        Marge latente: +{fmt(inventory.potential_margin || 0)}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ padding: '10px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fef3c7' }}>
                        <div style={{ fontSize: '10px', color: '#b45309', fontWeight: 700 }}>Alerte Stock</div>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: '#b45309' }}>
                          {inventory.low_stock_count || 0}
                        </div>
                      </div>
                      <div style={{ padding: '10px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fee2e2' }}>
                        <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 700 }}>Ruptures</div>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: '#dc2626' }}>
                          {inventory.out_of_stock_count || 0}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '11px', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                      <span>Articles actifs enregistrés: </span>
                      <strong>{inventory.total_items_count || 0} références</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top 5 Products & Top Cashiers Mini Overview */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                {/* Mini Top Products */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{t.dashTopProducts || 'Top Produits'}</span>
                    <button onClick={() => setActiveTab('products')} style={{ background: 'none', border: 'none', color: '#16a34a', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      Voir tout <ChevronRight size={12} />
                    </button>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <tbody>
                      {byProduct.slice(0, 5).map((p: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '10px 18px', fontWeight: 700, color: '#0f172a' }}>{p.product_name}</td>
                          <td style={{ padding: '10px 18px', color: '#64748b' }}>{fmtNum(p.qty_sold)} vendus</td>
                          <td style={{ padding: '10px 18px', textAlign: 'right', fontWeight: 800, color: '#15803d' }}>{fmt(p.ca)}</td>
                        </tr>
                      ))}
                      {byProduct.length === 0 && (
                        <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Aucune vente</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mini Cashiers */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{t.dashPerfByUser || 'Performance par Caissier'}</span>
                    <button onClick={() => setActiveTab('cashiers')} style={{ background: 'none', border: 'none', color: '#16a34a', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      Voir tout <ChevronRight size={12} />
                    </button>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <tbody>
                      {byUser.slice(0, 5).map((u: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '10px 18px', fontWeight: 700, color: '#0f172a' }}>{u.user_name}</td>
                          <td style={{ padding: '10px 18px', color: '#64748b' }}>{u.nb_ventes} ventes</td>
                          <td style={{ padding: '10px 18px', textAlign: 'right', fontWeight: 800, color: '#15803d' }}>{fmt(u.ca)}</td>
                        </tr>
                      ))}
                      {byUser.length === 0 && (
                        <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Aucune donnée</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: TRENDS & DAILY SALES */}
          {activeTab === 'trends' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Synthèse Journalière & Évolution Temporelle
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0' }}>
                  Agrégats calculés automatiquement par triggers SQLite pour chaque journée
                </p>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['Date', 'Ventes', 'Chiffre d’Affaires', 'Coût d’Achat', 'Marge Brute', '% Marge', 'Cash Encaissé', 'Crédit Émis'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: isRtl ? 'right' : 'left', fontWeight: 700, color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dailyTrend.map((d: any, idx: number) => {
                    const mRate = d.total_revenue > 0 ? Math.round((d.gross_profit / d.total_revenue) * 100) : 0;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>{d.date}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>{d.completed_count} ({d.sales_count})</td>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: '#15803d' }}>{fmt(d.total_revenue)}</td>
                        <td style={{ padding: '12px 14px', color: '#ea580c' }}>{fmt(d.total_cogs)}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: d.gross_profit >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(d.gross_profit)}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontWeight: 800, color: '#0891b2', marginRight: '6px' }}>{mRate}%</span>
                          <MiniBar percent={mRate} color="#0891b2" />
                        </td>
                        <td style={{ padding: '12px 14px', color: '#0891b2', fontWeight: 700 }}>{fmt(d.cash_received)}</td>
                        <td style={{ padding: '12px 14px', color: '#dc2626', fontWeight: 700 }}>{fmt(d.credit_amount)}</td>
                      </tr>
                    );
                  })}
                  {dailyTrend.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>Aucune journée enregistrée sur cette période</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: PRODUCTS & PROFITABILITY */}
          {activeTab === 'products' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Classement des Produits par Rentabilité & Volume
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0' }}>
                  Statistiques issues de la table précalculée stats_daily_products
                </p>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['#', 'Produit', 'Catégorie', 'Volume Vendu', 'Chiffre d’Affaires', 'Coût d’Achat', 'Marge Brute', 'Taux de Marge'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: isRtl ? 'right' : 'left', fontWeight: 700, color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byProduct.map((p: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', color: '#94a3b8', fontWeight: 800 }}>{idx + 1}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>{p.product_name}</td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>
                        <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                          {p.category_name}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>{fmtNum(p.qty_sold)}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#15803d' }}>{fmt(p.ca)}</td>
                      <td style={{ padding: '12px 14px', color: '#ea580c' }}>{fmt(p.cout)}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: p.profit >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(p.profit)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontWeight: 800, color: '#0891b2', marginRight: '6px' }}>{p.margin_percent}%</span>
                        <MiniBar percent={p.margin_percent} color="#0891b2" />
                      </td>
                    </tr>
                  ))}
                  {byProduct.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>Aucune vente de produit sur cette période</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: CASHIERS & SELLERS */}
          {activeTab === 'cashiers' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Activité & Performance par Caissier / Vendeur
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0' }}>
                  Suivi des encaissements et du chiffre d'affaires généré par chaque agent
                </p>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['Utilisateur / Caissier', 'Nb Ventes', 'Chiffre d’Affaires', 'Cash Encaissé', 'Crédits Accordés', 'Marge Dégagée'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: isRtl ? 'right' : 'left', fontWeight: 700, color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byUser.map((u: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>{u.user_name}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>{u.nb_ventes}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#15803d' }}>{fmt(u.ca)}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0891b2' }}>{fmt(u.cash)}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#dc2626' }}>{fmt(u.credit)}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#16a34a' }}>{fmt(u.profit)}</td>
                    </tr>
                  ))}
                  {byUser.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>Aucun utilisateur actif sur cette période</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: TREASURY & CAISSES */}
          {activeTab === 'treasury' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Flux de Trésorerie & Mouvements par Caisse
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0' }}>
                  Entrées, sorties et solde actuel de chaque compte de caisse
                </p>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['Caisse', 'Total Entrées (Inflows)', 'Total Sorties (Outflows)', 'Variation Nette', 'Nb Opérations', 'Solde Actuel En Direct'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: isRtl ? 'right' : 'left', fontWeight: 700, color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byCaisse.map((c: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>{c.caisse_name}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#15803d' }}>+{fmt(c.total_in)}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#dc2626' }}>-{fmt(c.total_out)}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: c.net_change >= 0 ? '#15803d' : '#dc2626' }}>
                        {c.net_change >= 0 ? '+' : ''}{fmt(c.net_change)}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>{c.transaction_count}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 900, color: '#0f172a', background: '#f8fafc' }}>
                        {fmt(c.current_balance)}
                      </td>
                    </tr>
                  ))}
                  {byCaisse.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>Aucun mouvement de caisse sur cette période</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 6: CREDITS & RECOVERY */}
          {activeTab === 'credits' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Activité des Crédits & Recouvrement des Créances
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0' }}>
                  Suivi des nouveaux crédits accordés vs remboursements perçus
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <KpiCard
                  icon={<AlertCircle size={20} />}
                  label="Nouveaux Crédits Accordés"
                  value={fmt(creditSummary.credit_issued || 0)}
                  color="#dc2626"
                  bg="#fef2f2"
                  sub={`${creditSummary.new_debts_count || 0} créances émises`}
                />
                <KpiCard
                  icon={<CheckCircle size={20} />}
                  label="Remboursements Encaissés"
                  value={fmt(creditSummary.credit_repaid || 0)}
                  color="#15803d"
                  bg="#f0fdf4"
                  sub={`${creditSummary.payments_count || 0} règlements reçus`}
                />
                <KpiCard
                  icon={<Activity size={20} />}
                  label="Variation Nette de la Dette"
                  value={fmt(creditSummary.net_credit_change || 0)}
                  color={creditSummary.net_credit_change <= 0 ? '#15803d' : '#dc2626'}
                  bg={creditSummary.net_credit_change <= 0 ? '#f0fdf4' : '#fef2f2'}
                  sub={creditSummary.net_credit_change <= 0 ? 'Dette globale en diminution' : 'Dette globale en augmentation'}
                />
                <KpiCard
                  icon={<CreditCard size={20} />}
                  label="Dette Totale Restante (Tous Clients)"
                  value={fmt(authoritative.liveTotalCredit || 0)}
                  color="#b91c1c"
                  bg="#fef2f2"
                  sub={`${authoritative.activeDebtorsCount || 0} clients concernés`}
                />
              </div>
            </div>
          )}

          {/* TAB 7: EMPLOYEES & PAYROLL */}
          {activeTab === 'employees' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Statistiques de la Masse Salariale & Acomptes
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0' }}>
                  Dépenses de rémunération et avances versées aux collaborateurs
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <KpiCard
                  icon={<DollarSign size={20} />}
                  label="Salaires Nets Versés"
                  value={fmt(employeeSummary.total_salaries || 0)}
                  color="#0891b2"
                  bg="#ecfeff"
                  sub="Paiements réguliers enregistrés"
                />
                <KpiCard
                  icon={<CreditCard size={20} />}
                  label="Avances sur Salaire Versées"
                  value={fmt(employeeSummary.total_advances || 0)}
                  color="#ea580c"
                  bg="#fff7ed"
                  sub="Acomptes accordés sur la période"
                />
                <KpiCard
                  icon={<Wallet size={20} />}
                  label="Total Décaissé Personnel"
                  value={fmt(employeeSummary.total_paid || 0)}
                  color="#0f172a"
                  bg="#f1f5f9"
                  sub="Impact global sur la trésorerie"
                />
              </div>
            </div>
          )}

          {/* TAB 8: AUDIT & RECONCILIATION (ADMIN) */}
          {activeTab === 'reconciliation' && isAdmin && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={20} color="#16a34a" /> Procédure de Réconciliation & Auto-Guérison
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                    Recalcule les tables récapitulatives directement depuis les tables sources de transactions (Ventes, Lignes, Caisses, Dettes).
                  </p>
                </div>
                <button
                  onClick={handleRunReconciliation}
                  disabled={reconciling}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    background: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(22,163,74,0.25)'
                  }}
                >
                  <RefreshCw size={15} className={reconciling ? 'animate-spin' : ''} />
                  {reconciling ? 'Réconciliation en cours...' : 'Exécuter la Réconciliation'}
                </button>
              </div>

              {/* Status Box */}
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={16} color="#16a34a" /> Intégrité des données garantie
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                  La réconciliation est <strong>100% idempotente et sûre</strong> : elle ne modifie ni ne supprime jamais les ventes réelles, les dettes clients ou les mouvements de caisse. Elle garantit l'alignement strict entre la réalité des transactions et le tableau de bord.
                </div>
                {data.lastReconciliation && (
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    Dernière réconciliation enregistrée : <strong>{data.lastReconciliation.created_at}</strong>
                  </div>
                )}
              </div>

              {/* History of Reconciliation Logs */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
                  {t.statsReconciliationLogsTitle || 'Historique des Vérifications & Réconciliations'}
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      {['Horodatage', 'Administrateur', 'Plage Analysée', 'Statut', 'Détails'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: isRtl ? 'right' : 'left', fontWeight: 700, color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reconLogs.map((log: any) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{log.created_at}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{log.reconciled_by}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{log.date_from} → {log.date_to}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 800 }}>
                            {log.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#475569' }}>{log.details}</td>
                      </tr>
                    ))}
                    {reconLogs.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Aucun journal de réconciliation</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
