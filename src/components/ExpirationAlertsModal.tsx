import { useState, useMemo } from 'react';
import { 
  X, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  Calendar, 
  Search, 
  Package, 
  ArrowRight, 
  RefreshCw,
  Tag
} from 'lucide-react';
import type { Language } from '../i18n';

export interface ExpirationProductItem {
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
  formattedDate: string;
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

export interface ExpirationAlertsData {
  counts: {
    total: number;
    expired: number;
    less1m: number;
    less2m: number;
    less3m: number;
    safe: number;
  };
  lists: {
    expired: ExpirationProductItem[];
    less1m: ExpirationProductItem[];
    less2m: ExpirationProductItem[];
    less3m: ExpirationProductItem[];
    allAlerts: ExpirationProductItem[];
  };
}

interface ExpirationAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ExpirationAlertsData;
  onRefresh?: () => void;
  onNavigateToProduct?: (product: ExpirationProductItem) => void;
  currentLang?: Language;
}

export default function ExpirationAlertsModal({
  isOpen,
  onClose,
  data,
  onRefresh,
  onNavigateToProduct
}: ExpirationAlertsModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'expired' | 'less_1m' | 'less_2m' | 'less_3m'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const counts = data.counts || { total: 0, expired: 0, less1m: 0, less2m: 0, less3m: 0, safe: 0 };
  const lists = data.lists || { expired: [], less1m: [], less2m: [], less3m: [], allAlerts: [] };

  // Current list based on active tab
  const baseList: ExpirationProductItem[] = useMemo(() => {
    switch (activeTab) {
      case 'expired':
        return lists.expired || [];
      case 'less_1m':
        return lists.less1m || [];
      case 'less_2m':
        return lists.less2m || [];
      case 'less_3m':
        return lists.less3m || [];
      case 'all':
      default:
        return lists.allAlerts || [];
    }
  }, [activeTab, lists]);

  // Filtered by search
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return baseList;
    const q = searchTerm.toLowerCase().trim();
    return baseList.filter(p => 
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.category_name && p.category_name.toLowerCase().includes(q)) ||
      (p.supplier_name && p.supplier_name.toLowerCase().includes(q))
    );
  }, [baseList, searchTerm]);

  // Format date helper
  const formatDateDisplay = (dateStr: string) => {
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

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(15, 23, 42, 0.65)', 
        backdropFilter: 'blur(3px)',
        zIndex: 9999, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '16px' 
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        style={{ 
          background: '#ffffff', 
          borderRadius: '16px', 
          width: '100%', 
          maxWidth: '1000px', 
          maxHeight: '90vh',
          display: 'flex', 
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ 
          padding: '18px 24px', 
          borderBottom: '1px solid #e2e8f0', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '10px', 
              background: counts.expired > 0 ? '#fee2e2' : counts.less1m > 0 ? '#fff1f2' : counts.less2m > 0 ? '#ffedd5' : '#fef9c3', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Calendar size={22} color={counts.expired > 0 ? '#dc2626' : counts.less1m > 0 ? '#ef4444' : counts.less2m > 0 ? '#ea580c' : '#ca8a04'} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Suivi des Dates d'Expiration (Péremption)
                </h3>
                <span style={{ 
                  background: '#dcfce7', 
                  color: '#15803d', 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  padding: '2px 8px', 
                  borderRadius: '12px' 
                }}>
                  v3.3.3
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                Alertes automatiques dès 3 mois d'échéance avec code couleur par niveau d'urgence
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onRefresh && (
              <button 
                type="button"
                onClick={onRefresh}
                className="btn-secondary"
                style={{ padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                title="Actualiser les alertes"
              >
                <RefreshCw size={14} />
                <span>Actualiser</span>
              </button>
            )}
            <button 
              type="button"
              onClick={onClose}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '6px', 
                borderRadius: '6px', 
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Fermer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 4 Summary Cards (KPIs with Colors) */}
        <div style={{ 
          padding: '16px 24px', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', 
          gap: '12px',
          background: '#ffffff',
          borderBottom: '1px solid #f1f5f9'
        }}>
          {/* Card 1: Déjà Périmés (Dark Red) */}
          <div 
            onClick={() => setActiveTab('expired')}
            style={{ 
              background: '#fef2f2', 
              border: `2px solid ${activeTab === 'expired' ? '#dc2626' : '#fecaca'}`, 
              borderRadius: '12px', 
              padding: '12px 14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              transform: activeTab === 'expired' ? 'scale(1.02)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Déjà Périmés
              </span>
              <AlertTriangle size={16} color="#dc2626" />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#dc2626' }}>
              {counts.expired}
            </div>
            <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '2px' }}>
              {counts.expired === 0 ? 'Aucun produit périmé' : 'À retirer immédiatement du stock'}
            </div>
          </div>

          {/* Card 2: < 1 Mois (Red) */}
          <div 
            onClick={() => setActiveTab('less_1m')}
            style={{ 
              background: '#fff1f2', 
              border: `2px solid ${activeTab === 'less_1m' ? '#ef4444' : '#fecdd3'}`, 
              borderRadius: '12px', 
              padding: '12px 14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              transform: activeTab === 'less_1m' ? 'scale(1.02)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                &lt; 1 Mois (Critique)
              </span>
              <AlertCircle size={16} color="#ef4444" />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#ef4444' }}>
              {counts.less1m}
            </div>
            <div style={{ fontSize: '11px', color: '#be123c', marginTop: '2px' }}>
              Expire dans les 30 prochains jours
            </div>
          </div>

          {/* Card 3: < 2 Mois (Orange) */}
          <div 
            onClick={() => setActiveTab('less_2m')}
            style={{ 
              background: '#fff7ed', 
              border: `2px solid ${activeTab === 'less_2m' ? '#f97316' : '#fed7aa'}`, 
              borderRadius: '12px', 
              padding: '12px 14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              transform: activeTab === 'less_2m' ? 'scale(1.02)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                &lt; 2 Mois (Attention)
              </span>
              <Clock size={16} color="#ea580c" />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#ea580c' }}>
              {counts.less2m}
            </div>
            <div style={{ fontSize: '11px', color: '#c2410c', marginTop: '2px' }}>
              Échéance entre 31 et 60 jours
            </div>
          </div>

          {/* Card 4: < 3 Mois (Amber/Yellow) */}
          <div 
            onClick={() => setActiveTab('less_3m')}
            style={{ 
              background: '#fefce8', 
              border: `2px solid ${activeTab === 'less_3m' ? '#eab308' : '#fef08a'}`, 
              borderRadius: '12px', 
              padding: '12px 14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              transform: activeTab === 'less_3m' ? 'scale(1.02)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                &lt; 3 Mois (À surveiller)
              </span>
              <Calendar size={16} color="#ca8a04" />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#ca8a04' }}>
              {counts.less3m}
            </div>
            <div style={{ fontSize: '11px', color: '#a16207', marginTop: '2px' }}>
              Échéance entre 61 et 90 jours
            </div>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div style={{ 
          padding: '12px 24px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: '12px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0'
        }}>
          {/* Tab Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: activeTab === 'all' ? '1px solid #0f172a' : '1px solid #cbd5e1',
                background: activeTab === 'all' ? '#0f172a' : '#ffffff',
                color: activeTab === 'all' ? '#ffffff' : '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Toutes les alertes</span>
              <span style={{ 
                background: activeTab === 'all' ? '#334155' : '#f1f5f9', 
                color: activeTab === 'all' ? '#ffffff' : '#0f172a',
                padding: '1px 6px', 
                borderRadius: '10px', 
                fontSize: '10px' 
              }}>
                {counts.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('expired')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: activeTab === 'expired' ? '1px solid #dc2626' : '1px solid #fecaca',
                background: activeTab === 'expired' ? '#dc2626' : '#fef2f2',
                color: activeTab === 'expired' ? '#ffffff' : '#b91c1c',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🔴 Périmés</span>
              <span style={{ 
                background: activeTab === 'expired' ? '#991b1b' : '#fee2e2', 
                color: activeTab === 'expired' ? '#ffffff' : '#b91c1c',
                padding: '1px 6px', 
                borderRadius: '10px', 
                fontSize: '10px' 
              }}>
                {counts.expired}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('less_1m')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: activeTab === 'less_1m' ? '1px solid #ef4444' : '1px solid #fecdd3',
                background: activeTab === 'less_1m' ? '#ef4444' : '#fff1f2',
                color: activeTab === 'less_1m' ? '#ffffff' : '#be123c',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🔴 &lt; 1 mois</span>
              <span style={{ 
                background: activeTab === 'less_1m' ? '#be123c' : '#ffe4e6', 
                color: activeTab === 'less_1m' ? '#ffffff' : '#be123c',
                padding: '1px 6px', 
                borderRadius: '10px', 
                fontSize: '10px' 
              }}>
                {counts.less1m}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('less_2m')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: activeTab === 'less_2m' ? '1px solid #ea580c' : '1px solid #fed7aa',
                background: activeTab === 'less_2m' ? '#ea580c' : '#fff7ed',
                color: activeTab === 'less_2m' ? '#ffffff' : '#c2410c',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🟠 &lt; 2 mois</span>
              <span style={{ 
                background: activeTab === 'less_2m' ? '#9a3412' : '#ffedd5', 
                color: activeTab === 'less_2m' ? '#ffffff' : '#c2410c',
                padding: '1px 6px', 
                borderRadius: '10px', 
                fontSize: '10px' 
              }}>
                {counts.less2m}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('less_3m')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: activeTab === 'less_3m' ? '1px solid #ca8a04' : '1px solid #fef08a',
                background: activeTab === 'less_3m' ? '#ca8a04' : '#fefce8',
                color: activeTab === 'less_3m' ? '#ffffff' : '#854d0e',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🟡 &lt; 3 mois</span>
              <span style={{ 
                background: activeTab === 'less_3m' ? '#854d0e' : '#fef9c3', 
                color: activeTab === 'less_3m' ? '#ffffff' : '#854d0e',
                padding: '1px 6px', 
                borderRadius: '10px', 
                fontSize: '10px' 
              }}>
                {counts.less3m}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-clean"
              style={{ paddingLeft: '32px', fontSize: '12px', paddingRight: searchTerm ? '28px' : '10px', width: '100%' }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  color: '#94a3b8'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Content List / Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {filteredList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <Package size={44} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>
                {searchTerm ? 'Aucun produit ne correspond à votre recherche' : 'Aucun produit dans cette catégorie d\'alerte'}
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', maxWidth: '400px', margin: '4px auto 0' }}>
                {searchTerm 
                  ? 'Essayez de modifier votre mot-clé de recherche.' 
                  : activeTab === 'expired' 
                  ? 'Félicitations ! Aucun produit périmé dans votre catalogue.'
                  : 'Tous les produits avec dates d\'expiration sont conformes.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredList.map((product) => {
                const isExpired = product.alertTier === 'expired';
                const isLess1m = product.alertTier === 'less_1m';
                const isLess2m = product.alertTier === 'less_2m';

                return (
                  <div
                    key={product.id}
                    style={{
                      background: product.tierBg,
                      border: `1px solid ${product.tierBorder}`,
                      borderRadius: '10px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Left: Product Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        width: '38px', 
                        height: '38px', 
                        borderRadius: '8px', 
                        background: '#ffffff',
                        border: `1px solid ${product.tierBorder}`,
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {isExpired ? (
                          <AlertTriangle size={18} color="#dc2626" />
                        ) : isLess1m ? (
                          <AlertCircle size={18} color="#ef4444" />
                        ) : isLess2m ? (
                          <Clock size={18} color="#ea580c" />
                        ) : (
                          <Calendar size={18} color="#ca8a04" />
                        )}
                      </div>

                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                            {product.name}
                          </span>
                          {product.category_name && (
                            <span style={{
                              background: '#ffffff',
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

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', fontSize: '11px', color: '#64748b' }}>
                          <span style={{ fontFamily: 'monospace', background: '#ffffff', border: '1px solid #e2e8f0', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                            {product.sku}
                          </span>
                          {product.barcode && (
                            <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>
                              #{product.barcode}
                            </span>
                          )}
                          {product.supplier_name && (
                            <span>• Fournisseur : <strong>{product.supplier_name}</strong></span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Stock remaining */}
                    <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '120px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                        Stock restant :
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: product.stock_quantity <= 0 ? '#dc2626' : '#0f172a' }}>
                        {product.stock_quantity} {product.base_unit || 'pièce(s)'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {product.selling_price > 0 ? `${product.selling_price.toFixed(2)} DA / unité` : '-'}
                      </div>
                    </div>

                    {/* Right: Expiration Status Badge & Date */}
                    <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '160px' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: '#ffffff',
                        border: `1px solid ${product.tierBorder}`,
                        color: product.tierColor,
                        fontSize: '11px',
                        fontWeight: 800
                      }}>
                        <Calendar size={12} color={product.tierColor} />
                        <span>
                          {isExpired 
                            ? (product.daysRemaining === 0 ? "Expire aujourd'hui" : `Périmé depuis ${Math.abs(product.daysRemaining)}j`)
                            : isLess1m 
                            ? `Dans ${product.daysRemaining}j (< 1 mois)`
                            : isLess2m 
                            ? `Dans ${product.daysRemaining}j (< 2 mois)`
                            : `Dans ${product.daysRemaining}j (< 3 mois)`}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: product.tierColor, marginTop: '3px' }}>
                        Date : {formatDateDisplay(product.date_expiration)}
                      </div>
                    </div>

                    {/* Action button: navigate to product */}
                    {onNavigateToProduct && (
                      <div style={{ flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => onNavigateToProduct(product)}
                          className="btn-secondary"
                          style={{
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: '#ffffff'
                          }}
                          title="Voir dans la page Produits"
                        >
                          <span>Voir</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '12px 24px', 
          borderTop: '1px solid #e2e8f0', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          background: '#f8fafc' 
        }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Total : <strong>{filteredList.length}</strong> produit(s) affiché(s) sur <strong>{counts.total}</strong> en alerte.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 700 }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

