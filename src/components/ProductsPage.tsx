import React, { useState, useEffect, useMemo } from 'react';
import {
  Package, Plus, Search, Edit2, Trash2, ShoppingCart, 
  CheckCircle2, AlertTriangle, 
  X, RefreshCw, Building2, Tag,
  Scale, BarChart2, History, FileText, Eye, Star
} from 'lucide-react';
import type { Language, Translations } from '../i18n';
import { translations } from '../i18n';
import { formatCigaretteStock } from './VentesPage';
import { hasPermission } from '../permissions';

export interface ProductUnit {
  id?: number;
  product_id?: number;
  unit_name: string;
  conversion_factor: number;
  selling_price: number;
  cost_price?: number;
  barcode?: string;
  is_default?: number;
}

export interface ProductSupplierPrice {
  id?: number;
  product_id?: number;
  supplier_id: number;
  supplier_name?: string;
  supplier_phone?: string;
  supplier_city?: string;
  purchase_price: number;
  supplier_sku?: string;
  lead_time_days?: number;
  min_order_qty?: number;
  is_primary?: number;
  notes?: string;
  is_cheapest?: boolean;
  price_difference?: number;
  percentage_difference?: string | number;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  category_id: number;
  category_name?: string;
  category_color?: string;
  primary_supplier_id?: number;
  supplier_name?: string;
  supplier_phone?: string;
  base_unit: string;
  stock_quantity: number;
  min_stock_alert: number;
  cost_price: number;
  selling_price: number;
  status: 'active' | 'inactive';
  is_favorite?: number;
  notes?: string;
  caisse_id?: number;
  caisse_name?: string;
  units?: ProductUnit[];
  supplier_prices?: ProductSupplierPrice[];
}

export interface Category {
  id: number;
  name: string;
  code?: string;
  color?: string;
  icon?: string;
  product_count?: number;
}

export interface CartItem {
  productId: number;
  productName: string;
  sku: string;
  unitName: string;
  conversionFactor: number;
  price: number; // Prix d'achat grossiste utilisé pour la commande fournisseur
  purchasePrice?: number;
  sellingPrice?: number;
  quantity: number;
  supplierId?: number;
  supplierName?: string;
  caisseId?: number;
  caisseName?: string;
}

interface ProductsPageProps {
  currentLang: Language;
  currentUser: any;
}

// Fallback demo products for browser preview mode
const DEMO_CATEGORIES: Category[] = [
  { id: 1, name: 'Tabac & Cigarettes', code: 'TABAC', color: '#dc2626', product_count: 3 },
  { id: 2, name: 'Boissons & Café', code: 'BOISSONS', color: '#2563eb', product_count: 2 },
  { id: 3, name: 'Snacks & Confiserie', code: 'SNACKS', color: '#d97706', product_count: 0 },
  { id: 4, name: 'Accessoires & Fumeurs', code: 'ACCESSOIRES', color: '#7c3aed', product_count: 2 }
];

const DEMO_PRODUCTS: Product[] = [];

/**
 * Detects if a product follows the Algerian Kiosk Tobacco / Cigarette / OCB model
 * where wholesale purchase is strictly in packs and counter sales can be per single stick/sheet.
 */
export const isCigaretteProduct = (product: Product): boolean => {
  if (!product) return false;
  const cat = (product.category_name || '').toLowerCase();
  const unit = (product.base_unit || '').toLowerCase();
  const name = (product.name || '').toLowerCase();
  
  if (cat.includes('tabac') || cat.includes('cig') || cat.includes('fumeur')) return true;
  if (unit.includes('tige') || unit.includes('feuille') || unit.includes('cig')) return true;
  if (name.includes('marlboro') || name.includes('gauloise') || name.includes('ocb') || name.includes('winston') || name.includes('l&m') || name.includes('camel') || name.includes('tabac')) return true;
  
  if (product.units?.some(u => {
    const un = (u.unit_name || '').toLowerCase();
    return un.includes('paquet') || un.includes('carnet') || un.includes('tige') || un.includes('feuille');
  })) {
    return true;
  }

  return false;
};

/**
 * Resolves the genuine wholesale purchase price (Prix d'Achat Grossiste)
 * for a product and its selected unit. NEVER returns retail selling price.
 */
export const resolveProductWholesalePrice = (
  product: Product,
  unitName?: string,
  factor?: number,
  supplierId?: number
): number => {
  const conv = Math.max(1, factor || 1);

  // Find matching unit
  const matchingUnit = unitName 
    ? product.units?.find(u => u.unit_name === unitName)
    : (product.units?.find(u => u.is_default) || product.units?.[0]);

  const isCig = isCigaretteProduct(product);

  // 1. Direct matching unit configured cost_price
  // (In standard products, matchingUnit.cost_price is the exact purchase cost of that unit.
  // In cigarette products, matchingUnit.cost_price is also exact: pack cost for paquet, packCost/20 for tige)
  if (!supplierId || supplierId === product.primary_supplier_id) {
    if (matchingUnit && matchingUnit.cost_price !== undefined && matchingUnit.cost_price > 0) {
      return matchingUnit.cost_price;
    }
  }

  // 2. Direct supplier price match if supplier specified or primary supplier has supplier_prices entry
  const targetSuppId = supplierId || product.primary_supplier_id;
  if (targetSuppId && product.supplier_prices && product.supplier_prices.length > 0) {
    const sp = product.supplier_prices.find(s => s.supplier_id === targetSuppId);
    if (sp && sp.purchase_price > 0) {
      if (isCig) {
        const packUnit = product.units?.find(u => (u.conversion_factor || 1) > 1);
        const packFactor = packUnit?.conversion_factor || 20;
        if (conv >= packFactor || conv > 1) {
          return sp.purchase_price;
        }
        return sp.purchase_price / packFactor;
      } else {
        // Normal standard product: supplier purchase_price is for base unit (conv = 1)
        return sp.purchase_price * conv;
      }
    }
  }

  // 3. Any matching unit cost_price
  if (matchingUnit && matchingUnit.cost_price !== undefined && matchingUnit.cost_price > 0) {
    return matchingUnit.cost_price;
  }

  // 4. Cheapest supplier in supplier_prices
  if (product.supplier_prices && product.supplier_prices.length > 0) {
    const cheapest = product.supplier_prices[0];
    if (cheapest && cheapest.purchase_price > 0) {
      if (isCig) {
        const packUnit = product.units?.find(u => (u.conversion_factor || 1) > 1);
        const packFactor = packUnit?.conversion_factor || 20;
        if (conv >= packFactor || conv > 1) {
          return cheapest.purchase_price;
        }
        return cheapest.purchase_price / packFactor;
      } else {
        return cheapest.purchase_price * conv;
      }
    }
  }

  // 5. Fallback to product.cost_price * conv
  if (product.cost_price !== undefined && product.cost_price > 0) {
    return product.cost_price * conv;
  }

  return 0;
};

