import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Plus, Search, Edit2, Trash2, History,
  CheckCircle2, AlertTriangle,
  X, RefreshCw, Printer, Phone, MapPin,
  ShoppingCart, Check,
  DollarSign, Package, UserCheck, AlertCircle
} from 'lucide-react';
import type { Language, Translations } from '../i18n';
import { translations } from '../i18n';
import { hasPermission } from '../permissions';

export interface Client {
  id: number;
  name: string;
  phone: string;
  address: string;
  notes: string;
  current_debt: number;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
  total_debts_count?: number;
  unpaid_debts_count?: number;
  last_debt_date?: string;
  last_product_name?: string;
  last_product_qty?: number;
  last_product_unit?: string;
  last_product_amount?: number;
}

export interface ClientDebt {
  id: number;
  client_id: number;
  product_id?: number;
  product_name: string;
  unit_name: string;
  quantity: number;
  conversion_factor?: number;
  unit_price: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  date: string;
  caisse_id?: number;
  caisse_transaction_id?: number;
  notes?: string;
  status: 'unpaid' | 'partially_paid' | 'paid';
  created_at?: string;
  client_name?: string;
  client_phone?: string;
}

export interface ClientPayment {
  id: number;
  client_id: number;
  debt_id?: number;
  amount: number;
  payment_method: string;
  caisse_id?: number;
  caisse_transaction_id?: number;
  date: string;
  notes?: string;
  balance_before: number;
  balance_after: number;
  user_name?: string;
  created_at?: string;
  caisse_name?: string;
  client_name?: string;
  client_phone?: string;
}

interface ClientsPageProps {
  currentLang: Language;
  currentUser: any;
  onOpenProductDebtModal?: (productId?: number) => void;
}

