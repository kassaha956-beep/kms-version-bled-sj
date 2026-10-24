import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ShoppingCart, Search, Plus, Minus, Trash2, X, CheckCircle,
  RefreshCw, Package, Printer, User, Star, Volume2, VolumeX,
  CreditCard, Banknote, AlertCircle, Clock, Keyboard,
  Barcode, ArrowRightLeft, Zap, Copy, Smartphone
} from 'lucide-react';
import type { Language, Translations } from '../i18n';
import { translations } from '../i18n';
import { hasPermission } from '../permissions';

interface ProductUnit {
  id?: number;
  unit_name: string;
  conversion_factor: number;
  selling_price: number;
  cost_price?: number;
  barcode?: string;
  is_default?: number;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  selling_price: number;
  cost_price: number;
  stock_quantity: number;
  min_stock_alert?: number;
  category_id?: number;
  category_name?: string;
  category_color?: string;
  base_unit: string;
  is_favorite?: number;
  units?: ProductUnit[];
}

interface CartItem {
  product: Product;
  unit_name: string;
  conversion_factor: number;
  selling_price: number;
  cost_price: number;
  quantity: number;
  discount_percent: number;
  is_service?: boolean;
  service_type?: 'flexy' | 'photocopie' | 'other';
  operator?: string;
  phone_number?: string;
}

interface HeldCart {
  id: number;
  label: string;
  cart: CartItem[];
  client: any | null;
  savedAt: string;
}

interface Client {
  id: number;
  name: string;
  phone?: string;
  current_debt: number;
}

interface Props {
  currentLang: Language | string;
  currentUser: any;
}

const api = (window as any).electronAPI;
const fmt = (n: number) => `${(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA`;
const fmtN = (n: number) => (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

class SoundFX {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  constructor() {
    try {
      const s = localStorage.getItem('pos_sound_enabled');
      this.enabled = s !== 'false';
    } catch {
      this.enabled = true;
    }
  }
  private initCtx() {
    if (!this.ctx) {
      const A = window.AudioContext || (window as any).webkitAudioContext;
      if (A) this.ctx = new A();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  public setEnabled(v: boolean) {
    this.enabled = v;
    try { localStorage.setItem('pos_sound_enabled', String(v)); } catch {}
  }
  public beep() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(1150, this.ctx.currentTime);
      g.gain.setValueAtTime(0.18, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + 0.05);
    } catch {}
  }
  public chime() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      [587.33, 739.99, 880.00, 1174.66].forEach((freq, i) => {
        if (!this.ctx) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        const s = this.ctx.currentTime + i * 0.06;
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, s);
        g.gain.setValueAtTime(0.22, s);
        g.gain.exponentialRampToValueAtTime(0.001, s + 0.28);
        o.connect(g);
        g.connect(this.ctx.destination);
        o.start(s);
        o.stop(s + 0.28);
      });
    } catch {}
  }
  public error() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(190, this.ctx.currentTime);
      g.gain.setValueAtTime(0.2, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + 0.14);
    } catch {}
  }
}
const sound = new SoundFX();

export const isCigaretteProduct = (product: Product): boolean => {
  if (!product) return false;
  const cat = (product.category_name || '').toLowerCase();
  const unit = (product.base_unit || '').toLowerCase();
  const name = (product.name || '').toLowerCase();
  if (cat.includes('tabac') || cat.includes('cig') || cat.includes('fumeur')) return true;
  if (unit.includes('tige') || unit.includes('feuille') || unit.includes('cig')) return true;
  if (name.includes('marlboro') || name.includes('gauloise') || name.includes('ocb') ||
      name.includes('winston') || name.includes('l&m') || name.includes('camel') ||
      name.includes('tabac') || name.includes('rotmans') || name.includes('west')) return true;
  if (product.units && product.units.length > 1) {
    const hasPack = product.units.some(u => (u.unit_name||'').toLowerCase().includes('paquet') || (u.unit_name||'').toLowerCase().includes('carnet'));
    const hasSingle = product.units.some(u => (u.unit_name||'').toLowerCase().includes('tige') || (u.unit_name||'').toLowerCase().includes('feuille') || u.conversion_factor === 1);
    if (hasPack && hasSingle) return true;
  }
  return false;
};

export const formatCigaretteStock = (totalUnits: number, packFactor: number = 20, isOcb: boolean = false) => {
  const pF = Math.max(1, packFactor);
  const packs = Math.floor(totalUnits / pF);
  const loose = Math.round(totalUnits % pF);
  const pN = isOcb ? 'Carnet' : 'Pqt';
  const lN = isOcb ? 'f.' : 'tiges';
  if (packs > 0 && loose > 0) return `${packs} ${pN} + ${loose} ${lN}`;
  if (packs > 0) return `${packs} ${pN}${packs > 1 ? 's' : ''}`;
  return `${loose} ${lN}`;
};

