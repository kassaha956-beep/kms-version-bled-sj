// ============================================================================
// KMS DISTRIBUTION - ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSIONS DEFINITION
// Multi-language support: French (fr), English (en), Arabic (ar)
// Simple, clear, and direct terms for workers and management.
// ============================================================================

import type { Language } from './i18n';

export interface LocalizedString {
  fr: string;
  en: string;
  ar: string;
}

export interface PermissionItem {
  id: string;
  label: string; // Default fallback (FR)
  description: string; // Default fallback (FR)
  labels: LocalizedString;
  descriptions: LocalizedString;
}

export interface PermissionModule {
  id: string;
  name: string; // Default fallback (FR)
  description: string; // Default fallback (FR)
  iconName: string;
  badgeColor: string;
  names: LocalizedString;
  descriptions: LocalizedString;
  items: PermissionItem[];
}

export interface RolePreset {
  id: string;
  name: string; // Default fallback (FR)
  description: string; // Default fallback (FR)
  badgeColor: string;
  permissions: string[];
  names: LocalizedString;
  descriptions: LocalizedString;
}

/**
 * 10 Core Functional Modules with simple, clean wording in FR, EN, AR
 */
export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: 'dashboard',
    name: 'Tableau de bord',
    description: 'Résumé global des ventes, bénéfices et alertes',
    iconName: 'BarChart2',
    badgeColor: '#0284c7',
    names: {
      fr: 'Tableau de bord',
      en: 'Dashboard',
      ar: 'لوحة التحكم'
    },
    descriptions: {
      fr: 'Résumé global des ventes, bénéfices et alertes',
      en: 'Overview of sales, profits, and alerts',
      ar: 'ملخص شامل للمبيعات والأرباح والتنبيهات'
    },
    items: [
      {
        id: 'dashboard.view',
        label: 'Voir le tableau de bord',
        description: 'Consulter les ventes du jour et alertes stock',
        labels: {
          fr: 'Voir le tableau de bord',
          en: 'View Dashboard',
          ar: 'عرض لوحة التحكم'
        },
        descriptions: {
          fr: 'Consulter les ventes du jour et alertes stock',
          en: 'See daily sales summary and stock alerts',
          ar: 'الاطلاع على ملخص مبيعات اليوم ونواقص المخزون'
        }
      },
      {
        id: 'dashboard.financials',
        label: 'Voir bénéfices & marges',
        description: 'Afficher les bénéfices nets et la valeur du stock',
        labels: {
          fr: 'Voir bénéfices & marges',
          en: 'View Profits & Margins',
          ar: 'عرض الأرباح والهامش'
        },
        descriptions: {
          fr: 'Afficher les bénéfices nets et la valeur du stock',
          en: 'Show net profit and total stock valuation',
          ar: 'إظهار صافي الأرباح والقيمة الإجمالية للمخزون'
        }
      },
      {
        id: 'dashboard.reconcile',
        label: 'Vérifier les ventes',
        description: 'Vérifier les calculs et détecter les erreurs',
        labels: {
          fr: 'Vérifier les ventes',
          en: 'Check & Audit Sales',
          ar: 'فحص وتدقيق المبيعات'
        },
        descriptions: {
          fr: 'Vérifier les calculs et détecter les erreurs',
          en: 'Audit sales figures and detect discrepancies',
          ar: 'مراجعة المبيعات والبحث عن الأخطاء والفروقات'
        }
      }
    ]
  },
  {
    id: 'ventes',
    name: 'Caisse & Ventes (POS)',
    description: 'Ventes directes au comptoir et encaissements',
    iconName: 'ShoppingCart',
    badgeColor: '#16a34a',
    names: {
      fr: 'Caisse & Ventes (POS)',
      en: 'Cash Register (POS)',
      ar: 'الكاسة والمبيعات'
    },
    descriptions: {
      fr: 'Ventes directes au comptoir et encaissements',
      en: 'Counter sales, scanning items, and checkout',
      ar: 'البيع المباشر في الصندوق وقبض المبالغ'
    },
    items: [
      {
        id: 'ventes.pos',
        label: 'Ouvrir l\'écran de caisse',
        description: 'Accéder à la caisse et scanner les produits',
        labels: {
          fr: 'Ouvrir l\'écran de caisse',
          en: 'Open Cash Register',
          ar: 'فتح شاشة الكاسة'
        },
        descriptions: {
          fr: 'Accéder à la caisse et scanner les produits',
          en: 'Access POS screen and scan products',
          ar: 'الدخول إلى شاشة البيع واستخدام قارئ الباركود'
        }
      },
      {
        id: 'ventes.create',
        label: 'Encaisser les ventes',
        description: 'Valider les paiements (espèces, chèque, virement)',
        labels: {
          fr: 'Encaisser les ventes',
          en: 'Collect Payments',
          ar: 'قبض وتأكيد المبيعات'
        },
        descriptions: {
          fr: 'Valider les paiements (espèces, chèque, virement)',
          en: 'Validate payments (cash, cheque, bank transfer)',
          ar: 'تأكيد عمليات الدفع نقداً أو بشيك أو تحويل'
        }
      },
      {
        id: 'ventes.credit',
        label: 'Vendre à crédit',
        description: 'Permettre au client de payer plus tard (crédit)',
        labels: {
          fr: 'Vendre à crédit',
          en: 'Sell on Credit',
          ar: 'البيع بالدين (كريدي)'
        },
        descriptions: {
          fr: 'Permettre au client de payer plus tard (crédit)',
          en: 'Allow customers to purchase on credit',
          ar: 'السماح للزبون بالشراء بالدين والدفع لاحقاً'
        }
      },
      {
        id: 'ventes.discount',
        label: 'Faire des remises & changer prix',
        description: 'Réduire le prix d\'un article en caisse',
        labels: {
          fr: 'Faire des remises & changer prix',
          en: 'Give Discounts / Change Prices',
          ar: 'تخفيض السعر / عمل خصم'
        },
        descriptions: {
          fr: 'Réduire le prix d\'un article en caisse',
          en: 'Discount item prices directly at checkout',
          ar: 'تخفيض سعر السلعة أو تغيير سعر البيع مباشرة'
        }
      },
      {
        id: 'ventes.hold_cart',
        label: 'Mettre un panier en attente',
        description: 'Mettre de côté une vente et la reprendre plus tard',
        labels: {
          fr: 'Mettre un panier en attente',
          en: 'Hold & Resume Carts',
          ar: 'تعليق السلة واسترجاعها'
        },
        descriptions: {
          fr: 'Mettre de côté une vente et la reprendre plus tard',
          en: 'Park a customer cart and resume it later',
          ar: 'تعليق سلة زبون جانباً والعودة إليها لاحقاً'
        }
      }
    ]
  },
  {
    id: 'historique',
    name: 'Historique des Ventes',
    description: 'Consulter, réimprimer ou annuler des ventes',
    iconName: 'Clock',
    badgeColor: '#8b5cf6',
    names: {
      fr: 'Historique des Ventes',
      en: 'Sales History',
      ar: 'سجل المبيعات'
    },
    descriptions: {
      fr: 'Consulter, réimprimer ou annuler des ventes',
      en: 'View, reprint, or cancel past sales',
      ar: 'عرض وإعادة طباعة أو إلغاء المبيعات السابقة'
    },
    items: [
      {
        id: 'historique.view',
        label: 'Voir les ventes passées',
        description: 'Consulter la liste de toutes les ventes réalisées',
        labels: {
          fr: 'Voir les ventes passées',
          en: 'View Past Sales',
          ar: 'عرض المبيعات السابقة'
        },
        descriptions: {
          fr: 'Consulter la liste de toutes les ventes réalisées',
          en: 'Browse through all completed sales',
          ar: 'عرض لائحة المبيعات والبحث بالتاريخ'
        }
      },
      {
        id: 'historique.print',
        label: 'Réimprimer un ticket / facture',
        description: 'Imprimer à nouveau un ticket de caisse ou facture',
        labels: {
          fr: 'Réimprimer un ticket / facture',
          en: 'Reprint Receipt / Invoice',
          ar: 'إعادة طباعة وصل أو فاتورة'
        },
        descriptions: {
          fr: 'Imprimer à nouveau un ticket de caisse ou facture',
          en: 'Print another copy of a receipt or invoice',
          ar: 'طباعة نسخة إضافية من وصل الكاسة أو الفاتورة'
        }
      },
      {
        id: 'historique.delete',
        label: 'Annuler / supprimer une vente',
        description: 'Annuler une vente, remettre en stock et corriger la caisse',
        labels: {
          fr: 'Annuler / supprimer une vente',
          en: 'Cancel / Delete a Sale',
          ar: 'إلغاء أو حذف عملية بيع'
        },
        descriptions: {
          fr: 'Annuler une vente, remettre en stock et corriger la caisse',
          en: 'Cancel sale, return items to stock, and update drawer',
          ar: 'إلغاء البيع وإرجاع السلع للمخزون واسترجاع المبلغ'
        }
      }
    ]
  },
  {
    id: 'products',
    name: 'Articles & Stock',
    description: 'Produits, quantités en stock, prix et commandes',
    iconName: 'Package',
    badgeColor: '#ea580c',
    names: {
      fr: 'Articles & Stock',
      en: 'Products & Stock',
      ar: 'المنتجات والمخزون'
    },
    descriptions: {
      fr: 'Produits, quantités en stock, prix et commandes',
      en: 'Product catalog, stock levels, and purchase orders',
      ar: 'دليل السلع والكميات وأسعار الشراء والطلبيات'
    },
    items: [
      {
        id: 'products.view',
        label: 'Voir les articles & le stock',
        description: 'Voir la liste des articles et quantités restantes',
        labels: {
          fr: 'Voir les articles & le stock',
          en: 'View Products & Stock',
          ar: 'عرض السلع والمخزون'
        },
        descriptions: {
          fr: 'Voir la liste des articles et quantités restantes',
          en: 'See list of all products and available stock',
          ar: 'الاطلاع على قائمة المنتجات والكميات المتبقية'
        }
      },
      {
        id: 'products.cost_price',
        label: 'Voir le prix d\'achat',
        description: 'Afficher le prix d\'achat fournisseur et les marges',
        labels: {
          fr: 'Voir le prix d\'achat',
          en: 'View Purchase Cost',
          ar: 'رؤية سعر الشراء'
        },
        descriptions: {
          fr: 'Afficher le prix d\'achat fournisseur et les marges',
          en: 'Show wholesale cost price and profit margins',
          ar: 'إظهار سعر شراء السلعة من المورد وحساب الفائدة'
        }
      },
      {
        id: 'products.edit',
        label: 'Ajouter & modifier un article',
        description: 'Changer le nom, le code-barres et les prix de vente',
        labels: {
          fr: 'Ajouter & modifier un article',
          en: 'Add & Edit Products',
          ar: 'إضافة وتعديل المنتجات'
        },
        descriptions: {
          fr: 'Changer le nom, le code-barres et les prix de vente',
          en: 'Create new items or edit names, barcodes, and prices',
          ar: 'إدخال منتج جديد أو تغيير الاسم والباركود وسعر البيع'
        }
      },
      {
        id: 'products.stock_adjust',
        label: 'Corriger les quantités en stock',
        description: 'Ajuster directement le stock réel après inventaire',
        labels: {
          fr: 'Corriger les quantités en stock',
          en: 'Adjust Stock Counts',
          ar: 'تعديل كمية المخزون'
        },
        descriptions: {
          fr: 'Ajuster directement le stock réel après inventaire',
          en: 'Directly update physical stock count after audit',
          ar: 'تصحيح الكمية الفعلية الموجودة في المخزن مباشرة'
        }
      },
      {
        id: 'products.delete',
        label: 'Supprimer un article',
        description: 'Effacer définitivement un article du catalogue',
        labels: {
          fr: 'Supprimer un article',
          en: 'Delete Products',
          ar: 'حذف منتج'
        },
        descriptions: {
          fr: 'Effacer définitivement un article du catalogue',
          en: 'Permanently remove an item from catalog',
          ar: 'حذف السلعة نهائياً من قائمة المنتجات'
        }
      },
      {
        id: 'products.categories',
        label: 'Gérer les catégories',
        description: 'Classer les articles par rayons ou familles',
        labels: {
          fr: 'Gérer les catégories',
          en: 'Manage Categories',
          ar: 'إدارة الأصناف'
        },
        descriptions: {
          fr: 'Classer les articles par rayons ou familles',
          en: 'Create and organize product categories',
          ar: 'تنظيم أقسام وفئات وتصنيفات السلع'
        }
      },
      {
        id: 'products.orders',
        label: 'Commandes de stock',
        description: 'Préparer les commandes pour réapprovisionner le stock',
        labels: {
          fr: 'Commandes de stock',
          en: 'Stock Orders',
          ar: 'طلبيات السلع'
        },
        descriptions: {
          fr: 'Préparer les commandes pour réapprovisionner le stock',
          en: 'Prepare replenishment orders for suppliers',
          ar: 'تحضير طلبيات إعادة تزويد المخزن بالسلع'
        }
      }
    ]
  },
  {
    id: 'clients',
    name: 'Clients & Dettes',
    description: 'Coordonnées clients, dettes et encaissements',
    iconName: 'CreditCard',
    badgeColor: '#2563eb',
    names: {
      fr: 'Clients & Dettes',
      en: 'Clients & Debts',
      ar: 'الزبائن والديون'
    },
    descriptions: {
      fr: 'Coordonnées clients, dettes et encaissements',
      en: 'Customer directory, balances, and debt payments',
      ar: 'دليل الزبائن وحسابات الديون والمبالغ المسددة'
    },
    items: [
      {
        id: 'clients.view',
        label: 'Voir les clients & dettes',
        description: 'Consulter la liste des clients et ce qu\'ils doivent',
        labels: {
          fr: 'Voir les clients & dettes',
          en: 'View Clients & Debts',
          ar: 'عرض الزبائن والديون'
        },
        descriptions: {
          fr: 'Consulter la liste des clients et ce qu\'ils doivent',
          en: 'Check customer contact list and unpaid balances',
          ar: 'رؤية قائمة الزبائن والمبالغ المتبقية عليهم'
        }
      },
      {
        id: 'clients.edit',
        label: 'Ajouter / modifier un client',
        description: 'Créer un client, changer téléphone ou adresse',
        labels: {
          fr: 'Ajouter / modifier un client',
          en: 'Add / Edit Clients',
          ar: 'إضافة وتعديل زبون'
        },
        descriptions: {
          fr: 'Créer un client, changer téléphone ou adresse',
          en: 'Create or update customer details & credit limits',
          ar: 'تسجيل زبون جديد أو تعديل الهاتف والعنوان وسقف الدين'
        }
      },
      {
        id: 'clients.delete',
        label: 'Supprimer un client',
        description: 'Effacer définitivement la fiche d\'un client',
        labels: {
          fr: 'Supprimer un client',
          en: 'Delete Clients',
          ar: 'حذف زبون'
        },
        descriptions: {
          fr: 'Effacer définitivement la fiche d\'un client',
          en: 'Remove a client profile permanently',
          ar: 'حذف بطاقة الزبون نهائياً من النظام'
        }
      },
      {
        id: 'clients.add_debt',
        label: 'Ajouter une dette au client',
        description: 'Noter une somme qu\'un client doit payer',
        labels: {
          fr: 'Ajouter une dette au client',
          en: 'Add Debt to Client',
          ar: 'تسجيل دين على الزبون'
        },
        descriptions: {
          fr: 'Noter une somme qu\'un client doit payer',
          en: 'Manually add an unpaid credit amount to client',
          ar: 'تسجيل مبلغ دين أو كريدي جديد في حساب الزبون'
        }
      },
      {
        id: 'clients.pay_debt',
        label: 'Encaisser le versement d\'un client',
        description: 'Enregistrer quand un client vient payer sa dette',
        labels: {
          fr: 'Encaisser le versement d\'un client',
          en: 'Collect Debt Payment',
          ar: 'قبض دفعة من دين الزبون'
        },
        descriptions: {
          fr: 'Enregistrer quand un client vient payer sa dette',
          en: 'Record cash payment made by client towards debt',
          ar: 'تسجيل مبلغ نقدي دفعه الزبون لتسديد دينه'
        }
      },
      {
        id: 'clients.delete_transactions',
        label: 'Annuler une opération de dette',
        description: 'Supprimer une ligne de dette ou paiement erronée',
        labels: {
          fr: 'Annuler une opération de dette',
          en: 'Cancel Debt / Payment Record',
          ar: 'إلغاء عملية دين أو تسديد'
        },
        descriptions: {
          fr: 'Supprimer une ligne de dette ou paiement erronée',
          en: 'Delete a mistaken credit or payment entry',
          ar: 'حذف عملية دين أو تسديد سجلت بالخطأ'
        }
      }
    ]
  },
  {
    id: 'fournisseurs',
    name: 'Fournisseurs & Achats',
    description: 'Factures d\'achat et dettes auprès des fournisseurs',
    iconName: 'Truck',
    badgeColor: '#d97706',
    names: {
      fr: 'Fournisseurs & Achats',
      en: 'Suppliers & Purchases',
      ar: 'الموردون والمشتريات'
    },
    descriptions: {
      fr: 'Factures d\'achat et dettes auprès des fournisseurs',
      en: 'Purchase invoices, debts, and payments to suppliers',
      ar: 'فواتير الشراء وديون ومستحقات الموردين'
    },
    items: [
      {
        id: 'fournisseurs.view',
        label: 'Voir les fournisseurs',
        description: 'Consulter la liste des fournisseurs et ce qu\'on leur doit',
        labels: {
          fr: 'Voir les fournisseurs',
          en: 'View Suppliers',
          ar: 'عرض الموردين'
        },
        descriptions: {
          fr: 'Consulter la liste des fournisseurs et ce qu\'on leur doit',
          en: 'See list of suppliers and total balance owed',
          ar: 'الاطلاع على قائمة الموردين والمبالغ المتبقية لهم'
        }
      },
      {
        id: 'fournisseurs.edit',
        label: 'Ajouter / modifier un fournisseur',
        description: 'Créer un fournisseur, changer téléphone ou adresse',
        labels: {
          fr: 'Ajouter / modifier un fournisseur',
          en: 'Add / Edit Suppliers',
          ar: 'إضافة وتعديل مورد'
        },
        descriptions: {
          fr: 'Créer un fournisseur, changer téléphone ou adresse',
          en: 'Add new supplier or update contact details',
          ar: 'إدخال مورد جديد أو تحديث الهاتف والعنوان'
        }
      },
      {
        id: 'fournisseurs.delete',
        label: 'Supprimer un fournisseur',
        description: 'Retirer un fournisseur du carnet',
        labels: {
          fr: 'Supprimer un fournisseur',
          en: 'Delete Suppliers',
          ar: 'حذف مورد'
        },
        descriptions: {
          fr: 'Retirer un fournisseur du carnet',
          en: 'Remove supplier from system directory',
          ar: 'إزالة المورد نهائياً من النظام'
        }
      },
      {
        id: 'fournisseurs.add_credit',
        label: 'Ajouter un achat à crédit',
        description: 'Noter une facture fournisseur que l\'on paiera plus tard',
        labels: {
          fr: 'Ajouter un achat à crédit',
          en: 'Add Credit Purchase',
          ar: 'تسجيل فاتورة شراء بالدين'
        },
        descriptions: {
          fr: 'Noter une facture fournisseur que l\'on paiera plus tard',
          en: 'Record an unpaid supplier purchase invoice',
          ar: 'تسجيل فاتورة شراء من المورد غير مسددة بالكامل'
        }
      },
      {
        id: 'fournisseurs.pay',
        label: 'Payer un fournisseur',
        description: 'Enregistrer une somme versée à un fournisseur',
        labels: {
          fr: 'Payer un fournisseur',
          en: 'Pay Supplier',
          ar: 'دفع مبلغ للمورد'
        },
        descriptions: {
          fr: 'Enregistrer une somme versée à un fournisseur',
          en: 'Record a cash payment made to a supplier',
          ar: 'تسجيل دفعة مسددة للمورد وتخفيض دينه'
        }
      },
      {
        id: 'fournisseurs.delete_transactions',
        label: 'Annuler une opération fournisseur',
        description: 'Supprimer une facture d\'achat ou un paiement erroné',
        labels: {
          fr: 'Annuler une opération fournisseur',
          en: 'Cancel Supplier Transaction',
          ar: 'إلغاء عملية مورد'
        },
        descriptions: {
          fr: 'Supprimer une facture d\'achat ou un paiement erroné',
          en: 'Delete a mistaken supplier purchase or payment',
          ar: 'حذف فاتورة شراء أو عملية تسديد سجلت خطأً'
        }
      }
    ]
  },
  {
    id: 'caisses',
    name: 'Caisses & Argent',
    description: 'Suivi de l\'argent en caisse, coffres et dépenses',
    iconName: 'Landmark',
    badgeColor: '#059669',
    names: {
      fr: 'Caisses & Argent',
      en: 'Cash Registers & Treasury',
      ar: 'الصناديق والسيولة'
    },
    descriptions: {
      fr: 'Suivi de l\'argent en caisse, coffres et dépenses',
      en: 'Track physical cash, drawers, safes, and daily expenses',
      ar: 'متابعة النقود الفعلية في الكاسات والخزائن والمصاريف'
    },
    items: [
      {
        id: 'caisses.view',
        label: 'Voir le montant des caisses',
        description: 'Savoir combien d\'argent se trouve dans chaque caisse',
        labels: {
          fr: 'Voir le montant des caisses',
          en: 'View Cash Balances',
          ar: 'عرض رصيد الصناديق'
        },
        descriptions: {
          fr: 'Savoir combien d\'argent se trouve dans chaque caisse',
          en: 'Check the current amount of money in all drawers',
          ar: 'معرفة كمية النقود المتوفرة حالياً في كل صندوق'
        }
      },
      {
        id: 'caisses.sessions',
        label: 'Ouvrir / fermer la caisse',
        description: 'Compter l\'argent en début et en fin de journée',
        labels: {
          fr: 'Ouvrir / fermer la caisse',
          en: 'Open / Close Shift',
          ar: 'فتح وإغلاق الصندوق'
        },
        descriptions: {
          fr: 'Compter l\'argent en début et en fin de journée',
          en: 'Count opening and closing cash for the work shift',
          ar: 'عد النقود عند استلام وتسليم وردية الصندوق'
        }
      },
      {
        id: 'caisses.movements',
        label: 'Entrées & sorties d\'argent',
        description: 'Ajouter de la monnaie ou payer une dépense rapide',
        labels: {
          fr: 'Entrées & sorties d\'argent',
          en: 'Cash In / Cash Out',
          ar: 'إيداع وسحب السيولة'
        },
        descriptions: {
          fr: 'Ajouter de la monnaie ou payer une dépense rapide',
          en: 'Add cash to drawer or record a small quick expense',
          ar: 'تزويد الصندوق بالصرف أو دفع مصاريف يومية صغيرة'
        }
      },
      {
        id: 'caisses.transfer',
        label: 'Transférer de l\'argent',
        description: 'Déplacer de l\'argent d\'une caisse vers une autre',
        labels: {
          fr: 'Transférer de l\'argent',
          en: 'Transfer Cash',
          ar: 'تحويل أموال بين الصناديق'
        },
        descriptions: {
          fr: 'Déplacer de l\'argent d\'une caisse vers une autre',
          en: 'Move money from one cash register to another or safe',
          ar: 'نقل النقود من كاسة لأخرى أو وضعها في الخزينة'
        }
      },
      {
        id: 'caisses.manage',
        label: 'Créer / gérer les caisses',
        description: 'Ajouter une nouvelle caisse physique ou compte',
        labels: {
          fr: 'Créer / gérer les caisses',
          en: 'Manage Cash Boxes',
          ar: 'إدارة وإنشاء الصناديق'
        },
        descriptions: {
          fr: 'Ajouter une nouvelle caisse physique ou compte',
          en: 'Set up new cash register drawers or accounts',
          ar: 'إضافة صندوق كاشير جديد أو تعديل الحسابات'
        }
      }
    ]
  },
  {
    id: 'paiement',
    name: 'Salariés & Salaires',
    description: 'Employés, fiches de paie, avances et prêts',
    iconName: 'Users',
    badgeColor: '#6366f1',
    names: {
      fr: 'Salariés & Salaires',
      en: 'Workers & Payroll',
      ar: 'العمال والرواتب'
    },
    descriptions: {
      fr: 'Employés, fiches de paie, avances et prêts',
      en: 'Employee list, monthly wages, advances, and loans',
      ar: 'قائمة العمال والرواتب الشهرية والتسبيقات والسلف'
    },
    items: [
      {
        id: 'paiement.view',
        label: 'Voir la liste des salariés',
        description: 'Consulter les employés enregistrés et leurs postes',
        labels: {
          fr: 'Voir la liste des salariés',
          en: 'View Workers List',
          ar: 'عرض قائمة العمال'
        },
        descriptions: {
          fr: 'Consulter les employés enregistrés et leurs postes',
          en: 'See registered staff members and their jobs',
          ar: 'الاطلاع على بطاقات العمال ووظائفهم الحالية'
        }
      },
      {
        id: 'paiement.edit',
        label: 'Ajouter / modifier un salarié',
        description: 'Créer une fiche employé et définir son salaire',
        labels: {
          fr: 'Ajouter / modifier un salarié',
          en: 'Add / Edit Workers',
          ar: 'إضافة وتعديل عامل'
        },
        descriptions: {
          fr: 'Créer une fiche employé et définir son salaire',
          en: 'Register a worker and set base monthly salary',
          ar: 'تسجيل عامل جديد وتحديد هاتفه وراتبه الشهري'
        }
      },
      {
        id: 'paiement.salaries',
        label: 'Payer les salaires',
        description: 'Enregistrer le paiement du salaire mensuel',
        labels: {
          fr: 'Payer les salaires',
          en: 'Pay Monthly Salaries',
          ar: 'صرف الرواتب الشهرية'
        },
        descriptions: {
          fr: 'Enregistrer le paiement du salaire mensuel',
          en: 'Process and record monthly staff wage payments',
          ar: 'تسجيل دفع الراتب الشهري وخصم التسبيقات'
        }
      },
      {
        id: 'paiement.advance',
        label: 'Donner une avance sur salaire',
        description: 'Enregistrer une somme d\'argent prêtée sur le salaire',
        labels: {
          fr: 'Donner une avance sur salaire',
          en: 'Give Salary Advance',
          ar: 'منح تسبيق مالي (سلفة)'
        },
        descriptions: {
          fr: 'Enregistrer une somme d\'argent prêtée sur le salaire',
          en: 'Record an advance payment granted before payday',
          ar: 'تسجيل تسبيق على الراتب يخصم عند نهاية الشهر'
        }
      },
      {
        id: 'paiement.debts',
        label: 'Gérer les dettes des employés',
        description: 'Noter les emprunts et déductions des salariés',
        labels: {
          fr: 'Gérer les dettes des employés',
          en: 'Manage Worker Debts',
          ar: 'إدارة ديون وسلف العمال'
        },
        descriptions: {
          fr: 'Noter les emprunts et déductions des salariés',
          en: 'Track staff personal loans and adjustments',
          ar: 'متابعة الديون والقروض المستحقة على العمال'
        }
      },
      {
        id: 'paiement.attendance',
        label: 'Gérer le pointage & calendrier des présences',
        description: 'Pointer les journées complètes, demi-journées et absences',
        labels: {
          fr: 'Gérer le pointage & calendrier des présences',
          en: 'Manage Attendance & Work Calendar',
          ar: 'تسجيل الحضور والغياب (البوانتاج)'
        },
        descriptions: {
          fr: 'Pointer les journées complètes, demi-journées et absences dans le calendrier',
          en: 'Track daily attendance, half-days, and absences on calendar',
          ar: 'تسجيل حضور وغياب وأنصاف أيام عمل الموظفين في الرزنامة'
        }
      }
    ]
  },
  {
    id: 'settings',
    name: 'Paramètres & Sauvegardes',
    description: 'Infos du magasin, imprimantes et sauvegardes',
    iconName: 'Settings',
    badgeColor: '#475569',
    names: {
      fr: 'Paramètres & Sauvegardes',
      en: 'Settings & Backups',
      ar: 'الإعدادات والنسخ الاحتياطي'
    },
    descriptions: {
      fr: 'Infos du magasin, imprimantes et sauvegardes',
      en: 'Store details, printer setup, and database backups',
      ar: 'بيانات المحل وإعداد الطابعات وحفظ البيانات'
    },
    items: [
      {
        id: 'settings.store',
        label: 'Infos magasin & ticket',
        description: 'Modifier le nom, téléphone, adresse et en-tête des tickets',
        labels: {
          fr: 'Infos magasin & ticket',
          en: 'Store Info & Receipts',
          ar: 'بيانات المحل والوصل'
        },
        descriptions: {
          fr: 'Modifier le nom, téléphone, adresse et en-tête des tickets',
          en: 'Update company name, phone, address, and receipt notes',
          ar: 'تعديل اسم المحل والهاتف والعنوان ومعلومات الوصل'
        }
      },
      {
        id: 'settings.printers',
        label: 'Régler les imprimantes',
        description: 'Configurer l\'imprimante à tickets thermique ou A4',
        labels: {
          fr: 'Régler les imprimantes',
          en: 'Printer Settings',
          ar: 'إعداد وضبط الطابعات'
        },
        descriptions: {
          fr: 'Configurer l\'imprimante à tickets thermique ou A4',
          en: 'Configure 80mm receipt thermal printers and A4 invoices',
          ar: 'ضبط طابعة التذاكر الحرارية أو طابعة الفواتير A4'
        }
      },
      {
        id: 'settings.backup',
        label: 'Sauvegarde des données',
        description: 'Enregistrer une copie de sécurité ou restaurer la base',
        labels: {
          fr: 'Sauvegarde des données',
          en: 'Backup & Restore',
          ar: 'النسخ الاحتياطي واسترجاع البيانات'
        },
        descriptions: {
          fr: 'Enregistrer une copie de sécurité ou restaurer la base',
          en: 'Export database backup file or restore from a copy',
          ar: 'حفظ نسخة أمان من قاعدة البيانات أو استرجاعها'
        }
      },
      {
        id: 'settings.logs',
        label: 'Journal de sécurité',
        description: 'Voir les actions effectuées par chaque utilisateur',
        labels: {
          fr: 'Journal de sécurité',
          en: 'Security Activity Log',
          ar: 'سجل نشاطات المستخدمين'
        },
        descriptions: {
          fr: 'Voir les actions effectuées par chaque utilisateur',
          en: 'Audit trail of who performed what action in KMS',
          ar: 'الاطلاع على جميع العمليات التي قام بها المستخدمون'
        }
      }
    ]
  },
  {
    id: 'users',
    name: 'Utilisateurs & Droits',
    description: 'Créer les comptes employés et cocher leurs droits',
    iconName: 'UserCheck',
    badgeColor: '#10b981',
    names: {
      fr: 'Utilisateurs & Droits',
      en: 'Users & Permissions',
      ar: 'المستخدمون والصلاحيات'
    },
    descriptions: {
      fr: 'Créer les comptes employés et cocher leurs droits',
      en: 'Manage staff accounts and pick permissions via checkboxes',
      ar: 'إنشاء حسابات العمال وتحديد صلاحياتهم بالصناديق'
    },
    items: [
      {
        id: 'users.manage',
        label: 'Gérer les utilisateurs & droits',
        description: 'Créer des comptes et cocher les fonctions autorisées',
        labels: {
          fr: 'Gérer les utilisateurs & droits',
          en: 'Manage Users & Rights',
          ar: 'إدارة المستخدمين والصلاحيات'
        },
        descriptions: {
          fr: 'Créer des comptes et cocher les fonctions autorisées',
          en: 'Add worker accounts and check their responsibilities',
          ar: 'إنشاء حسابات وتحديد مسؤوليات كل عامل بالصناديق'
        }
      }
    ]
  },
  {
    id: 'services',
    name: 'Services & Flexy',
    description: 'Recharges Flexy (Mobilis, Djezzy, Ooredoo), photocopies & impressions',
    iconName: 'Zap',
    badgeColor: '#0284c7',
    names: {
      fr: 'Services & Flexy',
      en: 'Services & Flexy',
      ar: 'الخدمات والفليكسي'
    },
    descriptions: {
      fr: 'Recharges Flexy (Mobilis, Djezzy, Ooredoo), photocopies & impressions',
      en: 'Flexy recharges (Mobilis, Djezzy, Ooredoo), photocopies & printing',
      ar: 'شحن فليكسي (موبيليس، جيزي، أوريدو)، والنسخ والطباعة'
    },
    items: [
      {
        id: 'services.view',
        label: 'Consulter les services & le solde SIM',
        description: 'Voir l\'état des soldes Flexy et le journal des opérations',
        labels: {
          fr: 'Consulter les services & le solde SIM',
          en: 'View Services & SIM Balances',
          ar: 'عرض الخدمات ورصيد شرائح الفليكسي'
        },
        descriptions: {
          fr: 'Voir l\'état des soldes Flexy et le journal des opérations',
          en: 'Monitor remaining Flexy balances and activity log',
          ar: 'الاطلاع على رصيد الفليكسي المتبقي وسجل العمليات'
        }
      },
      {
        id: 'services.flexy',
        label: 'Effectuer des recharges Flexy & Copie',
        description: 'Vendre du Flexy ou des photocopies en caisse',
        labels: {
          fr: 'Effectuer des recharges Flexy & Copie',
          en: 'Process Flexy & Photocopy Sales',
          ar: 'إجراء عمليات الفليكسي وبيع النسخ'
        },
        descriptions: {
          fr: 'Vendre du Flexy ou des photocopies en caisse',
          en: 'Sell Flexy airtime and photocopy services at counter',
          ar: 'شحن الرصيد للزبائن وتسجيل النسخ في الصندوق'
        }
      },
      {
        id: 'services.tarifs',
        label: 'Configurer les tarifs & API Flexy',
        description: 'Modifier les prix des copies et connecter la passerelle API',
        labels: {
          fr: 'Configurer les tarifs & API Flexy',
          en: 'Configure Rates & Flexy API',
          ar: 'ضبط أسعار الخدمات وربط API'
        },
        descriptions: {
          fr: 'Modifier les prix des copies et connecter la passerelle API',
          en: 'Set prices per copy and connect Flexy API credentials',
          ar: 'تعديل أسعار النسخ والطباعة وربط بوابة الفليكسي'
        }
      }
    ]
  },
  {
    id: 'expirations',
    name: 'Dates d\'Expiration & Péremption',
    description: 'Suivi et alertes des dates de péremption des produits (< 1m, < 2m, < 3m, périmés)',
    iconName: 'Calendar',
    badgeColor: '#ea580c',
    names: {
      fr: 'Dates d\'Expiration & Péremption',
      en: 'Expiration Dates & Alerts',
      ar: 'تواريخ انتهاء الصلاحية والتنبيهات'
    },
    descriptions: {
      fr: 'Suivi et alertes des dates de péremption des produits (< 1m, < 2m, < 3m, périmés)',
      en: 'Monitor and track product shelf-life and expiration warnings',
      ar: 'متابعة وتنبيهات تواريخ انتهاء صلاحية السلع والمنتجات'
    },
    items: [
      {
        id: 'expirations.view',
        label: 'Voir les alertes de péremption',
        description: 'Accéder à la page de suivi des dates d\'expiration et alertes',
        labels: {
          fr: 'Voir les alertes de péremption',
          en: 'View Expiration Alerts',
          ar: 'عرض تنبيهات انتهاء الصلاحية'
        },
        descriptions: {
          fr: 'Accéder à la page de suivi des dates d\'expiration et alertes',
          en: 'Access the expiration warnings overview page',
          ar: 'الاطلاع على صفحة تنبيهات السلع المنتهية والقريبة من الانتهاء'
        }
      },
      {
        id: 'expirations.edit',
        label: 'Modifier les dates d\'expiration',
        description: 'Mettre à jour ou corriger la date d\'expiration des articles',
        labels: {
          fr: 'Modifier les dates d\'expiration',
          en: 'Edit Expiration Dates',
          ar: 'تعديل تواريخ الصلاحية'
        },
        descriptions: {
          fr: 'Mettre à jour ou corriger la date d\'expiration des articles',
          en: 'Update or correct the expiration date of items',
          ar: 'تعديل أو تصحيح تاريخ انتهاء الصلاحية للسلع'
        }
      }
    ]
  }
];