export default function ProductsPage({ currentLang, currentUser }: ProductsPageProps) {
  const t: Translations = translations[currentLang] || translations.fr;
  const canEdit = hasPermission(currentUser, 'products.edit');
  const canDelete = hasPermission(currentUser, 'products.delete');
  const canAdjustStock = hasPermission(currentUser, 'products.stock_adjust');
  const canViewCost = hasPermission(currentUser, 'products.cost_price');
  const isAdmin = currentUser?.role === 'admin' || canEdit;

  // Products & Categories state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [caisses, setCaisses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [kpis, setKpis] = useState({
    totalProducts: 0,
    outOfStock: 0,
    lowStock: 0,
    totalValuation: 0
  });

  // Backend Filters state
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<number | 'all'>('all');
  const [stockStatus, setStockStatus] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name_asc');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Per-product quick unit selection & quantity state
  // key: productId -> { unitName, factor, sellingPrice, purchasePrice, quantity }
  const [rowSelections, setRowSelections] = useState<Record<number, {
    unitName: string;
    factor: number;
    sellingPrice: number;
    purchasePrice: number;
    quantity: number;
  }>>({});

  // Cart state
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('kms_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [cartSupplierId, setCartSupplierId] = useState<number | 'all'>('all');
  const [cartCaisseId, setCartCaisseId] = useState<number | 'auto'>('auto');
  const [cartPaymentMethod, setCartPaymentMethod] = useState<'especes' | 'virement' | 'cheque' | 'credit'>('especes');
  const [cartAffectCaisse, setCartAffectCaisse] = useState<boolean>(true);
  const [versementsBySupplier, setVersementsBySupplier] = useState<Record<string, number>>({});

  // Main Tab: 'catalog' | 'purchases_history'
  const [mainTab, setMainTab] = useState<'catalog' | 'purchases_history'>('catalog');

  // Purchases / Orders History state
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
  const [ordersPage, setOrdersPage] = useState<number>(1);
  const [ordersPageSize, setOrdersPageSize] = useState<number>(15);
  const [ordersTotalCount, setOrdersTotalCount] = useState<number>(0);
  const [ordersTotalPages, setOrdersTotalPages] = useState<number>(1);
  const [ordersTotalAmountSum, setOrdersTotalAmountSum] = useState<number>(0);
  const [ordersSearch, setOrdersSearch] = useState<string>('');
  const [ordersSupplierFilter, setOrdersSupplierFilter] = useState<number | 'all'>('all');
  const [ordersCaisseFilter, setOrdersCaisseFilter] = useState<number | 'all'>('all');
  const [ordersPaymentFilter, setOrdersPaymentFilter] = useState<string>('all');
  const [ordersStartDate, setOrdersStartDate] = useState<string>('');
  const [ordersEndDate, setOrdersEndDate] = useState<string>('');

  // Selected Order for viewing details & editing
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [viewingOrderItems, setViewingOrderItems] = useState<any[]>([]);
  const [viewingOrderLoading, setViewingOrderLoading] = useState<boolean>(false);
  const [editingOrderNotes, setEditingOrderNotes] = useState<string>('');
  const [editingOrderPaymentMethod, setEditingOrderPaymentMethod] = useState<string>('');
  const [editingOrderCaisseId, setEditingOrderCaisseId] = useState<number | 0>(0);
  const [editingOrderPaidAmount, setEditingOrderPaidAmount] = useState<number>(0);
  const [editingOrderCreditAmount, setEditingOrderCreditAmount] = useState<number>(0);
  const [isEditingOrderMode, setIsEditingOrderMode] = useState<boolean>(false);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);

  // Supplier Price Comparison modal
  const [comparisonProduct, setComparisonProduct] = useState<Product | null>(null);

  // Add / Edit Product modal
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<{
    name: string;
    sku: string;
    barcode: string;
    category_id: number;
    primary_supplier_id: number;
    caisse_id: number;
    base_unit: string;
    stock_quantity: number;
    min_stock_alert: number;
    cost_price: number;
    selling_price: number;
    status: 'active' | 'inactive';
    is_favorite: number;
    notes: string;
    units: ProductUnit[];
    supplier_prices: ProductSupplierPrice[];
  }>({
    name: '',
    sku: '',
    barcode: '',
    category_id: 1,
    primary_supplier_id: 0,
    caisse_id: 0,
    base_unit: 'Pièce',
    stock_quantity: 0,
    min_stock_alert: 5,
    cost_price: 0,
    selling_price: 0,
    status: 'active',
    is_favorite: 0,
    notes: '',
    units: [
      { unit_name: 'Pièce (x1)', conversion_factor: 1, selling_price: 0, is_default: 1 }
    ],
    supplier_prices: []
  });

  // Product Mode: 'standard' (normal single piece buying & selling) vs 'cigarette' (Algerian KMS Paquet & Détail)
  const [productMode, setProductMode] = useState<'standard' | 'cigarette'>('standard');
  const [cigProductType, setCigProductType] = useState<'cigarette' | 'ocb' | 'custom'>('cigarette');
  const [cigPackQty, setCigPackQty] = useState<number>(5);
  const [cigUnitsPerPack, setCigUnitsPerPack] = useState<number>(20);
  const [cigPackCost, setCigPackCost] = useState<number>(0);
  const [cigPackPrice, setCigPackPrice] = useState<number>(0);
  const [cigUnitSellPrice, setCigUnitSellPrice] = useState<number>(20);
  const [cigMinStockPacks, setCigMinStockPacks] = useState<number>(2);

  // Helper: check if a category corresponds to Tabac & Cigarettes
  const isCigaretteCategory = (catId?: number) => {
    if (!catId) return false;
    const cat = categories.find(c => c.id === catId);
    if (!cat) return false;
    const name = (cat.name || '').toLowerCase();
    const code = (cat.code || '').toLowerCase();
    return code === 'tabac' || name.includes('tabac') || name.includes('cig');
  };

  // Fast inline stock adjustment modal
  const [stockAdjustmentModal, setStockAdjustmentModal] = useState<{ product: Product; newStock: number } | null>(null);

  // Toast alert
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Persist cart
  useEffect(() => {
    localStorage.setItem('kms_cart', JSON.stringify(cart));
  }, [cart]);

  // Load products with backend filters
  const fetchProducts = async () => {
    setLoading(true);
    try {
      if (window.electronAPI?.getProducts) {
        const filters = {
          search,
          categoryId: selectedCategory,
          supplierId: selectedSupplier,
          stockStatus,
          isFavorite: onlyFavorites ? 1 : undefined,
          minPrice: minPrice !== '' ? parseFloat(minPrice) : undefined,
          maxPrice: maxPrice !== '' ? parseFloat(maxPrice) : undefined,
          sortBy,
          page,
          pageSize
        };

        const res = await window.electronAPI.getProducts(filters);
        if (res.success && Array.isArray(res.products)) {
          setProducts(res.products);
          setTotalCount(res.totalCount || res.products.length);
          if (res.kpis) setKpis(res.kpis);

          // Initialize row selections with default units
          initializeRowSelections(res.products);
        }

        // Fetch categories, suppliers & caisses for filters if not loaded
        if (categories.length === 0 && window.electronAPI?.getCategories) {
          const catRes = await window.electronAPI.getCategories();
          if (catRes.success && Array.isArray(catRes.categories)) {
            setCategories(catRes.categories);
          }
        }

        if (suppliers.length === 0 && window.electronAPI?.getFournisseurs) {
          const supRes = await window.electronAPI.getFournisseurs();
          if (supRes.success && Array.isArray(supRes.fournisseurs)) {
            setSuppliers(supRes.fournisseurs);
          }
        }

        if (caisses.length === 0 && window.electronAPI?.getCaisses) {
          const caisseRes = await window.electronAPI.getCaisses({ page: 1, pageSize: 100 });
          if (caisseRes.success && Array.isArray(caisseRes.caisses)) {
            setCaisses(caisseRes.caisses);
          }
        }
      } else {
        // Fallback for browser testing
        let filtered = [...DEMO_PRODUCTS];

        if (search.trim()) {
          const q = search.toLowerCase();
          filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.includes(q));
        }

        if (selectedCategory !== 'all') {
          filtered = filtered.filter(p => p.category_id === selectedCategory);
        }

        if (selectedSupplier !== 'all') {
          filtered = filtered.filter(p => p.primary_supplier_id === selectedSupplier || p.supplier_prices?.some(sp => sp.supplier_id === selectedSupplier));
        }

        if (stockStatus === 'in_stock') {
          filtered = filtered.filter(p => p.stock_quantity > p.min_stock_alert);
        } else if (stockStatus === 'low_stock') {
          filtered = filtered.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_alert);
        } else if (stockStatus === 'out_of_stock') {
          filtered = filtered.filter(p => p.stock_quantity <= 0);
        }

        if (minPrice !== '') filtered = filtered.filter(p => p.selling_price >= parseFloat(minPrice));
        if (maxPrice !== '') filtered = filtered.filter(p => p.selling_price <= parseFloat(maxPrice));

        // Sort
        if (sortBy === 'name_desc') filtered.sort((a, b) => b.name.localeCompare(a.name));
        else if (sortBy === 'price_asc') filtered.sort((a, b) => a.selling_price - b.selling_price);
        else if (sortBy === 'price_desc') filtered.sort((a, b) => b.selling_price - a.selling_price);
        else if (sortBy === 'stock_asc') filtered.sort((a, b) => a.stock_quantity - b.stock_quantity);
        else if (sortBy === 'stock_desc') filtered.sort((a, b) => b.stock_quantity - a.stock_quantity);
        else filtered.sort((a, b) => a.name.localeCompare(b.name));

        setTotalCount(filtered.length);
        const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
        setProducts(paged);
        setCategories(DEMO_CATEGORIES);
        setSuppliers([
          { id: 1, name: 'SOPRIAM Distribution' },
          { id: 2, name: 'Maghreb Emballage' },
          { id: 3, name: 'Atlas Agro Négoce' },
          { id: 4, name: 'Global Tech' }
        ]);

        const outCount = filtered.filter(p => p.stock_quantity <= 0).length;
        const lowCount = filtered.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_alert).length;
        const totalVal = filtered.reduce((s, p) => s + (p.stock_quantity * p.cost_price), 0);
        setKpis({ totalProducts: filtered.length, outOfStock: outCount, lowStock: lowCount, totalValuation: totalVal });

        initializeRowSelections(paged);
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setAlert({ type: 'error', message: err.message || 'Erreur chargement catalogue KMS' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch paginated purchase orders history
  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      if (window.electronAPI?.getCartOrders) {
        const res = await window.electronAPI.getCartOrders({
          page: ordersPage,
          pageSize: ordersPageSize,
          orderType: 'purchase',
          supplierId: ordersSupplierFilter,
          caisseId: ordersCaisseFilter,
          paymentMethod: ordersPaymentFilter,
          startDate: ordersStartDate,
          endDate: ordersEndDate,
          search: ordersSearch
        });

        if (res.success && Array.isArray(res.orders)) {
          setOrders(res.orders);
          setOrdersTotalCount(res.totalCount || 0);
          setOrdersTotalPages(res.totalPages || 1);
          setOrdersTotalAmountSum(res.totalAmountSum || 0);
        }
      }
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setAlert({ type: 'error', message: err.message || 'Erreur chargement historique des achats' });
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (mainTab === 'purchases_history') {
      fetchOrders();
    }
  }, [mainTab, ordersPage, ordersPageSize, ordersSupplierFilter, ordersCaisseFilter, ordersPaymentFilter, ordersStartDate, ordersEndDate, ordersSearch]);

  // Open Order Details Modal
  const handleOpenOrderDetails = async (orderId: number) => {
    setViewingOrderLoading(true);
    setIsEditingOrderMode(false);
    try {
      if (window.electronAPI?.getCartOrderById) {
        const res = await window.electronAPI.getCartOrderById(orderId);
        if (res.success && res.order) {
          setViewingOrder(res.order);
          setViewingOrderItems(res.items || []);
          setEditingOrderNotes(res.order.notes || '');
          setEditingOrderPaymentMethod(res.order.payment_method || 'especes');
          setEditingOrderCaisseId(res.order.caisse_id || 0);
          const total = parseFloat(res.order.total_amount) || 0;
          const paid = res.order.paid_amount !== undefined ? parseFloat(res.order.paid_amount) : total;
          setEditingOrderPaidAmount(paid);
          setEditingOrderCreditAmount(res.order.credit_amount !== undefined ? parseFloat(res.order.credit_amount) : Math.max(0, total - paid));
        } else {
          throw new Error(res.message);
        }
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Impossible de charger les détails du bon d\'achat' });
    } finally {
      setViewingOrderLoading(false);
    }
  };

  // Delete Order (Rollback stock, caisse, credit)
  const handleDeleteOrder = async (orderId: number) => {
    if (!isAdmin) {
      setAlert({ type: 'error', message: t.adminOnlyNotice });
      return;
    }

    try {
      if (window.electronAPI?.deleteCartOrder) {
        const res = await window.electronAPI.deleteCartOrder(orderId);
        if (!res.success) throw new Error(res.message);
      }

      setAlert({
        type: 'success',
        message: `Bon de commande #${orderId} annulé avec succès. Les stocks, la caisse et la dette fournisseur ont été automatiquement rétablis.`
      });

      setDeletingOrderId(null);
      setViewingOrder(null);
      fetchOrders();
      fetchProducts();

      // Refresh suppliers and caisses
      if (window.electronAPI?.getFournisseurs) {
        const supRes = await window.electronAPI.getFournisseurs();
        if (supRes.success && Array.isArray(supRes.fournisseurs)) {
          setSuppliers(supRes.fournisseurs);
        }
      }
      if (window.electronAPI?.getCaisses) {
        const caisseRes = await window.electronAPI.getCaisses({ page: 1, pageSize: 100 });
        if (caisseRes.success && Array.isArray(caisseRes.caisses)) {
          setCaisses(caisseRes.caisses);
        }
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Erreur lors de la suppression du bon de commande' });
    }
  };

  // Save Order Edits (Notes, Caisse, Mode, Paid amount, Credit amount)
  const handleSaveOrderEdits = async () => {
    if (!viewingOrder) return;
    try {
      if (window.electronAPI?.updateCartOrder) {
        const res = await window.electronAPI.updateCartOrder({
          orderId: viewingOrder.id,
          notes: editingOrderNotes,
          paymentMethod: editingOrderPaymentMethod,
          caisseId: editingOrderCaisseId || null,
          paidAmount: editingOrderPaidAmount,
          creditAmount: editingOrderCreditAmount
        });
        if (!res.success) throw new Error(res.message);
      }

      setAlert({ type: 'success', message: `Bon d'achat #${viewingOrder.id} mis à jour : mouvement de caisse et dette fournisseur recalculés.` });
      setIsEditingOrderMode(false);
      handleOpenOrderDetails(viewingOrder.id);
      fetchOrders();

      // Refresh suppliers and caisses so debts and balances reflect immediately
      if (window.electronAPI?.getFournisseurs) {
        const supRes = await window.electronAPI.getFournisseurs();
        if (supRes.success && Array.isArray(supRes.fournisseurs)) {
          setSuppliers(supRes.fournisseurs);
        }
      }
      if (window.electronAPI?.getCaisses) {
        const caisseRes = await window.electronAPI.getCaisses({ page: 1, pageSize: 100 });
        if (caisseRes.success && Array.isArray(caisseRes.caisses)) {
          setCaisses(caisseRes.caisses);
        }
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Erreur lors de la modification du bon' });
    }
  };

  // Pre-populate unit and quantity selections for each product row
  const initializeRowSelections = (prods: Product[]) => {
    setRowSelections(prev => {
      const updated = { ...prev };
      for (const p of prods) {
        const defaultUnit = p.units?.find(u => u.is_default) || p.units?.[0] || {
          unit_name: p.base_unit,
          conversion_factor: 1,
          selling_price: p.selling_price,
          cost_price: p.cost_price
        };
        const existing = updated[p.id];
        const unitName = existing?.unitName || defaultUnit.unit_name;
        const factor = existing?.factor || defaultUnit.conversion_factor || 1;
        const trueCost = resolveProductWholesalePrice(p, unitName, factor, p.primary_supplier_id);
        const currentSelling = existing?.sellingPrice || defaultUnit.selling_price || p.selling_price || 0;

        updated[p.id] = {
          unitName,
          factor,
          sellingPrice: currentSelling,
          purchasePrice: trueCost > 0 ? trueCost : ((defaultUnit.cost_price && defaultUnit.cost_price > 0) ? defaultUnit.cost_price : ((p.cost_price || 0) * factor)),
          quantity: existing?.quantity || 1
        };
      }
      return updated;
    });
  };

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory, selectedSupplier, stockStatus, onlyFavorites, minPrice, maxPrice, sortBy, page, pageSize]);

  // Auto-sync cart items with catalog to guarantee strictly wholesale purchase prices
  // (Fixes any legacy cart items saved at retail selling price)
  useEffect(() => {
    if (!products || products.length === 0 || cart.length === 0) return;

    let hasChange = false;
    const syncedCart = cart.map(item => {
      const prod = products.find(p => p.id === item.productId);
      if (!prod) return item;

      const unit = prod.units?.find(u => u.unit_name === item.unitName) ||
                   prod.units?.find(u => u.is_default) ||
                   prod.units?.[0];

      const truePurchasePrice = resolveProductWholesalePrice(
        prod,
        item.unitName,
        item.conversionFactor,
        item.supplierId
      );

      const trueSellingPrice = unit?.selling_price || prod.selling_price || 0;

      // Detect if price in cart was incorrectly set to retail selling price or needs recalculation
      if (truePurchasePrice > 0 && Math.abs(item.price - truePurchasePrice) > 0.01) {
        hasChange = true;
        return {
          ...item,
          price: truePurchasePrice,
          purchasePrice: truePurchasePrice,
          sellingPrice: trueSellingPrice
        };
      } else if (!item.sellingPrice || Math.abs((item.sellingPrice || 0) - trueSellingPrice) > 0.01) {
        hasChange = true;
        return {
          ...item,
          sellingPrice: trueSellingPrice
        };
      }
      return item;
    });

    if (hasChange) {
      setCart(syncedCart);
    }
  }, [products]);

  // Currency helper
  const formatCurrency = (val: number) => {
    return (Number(val) || 0).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' DA';
  };


  // Add item directly to Cart (Commande / Achat Fournisseur)
  const handleAddToCart = (product: Product, overrideSupplier?: any) => {
    const sel = rowSelections[product.id];
    const defaultUnit = product.units?.find(u => u.is_default) || product.units?.[0];
    const unitName = sel?.unitName || defaultUnit?.unit_name || product.base_unit;
    const factor = sel?.factor || defaultUnit?.conversion_factor || 1;
    const targetSupplierId = overrideSupplier?.supplier_id || product.primary_supplier_id;
    const targetSupplierName = overrideSupplier?.supplier_name || product.supplier_name;

    // CRITICAL: Guaranteed wholesale purchase price (NEVER client retail selling price)
    let purchasePrice = 0;
    if (overrideSupplier && overrideSupplier.purchase_price > 0) {
      purchasePrice = overrideSupplier.purchase_price;
    } else if (sel?.purchasePrice !== undefined && sel.purchasePrice > 0) {
      purchasePrice = sel.purchasePrice;
    } else {
      purchasePrice = resolveProductWholesalePrice(product, unitName, factor, targetSupplierId);
    }

    // Safety fallback
    if (purchasePrice <= 0) {
      purchasePrice = (defaultUnit?.cost_price !== undefined && defaultUnit.cost_price > 0)
        ? defaultUnit.cost_price
        : ((product.cost_price || 0) * factor);
    }

    const sellingPrice = sel?.sellingPrice ?? defaultUnit?.selling_price ?? product.selling_price;
    const quantity = sel?.quantity || 1;

    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.productId === product.id && item.unitName === unitName);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].quantity += quantity;
        next[existingIndex].price = purchasePrice; // Always use wholesale price
        next[existingIndex].purchasePrice = purchasePrice;
        next[existingIndex].sellingPrice = sellingPrice;
        return next;
      } else {
        const newItem: CartItem = {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          unitName: unitName,
          conversionFactor: factor,
          price: purchasePrice, // PRIX D'ACHAT EN GROS
          purchasePrice: purchasePrice,
          sellingPrice: sellingPrice,
          quantity: quantity,
          supplierId: targetSupplierId,
          supplierName: targetSupplierName,
          caisseId: product.caisse_id || undefined,
          caisseName: product.caisse_name || undefined
        };
        return [newItem, ...prev];
      }
    });

    setAlert({
      type: 'success',
      message: `+${quantity} ${unitName} "${product.name}" ajouté à la commande fournisseur (${formatCurrency(purchasePrice)} / unité)`
    });
  };

  // Cart totals
  const cartSummary = useMemo(() => {
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return { itemCount, totalAmount };
  }, [cart]);

  // Group cart items by supplier to calculate subtotal & versement for each supplier
  const cartSuppliersBreakdown = useMemo(() => {
    const groups: Record<string, {
      supplierId: number | null;
      supplierName: string;
      currentCredit: number;
      items: CartItem[];
      subtotal: number;
      itemCount: number;
    }> = {};

    for (const item of cart) {
      const sId = cartSupplierId !== 'all' 
        ? Number(cartSupplierId) 
        : (item.supplierId ? Number(item.supplierId) : null);
      const sKey = sId ? String(sId) : 'unassigned';
      
      if (!groups[sKey]) {
        const foundSupp = sId ? suppliers.find(s => s.id === sId) : null;
        groups[sKey] = {
          supplierId: sId,
          supplierName: foundSupp ? foundSupp.name : (item.supplierName || 'Divers / Sans fournisseur'),
          currentCredit: foundSupp ? (Number(foundSupp.current_credit) || 0) : 0,
          items: [],
          subtotal: 0,
          itemCount: 0
        };
      }
      const lineTotal = (item.price || 0) * (item.quantity || 1);
      groups[sKey].items.push(item);
      groups[sKey].subtotal += lineTotal;
      groups[sKey].itemCount += (item.quantity || 1);
    }

    return Object.values(groups);
  }, [cart, cartSupplierId, suppliers]);

  // Manually re-sync cart items with current wholesale prices
  const handleManualSyncCart = () => {
    if (cart.length === 0) return;
    let count = 0;
    const syncedCart = cart.map(item => {
      const prod = products.find(p => p.id === item.productId);
      if (!prod) return item;
      const unit = prod.units?.find(u => u.unit_name === item.unitName) ||
                   prod.units?.find(u => u.is_default) ||
                   prod.units?.[0];
      const truePurchasePrice = resolveProductWholesalePrice(
        prod,
        item.unitName,
        item.conversionFactor,
        item.supplierId
      );
      const trueSellingPrice = unit?.selling_price || prod.selling_price || 0;
      if (truePurchasePrice > 0 && Math.abs(item.price - truePurchasePrice) > 0.01) {
        count++;
        return {
          ...item,
          price: truePurchasePrice,
          purchasePrice: truePurchasePrice,
          sellingPrice: trueSellingPrice
        };
      }
      return item;
    });
    setCart(syncedCart);
    setAlert({
      type: 'success',
      message: count > 0 ? `Tarifs d'achat grossiste mis à jour (${count} article(s))` : 'Les prix du bon de commande sont déjà parfaitement synchronisés au tarif grossiste.'
    });
  };

  // Checkout cart
  const handleCheckoutCart = async (orderType: 'purchase' | 'sale' = 'purchase') => {
    if (cart.length === 0) return;

    try {
      if (window.electronAPI?.createCartOrder) {
        // Resolve default caisse: if cartCaisseId is 'auto', use the first product's caisse or default caisse
        let finalCaisseId: number | null = null;
        if (cartCaisseId !== 'auto') {
          finalCaisseId = Number(cartCaisseId);
        } else {
          const itemWithCaisse = cart.find(ci => ci.caisseId);
          if (itemWithCaisse && itemWithCaisse.caisseId) {
            finalCaisseId = itemWithCaisse.caisseId;
          } else {
            const defCaisse = caisses.find(c => c.is_default === 1) || caisses[0];
            if (defCaisse) finalCaisseId = defCaisse.id;
          }
        }

        const supplierVersements = cartSuppliersBreakdown.map(s => {
          const sKey = s.supplierId ? String(s.supplierId) : 'unassigned';
          const vers = versementsBySupplier[sKey] !== undefined ? versementsBySupplier[sKey] : s.subtotal;
          return {
            supplierId: s.supplierId,
            supplierName: s.supplierName,
            totalAmount: s.subtotal,
            versement: vers,
            remainingCredit: Math.max(0, s.subtotal - vers),
            caisseId: finalCaisseId
          };
        });

        const totalVersement = supplierVersements.reduce((sum, sv) => sum + sv.versement, 0);
        const totalCredit = supplierVersements.reduce((sum, sv) => sum + sv.remainingCredit, 0);

        const res = await window.electronAPI.createCartOrder({
          items: cart,
          supplierId: cartSupplierId !== 'all' ? cartSupplierId : (cartSuppliersBreakdown[0]?.supplierId || null),
          caisseId: finalCaisseId,
          orderType,
          paymentMethod: totalCredit <= 0 ? cartPaymentMethod : (totalVersement <= 0 ? 'credit' : 'mixte'),
          affectCaisse: cartAffectCaisse && totalVersement > 0,
          userName: currentUser?.full_name || currentUser?.username || 'Admin',
          supplierVersements,
          versement: totalVersement,
          notes: `Bon d'Achat KMS (${cartSummary.itemCount} articles) - Versé: ${formatCurrency(totalVersement)} | Dette fournisseur: ${formatCurrency(totalCredit)}`
        });
        if (!res.success) throw new Error(res.message);
      } else {
        // Fallback: update local stock
        setProducts(prev => prev.map(p => {
          const cartItem = cart.find(ci => ci.productId === p.id);
          if (cartItem && orderType === 'purchase') {
            const added = cartItem.quantity * cartItem.conversionFactor;
            return { ...p, stock_quantity: p.stock_quantity + added };
          }
          return p;
        }));
      }

      setAlert({
        type: 'success',
        message: `${t.orderCreated} (${cartSummary.itemCount} articles - Total: ${formatCurrency(cartSummary.totalAmount)})`
      });
      setCart([]);
      setVersementsBySupplier({});
      setIsCartOpen(false);
      fetchProducts();

      // Refresh suppliers and caisses so credit balance updates reflect immediately
      if (window.electronAPI?.getFournisseurs) {
        const supRes = await window.electronAPI.getFournisseurs();
        if (supRes.success && Array.isArray(supRes.fournisseurs)) {
          setSuppliers(supRes.fournisseurs);
        }
      }
      if (window.electronAPI?.getCaisses) {
        const caisseRes = await window.electronAPI.getCaisses({ page: 1, pageSize: 100 });
        if (caisseRes.success && Array.isArray(caisseRes.caisses)) {
          setCaisses(caisseRes.caisses);
        }
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Erreur validation panier' });
    }
  };

  // Open Product Modal (Create or Edit)
  const handleOpenProductModal = (product?: Product) => {
    if (!isAdmin) {
      setAlert({ type: 'error', message: t.adminOnlyNotice });
      return;
    }

    if (product) {
      setEditingProduct(product);

      // Detect if cigarette / OCB product
      const isCigCat = isCigaretteCategory(product.category_id);
      const isCigUnit = product.base_unit?.toLowerCase().includes('tige') || product.base_unit?.toLowerCase().includes('cig') || product.base_unit?.toLowerCase().includes('feuille');
      const hasPackUnit = product.units?.some(u => u.unit_name.toLowerCase().includes('paquet') || u.unit_name.toLowerCase().includes('carnet'));
      const isCig = isCigCat || isCigUnit || hasPackUnit;

      const isOcb = product.base_unit?.toLowerCase().includes('feuille') || product.name?.toLowerCase().includes('ocb');
      const packUnit = product.units?.find(u => u.conversion_factor > 1);
      const singleUnit = product.units?.find(u => u.conversion_factor === 1);

      const unitsPerPack = packUnit?.conversion_factor || (isOcb ? 32 : 20);
      const packQty = unitsPerPack > 0 ? Math.round(product.stock_quantity / unitsPerPack) : 0;
      const packCost = packUnit?.cost_price || (product.cost_price * unitsPerPack);
      const packPrice = packUnit?.selling_price || (product.selling_price * unitsPerPack);
      const unitSell = singleUnit?.selling_price || product.selling_price || (isOcb ? 10 : 20);
      const minPacks = unitsPerPack > 0 ? Math.ceil(product.min_stock_alert / unitsPerPack) : 2;

      setProductMode(isCig ? 'cigarette' : 'standard');
      setCigProductType(isOcb ? 'ocb' : 'cigarette');
      setCigUnitsPerPack(unitsPerPack);
      setCigPackQty(packQty);
      setCigPackCost(packCost);
      setCigPackPrice(packPrice);
      setCigUnitSellPrice(unitSell);
      setCigMinStockPacks(minPacks);

      setProductForm({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode || '',
        category_id: product.category_id || 1,
        primary_supplier_id: product.primary_supplier_id || 0,
        caisse_id: product.caisse_id || 0,
        base_unit: product.base_unit || (isCig ? (isOcb ? 'Feuille' : 'Tige') : 'Pièce'),
        stock_quantity: product.stock_quantity || 0,
        min_stock_alert: product.min_stock_alert || 5,
        cost_price: product.cost_price || 0,
        selling_price: product.selling_price || 0,
        status: product.status || 'active',
        is_favorite: product.is_favorite ? 1 : 0,
        notes: product.notes || '',
        units: product.units && product.units.length > 0 ? [...product.units] : [
          { unit_name: product.base_unit, conversion_factor: 1, selling_price: product.selling_price, is_default: 1 }
        ],
        supplier_prices: product.supplier_prices ? [...product.supplier_prices] : []
      });
    } else {
      setEditingProduct(null);

      // Determine initial category
      let defaultCatId = categories[0]?.id || 1;
      if (selectedCategory !== 'all') {
        defaultCatId = Number(selectedCategory);
      }
      const isCig = isCigaretteCategory(defaultCatId);

      setProductMode(isCig ? 'cigarette' : 'standard');
      setCigProductType('cigarette');
      setCigUnitsPerPack(20);
      setCigPackQty(0);
      setCigPackCost(0);
      setCigPackPrice(0);
      setCigUnitSellPrice(20);
      setCigMinStockPacks(2);

      setProductForm({
        name: '',
        sku: 'SKU-' + Math.floor(1000 + Math.random() * 9000),
        barcode: '',
        category_id: defaultCatId,
        primary_supplier_id: suppliers[0]?.id || 0,
        caisse_id: caisses[0]?.id || 0,
        base_unit: isCig ? 'Tige' : 'Pièce',
        stock_quantity: 0,
        min_stock_alert: 5,
        cost_price: 0,
        selling_price: 0,
        status: 'active',
        is_favorite: 0,
        notes: '',
        units: [
          { unit_name: isCig ? 'Tige (x1)' : 'Pièce (x1)', conversion_factor: 1, selling_price: 0, is_default: 1 }
        ],
        supplier_prices: []
      });
    }
    setIsProductModalOpen(true);
  };

  // Save Product (Create or Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setAlert({ type: 'error', message: t.adminOnlyNotice });
      return;
    }

    try {
      let finalData = { ...productForm };

      if (productMode === 'cigarette') {
        // KMS Algeria Tobacco & Cigarettes Mode
        const isOcb = cigProductType === 'ocb' || finalData.name.toLowerCase().includes('ocb');
        const baseUnit = isOcb ? 'Feuille' : 'Tige';
        const packLabel = isOcb ? 'Carnet' : 'Paquet';
        const unitsPerPack = Math.max(1, Number(cigUnitsPerPack) || (isOcb ? 32 : 20));
        const packQty = Math.max(0, Number(cigPackQty) || 0);
        const packCost = Math.max(0, Number(cigPackCost) || 0);
        const packPrice = Math.max(0, Number(cigPackPrice) || 0);
        const unitSell = Math.max(0, Number(cigUnitSellPrice) || (isOcb ? 10 : 20));
        const minPacks = Math.max(0, Number(cigMinStockPacks) || 2);

        const totalStock = packQty * unitsPerPack;
        const totalMinAlert = minPacks * unitsPerPack;
        const unitCost = packCost > 0 ? (packCost / unitsPerPack) : 0;

        const units: ProductUnit[] = [
          {
            unit_name: `${baseUnit} (x1)`,
            conversion_factor: 1,
            selling_price: unitSell,
            cost_price: unitCost,
            is_default: 0
          },
          {
            unit_name: `${packLabel} (x${unitsPerPack})`,
            conversion_factor: unitsPerPack,
            selling_price: packPrice,
            cost_price: packCost,
            is_default: 1
          }
        ];

        finalData = {
          ...finalData,
          base_unit: baseUnit,
          stock_quantity: totalStock,
          min_stock_alert: totalMinAlert,
          cost_price: unitCost,
          selling_price: unitSell,
          units: units,
          supplier_prices: finalData.primary_supplier_id > 0 ? [
            {
              supplier_id: finalData.primary_supplier_id,
              purchase_price: packCost,
              is_primary: 1
            }
          ] : []
        };
      } else {
        // Mode Vente Normale (Pièce standard)
        const baseUnit = finalData.base_unit?.trim() || 'Pièce';
        const costPrice = Math.max(0, Number(finalData.cost_price) || 0);
        const sellPrice = Math.max(0, Number(finalData.selling_price) || 0);
        const stockQty = Math.max(0, Number(finalData.stock_quantity) || 0);
        const minAlert = Math.max(0, Number(finalData.min_stock_alert) || 5);

        const units: ProductUnit[] = [
          {
            unit_name: `${baseUnit} (x1)`,
            conversion_factor: 1,
            selling_price: sellPrice,
            cost_price: costPrice,
            is_default: 1
          }
        ];

        finalData = {
          ...finalData,
          base_unit: baseUnit,
          stock_quantity: stockQty,
          min_stock_alert: minAlert,
          cost_price: costPrice,
          selling_price: sellPrice,
          units: units,
          supplier_prices: finalData.primary_supplier_id > 0 ? [
            {
              supplier_id: finalData.primary_supplier_id,
              purchase_price: costPrice,
              is_primary: 1
            }
          ] : []
        };
      }

      if (editingProduct) {
        if (window.electronAPI?.updateProduct) {
          const res = await window.electronAPI.updateProduct({
            id: editingProduct.id,
            ...finalData
          });
          if (!res.success) throw new Error(res.message);
        } else {
          setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...finalData } : p));
        }
        setAlert({ type: 'success', message: t.productSaved });
      } else {
        if (window.electronAPI?.createProduct) {
          const res = await window.electronAPI.createProduct(finalData);
          if (!res.success) throw new Error(res.message);
        } else {
          const newP: Product = {
            id: Date.now(),
            ...finalData,
            category_name: categories.find(c => c.id === finalData.category_id)?.name,
            supplier_name: suppliers.find(s => s.id === finalData.primary_supplier_id)?.name
          };
          setProducts(prev => [newP, ...prev]);
        }
        setAlert({ type: 'success', message: t.productSaved });
      }

      setIsProductModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Erreur enregistrement produit' });
    }
  };

  // Delete product
  const handleDeleteProduct = async (productId: number, productName: string) => {
    if (!isAdmin) {
      setAlert({ type: 'error', message: t.adminOnlyNotice });
      return;
    }

    if (!window.confirm(`Confirmer la suppression du produit "${productName}" ?`)) return;

    try {
      if (window.electronAPI?.deleteProduct) {
        const res = await window.electronAPI.deleteProduct(productId);
        if (!res.success) throw new Error(res.message);
      } else {
        setProducts(prev => prev.filter(p => p.id !== productId));
      }

      setAlert({ type: 'success', message: t.productDeleted });
      fetchProducts();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Erreur suppression produit' });
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (productId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      if (window.electronAPI?.toggleProductFavorite) {
        const res = await window.electronAPI.toggleProductFavorite(productId);
        if (res.success) {
          setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_favorite: res.is_favorite } : p));
        }
      } else {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_favorite: p.is_favorite ? 0 : 1 } : p));
      }
    } catch (err: any) {
      console.error('Error toggling favorite:', err);
    }
  };

  // Fast inline stock adjustment save
  const handleSaveStockAdjustment = async () => {
    if (!stockAdjustmentModal) return;
    try {
      if (window.electronAPI?.updateProductStock) {
        const res = await window.electronAPI.updateProductStock({
          productId: stockAdjustmentModal.product.id,
          newStock: stockAdjustmentModal.newStock,
          reason: 'Ajustement rapide KMS'
        });
        if (!res.success) throw new Error(res.message);
      } else {
        setProducts(prev => prev.map(p => p.id === stockAdjustmentModal.product.id ? { ...p, stock_quantity: stockAdjustmentModal.newStock } : p));
      }
      setAlert({ type: 'success', message: 'Stock mis à jour avec succès !' });
      setStockAdjustmentModal(null);
      fetchProducts();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  return (
    <div style={{ padding: '20px 24px', maxWidth: '1480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      
      {/* Toast Alert */}
      {alert && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          zIndex: 9999,
          background: alert.type === 'success' ? '#15803d' : '#b91c1c',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {alert.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
              <Package size={20} />
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {t.productsHeading}
            </h1>
            <span className="badge-clean badge-green" style={{ fontSize: '11px' }}>
              KMS POS & Wholesales
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            {t.productsSubheading}
          </p>
        </div>

        {/* Global Controls & Cart Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchProducts}
            className="btn-secondary"
            title="Rafraîchir"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {t.refresh}
          </button>

          {/* Quick Floating Cart Trigger */}
          <button
            type="button"
            onClick={() => setIsCartOpen(!isCartOpen)}
            className="btn-green"
            style={{ 
              position: 'relative', 
              background: '#0f172a', 
              borderColor: '#0f172a',
              color: '#ffffff',
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '8px 16px'
            }}
          >
            <ShoppingCart size={16} />
            <span>{t.purchaseOrderBtn}</span>
            {cartSummary.itemCount > 0 && (
              <span style={{ 
                background: '#16a34a', 
                color: '#ffffff', 
                borderRadius: '12px', 
                padding: '2px 8px', 
                fontSize: '11px', 
                fontWeight: 800 
              }}>
                {cartSummary.itemCount} ({formatCurrency(cartSummary.totalAmount)})
              </span>
            )}
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => handleOpenProductModal()}
              className="btn-green"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> {t.addProduct}
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
        <div className="clean-card" style={{ padding: '14px 18px', borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            {t.articlesReferenced}
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {kpis.totalProducts} <span style={{ fontSize: '12px', fontWeight: 600, color: '#16a34a' }}>{t.inCatalog}</span>
          </div>
        </div>

        <div className="clean-card" style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
            {t.lowStock}
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#b45309', marginTop: '2px' }}>
            {kpis.lowStock} <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{t.toRestock}</span>
          </div>
        </div>

        <div className="clean-card" style={{ padding: '14px 18px', borderLeft: '4px solid #dc2626' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>
            {t.outOfStock}
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
            {kpis.outOfStock} <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{t.completeStockout}</span>
          </div>
        </div>

        {canViewCost && (
          <div className="clean-card" style={{ padding: '14px 18px', borderLeft: '4px solid #2563eb' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>
              {t.stockValueCost}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1e40af', marginTop: '2px' }}>
              {formatCurrency(kpis.totalValuation)}
            </div>
          </div>
        )}
      </div>

      {/* Sub Tabs: Catalogue & Stock vs Historique des Achats */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '2px' }}>
        <button
          type="button"
          onClick={() => setMainTab('catalog')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            border: 'none',
            background: 'transparent',
            borderBottom: mainTab === 'catalog' ? '3px solid #16a34a' : '3px solid transparent',
            color: mainTab === 'catalog' ? '#15803d' : '#64748b',
            fontWeight: mainTab === 'catalog' ? 800 : 600,
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.15s ease'
          }}
        >
          <Package size={17} />
          <span>{t.catalogTab}</span>
          <span style={{ 
            fontSize: '11px', 
            background: mainTab === 'catalog' ? '#dcfce7' : '#f1f5f9',
            color: mainTab === 'catalog' ? '#166534' : '#64748b',
            padding: '2px 8px',
            borderRadius: '10px',
            fontWeight: 700
          }}>
            {totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMainTab('purchases_history');
            fetchOrders();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            border: 'none',
            background: 'transparent',
            borderBottom: mainTab === 'purchases_history' ? '3px solid #16a34a' : '3px solid transparent',
            color: mainTab === 'purchases_history' ? '#15803d' : '#64748b',
            fontWeight: mainTab === 'purchases_history' ? 800 : 600,
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.15s ease'
          }}
        >
          <History size={17} />
          <span>{t.purchasesHistoryTab}</span>
          <span style={{ 
            fontSize: '11px', 
            background: mainTab === 'purchases_history' ? '#dcfce7' : '#f1f5f9',
            color: mainTab === 'purchases_history' ? '#166534' : '#64748b',
            padding: '2px 8px',
            borderRadius: '10px',
            fontWeight: 700
          }}>
            {ordersTotalCount}
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: CATALOGUE & STOCK */}
      {/* ========================================================= */}
      {mainTab === 'catalog' && (
        <>
          {/* Advanced Backend Filter Bar */}
          <div className="clean-card" style={{ padding: '16px 20px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Row 1: Search, Category Pills, Stock chips */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Fast Search input */}
          <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder={t.fastSearch}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input-clean"
              style={{ paddingLeft: '32px', fontSize: '12px' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '8px', top: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Quick Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => { setSelectedCategory('all'); setPage(1); }}
              style={{
                padding: '5px 12px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: selectedCategory === 'all' ? '#16a34a' : '#e2e8f0',
                background: selectedCategory === 'all' ? '#dcfce7' : '#ffffff',
                color: selectedCategory === 'all' ? '#15803d' : '#475569',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {t.allCategories}
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: selectedCategory === cat.id ? cat.color || '#16a34a' : '#e2e8f0',
                  background: selectedCategory === cat.id ? '#f1f5f9' : '#ffffff',
                  color: selectedCategory === cat.id ? '#0f172a' : '#64748b',
                  fontSize: '11px',
                  fontWeight: selectedCategory === cat.id ? 800 : 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color || '#16a34a' }}></span>
                {cat.name}
              </button>
            ))}
          </div>

          {/* Stock status filter chips */}
          <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
            <button
              type="button"
              onClick={() => { setStockStatus('all'); setPage(1); }}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                background: stockStatus === 'all' ? '#ffffff' : 'transparent',
                color: stockStatus === 'all' ? '#0f172a' : '#64748b',
                boxShadow: stockStatus === 'all' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              {t.allFilter}
            </button>
            <button
              type="button"
              onClick={() => { setStockStatus('in_stock'); setPage(1); }}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                background: stockStatus === 'in_stock' ? '#ffffff' : 'transparent',
                color: stockStatus === 'in_stock' ? '#15803d' : '#64748b',
                boxShadow: stockStatus === 'in_stock' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              {t.inStock}
            </button>
            <button
              type="button"
              onClick={() => { setStockStatus('low_stock'); setPage(1); }}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                background: stockStatus === 'low_stock' ? '#ffffff' : 'transparent',
                color: stockStatus === 'low_stock' ? '#b45309' : '#64748b',
                boxShadow: stockStatus === 'low_stock' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              {t.lowStock}
            </button>
            <button
              type="button"
              onClick={() => { setStockStatus('out_of_stock'); setPage(1); }}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                background: stockStatus === 'out_of_stock' ? '#ffffff' : 'transparent',
                color: stockStatus === 'out_of_stock' ? '#dc2626' : '#64748b',
                boxShadow: stockStatus === 'out_of_stock' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              {t.outOfStock}
            </button>
            <button
              type="button"
              onClick={() => { setOnlyFavorites(prev => !prev); setPage(1); }}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: onlyFavorites ? '#fef08a' : 'transparent',
                color: onlyFavorites ? '#854d0e' : '#64748b',
                boxShadow: onlyFavorites ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
              }}
              title="Afficher uniquement les articles favoris (POS)"
            >
              <Star size={11} fill={onlyFavorites ? '#854d0e' : 'none'} />
              <span>Favoris</span>
            </button>
          </div>

        </div>

        {/* Row 2: Secondary Dropdown Filters (Supplier, Price range, Sort) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
          {/* Supplier Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{t.supplier}:</span>
            <select
              value={selectedSupplier}
              onChange={e => { setSelectedSupplier(e.target.value === 'all' ? 'all' : Number(e.target.value)); setPage(1); }}
              className="input-clean"
              style={{ fontSize: '11px', padding: '5px 10px', width: 'auto' }}
            >
              <option value="all">{t.allSuppliers}</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Price Range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{t.priceDA}</span>
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              className="input-clean"
              style={{ width: '70px', fontSize: '11px', padding: '4px 8px' }}
            />
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>-</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              className="input-clean"
              style={{ width: '70px', fontSize: '11px', padding: '4px 8px' }}
            />
          </div>

          {/* Sort By */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{t.sortBy}</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="input-clean"
              style={{ fontSize: '11px', padding: '5px 10px', width: 'auto' }}
            >
              <option value="name_asc">{t.sortNameAsc}</option>
              <option value="name_desc">{t.sortNameDesc}</option>
              <option value="price_asc">{t.sortPriceCheap}</option>
              <option value="price_desc">{t.sortPriceExp}</option>
              <option value="stock_asc">{t.sortStockAsc}</option>
              <option value="stock_desc">{t.sortStockDesc}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table: Clean, Photo-less, High-Density Product Grid */}
      <div className="clean-card" style={{ overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-clean" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ width: '30%', padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  {t.articleRef}
                </th>
                <th style={{ width: '24%', padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  {t.stockAvailable}
                </th>
                <th style={{ width: '20%', padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  {t.unitsAndPrices}
                </th>
                <th style={{ width: '12%', padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  {t.supplierShort}
                </th>
                <th style={{ width: '14%', padding: '10px 14px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  {t.actions}
                </th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                    <Package size={44} style={{ margin: '0 auto 12px', opacity: 0.35 }} />
                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#334155' }}>
                      {search || selectedCategory !== 'all' || selectedSupplier !== 'all' || stockStatus !== 'all'
                        ? t.noArticlesMatchFilter
                        : t.noCatalogProducts}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', maxWidth: '420px', margin: '6px auto 16px', lineHeight: 1.5 }}>
                      {search || selectedCategory !== 'all' || selectedSupplier !== 'all' || stockStatus !== 'all'
                        ? t.resetFiltersHint
                        : t.addFirstProductHint}
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleOpenProductModal()}
                        className="btn-green"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '0 auto', padding: '8px 18px', fontSize: '13px' }}
                      >
                        <Plus size={15} />
                        {t.addProduct}
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                products.map(product => {
                  const isCig = isCigaretteProduct(product);
                  const isOcb = (product.name || '').toLowerCase().includes('ocb') || (product.base_unit || '').toLowerCase().includes('feuille');
                  const packUnit = product.units?.find(u => u.conversion_factor > 1);
                  const singleUnit = product.units?.find(u => u.conversion_factor === 1);
                  const packFactor = packUnit?.conversion_factor || (isOcb ? 32 : 20);

                  const defaultU = product.units?.find(u => u.is_default) || product.units?.[0];
                  const costFallback = resolveProductWholesalePrice(product, defaultU?.unit_name, defaultU?.conversion_factor, product.primary_supplier_id);
                  const currentSelection = rowSelections[product.id] || {
                    unitName: defaultU?.unit_name || product.base_unit,
                    factor: defaultU?.conversion_factor || 1,
                    sellingPrice: defaultU?.selling_price || product.selling_price || 0,
                    purchasePrice: costFallback > 0 ? costFallback : ((defaultU?.cost_price && defaultU.cost_price > 0) ? defaultU.cost_price : ((product.cost_price || 0) * (defaultU?.conversion_factor || 1))),
                    quantity: 1
                  };

                  const isOut = product.stock_quantity <= 0;
                  const isLow = product.stock_quantity > 0 && product.stock_quantity <= product.min_stock_alert;

                  return (
                    <tr 
                      key={product.id} 
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        background: isOut ? '#fffdfd' : 'transparent',
                        transition: 'background 0.15s'
                      }}
                    >
                      {/* 1. Article & Référence */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={(e) => handleToggleFavorite(product.id, e)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: product.is_favorite ? '#eab308' : '#cbd5e1'
                              }}
                              title={product.is_favorite ? "Retirer des favoris caisse" : "Ajouter aux favoris caisse"}
                            >
                              <Star size={14} fill={product.is_favorite ? '#eab308' : 'none'} />
                            </button>
                            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>
                              {product.name}
                            </span>
                            <span 
                              style={{ 
                                background: '#f8fafc',
                                border: `1px solid ${product.category_color || '#cbd5e1'}`, 
                                color: product.category_color || '#334155',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <Tag size={9} />
                              {product.category_name || t.generalCategory}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b' }}>
                            <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', fontWeight: 600, color: '#475569' }}>
                              {product.sku}
                            </span>
                            {product.barcode && (
                              <span style={{ fontFamily: 'monospace', color: '#94a3b8', fontSize: '10px' }}>
                                #{product.barcode}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Stock Disponible (Clean Cigarette & Unit breakdown) */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isCig || packUnit ? (
                              <div>
                                <span style={{
                                  fontSize: '13px',
                                  fontWeight: 900,
                                  color: isOut ? '#dc2626' : isLow ? '#b45309' : '#15803d'
                                }}>
                                  📦 {formatCigaretteStock(product.stock_quantity, packFactor, isOcb)}
                                </span>
                                <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '5px' }}>
                                  ({product.stock_quantity} {product.base_unit})
                                </span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ 
                                  fontSize: '14px', 
                                  fontWeight: 800, 
                                  color: isOut ? '#dc2626' : isLow ? '#b45309' : '#15803d' 
                                }}>
                                  {product.stock_quantity}
                                </span>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                                  {product.base_unit}
                                </span>
                              </div>
                            )}

                            {/* Quick inline stock adjustment */}
                            {canAdjustStock && (
                              <button
                                type="button"
                                onClick={() => setStockAdjustmentModal({ product, newStock: product.stock_quantity })}
                                style={{ 
                                  padding: '2px 4px', 
                                  fontSize: '10px', 
                                  border: '1px solid #e2e8f0', 
                                  borderRadius: '4px', 
                                  background: '#f8fafc',
                                  cursor: 'pointer',
                                  color: '#64748b',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                                title={t.adjustStockTooltip}
                              >
                                <Scale size={10} />
                              </button>
                            )}
                          </div>

                          <div>
                            {isOut ? (
                              <span className="badge-clean badge-red" style={{ padding: '1px 5px', fontSize: '9px', fontWeight: 700 }}>{t.outOfStock}</span>
                            ) : isLow ? (
                              <span className="badge-clean badge-amber" style={{ padding: '1px 5px', fontSize: '9px', fontWeight: 700 }}>{t.lowStock} (&le;{product.min_stock_alert})</span>
                            ) : (
                              <span style={{ color: '#16a34a', fontSize: '10px', fontWeight: 700 }}>● {t.inReserve}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Prix de Vente & Achat */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 900, color: '#15803d' }}>
                              {formatCurrency(currentSelection.sellingPrice)}
                            </span>
                            {isAdmin && (
                              <span style={{ fontSize: '11px', color: '#64748b' }} title="Prix d'achat grossiste">
                                (Achat: {formatCurrency(currentSelection.purchasePrice)})
                              </span>
                            )}
                          </div>

                          {/* Multi-unit subtitle if cigarette / pack */}
                          {packUnit && (
                            <div style={{ fontSize: '10px', color: '#64748b' }}>
                              <span style={{ color: '#0369a1', fontWeight: 700 }}>📦 {packUnit.unit_name}: {formatCurrency(packUnit.selling_price)}</span>
                              {singleUnit && (
                                <span style={{ marginLeft: '6px', color: '#b91c1c', fontWeight: 700 }}>🚬 {singleUnit.unit_name}: {formatCurrency(singleUnit.selling_price)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 4. Fournisseur */}
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                          {product.supplier_name || 'Divers'}
                        </span>
                      </td>

                      {/* 5. Actions (Commander grossiste / Modifier / Supprimer) */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(product)}
                            className="btn-green"
                            style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                            title="Ajouter au bon de commande fournisseur"
                          >
                            <ShoppingCart size={11} />
                            <span>{t.addPurchaseBtn}</span>
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleOpenProductModal(product)}
                              style={{ 
                                background: '#f8fafc', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '4px', 
                                cursor: 'pointer', 
                                padding: '4px 6px', 
                                color: '#475569' 
                              }}
                              title={t.editProduct}
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(product.id, product.name)}
                              style={{ 
                                background: '#fef2f2', 
                                border: '1px solid #fecaca', 
                                borderRadius: '4px', 
                                cursor: 'pointer', 
                                padding: '4px 6px', 
                                color: '#dc2626' 
                              }}
                              title={t.deleteProduct}
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

        {/* Table footer with total count & full per-page system */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '12px 18px', 
          background: '#f8fafc', 
          borderTop: '1px solid #e2e8f0', 
          fontSize: '12px', 
          color: '#64748b', 
          flexWrap: 'wrap', 
          gap: '10px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>
              {t.showingItems
                .replace('{from}', String(totalCount === 0 ? 0 : (page - 1) * pageSize + 1))
                .replace('{to}', String(Math.min(page * pageSize, totalCount)))
                .replace('{total}', String(totalCount))}
            </span>

            {/* Page Size Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>{t.perPageLabel}</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="input-clean"
                style={{ fontSize: '11px', padding: '3px 8px', width: 'auto' }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Pagination Controls */}
          {Math.ceil(totalCount / pageSize) > 1 && (() => {
            const totalPages = Math.ceil(totalCount / pageSize);
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                  className="btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '11px', opacity: page <= 1 ? 0.4 : 1 }}
                  title="Première page"
                >
                  «
                </button>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '11px', opacity: page <= 1 ? 0.4 : 1 }}
                >
                  {t.previous}
                </button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .map((p, idx, arr) => {
                    const prevP = arr[idx - 1];
                    const showEllipsis = prevP && p - prevP > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span style={{ padding: '0 4px', color: '#94a3b8' }}>...</span>}
                        <button
                          type="button"
                          onClick={() => setPage(p)}
                          style={{
                            padding: '4px 9px',
                            fontSize: '11px',
                            fontWeight: p === page ? 800 : 600,
                            borderRadius: '4px',
                            border: p === page ? '1px solid #16a34a' : '1px solid #e2e8f0',
                            background: p === page ? '#16a34a' : '#ffffff',
                            color: p === page ? '#ffffff' : '#334155',
                            cursor: 'pointer'
                          }}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '11px', opacity: page >= totalPages ? 0.4 : 1 }}
                >
                  {t.next}
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                  className="btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '11px', opacity: page >= totalPages ? 0.4 : 1 }}
                  title="Dernière page"
                >
                  »
                </button>
              </div>
            );
          })()}
        </div>
      </div>
    </>
  )}

      {/* ========================================================= */}
      {/* TAB 2: HISTORIQUE DES ACHATS & BONS DE COMMANDE */}
      {/* ========================================================= */}
      {mainTab === 'purchases_history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Top KPI Ribbon for Purchases History */}
          {(() => {
            const totalPaidSum = orders.reduce((sum, o) => sum + (parseFloat(o.paid_amount) || 0), 0);
            const totalCreditSum = orders.reduce((sum, o) => sum + (parseFloat(o.credit_amount) || 0), 0);
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
                <div className="clean-card" style={{ padding: '14px 18px', borderLeft: '4px solid #0284c7' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>
                    {t.receivedPurchaseOrders}
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    {ordersTotalCount} <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{t.ordersUnit}</span>
                  </div>
                </div>

                <div className="clean-card" style={{ padding: '14px 18px', borderLeft: '4px solid #16a34a' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                    {t.cashPayouts}
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', marginTop: '2px' }} dir="ltr">
                    {formatCurrency(totalPaidSum)}
                  </div>
                </div>

                <div className="clean-card" style={{ padding: '14px 18px', borderLeft: '4px solid #ea580c' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#c2410c', textTransform: 'uppercase' }}>
                    {t.supplierDebtsKPI}
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#c2410c', marginTop: '2px' }} dir="ltr">
                    {formatCurrency(totalCreditSum)}
                  </div>
                </div>

                <div className="clean-card" style={{ padding: '14px 18px', borderLeft: '4px solid #475569' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    {t.totalPurchaseVolume}
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }} dir="ltr">
                    {formatCurrency(ordersTotalAmountSum)}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Top Filter and Search Bar for Orders */}
          <div className="clean-card" style={{ padding: '16px 20px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              
              {/* Search input */}
              <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder={t.searchOrdersPlaceholder}
                  value={ordersSearch}
                  onChange={e => { setOrdersSearch(e.target.value); setOrdersPage(1); }}
                  className="input-clean"
                  style={{ paddingLeft: '32px', fontSize: '12px' }}
                />
                {ordersSearch && (
                  <button
                    type="button"
                    onClick={() => setOrdersSearch('')}
                    style={{ position: 'absolute', right: '8px', top: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Fournisseur */}
                <select
                  value={ordersSupplierFilter}
                  onChange={e => { setOrdersSupplierFilter(e.target.value === 'all' ? 'all' : Number(e.target.value)); setOrdersPage(1); }}
                  className="input-clean"
                  style={{ fontSize: '11px', padding: '6px 10px', width: 'auto' }}
                >
                  <option value="all">{t.allSuppliersFilter}</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                {/* Caisse */}
                <select
                  value={ordersCaisseFilter}
                  onChange={e => { setOrdersCaisseFilter(e.target.value === 'all' ? 'all' : Number(e.target.value)); setOrdersPage(1); }}
                  className="input-clean"
                  style={{ fontSize: '11px', padding: '6px 10px', width: 'auto' }}
                >
                  <option value="all">{t.allCaissesFilter}</option>
                  {caisses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                {/* Mode Règlement */}
                <select
                  value={ordersPaymentFilter}
                  onChange={e => { setOrdersPaymentFilter(e.target.value); setOrdersPage(1); }}
                  className="input-clean"
                  style={{ fontSize: '11px', padding: '6px 10px', width: 'auto' }}
                >
                  <option value="all">{t.allPaymentsFilter}</option>
                  <option value="especes">{t.paymentCash}</option>
                  <option value="mixte">{t.paymentMixte}</option>
                  <option value="credit">{t.paymentCredit}</option>
                  <option value="virement">{t.paymentTransfer}</option>
                  <option value="cheque">{t.paymentCheque}</option>
                </select>

                {/* Date range */}
                <input
                  type="date"
                  value={ordersStartDate}
                  onChange={e => { setOrdersStartDate(e.target.value); setOrdersPage(1); }}
                  className="input-clean"
                  style={{ fontSize: '11px', padding: '5px 8px', width: 'auto' }}
                  title="Date début"
                />
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>{t.dateTo}</span>
                <input
                  type="date"
                  value={ordersEndDate}
                  onChange={e => { setOrdersEndDate(e.target.value); setOrdersPage(1); }}
                  className="input-clean"
                  style={{ fontSize: '11px', padding: '5px 8px', width: 'auto' }}
                  title="Date fin"
                />

                {(ordersSearch || ordersSupplierFilter !== 'all' || ordersCaisseFilter !== 'all' || ordersPaymentFilter !== 'all' || ordersStartDate || ordersEndDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setOrdersSearch('');
                      setOrdersSupplierFilter('all');
                      setOrdersCaisseFilter('all');
                      setOrdersPaymentFilter('all');
                      setOrdersStartDate('');
                      setOrdersEndDate('');
                      setOrdersPage(1);
                    }}
                    className="btn-secondary"
                    style={{ fontSize: '11px', padding: '5px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <X size={12} /> {t.resetFilters}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="clean-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table-clean" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '12%' }}>{t.refAndDate}</th>
                    <th style={{ width: '22%' }}>{t.supplier}</th>
                    <th style={{ width: '14%' }}>{t.caisseDebited}</th>
                    <th style={{ width: '18%' }}>{t.paymentAndDebts}</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>{t.articlesCount}</th>
                    <th style={{ width: '14%', textAlign: 'right' }}>{t.totalAmount}</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>{t.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersLoading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block', color: '#16a34a' }} />
                        {t.loadingOrders}
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        <History size={36} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                        <div>{t.noOrdersFound}</div>
                      </td>
                    </tr>
                  ) : (
                    orders.map(order => {
                      const isCredit = order.payment_method === 'credit';
                      const isMixte = order.payment_method === 'mixte' || (order.paid_amount > 0 && order.credit_amount > 0);
                      return (
                        <tr key={order.id} style={{ transition: 'background 0.15s ease' }}>
                          {/* 1. Réf & Date */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{
                                  background: '#f1f5f9',
                                  color: '#0f172a',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #cbd5e1'
                                }}>
                                  #{order.id}
                                </span>
                              </div>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>
                                {order.created_at ? order.created_at.replace('T', ' ').slice(0, 16) : '—'}
                              </span>
                              {order.user_name && (
                                <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                                  👤 {order.user_name}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 2. Fournisseur */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Building2 size={13} color="#16a34a" />
                                <span>{order.supplier_name || 'Fournisseur Comptoir / Divers'}</span>
                              </div>
                              {order.supplier_phone && (
                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                  📞 {order.supplier_phone}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 3. Caisse Débitée */}
                          <td>
                            {order.caisse_name ? (
                              <span style={{ 
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#eff6ff', 
                                color: '#1d4ed8', 
                                border: '1px solid #bfdbfe',
                                padding: '2px 8px', 
                                borderRadius: '4px', 
                                fontSize: '11px', 
                                fontWeight: 700 
                              }}>
                                🏛️ {order.caisse_name}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                                {isCredit ? '— (Non débitée / Dette)' : 'Sans caisse'}
                              </span>
                            )}
                          </td>

                          {/* 4. Règlement & Dettes */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span className={`badge-clean ${
                                isCredit ? 'badge-amber' : 
                                isMixte ? 'badge-blue' :
                                order.payment_method === 'especes' ? 'badge-green' : 'badge-blue'
                              }`} style={{ fontSize: '10px', fontWeight: 800, textTransform: 'capitalize', width: 'fit-content' }}>
                                {isCredit ? '100% À Crédit' : 
                                 isMixte ? 'Mixte (Acompte + Dette)' :
                                 order.payment_method === 'especes' ? 'Espèces (Cash)' : 
                                 order.payment_method === 'virement' ? 'Virement' : 
                                 order.payment_method === 'cheque' ? 'Chèque' : order.payment_method}
                              </span>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', fontSize: '11px' }}>
                                {order.paid_amount > 0 && (
                                  <div style={{ color: '#166534', fontWeight: 700 }}>
                                    💵 {t.paidAmountShort} {formatCurrency(order.paid_amount)}
                                  </div>
                                )}
                                {order.credit_amount > 0 && (
                                  <div style={{ color: '#b45309', fontWeight: 700 }}>
                                    📜 {t.debtAmountShort} +{formatCurrency(order.credit_amount)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 5. Articles */}
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>
                                {order.item_count}
                              </span>
                              <span style={{ fontSize: '10px', color: '#64748b' }}>
                                {order.distinct_items_count} réf
                              </span>
                            </div>
                          </td>

                          {/* 6. Montant Total */}
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
                              <strong style={{ fontSize: '15px', color: '#15803d', fontWeight: 800 }} dir="ltr">
                                {formatCurrency(order.total_amount)}
                              </strong>
                              <span style={{ fontSize: '10px', color: '#64748b' }}>Total TTC</span>
                            </div>
                          </td>

                          {/* 7. Actions */}
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenOrderDetails(order.id)}
                                className="btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                title="Voir le détail et les articles du bon"
                              >
                                <Eye size={12} color="#0284c7" />
                                <span>{t.detailsBtn}</span>
                              </button>

                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingOrderId(order.id)}
                                  style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer', padding: '4px 6px', color: '#dc2626' }}
                                  title="Annuler et supprimer ce bon (rétablissement stock, caisse et dette)"
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

            {/* Pagination footer with complete per-page controls */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '12px 18px', 
              background: '#f8fafc', 
              borderTop: '1px solid #e2e8f0', 
              fontSize: '12px', 
              color: '#64748b', 
              flexWrap: 'wrap', 
              gap: '10px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>
                  {t.showingOrders
                    .replace('{from}', String(ordersTotalCount === 0 ? 0 : (ordersPage - 1) * ordersPageSize + 1))
                    .replace('{to}', String(Math.min(ordersPage * ordersPageSize, ordersTotalCount)))
                    .replace('{total}', String(ordersTotalCount))}
                </span>

                {/* Page Size Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{t.perPageLabel}</span>
                  <select
                    value={ordersPageSize}
                    onChange={e => {
                      setOrdersPageSize(Number(e.target.value));
                      setOrdersPage(1);
                    }}
                    className="input-clean"
                    style={{ fontSize: '11px', padding: '3px 8px', width: 'auto' }}
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Pagination Controls */}
              {ordersTotalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    disabled={ordersPage <= 1}
                    onClick={() => setOrdersPage(1)}
                    className="btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '11px', opacity: ordersPage <= 1 ? 0.4 : 1 }}
                    title="Première page"
                  >
                    «
                  </button>
                  <button
                    type="button"
                    disabled={ordersPage <= 1}
                    onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
                    className="btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '11px', opacity: ordersPage <= 1 ? 0.4 : 1 }}
                  >
                    {t.previous}
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: ordersTotalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === ordersTotalPages || Math.abs(p - ordersPage) <= 2)
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev && p - prev > 1;
                      return (
                        <React.Fragment key={p}>
                          {showEllipsis && <span style={{ padding: '0 4px', color: '#94a3b8' }}>...</span>}
                          <button
                            type="button"
                            onClick={() => setOrdersPage(p)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              border: p === ordersPage ? '1px solid #16a34a' : '1px solid #e2e8f0',
                              background: p === ordersPage ? '#16a34a' : '#ffffff',
                              color: p === ordersPage ? '#ffffff' : '#475569',
                              fontWeight: p === ordersPage ? 800 : 600,
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    type="button"
                    disabled={ordersPage >= ordersTotalPages}
                    onClick={() => setOrdersPage(p => Math.min(ordersTotalPages, p + 1))}
                    className="btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '11px', opacity: ordersPage >= ordersTotalPages ? 0.4 : 1 }}
                  >
                    {t.next}
                  </button>
                  <button
                    type="button"
                    disabled={ordersPage >= ordersTotalPages}
                    onClick={() => setOrdersPage(ordersTotalPages)}
                    className="btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '11px', opacity: ordersPage >= ordersTotalPages ? 0.4 : 1 }}
                    title="Dernière page"
                  >
                    »
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DRAWER / MODAL: SUPPLIER PRICE COMPARISON */}
      {/* ========================================================= */}
      {comparisonProduct && (
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
            maxHeight: '85vh',
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
              background: '#ffffff'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart2 size={18} color="#15803d" />
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                    {t.compareSuppliers} : {comparisonProduct.name}
                  </h3>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  SKU: {comparisonProduct.sku} • Stock actuel: {comparisonProduct.stock_quantity} {comparisonProduct.base_unit}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setComparisonProduct(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                Comparez les prix d'achat, délais de livraison et conditions des fournisseurs répertoriés pour ce produit. Cliquez sur <strong>"Commander chez ce fournisseur"</strong> pour l'ajouter directement au panier avec son tarif négocié.
              </div>

              {/* Table of suppliers */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table className="table-clean">
                  <thead>
                    <tr>
                      <th>Fournisseur</th>
                      <th>Délai</th>
                      <th>Min. Commande</th>
                      <th style={{ textAlign: 'right' }}>Prix d'Achat</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonProduct.supplier_prices && comparisonProduct.supplier_prices.length > 0 ? (
                      comparisonProduct.supplier_prices.map((sp, idx) => {
                        const isCheapest = idx === 0;
                        return (
                          <tr key={idx} style={{ background: isCheapest ? '#f0fdf4' : 'transparent' }}>
                            <td>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                                {sp.supplier_name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                {sp.is_primary ? '★ Fournisseur Actuel' : 'Fournisseur alternatif'}
                              </div>
                            </td>
                            <td style={{ fontSize: '12px', color: '#475569' }}>
                              {sp.lead_time_days ? `${sp.lead_time_days} jour(s)` : '24-48h'}
                            </td>
                            <td style={{ fontSize: '12px', color: '#475569' }}>
                              {sp.min_order_qty || 1}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: isCheapest ? '#15803d' : '#0f172a' }}>
                                {formatCurrency(sp.purchase_price)}
                              </div>
                              {isCheapest ? (
                                <span className="badge-clean badge-green" style={{ fontSize: '10px', padding: '1px 5px' }}>
                                  🏆 {t.cheapestSupplier}
                                </span>
                              ) : (
                                <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: 600 }}>
                                  +{formatCurrency(sp.price_difference || 0)}
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  handleAddToCart(comparisonProduct, sp);
                                  setComparisonProduct(null);
                                }}
                                className="btn-secondary"
                                style={{
                                  fontSize: '11px',
                                  padding: '5px 10px',
                                  background: isCheapest ? '#16a34a' : '#ffffff',
                                  color: isCheapest ? '#ffffff' : '#334155',
                                  borderColor: isCheapest ? '#15803d' : '#cbd5e1'
                                }}
                              >
                                Choisir ce tarif
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                          Aucun comparatif disponible. Le fournisseur par défaut est appliqué.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button
                type="button"
                onClick={() => setComparisonProduct(null)}
                className="btn-secondary"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: AJOUT / MODIFICATION PRODUIT (ADMIN) */}
      {/* ========================================================= */}
      {isProductModalOpen && (
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
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
                  <Package size={18} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  {editingProduct ? t.editProduct : t.addProduct}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Mode Switch Tabs at top of Form */}
                <div style={{ display: 'flex', borderRadius: '8px', background: '#f1f5f9', padding: '4px', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setProductMode('standard')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: productMode === 'standard' ? 800 : 600,
                      background: productMode === 'standard' ? '#ffffff' : 'transparent',
                      color: productMode === 'standard' ? '#0f172a' : '#64748b',
                      boxShadow: productMode === 'standard' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>📦 Vente Normale (Pièce standard)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProductMode('cigarette');
                      const tabacCat = categories.find(c => c.code === 'TABAC' || (c.name || '').toLowerCase().includes('tabac') || (c.name || '').toLowerCase().includes('cig'));
                      if (tabacCat) setProductForm(f => ({ ...f, category_id: tabacCat.id }));
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: productMode === 'cigarette' ? 800 : 600,
                      background: productMode === 'cigarette' ? '#ffffff' : 'transparent',
                      color: productMode === 'cigarette' ? '#b91c1c' : '#64748b',
                      boxShadow: productMode === 'cigarette' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>🇩🇿 Cigarettes & OCB (Paquet & Détail)</span>
                  </button>
                </div>

                {/* Product Name */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Désignation du Produit *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={productMode === 'cigarette' ? "Ex: Marlboro Rouge, L&M, Gauloises, OCB Slim..." : "Ex: Canette Coca-Cola 33cl, Chips Lays..."}
                    value={productForm.name}
                    onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                    className="input-clean"
                  />
                </div>

                {/* SKU, Barcode, Category & Supplier */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      SKU / Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={productForm.sku}
                      onChange={e => setProductForm({ ...productForm, sku: e.target.value })}
                      className="input-clean"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Code-barres
                    </label>
                    <input
                      type="text"
                      placeholder="Optionnel"
                      value={productForm.barcode}
                      onChange={e => setProductForm({ ...productForm, barcode: e.target.value })}
                      className="input-clean"
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        Catégorie *
                      </label>
                      <button
                        type="button"
                        onClick={async () => {
                          const catName = prompt('Nom de la nouvelle catégorie :');
                          if (catName && catName.trim()) {
                            if (window.electronAPI?.createCategory) {
                              const res = await window.electronAPI.createCategory({ name: catName.trim() });
                              if (res.success && res.id) {
                                const newCat = { id: res.id, name: catName.trim() };
                                setCategories(prev => [...prev, newCat]);
                                setProductForm(f => ({ ...f, category_id: res.id! }));
                              }
                            } else {
                              const newCat = { id: Date.now(), name: catName.trim() };
                              setCategories(prev => [...prev, newCat]);
                              setProductForm(f => ({ ...f, category_id: newCat.id }));
                            }
                          }
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#16a34a', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        + Nouvelle
                      </button>
                    </div>
                    <select
                      value={productForm.category_id}
                      onChange={e => {
                        const newCatId = Number(e.target.value);
                        setProductForm(f => ({ ...f, category_id: newCatId }));
                        if (isCigaretteCategory(newCatId)) {
                          setProductMode('cigarette');
                        } else {
                          setProductMode('standard');
                        }
                      }}
                      className="input-clean"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Fournisseur
                    </label>
                    <select
                      value={productForm.primary_supplier_id}
                      onChange={e => setProductForm({ ...productForm, primary_supplier_id: Number(e.target.value) })}
                      className="input-clean"
                    >
                      <option value="0">-- Aucun fournisseur --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Caisse Assignment */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    🏧 Caisse associée
                  </label>
                  <select
                    value={productForm.caisse_id}
                    onChange={e => setProductForm({ ...productForm, caisse_id: Number(e.target.value) })}
                    className="input-clean"
                  >
                    <option value="0">-- Toutes les caisses --</option>
                    {caisses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Associer ce produit à une caisse spécifique (optionnel)</p>
                </div>

                {/* Favori Caisse / Vente (POS) */}
                <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: productForm.is_favorite ? '#fef08a' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Star size={18} color={productForm.is_favorite ? '#eab308' : '#94a3b8'} fill={productForm.is_favorite ? '#eab308' : 'none'} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#854d0e' }}>Produit Favori Caisse & Vente (POS)</div>
                      <div style={{ fontSize: '11px', color: '#a16207' }}>Afficher ce produit en accès rapide prioritaire sur l'écran Caisse</div>
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={productForm.is_favorite === 1}
                      onChange={e => setProductForm({ ...productForm, is_favorite: e.target.checked ? 1 : 0 })}
                      style={{ width: '20px', height: '20px', accentColor: '#16a34a', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: productForm.is_favorite ? '#15803d' : '#64748b' }}>
                      {productForm.is_favorite ? '⭐ Favori Actif' : 'Non favori'}
                    </span>
                  </label>
                </div>

                {/* ======================================================== */}
                {/* MODE CIGARETTES & OCB (ACHAT PAQUET / VENTE PAQUET & DETAIL) */}
                {/* ======================================================== */}
                {productMode === 'cigarette' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {/* Algerian Kiosk Tobacco Notice & Quick Presets */}
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>🇩🇿 Modèle Kiosque Algérie : Achat Paquet & Vente Paquet / Détail</span>
                        </div>
                        {/* Quick Presets */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setCigProductType('cigarette');
                              setCigUnitsPerPack(20);
                              setCigUnitSellPrice(20);
                              setProductForm(f => ({ ...f, base_unit: 'Tige' }));
                            }}
                            className="btn-secondary"
                            style={{ 
                              background: cigProductType === 'cigarette' ? '#fee2e2' : '#ffffff', 
                              color: '#b91c1c', 
                              borderColor: '#fca5a5', 
                              fontSize: '11px', 
                              padding: '3px 8px', 
                              fontWeight: 700 
                            }}
                          >
                            🚬 Format Cigarette (20 tiges / pqt, 20 DA détail)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCigProductType('ocb');
                              setCigUnitsPerPack(32);
                              setCigUnitSellPrice(10);
                              setProductForm(f => ({ ...f, base_unit: 'Feuille' }));
                            }}
                            className="btn-secondary"
                            style={{ 
                              background: cigProductType === 'ocb' ? '#fef3c7' : '#ffffff', 
                              color: '#b45309', 
                              borderColor: '#fcd34d', 
                              fontSize: '11px', 
                              padding: '3px 8px', 
                              fontWeight: 700 
                            }}
                          >
                            📄 Format Papier OCB (32 feuilles / carnet, 10 DA détail)
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: '#7f1d1d', lineHeight: 1.4 }}>
                        L'approvisionnement auprès du fournisseur s'effectue en <strong>paquets</strong> (ex: 5 paquets). La vente au comptoir se fait soit par <strong>paquet complet</strong>, soit par <strong>cigarette / feuille au détail</strong>. Aucun carton n'est utilisé.
                      </div>
                    </div>

                    {/* Cigarette / OCB Quantities */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      {/* 1. Pack Quantity */}
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                          Quantité Achetée (en paquets) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          required
                          placeholder="Ex: 0"
                          value={cigPackQty}
                          onChange={e => setCigPackQty(parseFloat(e.target.value) || 0)}
                          className="input-clean"
                          style={{ fontWeight: 800, fontSize: '13px' }}
                        />
                        <span style={{ fontSize: '10px', color: '#64748b' }}>Ex: 5 paquets achetés</span>
                      </div>

                      {/* 2. Units per pack (Default 20, editable for OCB) */}
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                          {cigProductType === 'ocb' ? 'Feuilles par carnet *' : 'Cigarettes par paquet *'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="20"
                          value={cigUnitsPerPack}
                          onChange={e => setCigUnitsPerPack(parseInt(e.target.value) || 20)}
                          className="input-clean"
                          style={{ fontWeight: 800, fontSize: '13px' }}
                        />
                        <span style={{ fontSize: '10px', color: '#64748b' }}>Défaut: 20 (ou 32/50 pour OCB)</span>
                      </div>

                      {/* 3. Min alert in packs */}
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                          Alerte Stock Min (en paquets)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={cigMinStockPacks}
                          onChange={e => setCigMinStockPacks(parseFloat(e.target.value) || 0)}
                          className="input-clean"
                          style={{ fontWeight: 700 }}
                        />
                        <span style={{ fontSize: '10px', color: '#64748b' }}>Alerte quand &le; {cigMinStockPacks} paquets</span>
                      </div>
                    </div>

                    {/* Cigarette / OCB Prices (In Algerian Dinars DA) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      {/* 4. Pack Purchase Price */}
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                          Prix d'Achat du Paquet (DA) *
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          required
                          placeholder="Ex: 280"
                          value={cigPackCost}
                          onChange={e => setCigPackCost(parseFloat(e.target.value) || 0)}
                          className="input-clean"
                          style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a' }}
                        />
                        <span style={{ fontSize: '10px', color: '#64748b' }}>Prix d'achat payé au fournisseur</span>
                      </div>

                      {/* 5. Pack Sell Price */}
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                          Prix Vente du Paquet (DA) *
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          required
                          placeholder="Ex: 300"
                          value={cigPackPrice}
                          onChange={e => setCigPackPrice(parseFloat(e.target.value) || 0)}
                          className="input-clean"
                          style={{ fontWeight: 800, fontSize: '13px', color: '#15803d' }}
                        />
                        <span style={{ fontSize: '10px', color: '#64748b' }}>Prix de vente du paquet complet</span>
                      </div>

                      {/* 6. Single Unit Sell Price (Default 20 DA / 10 DA) */}
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                          Prix Vente 1 {cigProductType === 'ocb' ? 'Feuille' : 'Cigarette'} (DA) *
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          required
                          placeholder={cigProductType === 'ocb' ? '10' : '20'}
                          value={cigUnitSellPrice}
                          onChange={e => setCigUnitSellPrice(parseFloat(e.target.value) || 0)}
                          className="input-clean"
                          style={{ fontWeight: 800, fontSize: '13px', color: '#b91c1c' }}
                        />
                        <span style={{ fontSize: '10px', color: '#64748b' }}>Défaut: 20 DA (selon marque) / 10 DA (OCB)</span>
                      </div>
                    </div>

                    {/* Live Summary & Margins Card */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>📊 Récapitulatif automatique & Marges :</span>
                        <span className="badge-clean badge-green" style={{ fontSize: '11px' }}>
                          Stock total généré : {cigPackQty * cigUnitsPerPack} {cigProductType === 'ocb' ? 'feuilles' : 'tiges'} ({cigPackQty} paquets)
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                        {/* Vente Paquet */}
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Vente par Paquet Complet :</div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                            {cigPackPrice.toFixed(2)} DA
                          </div>
                          <div style={{ fontSize: '11px', color: (cigPackPrice - cigPackCost) >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700, marginTop: '2px' }}>
                            Bénéfice : +{(cigPackPrice - cigPackCost).toFixed(2)} DA / paquet
                            {cigPackCost > 0 ? ` (${(((cigPackPrice - cigPackCost) / cigPackCost) * 100).toFixed(1)}%)` : ''}
                          </div>
                        </div>

                        {/* Vente Détail */}
                        <div style={{ background: '#ffffff', border: '1px solid #fed7aa', borderRadius: '6px', padding: '8px 10px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#9a3412' }}>
                            Vente au Détail ({cigUnitsPerPack} × {cigUnitSellPrice} DA) :
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#c2410c', marginTop: '2px' }}>
                            {(cigUnitsPerPack * cigUnitSellPrice).toFixed(2)} DA / paquet
                          </div>
                          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, marginTop: '2px' }}>
                            Bénéfice : +{((cigUnitsPerPack * cigUnitSellPrice) - cigPackCost).toFixed(2)} DA / paquet
                            <span style={{ color: '#0f172a', fontWeight: 600, marginLeft: '4px' }}>
                              (+{((cigUnitsPerPack * cigUnitSellPrice) - cigPackPrice).toFixed(2)} DA vs paquet)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ======================================================== */
                  /* MODE VENTE NORMALE (ACHAT & VENTE STANDARD PAR PIECE) */
                  /* ======================================================== */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#166534', fontWeight: 600 }}>
                      📦 Vente Normale : Achat de produit et vente directe par pièce ou unité, sans gestion complexe de détail.
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                          Unité de Mesure *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Pièce, Bouteille, Cannette..."
                          value={productForm.base_unit}
                          onChange={e => setProductForm({ ...productForm, base_unit: e.target.value })}
                          className="input-clean"
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                          Quantité en Stock *
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          required
                          value={productForm.stock_quantity}
                          onChange={e => setProductForm({ ...productForm, stock_quantity: parseFloat(e.target.value) || 0 })}
                          className="input-clean"
                          style={{ fontWeight: 800 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                          Alerte Stock Min
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={productForm.min_stock_alert}
                          onChange={e => setProductForm({ ...productForm, min_stock_alert: parseFloat(e.target.value) || 0 })}
                          className="input-clean"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                          Prix d'Achat Unitaire (DA) *
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          required
                          placeholder="Ex: 50"
                          value={productForm.cost_price}
                          onChange={e => setProductForm({ ...productForm, cost_price: parseFloat(e.target.value) || 0 })}
                          className="input-clean"
                          style={{ fontWeight: 800 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                          Prix de Vente Unitaire (DA) *
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          required
                          placeholder="Ex: 70"
                          value={productForm.selling_price}
                          onChange={e => setProductForm({ ...productForm, selling_price: parseFloat(e.target.value) || 0 })}
                          className="input-clean"
                          style={{ fontWeight: 800, color: '#15803d' }}
                        />
                      </div>
                    </div>

                    {/* Profit Preview */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                        Bénéfice estimé par {productForm.base_unit || 'pièce'} :
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: (productForm.selling_price - productForm.cost_price) >= 0 ? '#15803d' : '#dc2626' }}>
                        +{(productForm.selling_price - productForm.cost_price).toFixed(2)} DA
                        {productForm.cost_price > 0 && (
                          <span style={{ fontSize: '11px', fontWeight: 600, marginLeft: '6px' }}>
                            ({(((productForm.selling_price - productForm.cost_price) / productForm.cost_price) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: '#f8fafc' }}>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="btn-secondary"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="btn-green"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: AJUSTEMENT RAPIDE DU STOCK */}
      {/* ========================================================= */}
      {stockAdjustmentModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="clean-card" style={{ width: '100%', maxWidth: '380px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              {t.quickStockUpdate}
            </h3>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
              {stockAdjustmentModal.product.name} ({stockAdjustmentModal.product.sku})
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Nouveau stock ({stockAdjustmentModal.product.base_unit}) :
              </label>
              <input
                type="number"
                step="any"
                value={stockAdjustmentModal.newStock}
                onChange={e => setStockAdjustmentModal({ ...stockAdjustmentModal, newStock: parseFloat(e.target.value) || 0 })}
                className="input-clean"
                style={{ fontSize: '16px', fontWeight: 800 }}
              />
              {(() => {
                const packU = stockAdjustmentModal.product.units?.find(u => u.conversion_factor > 1);
                if (packU && packU.conversion_factor > 1) {
                  return (
                    <div style={{ marginTop: '8px', padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                        Ou définir en nombre de paquets ({packU.conversion_factor} {stockAdjustmentModal.product.base_unit}/pqt) :
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="number"
                          placeholder="Ex: 5"
                          style={{ width: '80px', padding: '4px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          onChange={e => {
                            const p = parseFloat(e.target.value) || 0;
                            setStockAdjustmentModal({
                              ...stockAdjustmentModal,
                              newStock: p * packU.conversion_factor
                            });
                          }}
                        />
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a' }}>
                          = {stockAdjustmentModal.newStock} {stockAdjustmentModal.product.base_unit}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setStockAdjustmentModal(null)}
                className="btn-secondary"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleSaveStockAdjustment}
                className="btn-green"
              >
                Mettre à jour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SLIDE-OUT CART PANEL / DRAWER */}
      {/* ========================================================= */}
      {isCartOpen && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.6)',
          zIndex: 1050,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(4px)'
        }} onClick={() => setIsCartOpen(false)}>
        <div style={{
          width: '780px', maxWidth: '96vw',
          maxHeight: '94vh',
          background: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.18s ease-out'
        }} onClick={e => e.stopPropagation()}>
          {/* Cart Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', color: '#ffffff', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShoppingCart size={18} color="#4ade80" />
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  {t.purchaseOrderTitle}
                </h3>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {t.purchaseOrderSubtitle}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleManualSyncCart}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#4ade80',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 600
                }}
                title="Recalculer et synchroniser les prix du panier avec les tarifs grossistes du catalogue"
              >
                <RefreshCw size={12} />
                <span>{t.refreshWholesaleRates}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* ── Scrollable Body: Selectors, Product Table, Supplier Breakdown & Summary ── */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>

            {/* Cart Supplier & Caisse Selectors */}
            <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={14} color="#16a34a" />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', minWidth: '130px' }}>{t.supplier} :</span>
                <select
                  value={cartSupplierId}
                  onChange={e => setCartSupplierId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="input-clean"
                  style={{ fontSize: '11px', padding: '4px 8px', width: 'auto', flex: 1 }}
                >
                  <option value="all">{t.autoPerProduct}</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Caisse Selector (Default from configured caisse, modifiable) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={14} color="#0284c7" />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', minWidth: '130px' }}>{t.caissePaymentLabel}</span>
                <select
                  value={cartCaisseId}
                  onChange={e => setCartCaisseId(e.target.value === 'auto' ? 'auto' : Number(e.target.value))}
                  className="input-clean"
                  style={{ fontSize: '11px', padding: '4px 8px', width: 'auto', flex: 1 }}
                >
                  <option value="auto">
                    {cart.find(c => c.caisseId)?.caisseName 
                      ? `Caisse par défaut du produit (${cart.find(c => c.caisseId)?.caisseName})`
                      : 'Automatique '}
                  </option>
                  {caisses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({formatCurrency(c.current_balance)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode de règlement & Affectation Caisse */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>{t.paymentMethodLabel}</span>
                  <select
                    value={cartPaymentMethod}
                    onChange={e => {
                      const m = e.target.value as any;
                      setCartPaymentMethod(m);
                      if (m === 'credit') {
                        setCartAffectCaisse(false);
                      } else {
                        setCartAffectCaisse(true);
                      }
                    }}
                    className="input-clean"
                    style={{ fontSize: '11px', padding: '4px 8px', flex: 1 }}
                  >
                    <option value="especes">{t.paymentCash}</option>
                    <option value="virement">{t.paymentTransfer}</option>
                    <option value="cheque">{t.paymentCheque}</option>
                    <option value="credit">{t.paymentCredit}</option>
                  </select>
                </div>

                {cartPaymentMethod !== 'credit' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      checked={cartAffectCaisse}
                      onChange={e => setCartAffectCaisse(e.target.checked)}
                      style={{ accentColor: '#16a34a' }}
                    />
                    <span>{t.debitCaisseCheckbox}</span>
                  </label>
                )}
              </div>
            </div>

            {/* ── Cart Item List (compact table rows) ── */}
            <div style={{ flexShrink: 0 }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                  <ShoppingCart size={36} style={{ margin: '0 auto 10px', opacity: 0.25 }} />
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#475569' }}>{t.cartEmpty}</div>
                  <div style={{ fontSize: '11px', marginTop: '4px' }}>{t.noCatalogProducts}</div>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '11px' }}>Produit</th>
                      <th style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700, color: '#475569', fontSize: '11px', whiteSpace: 'nowrap' }}>Unité</th>
                      <th style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: '11px', whiteSpace: 'nowrap' }}>P.A</th>
                      <th style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: '11px', whiteSpace: 'nowrap' }}>P.V</th>
                      <th style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700, color: '#475569', fontSize: '11px' }}>Qté</th>
                      <th style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: '#15803d', fontSize: '11px' }}>Total</th>
                      <th style={{ padding: '7px 8px', width: '28px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item, index) => {
                      const lineTotal = item.price * item.quantity;
                      return (
                        <tr key={index} style={{ borderBottom: '1px solid #f1f5f9', background: index % 2 === 0 ? '#ffffff' : '#fafbfc' }}>
                          {/* Product name + SKU + Caisse */}
                          <td style={{ padding: '7px 12px', maxWidth: '180px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '12px', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.productName}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '10px', color: '#94a3b8' }}>{item.sku}</span>
                              {item.caisseName && (
                                <span style={{ fontSize: '9px', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', padding: '1px 5px', borderRadius: '3px', border: '1px solid #bfdbfe', whiteSpace: 'nowrap' }}>
                                  🏛️ {item.caisseName}
                                </span>
                              )}
                            </div>
                          </td>
                          {/* Unit */}
                          <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                              {item.unitName}
                            </span>
                          </td>
                          {/* Purchase price */}
                          <td style={{ padding: '7px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: 700, color: '#15803d', fontSize: '12px' }} dir="ltr">{formatCurrency(item.price)}</span>
                          </td>
                          {/* Selling price */}
                          <td style={{ padding: '7px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {item.sellingPrice && item.sellingPrice > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
                                <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '11px' }} dir="ltr">{formatCurrency(item.sellingPrice)}</span>
                                {item.sellingPrice > item.price && (
                                  <span style={{ fontSize: '9px', color: '#16a34a', fontWeight: 700 }}>+{formatCurrency(item.sellingPrice - item.price)}</span>
                                )}
                              </div>
                            ) : <span style={{ color: '#cbd5e1', fontSize: '11px' }}>—</span>}
                          </td>
                          {/* Quantity stepper + Direct numeric input */}
                          <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '5px', overflow: 'hidden', background: '#fff' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.quantity > 1) {
                                    const next = [...cart]; next[index].quantity -= 1; setCart(next);
                                  } else {
                                    setCart(cart.filter((_, i) => i !== index));
                                  }
                                }}
                                style={{ width: '22px', height: '26px', border: 'none', borderRight: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: 700, fontSize: '13px', lineHeight: 1, padding: 0, color: '#475569' }}
                              >-</button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity || ''}
                                onChange={e => {
                                  const val = parseInt(e.target.value, 10);
                                  const next = [...cart];
                                  next[index].quantity = isNaN(val) ? 0 : val;
                                  setCart(next);
                                }}
                                onBlur={() => {
                                  if (!item.quantity || item.quantity < 1) {
                                    const next = [...cart];
                                    next[index].quantity = 1;
                                    setCart(next);
                                  }
                                }}
                                onFocus={e => e.target.select()}
                                style={{
                                  width: '45px',
                                  height: '26px',
                                  textAlign: 'center',
                                  fontWeight: 800,
                                  fontSize: '12px',
                                  border: 'none',
                                  background: '#ffffff',
                                  color: '#0f172a',
                                  outline: 'none',
                                  padding: '0 2px'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => { const next = [...cart]; next[index].quantity += 1; setCart(next); }}
                                style={{ width: '22px', height: '26px', border: 'none', borderLeft: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: 700, fontSize: '13px', lineHeight: 1, padding: 0, color: '#475569' }}
                              >+</button>
                            </div>
                          </td>
                          {/* Line total */}
                          <td style={{ padding: '7px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: 800, color: '#15803d', fontSize: '13px' }} dir="ltr">{formatCurrency(lineTotal)}</span>
                          </td>
                          {/* Remove */}
                          <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                            <button type="button" onClick={() => setCart(cart.filter((_, i) => i !== index))}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 0, lineHeight: 1 }}
                              title="Supprimer"
                            ><X size={13} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Multi-Supplier Versement & Credit Breakdown */}
            {cart.length > 0 && cartSuppliersBreakdown.length > 0 && (
              <div style={{ 
                padding: '12px 16px', 
                background: '#f8fafc', 
                borderTop: '2px solid #e2e8f0', 
                borderBottom: '1px solid #e2e8f0',
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={15} color="#16a34a" />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                      {t.versementsAndCreditBySupplier}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#64748b', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    {t.suppliersCount.replace('{count}', String(cartSuppliersBreakdown.length))}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {cartSuppliersBreakdown.map((s) => {
                    const sKey = s.supplierId ? String(s.supplierId) : 'unassigned';
                    const currentVersement = versementsBySupplier[sKey] !== undefined ? versementsBySupplier[sKey] : s.subtotal;
                    const remainingCredit = Math.max(0, s.subtotal - currentVersement);
                    const projectedDebt = s.currentCredit + remainingCredit;

                    return (
                      <div 
                        key={sKey} 
                        style={{ 
                          background: '#ffffff', 
                          border: '1px solid #cbd5e1', 
                          borderRadius: '6px', 
                          padding: '8px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '5px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                        }}
                      >
                        {/* Supplier Header & Current Debt */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                              {s.supplierName}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>
                              ({s.itemCount} art.)
                            </span>
                          </div>
                          <div style={{ 
                            fontSize: '10px', 
                            fontWeight: 700, 
                            color: s.currentCredit > 0 ? '#b45309' : '#166534',
                            background: s.currentCredit > 0 ? '#fef3c7' : '#dcfce7',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {t.currentDebt} {formatCurrency(s.currentCredit)}
                          </div>
                        </div>

                        {/* Subtotal for this supplier */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#475569', background: '#f8fafc', padding: '4px 8px', borderRadius: '4px' }}>
                          <span>{t.orderTotal}</span>
                          <strong style={{ fontSize: '12px', color: '#15803d' }}>{formatCurrency(s.subtotal)}</strong>
                        </div>

                        {/* Versement input & quick action buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>
                              {t.versementCash}
                            </label>
                            {/* Quick shortcuts */}
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => setVersementsBySupplier(prev => ({ ...prev, [sKey]: s.subtotal }))}
                                style={{ 
                                  fontSize: '10px', 
                                  padding: '1px 6px', 
                                  background: currentVersement === s.subtotal ? '#dcfce7' : '#f1f5f9',
                                  color: currentVersement === s.subtotal ? '#15803d' : '#475569',
                                  border: '1px solid #cbd5e1', 
                                  borderRadius: '4px', 
                                  cursor: 'pointer', 
                                  fontWeight: 700
                                }}
                                title="Payer 100% au comptant"
                              >
                                100% Cash
                              </button>
                              <button
                                type="button"
                                onClick={() => setVersementsBySupplier(prev => ({ ...prev, [sKey]: Math.round(s.subtotal / 2) }))}
                                style={{ 
                                  fontSize: '10px', 
                                  padding: '1px 6px', 
                                  background: '#f1f5f9', 
                                  color: '#475569', 
                                  border: '1px solid #cbd5e1', 
                                  borderRadius: '4px', 
                                  cursor: 'pointer', 
                                  fontWeight: 600
                                }}
                                title="Payer 50% en acompte"
                              >
                                50%
                              </button>
                              <button
                                type="button"
                                onClick={() => setVersementsBySupplier(prev => ({ ...prev, [sKey]: 0 }))}
                                style={{ 
                                  fontSize: '10px', 
                                  padding: '1px 6px', 
                                  background: currentVersement === 0 ? '#fee2e2' : '#f1f5f9', 
                                  color: currentVersement === 0 ? '#b91c1c' : '#475569', 
                                  border: '1px solid #cbd5e1', 
                                  borderRadius: '4px', 
                                  cursor: 'pointer', 
                                  fontWeight: 700
                                }}
                                title="0 DA versé (100% à crédit)"
                              >
                                100% Crédit
                              </button>
                            </div>
                          </div>

                          <div style={{ position: 'relative' }}>
                            <input
                              type="number"
                              min="0"
                              max={s.subtotal}
                              step="any"
                              value={currentVersement}
                              onChange={e => {
                                const val = Math.max(0, parseFloat(e.target.value) || 0);
                                setVersementsBySupplier(prev => ({ ...prev, [sKey]: val }));
                              }}
                              className="input-clean"
                              style={{ 
                                fontSize: '13px', 
                                fontWeight: 800, 
                                color: currentVersement > 0 ? '#15803d' : '#b45309',
                                paddingRight: '36px' 
                              }}
                            />
                            <span style={{ 
                              position: 'absolute', 
                              right: '10px', 
                              top: '50%', 
                              transform: 'translateY(-50%)', 
                              fontSize: '11px', 
                              color: '#94a3b8', 
                              fontWeight: 700, 
                              pointerEvents: 'none' 
                            }}>
                              DA
                            </span>
                          </div>
                        </div>

                        {/* Credit Calculation Feedback */}
                        <div style={{ 
                          fontSize: '11px', 
                          padding: '5px 8px', 
                          borderRadius: '6px', 
                          background: remainingCredit > 0 ? '#fffbeb' : '#f0fdf4',
                          border: remainingCredit > 0 ? '1px solid #fef3c7' : '1px solid #dcfce7',
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '2px' 
                        }}>
                          {remainingCredit === 0 ? (
                            <div style={{ color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>✓</span> {t.fullyPaidNoDebt}
                            </div>
                          ) : (
                            <>
                              <div style={{ color: '#b45309', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                                <span>{t.remainingCreditForOrder}</span>
                                <span>+{formatCurrency(remainingCredit)}</span>
                              </div>
                              <div style={{ color: '#78350f', fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{t.newSupplierDebt}</span>
                                <strong style={{ color: '#b91c1c' }}>{formatCurrency(projectedDebt)}</strong>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cart Summary Information Block */}
            {cart.length > 0 && (() => {
              const totalVersement = cartSuppliersBreakdown.reduce((sum, s) => {
                const sKey = s.supplierId ? String(s.supplierId) : 'unassigned';
                const vers = versementsBySupplier[sKey] !== undefined ? versementsBySupplier[sKey] : s.subtotal;
                return sum + vers;
              }, 0);
              const totalCredit = Math.max(0, cartSummary.totalAmount - totalVersement);

              return (
                <div style={{ padding: '14px 20px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>{t.wholesaleOrderTotal}</span>
                      <strong style={{ fontSize: '15px', color: '#0f172a', fontWeight: 800 }} dir="ltr">
                        {formatCurrency(cartSummary.totalAmount)}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>💵</span> {t.cashOutflowVersements}
                      </span>
                      <strong style={{ fontSize: '14px', color: '#15803d', fontWeight: 800 }} dir="ltr">
                        {formatCurrency(totalVersement)}
                      </strong>
                    </div>

                    {totalCredit > 0 ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>⚠️</span> {t.remainingCreditDebts}
                        </span>
                        <strong style={{ fontSize: '14px', color: '#b45309', fontWeight: 800 }} dir="ltr">
                          +{formatCurrency(totalCredit)}
                        </strong>
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                        ✓ {t.orderFullyPaidCash}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

          </div>

          {/* ── Sticky Action Bar Pinned at Bottom ── */}
          {cart.length > 0 && (() => {
            const totalVersement = cartSuppliersBreakdown.reduce((sum, s) => {
              const sKey = s.supplierId ? String(s.supplierId) : 'unassigned';
              const vers = versementsBySupplier[sKey] !== undefined ? versementsBySupplier[sKey] : s.subtotal;
              return sum + vers;
            }, 0);

            return (
              <div style={{
                padding: '12px 20px',
                borderTop: '1px solid #e2e8f0',
                background: '#ffffff',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                flexShrink: 0,
                boxShadow: '0 -4px 12px rgba(0,0,0,0.05)'
              }}>
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="btn-secondary"
                  style={{ justifyContent: 'center' }}
                >
                  {t.clearCart}
                </button>
                <button
                  type="button"
                  onClick={() => handleCheckoutCart('purchase')}
                  className="btn-green"
                  style={{ justifyContent: 'center', fontSize: '12px', padding: '9px 12px', fontWeight: 800 }}
                >
                  {t.validateOrderBtn} ({formatCurrency(totalVersement)})
                </button>
              </div>
            );
          })()}
        </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DETAILS & EDITION DU BON D'ACHAT */}
      {/* ========================================================= */}
      {viewingOrder && (
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
            maxWidth: '750px',
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
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#dcfce7',
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                    {t.orderDetailsTitle} #{viewingOrder.id}
                  </h3>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {t.date} : {viewingOrder.created_at ? viewingOrder.created_at.replace('T', ' ').slice(0, 16) : '—'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isAdmin && !isEditingOrderMode && (
                  <button
                    type="button"
                    onClick={() => setIsEditingOrderMode(true)}
                    className="btn-secondary"
                    style={{ fontSize: '11px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Edit2 size={12} /> {t.edit}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setViewingOrder(null); setIsEditingOrderMode(false); }}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {viewingOrderLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '13px' }}>
                  {t.loadingOrders}
                </div>
              ) : (
                <>
                  {/* Info Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{t.supplier}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                    {viewingOrder.supplier_name || '—'}
                  </div>
                  {viewingOrder.supplier_phone && (
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      📞 {viewingOrder.supplier_phone}
                    </div>
                  )}
                </div>

                <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{t.caisseAssociated}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: viewingOrder.caisse_name ? '#0369a1' : '#64748b', marginTop: '2px' }}>
                    {viewingOrder.caisse_name ? `🏛️ ${viewingOrder.caisse_name}` : t.noCaisseOption}
                  </div>
                  {viewingOrder.transaction_ref && (
                    <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
                      Trx: {viewingOrder.transaction_ref}
                    </div>
                  )}
                </div>

                <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{t.paymentAndDebts}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: viewingOrder.credit_amount > 0 ? '#b45309' : '#15803d', marginTop: '2px', textTransform: 'capitalize' }}>
                    {viewingOrder.payment_method === 'credit' ? t.paymentCredit : (viewingOrder.credit_amount > 0 ? t.paymentMixte : (viewingOrder.payment_method === 'especes' ? t.paymentCash : viewingOrder.payment_method))}
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '3px' }}>
                    {t.paidAmountShort} : <strong style={{ color: '#15803d' }}>{formatCurrency(viewingOrder.paid_amount || 0)}</strong>
                    {viewingOrder.credit_amount > 0 && (
                      <span style={{ marginLeft: '4px' }}>| {t.debtAmountShort} : <strong style={{ color: '#dc2626' }}>{formatCurrency(viewingOrder.credit_amount)}</strong></span>
                    )}
                  </div>
                  {viewingOrder.user_name && (
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                      👤 <strong>{viewingOrder.user_name}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Edit Mode fields */}
              {isEditingOrderMode && (
                <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: '8px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontWeight: 700, fontSize: '12px', color: '#854d0e' }}>
                    ✏️ {t.modifyOrderParams} :
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                        {t.caisseAttachment}
                      </label>
                      <select
                        value={editingOrderCaisseId}
                        onChange={e => setEditingOrderCaisseId(Number(e.target.value))}
                        className="input-clean"
                        style={{ fontSize: '12px', padding: '6px 8px' }}
                      >
                        <option value="0">{t.noCaisseOption}</option>
                        {caisses.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({formatCurrency(c.current_balance)})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                        {t.paymentMethod}
                      </label>
                      <select
                        value={editingOrderPaymentMethod}
                        onChange={e => {
                          const m = e.target.value;
                          setEditingOrderPaymentMethod(m);
                          if (m === 'credit') {
                            setEditingOrderPaidAmount(0);
                            setEditingOrderCreditAmount(parseFloat(viewingOrder.total_amount) || 0);
                          } else if (m === 'especes' && editingOrderPaidAmount === 0) {
                            const tot = parseFloat(viewingOrder.total_amount) || 0;
                            setEditingOrderPaidAmount(tot);
                            setEditingOrderCreditAmount(0);
                          }
                        }}
                        className="input-clean"
                        style={{ fontSize: '12px', padding: '6px 8px' }}
                      >
                        <option value="especes">{t.paymentCash}</option>
                        <option value="mixte">{t.paymentMixte}</option>
                        <option value="credit">{t.paymentCredit}</option>
                        <option value="virement">{t.paymentTransfer}</option>
                        <option value="cheque">{t.paymentCheque}</option>
                      </select>
                    </div>
                  </div>

                  {/* Financial amounts editing */}
                  <div style={{ background: '#ffffff', borderRadius: '6px', padding: '10px 12px', border: '1px solid #fde047', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>
                        {t.paymentAndDebts} ({t.orderTotal} : {formatCurrency(viewingOrder.total_amount)}) :
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const tot = parseFloat(viewingOrder.total_amount) || 0;
                            setEditingOrderPaidAmount(tot);
                            setEditingOrderCreditAmount(0);
                            setEditingOrderPaymentMethod('especes');
                          }}
                          style={{ fontSize: '10px', padding: '2px 6px', background: editingOrderCreditAmount === 0 ? '#dcfce7' : '#f1f5f9', color: editingOrderCreditAmount === 0 ? '#15803d' : '#475569', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                        >
                          100% Cash
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const tot = parseFloat(viewingOrder.total_amount) || 0;
                            const half = Math.round(tot / 2);
                            setEditingOrderPaidAmount(half);
                            setEditingOrderCreditAmount(tot - half);
                            setEditingOrderPaymentMethod('mixte');
                          }}
                          style={{ fontSize: '10px', padding: '2px 6px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          50%
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const tot = parseFloat(viewingOrder.total_amount) || 0;
                            setEditingOrderPaidAmount(0);
                            setEditingOrderCreditAmount(tot);
                            setEditingOrderPaymentMethod('credit');
                          }}
                          style={{ fontSize: '10px', padding: '2px 6px', background: editingOrderPaidAmount === 0 ? '#fee2e2' : '#f1f5f9', color: editingOrderPaidAmount === 0 ? '#b91c1c' : '#475569', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                        >
                          100% Crédit
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#166534', display: 'block', marginBottom: '3px' }}>
                          💵 {t.cashOutflowLabel} :
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="number"
                            min="0"
                            max={viewingOrder.total_amount}
                            step="any"
                            value={editingOrderPaidAmount}
                            onChange={e => {
                              const tot = parseFloat(viewingOrder.total_amount) || 0;
                              const p = Math.max(0, Math.min(tot, parseFloat(e.target.value) || 0));
                              setEditingOrderPaidAmount(p);
                              setEditingOrderCreditAmount(Math.max(0, tot - p));
                            }}
                            className="input-clean"
                            style={{ fontSize: '13px', fontWeight: 800, color: '#15803d', paddingRight: '36px' }}
                          />
                          <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#94a3b8', fontWeight: 700, pointerEvents: 'none' }}>DA</span>
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#b45309', display: 'block', marginBottom: '3px' }}>
                          📜 {t.remainingDebtLabel} :
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="number"
                            readOnly
                            value={editingOrderCreditAmount}
                            className="input-clean"
                            style={{ fontSize: '13px', fontWeight: 800, color: editingOrderCreditAmount > 0 ? '#dc2626' : '#16a34a', background: '#f8fafc', paddingRight: '36px' }}
                          />
                          <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#94a3b8', fontWeight: 700, pointerEvents: 'none' }}>DA</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '11px', color: editingOrderCreditAmount > 0 ? '#b45309' : '#166534', fontWeight: 600 }}>
                      {editingOrderCreditAmount > 0 
                        ? `ℹ️ ${formatCurrency(editingOrderPaidAmount)} | +${formatCurrency(editingOrderCreditAmount)}`
                        : `✓ ${t.orderFullPaidNotice}`
                      }
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                      {t.notesRemarks}
                    </label>
                    <input
                      type="text"
                      value={editingOrderNotes}
                      onChange={e => setEditingOrderNotes(e.target.value)}
                      placeholder={t.notesRemarks}
                      className="input-clean"
                      style={{ fontSize: '12px', padding: '6px 8px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setIsEditingOrderMode(false)}
                      className="btn-secondary"
                      style={{ fontSize: '11px', padding: '5px 12px' }}
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveOrderEdits}
                      className="btn-green"
                      style={{ fontSize: '11px', padding: '5px 12px' }}
                    >
                      {t.saveChanges}
                    </button>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                  {t.orderReceivedItems} ({viewingOrderItems.length}) :
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="clean-table" style={{ width: '100%', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th>{t.articleDesignation}</th>
                        <th>{t.unit}</th>
                        <th style={{ textAlign: 'center' }}>{t.quantity}</th>
                        <th style={{ textAlign: 'right' }}>{t.unitPrice}</th>
                        <th style={{ textAlign: 'right' }}>{t.subtotal}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingOrderItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>
                            {t.noOrderItems}
                          </td>
                        </tr>
                      ) : (
                        viewingOrderItems.map((it, idx) => (
                          <tr key={idx}>
                            <td>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{it.product_name}</div>
                              {it.sku && <span style={{ fontSize: '10px', color: '#64748b' }}>SKU: {it.sku}</span>}
                            </td>
                            <td>
                              <span className="badge-clean badge-green" style={{ fontSize: '10px' }}>
                                {it.unit_name}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700 }}>
                              {it.quantity}
                            </td>
                            <td style={{ textAlign: 'right', color: '#166534', fontWeight: 600 }} dir="ltr">
                              {formatCurrency(it.unit_price)}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: '#15803d' }} dir="ltr">
                              {formatCurrency(it.total_price)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {viewingOrder.notes && !isEditingOrderMode && (
                <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '6px', fontSize: '12px', color: '#475569' }}>
                  <strong>{t.notesRemarks} :</strong> {viewingOrder.notes}
                </div>
              )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#ffffff'
            }}>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{t.grandTotal} : </span>
                <strong style={{ fontSize: '18px', color: '#15803d', fontWeight: 800 }} dir="ltr">
                  {formatCurrency(viewingOrder.total_amount)}
                </strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingOrderId(viewingOrder.id);
                      setViewingOrder(null);
                    }}
                    style={{
                      background: '#fee2e2',
                      color: '#b91c1c',
                      border: '1px solid #fecaca',
                      padding: '7px 12px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {t.deleteOrderBtn}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setViewingOrder(null); setIsEditingOrderMode(false); }}
                  className="btn-secondary"
                >
                  {t.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CONFIRM DELETE ORDER MODAL */}
      {/* ========================================================= */}
      {deletingOrderId && (
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
          <div className="clean-card" style={{ maxWidth: '440px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#dc2626', marginBottom: '12px' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>{t.confirmDeleteOrderTitle} #{deletingOrderId}</h3>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, marginBottom: '16px' }}>
              {t.confirmDeleteOrderDesc}
              <br /><br />
              <strong style={{ color: '#0f172a' }}>{t.deleteOrderWarning}</strong>
              <ul style={{ margin: '8px 0 0 16px', padding: 0, fontSize: '12px' }}>
                <li>{t.deleteOrderPoint1}</li>
                <li>{t.deleteOrderPoint2}</li>
                <li>{t.deleteOrderPoint3}</li>
              </ul>
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeletingOrderId(null)}
                className="btn-secondary"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteOrder(deletingOrderId)}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {t.confirmDeleteBtn}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
