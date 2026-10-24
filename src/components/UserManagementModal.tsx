import React, { useState, useEffect } from 'react';
import {
  X, UserCheck, Shield, Check, Plus, Edit2, Trash2, 
  RefreshCw, AlertTriangle, CheckCircle2,
  BarChart2, ShoppingCart, Clock, Package, CreditCard,
  Truck, Landmark, Users, Settings, Sparkles, ChevronDown, ChevronRight,
  Globe
} from 'lucide-react';
import {
  PERMISSION_MODULES,
  ROLE_PRESETS,
  ALL_PERMISSIONS,
  getPermissionSummary,
  getModuleLabel,
  getModuleDescription,
  getPermissionLabel,
  getPermissionDescription,
  getPresetName,
  normalizePermissions
} from '../permissions';
import type { Language } from '../i18n';

interface UserItem {
  id: number;
  username: string;
  full_name: string;
  role: string;
  permissions?: string[] | string;
  phone?: string;
  department?: string;
  position?: string;
  created_at?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  currentLang: Language;
  onUsersUpdated?: () => void;
  initialEditUser?: UserItem | null;
}

// Simple, clear dictionary in FR, EN, AR
const UI_TEXT = {
  fr: {
    title: 'Gestion des Utilisateurs & Droits',
    subtitleList: 'Gérez vos employés et cochez les fonctionnalités autorisées pour chacun',
    subtitleEdit: (name: string) => `Modifier les autorisations de "${name}"`,
    subtitleCreate: 'Créer un nouvel utilisateur et choisir ses fonctionnalités',
    backToList: 'Retour à la liste',
    newUserBtn: 'Nouvel Utilisateur',
    loadingUsers: 'Chargement des utilisateurs...',
    noUsers: 'Aucun travailleur enregistré.',
    youBadge: 'Vous',
    allowedResponsibilities: 'Fonctionnalités autorisées :',
    editPermissionsBtn: 'Modifier les autorisations',
    deleteUserBtn: 'Supprimer',
    deleteConfirm: (name: string) => `Voulez-vous vraiment supprimer l'utilisateur "${name}" ?`,
    
    // Editor Section 1
    section1Title: '1. Informations du Compte',
    fullNameLabel: 'Nom & Prénom *',
    fullNamePlaceholder: 'Ex: Ahmed Benali',
    usernameLabel: 'Identifiant de connexion *',
    usernamePlaceholder: 'Ex: ahmed.caisse',
    passwordLabelNew: 'Mot de passe *',
    passwordLabelEdit: 'Nouveau mot de passe (laisser vide si inchangé)',
    passwordPlaceholderNew: 'Mot de passe initial',
    passwordPlaceholderEdit: '••••••••',
    roleLabel: 'Modèle de rôle / Préréglage',
    phoneLabel: 'Téléphone (optionnel)',
    phonePlaceholder: 'Ex: 06 12 34 56 78',
    departmentLabel: 'Département / Service (optionnel)',
    departmentPlaceholder: 'Ex: Vente au comptoir',
    positionLabel: 'Poste / Travail (optionnel)',
    positionPlaceholder: 'Ex: Caissier principal',
    
    // Editor Section 2
    section2Title: '2. Choisir les Autorisations (Cases à cocher)',
    section2Subtitle: 'Cochez chaque action que cet employé a le droit de faire',
    checkAll: 'Tout cocher',
    uncheckAll: 'Tout décocher',
    adminShieldTitle: 'Accès Total Administrateur',
    adminShieldDesc: 'L\'administrateur a automatiquement tous les droits sur tout le logiciel sans exception. Toutes les cases sont activées.',
    presetsTitle: 'Modèles prêts en 1 clic :',
    selectedOfTotal: (count: number, total: number) => `${count} sur ${total} fonctionnalités sélectionnées`,
    selectAllInModule: 'Tout le module',
    cancel: 'Annuler',
    saveChanges: 'Enregistrer les autorisations',
    createAccount: 'Créer l\'utilisateur',
    
    // Alerts
    errNameUsername: 'Le nom complet et l\'identifiant sont obligatoires.',
    errPasswordRequired: 'Le mot de passe est obligatoire pour un nouveau compte.',
    userUpdated: (name: string) => `Utilisateur "${name}" mis à jour avec succès.`,
    userCreated: (name: string) => `Utilisateur "${name}" créé avec succès.`,
    userDeleted: 'Utilisateur supprimé avec succès.',
    genericError: 'Une erreur est survenue.'
  },
  en: {
    title: 'Users & Permissions Manager',
    subtitleList: 'Manage staff accounts and check allowed features for each worker',
    subtitleEdit: (name: string) => `Edit permissions for "${name}"`,
    subtitleCreate: 'Create a new user and select allowed features',
    backToList: 'Back to list',
    newUserBtn: 'New Worker',
    loadingUsers: 'Loading users...',
    noUsers: 'No workers registered yet.',
    youBadge: 'You',
    allowedResponsibilities: 'Allowed features:',
    editPermissionsBtn: 'Edit Permissions',
    deleteUserBtn: 'Delete',
    deleteConfirm: (name: string) => `Are you sure you want to delete user "${name}"?`,
    
    // Editor Section 1
    section1Title: '1. Account Information',
    fullNameLabel: 'Full Name *',
    fullNamePlaceholder: 'E.g., John Smith',
    usernameLabel: 'Login Username *',
    usernamePlaceholder: 'E.g., john.cashier',
    passwordLabelNew: 'Password *',
    passwordLabelEdit: 'New password (leave empty to keep current)',
    passwordPlaceholderNew: 'Initial password',
    passwordPlaceholderEdit: '••••••••',
    roleLabel: 'Role Template / Preset',
    phoneLabel: 'Phone (optional)',
    phonePlaceholder: 'E.g., +1 555-0199',
    departmentLabel: 'Department (optional)',
    departmentPlaceholder: 'E.g., Store Counter',
    positionLabel: 'Job Position (optional)',
    positionPlaceholder: 'E.g., Lead Cashier',
    
    // Editor Section 2
    section2Title: '2. Choose Permissions (Checkboxes)',
    section2Subtitle: 'Check each action this worker is allowed to do',
    checkAll: 'Check all',
    uncheckAll: 'Uncheck all',
    adminShieldTitle: 'Full Administrator Access',
    adminShieldDesc: 'The Administrator automatically has all permissions without restriction. All checkboxes are enabled.',
    presetsTitle: '1-Click quick templates:',
    selectedOfTotal: (count: number, total: number) => `${count} of ${total} features selected`,
    selectAllInModule: 'Whole section',
    cancel: 'Cancel',
    saveChanges: 'Save Permissions',
    createAccount: 'Create User',
    
    // Alerts
    errNameUsername: 'Full name and username are required.',
    errPasswordRequired: 'Password is required for a new account.',
    userUpdated: (name: string) => `User "${name}" updated successfully.`,
    userCreated: (name: string) => `User "${name}" created successfully.`,
    userDeleted: 'User deleted successfully.',
    genericError: 'An error occurred.'
  },
  ar: {
    title: 'إدارة المستخدمين والصلاحيات',
    subtitleList: 'إدارة حسابات العمال وتحديد الصلاحيات المسموح بها لكل عامل',
    subtitleEdit: (name: string) => `تعديل صلاحيات "${name}"`,
    subtitleCreate: 'إنشاء حساب جديد وتحديد الصلاحيات المسموح بها',
    backToList: 'العودة للقائمة',
    newUserBtn: 'إضافة عامل جديد',
    loadingUsers: 'جاري تحميل المستخدمين...',
    noUsers: 'لا يوجد أي عمال مسجلين حالياً.',
    youBadge: 'أنت',
    allowedResponsibilities: 'الصلاحيات الممنوحة :',
    editPermissionsBtn: 'تعديل الصلاحيات',
    deleteUserBtn: 'حذف',
    deleteConfirm: (name: string) => `هل أنت متأكد من رغبتك في حذف المستخدم "${name}"؟`,
    
    // Editor Section 1
    section1Title: '1. معلومات الحساب الشخصي',
    fullNameLabel: 'الاسم الكامل *',
    fullNamePlaceholder: 'مثال: أحمد بن علي',
    usernameLabel: 'اسم الدخول (المستخدم) *',
    usernamePlaceholder: 'مثال: ahmed.pos',
    passwordLabelNew: 'كلمة المرور *',
    passwordLabelEdit: 'كلمة مرور جديدة (اتركها فارغة للاحتفاظ بالحالية)',
    passwordPlaceholderNew: 'كلمة المرور الأولية',
    passwordPlaceholderEdit: '••••••••',
    roleLabel: 'المهنة / النموذج الجاهز',
    phoneLabel: 'رقم الهاتف (اختياري)',
    phonePlaceholder: 'مثال: 0612345678',
    departmentLabel: 'القسم / المصلحة (اختياري)',
    departmentPlaceholder: 'مثال: المبيعات بالصندوق',
    positionLabel: 'الوظيفة (اختياري)',
    positionPlaceholder: 'مثال: بائع رئيسي',
    
    // Editor Section 2
    section2Title: '2. تحديد الصلاحيات (بوضع علامة صح)',
    section2Subtitle: 'ضع علامة على كل وظيفة مسموح لهذا العامل باستخدامها',
    checkAll: 'تحديد الكل',
    uncheckAll: 'إلغاء تحديد الكل',
    adminShieldTitle: 'صلاحيات المدير الكاملة',
    adminShieldDesc: 'يتمتع المدير بكافة الصلاحيات تلقائياً وبدون أي قيود. جميع الخانات مفعلة بالكامل.',
    presetsTitle: 'نماذج جاهزة بنقرة واحدة :',
    selectedOfTotal: (count: number, total: number) => `${count} من أصل ${total} خاصية محددة`,
    selectAllInModule: 'القسم بالكامل',
    cancel: 'إلغاء',
    saveChanges: 'حفظ الصلاحيات',
    createAccount: 'إنشاء الحساب',
    
    // Alerts
    errNameUsername: 'الاسم الكامل واسم الدخول مطلوبان.',
    errPasswordRequired: 'كلمة المرور مطلوبة لإنشاء الحساب الجديد.',
    userUpdated: (name: string) => `تم تحديث المستخدم "${name}" بنجاح.`,
    userCreated: (name: string) => `تم إنشاء المستخدم "${name}" بنجاح.`,
    userDeleted: 'تم حذف المستخدم بنجاح.',
    genericError: 'حدث خطأ أثناء تنفيذ العملية.'
  }
};