/**
 * All permission IDs in a flat list
 */
export const ALL_PERMISSIONS: string[] = PERMISSION_MODULES.flatMap(m => m.items.map(i => i.id));

/**
 * Predefined Roles to configure checkboxes in 1-click (with multi-language labels)
 */
export const ROLE_PRESETS: RolePreset[] = [
  {
    id: 'admin',
    name: 'Administrateur (Tous les droits)',
    description: 'Accès total et sans restriction à tout le logiciel KMS',
    badgeColor: '#16a34a',
    names: {
      fr: 'Administrateur (Tous les droits)',
      en: 'Administrator (Full Access)',
      ar: 'المدير (كل الصلاحيات)'
    },
    descriptions: {
      fr: 'Accès total et sans restriction à tout le logiciel KMS',
      en: 'Full unrestricted access to every feature of KMS',
      ar: 'صلاحيات كاملة وغير محدودة في جميع خصائص البرنامج'
    },
    permissions: ['*']
  },
  {
    id: 'caissier',
    name: 'Caissier / Vendeur POS',
    description: 'Vendre en caisse, réimprimer les tickets et voir les clients',
    badgeColor: '#2563eb',
    names: {
      fr: 'Caissier / Vendeur POS',
      en: 'Cashier / Counter Seller',
      ar: 'كاشير / بائع في الصندوق'
    },
    descriptions: {
      fr: 'Vendre en caisse, réimprimer les tickets et voir les clients',
      en: 'Perform counter sales, reprint receipts, and view clients',
      ar: 'البيع في الكاسة، إعادة طباعة التذاكر ورؤية الزبائن'
    },
    permissions: [
      'ventes.pos',
      'ventes.create',
      'ventes.hold_cart',
      'services.view',
      'services.flexy',
      'historique.view',
      'historique.print',
      'products.view',
      'expirations.view',
      'clients.view',
      'caisses.view',
      'caisses.sessions'
    ]
  },
  {
    id: 'magasinier',
    name: 'Responsable Stock / Magasinier',
    description: 'Gérer les articles, corriger le stock et préparer les commandes',
    badgeColor: '#ea580c',
    names: {
      fr: 'Responsable Stock / Magasinier',
      en: 'Stock Keeper / Warehouse',
      ar: 'مسؤول المخزن والسلع'
    },
    descriptions: {
      fr: 'Gérer les articles, corriger le stock et préparer les commandes',
      en: 'Manage items, adjust stock counts, and handle orders',
      ar: 'متابعة السلع، تصحيح كميات المخزون وتجهيز الطلبيات'
    },
    permissions: [
      'products.view',
      'products.cost_price',
      'products.edit',
      'products.stock_adjust',
      'products.categories',
      'products.orders',
      'fournisseurs.view'
    ]
  },
  {
    id: 'commercial',
    name: 'Commercial & Recouvrement',
    description: 'Ventes, clients, ventes à crédit et encaissement des dettes',
    badgeColor: '#8b5cf6',
    names: {
      fr: 'Commercial & Recouvrement',
      en: 'Sales & Debt Collector',
      ar: 'مكلف بالمبيعات وتحصيل الديون'
    },
    descriptions: {
      fr: 'Ventes, clients, ventes à crédit et encaissement des dettes',
      en: 'Sales, client management, credit sales, and collecting debts',
      ar: 'المبيعات، متابعة الزبائن، البيع بالكريدي وقبض الديون'
    },
    permissions: [
      'ventes.pos',
      'ventes.create',
      'ventes.credit',
      'clients.view',
      'clients.edit',
      'clients.add_debt',
      'clients.pay_debt',
      'historique.view',
      'products.view'
    ]
  },
  {
    id: 'tresorier',
    name: 'Responsable Caisse & Trésorier',
    description: 'Gérer les caisses, compter l\'argent et payer les fournisseurs',
    badgeColor: '#059669',
    names: {
      fr: 'Responsable Caisse & Trésorier',
      en: 'Cashier & Treasury Manager',
      ar: 'مسؤول الصندوق والسيولة'
    },
    descriptions: {
      fr: 'Gérer les caisses, compter l\'argent et payer les fournisseurs',
      en: 'Manage cash boxes, count shifts, and pay suppliers',
      ar: 'متابعة الصناديق، عد السيولة ودفع مستحقات الموردين'
    },
    permissions: [
      'caisses.view',
      'caisses.sessions',
      'caisses.movements',
      'caisses.transfer',
      'ventes.pos',
      'ventes.create',
      'historique.view',
      'clients.pay_debt',
      'fournisseurs.pay',
      'dashboard.view'
    ]
  },
  {
    id: 'worker',
    name: 'Rôle Personnalisé',
    description: 'Responsabilités cochées sur mesure par l\'administrateur',
    badgeColor: '#64748b',
    names: {
      fr: 'Rôle Personnalisé',
      en: 'Custom Role',
      ar: 'مخصص حسب الاختيار'
    },
    descriptions: {
      fr: 'Responsabilités cochées sur mesure par l\'administrateur',
      en: 'Permissions tailored by the administrator with checkboxes',
      ar: 'صلاحيات مخصصة يحددها المدير يدوياً بالصناديق'
    },
    permissions: []
  }
];

