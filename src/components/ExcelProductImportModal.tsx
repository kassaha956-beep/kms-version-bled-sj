import { useState, useRef, useMemo } from 'react';
import {
  X, UploadCloud, FileSpreadsheet, Download, CheckCircle2,
  AlertTriangle, AlertCircle, RefreshCw, ArrowRight,
  Database, Check, FileDown, ShieldAlert
} from 'lucide-react';
import type { Translations } from '../i18n';

export interface ValidatedExcelRow {
  excelRowNumber: number;
  name: string;
  barcode: string;
  category: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_alert: number;
  base_unit: string;
  description: string;
  expiration_date?: string;
  status: 'valid' | 'error' | 'duplicate_in_file' | 'existing_in_db';
  errors: string[];
  warnings: string[];
  existingMatch?: {
    id: number;
    name: string;
    sku: string;
    barcode: string;
    stock_quantity: number;
    cost_price: number;
    selling_price: number;
  } | null;
  categoryMatched?: string;
}

export interface ExcelImportSummary {
  totalRows: number;
  validCount: number;
  errorCount: number;
  duplicateInFileCount: number;
  existingInDbCount: number;
}

export interface ExcelImportResult {
  success: boolean;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: Array<{
    excelRowNumber: number;
    name: string;
    barcode: string;
    reason: string;
  }>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  t: Translations;
  isRtl?: boolean;
}

