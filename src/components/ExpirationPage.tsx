import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  Search, 
  Package, 
  RefreshCw, 
  Tag, 
  CheckCircle2, 
  Edit2, 
  ArrowRight,
  ExternalLink,
  X
} from 'lucide-react';
import { translations } from '../i18n';
import type { Language, Translations } from '../i18n';
import { hasPermission } from '../permissions';

interface ExpirationPageProps {
  currentLang: Language;
  currentUser: any;
  onNavigateToProducts?: (productId?: number) => void;
}

export interface ExpirationItem {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  base_unit: string;
  stock_quantity: number;
  min_stock_alert: number;
  selling_price: number;
  cost_price: number;
  date_expiration: string;
  daysRemaining: number;
  alertTier: 'expired' | 'less_1m' | 'less_2m' | 'less_3m' | 'safe';
  tierLabel: string;
  tierColor: string;
  tierBg: string;
  tierBorder: string;
  category_id?: number;
  category_name?: string;
  category_color?: string;
  supplier_name?: string;
  supplier_phone?: string;
}

export default function ExpirationPage({
  currentLang,
  currentUser,
  onNavigateToProducts
}: ExpirationPageProps) {
  const t: Translations = translations[currentLang] || translations.fr;
  const isRTL = currentLang === 'ar';
  
  const canEdit = currentUser?.role === 'admin' || 
    hasPermission(currentUser, 'expirations.edit') || 
    hasPermission(currentUser, 'products.edit');

  const [loading, setLoading] = useState(false);
  const [activeTier, setActiveTier] = useState<'all' | 'expired' | 'less_1m' | 'less_2m' | 'less_3m' | 'safe'>('all');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [counts, setCounts] = useState({
    total: 0,
    expired: 0,
    less1m: 0,
    less2m: 0,
    less3m: 0,
    safe: 0
  });

  const [lists, setLists] = useState<{
    expired: ExpirationItem[];
    less1m: ExpirationItem[];
    less2m: ExpirationItem[];
    less3m: ExpirationItem[];
    allAlerts: ExpirationItem[];
    allWithDates: ExpirationItem[];
  }>({
    expired: [],
    less1m: [],
    less2m: [],
    less3m: [],
    allAlerts: [],
    allWithDates: []
  });

  // Quick Inline Edit Expiration Date Modal
  const [editingItem, setEditingItem] = useState<ExpirationItem | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Load Expiration Alerts Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (window.electronAPI?.getExpirationAlerts) {
        const res = await window.electronAPI.getExpirationAlerts();
        if (res && res.success) {
          if (res.counts) setCounts(res.counts);
          if (res.lists) {
            setLists({
              expired: res.lists.expired || [],
              less1m: res.lists.less1m || [],
              less2m: res.lists.less2m || [],
              less3m: res.lists.less3m || [],
              allAlerts: res.lists.allAlerts || [],
              allWithDates: [
                ...(res.lists.allAlerts || []),
                ...((res.lists as any).safe || [])
              ]
            });
          }
        }
      }
    } catch (err) {
      console.error('Error loading expiration data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener('products:updated', handleRefresh);
    window.addEventListener('app:refresh', handleRefresh);
    return () => {
      window.removeEventListener('products:updated', handleRefresh);
      window.removeEventListener('app:refresh', handleRefresh);
    };
  }, [loadData]);

  // Categories extraction for filter
  const categories = useMemo(() => {
    const map = new Map<string, { id: number; name: string }>();
    const all = lists.allAlerts;
    for (const item of all) {
      if (item.category_id && item.category_name) {
        map.set(String(item.category_id), { id: item.category_id, name: item.category_name });
      }
    }
    return Array.from(map.values());
  }, [lists.allAlerts]);

  // Active items filtered by Tier
  const tierFilteredItems = useMemo(() => {
    switch (activeTier) {
      case 'expired':
        return lists.expired;
      case 'less_1m':
        return lists.less1m;
      case 'less_2m':
        return lists.less2m;
      case 'less_3m':
        return lists.less3m;
      case 'safe':
        return lists.allWithDates.filter(p => p.alertTier === 'safe');
      case 'all':
      default:
        return lists.allAlerts;
    }
  }, [activeTier, lists]);

  // Active items filtered by Search and Category
  const finalItems = useMemo(() => {
    return tierFilteredItems.filter(p => {
      // Category filter
      if (selectedCategory !== 'all' && String(p.category_id) !== selectedCategory) {
        return false;
      }
      // Search filter
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.category_name && p.category_name.toLowerCase().includes(q)) ||
        (p.supplier_name && p.supplier_name.toLowerCase().includes(q))
      );
    });
  }, [tierFilteredItems, selectedCategory, search]);

  // Format date helper (YYYY-MM-DD -> DD/MM/YYYY)
  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Quick update product expiration date
  const handleSaveDate = async () => {
    if (!editingItem) return;
    setSavingEdit(true);
    try {
      if (window.electronAPI?.updateProduct) {
        await window.electronAPI.updateProduct({
          ...editingItem,
          id: editingItem.id,
          date_expiration: editDate ? editDate.trim() : null
        });
        window.dispatchEvent(new CustomEvent('products:updated'));
        setEditingItem(null);
        await loadData();
      }
    } catch (err) {
      console.error('Error updating expiration date:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const getUrgencyText = (product: ExpirationItem) => {
    if (product.alertTier === 'expired') {
      if (product.daysRemaining === 0) return t.expirationExpiresToday;
      const days = Math.abs(product.daysRemaining);
      if (currentLang === 'ar') return `${t.expirationExpiredSinceDays} ${days} يوم`;
      if (currentLang === 'en') return `${t.expirationExpiredSinceDays} ${days}d ago`;
      return `${t.expirationExpiredSinceDays} ${days}j`;
    }
    if (product.alertTier === 'less_1m') {
      const days = product.daysRemaining;
      if (currentLang === 'ar') return `${t.expirationInDaysLess1m} ${days} يوم (أقل من شهر)`;
      if (currentLang === 'en') return `${t.expirationInDaysLess1m} ${days}d (< 1 month)`;
      return `${t.expirationInDaysLess1m} ${days}j (< 1 mois)`;
    }
    if (product.alertTier === 'less_2m') {
      const days = product.daysRemaining;
      if (currentLang === 'ar') return `${t.expirationInDaysLess2m} ${days} يوم (أقل من شهرين)`;
      if (currentLang === 'en') return `${t.expirationInDaysLess2m} ${days}d (< 2 months)`;
      return `${t.expirationInDaysLess2m} ${days}j (< 2 mois)`;
    }
    if (product.alertTier === 'less_3m') {
      const days = product.daysRemaining;
      if (currentLang === 'ar') return `${t.expirationInDaysLess3m} ${days} يوم (أقل من 3 أشهر)`;
      if (currentLang === 'en') return `${t.expirationInDaysLess3m} ${days}d (< 3 months)`;
      return `${t.expirationInDaysLess3m} ${days}j (< 3 mois)`;
    }
    return formatDateDisplay(product.date_expiration);
  };

  return (
    <div 
      style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      
      {/* Top Banner & Info */}
      <div style={{ 
        background: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '12px', 
        padding: '16px 20px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: counts.expired > 0 ? '#fee2e2' : counts.less1m > 0 ? '#fff1f2' : counts.less2m > 0 ? '#ffedd5' : '#fef9c3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Calendar size={24} color={counts.expired > 0 ? '#dc2626' : counts.less1m > 0 ? '#ef4444' : counts.less2m > 0 ? '#ea580c' : '#ca8a04'} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {t.expirationPageTitle}
              </h1>
              <span style={{ 
                background: '#dcfce7', 
                color: '#15803d', 
                fontSize: '11px', 
                fontWeight: 700, 
                padding: '2px 8px', 
                borderRadius: '12px' 
              }}>
                {t.expirationUpdateBadge}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0 0' }}>
              {t.expirationPageSubtitle}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            type="button"
            onClick={loadData}
            disabled={loading}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '12px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{t.expirationRefreshBtn}</span>
          </button>

          {onNavigateToProducts && (
            <button
              type="button"
              onClick={() => onNavigateToProducts()}
              className="btn-green"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '12px' }}
            >
              <Package size={14} />
              <span>{t.expirationCatalogueBtn}</span>
              <ArrowRight size={13} style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
            </button>
          )}
        </div>
      </div>

      {/* 4 Main Alert KPI Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '12px' 
      }}>
        {/* 1. Déjà Périmés */}
        <div 
          onClick={() => setActiveTier('expired')}
          style={{ 
            background: '#fef2f2', 
            border: `2px solid ${activeTier === 'expired' ? '#dc2626' : '#fecaca'}`, 
            borderRadius: '12px', 
            padding: '16px 18px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeTier === 'expired' ? '0 4px 12px rgba(220, 38, 38, 0.15)' : 'none',
            textAlign: isRTL ? 'right' : 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t.expirationCardExpired}
            </span>
            <AlertTriangle size={18} color="#dc2626" />
          </div>
          <div style={{ fontSize: '30px', fontWeight: 900, color: '#dc2626', lineHeight: 1 }}>
            {counts.expired}
          </div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#b91c1c', marginTop: '6px' }}>
            {counts.expired === 0 ? t.expirationCardExpiredZero : t.expirationCardExpiredAlert}
          </div>
        </div>

        {/* 2. < 1 Mois (Critique) */}
        <div 
          onClick={() => setActiveTier('less_1m')}
          style={{ 
            background: '#fff1f2', 
            border: `2px solid ${activeTier === 'less_1m' ? '#ef4444' : '#fecdd3'}`, 
            borderRadius: '12px', 
            padding: '16px 18px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeTier === 'less_1m' ? '0 4px 12px rgba(239, 68, 68, 0.15)' : 'none',
            textAlign: isRTL ? 'right' : 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t.expirationCardLess1m}
            </span>
            <AlertCircle size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: '30px', fontWeight: 900, color: '#ef4444', lineHeight: 1 }}>
            {counts.less1m}
          </div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#be123c', marginTop: '6px' }}>
            {t.expirationCardLess1mSub}
          </div>
        </div>

        {/* 3. < 2 Mois (Attention) */}
        <div 
          onClick={() => setActiveTier('less_2m')}
          style={{ 
            background: '#fff7ed', 
            border: `2px solid ${activeTier === 'less_2m' ? '#f97316' : '#fed7aa'}`, 
            borderRadius: '12px', 
            padding: '16px 18px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeTier === 'less_2m' ? '0 4px 12px rgba(249, 115, 22, 0.15)' : 'none',
            textAlign: isRTL ? 'right' : 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t.expirationCardLess2m}
            </span>
            <Clock size={18} color="#ea580c" />
          </div>
          <div style={{ fontSize: '30px', fontWeight: 900, color: '#ea580c', lineHeight: 1 }}>
            {counts.less2m}
          </div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#c2410c', marginTop: '6px' }}>
            {t.expirationCardLess2mSub}
          </div>
        </div>

        {/* 4. < 3 Mois (À surveiller) */}
        <div 
          onClick={() => setActiveTier('less_3m')}
          style={{ 
            background: '#fefce8', 
            border: `2px solid ${activeTier === 'less_3m' ? '#eab308' : '#fef08a'}`, 
            borderRadius: '12px', 
            padding: '16px 18px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeTier === 'less_3m' ? '0 4px 12px rgba(234, 179, 8, 0.15)' : 'none',
            textAlign: isRTL ? 'right' : 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t.expirationCardLess3m}
            </span>
            <Calendar size={18} color="#ca8a04" />
          </div>
          <div style={{ fontSize: '30px', fontWeight: 900, color: '#ca8a04', lineHeight: 1 }}>
            {counts.less3m}
          </div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#a16207', marginTop: '6px' }}>
            {t.expirationCardLess3mSub}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Toolbar */}
      <div className="clean-card" style={{ padding: '14px 18px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveTier('all')}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: activeTier === 'all' ? '1px solid #0f172a' : '1px solid #cbd5e1',
                background: activeTier === 'all' ? '#0f172a' : '#ffffff',
                color: activeTier === 'all' ? '#ffffff' : '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{t.expirationTabAll}</span>
              <span style={{ 
                background: activeTier === 'all' ? '#334155' : '#f1f5f9', 
                color: activeTier === 'all' ? '#ffffff' : '#0f172a',
                padding: '1px 6px', 
                borderRadius: '10px', 
                fontSize: '10px' 
              }}>
                {counts.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTier('expired')}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: activeTier === 'expired' ? '1px solid #dc2626' : '1px solid #fecaca',
                background: activeTier === 'expired' ? '#dc2626' : '#fef2f2',
                color: activeTier === 'expired' ? '#ffffff' : '#b91c1c',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🔴 {t.expirationTabExpired}</span>
              <span style={{ 
                background: activeTier === 'expired' ? '#991b1b' : '#fee2e2', 
                color: activeTier === 'expired' ? '#ffffff' : '#b91c1c',
                padding: '1px 6px', 
                borderRadius: '10px', 
                fontSize: '10px' 
              }}>
                {counts.expired}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTier('less_1m')}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: activeTier === 'less_1m' ? '1px solid #ef4444' : '1px solid #fecdd3',
                background: activeTier === 'less_1m' ? '#ef4444' : '#fff1f2',
                color: activeTier === 'less_1m' ? '#ffffff' : '#be123c',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🔴 {t.expirationTabLess1m}</span>
              <span style={{ 
                background: activeTier === 'less_1m' ? '#be123c' : '#ffe4e6', 
                color: activeTier === 'less_1m' ? '#ffffff' : '#be123c',
                padding: '1px 6px', 
                borderRadius: '10px', 
                fontSize: '10px' 
              }}>
                {counts.less1m}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTier('less_2m')}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: activeTier === 'less_2m' ? '1px solid #ea580c' : '1px solid #fed7aa',
                background: activeTier === 'less_2m' ? '#ea580c' : '#fff7ed',
                color: activeTier === 'less_2m' ? '#ffffff' : '#c2410c',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🟠 {t.expirationTabLess2m}</span>
              <span style={{ 
                background: activeTier === 'less_2m' ? '#9a3412' : '#ffedd5', 
                color: activeTier === 'less_2m' ? '#ffffff' : '#c2410c',
                padding: '1px 6px', 
                borderRadius: '10px', 
                fontSize: '10px' 
              }}>
                {counts.less2m}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTier('less_3m')}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: activeTier === 'less_3m' ? '1px solid #ca8a04' : '1px solid #fef08a',
                background: activeTier === 'less_3m' ? '#ca8a04' : '#fefce8',
                color: activeTier === 'less_3m' ? '#ffffff' : '#854d0e',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🟡 {t.expirationTabLess3m}</span>
              <span style={{ 
                background: activeTier === 'less_3m' ? '#854d0e' : '#fef9c3', 
                color: activeTier === 'less_3m' ? '#ffffff' : '#854d0e',
                padding: '1px 6px', 
                borderRadius: '10px', 
                fontSize: '10px' 
              }}>
                {counts.less3m}
              </span>
            </button>
          </div>

          {/* Search & Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="input-clean"
                style={{ fontSize: '12px', padding: '6px 10px', width: 'auto' }}
              >
                <option value="all">{t.expirationAllCategories}</option>
                {categories.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            )}

            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', [isRTL ? 'right' : 'left']: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder={t.expirationSearchPlaceholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-clean"
                style={{ 
                  [isRTL ? 'paddingRight' : 'paddingLeft']: '32px', 
                  fontSize: '12px', 
                  width: '100%', 
                  [isRTL ? 'paddingLeft' : 'paddingRight']: search ? '28px' : '10px' 
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', [isRTL ? 'left' : 'right']: '6px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="clean-card" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-clean" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ width: '32%', padding: '12px 16px', textAlign: isRTL ? 'right' : 'left', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  {t.expirationColArticle}
                </th>
                <th style={{ width: '18%', padding: '12px 16px', textAlign: isRTL ? 'right' : 'left', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  {t.expirationColStock}
                </th>
                <th style={{ width: '18%', padding: '12px 16px', textAlign: isRTL ? 'right' : 'left', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  {t.expirationColDate}
                </th>
                <th style={{ width: '20%', padding: '12px 16px', textAlign: isRTL ? 'right' : 'left', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  {t.expirationColStatus}
                </th>
                <th style={{ width: '12%', padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  {t.expirationColActions}
                </th>
              </tr>
            </thead>
            <tbody>
              {finalItems.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                    <Package size={44} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>
                      {search ? t.expirationEmptySearch : t.expirationEmptyTier}
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', maxWidth: '420px', margin: '4px auto 0' }}>
                      {activeTier === 'expired' 
                        ? t.expirationEmptyExpiredMsg
                        : t.expirationEmptyAllMsg}
                    </p>
                  </td>
                </tr>
              ) : (
                finalItems.map(product => {
                  const isExpired = product.alertTier === 'expired';
                  const isLess1m = product.alertTier === 'less_1m';
                  const isLess2m = product.alertTier === 'less_2m';

                  return (
                    <tr 
                      key={product.id}
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        background: isExpired ? '#fffdfd' : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* 1. Article & Référence */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>
                              {product.name}
                            </span>
                            {product.category_name && (
                              <span style={{
                                background: '#f8fafc',
                                border: `1px solid ${product.category_color || '#cbd5e1'}`,
                                color: product.category_color || '#334155',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                <Tag size={9} />
                                {product.category_name}
                              </span>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b' }}>
                            <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                              {product.sku}
                            </span>
                            {product.barcode && (
                              <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>
                                #{product.barcode}
                              </span>
                            )}
                            {product.supplier_name && (
                              <span style={{ color: '#64748b' }}>
                                {t.expirationSupplier} <strong>{product.supplier_name}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Stock Disponible */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: product.stock_quantity <= 0 ? '#dc2626' : '#0f172a' }}>
                            {product.stock_quantity} {product.base_unit || t.expirationPieces}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {product.selling_price > 0 ? `${product.selling_price.toFixed(2)} DA` : '-'}
                          </div>
                        </div>
                      </td>

                      {/* 3. Date d'Expiration */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} color={product.tierColor} />
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                            {formatDateDisplay(product.date_expiration)}
                          </span>
                        </div>
                      </td>

                      {/* 4. Statut & Urgence (Colored Badge) */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: product.tierBg,
                          border: `1px solid ${product.tierBorder}`,
                          color: product.tierColor,
                          fontSize: '11px',
                          fontWeight: 800
                        }}>
                          {isExpired ? (
                            <AlertTriangle size={13} color="#dc2626" />
                          ) : isLess1m ? (
                            <AlertCircle size={13} color="#ef4444" />
                          ) : isLess2m ? (
                            <Clock size={13} color="#ea580c" />
                          ) : (
                            <Calendar size={13} color="#ca8a04" />
                          )}
                          <span>
                            {getUrgencyText(product)}
                          </span>
                        </div>
                      </td>

                      {/* 5. Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(product);
                                setEditDate(product.date_expiration || '');
                              }}
                              className="btn-secondary"
                              style={{ padding: '6px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title={t.expirationModalTitle}
                            >
                              <Edit2 size={12} />
                              <span>{t.expirationBtnDate}</span>
                            </button>
                          )}

                          {onNavigateToProducts && (
                            <button
                              type="button"
                              onClick={() => onNavigateToProducts(product.id)}
                              className="btn-secondary"
                              style={{ padding: '6px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title={t.expirationBtnProductCard}
                            >
                              <ExternalLink size={12} />
                              <span>{t.expirationBtnProductCard}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div style={{ 
          padding: '12px 20px', 
          background: '#f8fafc', 
          borderTop: '1px solid #e2e8f0', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '12px',
          color: '#64748b'
        }}>
          <div>
            {t.expirationFooterCount} <strong>{finalItems.length}</strong> {t.expirationFooterOf} <strong>{counts.total}</strong> {t.expirationFooterAlerts}
          </div>
          <div>
            {t.expirationColorCode} <span style={{ color: '#dc2626', fontWeight: 800 }}>{t.expirationColorExpired}</span> • <span style={{ color: '#ef4444', fontWeight: 800 }}>{t.expirationColorLess1m}</span> • <span style={{ color: '#ea580c', fontWeight: 800 }}>{t.expirationColorLess2m}</span> • <span style={{ color: '#ca8a04', fontWeight: 800 }}>{t.expirationColorLess3m}</span>
          </div>
        </div>
      </div>

      {/* Modal: Quick Edit Expiration Date */}
      {editingItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div 
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '440px',
              padding: '22px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0'
            }}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#15803d" />
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {t.expirationModalTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '14px', fontWeight: 600 }}>
              {t.expirationModalProduct} <strong style={{ color: '#0f172a' }}>{editingItem.name}</strong> ({editingItem.sku})
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                {t.expirationModalNewDate}
              </label>
              <input
                type="date"
                className="input-clean"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                style={{ width: '100%', fontSize: '13px', padding: '8px 12px' }}
              />
              <div style={{ display: 'flex', justifyContent: isRTL ? 'flex-start' : 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setEditDate('')}
                  style={{ background: 'transparent', border: 'none', color: '#dc2626', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                >
                  {t.expirationModalClearDate}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="btn-secondary"
                disabled={savingEdit}
              >
                {t.expirationModalCancel}
              </button>
              <button
                type="button"
                onClick={handleSaveDate}
                disabled={savingEdit}
                className="btn-green"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {savingEdit ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                <span>{t.expirationModalSave}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