// Helper functions for localized text
export function getModuleLabel(mod: PermissionModule, lang: Language = 'fr'): string {
  return mod.names?.[lang] || mod.names?.fr || mod.name;
}

export function getModuleDescription(mod: PermissionModule, lang: Language = 'fr'): string {
  return mod.descriptions?.[lang] || mod.descriptions?.fr || mod.description;
}

export function getPermissionLabel(item: PermissionItem, lang: Language = 'fr'): string {
  return item.labels?.[lang] || item.labels?.fr || item.label;
}

export function getPermissionDescription(item: PermissionItem, lang: Language = 'fr'): string {
  return item.descriptions?.[lang] || item.descriptions?.fr || item.description;
}

export function getPresetName(preset: RolePreset, lang: Language = 'fr'): string {
  return preset.names?.[lang] || preset.names?.fr || preset.name;
}

export function getPresetDescription(preset: RolePreset, lang: Language = 'fr'): string {
  return preset.descriptions?.[lang] || preset.descriptions?.fr || preset.description;
}

/**
 * Check if a user has a specific granular permission
 */
export function hasPermission(user: any, permissionId: string): boolean {
  if (!user) return false;
  
  // Administrator has absolute full access unconditionally
  if (user.role === 'admin') return true;

  const perms = normalizePermissions(user.permissions);
  if (perms.includes('*')) return true;
  if (perms.includes(permissionId)) return true;

  // Module wildcard check (e.g. 'ventes.*' or 'ventes')
  const modulePrefix = permissionId.split('.')[0];
  if (perms.includes(`${modulePrefix}.*`) || perms.includes(modulePrefix)) {
    return true;
  }

  return false;
}

