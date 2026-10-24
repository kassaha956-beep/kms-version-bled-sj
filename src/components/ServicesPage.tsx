import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap, Smartphone, Copy, Printer, RefreshCw, CheckCircle,
  AlertCircle, Search, Sliders, Send, Server, Phone, X, Trash2
} from 'lucide-react';
import type { Language, Translations } from '../i18n';
import { translations } from '../i18n';
import { hasPermission } from '../permissions';

interface Props {
  currentLang: Language | string;
  currentUser: any;
}

const api = (window as any).electronAPI;
const fmt = (n: number) => `${(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA`;

export default function ServicesPage({ currentLang, currentUser }: Props) {
  const t: Translations = translations[currentLang as Language] || translations.fr;
  const isRtl = currentLang === 'ar';
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const canEditTarifs = isAdmin || hasPermission(currentUser, 'services.tarifs');

  // Notification Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // State: Settings
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [tarifs, setTarifs] = useState({
    photocopie_nb: 10,
    photocopie_color: 30,
    photocopie_rv_nb: 15,
    photocopie_rv_color: 50,
    impression_doc: 20,
    scan_doc: 20,
    plastification: 50,
    flexy_commission_fixed: 0,
    flexy_commission_percent: 0
  });

  const [balances, setBalances] = useState({
    mobilis: 25000,
    djezzy: 20000,
    ooredoo: 20000
  });

  const [apiConfig, setApiConfig] = useState({
    enabled: false,
    provider: 'custom',
    apiUrl: 'https://api.flexy-gateway.local/v1/recharge',
    apiKey: '',
    apiSecret: '',
    pin: '',
    autoSend: false
  });

  // State: Transactions history & Stats
  const [transactions, setTransactions] = useState<any[]>([]);
  const [historyStats, setHistoryStats] = useState<any>({
    totalCount: 0,
    totalAmount: 0,
    totalCommission: 0,
    totalRevenue: 0,
    byOperator: { mobilis: 0, djezzy: 0, ooredoo: 0 }
  });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');

  // Modals
  const [showSimModal, setShowSimModal] = useState(false);
  const [simModalOperator, setSimModalOperator] = useState<'mobilis' | 'djezzy' | 'ooredoo'>('mobilis');
  const [simModalAmount, setSimModalAmount] = useState('');
  const [simModalMode, setSimModalMode] = useState<'add' | 'set'>('add');

  const [showTarifsModal, setShowTarifsModal] = useState(false);
  const [tempTarifs, setTempTarifs] = useState({ ...tarifs });

  const [showApiModal, setShowApiModal] = useState(false);
  const [tempApiConfig, setTempApiConfig] = useState({ ...apiConfig });
  const [apiTestLoading, setApiTestLoading] = useState(false);
  const [apiTestStatus, setApiTestStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  // Caisses list & service caisse assignment
  const [caissesList, setCaissesList] = useState<any[]>([]);
  const [_serviceCaisses, setServiceCaisses] = useState<{ flexy_caisse_id: number | null; photocopie_caisse_id: number | null }>({ flexy_caisse_id: null, photocopie_caisse_id: null });
  const [tempServiceCaisses, setTempServiceCaisses] = useState<{ flexy_caisse_id: number | null; photocopie_caisse_id: number | null }>({ flexy_caisse_id: null, photocopie_caisse_id: null });

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Flexy Express Workstation Form
  const [flexyOp, setFlexyOp] = useState<'mobilis' | 'djezzy' | 'ooredoo'>('mobilis');
  const [flexyPhone, setFlexyPhone] = useState('');
  const [flexyAmount, setFlexyAmount] = useState<number | ''>(500);
  const [flexyCustomAmount, setFlexyCustomAmount] = useState('');
  const [flexyFee, setFlexyFee] = useState<number>(0);
  const [flexyNotes, setFlexyNotes] = useState('');
  const [submittingFlexy, setSubmittingFlexy] = useState(false);
  const [lastFlexyTicket, setLastFlexyTicket] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Photocopie Workstation Form
  const [copyServiceType, setCopyServiceType] = useState<string>('photocopie_nb');
  const [copyQty, setCopyQty] = useState<number>(1);
  const [submittingCopy, setSubmittingCopy] = useState(false);

  // Load Settings
  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      // Load caisses list
      if (api?.getCaisses) {
        const cr = await api.getCaisses({ page: 1, pageSize: 100 });
        if (cr?.success) setCaissesList(cr.caisses || []);
      }
      if (api?.getServicesSettings) {
        const res = await api.getServicesSettings();
        if (res?.success) {
          if (res.tarifs) {
            setTarifs(res.tarifs);
            setTempTarifs(res.tarifs);
          }
          if (res.balances) setBalances(res.balances);
          if (res.apiConfig) {
            setApiConfig(res.apiConfig);
            setTempApiConfig(res.apiConfig);
          }
          if (res.serviceCaisses) {
            setServiceCaisses(res.serviceCaisses);
            setTempServiceCaisses(res.serviceCaisses);
          }
        }
      }
    } catch (e: any) {
      console.error('Error loading services settings:', e);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  // Load History
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      if (api?.getFlexyTransactions) {
        const res = await api.getFlexyTransactions({
          search: historySearch,
          operator: operatorFilter,
          dateFilter: dateFilter,
          limit: 100
        });
        if (res?.success) {
          setTransactions(res.transactions || []);
          if (res.stats) setHistoryStats(res.stats);
        }
      }
    } catch (e: any) {
      console.error('Error loading flexy history:', e);
    } finally {
      setLoadingHistory(false);
    }
  }, [historySearch, operatorFilter, dateFilter]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Phone number auto-detection of operator
  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 10);
    setFlexyPhone(clean);
    if (clean.startsWith('06') || clean.startsWith('09')) {
      setFlexyOp('mobilis');
    } else if (clean.startsWith('07')) {
      setFlexyOp('djezzy');
    } else if (clean.startsWith('05')) {
      setFlexyOp('ooredoo');
    }
  };

  // Submit Flexy Recharge
  const handlePerformFlexy = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const effectiveAmount = flexyAmount === '' ? parseFloat(flexyCustomAmount) || 0 : Number(flexyAmount);

    if (effectiveAmount <= 0) {
      showToast('Veuillez spécifier un montant valide pour le Flexy', 'error');
      return;
    }

    if (flexyPhone.trim().length > 0 && flexyPhone.trim().length < 9) {
      showToast('Numéro de téléphone incomplet (10 chiffres attendus)', 'error');
      return;
    }

    setSubmittingFlexy(true);
    try {
      const sellingPrice = effectiveAmount + (Number(flexyFee) || 0);
      const payload = {
        operator: flexyOp,
        phone_number: flexyPhone.trim(),
        amount: effectiveAmount,
        commission: flexyFee,
        selling_price: sellingPrice,
        affect_caisse: true,
        user_id: currentUser?.id || null,
        user_name: currentUser?.full_name || currentUser?.username || 'Admin',
        notes: flexyNotes.trim()
      };

      if (api?.recordFlexyTransaction) {
        const res = await api.recordFlexyTransaction(payload);
        if (res?.success) {
          showToast(`Recharge ${flexyOp.toUpperCase()} de ${fmt(effectiveAmount)} validée !`, 'success');
          setLastFlexyTicket({
            reference: res.reference,
            operator: flexyOp,
            phone: flexyPhone.trim(),
            amount: effectiveAmount,
            fee: flexyFee,
            total: sellingPrice,
            date: new Date().toLocaleString(currentLang === 'ar' ? 'ar-DZ' : currentLang === 'en' ? 'en-US' : 'fr-FR'),
            user: currentUser?.full_name || currentUser?.username || 'Admin'
          });
          setShowReceiptModal(true);
          setFlexyPhone('');
          setFlexyNotes('');
          loadSettings();
          loadHistory();
        } else {
          showToast(res?.message || 'Erreur lors de la recharge', 'error');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Erreur imprévue', 'error');
    } finally {
      setSubmittingFlexy(false);
    }
  };

  // Submit Quick Photocopie to Caisse
  const handlePerformCopy = async () => {
    if (copyQty <= 0) return;
    setSubmittingCopy(true);
    try {
      const unitPrice = (tarifs as any)[copyServiceType] || 10;
      const totalAmount = unitPrice * copyQty;
      const serviceNames: Record<string, string> = {
        photocopie_nb: 'Photocopie N&B',
        photocopie_color: 'Photocopie Couleur',
        photocopie_rv_nb: 'Photocopie Recto-Verso N&B',
        photocopie_rv_color: 'Photocopie Recto-Verso Couleur',
        impression_doc: 'Impression Document',
        scan_doc: 'Numérisation / Scan',
        plastification: 'Plastification Document'
      };
      const label = serviceNames[copyServiceType] || 'Service Photocopie';

      // Insert directly into Ventes with product_id: null
      if (api?.createVente) {
        const res = await api.createVente({
          items: [{
            product_id: null,
            product_name: `${label} (${copyQty} page${copyQty > 1 ? 's' : ''})`,
            unit_name: 'Page',
            conversion_factor: 1,
            quantity: copyQty,
            cost_price: Math.round(unitPrice * 0.2), // minimal paper cost
            selling_price: unitPrice,
            discount_percent: 0
          }],
          client_id: null,
          client_name: 'Client Comptoir',
          user_id: currentUser?.id || 1,
          user_name: currentUser?.full_name || currentUser?.username || 'Admin',
          caisse_id: null,
          cash_received: totalAmount,
          notes: `Vente de service: ${label}`
        });

        if (res?.success) {
          showToast(`Service "${label}" encaissé (${fmt(totalAmount)})`, 'success');
          setCopyQty(1);
        } else {
          showToast(res?.message || 'Erreur lors de l\'enregistrement', 'error');
        }
      }
    } catch (e: any) {
      showToast(e.message || 'Erreur lors de la vente service', 'error');
    } finally {
      setSubmittingCopy(false);
    }
  };

  // Save Tarifs + Service Caisses
  const handleSaveTarifs = async () => {
    try {
      if (api?.saveServicesSettings) {
        const res = await api.saveServicesSettings({ tarifs: tempTarifs, serviceCaisses: tempServiceCaisses });
        if (res?.success) {
          setTarifs(tempTarifs);
          setServiceCaisses(tempServiceCaisses);
          setShowTarifsModal(false);
          showToast('Tarifs & Caisses des services mis à jour avec succès', 'success');
        } else {
          showToast(res?.message || 'Erreur lors de la sauvegarde des tarifs', 'error');
        }
      }
    } catch (e: any) {
      showToast(e.message || 'Erreur', 'error');
    }
  };

  // Save SIM Balance
  const handleSaveSimBalance = async () => {
    const val = parseFloat(simModalAmount);
    if (isNaN(val) || val <= 0) {
      showToast('Montant invalide', 'error');
      return;
    }
    try {
      if (api?.updateSimBalance) {
        const res = await api.updateSimBalance({
          operator: simModalOperator,
          amount: val,
          mode: simModalMode
        });
        if (res?.success) {
          setBalances(res.balances);
          setShowSimModal(false);
          setSimModalAmount('');
          showToast(`Solde SIM ${simModalOperator.toUpperCase()} actualisé`, 'success');
        } else {
          showToast(res?.message || 'Erreur de mise à jour du solde', 'error');
        }
      }
    } catch (e: any) {
      showToast(e.message || 'Erreur', 'error');
    }
  };

  // Save API Config
  const handleSaveApiConfig = async () => {
    try {
      if (api?.saveServicesSettings) {
        const res = await api.saveServicesSettings({ apiConfig: tempApiConfig });
        if (res?.success) {
          setApiConfig(tempApiConfig);
          setShowApiModal(false);
          showToast('Configuration API Flexy enregistrée avec succès', 'success');
        } else {
          showToast(res?.message || 'Erreur de sauvegarde API', 'error');
        }
      }
    } catch (e: any) {
      showToast(e.message || 'Erreur', 'error');
    }
  };

  // Test API Flexy Connection
  const handleTestApi = async () => {
    setApiTestLoading(true);
    setApiTestStatus(null);
    try {
      if (api?.testFlexyApi) {
        const res = await api.testFlexyApi(tempApiConfig);
        if (res?.success) {
          setApiTestStatus({ ok: true, msg: res.message || 'Connexion API Flexy réussie !' });
        } else {
          setApiTestStatus({ ok: false, msg: res?.message || 'Échec de communication avec la passerelle' });
        }
      }
    } catch (e: any) {
      setApiTestStatus({ ok: false, msg: e.message || 'Erreur réseau ou URL injoignable' });
    } finally {
      setApiTestLoading(false);
    }
  };

  // Delete a standalone Flexy transaction
  const handleDeleteFlexy = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await api?.deleteFlexyTransaction?.(id);
      if (res?.success) {
        showToast('Transaction supprimée et soldes restaurés', 'success');
        setDeleteConfirmId(null);
        loadSettings();
        loadHistory();
      } else {
        showToast(res?.message || 'Erreur lors de la suppression', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Erreur', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Operator UI metadata
  const opMeta = {
    mobilis: {
      name: 'Mobilis Arseelli',
      code: '06',
      badge: '06 / 09',
      color: '#009640',
      bgLight: '#f0fdf4',
      border: '#86efac',
      accent: '#15803d',
      gradient: 'linear-gradient(135deg, #009640 0%, #16a34a 100%)'
    },
    djezzy: {
      name: 'Djezzy Flexy',
      code: '07',
      badge: '07',
      color: '#e30613',
      bgLight: '#fef2f2',
      border: '#fca5a5',
      accent: '#b91c1c',
      gradient: 'linear-gradient(135deg, #e30613 0%, #dc2626 100%)'
    },
    ooredoo: {
      name: 'Ooredoo Storm',
      code: '05',
      badge: '05',
      color: '#ed1c24',
      bgLight: '#fff1f2',
      border: '#fecdd3',
      accent: '#be123c',
      gradient: 'linear-gradient(135deg, #ed1c24 0%, #be123c 100%)'
    }
  };

  const totalSimBalance = (balances.mobilis || 0) + (balances.djezzy || 0) + (balances.ooredoo || 0);

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100%', direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: isRtl ? 'auto' : '24px',
          left: isRtl ? '24px' : 'auto',
          zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : '#16a34a',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 600
        }}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {t.titleServices || 'Multi-Services & Flexy'}
              </h1>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                Recharges électroniques (Mobilis, Djezzy, Ooredoo), photocopies, impressions & passerelle API
              </p>
            </div>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => { loadSettings(); loadHistory(); }}
            title="Actualiser"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loadingHistory || loadingSettings ? 'animate-spin' : ''} />
            Actualiser
          </button>

          {canEditTarifs && (
            <button
              onClick={() => { setTempTarifs({ ...tarifs }); setShowTarifsModal(true); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              <Sliders size={14} />
              Tarifs des Services
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => { setTempApiConfig({ ...apiConfig }); setApiTestStatus(null); setShowApiModal(true); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: apiConfig.enabled ? '#0284c7' : '#ffffff',
                color: apiConfig.enabled ? '#ffffff' : '#0284c7',
                border: '1px solid #0284c7',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Server size={14} />
              Passerelle API Flexy {apiConfig.enabled ? '(Active)' : ''}
            </button>
          )}
        </div>
      </div>

      {/* TOP: LIVE SIM BALANCES & STATS CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '14px',
        marginBottom: '22px'
      }}>
        {/* 1. Mobilis Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '16px 18px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: opMeta.mobilis.gradient }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: opMeta.mobilis.bgLight,
                color: opMeta.mobilis.color,
                fontWeight: 800,
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '6px',
                border: `1px solid ${opMeta.mobilis.border}`
              }}>
                Mobilis 06
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Arseelli</span>
            </div>
            <button
              onClick={() => { setSimModalOperator('mobilis'); setSimModalAmount(''); setSimModalMode('add'); setShowSimModal(true); }}
              title="Ajouter du solde SIM Mobilis"
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              + Recharger
            </button>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: opMeta.mobilis.color }}>
            {fmt(balances.mobilis || 0)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Vendu aujourd'hui : <strong>{fmt(historyStats.byOperator?.mobilis || 0)}</strong>
          </div>
        </div>

        {/* 2. Djezzy Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '16px 18px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: opMeta.djezzy.gradient }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: opMeta.djezzy.bgLight,
                color: opMeta.djezzy.color,
                fontWeight: 800,
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '6px',
                border: `1px solid ${opMeta.djezzy.border}`
              }}>
                Djezzy 07
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Flexy</span>
            </div>
            <button
              onClick={() => { setSimModalOperator('djezzy'); setSimModalAmount(''); setSimModalMode('add'); setShowSimModal(true); }}
              title="Ajouter du solde SIM Djezzy"
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              + Recharger
            </button>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: opMeta.djezzy.color }}>
            {fmt(balances.djezzy || 0)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Vendu aujourd'hui : <strong>{fmt(historyStats.byOperator?.djezzy || 0)}</strong>
          </div>
        </div>

        {/* 3. Ooredoo Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '16px 18px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: opMeta.ooredoo.gradient }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: opMeta.ooredoo.bgLight,
                color: opMeta.ooredoo.color,
                fontWeight: 800,
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '6px',
                border: `1px solid ${opMeta.ooredoo.border}`
              }}>
                Ooredoo 05
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Storm</span>
            </div>
            <button
              onClick={() => { setSimModalOperator('ooredoo'); setSimModalAmount(''); setSimModalMode('add'); setShowSimModal(true); }}
              title="Ajouter du solde SIM Ooredoo"
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              + Recharger
            </button>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: opMeta.ooredoo.color }}>
            {fmt(balances.ooredoo || 0)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Vendu aujourd'hui : <strong>{fmt(historyStats.byOperator?.ooredoo || 0)}</strong>
          </div>
        </div>

        {/* 4. Total Combined Sim Balance & Service Profit */}
        <div style={{
          background: '#0f172a',
          color: '#ffffff',
          borderRadius: '14px',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(15,23,42,0.15)'
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Solde Global Disponible
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#38bdf8', marginTop: '4px' }}>
              {fmt(totalSimBalance)}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #334155', paddingTop: '8px', marginTop: '8px', fontSize: '11px', color: '#cbd5e1' }}>
            <span>Recharges ({dateFilter === 'today' ? 'Aujourd\'hui' : dateFilter}) :</span>
            <strong style={{ color: '#4ade80' }}>{fmt(historyStats.totalRevenue || 0)}</strong>
          </div>
        </div>
      </div>

      {/* WORKSTATIONS SPLIT (Flexy Station & Photocopie Station) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: '20px',
        marginBottom: '26px'
      }}>
        {/* WORKSTATION 1: FLEXY DIRECT RECHARGE */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={18} />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Guichet Flexy Express
              </h2>
            </div>
            {apiConfig.enabled && (
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: '#e0f2fe', color: '#0369a1' }}>
                Mode API Automatique
              </span>
            )}
          </div>

          <form onSubmit={handlePerformFlexy}>
            {/* Operator Selection */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                1. Sélectionner l'Opérateur
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {(['mobilis', 'djezzy', 'ooredoo'] as const).map(op => {
                  const active = flexyOp === op;
                  const meta = opMeta[op];
                  return (
                    <button
                      type="button"
                      key={op}
                      onClick={() => setFlexyOp(op)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '10px',
                        border: `2px solid ${active ? meta.color : '#e2e8f0'}`,
                        background: active ? meta.bgLight : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 800, color: active ? meta.color : '#0f172a' }}>
                        {op.toUpperCase()}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                        {meta.badge}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Phone Number Input */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  2. Numéro du Client (10 chiffres)
                </label>
                <span style={{ fontSize: '11px', fontWeight: 700, color: opMeta[flexyOp].color }}>
                  Détecté: {opMeta[flexyOp].name}
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', top: '12px', left: isRtl ? 'auto' : '12px', right: isRtl ? '12px' : 'auto', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Ex: 06 61 23 45 67"
                  value={flexyPhone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: isRtl ? '10px 14px 10px 36px' : '10px 36px 10px 36px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '15px',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Quick Price Buttons (Algerian denominations) */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                3. Montant de la Recharge (DA)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '8px' }}>
                {[100, 200, 500, 1000, 2000].map(amt => (
                  <button
                    type="button"
                    key={amt}
                    onClick={() => { setFlexyAmount(amt); setFlexyCustomAmount(''); }}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: `1.5px solid ${flexyAmount === amt ? '#16a34a' : '#e2e8f0'}`,
                      background: flexyAmount === amt ? '#dcfce7' : '#ffffff',
                      color: flexyAmount === amt ? '#15803d' : '#334155'
                    }}
                  >
                    {amt} DA
                  </button>
                ))}
              </div>

              {/* Custom amount */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder="Ou montant personnalisé (ex: 450)..."
                  value={flexyCustomAmount}
                  onChange={e => {
                    setFlexyCustomAmount(e.target.value);
                    if (e.target.value) setFlexyAmount('');
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
                {/* Commission / Service fee option */}
                <select
                  value={flexyFee}
                  onChange={e => setFlexyFee(Number(e.target.value))}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: '#f8fafc',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                >
                  <option value={0}>Frais : 0 DA</option>
                  <option value={10}>Frais : +10 DA</option>
                  <option value={20}>Frais : +20 DA</option>
                  <option value={30}>Frais : +30 DA</option>
                  <option value={50}>Frais : +50 DA</option>
                </select>
              </div>
            </div>

            {/* Total to Collect Summary */}
            <div style={{
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Total à encaisser auprès du client :</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#15803d' }}>
                  {fmt(((flexyAmount === '' ? parseFloat(flexyCustomAmount) || 0 : Number(flexyAmount)) + (Number(flexyFee) || 0)))}
                </div>
              </div>
              <div style={{ textAlign: isRtl ? 'left' : 'right', fontSize: '11px', color: '#64748b' }}>
                <div>Recharge: {flexyAmount === '' ? flexyCustomAmount || '0' : flexyAmount} DA</div>
                <div>Frais de service: +{flexyFee} DA</div>
              </div>
            </div>

            {/* Action Submit Button */}
            <button
              type="submit"
              disabled={submittingFlexy}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                background: opMeta[flexyOp].gradient,
                color: '#ffffff',
                border: 'none',
                fontSize: '14px',
                fontWeight: 800,
                cursor: submittingFlexy ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              <Send size={16} />
              {submittingFlexy ? 'Traitement en cours...' : `Valider la Recharge ${flexyOp.toUpperCase()}`}
            </button>
          </form>
        </div>

        {/* WORKSTATION 2: PHOTOCOPIE & IMPRESSION */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Copy size={18} />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Guichet Photocopies & Documents
              </h2>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Tarif auto Caisse
            </span>
          </div>

          {/* Quick Service Cards Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
            {[
              { id: 'photocopie_nb', label: 'Photocopie N&B', price: tarifs.photocopie_nb, icon: '📄' },
              { id: 'photocopie_color', label: 'Photocopie Couleur', price: tarifs.photocopie_color, icon: '🎨' },
              { id: 'photocopie_rv_nb', label: 'Recto-Verso N&B', price: tarifs.photocopie_rv_nb, icon: '📑' },
              { id: 'photocopie_rv_color', label: 'Recto-Verso Couleur', price: tarifs.photocopie_rv_color, icon: '🖼️' },
              { id: 'impression_doc', label: 'Impression Document', price: tarifs.impression_doc, icon: '🖨️' },
              { id: 'scan_doc', label: 'Scan & Numérisation', price: tarifs.scan_doc, icon: '📥' },
              { id: 'plastification', label: 'Plastification A4', price: tarifs.plastification, icon: '✨' },
            ].map(srv => {
              const active = copyServiceType === srv.id;
              return (
                <button
                  type="button"
                  key={srv.id}
                  onClick={() => setCopyServiceType(srv.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: `1.5px solid ${active ? '#2563eb' : '#e2e8f0'}`,
                    background: active ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: isRtl ? 'right' : 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{srv.icon}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: active ? '#1d4ed8' : '#0f172a' }}>
                      {srv.label}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: active ? '#2563eb' : '#64748b' }}>
                    {srv.price} DA
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quantity Stepper */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              Nombre de Pages / Copies
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setCopyQty(Math.max(1, copyQty - 1))}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '18px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                -
              </button>
              <input
                type="number"
                min="1"
                value={copyQty}
                onChange={e => setCopyQty(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  width: '90px',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  textAlign: 'center',
                  fontSize: '16px',
                  fontWeight: 800,
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setCopyQty(copyQty + 1)}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '18px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                +
              </button>

              {/* Quick Stepper Chips */}
              {[5, 10, 20, 50].map(add => (
                <button
                  type="button"
                  key={add}
                  onClick={() => setCopyQty(prev => prev + add)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  +{add}
                </button>
              ))}
            </div>
          </div>

          {/* Copy Total Summary */}
          <div style={{
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Montant total de la commande :</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#2563eb' }}>
                {fmt(((tarifs as any)[copyServiceType] || 10) * copyQty)}
              </div>
            </div>
            <div style={{ textAlign: isRtl ? 'left' : 'right', fontSize: '11px', color: '#64748b' }}>
              <div>{copyQty} page{copyQty > 1 ? 's' : ''} à {(tarifs as any)[copyServiceType] || 10} DA</div>
              <div style={{ color: '#16a34a', fontWeight: 600 }}>Enregistrement direct en Caisse</div>
            </div>
          </div>

          {/* Submit Copy Sale */}
          <button
            type="button"
            onClick={handlePerformCopy}
            disabled={submittingCopy}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontSize: '14px',
              fontWeight: 800,
              cursor: submittingCopy ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
            }}
          >
            <Printer size={16} />
            {submittingCopy ? 'Enregistrement...' : `Encaisser ${(tarifs as any)[copyServiceType] * copyQty} DA`}
          </button>
        </div>
      </div>

      {/* RECENT FLEXY & SERVICES TRANSACTIONS TABLE */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        {/* Table Filters Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Journal des Opérations Flexy & Services
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
              Suivi détaillé des recharges téléphoniques et rentrées de caisse
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', top: '9px', left: isRtl ? 'auto' : '10px', right: isRtl ? '10px' : 'auto', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Rechercher (téléphone, réf)..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                style={{
                  padding: isRtl ? '6px 10px 6px 30px' : '6px 10px 6px 30px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  width: '200px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Operator Filter */}
            <select
              value={operatorFilter}
              onChange={e => setOperatorFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                fontWeight: 600,
                background: '#ffffff',
                color: '#0f172a',
                outline: 'none'
              }}
            >
              <option value="all">Tous les opérateurs</option>
              <option value="mobilis">Mobilis</option>
              <option value="djezzy">Djezzy</option>
              <option value="ooredoo">Ooredoo</option>
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                fontWeight: 600,
                background: '#ffffff',
                color: '#0f172a',
                outline: 'none'
              }}
            >
              <option value="today">Aujourd'hui</option>
              <option value="yesterday">Hier</option>
              <option value="7days">7 derniers jours</option>
              <option value="thisMonth">Ce mois</option>
              <option value="all">Tout l'historique</option>
            </select>
          </div>
        </div>

        {/* Table content */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 12px', textAlign: isRtl ? 'right' : 'left' }}>Date & Heure</th>
                <th style={{ padding: '10px 12px', textAlign: isRtl ? 'right' : 'left' }}>Référence</th>
                <th style={{ padding: '10px 12px', textAlign: isRtl ? 'right' : 'left' }}>Opérateur</th>
                <th style={{ padding: '10px 12px', textAlign: isRtl ? 'right' : 'left' }}>Téléphone</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Montant Recharge</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Frais / Com.</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Encaissé</th>
                <th style={{ padding: '10px 12px', textAlign: isRtl ? 'right' : 'left' }}>Caissier</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Reçu</th>
                {isAdmin && <th style={{ padding: '10px 12px', textAlign: 'center' }}>⚠️</th>}
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 10 : 9} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    Aucune opération Flexy enregistrée pour cette période.
                  </td>
                </tr>
              ) : (
                transactions.map((tx: any) => {
                  const meta = opMeta[tx.operator as 'mobilis' | 'djezzy' | 'ooredoo'] || opMeta.mobilis;
                  return (
                    <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '12px' }}>
                        {tx.created_at ? tx.created_at.replace('T', ' ').slice(0, 16) : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#334155', fontSize: '12px' }}>
                        {tx.transaction_ref || `#${tx.id}`}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          background: meta.bgLight,
                          color: meta.color,
                          border: `1px solid ${meta.border}`
                        }}>
                          {tx.operator.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 800, letterSpacing: '0.5px', color: '#0f172a' }}>
                        {tx.phone_number || 'Comptoir'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {fmt(tx.amount)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                        {tx.commission > 0 ? `+${fmt(tx.commission)}` : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#0f172a' }}>
                        {fmt(tx.selling_price || tx.amount)}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '12px' }}>
                        {tx.user_name || 'Admin'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setLastFlexyTicket({
                              reference: tx.transaction_ref || `#${tx.id}`,
                              operator: tx.operator,
                              phone: tx.phone_number,
                              amount: tx.amount,
                              fee: tx.commission,
                              total: tx.selling_price || tx.amount,
                              date: tx.created_at || new Date().toLocaleString(),
                              user: tx.user_name || 'Admin'
                            });
                            setShowReceiptModal(true);
                          }}
                          style={{
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            color: '#475569'
                          }}
                        >
                          <Printer size={14} />
                        </button>
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {deleteConfirmId === tx.id ? (
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleDeleteFlexy(tx.id)}
                                disabled={deletingId === tx.id}
                                style={{
                                  background: '#ef4444',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                {deletingId === tx.id ? '...' : 'Oui'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                style={{
                                  background: '#e2e8f0',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  color: '#475569'
                                }}
                              >
                                Non
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              title="Supprimer cette transaction"
                              onClick={() => setDeleteConfirmId(tx.id)}
                              style={{
                                background: 'transparent',
                                border: '1px solid #fca5a5',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                color: '#ef4444'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: RECHARGER LE SOLDE SIM */}
      {showSimModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '420px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Recharger le Solde SIM ({simModalOperator.toUpperCase()})
              </h3>
              <button
                onClick={() => setShowSimModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                Mode d'opération :
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSimModalMode('add')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: `1.5px solid ${simModalMode === 'add' ? '#16a34a' : '#e2e8f0'}`,
                    background: simModalMode === 'add' ? '#dcfce7' : '#ffffff',
                    color: simModalMode === 'add' ? '#15803d' : '#475569'
                  }}
                >
                  + Ajouter au solde actuel
                </button>
                <button
                  type="button"
                  onClick={() => setSimModalMode('set')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: `1.5px solid ${simModalMode === 'set' ? '#0284c7' : '#e2e8f0'}`,
                    background: simModalMode === 'set' ? '#e0f2fe' : '#ffffff',
                    color: simModalMode === 'set' ? '#0369a1' : '#475569'
                  }}
                >
                  Définir le solde exact
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                Montant de gros acheté chez le grossiste (DA) :
              </label>
              <input
                type="number"
                placeholder="Ex: 50000"
                value={simModalAmount}
                onChange={e => setSimModalAmount(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '16px',
                  fontWeight: 800,
                  outline: 'none'
                }}
              />
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Solde actuel : <strong>{fmt((balances as any)[simModalOperator] || 0)}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowSimModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveSimBalance}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Enregistrer le Solde
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIGURER LES TARIFS DES SERVICES */}
      {showTarifsModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Tarification des Services (Prix unitaire DA)
              </h3>
              <button
                onClick={() => setShowTarifsModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { key: 'photocopie_nb', label: 'Photocopie N&B' },
                { key: 'photocopie_color', label: 'Photocopie Couleur' },
                { key: 'photocopie_rv_nb', label: 'Recto-Verso N&B' },
                { key: 'photocopie_rv_color', label: 'Recto-Verso Couleur' },
                { key: 'impression_doc', label: 'Impression Document' },
                { key: 'scan_doc', label: 'Scan & Numérisation' },
                { key: 'plastification', label: 'Plastification A4' },
                { key: 'flexy_commission_fixed', label: 'Frais Flexy défaut' }
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    {f.label} (DA)
                  </label>
                  <input
                    type="number"
                    value={(tempTarifs as any)[f.key] || 0}
                    onChange={e => setTempTarifs({ ...tempTarifs, [f.key]: parseFloat(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Service Caisse Assignment */}
            {caissesList.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  fontSize: '13px', fontWeight: 800, color: '#0f172a',
                  marginBottom: '10px', padding: '8px 12px',
                  background: '#f0f9ff', borderRadius: '8px', borderLeft: '3px solid #0284c7'
                }}>
                  🏦 Affectation des Caisses par Service
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      ⚡ Caisse Flexy (Recharges)
                    </label>
                    <select
                      value={tempServiceCaisses.flexy_caisse_id ?? ''}
                      onChange={e => setTempServiceCaisses(prev => ({ ...prev, flexy_caisse_id: e.target.value ? Number(e.target.value) : null }))}
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '8px 10px',
                        borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px',
                        fontWeight: 600, outline: 'none', background: '#fff'
                      }}
                    >
                      <option value=''>— Caisse par défaut —</option>
                      {caissesList.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      🖨️ Caisse Photocopie / Impression
                    </label>
                    <select
                      value={tempServiceCaisses.photocopie_caisse_id ?? ''}
                      onChange={e => setTempServiceCaisses(prev => ({ ...prev, photocopie_caisse_id: e.target.value ? Number(e.target.value) : null }))}
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '8px 10px',
                        borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px',
                        fontWeight: 600, outline: 'none', background: '#fff'
                      }}
                    >
                      <option value=''>— Caisse par défaut —</option>
                      {caissesList.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowTarifsModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveTarifs}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Enregistrer les Tarifs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PASSERELLE API FLEXY */}
      {showApiModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Server size={20} color="#0284c7" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Configuration Passerelle API Flexy
                </h3>
              </div>
              <button
                onClick={() => setShowApiModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Toggle Enable */}
            <div style={{
              background: tempApiConfig.enabled ? '#f0fdf4' : '#f8fafc',
              border: `1.5px solid ${tempApiConfig.enabled ? '#86efac' : '#e2e8f0'}`,
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                  Activer la Passerelle API Flexy
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Envoie automatiquement les recharges au serveur passerelle ou modem
                </div>
              </div>
              <input
                type="checkbox"
                checked={tempApiConfig.enabled}
                onChange={e => setTempApiConfig({ ...tempApiConfig, enabled: e.target.checked })}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>

            {/* API URL */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                URL du Serveur API (Endpoint) :
              </label>
              <input
                type="text"
                placeholder="https://api.monserveur-flexy.dz/recharge"
                value={tempApiConfig.apiUrl}
                onChange={e => setTempApiConfig({ ...tempApiConfig, apiUrl: e.target.value })}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            {/* API Key & PIN */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Clé d'authentification (API Key) :
                </label>
                <input
                  type="password"
                  placeholder="Bearer token ou API Key..."
                  value={tempApiConfig.apiKey}
                  onChange={e => setTempApiConfig({ ...tempApiConfig, apiKey: e.target.value })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Code PIN / Secret SIM :
                </label>
                <input
                  type="password"
                  placeholder="Code PIN de la puce..."
                  value={tempApiConfig.pin}
                  onChange={e => setTempApiConfig({ ...tempApiConfig, pin: e.target.value })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Auto send toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <input
                type="checkbox"
                id="autoSendCheck"
                checked={tempApiConfig.autoSend}
                onChange={e => setTempApiConfig({ ...tempApiConfig, autoSend: e.target.checked })}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="autoSendCheck" style={{ fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
                Exécuter la requête API dès que le caissier clique sur "Valider la recharge"
              </label>
            </div>

            {/* API Test status indicator */}
            {apiTestStatus && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: apiTestStatus.ok ? '#dcfce7' : '#fee2e2',
                color: apiTestStatus.ok ? '#15803d' : '#b91c1c',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {apiTestStatus.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>{apiTestStatus.msg}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleTestApi}
                disabled={apiTestLoading || !tempApiConfig.apiUrl}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: apiTestLoading ? 'wait' : 'pointer'
                }}
              >
                {apiTestLoading ? 'Test en cours...' : 'Tester la connexion API'}
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowApiModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#f1f5f9',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveApiConfig}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Enregistrer l'API
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: REÇU THERMIQUE DE RECHARGE FLEXY */}
      {showReceiptModal && lastFlexyTicket && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '360px',
            padding: '20px',
            fontFamily: 'monospace',
            color: '#000',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
          }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: '12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: 900 }}>REÇU DE RECHARGE FLEXY</div>
              <div style={{ fontSize: '11px', color: '#475569' }}>Réf: {lastFlexyTicket.reference}</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>{lastFlexyTicket.date}</div>
            </div>

            <div style={{ fontSize: '12px', lineHeight: '1.8', borderBottom: '1px dashed #94a3b8', paddingBottom: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Opérateur :</span>
                <strong style={{ textTransform: 'uppercase' }}>{lastFlexyTicket.operator}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>N° Téléphone :</span>
                <strong style={{ fontSize: '14px', letterSpacing: '1px' }}>{lastFlexyTicket.phone || 'Comptoir'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Montant Recharge :</span>
                <strong>{fmt(lastFlexyTicket.amount)}</strong>
              </div>
              {lastFlexyTicket.fee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Frais de service :</span>
                  <span>+{fmt(lastFlexyTicket.fee)}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 900, marginBottom: '14px' }}>
              <span>TOTAL PAYÉ :</span>
              <span>{fmt(lastFlexyTicket.total)}</span>
            </div>

            <div style={{ textAlign: 'center', fontSize: '10px', color: '#64748b', marginBottom: '16px' }}>
              Merci pour votre confiance !<br />
              Gardez ce reçu comme preuve de recharge.
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => { window.print(); }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Printer size={14} /> Imprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
