import React, { useState, useEffect } from 'react';
import { 
  Globe, Printer, Store, UserCheck, HardDrive, Save, 
  Download, Upload, Shield, Key, FileText, CheckCircle2, 
  AlertTriangle, RefreshCw, FileSpreadsheet, Layers, 
  Lock, Check, AlertCircle
} from 'lucide-react';
import { translations } from '../i18n';
import type { Language, Translations } from '../i18n';
import { getPermissionSummary } from '../permissions';

interface SettingsPageProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  currentUser: any;
  onUpdateCurrentUser: (user: any) => void;
  onSwitchUser: (user: any) => void;
  availableUsers: any[];
  onDataRestored: () => void;
  activeSubTab?: 'language' | 'printer' | 'store' | 'account' | 'backup' | 'licence';
  onSubTabChange?: (tab: 'language' | 'printer' | 'store' | 'account' | 'backup' | 'licence') => void;
  onOpenRoleModal?: (user?: any) => void;
  activationInfo?: any;
  onOpenActivationModal?: () => void;
}

export default function SettingsPage({
  currentLang,
  onLanguageChange,
  currentUser,
  onUpdateCurrentUser,
  onSwitchUser,
  availableUsers,
  onDataRestored,
  activeSubTab,
  onSubTabChange,
  onOpenRoleModal,
  activationInfo,
  onOpenActivationModal
}: SettingsPageProps) {
  const t: Translations = translations[currentLang] || translations.fr;

  // Active sub-tab in Settings
  const [subTab, setInternalSubTab] = useState<'language' | 'printer' | 'store' | 'account' | 'backup' | 'licence'>(activeSubTab || 'language');

  useEffect(() => {
    if (activeSubTab) {
      setInternalSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  const setSubTab = (tab: 'language' | 'printer' | 'store' | 'account' | 'backup' | 'licence') => {
    setInternalSubTab(tab);
    if (onSubTabChange) onSubTabChange(tab);
  };

  // Notification / Alert message
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Store information state
  const [storeData, setStoreData] = useState({
    name: 'imatechx',
    tagline: 'Logistique, Approvisionnement & Vente en Gros',
    rc: 'RC 489201 Paris',
    taxId: 'FR 89 423 889 123 - ICE 002394857000084',
    address: '120 Zone Industrielle, Route Principale',
    city: 'Paris',
    postalCode: '75001',
    country: 'France',
    phone: '+33 1 45 88 90 20',
    phoneAlt: '+33 6 12 34 56 78',
    email: 'contact@distribution-express.fr',
    website: 'www.distribution-express.fr',
    currency: '€',
    footerNote: 'Marchandise vérifiée et conforme. Les retours sont acceptés sous 7 jours. Merci pour votre fidélité !',
    logo: 'truck'
  });

  // Printer configuration state
  const [printersList, setPrintersList] = useState<any[]>([
    { name: 'EPSON TM-T20III (Thermique 80mm)', isDefault: true, status: 'Ready' },
    { name: 'HP LaserJet Pro M404 (A4 Laser)', isDefault: false, status: 'Ready' },
    { name: 'Zebra ZD420 (Étiquettes Barcode)', isDefault: false, status: 'Ready' },
    { name: 'Microsoft Print to PDF', isDefault: false, status: 'Ready' }
  ]);
  const [selectedReceiptPrinter, setSelectedReceiptPrinter] = useState('EPSON TM-T20III (Thermique 80mm)');
  const [selectedInvoicePrinter, setSelectedInvoicePrinter] = useState('HP LaserJet Pro M404 (A4 Laser)');
  const [selectedBarcodePrinter, setSelectedBarcodePrinter] = useState('Zebra ZD420 (Étiquettes Barcode)');
  const [paperWidth, setPaperWidth] = useState('80mm');
  const [autoCut, setAutoCut] = useState(true);
  const [cashDrawer, setCashDrawer] = useState(true);
  const [copies, setCopies] = useState(1);
  const [showTestTicket, setShowTestTicket] = useState(false);

  // Account management state
  const [editFullName, setEditFullName] = useState(currentUser?.full_name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Backup & Restore state
  const [lastBackupDate, setLastBackupDate] = useState<string>('Aujourd\'hui, 10:15');
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<any>(null);

  // Load existing settings from SQLite / localStorage
  useEffect(() => {
    async function loadSettings() {
      if (window.electronAPI?.getSettings) {
        try {
          const res = await window.electronAPI.getSettings();
          if (res.success && res.settings) {
            const s = res.settings;
            if (s.language && ['fr', 'en', 'ar'].includes(s.language)) {
              onLanguageChange(s.language as Language);
            }
            setStoreData(prev => ({
              ...prev,
              name: s.store_name || prev.name,
              tagline: s.store_tagline || prev.tagline,
              rc: s.store_ice || prev.rc,
              taxId: s.store_tax_id || prev.taxId,
              address: s.store_address || prev.address,
              city: s.store_city || prev.city,
              postalCode: s.store_postal_code || prev.postalCode,
              country: s.store_country || prev.country,
              phone: s.store_phone || prev.phone,
              phoneAlt: s.store_phone_alt || prev.phoneAlt,
              email: s.store_email || prev.email,
              website: s.store_website || prev.website,
              currency: s.store_currency || prev.currency,
              footerNote: s.store_footer_note || prev.footerNote,
              logo: s.store_logo || prev.logo
            }));
            if (s.printer_ticket) setSelectedReceiptPrinter(s.printer_ticket);
            if (s.printer_invoice) setSelectedInvoicePrinter(s.printer_invoice);
            if (s.printer_label) setSelectedBarcodePrinter(s.printer_label);
            if (s.printer_paper) setPaperWidth(s.printer_paper);
            if (s.printer_copies) setCopies(Number(s.printer_copies) || 1);
            if (s.printer_autocut !== undefined) setAutoCut(s.printer_autocut === 'true');
            if (s.backup_last_date) setLastBackupDate(s.backup_last_date);
          }
        } catch (e) {
          console.error('Error loading settings from SQLite:', e);
        }
      } else {
        // Fallback to localStorage
        const savedLang = localStorage.getItem('app_language') as Language;
        if (savedLang) onLanguageChange(savedLang);
        const savedStore = localStorage.getItem('app_store_data');
        if (savedStore) {
          try { setStoreData(JSON.parse(savedStore)); } catch (e) {}
        }
        const savedBackupDate = localStorage.getItem('app_last_backup_date');
        if (savedBackupDate) setLastBackupDate(savedBackupDate);
      }

      // Fetch printers
      if (window.electronAPI?.getPrinters) {
        try {
          const res = await window.electronAPI.getPrinters();
          if (res.success && res.printers && res.printers.length > 0) {
            setPrintersList(res.printers);
            const defaultP = res.printers.find((p: any) => p.isDefault) || res.printers[0];
            if (defaultP) {
              setSelectedReceiptPrinter(defaultP.name);
              setSelectedInvoicePrinter(defaultP.name);
            }
          }
        } catch (e) {
          console.error('Error fetching printers:', e);
        }
      }

      // Fetch audit logs
      if (window.electronAPI?.getAuditLogs) {
        try {
          const logs = await window.electronAPI.getAuditLogs();
          if (logs && Array.isArray(logs)) setAuditLogs(logs);
        } catch (e) {
          console.error('Error fetching audit logs:', e);
        }
      }
    }

    loadSettings();
  }, []);

  // Update editFullName when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setEditFullName(currentUser.full_name || '');
    }
  }, [currentUser]);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  // --- 1. LANGUAGE HANDLERS ---
  const handleSelectLanguage = async (lang: Language) => {
    onLanguageChange(lang);
    localStorage.setItem('app_language', lang);
    if (window.electronAPI?.saveSettings) {
      await window.electronAPI.saveSettings({ language: lang });
    }
    showAlert('success', translations[lang]?.savedLanguageNotice || 'Langue mise à jour');
  };

  // --- 2. PRINTER HANDLERS ---
  const handleDetectPrinters = async () => {
    if (window.electronAPI?.getPrinters) {
      try {
        const res = await window.electronAPI.getPrinters();
        if (res.success && res.printers && res.printers.length > 0) {
          setPrintersList(res.printers);
          showAlert('success', `${res.printers.length} ${t.printersDetected}`);
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
    showAlert('success', `3 ${t.printersDetected} (Mode Direct)`);
  };

  const handleSavePrinters = async () => {
    const payload = {
      printer_ticket: selectedReceiptPrinter,
      printer_invoice: selectedInvoicePrinter,
      printer_label: selectedBarcodePrinter,
      printer_paper: paperWidth,
      printer_autocut: String(autoCut),
      printer_copies: String(copies)
    };
    if (window.electronAPI?.saveSettings) {
      await window.electronAPI.saveSettings(payload);
    }
    window.dispatchEvent(new CustomEvent('settings:updated'));
    showAlert('success', t.save + ' : ' + t.printerHeading);
  };

  const handleTestPrint = async () => {
    setShowTestTicket(true);
    if (window.electronAPI?.printTest) {
      await window.electronAPI.printTest({ printerName: selectedReceiptPrinter, testType: 'Ticket de Caisse 80mm' });
    }
    showAlert('success', t.testPrintSuccess);
  };

  // --- 3. STORE INFO HANDLERS ---
  const handleSaveStoreInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      store_name: storeData.name,
      store_tagline: storeData.tagline,
      store_ice: storeData.rc,
      store_tax_id: storeData.taxId,
      store_address: storeData.address,
      store_city: storeData.city,
      store_postal_code: storeData.postalCode,
      store_country: storeData.country,
      store_phone: storeData.phone,
      store_phone_alt: storeData.phoneAlt,
      store_email: storeData.email,
      store_website: storeData.website,
      store_currency: storeData.currency,
      store_footer_note: storeData.footerNote,
      store_logo: storeData.logo
    };

    if (window.electronAPI?.saveSettings) {
      await window.electronAPI.saveSettings(payload);
    }
    localStorage.setItem('app_store_data', JSON.stringify(storeData));
    window.dispatchEvent(new CustomEvent('settings:updated'));
    showAlert('success', t.storeSavedSuccess);
  };

  // --- 4. ACCOUNT MANAGING HANDLERS ---
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (window.electronAPI?.updateAccount) {
      const res = await window.electronAPI.updateAccount({
        userId: currentUser.id,
        fullName: editFullName
      });
      if (res.success && res.user) {
        onUpdateCurrentUser(res.user);
        showAlert('success', t.accountUpdatedSuccess);
      } else {
        showAlert('error', res.message || 'Erreur lors de la mise à jour');
      }
    } else {
      const updated = { ...currentUser, full_name: editFullName };
      onUpdateCurrentUser(updated);
      showAlert('success', t.accountUpdatedSuccess);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (newPassword !== confirmPassword) {
      showAlert('error', t.passwordMismatch);
      return;
    }
    if (newPassword.length < 4) {
      showAlert('error', 'Le mot de passe doit comporter au moins 4 caractères.');
      return;
    }

    if (window.electronAPI?.updateAccount) {
      const res = await window.electronAPI.updateAccount({
        userId: currentUser.id,
        fullName: editFullName,
        currentPassword: currentPassword,
        newPassword: newPassword
      });
      if (res.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showAlert('success', t.accountUpdatedSuccess);
      } else {
        showAlert('error', res.message || t.wrongCurrentPassword);
      }
    } else {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showAlert('success', t.accountUpdatedSuccess);
    }
  };

  // --- 5. BACKUP & RESTORE HANDLERS ---
  const handleExportDb = async () => {
    if (window.electronAPI?.exportDbBackup) {
      try {
        const res = await window.electronAPI.exportDbBackup();
        if (res.success && res.filePath) {
          const date = res.date || new Date().toLocaleString();
          setLastBackupDate(date);
          showAlert('success', `Sauvegarde SQLite exportée : ${res.filePath}`);
          return;
        } else if (res.canceled) {
          return;
        }
      } catch (err: any) {
        console.error(err);
      }
    }
    // Fallback: trigger JSON archive download
    handleExportJson();
  };

  const handleExportJson = async () => {
    let exportData: any = {
      timestamp: new Date().toISOString(),
      storeInfo: storeData,
      users: availableUsers,
      logs: auditLogs
    };

    if (window.electronAPI?.getFullBackupData) {
      const res = await window.electronAPI.getFullBackupData();
      if (res.success && res.data) {
        exportData = res.data;
      }
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `distribution-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    const now = new Date().toLocaleString();
    setLastBackupDate(now);
    localStorage.setItem('app_last_backup_date', now);
    showAlert('success', t.exportJsonBtn + ' - Téléchargement réussi.');
  };

  const handleImportDb = async () => {
    if (window.electronAPI?.importDbBackup) {
      try {
        const res = await window.electronAPI.importDbBackup();
        if (res.success) {
          showAlert('success', t.restoreSuccess);
          onDataRestored();
          return;
        } else if (res.canceled) {
          return;
        } else {
          showAlert('error', res.message || 'Erreur lors de la restauration');
        }
      } catch (err: any) {
        showAlert('error', err.message);
      }
    } else {
      showAlert('error', 'Fonctionnalité disponible dans l\'application bureau Electron.');
    }
  };

  const handleFileJsonSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setPendingRestoreData(parsed);
        setShowRestoreConfirm(true);
      } catch (err) {
        showAlert('error', 'Fichier JSON invalide');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const executeRestoreJson = async () => {
    if (!pendingRestoreData) return;
    try {
      if (window.electronAPI?.restoreFullBackupData) {
        await window.electronAPI.restoreFullBackupData(pendingRestoreData);
      }
      setShowRestoreConfirm(false);
      showAlert('success', t.restoreSuccess);
      onDataRestored();
    } catch (e: any) {
      showAlert('error', e.message || 'Erreur lors de la restauration');
    }
  };

  // CSV Exporters
  const downloadCsv = (filename: string, rows: string[][]) => {
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showAlert('success', `${filename} exporté avec succès.`);
  };

  const exportUsersCsv = () => {
    const headers = ['ID', 'Identifiant', 'Nom & Prénom', 'Rôle'];
    const rows = (availableUsers || []).map(u => [u.id, u.username, u.full_name, u.role]);
    downloadCsv(`utilisateurs-${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  };

  const exportLogsCsv = () => {
    const headers = ['ID', 'Utilisateur', 'Action', 'Date & Heure'];
    const rows = (auditLogs || []).map(l => [l.id, l.user, l.action, l.timestamp]);
    downloadCsv(`audit-logs-${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', direction: currentLang === 'ar' ? 'rtl' : 'ltr' }}>
      {/* Top Banner Alert */}
      {alert && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          background: alert.type === 'success' ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${alert.type === 'success' ? '#86efac' : '#fca5a5'}`,
          color: alert.type === 'success' ? '#15803d' : '#b91c1c',
          fontWeight: 600,
          fontSize: '13px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
          animation: 'fadeIn 0.2s ease'
        }}>
          {alert.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Settings Navigation Tabs Bar */}
      <div className="clean-card" style={{ padding: '6px', marginBottom: '24px', display: 'flex', gap: '6px', flexWrap: 'wrap', background: '#ffffff' }}>
        <button
          type="button"
          onClick={() => setSubTab('language')}
          style={{
            flex: '1 1 180px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            background: subTab === 'language' ? '#16a34a' : 'transparent',
            color: subTab === 'language' ? '#ffffff' : '#475569'
          }}
        >
          <Globe size={16} />
          <span>{t.tabLanguage}</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('printer')}
          style={{
            flex: '1 1 180px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            background: subTab === 'printer' ? '#16a34a' : 'transparent',
            color: subTab === 'printer' ? '#ffffff' : '#475569'
          }}
        >
          <Printer size={16} />
          <span>{t.tabPrinter}</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('store')}
          style={{
            flex: '1 1 180px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            background: subTab === 'store' ? '#16a34a' : 'transparent',
            color: subTab === 'store' ? '#ffffff' : '#475569'
          }}
        >
          <Store size={16} />
          <span>{t.tabStore}</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('account')}
          style={{
            flex: '1 1 180px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            background: subTab === 'account' ? '#16a34a' : 'transparent',
            color: subTab === 'account' ? '#ffffff' : '#475569'
          }}
        >
          <UserCheck size={16} />
          <span>{t.tabAccount}</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('backup')}
          style={{
            flex: '1 1 180px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            background: subTab === 'backup' ? '#16a34a' : 'transparent',
            color: subTab === 'backup' ? '#ffffff' : '#475569'
          }}
        >
          <HardDrive size={16} />
          <span>{t.tabBackup}</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('licence')}
          style={{
            flex: '1 1 180px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            background: subTab === 'licence' ? '#16a34a' : 'transparent',
            color: subTab === 'licence' ? '#ffffff' : '#475569'
          }}
        >
          <Shield size={16} />
          <span>Licence & Activation</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. LANGUAGE SETTINGS TAB */}
      {/* ========================================================================= */}
      {subTab === 'language' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="clean-card" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe color="#16a34a" size={20} />
                {t.languageHeading}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                {t.languageSubheading}
              </p>
            </div>

            {/* Language Selection Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '28px' }}>
              {/* French */}
              <div 
                onClick={() => handleSelectLanguage('fr')}
                style={{
                  border: currentLang === 'fr' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                  background: currentLang === 'fr' ? '#f0fdf4' : '#ffffff',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                  boxShadow: currentLang === 'fr' ? '0 4px 12px rgba(22, 163, 74, 0.12)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '28px' }}>🇫🇷</span>
                  {currentLang === 'fr' && (
                    <span style={{ background: '#16a34a', color: '#ffffff', borderRadius: '50%', padding: '3px', display: 'flex' }}>
                      <Check size={14} />
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>Français</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Français (France / Europe)</div>
              </div>

              {/* English */}
              <div 
                onClick={() => handleSelectLanguage('en')}
                style={{
                  border: currentLang === 'en' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                  background: currentLang === 'en' ? '#f0fdf4' : '#ffffff',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                  boxShadow: currentLang === 'en' ? '0 4px 12px rgba(22, 163, 74, 0.12)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '28px' }}>🇬🇧</span>
                  {currentLang === 'en' && (
                    <span style={{ background: '#16a34a', color: '#ffffff', borderRadius: '50%', padding: '3px', display: 'flex' }}>
                      <Check size={14} />
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>English</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>English (International)</div>
              </div>

              {/* Arabic */}
              <div 
                onClick={() => handleSelectLanguage('ar')}
                style={{
                  border: currentLang === 'ar' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                  background: currentLang === 'ar' ? '#f0fdf4' : '#ffffff',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                  boxShadow: currentLang === 'ar' ? '0 4px 12px rgba(22, 163, 74, 0.12)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '28px' }}>🇲🇦</span>
                  {currentLang === 'ar' && (
                    <span style={{ background: '#16a34a', color: '#ffffff', borderRadius: '50%', padding: '3px', display: 'flex' }}>
                      <Check size={14} />
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>العربية</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>العربية (الشرق الأوسط والمغرب العربي)</div>
              </div>
            </div>

            {/* Live Regional Preview Card */}
          
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PRINTER SETTINGS TAB */}
      {/* ========================================================================= */}
      {subTab === 'printer' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="clean-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Printer color="#16a34a" size={20} />
                  {t.printerHeading}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  {t.printerSubheading}
                </p>
              </div>
              <button 
                type="button" 
                onClick={handleDetectPrinters} 
                className="btn-secondary"
                style={{ fontSize: '12px' }}
              >
                <RefreshCw size={14} />
                {t.detectPrintersBtn}
              </button>
            </div>

            {/* Select Printers Form */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {/* Receipt Printer */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  🧾 {t.receiptPrinter}
                </label>
                <select 
                  className="input-clean"
                  value={selectedReceiptPrinter}
                  onChange={e => setSelectedReceiptPrinter(e.target.value)}
                >
                  {printersList.map((p, idx) => (
                    <option key={idx} value={p.name}>{p.name} {p.isDefault ? '(Par défaut)' : ''}</option>
                  ))}
                </select>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                  {t.thermalPaperDesc}
                </div>
              </div>

              {/* Invoice Printer */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  📄 {t.invoicePrinter}
                </label>
                <select 
                  className="input-clean"
                  value={selectedInvoicePrinter}
                  onChange={e => setSelectedInvoicePrinter(e.target.value)}
                >
                  {printersList.map((p, idx) => (
                    <option key={idx} value={p.name}>{p.name} {p.isDefault ? '(Par défaut)' : ''}</option>
                  ))}
                </select>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                  {t.laserPaperDesc}
                </div>
              </div>

              {/* Barcode Printer */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  🏷️ {t.barcodePrinter}
                </label>
                <select 
                  className="input-clean"
                  value={selectedBarcodePrinter}
                  onChange={e => setSelectedBarcodePrinter(e.target.value)}
                >
                  {printersList.map((p, idx) => (
                    <option key={idx} value={p.name}>{p.name}</option>
                  ))}
                </select>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                  Format standard étiquettes adhésives pour colis et palettes.
                </div>
              </div>
            </div>

            {/* Hardware & Format Options */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
                Paramètres d'Impression & Matériel
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    {t.paperSize}
                  </label>
                  <select className="input-clean" value={paperWidth} onChange={e => setPaperWidth(e.target.value)}>
                    <option value="80mm">80 mm (Standard POS)</option>
                    <option value="58mm">58 mm (Compact Portable)</option>
                    <option value="A4">A4 (Page Entière 210x297mm)</option>
                    <option value="A5">A5 (Demi-Page 148x210mm)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    {t.numberOfCopies}
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    max="5" 
                    className="input-clean" 
                    value={copies} 
                    onChange={e => setCopies(Number(e.target.value))} 
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                    <input 
                      type="checkbox" 
                      checked={autoCut} 
                      onChange={e => setAutoCut(e.target.checked)} 
                      style={{ accentColor: '#16a34a', width: '16px', height: '16px' }}
                    />
                    {t.autoCutPaper}
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                    <input 
                      type="checkbox" 
                      checked={cashDrawer} 
                      onChange={e => setCashDrawer(e.target.checked)} 
                      style={{ accentColor: '#16a34a', width: '16px', height: '16px' }}
                    />
                    {t.cashDrawer}
                  </label>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <button 
                type="button" 
                onClick={handleTestPrint} 
                className="btn-secondary"
                style={{ background: '#f0fdf4', borderColor: '#86efac', color: '#15803d' }}
              >
                <Printer size={15} />
                {t.testPrintBtn}
              </button>

              <button 
                type="button" 
                onClick={handleSavePrinters} 
                className="btn-green"
              >
                <Save size={15} />
                {t.save}
              </button>
            </div>
          </div>

          {/* Test Receipt Simulation Box */}
          {showTestTicket && (
            <div className="clean-card" style={{ padding: '20px', maxWidth: '380px', margin: '0 auto', background: '#fff', border: '1px dashed #94a3b8', fontFamily: 'monospace' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '10px', marginBottom: '10px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{storeData.name.toUpperCase()}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{storeData.tagline}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{storeData.address}, {storeData.city}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Tél: {storeData.phone}</div>
              </div>

              <div style={{ fontSize: '11px', marginBottom: '10px' }}>
                <div>Date: {new Date().toLocaleString()}</div>
                <div>Imprimante: {selectedReceiptPrinter}</div>
                <div>Format: {paperWidth} (Coupure: {autoCut ? 'OUI' : 'NON'})</div>
                <div>Test ID: TST-{Math.floor(1000 + Math.random() * 9000)}</div>
              </div>

              <div style={{ borderTop: '1px dashed #cbd5e1', borderBottom: '1px dashed #cbd5e1', padding: '8px 0', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Article Test Standard</span>
                  <span>1 x 150.00 {storeData.currency}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '4px' }}>
                  <span>TOTAL TEST:</span>
                  <span>150.00 {storeData.currency}</span>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '10px', color: '#475569' }}>
                <div>*** TEST D'IMPRESSION RÉUSSI ***</div>
                <div>{storeData.footerNote}</div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowTestTicket(false)} 
                  style={{ background: '#f1f5f9', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                >
                  {t.close}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. STORE INFO TAB */}
      {/* ========================================================================= */}
      {subTab === 'store' && (
        <form onSubmit={handleSaveStoreInfo} className="clean-card" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Store color="#16a34a" size={20} />
              {t.storeHeading}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              {t.storeSubheading}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {/* Store Name */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                {t.storeName} *
              </label>
              <input 
                type="text" 
                required 
                className="input-clean" 
                value={storeData.name} 
                onChange={e => setStoreData({ ...storeData, name: e.target.value })} 
              />
            </div>

            {/* Tagline */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                {t.storeTagline}
              </label>
              <input 
                type="text" 
                className="input-clean" 
                value={storeData.tagline} 
                onChange={e => setStoreData({ ...storeData, tagline: e.target.value })} 
              />
            </div>

            {/* Currency Symbol */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                {t.defaultCurrency} *
              </label>
              <select 
                className="input-clean" 
                value={storeData.currency} 
                onChange={e => setStoreData({ ...storeData, currency: e.target.value })}
              >
                <option value="€">EUR (€) - Euro</option>
                <option value="DH">MAD (DH) - Dirham Marocain</option>
                <option value="$">USD ($) - Dollar US</option>
                <option value="£">GBP (£) - Livre Sterling</option>
                <option value="DA">DZD (DA) - Dinar Algérien</option>
                <option value="DT">TND (DT) - Dinar Tunisien</option>
                <option value="CFA">XOF (CFA) - Franc CFA</option>
              </select>
            </div>
          </div>

          {/* Legal IDs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                {t.commercialRegister}
              </label>
              <input 
                type="text" 
                className="input-clean" 
                placeholder="Ex: RC 489201 Paris" 
                value={storeData.rc} 
                onChange={e => setStoreData({ ...storeData, rc: e.target.value })} 
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                {t.taxIdentification}
              </label>
              <input 
                type="text" 
                className="input-clean" 
                placeholder="Ex: FR 89 423 889 123 - ICE 002394857000084" 
                value={storeData.taxId} 
                onChange={e => setStoreData({ ...storeData, taxId: e.target.value })} 
              />
            </div>
          </div>

          {/* Address Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                {t.address}
              </label>
              <input 
                type="text" 
                className="input-clean" 
                value={storeData.address} 
                onChange={e => setStoreData({ ...storeData, address: e.target.value })} 
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                {t.city}
              </label>
              <input 
                type="text" 
                className="input-clean" 
                value={storeData.city} 
                onChange={e => setStoreData({ ...storeData, city: e.target.value })} 
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                {t.postalCode}
              </label>
              <input 
                type="text" 
                className="input-clean" 
                value={storeData.postalCode} 
                onChange={e => setStoreData({ ...storeData, postalCode: e.target.value })} 
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                {t.country}
              </label>
              <input 
                type="text" 
                className="input-clean" 
                value={storeData.country} 
                onChange={e => setStoreData({ ...storeData, country: e.target.value })} 
              />
            </div>
          </div>

          {/* Contact Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                {t.phone}
              </label>
              <input 
                type="text" 
                className="input-clean" 
                value={storeData.phone} 
                onChange={e => setStoreData({ ...storeData, phone: e.target.value })} 
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                {t.phoneAlt}
              </label>
              <input 
                type="text" 
                className="input-clean" 
                value={storeData.phoneAlt} 
                onChange={e => setStoreData({ ...storeData, phoneAlt: e.target.value })} 
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                {t.email}
              </label>
              <input 
                type="email" 
                className="input-clean" 
                value={storeData.email} 
                onChange={e => setStoreData({ ...storeData, email: e.target.value })} 
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                {t.website}
              </label>
              <input 
                type="text" 
                className="input-clean" 
                value={storeData.website} 
                onChange={e => setStoreData({ ...storeData, website: e.target.value })} 
              />
            </div>
          </div>

          {/* Footer Note */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
              {t.invoiceFooterNote}
            </label>
            <textarea 
              rows={2}
              className="input-clean"
              value={storeData.footerNote}
              onChange={e => setStoreData({ ...storeData, footerNote: e.target.value })}
            />
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-green">
              <Save size={16} />
              {t.saveStoreBtn}
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* 4. ACCOUNT MANAGING TAB */}
      {/* ========================================================================= */}
      {subTab === 'account' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* User Profile Card */}
          <div className="clean-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '50%', 
                background: '#16a34a', 
                color: '#ffffff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '24px', 
                fontWeight: 800 
              }}>
                {currentUser?.username ? currentUser.username[0].toUpperCase() : 'U'}
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  {currentUser?.full_name || 'Utilisateur'}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>@{currentUser?.username}</span>
                  <span className="badge-clean badge-green" style={{ textTransform: 'uppercase' }}>
                    {currentUser?.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Edit Profile Form */}
            <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', alignItems: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '18px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  {t.fullName}
                </label>
                <input 
                  type="text" 
                  required 
                  className="input-clean" 
                  value={editFullName} 
                  onChange={e => setEditFullName(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  {t.username}
                </label>
                <input 
                  type="text" 
                  disabled 
                  className="input-clean" 
                  value={currentUser?.username || ''} 
                  style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                />
              </div>

              <div>
                <button type="submit" className="btn-green" style={{ width: '100%', justifyContent: 'center' }}>
                  <Save size={15} />
                  {t.updateProfileBtn}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="clean-card" style={{ padding: '24px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={17} color="#16a34a" />
              {t.changePasswordTitle}
            </h4>

            <form onSubmit={handleChangePassword} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  {t.currentPassword}
                </label>
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••" 
                  className="input-clean" 
                  value={currentPassword} 
                  onChange={e => setCurrentPassword(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  {t.newPassword}
                </label>
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••" 
                  className="input-clean" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  {t.confirmPassword}
                </label>
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••" 
                  className="input-clean" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                />
              </div>

              <div>
                <button type="submit" className="btn-green" style={{ width: '100%', justifyContent: 'center' }}>
                  <Key size={15} />
                  {t.updatePasswordBtn}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Switch User & Role Management */}
          <div className="clean-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={17} color="#16a34a" />
                {t.switchAccountTitle}
              </h4>
              {currentUser?.role === 'admin' && onOpenRoleModal && (
                <button 
                  type="button" 
                  onClick={() => onOpenRoleModal(null)} 
                  className="btn-green"
                  style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <UserCheck size={14} /> Gérer Rôles & Permissions
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {availableUsers.map(user => {
                const isCurrent = user.username === currentUser?.username;
                const summary = getPermissionSummary(user);

                return (
                  <div 
                    key={user.id} 
                    style={{
                      border: isCurrent ? '2px solid #16a34a' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      background: isCurrent ? '#f0fdf4' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{user.full_name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>@{user.username} • {user.role}</div>
                      <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
                        {summary.label}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {currentUser?.role === 'admin' && onOpenRoleModal && (
                        <button 
                          type="button" 
                          onClick={() => onOpenRoleModal(user)} 
                          className="btn-secondary"
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                          title="Modifier les permissions par cases à cocher"
                        >
                          Permissions
                        </button>
                      )}
                      {isCurrent ? (
                        <span className="badge-clean badge-green">Actif</span>
                      ) : (
                        <button 
                          type="button" 
                          onClick={() => onSwitchUser(user)} 
                          className="btn-secondary"
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                        >
                          Basculer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Security & Audit Logs */}
          <div className="clean-card" style={{ padding: '24px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={17} color="#16a34a" />
              {t.securityLogsTitle}
            </h4>

            {auditLogs.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>
                {t.noSecurityLogs}
              </p>
            ) : (
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <table className="table-clean">
                  <thead>
                    <tr>
                      <th>{t.timeCol}</th>
                      <th>{t.userCol}</th>
                      <th>{t.actionCol}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, idx) => (
                      <tr key={idx}>
                        <td style={{ fontSize: '12px', color: '#64748b' }}>{log.timestamp}</td>
                        <td style={{ fontWeight: 600 }}>{log.user}</td>
                        <td>{log.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. BACKUP & RESTORE TAB */}
      {/* ========================================================================= */}
      {subTab === 'backup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Database Health Card */}
          <div className="clean-card" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HardDrive color="#16a34a" size={20} />
                {t.backupHeading}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                {t.backupSubheading}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{t.dbType}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>SQLite 3 (WAL Mode)</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Fichier Local</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a', marginTop: '4px' }}>distribution.db</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{t.lastBackupDate}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{lastBackupDate || t.neverBackedUp}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Total Enregistrements</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                  {(availableUsers || []).length} utilisateur(s) • {(auditLogs || []).length} journal(aux)
                </div>
              </div>
            </div>

            {/* Backup Actions */}
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
              {t.exportBackupSection}
            </h4>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
              <button 
                type="button" 
                onClick={handleExportDb} 
                className="btn-green"
              >
                <Download size={16} />
                {t.exportDbBtn}
              </button>

              <button 
                type="button" 
                onClick={handleExportJson} 
                className="btn-secondary"
                style={{ background: '#f0fdf4', borderColor: '#86efac', color: '#15803d' }}
              >
                <FileText size={16} />
                {t.exportJsonBtn}
              </button>
            </div>

            {/* Export CSV Section */}
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '18px' }}>
              {t.exportCsvSection}
            </h4>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
              <button type="button" onClick={exportUsersCsv} className="btn-secondary">
                <FileSpreadsheet size={15} color="#16a34a" />
                Exporter Utilisateurs (CSV)
              </button>
              <button type="button" onClick={exportLogsCsv} className="btn-secondary">
                <FileSpreadsheet size={15} color="#16a34a" />
                Exporter Journaux d'Audit (CSV)
              </button>
            </div>

            {/* Restore Section */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '18px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#b91c1c', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} color="#dc2626" />
                {t.restoreSection}
              </h4>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
                {t.restoreWarning}
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  onClick={handleImportDb} 
                  className="btn-danger"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Upload size={15} />
                  {t.importDbBtn}
                </button>

                <label 
                  className="btn-secondary" 
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Upload size={15} />
                  {t.importJsonBtn}
                  <input 
                    type="file" 
                    accept=".json" 
                    style={{ display: 'none' }} 
                    onChange={handleFileJsonSelected} 
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. LICENCE & ACTIVATION TAB () */}
      {/* ========================================================================= */}
      {subTab === 'licence' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="clean-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
              
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  Gestion de votre clé de licence, état d'activation et informations de sécurité.
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenActivationModal}
                className="btn-green"
                style={{ padding: '9px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Key size={15} />
                <span>Modifier / Renouveler la Clé</span>
              </button>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                    Statut de la licence
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: activationInfo?.activated ? '#dcfce7' : '#fee2e2',
                      color: activationInfo?.activated ? '#15803d' : '#b91c1c'
                    }}>
                      <CheckCircle2 size={13} />
                      {activationInfo?.activated ? 'Activé & Authentifié' : 'Non Activé'}
                    </span>
                  </div>
                </div>

               

               

                
               
              </div>
            </div>

           
          </div>
        </div>
      )}

      {/* Confirmation Modal for Restore */}
      {showRestoreConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div className="clean-card" style={{ width: '100%', maxWidth: '440px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#b91c1c', marginBottom: '12px' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Confirmer la Restauration</h3>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, marginBottom: '20px' }}>
              Êtes-vous absolument certain de vouloir restaurer ces données ? Toutes les modifications actuelles non sauvegardées seront remplacées par le contenu du fichier sélectionné.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => { setShowRestoreConfirm(false); setPendingRestoreData(null); }} 
                className="btn-secondary"
              >
                {t.cancel}
              </button>
              <button 
                type="button" 
                onClick={executeRestoreJson} 
                className="btn-danger"
                style={{ background: '#dc2626', color: '#fff', border: 'none' }}
              >
                Confirmer & Restaurer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