export default function UserManagementModal({
  isOpen,
  onClose,
  currentUser,
  currentLang,
  onUsersUpdated,
  initialEditUser
}: Props) {
  // Modal active language (defaults to currentLang from props)
  const [activeLang, setActiveLang] = useState<Language>(currentLang || 'fr');

  useEffect(() => {
    if (currentLang) setActiveLang(currentLang);
  }, [currentLang]);

  const ui = UI_TEXT[activeLang] || UI_TEXT.fr;

  // Active view: 'list' | 'editor'
  const [activeView, setActiveView] = useState<'list' | 'editor'>('list');

  // Users data from backend
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state for creating or editing user
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'worker',
    phone: '',
    department: '',
    position: ''
  });

  // Selected permissions set (set of permission ids)
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  // Collapsed modules state (expanded by default)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(PERMISSION_MODULES.map(m => m.id))
  );

  const api = window.electronAPI;

  // Load users from backend
  const loadUsers = async () => {
    try {
      setLoading(true);
      if (api?.getUsers) {
        const res: any = await api.getUsers();
        if (Array.isArray(res)) {
          setUsers(res);
        } else if (res && Array.isArray(res.users)) {
          setUsers(res.users);
        }
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      showAlert('error', ui.genericError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      if (initialEditUser) {
        startEditing(initialEditUser);
      } else {
        setActiveView('list');
      }
    }
  }, [isOpen, initialEditUser]);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  // Start creating new user
  const startCreating = () => {
    setEditingUserId(null);
    setFormData({
      username: '',
      password: '',
      full_name: '',
      role: 'caissier',
      phone: '',
      department: '',
      position: ''
    });
    // Default: cashier preset
    const defaultPreset = ROLE_PRESETS.find(p => p.id === 'caissier');
    setSelectedPermissions(new Set(defaultPreset?.permissions || []));
    setActiveView('editor');
  };

  // Start editing existing user
  const startEditing = (user: UserItem) => {
    setEditingUserId(user.id);
    setFormData({
      username: user.username,
      password: '', // Leave blank unless changing
      full_name: user.full_name,
      role: user.role || 'worker',
      phone: user.phone || '',
      department: user.department || '',
      position: user.position || ''
    });

    const perms = normalizePermissions(user.permissions);
    if (user.role === 'admin' || perms.includes('*')) {
      setSelectedPermissions(new Set(ALL_PERMISSIONS));
    } else {
      setSelectedPermissions(new Set(perms));
    }
    setActiveView('editor');
  };

  // Handle Preset Selection
  const applyPreset = (presetId: string) => {
    const preset = ROLE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    setFormData(prev => ({ ...prev, role: preset.id }));

    if (preset.id === 'admin') {
      setSelectedPermissions(new Set(ALL_PERMISSIONS));
    } else {
      setSelectedPermissions(new Set(preset.permissions));
    }
  };

  // Toggle single permission checkbox
  const togglePermission = (permId: string) => {
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  };

  // Toggle all permissions for an entire module
  const toggleModulePermissions = (moduleId: string) => {
    const mod = PERMISSION_MODULES.find(m => m.id === moduleId);
    if (!mod) return;

    const moduleItemIds = mod.items.map(i => i.id);
    const allSelected = moduleItemIds.every(id => selectedPermissions.has(id));

    setSelectedPermissions(prev => {
      const next = new Set(prev);
      if (allSelected) {
        moduleItemIds.forEach(id => next.delete(id));
      } else {
        moduleItemIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Select all or deselect all
  const selectAll = () => setSelectedPermissions(new Set(ALL_PERMISSIONS));
  const deselectAll = () => setSelectedPermissions(new Set());

  // Toggle module card collapse
  const toggleCollapse = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  // Submit User (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.full_name.trim()) {
      showAlert('error', ui.errNameUsername);
      return;
    }

    if (!editingUserId && !formData.password.trim()) {
      showAlert('error', ui.errPasswordRequired);
      return;
    }

    setSaving(true);
    try {
      const permsArray = formData.role === 'admin' ? ['*'] : Array.from(selectedPermissions);

      if (editingUserId) {
        // Update
        if (api?.updateUser) {
          const res = await api.updateUser({
            id: editingUserId,
            username: formData.username,
            full_name: formData.full_name,
            role: formData.role,
            permissions: permsArray,
            password: formData.password || undefined,
            phone: formData.phone,
            department: formData.department,
            position: formData.position
          });

          if (res?.success) {
            showAlert('success', ui.userUpdated(formData.full_name));
            await loadUsers();
            if (onUsersUpdated) onUsersUpdated();
            setActiveView('list');
          } else {
            showAlert('error', res?.message || ui.genericError);
          }
        }
      } else {
        // Create
        if (api?.createUser) {
          const res = await api.createUser({
            username: formData.username,
            password: formData.password,
            full_name: formData.full_name,
            role: formData.role,
            permissions: permsArray,
            phone: formData.phone,
            department: formData.department,
            position: formData.position
          });

          if (res?.success) {
            showAlert('success', ui.userCreated(formData.full_name));
            await loadUsers();
            if (onUsersUpdated) onUsersUpdated();
            setActiveView('list');
          } else {
            showAlert('error', res?.message || ui.genericError);
          }
        }
      }
    } catch (err: any) {
      console.error('Error saving user:', err);
      showAlert('error', err?.message || ui.genericError);
    } finally {
      setSaving(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (user: UserItem) => {
    if (user.role === 'admin') {
      showAlert('error', 'Impossible de supprimer un compte administrateur.');
      return;
    }

    if (!window.confirm(ui.deleteConfirm(user.full_name))) {
      return;
    }

    try {
      if (api?.deleteUser) {
        const res = await api.deleteUser(user.id);
        if (res?.success) {
          showAlert('success', ui.userDeleted);
          await loadUsers();
          if (onUsersUpdated) onUsersUpdated();
        } else {
          showAlert('error', res?.message || ui.genericError);
        }
      }
    } catch (err: any) {
      showAlert('error', err?.message || ui.genericError);
    }
  };

  // Render module icon helper
  const renderModuleIcon = (iconName: string) => {
    const size = 16;
    switch (iconName) {
      case 'BarChart2': return <BarChart2 size={size} />;
      case 'ShoppingCart': return <ShoppingCart size={size} />;
      case 'Clock': return <Clock size={size} />;
      case 'Package': return <Package size={size} />;
      case 'CreditCard': return <CreditCard size={size} />;
      case 'Truck': return <Truck size={size} />;
      case 'Landmark': return <Landmark size={size} />;
      case 'Users': return <Users size={size} />;
      case 'Settings': return <Settings size={size} />;
      case 'UserCheck': return <UserCheck size={size} />;
      default: return <Shield size={size} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
      dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: activeView === 'editor' ? '920px' : '840px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div 
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <UserCheck size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {ui.title}
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                {activeView === 'list' 
                  ? ui.subtitleList 
                  : (editingUserId ? ui.subtitleEdit(formData.full_name) : ui.subtitleCreate)}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Quick Language Selector inside Modal */}
            <div 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                background: '#f1f5f9', 
                padding: '3px', 
                borderRadius: '8px',
                gap: '2px'
              }}
              title="Langue / Language / اللغة"
            >
              <Globe size={13} color="#64748b" style={{ margin: '0 4px' }} />
              {(['fr', 'en', 'ar'] as Language[]).map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveLang(lang)}
                  style={{
                    border: 'none',
                    background: activeLang === lang ? '#ffffff' : 'transparent',
                    color: activeLang === lang ? '#16a34a' : '#64748b',
                    fontWeight: activeLang === lang ? 800 : 600,
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    boxShadow: activeLang === lang ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease',
                    textTransform: 'uppercase'
                  }}
                >
                  {lang === 'ar' ? 'العربية' : lang}
                </button>
              ))}
            </div>

            {activeView === 'editor' && (
              <button 
                type="button" 
                onClick={() => setActiveView('list')}
                className="btn-secondary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                {ui.backToList}
              </button>
            )}
            <button 
              type="button" 
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: '6px', borderRadius: '6px' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Top Alert Toast */}
        {alert && (
          <div 
            style={{
              padding: '10px 24px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: alert.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: alert.type === 'success' ? '#15803d' : '#b91c1c',
              borderBottom: `1px solid ${alert.type === 'success' ? '#bbf7d0' : '#fca5a5'}`
            }}
          >
            {alert.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {alert.message}
          </div>
        )}

        {/* View 1: Users List */}
        {activeView === 'list' && (
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Top action bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                  {users.length} {ui.newUserBtn.toLowerCase()}
                </span>
              </div>
              <button 
                type="button" 
                onClick={startCreating}
                className="btn-green"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> {ui.newUserBtn}
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                {ui.loadingUsers}
              </div>
            ) : users.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                {ui.noUsers}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '14px' }}>
                {users.map(user => {
                  const summary = getPermissionSummary(user, activeLang);
                  const isAdmin = user.role === 'admin';
                  const isSelf = user.id === currentUser?.id;

                  // Find preset matching role for localized name
                  const matchedPreset = ROLE_PRESETS.find(p => p.id === user.role);
                  const displayRoleName = matchedPreset ? getPresetName(matchedPreset, activeLang) : user.role;

                  return (
                    <div 
                      key={user.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Top User Info */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div 
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              background: isAdmin ? '#16a34a' : '#0284c7',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '15px',
                              flexShrink: 0
                            }}
                          >
                            {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                {user.full_name}
                              </h4>
                              {isSelf && (
                                <span style={{ fontSize: '10px', background: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                  {ui.youBadge}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              @{user.username} {user.position ? `• ${user.position}` : ''}
                            </div>
                          </div>
                        </div>

                        {/* Role Badge */}
                        <span 
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: isAdmin ? '#dcfce7' : '#e0f2fe',
                            color: isAdmin ? '#15803d' : '#0369a1'
                          }}
                        >
                          {displayRoleName}
                        </span>
                      </div>

                      {/* Permissions Counter & Progress */}
                      <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 600, color: '#475569' }}>{ui.allowedResponsibilities}</span>
                          <span style={{ fontWeight: 700, color: isAdmin ? '#16a34a' : '#0284c7' }}>
                            {summary.label}
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div 
                            style={{
                              height: '100%',
                              width: `${(summary.count / summary.total) * 100}%`,
                              background: isAdmin ? '#16a34a' : '#0284c7',
                              borderRadius: '3px'
                            }}
                          />
                        </div>
                      </div>

                      {/* Bottom Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                        <button 
                          type="button"
                          onClick={() => startEditing(user)}
                          className="btn-secondary"
                          style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Edit2 size={13} /> {ui.editPermissionsBtn}
                        </button>

                        {!isAdmin && !isSelf && (
                          <button 
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            className="btn-danger"
                            style={{ fontSize: '12px', padding: '6px 10px' }}
                            title={ui.deleteUserBtn}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* View 2: User & Permissions Editor (Checkboxes) */}
        {activeView === 'editor' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Basic Fields */}
              <div className="clean-card" style={{ padding: '16px 20px', background: '#ffffff' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
                  {ui.section1Title}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                      {ui.fullNameLabel}
                    </label>
                    <input 
                      required
                      type="text" 
                      className="input-clean" 
                      placeholder={ui.fullNamePlaceholder}
                      value={formData.full_name}
                      onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                      {ui.usernameLabel}
                    </label>
                    <input 
                      required
                      type="text" 
                      className="input-clean" 
                      placeholder={ui.usernamePlaceholder}
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                      {editingUserId ? ui.passwordLabelEdit : ui.passwordLabelNew}
                    </label>
                    <input 
                      type="password" 
                      className="input-clean" 
                      placeholder={editingUserId ? ui.passwordPlaceholderEdit : ui.passwordPlaceholderNew}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      required={!editingUserId}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                      {ui.roleLabel}
                    </label>
                    <select 
                      className="input-clean"
                      value={formData.role}
                      onChange={e => applyPreset(e.target.value)}
                    >
                      {ROLE_PRESETS.map(preset => (
                        <option key={preset.id} value={preset.id}>
                          {getPresetName(preset, activeLang)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                      {ui.phoneLabel}
                    </label>
                    <input 
                      type="text" 
                      className="input-clean" 
                      placeholder={ui.phonePlaceholder}
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                      {ui.positionLabel}
                    </label>
                    <input 
                      type="text" 
                      className="input-clean" 
                      placeholder={ui.positionPlaceholder}
                      value={formData.position}
                      onChange={e => setFormData({ ...formData, position: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Presets & Checkbox Permissions */}
              <div className="clean-card" style={{ padding: '16px 20px', background: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      {ui.section2Title}
                    </h3>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                      {ui.section2Subtitle}
                    </p>
                  </div>

                  {formData.role !== 'admin' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        type="button" 
                        onClick={selectAll}
                        className="btn-secondary"
                        style={{ fontSize: '11px', padding: '5px 10px' }}
                      >
                        {ui.checkAll}
                      </button>
                      <button 
                        type="button" 
                        onClick={deselectAll}
                        className="btn-secondary"
                        style={{ fontSize: '11px', padding: '5px 10px' }}
                      >
                        {ui.uncheckAll}
                      </button>
                    </div>
                  )}
                </div>

                {/* Admin Notice */}
                {formData.role === 'admin' ? (
                  <div 
                    style={{
                      background: '#dcfce7',
                      border: '1px solid #86efac',
                      borderRadius: '10px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      color: '#15803d'
                    }}
                  >
                    <Shield size={28} color="#16a34a" />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px' }}>
                        {ui.adminShieldTitle}
                      </div>
                      <div style={{ fontSize: '12px', marginTop: '2px', opacity: 0.9 }}>
                        {ui.adminShieldDesc}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Quick Presets Buttons */}
                    <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                        {ui.presetsTitle}
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {ROLE_PRESETS.filter(p => p.id !== 'admin').map(preset => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => applyPreset(preset.id)}
                            style={{
                              background: formData.role === preset.id ? '#16a34a' : '#ffffff',
                              color: formData.role === preset.id ? '#ffffff' : '#334155',
                              border: '1px solid #cbd5e1',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Sparkles size={12} /> {getPresetName(preset, activeLang)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Permissions Modules List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {PERMISSION_MODULES.map(mod => {
                        const isExpanded = expandedModules.has(mod.id);
                        const moduleItemIds = mod.items.map(i => i.id);
                        const selectedInModuleCount = moduleItemIds.filter(id => selectedPermissions.has(id)).length;
                        const isAllSelected = selectedInModuleCount === moduleItemIds.length;
                        const isPartiallySelected = selectedInModuleCount > 0 && !isAllSelected;

                        return (
                          <div 
                            key={mod.id}
                            style={{
                              border: isAllSelected ? '1px solid #86efac' : '1px solid #e2e8f0',
                              borderRadius: '10px',
                              overflow: 'hidden',
                              background: '#ffffff',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {/* Module Header */}
                            <div 
                              style={{
                                padding: '10px 14px',
                                background: isAllSelected ? '#f0fdf4' : '#f8fafc',
                                borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer'
                              }}
                              onClick={() => toggleCollapse(mod.id)}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div 
                                  style={{
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '6px',
                                    background: isAllSelected ? '#dcfce7' : '#e2e8f0',
                                    color: isAllSelected ? '#16a34a' : '#475569',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}
                                >
                                  {renderModuleIcon(mod.iconName)}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                                    {getModuleLabel(mod, activeLang)}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                                    {getModuleDescription(mod, activeLang)}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={e => e.stopPropagation()}>
                                {/* Module Select All Checkbox */}
                                <label 
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    color: isAllSelected ? '#16a34a' : '#64748b'
                                  }}
                                >
                                  <input 
                                    type="checkbox"
                                    checked={isAllSelected}
                                    ref={el => {
                                      if (el) el.indeterminate = isPartiallySelected;
                                    }}
                                    onChange={() => toggleModulePermissions(mod.id)}
                                    style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#16a34a' }}
                                  />
                                  <span>{selectedInModuleCount} / {moduleItemIds.length}</span>
                                </label>

                                <button 
                                  type="button" 
                                  onClick={() => toggleCollapse(mod.id)}
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}
                                >
                                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                              </div>
                            </div>

                            {/* Module Items (Checkboxes) */}
                            {isExpanded && (
                              <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                                {mod.items.map(item => {
                                  const checked = selectedPermissions.has(item.id);

                                  return (
                                    <label
                                      key={item.id}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '10px',
                                        padding: '8px 10px',
                                        borderRadius: '8px',
                                        background: checked ? '#f0fdf4' : '#ffffff',
                                        border: checked ? '1px solid #bbf7d0' : '1px solid #f1f5f9',
                                        cursor: 'pointer',
                                        transition: 'all 0.1s ease'
                                      }}
                                    >
                                      <input 
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => togglePermission(item.id)}
                                        style={{ marginTop: '2px', width: '16px', height: '16px', cursor: 'pointer', accentColor: '#16a34a', flexShrink: 0 }}
                                      />
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: checked ? '#15803d' : '#1e293b' }}>
                                          {getPermissionLabel(item, activeLang)}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px', lineHeight: '1.25' }}>
                                          {getPermissionDescription(item, activeLang)}
                                        </div>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Sticky Save Footer */}
            <div 
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #e2e8f0',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {ui.selectedOfTotal(formData.role === 'admin' ? ALL_PERMISSIONS.length : selectedPermissions.size, ALL_PERMISSIONS.length)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setActiveView('list')} 
                  className="btn-secondary"
                  disabled={saving}
                >
                  {ui.cancel}
                </button>
                <button 
                  type="submit" 
                  className="btn-green"
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {saving ? <RefreshCw className="animate-spin" size={15} /> : <Check size={15} />}
                  {editingUserId ? ui.saveChanges : ui.createAccount}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