export default function VentesPage({ currentLang, currentUser }: Props) {
  const t: Translations = translations[currentLang as Language] || translations.fr;
  const isRtl = currentLang === 'ar';
  const canSellCredit = hasPermission(currentUser, 'ventes.credit');
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const [soundEnabled, setSoundEnabled] = useState<boolean>(sound.enabled);
  const toggleSound = () => {
    const n = !soundEnabled;
    sound.setEnabled(n);
    setSoundEnabled(n);
    if (n) sound.beep();
  };

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString(currentLang === 'ar' ? 'ar-DZ' : currentLang === 'en' ? 'en-US' : 'fr-FR'));
  useEffect(() => {
    const loc = currentLang === 'ar' ? 'ar-DZ' : currentLang === 'en' ? 'en-US' : 'fr-FR';
    const interval = setInterval(() => setCurrentTime(new Date().toLocaleTimeString(loc)), 1000);
    return () => clearInterval(interval);
  }, [currentLang]);

  const [toast, setToast] = useState<{ msg: string; type: 'success'|'error'|'info' }|null>(null);
  const showToast = (msg: string, type: 'success'|'error'|'info' = 'success') => {
    setToast({ msg, type });
    if (type === 'error') sound.error();
    setTimeout(() => setToast(null), 3200);
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [prodSearch, setProdSearch] = useState('');
  const [loadingProds, setLoadingProds] = useState(false);
  const [activeTabFilter, setActiveTabFilter] = useState<'favorites'|'all'|'cigarette'|'services'>('favorites');
  const [selectedCatId, setSelectedCatId] = useState<number|'all'>('all');
  const [barcodeScanVal, setBarcodeScanVal] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastQtyInputRef = useRef<HTMLInputElement>(null);
  const [editingQty, setEditingQty] = useState<{ [key: string]: string }>({});
  const [lastSelectedItem, setLastSelectedItem] = useState<{ product: Product; unitName: string }|null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [heldCartCounter, setHeldCartCounter] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showAdvancedCheckout, setShowAdvancedCheckout] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastScannedDisplay, setLastScannedDisplay] = useState<{ name: string; unit: string; price: number; qty: number } | null>(null);

  // Multi-Services & Flexy Quick POS States
  const [serviceTarifs, setServiceTarifs] = useState({
    photocopie_nb: 10,
    photocopie_color: 30,
    photocopie_rv_nb: 15,
    photocopie_rv_color: 50,
    impression_doc: 20,
    scan_doc: 20,
    plastification: 50,
    flexy_commission_fixed: 0
  });
  const [posFlexyOp, setPosFlexyOp] = useState<'mobilis'|'djezzy'|'ooredoo'>('mobilis');
  const [posFlexyPhone, setPosFlexyPhone] = useState('');
  const [posFlexyCustomAmt, setPosFlexyCustomAmt] = useState('');
  const [posCopyMultiplier, setPosCopyMultiplier] = useState(1);

  // Load configured service prices
  useEffect(() => {
    if (api?.getServicesSettings) {
      api.getServicesSettings().then((r: any) => {
        if (r?.success && r.tarifs) setServiceTarifs(r.tarifs);
      }).catch(() => {});
    }
  }, []);

  const handlePosPhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 10);
    setPosFlexyPhone(clean);
    if (clean.startsWith('06') || clean.startsWith('09')) {
      setPosFlexyOp('mobilis');
    } else if (clean.startsWith('07')) {
      setPosFlexyOp('djezzy');
    } else if (clean.startsWith('05')) {
      setPosFlexyOp('ooredoo');
    }
  };

  const addFlexyToCart = (operator: 'mobilis' | 'djezzy' | 'ooredoo', amount: number, phoneNumber: string = '', fee: number = 0) => {
    if (amount <= 0) return;
    const opNames: Record<string, string> = {
      mobilis: 'Flexy Mobilis',
      djezzy: 'Flexy Djezzy',
      ooredoo: 'Flexy Ooredoo'
    };
    const title = `${opNames[operator]} ${amount} DA${phoneNumber ? ` (${phoneNumber})` : ''}`;
    const sellPrice = amount + fee;
    const virtualProduct: Product = {
      id: -(100000 + (Date.now() % 800000)),
      name: title,
      sku: `FLX-${operator.toUpperCase()}-${amount}`,
      selling_price: sellPrice,
      cost_price: amount,
      stock_quantity: 999999,
      base_unit: 'Recharge'
    };

    setCart(prev => {
      sound.beep();
      setLastScannedDisplay({ name: title, unit: 'Recharge', price: sellPrice, qty: 1 });
      return [{
        product: virtualProduct,
        unit_name: 'Recharge',
        conversion_factor: 1,
        selling_price: sellPrice,
        cost_price: amount,
        quantity: 1,
        discount_percent: 0,
        is_service: true,
        service_type: 'flexy',
        operator: operator,
        phone_number: phoneNumber
      }, ...prev];
    });
    showToast(`Ajouté: ${title} (${fmt(sellPrice)})`, 'success');
  };

  const addCopyServiceToCart = (serviceType: string, qty: number = 1) => {
    if (qty <= 0) return;
    const serviceNames: Record<string, string> = {
      photocopie_nb: 'Photocopie N&B',
      photocopie_color: 'Photocopie Couleur',
      photocopie_rv_nb: 'Photocopie R/V N&B',
      photocopie_rv_color: 'Photocopie R/V Couleur',
      impression_doc: 'Impression Document',
      scan_doc: 'Scan Numérisation',
      plastification: 'Plastification A4'
    };
    const label = serviceNames[serviceType] || 'Photocopie';
    const unitPrice = (serviceTarifs as any)[serviceType] || 10;
    const title = `${label}`;
    const virtualProduct: Product = {
      id: -(200000 + (Date.now() % 700000)),
      name: title,
      sku: `SRV-${serviceType.toUpperCase()}`,
      selling_price: unitPrice,
      cost_price: Math.round(unitPrice * 0.2),
      stock_quantity: 999999,
      base_unit: 'Page'
    };

    setCart(prev => {
      const existingIdx = prev.findIndex(it => it.is_service && it.product.sku === virtualProduct.sku);
      if (existingIdx >= 0) {
        const u = [...prev];
        const newQ = u[existingIdx].quantity + qty;
        u[existingIdx] = { ...u[existingIdx], quantity: newQ };
        sound.beep();
        setLastScannedDisplay({ name: title, unit: 'Page', price: unitPrice, qty: newQ });
        return u;
      }
      sound.beep();
      setLastScannedDisplay({ name: title, unit: 'Page', price: unitPrice, qty });
      return [{
        product: virtualProduct,
        unit_name: 'Page',
        conversion_factor: 1,
        selling_price: unitPrice,
        cost_price: Math.round(unitPrice * 0.2),
        quantity: qty,
        discount_percent: 0,
        is_service: true,
        service_type: 'photocopie'
      }, ...prev];
    });
    showToast(`Ajouté: ${qty}x ${label} (${fmt(unitPrice * qty)})`, 'success');
  };

  const loadProducts = useCallback(async () => {
    setLoadingProds(true);
    try {
      if (api?.getProductsForPOS) {
        const r = await api.getProductsForPOS();
        if (r?.success) setProducts(r.products || []);
      } else if (api?.getProducts) {
        const r = await api.getProducts({ pageSize: 50000, status: 'active' });
        if (r?.success) setProducts(r.products || []);
      }
    } finally {
      setLoadingProds(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    if (api?.getCategories) {
      const r = await api.getCategories();
      if (r?.success) setCategories(r.categories || []);
    }
  }, []);

  const loadClients = useCallback(async () => {
    if (api?.getClients) {
      const r = await api.getClients({ search: clientSearch, pageSize: 50 });
      if (r?.success) setClients(r.clients || []);
    }
  }, [clientSearch]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { loadClients(); }, [loadClients]);
  useEffect(() => { barcodeInputRef.current?.focus(); }, []);

  // Listen for global refresh and product updates so newly added products appear immediately
  useEffect(() => {
    const handleGlobalRefresh = () => {
      loadProducts();
      loadCategories();
      loadClients();
    };
    const handleTabActivated = (e: any) => {
      if (e?.detail === 'ventes') {
        loadProducts();
      }
    };
    window.addEventListener('app:refresh', handleGlobalRefresh);
    window.addEventListener('products:updated', handleGlobalRefresh);
    window.addEventListener('app:tabActivated', handleTabActivated);
    return () => {
      window.removeEventListener('app:refresh', handleGlobalRefresh);
      window.removeEventListener('products:updated', handleGlobalRefresh);
      window.removeEventListener('app:tabActivated', handleTabActivated);
    };
  }, [loadProducts, loadCategories, loadClients]);

  const toggleFavorite = async (pId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (api?.toggleProductFavorite) {
        const r = await api.toggleProductFavorite(pId);
        if (r?.success) {
          setProducts(prev => prev.map(p => p.id === pId ? { ...p, is_favorite: r.is_favorite } : p));
          sound.beep();
        }
      }
    } catch {}
  };

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (prodSearch.trim()) {
      const q = prodSearch.toLowerCase();
      return list.filter(p => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)) || (p.barcode && p.barcode.includes(q)));
    }
    if (activeTabFilter === 'favorites') list = list.filter(p => p.is_favorite === 1);
    else if (activeTabFilter === 'cigarette') list = list.filter(p => isCigaretteProduct(p));
    else if (activeTabFilter === 'services') list = [];
    if (selectedCatId !== 'all') list = list.filter(p => p.category_id === selectedCatId);
    return list;
  }, [products, prodSearch, activeTabFilter, selectedCatId]);

  const addToCartWithUnit = (product: Product, targetUnitName?: string) => {
    if (product.stock_quantity <= 0) {
      showToast(`Stock épuisé: "${product.name}"`, 'error');
      return;
    }

    let desiredUnitName = targetUnitName;

    // Intelligent cigarette memory logic:
    if (!desiredUnitName && isCigaretteProduct(product)) {
      if (lastSelectedItem && lastSelectedItem.product.id === product.id) {
        // Same cigarette as last scanned: retain the active unit (e.g. 'Tige' or 'Paquet')
        desiredUnitName = lastSelectedItem.unitName;
      } else {
        // Fresh / different product: default to Paquet (conversion_factor > 1)
        const packUnit = product.units?.find(u => (u.conversion_factor || 1) > 1);
        desiredUnitName = packUnit ? packUnit.unit_name : undefined;
      }
    }

    let su: ProductUnit|null = null;
    if (desiredUnitName && product.units) {
      su = product.units.find(u => u.unit_name.toLowerCase() === desiredUnitName!.toLowerCase()) || null;
    }
    if (!su && isCigaretteProduct(product) && product.units) {
      su = product.units.find(u => (u.conversion_factor || 1) > 1) || product.units.find(u => u.is_default) || product.units[0];
    }
    if (!su && product.units && product.units.length > 0) {
      su = product.units.find(u => u.is_default) || product.units[0];
    }
    const unitName = su ? su.unit_name : (product.base_unit || 'Pièce');
    const factor = su ? (Number(su.conversion_factor) || 1) : 1;
    const sellPrice = su ? Number(su.selling_price) : Number(product.selling_price);
    const costPrice = su && su.cost_price ? Number(su.cost_price) : (Number(product.cost_price) * factor);
    setLastSelectedItem({ product, unitName });
    setCart(prev => {
      const idx = prev.findIndex(i => i.product.id === product.id && i.unit_name === unitName);
      if (idx >= 0) {
        if ((prev[idx].quantity + 1) * factor > product.stock_quantity) {
          showToast('Stock max atteint', 'error');
          return prev;
        }
        const u = [...prev];
        const newQty = u[idx].quantity + 1;
        u[idx] = { ...u[idx], quantity: newQty };
        setLastScannedDisplay({ name: product.name, unit: unitName, price: sellPrice, qty: newQty });
        sound.beep();
        return u;
      }
      if (factor > product.stock_quantity) {
        showToast('Stock insuffisant', 'error');
        return prev;
      }
      sound.beep();
      setLastScannedDisplay({ name: product.name, unit: unitName, price: sellPrice, qty: 1 });
      return [{
        product,
        unit_name: unitName,
        conversion_factor: factor,
        selling_price: sellPrice,
        cost_price: costPrice,
        quantity: 1,
        discount_percent: 0
      }, ...prev];
    });
  };

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const val = barcodeScanVal.trim();
    if (!val) return;
    let mp: Product|undefined, mu: string|undefined;
    for (const p of products) {
      if (p.units) {
        const u = p.units.find(u => u.barcode && u.barcode.trim() === val);
        if (u) { mp = p; mu = u.unit_name; break; }
      }
    }
    if (!mp) {
      mp = products.find(p => (p.barcode && p.barcode.trim() === val) || (p.sku && p.sku.trim().toLowerCase() === val.toLowerCase()));
    }
    if (mp) {
      if (isCigaretteProduct(mp)) {
        if (lastSelectedItem && lastSelectedItem.product.id === mp.id) {
          // If the last scanned product was this same cigarette, keep its active mode (Tige or Paquet)
          mu = lastSelectedItem.unitName;
        } else {
          // First scan or different product previously: start fresh with Paquet
          const pu = mp.units?.find(u => (u.conversion_factor || 1) > 1);
          mu = pu ? pu.unit_name : mu;
        }
      }
      addToCartWithUnit(mp, mu);
      showToast(`+ ${mp.name} (${mu || mp.base_unit || 'Pqt'})`, 'success');
    } else {
      sound.error();
      showToast(`Code-barres inconnu: "${val}"`, 'error');
    }
    setTimeout(() => {
      setBarcodeScanVal('');
      barcodeInputRef.current?.select();
    }, 40);
  };

  const toggleLastSelectedUnit = () => {
    if (!lastSelectedItem) return;
    const p = lastSelectedItem.product;
    if (!isCigaretteProduct(p)) return;
    const isOcb = (p.name || '').toLowerCase().includes('ocb');
    const packUnit = p.units?.find(u => (u.conversion_factor || 1) > 1);
    const singleUnit = p.units?.find(u => (u.conversion_factor || 1) === 1);
    const packName = packUnit?.unit_name || 'Paquet';
    const singleName = singleUnit?.unit_name || (isOcb ? 'Feuille' : 'Tige');
    const curIsPack = lastSelectedItem.unitName === packName;
    const destName = curIsPack ? singleName : packName;
    const destObj = curIsPack ? singleUnit : packUnit;
    const factor = destObj ? (Number(destObj.conversion_factor) || 1) : (curIsPack ? 1 : 20);
    const sellPrice = destObj ? Number(destObj.selling_price) : (curIsPack ? 20 : p.selling_price);
    const costPrice = destObj?.cost_price ? Number(destObj.cost_price) : (Number(p.cost_price) * factor);

    setCart(prev => {
      const si = prev.findIndex(i => i.product.id === p.id && i.unit_name !== destName);
      const di = prev.findIndex(i => i.product.id === p.id && i.unit_name === destName);
      if (si >= 0) {
        const u = [...prev], src = u[si];
        if (src.quantity <= 1) u.splice(si, 1);
        else u[si] = { ...src, quantity: src.quantity - 1 };
        const ndi = u.findIndex(i => i.product.id === p.id && i.unit_name === destName);
        if (ndi >= 0) {
          u[ndi] = { ...u[ndi], quantity: u[ndi].quantity + 1 };
        } else {
          u.unshift({ product: p, unit_name: destName, conversion_factor: factor, selling_price: sellPrice, cost_price: costPrice, quantity: 1, discount_percent: 0 });
        }
        sound.beep();
        return u;
      } else if (di >= 0) {
        const u = [...prev];
        u[di] = { ...u[di], quantity: u[di].quantity + 1 };
        sound.beep();
        return u;
      } else {
        sound.beep();
        return [{ product: p, unit_name: destName, conversion_factor: factor, selling_price: sellPrice, cost_price: costPrice, quantity: 1, discount_percent: 0 }, ...prev];
      }
    });
    setLastSelectedItem({ product: p, unitName: destName });
    showToast(`→ ${destName} (${p.name})`, 'info');
    setTimeout(() => barcodeInputRef.current?.select(), 40);
  };

  const updateCartQty = (idx: number, delta: number) => {
    setCart(prev => {
      const u = [...prev], item = u[idx], nq = item.quantity + delta;
      if (nq <= 0) {
        sound.beep();
        u.splice(idx, 1);
        setLastScannedDisplay(prevD => (prevD && prevD.name === item.product.name) ? null : prevD);
        return u;
      }
      if (!item.is_service && nq * item.conversion_factor > item.product.stock_quantity) {
        showToast('Stock max atteint', 'error');
        return prev;
      }
      sound.beep();
      u[idx] = { ...item, quantity: nq };
      setLastScannedDisplay(prevD => (prevD && prevD.name === item.product.name) ? { ...prevD, qty: nq } : prevD);
      return u;
    });
  };

  const updateCartExactQty = (idx: number, nq: number) => {
    setCart(prev => {
      const u = [...prev];
      if (!u[idx]) return prev;
      const item = u[idx];
      if (nq <= 0) {
        sound.beep();
        u.splice(idx, 1);
        setLastScannedDisplay(prevD => (prevD && prevD.name === item.product.name) ? null : prevD);
        return u;
      }
      if (!item.is_service && nq * item.conversion_factor > item.product.stock_quantity) {
        showToast(`Stock max atteint (${Math.floor(item.product.stock_quantity / item.conversion_factor)} max)`, 'error');
        return prev;
      }
      u[idx] = { ...item, quantity: nq };
      setLastScannedDisplay(prevD => (prevD && prevD.name === item.product.name) ? { ...prevD, qty: nq } : prevD);
      return u;
    });
  };

  const focusLastQty = () => {
    if (lastQtyInputRef.current && cart.length > 0) {
      lastQtyInputRef.current.focus();
      lastQtyInputRef.current.select();
    }
  };

  const updateCartPrice = (idx: number, val: string) => {
    setCart(prev => {
      const u = [...prev];
      u[idx] = { ...u[idx], selling_price: Math.max(0, parseFloat(val) || 0) };
      return u;
    });
  };

  const removeCartItem = (idx: number) => {
    sound.beep();
    setCart(prev => {
      const it = prev[idx];
      if (it && lastScannedDisplay?.name === it.product.name) {
        setLastScannedDisplay(null);
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.selling_price * i.quantity, 0), [cart]);
  const totalDiscount = useMemo(() => cart.reduce((s, i) => s + (i.selling_price * i.quantity * i.discount_percent / 100), 0), [cart]);
  const totalAmount = useMemo(() => Math.max(0, subtotal - totalDiscount), [subtotal, totalDiscount]);
  const totalCost = useMemo(() => cart.reduce((s, i) => s + i.cost_price * i.quantity, 0), [cart]);
  const grossProfit = useMemo(() => totalAmount - totalCost, [totalAmount, totalCost]);
  const cashRcv = parseFloat(cashReceived) || 0;
  const creditAmount = Math.max(0, totalAmount - cashRcv);
  const changeReturned = Math.max(0, cashRcv - totalAmount);

  const handleConfirmSale = async (mode: 'cash'|'credit'|'partial') => {
    if (cart.length === 0) {
      showToast('Le panier est vide', 'error');
      return;
    }
    if (!currentUser?.id) {
      showToast('Utilisateur non connecté', 'error');
      return;
    }
    let effCash = totalAmount;
    let effCredit = 0;
    if (mode === 'cash') {
      effCash = totalAmount;
      effCredit = 0;
    } else if (mode === 'credit') {
      effCash = 0;
      effCredit = totalAmount;
      if (!selectedClient) {
        showToast('Client requis pour vente à crédit', 'error');
        return;
      }
    } else {
      effCash = cashRcv;
      effCredit = Math.max(0, totalAmount - cashRcv);
      if (effCredit > 0 && !selectedClient) {
        showToast('Client requis pour montant à crédit', 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const items = cart.map(i => ({
        product_id: i.is_service ? null : i.product.id,
        product_name: i.product.name,
        unit_name: i.unit_name,
        conversion_factor: i.conversion_factor,
        quantity: i.quantity,
        cost_price: i.cost_price,
        selling_price: i.selling_price,
        discount_percent: i.discount_percent,
        is_service: i.is_service,
        service_type: i.service_type,
        operator: i.operator,
        phone_number: i.phone_number
      }));

      const res = api?.createVente
        ? await api.createVente({
            items,
            client_id: selectedClient?.id || null,
            client_name: selectedClient?.name || 'Client Anonyme',
            user_id: currentUser.id,
            user_name: currentUser.full_name || currentUser.username,
            caisse_id: null,
            cash_received: effCash,
            notes: mode === 'cash' ? 'Vente rapide comptoir' : checkoutNotes
          })
        : { success: false, message: 'API non disponible' };

      if (res?.success) {
        sound.chime();
        setLastSale({
          saleNumber: res.saleNumber,
          date: new Date().toLocaleString(currentLang === 'ar' ? 'ar-DZ' : currentLang === 'en' ? 'en-US' : 'fr-FR'),
          totalAmount,
          subtotal,
          totalDiscount,
          cashRcv: effCash,
          changeReturned: Math.max(0, effCash - totalAmount),
          creditAmount: effCredit,
          client: selectedClient,
          items: [...cart],
          grossProfit,
          user: currentUser
        });
        setCart([]);
        setSelectedClient(null);
        setLastScannedDisplay(null);
        setCashReceived('');
        setCheckoutNotes('');
        setShowAdvancedCheckout(false);
        setShowCreditModal(false);
        showToast(`Vente ${res.saleNumber} encaissée — ${fmt(totalAmount)}`, 'success');
        loadProducts();
      } else {
        showToast(res?.message || 'Erreur lors de la validation', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Erreur inattendue', 'error');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (e.key === 'F2' || (e.key === '/' && !isInput)) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === 'F4') {
        e.preventDefault();
        setActiveTabFilter(p => p === 'favorites' ? 'all' : 'favorites');
        sound.beep();
        return;
      }
      if (e.key === 'F5') {
        e.preventDefault();
        toggleLastSelectedUnit();
        return;
      }
      if (e.key === 'Shift') {
        if (!isInput || e.target === barcodeInputRef.current) {
          if (lastQtyInputRef.current && cart.length > 0) {
            e.preventDefault();
            lastQtyInputRef.current.focus();
            lastQtyInputRef.current.select();
            return;
          }
        }
      }
      if (e.key === 'F6' && cart.length > 0) {
        e.preventDefault();
        const label = `Panier #${heldCartCounter}`;
        setHeldCarts(prev => [...prev, {
          id: Date.now(),
          label,
          cart: [...cart],
          client: selectedClient,
          savedAt: new Date().toLocaleTimeString('fr-FR')
        }]);
        setHeldCartCounter(c => c + 1);
        setCart([]);
        setSelectedClient(null);
        setLastScannedDisplay(null);
        sound.beep();
        return;
      }
      if (e.key === 'F7') {
        if (showAdvancedCheckout) {
          e.preventDefault();
          handleConfirmSale('partial');
        } else if (cart.length > 0) {
          e.preventDefault();
          handleConfirmSale('cash');
        }
        return;
      }
      if (e.key === 'F8' && cart.length > 0) {
        e.preventDefault();
        setShowCreditModal(true);
        return;
      }
      if (e.key === 'F10') {
        e.preventDefault();
        if (cart.length > 0) {
          setCashReceived(fmtN(totalAmount));
          setShowAdvancedCheckout(true);
        }
        return;
      }
      if (e.key === 'Escape') {
        if (showCreditModal) setShowCreditModal(false);
        else if (showAdvancedCheckout) setShowAdvancedCheckout(false);
        else if (showReceiptModal) setShowReceiptModal(false);
        else if (prodSearch) setProdSearch('');
        return;
      }
      if (!isInput && cart.length > 0) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          updateCartQty(0, 1);
        } else if (e.key === '-') {
          e.preventDefault();
          updateCartQty(0, -1);
        } else if (e.key === 'Delete') {
          e.preventDefault();
          removeCartItem(0);
        }
      }
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, [cart, heldCarts, heldCartCounter, selectedClient, showAdvancedCheckout, showReceiptModal, showCreditModal, prodSearch, totalAmount, lastSelectedItem]);

  const lastIsCig = lastSelectedItem && isCigaretteProduct(lastSelectedItem.product);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 65px)',
      background: '#f8fafc',
      color: '#0f172a',
      userSelect: 'none',
      overflow: 'hidden',
      padding: '10px 12px',
      gap: '8px',
      boxSizing: 'border-box',
      direction: isRtl ? 'rtl' : 'ltr'
    }}>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '16px',
          right: isRtl ? 'auto' : '20px',
          left: isRtl ? '20px' : 'auto',
          zIndex: 9999,
          background: toast.type === 'success' ? '#15803d' : toast.type === 'error' ? '#dc2626' : '#0f172a',
          color: '#fff',
          padding: '9px 16px',
          borderRadius: '8px',
          fontWeight: 800,
          fontSize: '12px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toast.type === 'success' ? <CheckCircle size={15}/> : <AlertCircle size={15}/>}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* TOP HEADER: Compact & Informative */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '7px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        gap: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        {/* Last Scanned Product Display */}
        <div style={{
          background: '#0a0a0a',
          border: '2px solid #dc2626',
          borderRadius: '8px',
          padding: '6px 14px',
          minWidth: '240px',
          maxWidth: '460px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxShadow: '0 0 12px rgba(220,38,38,0.25)',
          flexShrink: 0
        }}>
          {lastScannedDisplay ? (
            <>
              <div style={{
                fontSize: '8px',
                fontWeight: 700,
                color: '#dc2626',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '2px'
              }}>DERNIER SCAN</div>
              <div style={{
                fontSize: '13px',
                fontWeight: 900,
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.2
              }}>
                <span style={{ color: '#ffffff' }}>{lastScannedDisplay.name}</span>{' '}
                <span style={{ color: '#94a3b8', fontWeight: 800 }}>({fmtN(lastScannedDisplay.price)})</span>{' '}
                <span
                  onClick={focusLastQty}
                  title="Appuyer sur Shift ou cliquer pour modifier la quantité au clavier"
                  style={{
                    color: '#ef4444',
                    fontWeight: 900,
                    cursor: 'pointer',
                    background: 'rgba(239,68,68,0.18)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    border: '1px dashed #ef4444'
                  }}
                >
                  x {lastScannedDisplay.qty}
                </span>{' '}
                <span style={{ color: '#4ade80', fontWeight: 900 }}>= {fmtN(lastScannedDisplay.price * lastScannedDisplay.qty)} DA</span>
              </div>
            </>
          ) : (
            <div style={{ fontSize: '11px', color: '#4b5563', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em' }}>
              — SCAN EN ATTENTE —
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts Hint Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#64748b' }}>
          <Keyboard size={12} color="#0284c7"/>
          {[
            { key: 'F2', label: t.posSearchKbd },
            { key: 'F4', label: t.posFavoritesKbd },
            { key: 'F5', label: t.posTigePackKbd, hl: !!lastIsCig },
            { key: 'Shift', label: 'Qté', hl: true, onClick: focusLastQty },
            { key: 'F6', label: 'Attente' },
            { key: 'F7', label: t.posCheckoutKbd, green: true },
            { key: 'F8', label: t.posDebtKbd }
          ].map(s => (
            <span
              key={s.key}
              onClick={(s as any).onClick}
              title={(s as any).onClick ? 'Modifier la quantité du dernier produit' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                cursor: (s as any).onClick ? 'pointer' : 'default'
              }}
            >
              <kbd style={{
                background: s.green ? '#16a34a' : s.hl ? '#f0fdf4' : '#f8fafc',
                color: s.green ? '#fff' : s.hl ? '#15803d' : '#0f172a',
                border: `1px solid ${s.green ? '#16a34a' : s.hl ? '#86efac' : '#e2e8f0'}`,
                padding: '1px 4px',
                borderRadius: '3px',
                fontWeight: 800,
                fontSize: '9px',
                fontFamily: 'monospace'
              }}>
                {s.key}
              </kbd>
              <span style={{ fontSize: '10px' }}>{s.label}</span>
            </span>
          ))}
        </div>

        {/* User, Sound & Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={toggleSound}
            title={soundEnabled ? t.posSoundDisable : t.posSoundEnable}
            style={{
              background: soundEnabled ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${soundEnabled ? '#bbf7d0' : '#fecaca'}`,
              color: soundEnabled ? '#15803d' : '#dc2626',
              borderRadius: '6px',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {soundEnabled ? <Volume2 size={13}/> : <VolumeX size={13}/>}
          </button>
          <div style={{ fontSize: '11px', color: '#334155', fontWeight: 700 }}>
            {currentUser?.full_name || currentUser?.username || (currentLang === 'ar' ? 'أمين الصندوق' : currentLang === 'en' ? 'Cashier' : 'Caissier')}
          </div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: '12px',
            fontWeight: 800,
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Clock size={12} color="#64748b"/>
            {currentTime}
          </div>
        </div>
      </div>

      {/* MAIN PANES: Catalog (Left) + Panier (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        gap: '10px',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden'
      }}>

        {/* LEFT: CATALOG & BARCODE */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          minHeight: 0,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{
            padding: '10px 12px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {/* Dedicated Barcode Scanner + Text Search */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: '7px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Barcode size={14} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '9px', top: '50%', transform: 'translateY(-50%)', color: '#16a34a' }}/>
                <input
                  ref={barcodeInputRef}
                  value={barcodeScanVal}
                  onChange={e => setBarcodeScanVal(e.target.value)}
                  onFocus={e => e.target.select()}
                  onKeyDown={handleBarcodeScan}
                  placeholder={t.posScanBarcode}
                  style={{
                    width: '100%',
                    padding: isRtl ? '7px 30px 7px 10px' : '7px 10px 7px 30px',
                    background: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    borderRadius: '7px',
                    color: '#0f172a',
                    fontSize: '11px',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {barcodeScanVal && (
                  <button
                    onClick={() => { setBarcodeScanVal(''); barcodeInputRef.current?.focus(); }}
                    style={{ position: 'absolute', [isRtl ? 'left' : 'right']: '7px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    <X size={12}/>
                  </button>
                )}
              </div>

              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '9px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
                <input
                  ref={searchInputRef}
                  value={prodSearch}
                  onChange={e => setProdSearch(e.target.value)}
                  placeholder={t.posSearchItem}
                  style={{
                    width: '100%',
                    padding: isRtl ? '7px 28px 7px 10px' : '7px 10px 7px 28px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '7px',
                    color: '#0f172a',
                    fontSize: '11px',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {prodSearch && (
                  <button
                    onClick={() => setProdSearch('')}
                    style={{ position: 'absolute', [isRtl ? 'left' : 'right']: '7px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    <X size={12}/>
                  </button>
                )}
              </div>

              <button
                onClick={async () => {
                  if (api?.flushCache) await api.flushCache();
                  loadProducts();
                }}
                title={t.posRefreshItems}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#64748b',
                  borderRadius: '7px',
                  padding: '7px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={13} className={loadingProds ? 'animate-spin' : ''}/>
              </button>

              <button
                type="button"
                onClick={() => setActiveTabFilter(prev => prev === 'services' ? 'favorites' : 'services')}
                title="Accès rapide Flexy & Photocopies"
                style={{
                  background: activeTabFilter === 'services' ? '#0284c7' : '#f0f9ff',
                  border: '1px solid #7dd3fc',
                  color: activeTabFilter === 'services' ? '#ffffff' : '#0369a1',
                  borderRadius: '7px',
                  padding: '7px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Zap size={13} />
                <span>Flexy & Copie</span>
              </button>
            </div>

            {/* Filter Tabs & Category Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {[
                  { k: 'favorites' as const, l: `★ ${t.posTabFavorites} (${products.filter(p => p.is_favorite === 1).length})`, c: '#854d0e', bg: '#fefce8', b: '#eab308' },
                  { k: 'all' as const, l: `${t.posTabAll} (${products.length})`, c: '#1d4ed8', bg: '#eff6ff', b: '#93c5fd' },
                  { k: 'cigarette' as const, l: t.posTabTobacco, c: '#b91c1c', bg: '#fef2f2', b: '#fca5a5' },
                  { k: 'services' as const, l: '⚡ Flexy & Photocopies', c: '#0284c7', bg: '#e0f2fe', b: '#7dd3fc' }
                ].map(tab => (
                  <button
                    key={tab.k}
                    onClick={() => setActiveTabFilter(tab.k)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '5px',
                      fontSize: '10px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: activeTabFilter === tab.k ? tab.bg : '#ffffff',
                      color: activeTabFilter === tab.k ? tab.c : '#64748b',
                      border: `1px solid ${activeTabFilter === tab.k ? tab.b : '#e2e8f0'}`
                    }}
                  >
                    {tab.l}
                  </button>
                ))}
              </div>

              <select
                value={selectedCatId}
                onChange={e => setSelectedCatId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#0f172a',
                  borderRadius: '5px',
                  padding: '3px 7px',
                  fontSize: '10px',
                  fontWeight: 600,
                  outline: 'none'
                }}
              >
                <option value="all">{t.posAllCategories}</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Dynamic Cigarette T Shortcut Banner */}
            {lastIsCig && (() => {
              const p = lastSelectedItem!.product;
              const isOcb = (p.name || '').toLowerCase().includes('ocb');
              const packUnit = p.units?.find(u => (u.conversion_factor || 1) > 1);
              const singleUnit = p.units?.find(u => (u.conversion_factor || 1) === 1);
              const packFactor = packUnit?.conversion_factor || 20;
              const isCP = lastSelectedItem!.unitName === (packUnit?.unit_name || 'Paquet');
              return (
                <div style={{
                  background: isCP ? '#f0fdf4' : '#fff7ed',
                  border: `1px solid ${isCP ? '#86efac' : '#fed7aa'}`,
                  borderRadius: '6px',
                  padding: '5px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span>🚬</span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>{p.name}</span>
                    <span style={{ fontSize: '10px', color: '#166534', fontWeight: 700 }}>
                      {formatCigaretteStock(p.stock_quantity, packFactor, isOcb)}
                    </span>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>{t.posActiveMode} :</span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 900,
                      color: isCP ? '#0369a1' : '#c2410c',
                      background: isCP ? '#e0f2fe' : '#ffedd5',
                      padding: '1px 7px',
                      borderRadius: '4px',
                      border: `1px solid ${isCP ? '#bae6fd' : '#fed7aa'}`
                    }}>
                      {isCP ? `📦 ${t.posPack}` : `⚡ ${t.posSingle}`} ({isCP ? fmtN(packUnit?.selling_price || p.selling_price) : fmtN(singleUnit?.selling_price || 20)} DA)
                    </span>
                    <span style={{ fontSize: '9px', color: isCP ? '#166534' : '#9a3412', fontWeight: 600 }}>
                      ({t.posNextScans} : {lastSelectedItem!.unitName})
                    </span>
                  </div>
                  <button
                    onClick={toggleLastSelectedUnit}
                    title={currentLang === 'ar' ? 'تبديل العلبة ↔ السيجارة (مفتاح F5)' : currentLang === 'en' ? 'Toggle Pack ↔ Single (F5 key)' : 'Basculer Paquet ↔ Tige (Touche F5)'}
                    style={{
                      background: isCP ? '#16a34a' : '#ea580c',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      padding: '3px 8px',
                      fontSize: '10px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      flexShrink: 0
                    }}
                  >
                    <ArrowRightLeft size={10}/> [F5] {isCP ? t.posSwitchToSingle : t.posSwitchToPack}
                  </button>
                </div>
              );
            })()}
          </div>

          {/* Product Grid: High density, single click adds default unit (Paquet for cigarettes) */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 10px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '6px',
            alignContent: 'start',
            background: '#f8fafc'
          }}>
            {activeTabFilter === 'services' ? (
              <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* 1. GUICHET FLEXY POS */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8f0',
                  padding: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Smartphone size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                          ⚡ Flexy Express (Ajout direct au ticket)
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          Cliquez sur un montant pour l'ajouter instantanément au panier
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operator Pills */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '10px' }}>
                    {[
                      { id: 'mobilis' as const, name: 'Mobilis', code: '06 / 09', color: '#009640', bg: '#f0fdf4', b: '#86efac' },
                      { id: 'djezzy' as const, name: 'Djezzy', code: '07', color: '#e30613', bg: '#fef2f2', b: '#fca5a5' },
                      { id: 'ooredoo' as const, name: 'Ooredoo', code: '05', color: '#ed1c24', bg: '#fff1f2', b: '#fecdd3' }
                    ].map(op => {
                      const active = posFlexyOp === op.id;
                      return (
                        <button
                          type="button"
                          key={op.id}
                          onClick={() => setPosFlexyOp(op.id)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '8px',
                            border: `2px solid ${active ? op.color : '#e2e8f0'}`,
                            background: active ? op.bg : '#ffffff',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ fontSize: '12px', fontWeight: 900, color: active ? op.color : '#0f172a' }}>
                            {op.name.toUpperCase()}
                          </div>
                          <div style={{ fontSize: '9px', color: '#64748b' }}>{op.code}</div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Optional phone number */}
                  <div style={{ marginBottom: '10px' }}>
                    <input
                      type="text"
                      placeholder="N° téléphone client (ex: 06 61 23 45 67) - Optionnel..."
                      value={posFlexyPhone}
                      onChange={e => handlePosPhoneChange(e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '12px',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Touch-Friendly Flexy Price Buttons */}
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Tarifs Flexy rapides (1-clic pour ajouter) :
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', marginBottom: '10px' }}>
                    {[100, 200, 300, 500, 1000, 2000].map(amt => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => addFlexyToCart(posFlexyOp, amt, posFlexyPhone)}
                        style={{
                          padding: '10px 4px',
                          borderRadius: '8px',
                          border: '1.5px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#0f172a',
                          fontSize: '13px',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                        }}
                      >
                        <span>{amt} DA</span>
                        <span style={{ fontSize: '8px', color: '#16a34a', fontWeight: 800 }}>+ Panier</span>
                      </button>
                    ))}
                  </div>

                  {/* Custom flexy amount */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input
                      type="number"
                      placeholder="Autre montant DA (ex: 450)..."
                      value={posFlexyCustomAmt}
                      onChange={e => setPosFlexyCustomAmt(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        fontWeight: 700,
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const amt = parseFloat(posFlexyCustomAmt);
                        if (amt > 0) {
                          addFlexyToCart(posFlexyOp, amt, posFlexyPhone);
                          setPosFlexyCustomAmt('');
                        }
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        background: '#16a34a',
                        color: '#fff',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      + Ajouter Flexy
                    </button>
                  </div>
                </div>

                {/* 2. GUICHET PHOTOCOPIES & DOCUMENTS POS */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8f0',
                  padding: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Copy size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                          📄 Photocopies & Impression
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          Sélectionnez le nombre de copies puis cliquez sur le service
                        </div>
                      </div>
                    </div>

                    {/* Multiplier presets */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>Qté :</span>
                      {[1, 2, 5, 10, 20].map(m => (
                        <button
                          type="button"
                          key={m}
                          onClick={() => setPosCopyMultiplier(m)}
                          style={{
                            padding: '3px 7px',
                            borderRadius: '4px',
                            border: `1px solid ${posCopyMultiplier === m ? '#2563eb' : '#cbd5e1'}`,
                            background: posCopyMultiplier === m ? '#eff6ff' : '#ffffff',
                            color: posCopyMultiplier === m ? '#1d4ed8' : '#475569',
                            fontSize: '10px',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          x{m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Photocopy Quick Buttons Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '6px' }}>
                    {[
                      { id: 'photocopie_nb', label: 'Copie N&B', price: serviceTarifs.photocopie_nb, icon: '📄', color: '#334155' },
                      { id: 'photocopie_color', label: 'Copie Couleur', price: serviceTarifs.photocopie_color, icon: '🎨', color: '#dc2626' },
                      { id: 'photocopie_rv_nb', label: 'R/V N&B', price: serviceTarifs.photocopie_rv_nb, icon: '📑', color: '#475569' },
                      { id: 'photocopie_rv_color', label: 'R/V Couleur', price: serviceTarifs.photocopie_rv_color, icon: '🖼️', color: '#b91c1c' },
                      { id: 'impression_doc', label: 'Impression Doc', price: serviceTarifs.impression_doc, icon: '🖨️', color: '#2563eb' },
                      { id: 'scan_doc', label: 'Numérisation', price: serviceTarifs.scan_doc, icon: '📥', color: '#0891b2' },
                      { id: 'plastification', label: 'Plastification', price: serviceTarifs.plastification, icon: '✨', color: '#d97706' }
                    ].map(srv => (
                      <button
                        type="button"
                        key={srv.id}
                        onClick={() => addCopyServiceToCart(srv.id, posCopyMultiplier)}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '8px',
                          border: '1.5px solid #e2e8f0',
                          background: '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '3px',
                          textAlign: 'center',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>{srv.icon}</span>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>{srv.label}</span>
                        <span style={{ fontSize: '12px', fontWeight: 900, color: srv.color }}>
                          {srv.price * posCopyMultiplier} DA
                        </span>
                        {posCopyMultiplier > 1 && (
                          <span style={{ fontSize: '8px', color: '#64748b' }}>({posCopyMultiplier} x {srv.price} DA)</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : loadingProds ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px', color: '#16a34a', display: 'block' }}/>
                <div style={{ fontSize: '12px', fontWeight: 700 }}>{t.posLoadingItems}</div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 20px', color: '#64748b', background: '#ffffff', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                <Package size={30} style={{ margin: '0 auto 8px', opacity: 0.3, display: 'block' }}/>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                  {activeTabFilter === 'favorites' ? t.posNoFavoriteItems : t.posNoItemsFound}
                </div>
                {activeTabFilter === 'favorites' && (
                  <button
                    onClick={() => setActiveTabFilter('all')}
                    style={{
                      background: '#16a34a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      padding: '5px 12px',
                      fontSize: '10px',
                      fontWeight: 800,
                      marginTop: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    {t.posSeeAllItems} ({products.length})
                  </button>
                )}
              </div>
            ) : filteredProducts.map(product => {
              const isCig = isCigaretteProduct(product);
              const isOcb = (product.name || '').toLowerCase().includes('ocb') || (product.base_unit || '').toLowerCase().includes('feuille');
              const isOut = product.stock_quantity <= 0;
              const isLow = product.stock_quantity > 0 && product.stock_quantity <= (product.min_stock_alert || 5);
              const packUnit = product.units?.find(u => (u.conversion_factor || 1) > 1);
              const singleUnit = product.units?.find(u => (u.conversion_factor || 1) === 1);
              const packFactor = packUnit?.conversion_factor || (isOcb ? 32 : 20);
              // Cigarettes: show tige price by default (single cigarette price)
              const displayPrice = isCig
                ? (singleUnit?.selling_price || product.selling_price)
                : product.selling_price;

              return (
                <div
                  key={product.id}
                  onClick={() => {
                    if (!isOut) {
                      addToCartWithUnit(product);
                      setTimeout(() => barcodeInputRef.current?.focus(), 40);
                    }
                  }}
                  style={{
                    background: '#ffffff',
                    border: `1px solid ${product.is_favorite ? '#fde047' : isOut ? '#fecaca' : '#e2e8f0'}`,
                    borderRadius: '7px',
                    padding: '7px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    opacity: isOut ? 0.55 : 1,
                    cursor: isOut ? 'not-allowed' : 'pointer',
                    boxShadow: product.is_favorite ? '0 1px 4px rgba(234,179,8,0.15)' : '0 1px 2px rgba(0,0,0,0.03)',
                    transition: 'transform 0.08s',
                    minHeight: '70px',
                    textAlign: isRtl ? 'right' : 'left'
                  }}
                  onMouseEnter={e => {
                    if (!isOut) {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 3px 8px rgba(0,0,0,0.09)';
                    }
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = '';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = product.is_favorite ? '0 1px 4px rgba(234,179,8,0.15)' : '0 1px 2px rgba(0,0,0,0.03)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <button
                      type="button"
                      onClick={e => toggleFavorite(product.id, e)}
                      title={product.is_favorite ? (currentLang === 'ar' ? 'إزالة من المفضلة' : currentLang === 'en' ? 'Remove from favorites' : 'Retirer des favoris') : (currentLang === 'ar' ? 'إضافة إلى المفضلة' : currentLang === 'en' ? 'Add to favorites' : 'Ajouter aux favoris caisse')}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <Star
                        size={11}
                        color={product.is_favorite ? '#eab308' : '#cbd5e1'}
                        fill={product.is_favorite ? '#eab308' : 'none'}
                      />
                    </button>
                    <span style={{
                      fontSize: '8px',
                      fontWeight: 800,
                      padding: '1px 4px',
                      borderRadius: '3px',
                      background: isOut ? '#fef2f2' : isLow ? '#fffbeb' : '#f0fdf4',
                      color: isOut ? '#dc2626' : isLow ? '#b45309' : '#15803d',
                      border: `1px solid ${isOut ? '#fecaca' : isLow ? '#fde68a' : '#bbf7d0'}`
                    }}>
                      {isCig ? formatCigaretteStock(product.stock_quantity, packFactor, isOcb) : `${product.stock_quantity} ${product.base_unit}`}
                    </span>
                  </div>
                  <div style={{
                    fontWeight: 800,
                    fontSize: '11px',
                    color: '#0f172a',
                    lineHeight: 1.2,
                    flex: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginBottom: '5px'
                  }}>
                    {product.name}
                  </div>
                  <div style={{
                    background: isOut ? '#f1f5f9' : '#f0fdf4',
                    border: `1px solid ${isOut ? '#e2e8f0' : '#bbf7d0'}`,
                    borderRadius: '4px',
                    padding: '3px 6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    {isCig && <span style={{ fontSize: '8px', color: '#c2410c', fontWeight: 700 }}>🚬 {t.posSingle}</span>}
                    <span style={{ fontSize: '11px', fontWeight: 900, color: isOut ? '#94a3b8' : '#15803d' }}>
                      {fmtN(displayPrice)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: PANIER (Full Height, 1 Line per Item) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          minHeight: 0,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          {/* Header */}
          <div style={{
            padding: '8px 12px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 900, color: '#0f172a' }}>
              <ShoppingCart size={14} color="#16a34a"/>
              <span>{t.posCart}</span>
              <span style={{
                background: '#f0fdf4',
                color: '#15803d',
                borderRadius: '10px',
                padding: '1px 7px',
                fontSize: '10px',
                fontWeight: 900,
                border: '1px solid #bbf7d0'
              }}>
                {cart.length}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {/* Hold current cart */}
              <button
                title="Mettre en attente [F6]"
                onClick={() => {
                  if (cart.length === 0) return;
                  const label = `Panier #${heldCartCounter}`;
                  setHeldCarts(prev => [...prev, {
                    id: Date.now(),
                    label,
                    cart: [...cart],
                    client: selectedClient,
                    savedAt: new Date().toLocaleTimeString('fr-FR')
                  }]);
                  setHeldCartCounter(c => c + 1);
                  setCart([]);
                  setSelectedClient(null);
                  setLastScannedDisplay(null);
                  sound.beep();
                }}
                disabled={cart.length === 0}
                style={{
                  background: cart.length === 0 ? '#f8fafc' : '#eff6ff',
                  border: `1px solid ${cart.length === 0 ? '#e2e8f0' : '#bfdbfe'}`,
                  color: cart.length === 0 ? '#94a3b8' : '#1d4ed8',
                  borderRadius: '5px',
                  padding: '3px 7px',
                  fontSize: '9px',
                  fontWeight: 800,
                  cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <Clock size={10}/> Attente
              </button>
              {/* New empty cart */}
              <button
                title="Nouveau panier vide"
                onClick={() => {
                  if (cart.length > 0) {
                    const label = `Panier #${heldCartCounter}`;
                    setHeldCarts(prev => [...prev, {
                      id: Date.now(),
                      label,
                      cart: [...cart],
                      client: selectedClient,
                      savedAt: new Date().toLocaleTimeString('fr-FR')
                    }]);
                    setHeldCartCounter(c => c + 1);
                  }
                  setCart([]);
                  setSelectedClient(null);
                  setLastScannedDisplay(null);
                  sound.beep();
                }}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  borderRadius: '5px',
                  padding: '3px 7px',
                  fontSize: '9px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <Plus size={10}/> Nouveau
              </button>
              {cart.length > 0 && (
                <button
                  onClick={() => { setCart([]); setSelectedClient(null); setLastScannedDisplay(null); sound.beep(); }}
                  style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}
                >
                  {t.posEmptyCart}
                </button>
              )}
            </div>
          </div>

          {/* Held Carts / Paniersêen Attente */}
          {heldCarts.length > 0 && (
            <div style={{
              padding: '4px 8px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              gap: '4px',
              flexWrap: 'wrap',
              flexShrink: 0,
              background: '#fffbeb'
            }}>
              {heldCarts.map((hc) => (
                <button
                  key={hc.id}
                  onClick={() => {
                    // Swap: if current cart has items, hold it first
                    if (cart.length > 0) {
                      const label = `Panier #${heldCartCounter}`;
                      setHeldCarts(prev => [
                        ...prev.filter(h => h.id !== hc.id),
                        { id: Date.now(), label, cart: [...cart], client: selectedClient, savedAt: new Date().toLocaleTimeString('fr-FR') }
                      ]);
                      setHeldCartCounter(c => c + 1);
                    } else {
                      setHeldCarts(prev => prev.filter(h => h.id !== hc.id));
                    }
                    setCart(hc.cart);
                    setSelectedClient(hc.client);
                    if (hc.cart.length > 0) {
                      const lastIt = hc.cart[0];
                      setLastScannedDisplay({
                        name: lastIt.product.name,
                        unit: lastIt.unit_name,
                        price: lastIt.selling_price,
                        qty: lastIt.quantity
                      });
                      setLastSelectedItem({ product: lastIt.product, unitName: lastIt.unit_name });
                    } else {
                      setLastScannedDisplay(null);
                    }
                    sound.beep();
                  }}
                  title={`Restaurer ${hc.label} (${hc.cart.length} articles) — ${hc.savedAt}`}
                  style={{
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    color: '#92400e',
                    borderRadius: '5px',
                    padding: '3px 8px',
                    fontSize: '9px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    position: 'relative'
                  }}
                >
                  🛒 {hc.label}
                  <span style={{ background: '#f59e0b', color: '#fff', borderRadius: '8px', padding: '0 4px', fontSize: '8px', fontWeight: 900 }}>
                    {hc.cart.length}
                  </span>
                  <span
                    title="Supprimer ce panier en attente"
                    onClick={e => { e.stopPropagation(); setHeldCarts(prev => prev.filter(h => h.id !== hc.id)); }}
                    style={{ marginLeft: '2px', color: '#dc2626', fontWeight: 900, fontSize: '10px', cursor: 'pointer', lineHeight: 1 }}
                  >
                    ×
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Client Selector (Compact) */}
          <div style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
            {selectedClient ? (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                padding: '5px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#15803d' }}>👤 {selectedClient.name}</div>
                  {selectedClient.current_debt > 0 && (
                    <div style={{ fontSize: '9px', color: '#dc2626', fontWeight: 700 }}>
                      {t.posCurrentDebt} : {fmt(selectedClient.current_debt)}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedClient(null)}
                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                >
                  <X size={13}/>
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <User size={12} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
                <input
                  value={clientSearch}
                  onFocus={() => setShowClientDropdown(true)}
                  onChange={e => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                  onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                  placeholder={t.posClientWalkIn}
                  style={{
                    width: '100%',
                    padding: isRtl ? '5px 26px 5px 8px' : '5px 8px 5px 26px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    color: '#0f172a',
                    fontSize: '10px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {showClientDropdown && clients.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                    zIndex: 100,
                    maxHeight: '160px',
                    overflowY: 'auto',
                    textAlign: isRtl ? 'right' : 'left'
                  }}>
                    {clients.filter(c => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                      <div
                        key={c.id}
                        onMouseDown={() => { setSelectedClient(c); setClientSearch(''); setShowClientDropdown(false); }}
                        style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #f8fafc', fontSize: '11px' }}
                      >
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.name}</div>
                        {c.current_debt > 0 && (
                          <div style={{ fontSize: '9px', color: '#dc2626', fontWeight: 700 }}>
                            {t.posCurrentDebt} : {fmt(c.current_debt)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Services Action Bar for Cashier */}
          <div style={{
            padding: '4px 8px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            overflowX: 'auto',
            flexShrink: 0
          }}>
            <span style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', whiteSpace: 'nowrap' }}>
              ⚡ Rapide:
            </span>
            <button
              type="button"
              onClick={() => addFlexyToCart('mobilis', 500)}
              title="Ajouter Flexy Mobilis 500 DA au panier"
              style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                color: '#15803d',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '9px',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              + Mob 500
            </button>
            <button
              type="button"
              onClick={() => addFlexyToCart('djezzy', 200)}
              title="Ajouter Flexy Djezzy 200 DA au panier"
              style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                color: '#b91c1c',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '9px',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              + Djez 200
            </button>
            <button
              type="button"
              onClick={() => addFlexyToCart('ooredoo', 500)}
              title="Ajouter Flexy Ooredoo 500 DA au panier"
              style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#be123c',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '9px',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              + Oor 500
            </button>
            <button
              type="button"
              onClick={() => addCopyServiceToCart('photocopie_nb', 1)}
              title="Ajouter 1 Photocopie N&B au panier"
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '9px',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              + 1 Copie N&B
            </button>
            <button
              type="button"
              onClick={() => addCopyServiceToCart('photocopie_nb', 5)}
              title="Ajouter 5 Photocopies N&B au panier"
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '9px',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              + 5 Copies
            </button>
            <button
              type="button"
              onClick={() => addCopyServiceToCart('photocopie_color', 1)}
              title="Ajouter 1 Photocopie Couleur au panier"
              style={{
                background: '#fdf4ff',
                border: '1px solid #f0abfc',
                color: '#a21caf',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '9px',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              + 1 Couleur
            </button>
            <button
              type="button"
              onClick={() => setActiveTabFilter('services')}
              title="Ouvrir le panneau complet Flexy & Services"
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#475569',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '9px',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              ⚡ Plus...
            </button>
          </div>

          {/* Cart Items List: Compact 1-line layout */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '4px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            minHeight: 0
          }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8' }}>
                <ShoppingCart size={30} style={{ margin: '0 auto 8px', opacity: 0.2, display: 'block' }}/>
                <div style={{ fontSize: '11px', fontWeight: 700 }}>{t.posCartEmptyTitle}</div>
                <div style={{ fontSize: '9px', marginTop: '3px' }}>{t.posCartEmptySubtitle}</div>
              </div>
            ) : cart.map((item, idx) => {
              const lineTotal = item.selling_price * item.quantity * (1 - item.discount_percent / 100);
              const isCig = isCigaretteProduct(item.product);
              const isLastScanned = lastSelectedItem
                ? (item.product.id === lastSelectedItem.product.id && item.unit_name === lastSelectedItem.unitName)
                : idx === 0;
              const itemKey = `${item.product.id}-${item.unit_name}-${idx}`;
              return (
                <div
                  key={itemKey}
                  onClick={() => setLastSelectedItem({ product: item.product, unitName: item.unit_name })}
                  style={{
                    background: isLastScanned ? '#f0fdf4' : '#fafafa',
                    border: `1px solid ${isLastScanned ? '#86efac' : '#f1f5f9'}`,
                    borderRadius: '5px',
                    padding: '4px 7px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    boxShadow: isLastScanned ? '0 0 6px rgba(22,163,74,0.12)' : 'none'
                  }}
                >
                  <button
                    onClick={e => { e.stopPropagation(); updateCartQty(idx, -1); }}
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '3px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      color: '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Minus size={9}/>
                  </button>
                  <input
                    ref={el => { if (isLastScanned) lastQtyInputRef.current = el; }}
                    type="number"
                    min="1"
                    value={editingQty[itemKey] !== undefined ? editingQty[itemKey] : item.quantity}
                    onClick={e => e.stopPropagation()}
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      const raw = e.target.value;
                      setEditingQty(prev => ({ ...prev, [itemKey]: raw }));
                      const num = parseInt(raw);
                      if (!isNaN(num) && num > 0) {
                        updateCartExactQty(idx, num);
                      }
                    }}
                    onBlur={() => {
                      setEditingQty(prev => {
                        const next = { ...prev };
                        delete next[itemKey];
                        return next;
                      });
                      if (item.quantity <= 0) {
                        updateCartExactQty(idx, 1);
                      }
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        (e.target as HTMLInputElement).blur();
                        barcodeInputRef.current?.focus();
                        barcodeInputRef.current?.select();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        (e.target as HTMLInputElement).blur();
                        barcodeInputRef.current?.focus();
                      }
                    }}
                    style={{
                      width: '38px',
                      height: '22px',
                      textAlign: 'center',
                      fontWeight: 900,
                      fontSize: '12px',
                      color: isLastScanned ? '#15803d' : '#0f172a',
                      background: '#ffffff',
                      border: `1.5px solid ${isLastScanned ? '#16a34a' : '#cbd5e1'}`,
                      borderRadius: '4px',
                      outline: 'none',
                      padding: '0 2px'
                    }}
                  />
                  <button
                    onClick={e => { e.stopPropagation(); updateCartQty(idx, 1); }}
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '3px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      color: '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Plus size={9}/>
                  </button>

                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.product.name}
                    </div>
                    <span style={{
                      fontSize: '8px',
                      fontWeight: 700,
                      color: isCig ? '#b91c1c' : '#15803d',
                      background: isCig ? '#fef2f2' : '#f0fdf4',
                      padding: '0px 4px',
                      borderRadius: '3px'
                    }}>
                      {item.unit_name}
                    </span>
                  </div>

                  <input
                    type="number"
                    value={item.selling_price}
                    onClick={e => e.stopPropagation()}
                    onChange={e => updateCartPrice(idx, e.target.value)}
                    style={{
                      width: '52px',
                      padding: '2px 4px',
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '3px',
                      color: '#0f172a',
                      fontSize: '10px',
                      textAlign: isRtl ? 'left' : 'right'
                    }}
                  />

                  <span style={{ fontSize: '11px', fontWeight: 900, color: '#15803d', minWidth: '54px', textAlign: isRtl ? 'left' : 'right', flexShrink: 0 }}>
                    {fmtN(lineTotal)}
                  </span>

                  <button
                    onClick={e => { e.stopPropagation(); removeCartItem(idx); }}
                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <Trash2 size={10}/>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer & Checkout Buttons */}
          <div style={{
            borderTop: '2px solid #e2e8f0',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flexShrink: 0
          }}>
            {totalDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#dc2626' }}>
                <span>{t.posDiscount}</span>
                <span>-{fmt(totalDiscount)}</span>
              </div>
            )}

            <div style={{
              background: '#f0fdf4',
              border: '2px solid #16a34a',
              borderRadius: '8px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 6px rgba(22,163,74,0.1)'
            }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#166534' }}>{t.posTotalToPay}</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>{cart.reduce((s, i) => s + i.quantity, 0)} {t.posArticleCount}</div>
                {isAdmin && <div style={{ fontSize: '9px', color: '#15803d' }}>{t.posMargin}: {fmt(grossProfit)}</div>}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: 900, color: '#15803d' }}>
                {fmt(totalAmount)}
              </div>
            </div>

            {/* Instant Cash Validate (Enter Key) */}
            <button
              type="button"
              onClick={() => handleConfirmSale('cash')}
              disabled={saving || cart.length === 0}
              style={{
                background: cart.length === 0 ? '#cbd5e1' : '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '7px',
                padding: '10px',
                fontSize: '13px',
                fontWeight: 900,
                cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: cart.length > 0 ? '0 3px 10px rgba(22,163,74,0.3)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                {saving ? <RefreshCw size={15} className="animate-spin"/> : <CheckCircle size={15}/>}
                <span>{t.posDirectPay}</span>
              </div>
              <span style={{ background: 'rgba(0,0,0,0.15)', padding: '1px 6px', borderRadius: '3px', fontSize: '10px' }}>
                [F7]
              </span>
            </button>

            {/* Quick Actions: Dette [F8] & Options */}
            {canSellCredit && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => { if (cart.length > 0) setShowCreditModal(true); }}
                  disabled={cart.length === 0}
                  style={{
                    background: cart.length === 0 ? '#f8fafc' : '#fff7ed',
                    color: cart.length === 0 ? '#94a3b8' : '#c2410c',
                    border: `1px solid ${cart.length === 0 ? '#e2e8f0' : '#fed7aa'}`,
                    borderRadius: '6px',
                    padding: '7px',
                    fontSize: '10px',
                    fontWeight: 800,
                    cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Banknote size={12}/> [F8] {t.posDebtBtn}
                </button>
              </div>
            )}

          
          </div>
        </div>
      </div>

      {/* DETTE / CREDIT MODAL */}
      {showCreditModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)',
          direction: isRtl ? 'rtl' : 'ltr'
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fff7ed'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#c2410c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Banknote size={16} color="#ea580c"/> {t.posSaleToCredit}
              </div>
              <button
                onClick={() => setShowCreditModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={17}/>
              </button>
            </div>

            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#92400e', fontWeight: 700 }}>{t.posDebtAmount}</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#c2410c' }}>{fmt(totalAmount)}</div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>{t.posBeneficiaryClient} *</div>
                {selectedClient ? (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '7px',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#15803d' }}>{selectedClient.name}</div>
                      {selectedClient.current_debt > 0 && (
                        <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 700 }}>
                          {t.posCurrentDebt} : {fmt(selectedClient.current_debt)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedClient(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                    >
                      <X size={14}/>
                    </button>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <User size={13} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
                    <input
                      autoFocus
                      value={clientSearch}
                      onChange={e => { setClientSearch(e.target.value); loadClients(); }}
                      placeholder={t.posSearchClient}
                      style={{
                        width: '100%',
                        padding: isRtl ? '8px 32px 8px 10px' : '8px 10px 8px 32px',
                        background: '#fff',
                        border: '1.5px solid #fed7aa',
                        borderRadius: '7px',
                        color: '#0f172a',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    {clients.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                        zIndex: 200,
                        maxHeight: '160px',
                        overflowY: 'auto',
                        textAlign: isRtl ? 'right' : 'left'
                      }}>
                        {clients.filter(c => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                          <div
                            key={c.id}
                            onMouseDown={() => { setSelectedClient(c); setClientSearch(''); }}
                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f8fafc', fontSize: '11px' }}
                          >
                            <div style={{ fontWeight: 800 }}>{c.name}{c.phone && <span style={{ color: '#64748b' }}> • {c.phone}</span>}</div>
                            {c.current_debt > 0 && (
                              <div style={{ color: '#dc2626', fontSize: '10px', fontWeight: 700 }}>
                                {t.posCurrentDebt} : {fmt(c.current_debt)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>{t.posNoteReason}</div>
                <input
                  value={checkoutNotes}
                  onChange={e => setCheckoutNotes(e.target.value)}
                  placeholder={t.posNotePlaceholder}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '7px',
                    color: '#0f172a',
                    fontSize: '11px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreditModal(false)}
                  style={{
                    padding: '10px',
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #e2e8f0',
                    borderRadius: '7px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmSale('credit')}
                  disabled={!selectedClient || saving}
                  style={{
                    padding: '10px',
                    background: !selectedClient ? '#e2e8f0' : '#ea580c',
                    color: !selectedClient ? '#94a3b8' : '#fff',
                    border: 'none',
                    borderRadius: '7px',
                    fontWeight: 900,
                    cursor: !selectedClient ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {saving ? <RefreshCw size={14} className="animate-spin"/> : <CheckCircle size={14}/>}
                  {t.posValidateDebt}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADVANCED / PARTIAL PAYMENT MODAL [F10] */}
      {showAdvancedCheckout && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)',
          direction: isRtl ? 'rtl' : 'ltr'
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '13px 16px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={16} color="#16a34a"/> {t.posPartialPayOptions}
              </div>
              <button
                onClick={() => setShowAdvancedCheckout(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={17}/>
              </button>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#166534', fontWeight: 700 }}>{t.posTotalToPay}</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#15803d' }}>{fmt(totalAmount)}</div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>{t.posCashReceived} (DA)</div>
                <input
                  type="number"
                  autoFocus
                  min="0"
                  step="10"
                  value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '7px',
                    color: '#0f172a',
                    fontSize: '20px',
                    fontWeight: 900,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ display: 'flex', gap: '5px', marginTop: '5px', flexWrap: 'wrap' }}>
                  {[totalAmount, 500, 1000, 2000, 5000].map((v, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCashReceived(String(v))}
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        color: '#0284c7',
                        padding: '3px 7px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {fmt(v)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '7px', padding: '10px', border: '1px solid #e2e8f0' }}>
                {cashRcv > totalAmount && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 800, fontSize: '13px' }}>
                    <span>{t.posChangeReturned} :</span>
                    <span>{fmt(changeReturned)}</span>
                  </div>
                )}
                {creditAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: 800, fontSize: '13px' }}>
                    <span>{t.posRemainingCredit} :</span>
                    <span>{fmt(creditAmount)}</span>
                  </div>
                )}
                {creditAmount > 0 && !selectedClient && (
                  <div style={{ color: '#dc2626', fontSize: '10px', fontWeight: 700, marginTop: '4px' }}>
                    ⚠️ {t.posPleaseSelectClient}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>{t.notesRemarks}</div>
                <input
                  value={checkoutNotes}
                  onChange={e => setCheckoutNotes(e.target.value)}
                  placeholder={t.posNotePlaceholder}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '7px',
                    color: '#0f172a',
                    fontSize: '11px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => handleConfirmSale('partial')}
                disabled={saving || (creditAmount > 0 && !selectedClient)}
                style={{
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '11px',
                  fontSize: '13px',
                  fontWeight: 900,
                  cursor: (creditAmount > 0 && !selectedClient) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {saving ? <RefreshCw size={15} className="animate-spin"/> : <CheckCircle size={15}/>}
                <span>{t.posConfirmPayment}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {showReceiptModal && lastSale && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          direction: isRtl ? 'rtl' : 'ltr'
        }}>
          <div style={{
            background: '#fff',
            color: '#000',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '400px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '20px',
            fontFamily: 'monospace'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: 900 }}>IMATECHX</div>
              <div style={{ fontSize: '11px', color: '#475569' }}>{t.posReceipt} #{lastSale.saleNumber}</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>{lastSale.date}</div>
            </div>

            <div style={{ borderTop: '1px dashed #cbd5e1', borderBottom: '1px dashed #cbd5e1', padding: '8px 0', margin: '8px 0' }}>
              {lastSale.items.map((it: CartItem, i: number) => {
                const lt = it.selling_price * it.quantity * (1 - it.discount_percent / 100);
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', margin: '3px 0' }}>
                    <span>{it.quantity}x {it.product.name} ({it.unit_name})</span>
                    <span>{fmt(lt)}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 900, marginBottom: '5px' }}>
              <span>{t.total}</span>
              <span>{fmt(lastSale.totalAmount)}</span>
            </div>
            {lastSale.cashRcv > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#475569' }}>
                <span>{t.methodCash} :</span>
                <span>{fmt(lastSale.cashRcv)}</span>
              </div>
            )}
            {lastSale.changeReturned > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#16a34a', fontWeight: 700 }}>
                <span>{t.posChangeReturned} :</span>
                <span>{fmt(lastSale.changeReturned)}</span>
              </div>
            )}
            {lastSale.creditAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#dc2626', fontWeight: 700 }}>
                <span>{t.histColCredit} :</span>
                <span>{fmt(lastSale.creditAmount)}</span>
              </div>
            )}
            {lastSale.client && (
              <div style={{ fontSize: '10px', color: '#475569', marginTop: '5px' }}>
                {t.clientConcerned} : {lastSale.client.name}
              </div>
            )}
            <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '10px', textAlign: 'center' }}>{t.posThankYou}</div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button
                onClick={() => setShowReceiptModal(false)}
                style={{ flex: 1, padding: '8px', background: '#e2e8f0', color: '#0f172a', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
              >
                {t.close}
              </button>
              <button
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px'
                }}
              >
                <Printer size={13}/> {t.posPrint}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}