export default function ClientsPage({ currentLang, currentUser }: ClientsPageProps) {
  const t: Translations = translations[currentLang] || translations.fr;
  const canEdit = hasPermission(currentUser, 'clients.edit');
  const canDelete = hasPermission(currentUser, 'clients.delete');
  const canAddDebt = hasPermission(currentUser, 'clients.add_debt');
  const canPayDebt = hasPermission(currentUser, 'clients.pay_debt');

  // Active view: clients directory vs debts ledger vs payments ledger
  const [activeView, setActiveView] = useState<'directory' | 'debts_ledger' | 'payments_ledger'>('directory');

  // Main state
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'debt' | 'clear'>('all');
  const [stats, setStats] = useState({
    totalClients: 0,
    totalDebt: 0,
    blockedClientsCount: 0,
    clearClientsCount: 0
  });

  // Supporting state from system (products & caisses)
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [availableCaisses, setAvailableCaisses] = useState<any[]>([]);

  // Notification alert
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Modals state
  const [showAddClientModal, setShowAddClientModal] = useState<boolean>(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  // Give Product / New Debt Modal
  const [showGiveProductModal, setShowGiveProductModal] = useState<boolean>(false);
  const [debtForm, setDebtForm] = useState({
    clientId: '' as number | '',
    newClientName: '',
    newClientPhone: '',
    isCreatingNewClient: false,
    productId: '' as number | '',
    productName: '',
    unitName: 'pièce',
    quantity: 1,
    conversionFactor: 1,
    unitPrice: 0,
    paidAmount: 0,
    caisseId: '' as number | '',
    affectCaisse: true,
    notes: '',
    date: new Date().toISOString().slice(0, 10)
  });

  // Settle Debt Modal
  const [showSettleDebtModal, setShowSettleDebtModal] = useState<boolean>(false);
  const [clientForSettlement, setClientForSettlement] = useState<Client | null>(null);
  const [settlementForm, setSettlementForm] = useState({
    amount: '',
    paymentMethod: 'especes',
    caisseId: '' as number | '',
    affectCaisse: true,
    notes: '',
    date: new Date().toISOString().slice(0, 10)
  });

  // Single Client History & Details Modal
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<Client | null>(null);
  const [clientHistoryDebts, setClientHistoryDebts] = useState<ClientDebt[]>([]);
  const [clientHistoryPayments, setClientHistoryPayments] = useState<ClientPayment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Form for Client creation/edition
  const [clientForm, setClientForm] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
    status: 'active' as 'active' | 'inactive'
  });

  // Format currency in Algerian Dinars (DA)
  const formatCurrency = (val: number | string | undefined | null) => {
    const num = parseFloat(String(val)) || 0;
    return new Intl.NumberFormat('fr-DZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num) + ' DA';
  };

  // Auto-dismiss alert
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Load clients and stats
  const loadClients = async () => {
    setLoading(true);
    try {
      if (window.electronAPI?.getClients) {
        const res = await window.electronAPI.getClients({ search: searchQuery, status: statusFilter });
        if (res.success && Array.isArray(res.clients)) {
          setClients(res.clients);
          if (res.stats) {
            setStats(res.stats);
          }
        } else {
          setAlert({ type: 'error', message: res.message || 'Erreur chargement clients' });
        }
      }
    } catch (err: any) {
      console.error('Error fetching clients:', err);
      setAlert({ type: 'error', message: err.message || 'Erreur connexion SQLite' });
    } finally {
      setLoading(false);
    }
  };

  // Load products and caisses for dropdowns
  const loadSupportingData = async () => {
    try {
      if (window.electronAPI?.getProducts) {
        const pRes = await window.electronAPI.getProducts({ pageSize: 300 });
        if (pRes.success && Array.isArray(pRes.products)) {
          setAvailableProducts(pRes.products);
        }
      }
      if (window.electronAPI?.getCaisses) {
        const cRes = await window.electronAPI.getCaisses({ page: 1, pageSize: 50 });
        if (cRes.success && Array.isArray(cRes.caisses)) {
          setAvailableCaisses(cRes.caisses);
          // Set default caisse in forms
          const defCaisse = cRes.caisses.find((c: any) => c.is_default === 1) || cRes.caisses[0];
          if (defCaisse) {
            setDebtForm(prev => ({ ...prev, caisseId: defCaisse.id }));
            setSettlementForm(prev => ({ ...prev, caisseId: defCaisse.id }));
          }
        }
      }
    } catch (err) {
      console.error('Error loading supporting data:', err);
    }
  };

  useEffect(() => {
    loadClients();
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    loadSupportingData();
  }, []);

  // Filtered clients list for UI
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const debt = parseFloat(String(c.current_debt)) || 0;
      if (statusFilter === 'debt' && debt <= 0) return false;
      if (statusFilter === 'clear' && debt > 0) return false;
      return true;
    });
  }, [clients, statusFilter]);

  // Selected client details in Give Product modal
  const selectedClientForDebtObj = useMemo(() => {
    if (!debtForm.clientId) return null;
    return clients.find(c => c.id === Number(debtForm.clientId)) || null;
  }, [clients, debtForm.clientId]);

  // Check if selected client in modal has outstanding debt
  const hasSelectedClientDebt = useMemo(() => {
    if (!selectedClientForDebtObj) return false;
    return (parseFloat(String(selectedClientForDebtObj.current_debt)) || 0) > 0;
  }, [selectedClientForDebtObj]);

  // Selected caisse in Settle Debt modal
  const selectedSettlementCaisse = useMemo(() => {
    if (!settlementForm.caisseId) return null;
    return availableCaisses.find(c => c.id === Number(settlementForm.caisseId)) || null;
  }, [availableCaisses, settlementForm.caisseId]);

  // Selected product details in Give Product modal
  const selectedProductObj = useMemo(() => {
    if (!debtForm.productId) return null;
    return availableProducts.find(p => p.id === Number(debtForm.productId)) || null;
  }, [availableProducts, debtForm.productId]);

  // Total amount calculation for new debt
  const computedTotalAmount = useMemo(() => {
    return (parseFloat(String(debtForm.quantity)) || 0) * (parseFloat(String(debtForm.unitPrice)) || 0);
  }, [debtForm.quantity, debtForm.unitPrice]);

  const computedRemainingDebt = useMemo(() => {
    const paid = parseFloat(String(debtForm.paidAmount)) || 0;
    return Math.max(0, computedTotalAmount - paid);
  }, [computedTotalAmount, debtForm.paidAmount]);

  // Handle product selection in Give Product modal
  const handleProductSelect = (productId: number) => {
    const prod = availableProducts.find(p => p.id === productId);
    if (!prod) return;

    const defUnit = prod.units && prod.units.length > 0 
      ? (prod.units.find((u: any) => u.is_default === 1) || prod.units[0])
      : null;

    setDebtForm(prev => ({
      ...prev,
      productId,
      productName: prod.name,
      unitName: defUnit ? defUnit.unit_name : (prod.base_unit || 'pièce'),
      conversionFactor: defUnit ? (defUnit.conversion_factor || 1) : 1,
      unitPrice: defUnit ? (defUnit.selling_price || prod.selling_price || 0) : (prod.selling_price || 0),
      quantity: 1,
      paidAmount: 0
    }));
  };

  // Handle unit selection in Give Product modal
  const handleUnitSelect = (unitName: string) => {
    if (!selectedProductObj || !selectedProductObj.units) return;
    const unit = selectedProductObj.units.find((u: any) => u.unit_name === unitName);
    if (unit) {
      setDebtForm(prev => ({
        ...prev,
        unitName: unit.unit_name,
        conversionFactor: unit.conversion_factor || 1,
        unitPrice: unit.selling_price || prev.unitPrice
      }));
    }
  };

  // Open "Give Product on Debt" modal directly for a client
  const handleOpenGiveProduct = (client?: Client) => {
    const defaultCaisse = availableCaisses.find(c => c.is_default === 1) || availableCaisses[0];
    if (client) {
      setDebtForm(prev => ({
        ...prev,
        clientId: client.id,
        caisseId: defaultCaisse ? defaultCaisse.id : '',
        isCreatingNewClient: false
      }));
    } else {
      setDebtForm(prev => ({
        ...prev,
        clientId: '',
        caisseId: defaultCaisse ? defaultCaisse.id : '',
        isCreatingNewClient: false
      }));
    }
    setShowGiveProductModal(true);
  };

  // Open "Settle Debt" modal for a client (pre-selects default caisse)
  const handleOpenSettleDebt = (client: Client) => {
    setClientForSettlement(client);
    const defaultCaisse = availableCaisses.find(c => c.is_default === 1) || availableCaisses[0];
    setSettlementForm(prev => ({
      ...prev,
      amount: String(client.current_debt || 0),
      caisseId: defaultCaisse ? defaultCaisse.id : '',
      affectCaisse: true,
      notes: `Règlement de dette du client ${client.name}`,
      date: new Date().toISOString().slice(0, 10)
    }));
    setShowSettleDebtModal(true);
  };

  // Open Client History Modal
  const handleOpenHistory = async (client: Client) => {
    setSelectedClientForHistory(client);
    setLoadingHistory(true);
    try {
      if (window.electronAPI?.getClientById) {
        const res = await window.electronAPI.getClientById(client.id);
        if (res.success) {
          setClientHistoryDebts(res.debts || []);
          setClientHistoryPayments(res.payments || []);
        } else {
          setAlert({ type: 'error', message: res.message || 'Erreur récupération historique' });
        }
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Erreur historique' });
    } finally {
      setLoadingHistory(false);
    }
  };

  // Submit Give Product / Add Debt (No blocking - owner has full authority)
  const handleSubmitGiveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check client selection
    if (!debtForm.isCreatingNewClient && !debtForm.clientId) {
      setAlert({ type: 'error', message: 'Veuillez sélectionner un client.' });
      return;
    }
    if (debtForm.isCreatingNewClient && !debtForm.newClientName.trim()) {
      setAlert({ type: 'error', message: 'Veuillez saisir le nom du nouveau client.' });
      return;
    }

    // Check product selection
    if (!debtForm.productName && !debtForm.productId) {
      setAlert({ type: 'error', message: 'Veuillez sélectionner ou renseigner un produit.' });
      return;
    }

    if (computedTotalAmount <= 0) {
      setAlert({ type: 'error', message: 'Le montant total doit être supérieur à 0.' });
      return;
    }

    try {
      if (window.electronAPI?.addClientDebt) {
        const res = await window.electronAPI.addClientDebt({
          clientId: debtForm.isCreatingNewClient ? null : Number(debtForm.clientId),
          clientName: debtForm.isCreatingNewClient ? debtForm.newClientName : undefined,
          clientPhone: debtForm.isCreatingNewClient ? debtForm.newClientPhone : undefined,
          productId: debtForm.productId ? Number(debtForm.productId) : null,
          productName: debtForm.productName,
          unitName: debtForm.unitName,
          quantity: debtForm.quantity,
          conversionFactor: debtForm.conversionFactor,
          unitPrice: debtForm.unitPrice,
          totalAmount: computedTotalAmount,
          paidAmount: debtForm.paidAmount,
          caisseId: debtForm.caisseId ? Number(debtForm.caisseId) : null,
          affectCaisse: debtForm.affectCaisse && debtForm.paidAmount > 0,
          date: debtForm.date,
          notes: debtForm.notes,
          userName: currentUser?.full_name || currentUser?.username || 'Admin'
        });

        if (res.success) {
          setAlert({
            type: 'success',
            message: res.message || 'Produit remis et dette enregistrée avec succès.'
          });
          setShowGiveProductModal(false);
          loadClients();
          loadSupportingData(); // refresh product stock
        } else {
          setAlert({
            type: res.isBlocked ? 'warning' : 'error',
            message: res.message || 'Impossible d\'enregistrer la dette.'
          });
        }
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Erreur enregistrement dette' });
    }
  };

  // Submit Settle Debt
  const handleSubmitSettleDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForSettlement) return;

    const amount = parseFloat(settlementForm.amount);
    if (!amount || amount <= 0) {
      setAlert({ type: 'error', message: 'Veuillez saisir un montant de règlement valide.' });
      return;
    }

    try {
      if (window.electronAPI?.payClientDebt) {
        const res = await window.electronAPI.payClientDebt({
          clientId: clientForSettlement.id,
          amount,
          paymentMethod: settlementForm.paymentMethod,
          caisseId: settlementForm.caisseId ? Number(settlementForm.caisseId) : null,
          affectCaisse: settlementForm.affectCaisse,
          date: settlementForm.date,
          notes: settlementForm.notes,
          userName: currentUser?.full_name || currentUser?.username || 'Admin'
        });

        if (res.success) {
          setAlert({
            type: 'success',
            message: res.message || 'Règlement enregistré avec succès.'
          });
          setShowSettleDebtModal(false);
          loadClients();
          if (selectedClientForHistory && selectedClientForHistory.id === clientForSettlement.id) {
            handleOpenHistory(clientForSettlement);
          }
        } else {
          setAlert({ type: 'error', message: res.message || 'Erreur enregistrement règlement' });
        }
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Erreur règlement dette' });
    }
  };

  // Submit Client Create / Edit
  const handleSubmitClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name.trim()) {
      setAlert({ type: 'error', message: 'Le nom du client est obligatoire.' });
      return;
    }

    try {
      if (editingClient) {
        if (window.electronAPI?.updateClient) {
          const res = await window.electronAPI.updateClient({
            id: editingClient.id,
            ...clientForm
          });
          if (res.success) {
            setAlert({ type: 'success', message: 'Client mis à jour avec succès.' });
            setEditingClient(null);
            loadClients();
          } else {
            setAlert({ type: 'error', message: res.message || 'Erreur modification client' });
          }
        }
      } else {
        if (window.electronAPI?.createClient) {
          const res = await window.electronAPI.createClient(clientForm);
          if (res.success) {
            setAlert({ type: 'success', message: 'Nouveau client créé avec succès.' });
            setShowAddClientModal(false);
            setClientForm({ name: '', phone: '', address: '', notes: '', status: 'active' });
            loadClients();
          } else {
            setAlert({ type: 'error', message: res.message || 'Erreur création client' });
          }
        }
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Erreur sauvegarde client' });
    }
  };

  // Delete Client
  const handleDeleteClient = async () => {
    if (!deletingClient) return;
    try {
      if (window.electronAPI?.deleteClient) {
        const res = await window.electronAPI.deleteClient(deletingClient.id);
        if (res.success) {
          setAlert({ type: 'success', message: 'Client supprimé avec succès.' });
          setDeletingClient(null);
          loadClients();
        } else {
          setAlert({ type: 'error', message: res.message || 'Impossible de supprimer ce client.' });
        }
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Erreur suppression client' });
    }
  };

  // Print Debt Statement / Receipt
  const handlePrintStatement = (client: Client, debts: ClientDebt[], payments: ClientPayment[]) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      window.alert('Veuillez autoriser les fenêtres pop-up pour imprimer.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Relevé de Dette - ${client.name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #0f172a; line-height: 1.5; }
          .header { border-bottom: 2px solid #16a34a; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 22px; font-weight: 800; color: #15803d; margin: 0; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          .client-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .badge-debt { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 13px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
          .badge-clear { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 13px; background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
          th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 700; color: #475569; border-bottom: 1px solid #cbd5e1; }
          td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
          .total-box { margin-top: 20px; padding: 14px 18px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; text-align: right; }
          .total-debt { font-size: 20px; font-weight: 800; color: #dc2626; }
          .footer { margin-top: 40px; font-size: 11px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">IMATECHX</h1>
            <div class="subtitle">Logistique & Gestion Commerciale • Relevé de Compte Client</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 12px; font-weight: 600;">Date d'édition :</div>
            <div style="font-size: 13px; font-weight: 700;">${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR').slice(0, 5)}</div>
          </div>
        </div>

        <div class="client-box">
          <div>
            <div style="font-size: 11px; color: #64748b; font-weight: 600;">CLIENT :</div>
            <div style="font-size: 16px; font-weight: 800; color: #0f172a;">${client.name}</div>
            <div style="font-size: 13px; color: #475569;">📞 ${client.phone || 'Non renseigné'}</div>
            <div style="font-size: 12px; color: #64748b;">📍 ${client.address || 'Sans adresse'}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; color: #64748b; font-weight: 600;">SITUATION DU COMPTE :</div>
            <div style="margin-top: 4px;">
              ${(parseFloat(String(client.current_debt)) || 0) > 0 
                ? `<span class="badge-debt">SOLDE DÉBITEUR (${formatCurrency(client.current_debt)})</span>` 
                : `<span class="badge-clear">✓ COMPTE SOLDÉ (À JOUR)</span>`}
            </div>
            <div style="margin-top: 8px; font-size: 12px; color: #64748b;">
              Montant total restant dû :
            </div>
            <div class="total-debt">${formatCurrency(client.current_debt)}</div>
          </div>
        </div>

        <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">
          Historique des Produits Remis à Crédit :
        </h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Produit pris par le client</th>
              <th style="text-align: center;">Quantité</th>
              <th style="text-align: right;">Prix Unitaire</th>
              <th style="text-align: right;">Total</th>
              <th style="text-align: right;">Payé</th>
              <th style="text-align: right;">Reste Dû</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            ${debts.length === 0 ? '<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 20px;">Aucun produit pris en dette</td></tr>' : ''}
            ${debts.map(d => `
              <tr>
                <td>${d.date ? d.date.slice(0, 10) : ''}</td>
                <td style="font-weight: 700;">${d.product_name}</td>
                <td style="text-align: center;">${d.quantity} ${d.unit_name || ''}</td>
                <td style="text-align: right;">${formatCurrency(d.unit_price)}</td>
                <td style="text-align: right; font-weight: 600;">${formatCurrency(d.total_amount)}</td>
                <td style="text-align: right; color: #16a34a;">${formatCurrency(d.paid_amount)}</td>
                <td style="text-align: right; font-weight: 800; color: ${d.remaining_amount > 0 ? '#dc2626' : '#16a34a'};">${formatCurrency(d.remaining_amount)}</td>
                <td>
                  ${d.remaining_amount <= 0 
                    ? '<span style="color: #16a34a; font-weight: 700;">Soldé</span>' 
                    : '<span style="color: #b45309; font-weight: 700;">En cours</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${payments.length > 0 ? `
          <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">
            Historique des Règlements Effectués & Caisse Dépositaire :
          </h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Mode</th>
                <th>Caisse Dépositaire</th>
                <th style="text-align: right;">Montant Versé</th>
                <th style="text-align: right;">Solde Avant</th>
                <th style="text-align: right;">Solde Après</th>
                <th>Remarques</th>
              </tr>
            </thead>
            <tbody>
              ${payments.map(p => `
                <tr>
                  <td>${p.date ? p.date.slice(0, 10) : ''}</td>
                  <td>${p.payment_method || 'Espèces'}</td>
                  <td><strong style="color: #15803d;">${p.caisse_name ? '🏦 ' + p.caisse_name : '—'}</strong></td>
                  <td style="text-align: right; font-weight: 700; color: #16a34a;">+${formatCurrency(p.amount)}</td>
                  <td style="text-align: right;">${formatCurrency(p.balance_before)}</td>
                  <td style="text-align: right; font-weight: 600;">${formatCurrency(p.balance_after)}</td>
                  <td>${p.notes || ''} ${p.user_name ? `(${p.user_name})` : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="total-box">
          <div style="font-size: 13px; color: #475569;">Solde total de la dette restant à régler :</div>
          <div style="font-size: 24px; font-weight: 900; color: #dc2626; margin-top: 4px;">
            ${formatCurrency(client.current_debt)}
          </div>
          ${(parseFloat(String(client.current_debt)) || 0) > 0 ? `
            <div style="font-size: 12px; color: #dc2626; font-weight: 700; margin-top: 6px;">
              ⚠️ Conformément à la politique commerciale, tout nouvel achat est suspendu jusqu'au règlement de ce solde.
            </div>
          ` : `
            <div style="font-size: 12px; color: #16a34a; font-weight: 700; margin-top: 6px;">
              ✓ Félicitations, votre compte est entièrement à jour.
            </div>
          `}
        </div>

        <div class="footer">
          imatechx • Logiciel de Gestion Commerciale SQLite • Document imprimé le ${new Date().toLocaleDateString('fr-FR')}
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ========================================================= */}
      {/* NOTIFICATION ALERT */}
      {/* ========================================================= */}
      {alert && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: alert.type === 'success' ? '#f0fdf4' : (alert.type === 'warning' ? '#fffbeb' : '#fef2f2'),
          border: `1px solid ${alert.type === 'success' ? '#86efac' : (alert.type === 'warning' ? '#fcd34d' : '#fca5a5')}`,
          color: alert.type === 'success' ? '#15803d' : (alert.type === 'warning' ? '#b45309' : '#b91c1c'),
          boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 600 }}>
            {alert.type === 'success' && <CheckCircle2 size={18} />}
            {alert.type === 'warning' && <AlertTriangle size={18} />}
            {alert.type === 'error' && <AlertCircle size={18} />}
            <span style={{ whiteSpace: 'pre-line' }}>{alert.message}</span>
          </div>
          <button
            onClick={() => setAlert(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', padding: '2px' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TOP HEADER & TITLE */}
      {/* ========================================================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#16a34a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(22, 163, 74, 0.25)' }}>
              <Users size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                {t.clientsHeading}
              </h1>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                {t.clientsSubheading}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadClients}
            className="btn-secondary"
            title="Actualiser la liste des clients"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Actualiser</span>
          </button>

          {canEdit && (
            <button
              onClick={() => {
                setClientForm({ name: '', phone: '', address: '', notes: '', status: 'active' });
                setEditingClient(null);
                setShowAddClientModal(true);
              }}
              className="btn-secondary"
              style={{ borderColor: '#86efac', color: '#15803d' }}
            >
              <Plus size={15} />
              <span>{t.newClient}</span>
            </button>
          )}

          {canAddDebt && (
            <button
              onClick={() => handleOpenGiveProduct()}
              className="btn-green"
              style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}
            >
              <ShoppingCart size={16} />
              <span>{t.giveProductDebt}</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* KPI METRIC CARDS */}
      {/* ========================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {/* 1. Total Clients */}
        <div className="clean-card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f1f5f9', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Total Clients
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
              {stats.totalClients}
            </div>
            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
              Répertoire actif
            </div>
          </div>
        </div>

        {/* 2. Total Dettes en cours (DA) */}
        <div className="clean-card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid #dc2626' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Total Dettes Clients
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#dc2626', lineHeight: 1.2 }} dir="ltr">
              {formatCurrency(stats.totalDebt)}
            </div>
            <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 600, marginTop: '2px' }}>
              Montant total à recouvrer
            </div>
          </div>
        </div>

        {/* 3. Clients Débiteurs (avec dettes) */}
        <div className="clean-card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px', background: stats.blockedClientsCount > 0 ? '#fffdfa' : '#ffffff', border: stats.blockedClientsCount > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
              Clients avec Dettes
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#d97706', lineHeight: 1.2 }}>
              {stats.blockedClientsCount}
            </div>
            <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 600, marginTop: '2px' }}>
              Clients avec solde débiteur
            </div>
          </div>
        </div>

        {/* 4. Clients Soldés (À jour) */}
        <div className="clean-card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              Clients Soldés (Sans dette)
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#15803d', lineHeight: 1.2 }}>
              {stats.clearClientsCount}
            </div>
            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
              ✓ Compte à jour (0 DA)
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MAIN CONTENT CARD WITH TABS & FILTERS */}
      {/* ========================================================= */}
      <div className="clean-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Tabs & Search Toolbar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#ffffff' }}>
          
          {/* Sub-Tabs View Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
            <button
              onClick={() => setActiveView('directory')}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                background: activeView === 'directory' ? '#ffffff' : 'transparent',
                color: activeView === 'directory' ? '#15803d' : '#64748b',
                boxShadow: activeView === 'directory' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Users size={14} />
              <span>Annuaire des Clients ({filteredClients.length})</span>
            </button>

            <button
              onClick={() => setActiveView('debts_ledger')}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                background: activeView === 'debts_ledger' ? '#ffffff' : 'transparent',
                color: activeView === 'debts_ledger' ? '#15803d' : '#64748b',
                boxShadow: activeView === 'debts_ledger' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Package size={14} />
              <span>Grand Livre des Produits &amp; Dettes</span>
            </button>
          </div>

          {/* Search & Filter Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', padding: '2px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <button
                onClick={() => setStatusFilter('all')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: statusFilter === 'all' ? '#16a34a' : 'transparent',
                  color: statusFilter === 'all' ? '#ffffff' : '#64748b'
                }}
              >
                Tous
              </button>
              <button
                onClick={() => setStatusFilter('debt')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: statusFilter === 'debt' ? '#d97706' : 'transparent',
                  color: statusFilter === 'debt' ? '#ffffff' : '#b45309'
                }}
              >
                Avec Dettes ({stats.blockedClientsCount})
              </button>
              <button
                onClick={() => setStatusFilter('clear')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: statusFilter === 'clear' ? '#16a34a' : 'transparent',
                  color: statusFilter === 'clear' ? '#ffffff' : '#15803d'
                }}
              >
                ✓ Soldés ({stats.clearClientsCount})
              </button>
            </div>

            {/* Live Search */}
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher nom, téléphone..."
                className="input-clean"
                style={{ paddingLeft: '32px', fontSize: '12px', height: '34px' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* VIEW 1: ANNUAIRE DES CLIENTS */}
        {/* ========================================================= */}
        {activeView === 'directory' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 16px' }}>Client</th>
                  <th style={{ padding: '12px 16px' }}>Téléphone &amp; Adresse</th>
                  <th style={{ padding: '12px 16px' }}>Statut &amp; Autorisation</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Dette Actuelle</th>
                  <th style={{ padding: '12px 16px' }}>Dernier Produit Pris en Dette</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                      <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block', color: '#16a34a' }} />
                      Chargement des clients en cours...
                    </td>
                  </tr>
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                      <Users size={32} style={{ margin: '0 auto 10px auto', display: 'block', opacity: 0.4 }} />
                      <div style={{ fontWeight: 700, color: '#64748b', fontSize: '14px' }}>Aucun client trouvé</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>
                        {searchQuery ? 'Aucun résultat ne correspond à votre recherche.' : 'Commencez par ajouter votre premier client.'}
                      </div>
                      <button
                        onClick={() => {
                          setClientForm({ name: '', phone: '', address: '', notes: '', status: 'active' });
                          setEditingClient(null);
                          setShowAddClientModal(true);
                        }}
                        className="btn-green"
                        style={{ margin: '14px auto 0 auto', padding: '6px 14px', fontSize: '12px' }}
                      >
                        <Plus size={14} /> Nouveau Client
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredClients.map(client => {
                    const hasDebt = (parseFloat(String(client.current_debt)) || 0) > 0;
                    return (
                      <tr 
                        key={client.id}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          background: hasDebt ? '#fffdfd' : '#ffffff',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        {/* 1. Client Identity */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: hasDebt ? '#fee2e2' : '#dcfce7',
                              color: hasDebt ? '#dc2626' : '#15803d',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '14px'
                            }}>
                              {client.name ? client.name[0].toUpperCase() : 'C'}
                            </div>
                            <div>
                              <div
                                onClick={() => handleOpenHistory(client)}
                                style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px', cursor: 'pointer', textDecoration: 'none' }}
                                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                                title="Cliquer pour voir l'historique complet de ce client"
                              >
                                {client.name}
                              </div>
                              {client.notes && (
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={client.notes}>
                                  {client.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Contact details */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#334155' }}>
                            <Phone size={13} color="#16a34a" />
                            <span>{client.phone || <em style={{ color: '#94a3b8' }}>Non renseigné</em>}</span>
                          </div>
                          {client.address && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                              <MapPin size={12} color="#94a3b8" />
                              <span>{client.address}</span>
                            </div>
                          )}
                        </td>

                        {/* 3. Status & Debt Badge */}
                        <td style={{ padding: '14px 16px' }}>
                          {hasDebt ? (
                            <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '3px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: '#fffbeb',
                                color: '#b45309',
                                border: '1px solid #fcd34d',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 800
                              }}>
                                <AlertTriangle size={12} />
                                <span>Dette en cours</span>
                              </span>
                              <span style={{ fontSize: '10px', color: '#b45309', fontWeight: 600 }}>
                                {client.unpaid_debts_count || 1} achat(s) à crédit
                              </span>
                            </div>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #86efac',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700
                            }}>
                              <Check size={12} />
                              <span>À JOUR (Soldé)</span>
                            </span>
                          )}
                        </td>

                        {/* 4. Current Debt Amount */}
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 900,
                            color: hasDebt ? '#dc2626' : '#16a34a'
                          }} dir="ltr">
                            {formatCurrency(client.current_debt)}
                          </div>
                          {hasDebt && (
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                              Solde restant dû
                            </div>
                          )}
                        </td>

                        {/* 5. Last Product Taken (Key User Requirement) */}
                        <td style={{ padding: '14px 16px' }}>
                          {client.last_product_name ? (
                            <div style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              maxWidth: '260px'
                            }}>
                              <div style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Package size={13} color="#16a34a" />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {client.last_product_name}
                                </span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Qté : <strong>{client.last_product_qty} {client.last_product_unit}</strong></span>
                                <span>{client.last_debt_date ? client.last_debt_date.slice(0, 10) : ''}</span>
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '11px' }}>— Aucun produit enregistré</span>
                          )}
                        </td>

                        {/* 6. Action buttons */}
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {/* Give product on debt */}
                            <button
                              onClick={() => handleOpenGiveProduct(client)}
                              className="btn-secondary"
                              style={{
                                padding: '5px 10px',
                                fontSize: '11px',
                                fontWeight: 700,
                                borderColor: '#86efac',
                                color: '#15803d',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Donner un produit en dette à ce client"
                            >
                              <ShoppingCart size={13} />
                              <span>+ Produit</span>
                            </button>

                            {/* If client has debt, prominent Settle Debt button */}
                            {hasDebt && canPayDebt && (
                              <button
                                onClick={() => handleOpenSettleDebt(client)}
                                className="btn-green"
                                style={{
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title="Encaisser un règlement de dette"
                              >
                                <DollarSign size={13} />
                                <span>Régler</span>
                              </button>
                            )}

                            {/* View History & Statement */}
                            <button
                              onClick={() => handleOpenHistory(client)}
                              style={{
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                padding: '5px 8px',
                                cursor: 'pointer',
                                color: '#334155',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: 600
                              }}
                              title="Voir l'historique complet des produits pris et règlements"
                            >
                              <History size={13} />
                              <span>Historique</span>
                            </button>

                            {/* Edit Client */}
                            <button
                              onClick={() => {
                                setEditingClient(client);
                                setClientForm({
                                  name: client.name,
                                  phone: client.phone || '',
                                  address: client.address || '',
                                  notes: client.notes || '',
                                  status: client.status || 'active'
                                });
                              }}
                              style={{
                                background: 'transparent',
                                border: '1px solid #e2e8f0',
                                borderRadius: '4px',
                                padding: '5px 7px',
                                cursor: 'pointer',
                                color: '#64748b'
                              }}
                              title="Modifier les coordonnées du client"
                            >
                              <Edit2 size={13} />
                            </button>

                            {/* Delete Client */}
                            {canDelete && (
                              <button
                                onClick={() => setDeletingClient(client)}
                                style={{
                                  background: '#fff5f5',
                                  border: '1px solid #fecaca',
                                  borderRadius: '4px',
                                  padding: '5px 7px',
                                  cursor: 'pointer',
                                  color: '#dc2626'
                                }}
                                title="Supprimer ce client"
                              >
                                <Trash2 size={13} />
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
        )}

        {/* ========================================================= */}
        {/* VIEW 2: GRAND LIVRE DES PRODUITS & DETTES */}
        {/* ========================================================= */}
        {activeView === 'debts_ledger' && (
          <div style={{ padding: '16px 20px' }}>
            <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Historique Global des Produits Remis à Crédit
                </h3>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Liste détaillée de chaque produit pris en dette par les clients avec montant restant et état de blocage.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
              {filteredClients.flatMap(c => {
                if (!c.last_product_name && (parseFloat(String(c.current_debt)) || 0) <= 0) return [];
                const hasDebt = (parseFloat(String(c.current_debt)) || 0) > 0;
                return [{
                  client: c,
                  hasDebt
                }];
              }).map(({ client, hasDebt }) => (
                <div
                  key={client.id}
                  style={{
                    background: '#ffffff',
                    border: hasDebt ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '14px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{client.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>📞 {client.phone || 'Non renseigné'}</div>
                    </div>
                    {hasDebt ? (
                      <span style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>
                        ⛔ BLOQUÉ
                      </span>
                    ) : (
                      <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                        ✓ SOLDÉ
                      </span>
                    )}
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Dernier produit pris :</div>
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '13px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Package size={14} color="#16a34a" />
                      <span>{client.last_product_name || 'Article divers'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                      <span>Qté : <strong>{client.last_product_qty || 1} {client.last_product_unit || 'pièce'}</strong></span>
                      <span>Total : <strong>{formatCurrency(client.last_product_amount || client.current_debt)}</strong></span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>Reste à payer :</div>
                      <div style={{ fontSize: '14px', fontWeight: 900, color: hasDebt ? '#dc2626' : '#16a34a' }}>
                        {formatCurrency(client.current_debt)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {hasDebt && (
                        <button
                          onClick={() => handleOpenSettleDebt(client)}
                          className="btn-green"
                          style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 700 }}
                        >
                          Régler
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenHistory(client)}
                        className="btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '11px' }}
                      >
                        Historique
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: DONNER UN PRODUIT / NOUVELLE DETTE CLIENT */}
      {/* ========================================================= */}
      {showGiveProductModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
          backdropFilter: 'blur(3px)'
        }}>
          <div className="clean-card" style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#0f172a',
              color: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
                  <ShoppingCart size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                    Remettre un Produit &amp; Enregistrer Dette Client
                  </h3>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Le client sera bloqué pour tout nouvel achat tant que cette dette n'est pas soldée
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGiveProductModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitGiveProduct} style={{ overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* SECTION A: CLIENT SELECTION */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} color="#16a34a" />
                    <span>Sélectionner le Client</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setDebtForm(prev => ({ ...prev, isCreatingNewClient: !prev.isCreatingNewClient }))}
                    style={{ background: 'transparent', border: 'none', color: '#16a34a', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {debtForm.isCreatingNewClient ? '← Choisir un client existant' : '+ Créer un nouveau client'}
                  </button>
                </div>

                {!debtForm.isCreatingNewClient ? (
                  <div>
                    <select
                      value={debtForm.clientId}
                      onChange={e => setDebtForm(prev => ({ ...prev, clientId: e.target.value ? Number(e.target.value) : '' }))}
                      className="input-clean"
                      style={{ fontSize: '13px', padding: '8px 12px', fontWeight: 600 }}
                      required
                    >
                      <option value="">-- Choisir un client dans la liste --</option>
                      {clients.map(c => {
                        const hasD = (parseFloat(String(c.current_debt)) || 0) > 0;
                        return (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.phone ? `(${c.phone})` : ''} — {hasD ? `🟠 Dette: ${formatCurrency(c.current_debt)}` : '✓ À jour (0 DA)'}
                          </option>
                        );
                      })}
                    </select>

                    {/* Informational Banner if selected client has active debt */}
                    {hasSelectedClientDebt && selectedClientForDebtObj && (
                      <div style={{
                        marginTop: '12px',
                        background: '#fffbeb',
                        border: '1px solid #fcd34d',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        animation: 'fadeIn 0.2s ease-out'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <AlertTriangle size={22} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#92400e' }}>
                              ⚠️ Information Dette Client : {formatCurrency(selectedClientForDebtObj.current_debt)}
                            </div>
                            <div style={{ fontSize: '12px', color: '#78350f', marginTop: '3px', lineHeight: 1.4 }}>
                              Le client <strong>{selectedClientForDebtObj.name}</strong> a déjà un encours de dette. En tant que propriétaire, vous pouvez lui accorder ce nouveau produit en stock selon votre choix.
                            </div>
                            
                            {selectedClientForDebtObj.last_product_name && (
                              <div style={{ marginTop: '8px', background: '#ffffff', border: '1px solid #fde68a', padding: '8px 10px', borderRadius: '6px', fontSize: '11px', color: '#92400e' }}>
                                <strong>Dernier produit pris en dette par ce client :</strong><br />
                                📦 {selectedClientForDebtObj.last_product_name} ({selectedClientForDebtObj.last_product_qty} {selectedClientForDebtObj.last_product_unit || 'pièce'} le {selectedClientForDebtObj.last_debt_date ? selectedClientForDebtObj.last_debt_date.slice(0, 10) : ''})
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setShowGiveProductModal(false);
                                handleOpenSettleDebt(selectedClientForDebtObj);
                              }}
                              className="btn-secondary"
                              style={{
                                marginTop: '10px',
                                padding: '5px 12px',
                                fontSize: '11px',
                                fontWeight: 700,
                                borderColor: '#f59e0b',
                                color: '#b45309',
                                background: '#ffffff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                            >
                              <DollarSign size={13} />
                              <span>Encaisser un règlement pour {selectedClientForDebtObj.name}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedClientForDebtObj && !hasSelectedClientDebt && (
                      <div style={{ marginTop: '8px', fontSize: '11px', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <CheckCircle2 size={13} />
                        <span>Ce client n'a aucune dette en cours. Vous pouvez lui remettre un produit.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Nom complet du nouveau client *
                      </label>
                      <input
                        type="text"
                        value={debtForm.newClientName}
                        onChange={e => setDebtForm(prev => ({ ...prev, newClientName: e.target.value }))}
                        placeholder="Ex: Karim Benali"
                        className="input-clean"
                        required={debtForm.isCreatingNewClient}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Numéro de téléphone
                      </label>
                      <input
                        type="text"
                        value={debtForm.newClientPhone}
                        onChange={e => setDebtForm(prev => ({ ...prev, newClientPhone: e.target.value }))}
                        placeholder="Ex: 0550 12 34 56"
                        className="input-clean"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION B: PRODUCT SELECTION */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <Package size={14} color="#16a34a" />
                  <span>Sélectionner le Produit Remis en Dette</span>
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Product selector dropdown */}
                  <div>
                    <select
                      value={debtForm.productId}
                      onChange={e => handleProductSelect(Number(e.target.value))}
                      className="input-clean"
                      style={{ fontSize: '13px', padding: '8px 12px', fontWeight: 600 }}
                    >
                      <option value="">-- Sélectionner dans le catalogue des produits --</option>
                      {availableProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stock: {p.stock_quantity} {p.base_unit}) — Prix: {formatCurrency(p.selling_price)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Manual product name override if needed */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Nom du produit remis *
                    </label>
                    <input
                      type="text"
                      value={debtForm.productName}
                      onChange={e => setDebtForm(prev => ({ ...prev, productName: e.target.value }))}
                      placeholder="Ex: Marlboro Gold, Boisson Gazéifiée, etc."
                      className="input-clean"
                      required
                    />
                  </div>

                  {/* Quantity, Unit & Price row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Quantité *
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={debtForm.quantity}
                        onChange={e => setDebtForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 1 }))}
                        className="input-clean"
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Unité
                      </label>
                      {selectedProductObj && selectedProductObj.units && selectedProductObj.units.length > 0 ? (
                        <select
                          value={debtForm.unitName}
                          onChange={e => handleUnitSelect(e.target.value)}
                          className="input-clean"
                        >
                          {selectedProductObj.units.map((u: any) => (
                            <option key={u.id} value={u.unit_name}>
                              {u.unit_name} ({formatCurrency(u.selling_price)})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={debtForm.unitName}
                          onChange={e => setDebtForm(prev => ({ ...prev, unitName: e.target.value }))}
                          placeholder="Ex: Pièce, Paquet"
                          className="input-clean"
                        />
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Prix de vente unitaire (DA) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={debtForm.unitPrice}
                        onChange={e => setDebtForm(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                        className="input-clean"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION C: TOTALS, DOWNPAYMENT & CAISSE */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  
                  {/* Upfront Cash Payment (Versement) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Acompte / Versement comptant (DA)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={computedTotalAmount}
                      step="any"
                      value={debtForm.paidAmount}
                      onChange={e => setDebtForm(prev => ({ ...prev, paidAmount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0 (100% à crédit)"
                      className="input-clean"
                    />
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                      Laissez 0 si le client prend le produit 100% à crédit
                    </div>
                  </div>

                  {/* Destination Caisse for Upfront Cash */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Caisse de réception de l'acompte
                    </label>
                    <select
                      value={debtForm.caisseId}
                      onChange={e => setDebtForm(prev => ({ ...prev, caisseId: e.target.value ? Number(e.target.value) : '' }))}
                      className="input-clean"
                      disabled={debtForm.paidAmount <= 0}
                    >
                      <option value="">-- Sélectionner une caisse --</option>
                      {availableCaisses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({formatCurrency(c.current_balance)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Calculation Summary Box */}
                <div style={{
                  marginTop: '14px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Montant Total :</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                      {formatCurrency(computedTotalAmount)}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Acompte versé :</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a' }}>
                      {formatCurrency(debtForm.paidAmount)}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700 }}>
                      ⚠️ Dette à Ajouter au Client :
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#dc2626' }}>
                      {formatCurrency(computedRemainingDebt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Date & Notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Date de remise du produit
                  </label>
                  <input
                    type="date"
                    value={debtForm.date}
                    onChange={e => setDebtForm(prev => ({ ...prev, date: e.target.value }))}
                    className="input-clean"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Notes ou référence particulière
                  </label>
                  <input
                    type="text"
                    value={debtForm.notes}
                    onChange={e => setDebtForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Ex: Remis en stock, promis de payer plus tard..."
                    className="input-clean"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setShowGiveProductModal(false)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-green"
                  style={{
                    padding: '8px 20px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Valider et Remettre le Produit ({formatCurrency(computedRemainingDebt)})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: RÉGLEMENT DE DETTE (DÉBLOCAGE DU CLIENT) */}
      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* MODAL 2: RÉGLEMENT DE DETTE (DÉBLOCAGE DU CLIENT) */}
      {/* ========================================================= */}
      {showSettleDebtModal && clientForSettlement && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
          backdropFilter: 'blur(3px)'
        }}>
          <div className="clean-card" style={{
            width: '100%',
            maxWidth: '560px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            direction: currentLang === 'ar' ? 'rtl' : 'ltr'
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#16a34a',
              color: '#ffffff',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <DollarSign size={20} />
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                    {t.settleDebtTitle || "Règlement de Dette Client"}
                  </h3>
                  <div style={{ fontSize: '11px', color: '#dcfce7' }}>
                    {t.settleDebtSubtitle || "Encaisser le versement et affecter les fonds à la caisse choisie"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettleDebtModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#dcfce7', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form with scrollable body & fixed footer */}
            <form onSubmit={handleSubmitSettleDebt} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              
              {/* Scrollable content */}
              <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Client Info Banner */}
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{t.clientConcerned || "Client concerné :"}</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{clientForSettlement.name}</div>
                    <div style={{ fontSize: '12px', color: '#475569' }}>📞 {clientForSettlement.phone || '—'}</div>
                  </div>
                  <div style={{ textAlign: currentLang === 'ar' ? 'left' : 'right' }}>
                    <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700 }}>{t.currentDebtDue || "Dette actuelle due :"}</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#dc2626' }}>
                      {formatCurrency(clientForSettlement.current_debt)}
                    </div>
                  </div>
                </div>

                {/* What client took last time snippet */}
                {clientForSettlement.last_product_name && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px 12px', fontSize: '11px', color: '#166534' }}>
                    <strong>{t.lastTakenProductSnippet || "Dernier produit pris en dette précédemment :"}</strong><br />
                    📦 {clientForSettlement.last_product_name} ({clientForSettlement.last_product_qty} {clientForSettlement.last_product_unit || 'pièce'} {clientForSettlement.last_debt_date ? `— ${clientForSettlement.last_debt_date.slice(0, 10)}` : ''})
                  </div>
                )}

                {/* Amount Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    {t.amountToCollect || "Montant à Encaisser (DA) *"}
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={settlementForm.amount}
                      onChange={e => setSettlementForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="input-clean"
                      style={{ fontSize: '15px', fontWeight: 800, color: '#15803d', flex: 1 }}
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setSettlementForm(prev => ({ ...prev, amount: String(clientForSettlement.current_debt) }))}
                      className="btn-secondary"
                      style={{ fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', padding: '0 14px' }}
                    >
                      {t.totalBalanceBtn || "Solde Total"}
                    </button>
                  </div>
                </div>

                {/* PROMINENT CAISSE SELECTION */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#166534', marginBottom: '8px' }}>
                    {t.destCaisseLabel || "📍 Caisse de Destination (Où mettre l'argent encaissé ?) *"}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: availableCaisses.length > 2 ? 'repeat(auto-fit, minmax(160px, 1fr))' : '1fr 1fr', gap: '8px' }}>
                    {availableCaisses.map(c => {
                      const isSelected = Number(settlementForm.caisseId) === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSettlementForm(prev => ({ ...prev, caisseId: c.id }))}
                          style={{
                            border: isSelected ? '2px solid #16a34a' : '1px solid #cbd5e1',
                            background: isSelected ? '#ffffff' : '#f8fafc',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                            boxShadow: isSelected ? '0 2px 6px rgba(22, 163, 74, 0.15)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: isSelected ? '#15803d' : '#0f172a' }}>
                              {c.name}
                            </span>
                            {c.is_default === 1 && (
                              <span style={{ fontSize: '9px', background: '#dbeafe', color: '#1d4ed8', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                {t.primaryCaisse || "Principale"}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: isSelected ? '#166534' : '#64748b', fontWeight: 600 }}>
                            {t.caisseBalance || "Solde :"} {formatCurrency(c.current_balance)}
                          </div>
                          {isSelected && (
                            <div style={{ fontSize: '10px', color: '#15803d', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <Check size={12} /> {t.caisseSelected || "Caisse sélectionnée"}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {selectedSettlementCaisse && (
                    <div style={{ marginTop: '10px', background: '#ffffff', border: '1px solid #86efac', borderRadius: '6px', padding: '8px 12px', fontSize: '11px', color: '#14532d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <span>{t.effectiveDepositIn || "Dépôt effectif dans :"} <strong>{selectedSettlementCaisse.name}</strong></span>
                      <span style={{ fontWeight: 800, color: '#16a34a' }}>
                        {t.newEstimatedBalance || "Nouveau solde prévu :"} {formatCurrency((parseFloat(selectedSettlementCaisse.current_balance) || 0) + (parseFloat(settlementForm.amount) || 0))}
                      </span>
                    </div>
                  )}
                </div>

                {/* Payment Method & Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      {t.paymentMode || "Mode de versement"}
                    </label>
                    <select
                      value={settlementForm.paymentMethod}
                      onChange={e => setSettlementForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      className="input-clean"
                    >
                      <option value="especes">{t.modeCash || "Espèces (Encaisser en liquide)"}</option>
                      <option value="virement">{t.modeTransfer || "Virement bancaire"}</option>
                      <option value="cheque">{t.modeCheck || "Chèque"}</option>
                      <option value="autre">{t.modeOther || "Autre"}</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      {t.paymentDate || "Date de paiement"}
                    </label>
                    <input
                      type="date"
                      value={settlementForm.date}
                      onChange={e => setSettlementForm(prev => ({ ...prev, date: e.target.value }))}
                      className="input-clean"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    {t.notesRef || "Remarques / Référence"}
                  </label>
                  <input
                    type="text"
                    value={settlementForm.notes}
                    onChange={e => setSettlementForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Ex: Reçu en main propre..."
                    className="input-clean"
                  />
                </div>

                {/* Payment preview banner */}
                {parseFloat(settlementForm.amount) >= (parseFloat(String(clientForSettlement.current_debt)) || 0) ? (
                  <div style={{ background: '#dcfce7', border: '1px solid #86efac', padding: '10px 12px', borderRadius: '6px', fontSize: '12px', color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} />
                    <span>{t.fullDebtSettledBanner || "Ce versement solde intégralement la dette du client (Solde restant : 0.00 DA)."}</span>
                  </div>
                ) : (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '10px 12px', borderRadius: '6px', fontSize: '11px', color: '#b45309', fontWeight: 600 }}>
                    ℹ️ {t.partialDebtSettledBanner || "Règlement partiel : Reste dû"} {formatCurrency(Math.max(0, (clientForSettlement.current_debt || 0) - (parseFloat(settlementForm.amount) || 0)))}.
                  </div>
                )}
              </div>

              {/* Fixed Actions Footer - ALWAYS visible regardless of modal height / scroll */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                padding: '14px 20px',
                borderTop: '1px solid #e2e8f0',
                background: '#ffffff',
                flexShrink: 0
              }}>
                <button
                  type="button"
                  onClick={() => setShowSettleDebtModal(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  {t.cancel || "Annuler"}
                </button>
                <button
                  type="submit"
                  className="btn-green"
                  style={{ padding: '10px 24px', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Check size={16} /> {t.validateSettlementBtn || "Encaisser et Valider le Règlement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: HISTORIQUE COMPLET DU CLIENT & RELEVÉ */}
      {/* ========================================================= */}
      {selectedClientForHistory && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
          backdropFilter: 'blur(3px)'
        }}>
          <div className="clean-card" style={{
            width: '100%',
            maxWidth: '820px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: (parseFloat(String(selectedClientForHistory.current_debt)) || 0) > 0 ? '#fee2e2' : '#dcfce7',
                  color: (parseFloat(String(selectedClientForHistory.current_debt)) || 0) > 0 ? '#dc2626' : '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800
                }}>
                  {selectedClientForHistory.name ? selectedClientForHistory.name[0].toUpperCase() : 'C'}
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {selectedClientForHistory.name}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    📞 {selectedClientForHistory.phone || 'Sans tel'} • {selectedClientForHistory.address || 'Sans adresse'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const c = selectedClientForHistory;
                    setSelectedClientForHistory(null);
                    handleOpenGiveProduct(c);
                  }}
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', borderColor: '#86efac' }}
                  title="Donner un nouveau produit en dette à ce client"
                >
                  <ShoppingCart size={14} />
                  <span>+ Donner un Produit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintStatement(selectedClientForHistory, clientHistoryDebts, clientHistoryPayments)}
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Printer size={14} />
                  <span>Imprimer le Relevé</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedClientForHistory(null)}
                  style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Account summary bar */}
              <div style={{
                background: (parseFloat(String(selectedClientForHistory.current_debt)) || 0) > 0 ? '#fffdfa' : '#f0fdf4',
                border: `1px solid ${(parseFloat(String(selectedClientForHistory.current_debt)) || 0) > 0 ? '#fde68a' : '#86efac'}`,
                borderRadius: '8px',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Situation du compte client :</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    {(parseFloat(String(selectedClientForHistory.current_debt)) || 0) > 0 ? (
                      <span style={{ color: '#b45309', fontWeight: 800, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <AlertCircle size={15} /> SOLDE DÉBITEUR EN COURS
                      </span>
                    ) : (
                      <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <CheckCircle2 size={15} /> ✓ COMPTE SOLDÉ (À JOUR)
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Dette Restante Due :</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: (parseFloat(String(selectedClientForHistory.current_debt)) || 0) > 0 ? '#dc2626' : '#16a34a' }}>
                    {formatCurrency(selectedClientForHistory.current_debt)}
                  </div>
                </div>

                {(parseFloat(String(selectedClientForHistory.current_debt)) || 0) > 0 && (
                  <button
                    onClick={() => {
                      const c = selectedClientForHistory;
                      setSelectedClientForHistory(null);
                      handleOpenSettleDebt(c);
                    }}
                    className="btn-green"
                    style={{ padding: '7px 16px', fontWeight: 800, fontSize: '12px' }}
                  >
                    Encaisser un Règlement
                  </button>
                )}
              </div>

              {/* Table of Debts (Products Taken) */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={14} color="#16a34a" />
                  <span>Historique des Produits Remis à Crédit :</span>
                </h4>

                {loadingHistory ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    Chargement de l'historique...
                  </div>
                ) : clientHistoryDebts.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '6px', fontSize: '12px' }}>
                    Aucun produit remis en dette pour ce client.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                          <th style={{ padding: '8px 10px' }}>Date</th>
                          <th style={{ padding: '8px 10px' }}>Produit remis</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center' }}>Qté</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Prix Unit.</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Versé</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Reste Dû</th>
                          <th style={{ padding: '8px 10px' }}>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientHistoryDebts.map(d => (
                          <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 10px' }}>{d.date ? d.date.slice(0, 10) : ''}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>{d.product_name}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>{d.quantity} {d.unit_name}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right' }}>{formatCurrency(d.unit_price)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(d.total_amount)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: '#16a34a' }}>{formatCurrency(d.paid_amount)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: d.remaining_amount > 0 ? '#dc2626' : '#16a34a' }}>
                              {formatCurrency(d.remaining_amount)}
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              {d.remaining_amount <= 0 ? (
                                <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Soldé</span>
                              ) : (
                                <span style={{ color: '#b45309', fontWeight: 700 }}>En cours</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Table of Payments */}
              {clientHistoryPayments.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DollarSign size={14} color="#16a34a" />
                    <span>Historique des Règlements Effectués &amp; Caisse de Destination :</span>
                  </h4>
                  <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                          <th style={{ padding: '8px 10px' }}>Date</th>
                          <th style={{ padding: '8px 10px' }}>Mode</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Montant Versé</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Solde Avant</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Solde Après</th>
                          <th style={{ padding: '8px 10px' }}>Caisse Dépositaire / Remarques</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientHistoryPayments.map(p => (
                          <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 10px' }}>{p.date ? p.date.slice(0, 10) : ''}</td>
                            <td style={{ padding: '8px 10px' }}>{p.payment_method || 'Espèces'}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>
                              +{formatCurrency(p.amount)}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right' }}>{formatCurrency(p.balance_before)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(p.balance_after)}</td>
                            <td style={{ padding: '8px 10px' }}>
                              {p.caisse_name ? (
                                <span style={{
                                  display: 'inline-block',
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  border: '1px solid #86efac',
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  fontWeight: 800,
                                  fontSize: '11px',
                                  marginRight: '6px'
                                }}>
                                  🏦 {p.caisse_name}
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8', marginRight: '6px' }}>—</span>
                              )}
                              <span style={{ color: '#475569' }}>{p.notes || ''}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedClientForHistory(null)}
                className="btn-secondary"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: CRÉER / MODIFIER UN CLIENT */}
      {/* ========================================================= */}
      {(showAddClientModal || editingClient) && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
          backdropFilter: 'blur(3px)'
        }}>
          <div className="clean-card" style={{
            width: '100%',
            maxWidth: '500px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="#16a34a" />
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {editingClient ? 'Modifier le Client' : 'Ajouter un Nouveau Client'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddClientModal(false);
                  setEditingClient(null);
                }}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitClient} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Nom complet du client *
                </label>
                <input
                  type="text"
                  value={clientForm.name}
                  onChange={e => setClientForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Ahmed Benali"
                  className="input-clean"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Numéro de téléphone
                </label>
                <input
                  type="text"
                  value={clientForm.phone}
                  onChange={e => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Ex: 0661 23 45 67"
                  className="input-clean"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Adresse / Ville
                </label>
                <input
                  type="text"
                  value={clientForm.address}
                  onChange={e => setClientForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Ex: Alger Centre, Quartier X"
                  className="input-clean"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Remarques / Notes internes
                </label>
                <textarea
                  value={clientForm.notes}
                  onChange={e => setClientForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Informations supplémentaires..."
                  className="input-clean"
                  rows={2}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddClientModal(false);
                    setEditingClient(null);
                  }}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-green"
                  style={{ padding: '8px 18px' }}
                >
                  {editingClient ? 'Enregistrer les modifications' : 'Créer le Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: CONFIRM DELETE CLIENT */}
      {/* ========================================================= */}
      {deletingClient && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
          backdropFilter: 'blur(3px)'
        }}>
          <div className="clean-card" style={{ width: '100%', maxWidth: '420px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Supprimer ce client ?
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Action irréversible
                </p>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, marginBottom: '20px' }}>
              Êtes-vous sûr de vouloir supprimer le client <strong>"{deletingClient.name}"</strong> ?
              {(parseFloat(String(deletingClient.current_debt)) || 0) > 0 && (
                <span style={{ display: 'block', color: '#dc2626', fontWeight: 700, marginTop: '8px' }}>
                  ⚠️ Attention : Ce client a une dette en cours de {formatCurrency(deletingClient.current_debt)}. La suppression sera bloquée par sécurité.
                </span>
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeletingClient(null)}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteClient}
                className="btn-danger"
                style={{ padding: '8px 16px' }}
              >
                Supprimer Définitivement
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