/**
 * Check if a user can access a top-level module / tab
 */
export function hasModuleAccess(user: any, moduleId: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;

  // 'account' tab is always accessible for every logged-in user
  if (moduleId === 'account') return true;

  // 'expirations' module shares access with 'products'
  if (moduleId === 'expirations') return hasModuleAccess(user, 'products');


  const perms = normalizePermissions(user.permissions);
  if (perms.includes('*') || perms.includes(moduleId) || perms.includes(`${moduleId}.*`)) {
    return true;
  }

  return perms.some(p => p.startsWith(`${moduleId}.`));
}

/**
 * Normalize permissions into a clean string array
 */
export function normalizePermissions(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [raw];
    } catch {
      return raw ? [raw] : [];
    }
  }
  return [];
}

/**
 * Human-readable badge text describing user permissions with multi-language support
 */
export function getPermissionSummary(user: any, lang: Language = 'fr'): { count: number; total: number; label: string } {
  const i18nLabels = {
    fr: {
      none: 'Aucun droit',
      admin: 'Accès Total (Admin)',
      wildcard: 'Accès Total (*)',
      features: (c: number, t: number) => `${c} / ${t} fonctionnalités`
    },
    en: {
      none: 'No permissions',
      admin: 'Full Access (Admin)',
      wildcard: 'Full Access (*)',
      features: (c: number, t: number) => `${c} / ${t} features`
    },
    ar: {
      none: 'لا توجد صلاحيات',
      admin: 'صلاحيات كاملة (مدير)',
      wildcard: 'صلاحيات كاملة (*)',
      features: (c: number, t: number) => `${c} من ${t} خاصية`
    }
  };

  const currentStrings = i18nLabels[lang] || i18nLabels.fr;

  if (!user) return { count: 0, total: ALL_PERMISSIONS.length, label: currentStrings.none };
  if (user.role === 'admin') {
    return { count: ALL_PERMISSIONS.length, total: ALL_PERMISSIONS.length, label: currentStrings.admin };
  }

  const perms = normalizePermissions(user.permissions);
  if (perms.includes('*')) {
    return { count: ALL_PERMISSIONS.length, total: ALL_PERMISSIONS.length, label: currentStrings.wildcard };
  }

  // Count matching permissions
  const count = ALL_PERMISSIONS.filter(p => hasPermission(user, p)).length;
  return {
    count,
    total: ALL_PERMISSIONS.length,
    label: currentStrings.features(count, ALL_PERMISSIONS.length)
  };
}