export default function ExcelProductImportModal({ isOpen, onClose, onSuccess, isRtl }: Props) {
  // Step workflow: 'upload' -> 'preview' -> 'confirm' -> 'importing' -> 'results'
  const [step, setStep] = useState<'upload' | 'preview' | 'results'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parsed and validated data
  const [validatedRows, setValidatedRows] = useState<ValidatedExcelRow[]>([]);
  const [summary, setSummary] = useState<ExcelImportSummary | null>(null);

  // Strategy for existing products: 'skip' | 'update' | 'ask'
  const [existingStrategy, setExistingStrategy] = useState<'skip' | 'update'>('skip');

  // Confirmation dialog visibility
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Final Results
  const [importResults, setImportResults] = useState<ExcelImportResult | null>(null);

  // Filter for preview table
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'errors' | 'existing'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format currency
  const fmt = (n: number) => (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' DA';

  // Handle template download
  const handleDownloadTemplate = async () => {
    try {
      if (window.electronAPI?.downloadExcelProductTemplate) {
        const res = await window.electronAPI.downloadExcelProductTemplate();
        if (res.canceled) return;
        if (!res.success) {
          setErrorMessage(res.message || 'Impossible de télécharger le modèle.');
        }
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Erreur lors du téléchargement du modèle.');
    }
  };

  // Process selected file (either from native dialog or drag-and-drop)
  const processExcelRows = async (rows: any[], fileName: string, fileSize: number) => {
    setLoading(true);
    setLoadingMessage('Validation des données et vérification de la base...');
    setErrorMessage(null);

    try {
      if (!window.electronAPI?.validateExcelProductData) {
        throw new Error('API Electron de validation non disponible.');
      }

      const valRes = await window.electronAPI.validateExcelProductData(rows);
      if (!valRes.success || !valRes.validatedRows) {
        throw new Error(valRes.message || 'Erreur lors de la validation des données.');
      }

      setFileInfo({ name: fileName, size: fileSize });
      setValidatedRows(valRes.validatedRows);
      setSummary(valRes.summary);
      setStep('preview');
    } catch (e: any) {
      setErrorMessage(e.message || 'Erreur lors du traitement du fichier Excel.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // Native File Picker
  const handleSelectFileNative = async () => {
    try {
      if (!window.electronAPI?.selectExcelProductFile) {
        fileInputRef.current?.click();
        return;
      }
      setLoading(true);
      setLoadingMessage('Lecture du fichier Excel...');
      const res = await window.electronAPI.selectExcelProductFile();
      if (res.canceled) {
        setLoading(false);
        return;
      }
      if (!res.success || !res.rows) {
        setLoading(false);
        setErrorMessage(res.message || 'Impossible de lire le fichier sélectionné.');
        return;
      }
      await processExcelRows(res.rows, res.fileName || 'catalogue.xlsx', res.fileSize || 0);
    } catch (e: any) {
      setLoading(false);
      setErrorMessage(e.message || 'Erreur lors de la sélection du fichier.');
    }
  };

  // Browser/Drag-and-Drop File Handler
  const handleFileDrop = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setErrorMessage('Format invalide. Veuillez importer un fichier Excel (.xlsx ou .xls).');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('Le fichier sélectionné dépasse la limite autorisée de 25 Mo.');
      return;
    }

    setLoading(true);
    setLoadingMessage('Lecture et décodage du fichier...');
    setErrorMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Data = btoa(binary);

          if (window.electronAPI?.parseExcelProductBuffer) {
            const parseRes = await window.electronAPI.parseExcelProductBuffer({
              base64Data,
              fileName: file.name
            });
            if (!parseRes.success || !parseRes.rows) {
              throw new Error(parseRes.message || 'Erreur d\'analyse du fichier Excel.');
            }
            await processExcelRows(parseRes.rows, file.name, file.size);
          } else {
            throw new Error('API Electron indisponible.');
          }
        } catch (err: any) {
          setLoading(false);
          setErrorMessage(err.message || 'Erreur de lecture du fichier Excel.');
        }
      };
      reader.onerror = () => {
        setLoading(false);
        setErrorMessage('Erreur lors de la lecture physique du fichier.');
      };
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err.message || 'Impossible de traiter ce fichier.');
    }
  };

  // Confirm and Execute Import
  const handleExecuteImport = async () => {
    setShowConfirmDialog(false);
    setLoading(true);
    setLoadingMessage('Insertion en base de données avec transaction sécurisée...');
    setErrorMessage(null);

    try {
      if (!window.electronAPI?.executeExcelProductImport) {
        throw new Error('API d\'exécution d\'importation non disponible.');
      }

      const res = await window.electronAPI.executeExcelProductImport({
        rows: validatedRows,
        existingProductStrategy: existingStrategy
      });

      if (!res.success) {
        throw new Error(res.message || 'L\'importation en base de données a échoué.');
      }

      setImportResults(res);
      setStep('results');
      onSuccess();
    } catch (e: any) {
      setErrorMessage(e.message || 'Erreur critique lors de l\'importation en base de données.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // Export failed rows to Excel
  const handleExportFailedRows = async () => {
    if (!importResults || !importResults.errors || importResults.errors.length === 0) return;
    try {
      if (window.electronAPI?.exportFailedRowsExcel) {
        const res = await window.electronAPI.exportFailedRowsExcel(importResults.errors);
        if (res.canceled) return;
        if (!res.success) {
          setErrorMessage(res.message || 'Échec de l\'export des erreurs.');
        }
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Erreur lors de l\'export des lignes en erreur.');
    }
  };

  // Filtered rows for preview table
  const displayedRows = useMemo(() => {
    return validatedRows.filter(r => {
      // Status filter
      if (statusFilter === 'valid' && r.status !== 'valid') return false;
      if (statusFilter === 'errors' && r.status !== 'error' && r.status !== 'duplicate_in_file') return false;
      if (statusFilter === 'existing' && r.status !== 'existing_in_db') return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = r.name.toLowerCase().includes(q);
        const matchesBc = r.barcode.toLowerCase().includes(q);
        const matchesCat = r.category.toLowerCase().includes(q);
        return matchesName || matchesBc || matchesCat;
      }

      return true;
    });
  }, [validatedRows, statusFilter, searchTerm]);

  // Compute products ready to import under selected strategy
  const actionableCount = useMemo(() => {
    if (!summary) return 0;
    if (existingStrategy === 'update') {
      return summary.validCount + summary.existingInDbCount;
    }
    return summary.validCount;
  }, [summary, existingStrategy]);

  const resetAll = () => {
    setStep('upload');
    setFileInfo(null);
    setValidatedRows([]);
    setSummary(null);
    setImportResults(null);
    setErrorMessage(null);
    setStatusFilter('all');
    setSearchTerm('');
    setShowConfirmDialog(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1200,
      direction: isRtl ? 'rtl' : 'ltr',
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        width: '100%',
        maxWidth: step === 'preview' ? '1200px' : '720px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        transition: 'all 0.2s ease'
      }}>
        {/* ── HEADER ── */}
        <div style={{
          padding: '16px 22px',
          background: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #1e293b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileSpreadsheet size={20} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, letterSpacing: '0.02em' }}>
                Importation de Produits Excel (.xlsx / .xls)
              </h3>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                {step === 'upload' && 'Étape 1 : Sélection et validation préalable du catalogue'}
                {step === 'preview' && `Étape 2 : Prévisualisation & Analyse (${validatedRows.length} lignes)`}
                {step === 'results' && 'Rapport d\'importation finalisé'}
              </div>
            </div>
          </div>

          <button
            onClick={() => { resetAll(); onClose(); }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── ERROR BANNER ── */}
        {errorMessage && (
          <div style={{
            background: '#fef2f2',
            borderBottom: '1px solid #fecaca',
            padding: '12px 20px',
            color: '#b91c1c',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>{errorMessage}</span>
          </div>
        )}

        {/* ── BODY ── */}
        <div style={{ padding: '22px', overflowY: 'auto', flex: 1 }}>

          {/* ═══════════════════════════════════════════════════ */}
          {/* STEP 1: UPLOAD & DRAG AND DROP                      */}
          {/* ═══════════════════════════════════════════════════ */}
          {step === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Drag and drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFileDrop(e.dataTransfer.files[0]);
                  }
                }}
                onClick={handleSelectFileNative}
                style={{
                  border: `2px dashed ${isDragging ? '#16a34a' : '#cbd5e1'}`,
                  borderRadius: '12px',
                  background: isDragging ? '#f0fdf4' : '#f8fafc',
                  padding: '40px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: isDragging ? '#dcfce7' : '#e2e8f0',
                  color: isDragging ? '#16a34a' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UploadCloud size={28} />
                </div>

                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    Glissez-déposez votre fichier Excel ici
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    ou cliquez pour parcourir vos fichiers (.xlsx, .xls jusqu'à 25 Mo)
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    background: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '8px 18px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '6px'
                  }}
                >
                  <FileSpreadsheet size={15} />
                  Choisir un fichier Excel
                </button>
              </div>

              {/* Hidden file input for web fallback */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileDrop(e.target.files[0]);
                  }
                }}
              />

              {/* Template Download Section */}
              <div style={{
                background: '#f1f5f9',
                borderRadius: '10px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}>
                    <Download size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      Besoin du modèle Excel officiel ?
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Colonnes pré-configurées : Nom, Code-barres, Catégorie, P.A, P.V, Stock, Stock min, Unité...
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  style={{
                    background: '#ffffff',
                    color: '#0369a1',
                    border: '1px solid #bae6fd',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={14} />
                  Télécharger le modèle
                </button>
              </div>

              {/* Instructions and Mapping Card */}
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '16px 18px',
                background: '#ffffff'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                  Règles de validation & colonnes supportées :
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '11px', color: '#64748b' }}>
                  <div><strong>• Nom du produit</strong> : Obligatoire (min. 1 car.)</div>
                  <div><strong>• Code-barres</strong> : Détecte les doublons</div>
                  <div><strong>• Catégorie</strong> : Créée auto si inexistante</div>
                  <div><strong>• Prix d'Achat & Vente</strong> : Positifs ou zéro</div>
                  <div><strong>• Quantité Stock</strong> : Nombre valide ≥ 0</div>
                  <div><strong>• Seuil Alerte</strong> : Par défaut 5 pièces</div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════ */}
          {/* STEP 2: PREVIEW INTERFACE & VALIDATION AUDIT       */}
          {/* ═══════════════════════════════════════════════════ */}
          {step === 'preview' && summary && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* File Info & Strategy Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '12px 16px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileSpreadsheet size={18} color="#16a34a" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    {fileInfo?.name}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>
                    {((fileInfo?.size || 0) / 1024).toFixed(1)} Ko
                  </span>
                </div>

                {/* Strategy Selector for Existing Products */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                    Si le produit existe déjà :
                  </span>
                  <div style={{ display: 'flex', background: '#e2e8f0', padding: '2px', borderRadius: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setExistingStrategy('skip')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '5px',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: existingStrategy === 'skip' ? '#ffffff' : 'transparent',
                        color: existingStrategy === 'skip' ? '#0f172a' : '#64748b',
                        boxShadow: existingStrategy === 'skip' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      Ignorer
                    </button>
                    <button
                      type="button"
                      onClick={() => setExistingStrategy('update')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '5px',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: existingStrategy === 'update' ? '#ffffff' : 'transparent',
                        color: existingStrategy === 'update' ? '#0f172a' : '#64748b',
                        boxShadow: existingStrategy === 'update' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      Mettre à jour les prix
                    </button>
                  </div>
                </div>
              </div>

              {/* KPI Badges Ribbon */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <div
                  onClick={() => setStatusFilter('all')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: statusFilter === 'all' ? '#0f172a' : '#ffffff',
                    color: statusFilter === 'all' ? '#ffffff' : '#0f172a',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '11px', opacity: 0.8, textTransform: 'uppercase', fontWeight: 700 }}>
                    Total Détecté
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '2px' }}>
                    {summary.totalRows}
                  </div>
                </div>

                <div
                  onClick={() => setStatusFilter('valid')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: statusFilter === 'valid' ? '#16a34a' : '#f0fdf4',
                    color: statusFilter === 'valid' ? '#ffffff' : '#15803d',
                    border: '1px solid #86efac',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '11px', opacity: 0.9, textTransform: 'uppercase', fontWeight: 700 }}>
                    ✓ Nouveaux Valides
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '2px' }}>
                    {summary.validCount}
                  </div>
                </div>

                <div
                  onClick={() => setStatusFilter('existing')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: statusFilter === 'existing' ? '#d97706' : '#fffbeb',
                    color: statusFilter === 'existing' ? '#ffffff' : '#b45309',
                    border: '1px solid #fde68a',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '11px', opacity: 0.9, textTransform: 'uppercase', fontWeight: 700 }}>
                    ⚡ Déjà en Base
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '2px' }}>
                    {summary.existingInDbCount}
                  </div>
                </div>

                <div
                  onClick={() => setStatusFilter('errors')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: statusFilter === 'errors' ? '#dc2626' : '#fef2f2',
                    color: statusFilter === 'errors' ? '#ffffff' : '#b91c1c',
                    border: '1px solid #fca5a5',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '11px', opacity: 0.9, textTransform: 'uppercase', fontWeight: 700 }}>
                    ⚠️ Erreurs / Doublons
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '2px' }}>
                    {summary.errorCount + summary.duplicateInFileCount}
                  </div>
                </div>
              </div>

              {/* Table search & filter indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Filtrer par nom, code-barres ou catégorie..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '7px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Affichage : <strong>{displayedRows.length}</strong> sur {validatedRows.length}
                </span>
              </div>

              {/* Data Preview Table */}
              <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
                    <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
                      <th style={{ padding: '8px 10px', width: '50px' }}>Ligne</th>
                      <th style={{ padding: '8px 10px' }}>Statut</th>
                      <th style={{ padding: '8px 10px' }}>Produit</th>
                      <th style={{ padding: '8px 10px' }}>Code-barres</th>
                      <th style={{ padding: '8px 10px' }}>Catégorie</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>P.A</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>P.V</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Qté</th>
                      <th style={{ padding: '8px 10px' }}>Détails / Erreur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRows.map((r, i) => {
                      const isErr = r.status === 'error' || r.status === 'duplicate_in_file';
                      const isExist = r.status === 'existing_in_db';
                      return (
                        <tr
                          key={i}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: isErr ? '#fef2f2' : isExist ? '#fffbeb' : '#ffffff'
                          }}
                        >
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#64748b' }}>
                            #{r.excelRowNumber}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            {r.status === 'valid' && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#15803d', fontWeight: 700, fontSize: '11px', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                                <CheckCircle2 size={12} /> Valide
                              </span>
                            )}
                            {r.status === 'existing_in_db' && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#b45309', fontWeight: 700, fontSize: '11px', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>
                                <Database size={12} /> Existant
                              </span>
                            )}
                            {r.status === 'duplicate_in_file' && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontWeight: 700, fontSize: '11px', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                                <AlertTriangle size={12} /> Doublon
                              </span>
                            )}
                            {r.status === 'error' && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontWeight: 700, fontSize: '11px', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                                <AlertCircle size={12} /> Invalide
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
                            {r.name || <span style={{ color: '#dc2626', fontStyle: 'italic' }}>Manquant</span>}
                          </td>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>
                            {r.barcode || <span style={{ color: '#94a3b8' }}>—</span>}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                              {r.category || 'Général'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>
                            {fmt(r.cost_price)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                            {fmt(r.selling_price)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>
                            {r.stock_quantity} {r.base_unit}
                          </td>
                          <td style={{ padding: '8px 10px', fontSize: '11px' }}>
                            {r.errors.length > 0 ? (
                              <span style={{ color: '#dc2626', fontWeight: 600 }}>
                                {r.errors.join(' • ')}
                              </span>
                            ) : r.warnings.length > 0 ? (
                              <span style={{ color: '#b45309' }}>
                                {r.warnings.join(' • ')}
                              </span>
                            ) : (
                              <span style={{ color: '#16a34a' }}>Prêt à insérer</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════ */}
          {/* STEP 3: FINAL RESULTS REPORT                        */}
          {/* ═══════════════════════════════════════════════════ */}
          {step === 'results' && importResults && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                textAlign: 'center',
                padding: '20px',
                background: '#f0fdf4',
                borderRadius: '10px',
                border: '1px solid #86efac'
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: '#16a34a',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '10px'
                }}>
                  <Check size={28} />
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#15803d', margin: 0 }}>
                  Importation terminée avec succès !
                </h4>
                <div style={{ fontSize: '12px', color: '#166534', marginTop: '4px' }}>
                  La base de données SQLite a été mise à jour de manière atomique.
                </div>
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Créés</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#16a34a' }}>{importResults.importedCount}</div>
                </div>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Mis à jour</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#d97706' }}>{importResults.updatedCount}</div>
                </div>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Ignorés</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#475569' }}>{importResults.skippedCount}</div>
                </div>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Échecs</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#dc2626' }}>{importResults.failedCount}</div>
                </div>
              </div>

              {/* Failed Items Table (if any) */}
              {importResults.errors && importResults.errors.length > 0 && (
                <div style={{ border: '1px solid #fca5a5', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{
                    padding: '10px 14px',
                    background: '#fef2f2',
                    borderBottom: '1px solid #fca5a5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#b91c1c' }}>
                      ⚠️ Détail des lignes non importées ({importResults.errors.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleExportFailedRows}
                      style={{
                        background: '#ffffff',
                        color: '#b91c1c',
                        border: '1px solid #fca5a5',
                        borderRadius: '5px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <FileDown size={13} />
                      Exporter les erreurs en Excel
                    </button>
                  </div>

                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '6px 10px', textAlign: 'left' }}>Ligne</th>
                          <th style={{ padding: '6px 10px', textAlign: 'left' }}>Produit</th>
                          <th style={{ padding: '6px 10px', textAlign: 'left' }}>Raison</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResults.errors.map((err, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>#{err.excelRowNumber}</td>
                            <td style={{ padding: '6px 10px', fontWeight: 600 }}>{err.name}</td>
                            <td style={{ padding: '6px 10px', color: '#dc2626' }}>{err.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div style={{
          padding: '14px 22px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {step === 'upload' && (
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              ℹ️ Les données sont vérifiées avant toute modification en base.
            </div>
          )}

          {step === 'preview' && (
            <button
              type="button"
              onClick={resetAll}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              ← Choisir un autre fichier
            </button>
          )}

          {step === 'results' && (
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Le catalogue a été actualisé automatiquement.
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => { resetAll(); onClose(); }}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              {step === 'results' ? 'Fermer' : 'Annuler'}
            </button>

            {step === 'preview' && (
              <button
                type="button"
                onClick={() => setShowConfirmDialog(true)}
                disabled={loading || actionableCount === 0}
                style={{
                  background: actionableCount === 0 ? '#94a3b8' : '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 20px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: actionableCount === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: actionableCount > 0 ? '0 2px 8px rgba(22, 163, 74, 0.3)' : 'none'
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Traitement...</span>
                  </>
                ) : (
                  <>
                    <span>Continuer l'importation ({actionableCount})</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── CONFIRMATION DIALOG (STRICT REQUIREMENT) ── */}
      {showConfirmDialog && summary && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1300
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <ShieldAlert size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  Confirmation de l'Importation Excel
                </h4>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Opération transactionnelle SQLite
                </div>
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              borderRadius: '8px',
              padding: '14px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
              color: '#334155',
              lineHeight: 1.6,
              marginBottom: '18px'
            }}>
              <div>Vous êtes sur le point de procéder à l'importation :</div>
              <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
                <li><strong style={{ color: '#16a34a' }}>{summary.validCount}</strong> nouveau(x) produit(s) à créer.</li>
                {existingStrategy === 'update' ? (
                  <li><strong style={{ color: '#d97706' }}>{summary.existingInDbCount}</strong> produit(s) existant(s) à <strong>mettre à jour</strong> (prix préservés).</li>
                ) : (
                  <li><strong style={{ color: '#64748b' }}>{summary.existingInDbCount}</strong> produit(s) existant(s) seront <strong>ignorés</strong>.</li>
                )}
                {(summary.errorCount + summary.duplicateInFileCount) > 0 && (
                  <li><strong style={{ color: '#dc2626' }}>{summary.errorCount + summary.duplicateInFileCount}</strong> ligne(s) avec erreurs qui <strong>ne seront pas</strong> importées.</li>
                )}
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 20px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Check size={14} />
                Confirmer l'Importation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOADING OVERLAY ── */}
      {loading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1400,
          color: '#ffffff'
        }}>
          <RefreshCw size={36} className="animate-spin" color="#22c55e" />
          <div style={{ marginTop: '16px', fontSize: '14px', fontWeight: 700 }}>
            {loadingMessage || 'Traitement en cours...'}
          </div>
        </div>
      )}
    </div>
  );
}
