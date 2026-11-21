import { useState, useEffect } from 'react';
import { X, Printer, Barcode, Check } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import type { Translations } from '../i18n';

export interface BarcodeLabelDimension {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  category: 'standard' | 'shelf' | 'compact' | 'jewelry' | 'custom';
  description: string;
  fontSize: number; // pt
  barcodeHeight: number; // px
}

export const BARCODE_DIMENSIONS: BarcodeLabelDimension[] = [
  {
    id: '50x30',
    name: '50 mm × 30 mm',
    widthMm: 50,
    heightMm: 30,
    category: 'standard',
    description: 'Standard Xprinter / Zebra (Le plus utilisé)',
    fontSize: 9,
    barcodeHeight: 38
  },
  {
    id: '40x30',
    name: '40 mm × 30 mm',
    widthMm: 40,
    heightMm: 30,
    category: 'compact',
    description: 'Format compact supermarché & alimentation',
    fontSize: 8,
    barcodeHeight: 34
  },
  {
    id: '58x40',
    name: '58 mm × 40 mm',
    widthMm: 58,
    heightMm: 40,
    category: 'standard',
    description: 'Grand format pour texte long et prix bien lisible',
    fontSize: 10,
    barcodeHeight: 46
  },
  {
    id: '38x25',
    name: '38 mm × 25 mm',
    widthMm: 38,
    heightMm: 25,
    category: 'compact',
    description: 'Mini étiquette pour petits articles et cosmétiques',
    fontSize: 7.5,
    barcodeHeight: 28
  },
  {
    id: '60x40',
    name: '60 mm × 40 mm',
    widthMm: 60,
    heightMm: 40,
    category: 'standard',
    description: 'Format étiquette de rayon / Dépôt logistique',
    fontSize: 10,
    barcodeHeight: 46
  },
  {
    id: '70x35',
    name: '70 mm × 35 mm',
    widthMm: 70,
    heightMm: 35,
    category: 'shelf',
    description: 'Étiquette de gondole / Balisage prix',
    fontSize: 11,
    barcodeHeight: 40
  },
  {
    id: 'custom',
    name: 'Sur mesure (Personnalisé)',
    widthMm: 50,
    heightMm: 30,
    category: 'custom',
    description: 'Définissez vos propres dimensions en millimètres',
    fontSize: 9,
    barcodeHeight: 38
  }
];

export interface BarcodePrintProduct {
  id: number;
  name: string;
  barcode: string;
  selling_price?: number;
  sku?: string;
  base_unit?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product: BarcodePrintProduct | null;
  products?: BarcodePrintProduct[];
  t?: Translations;
  isRtl?: boolean;
}

export default function BarcodeTicketPrintModal({ isOpen, onClose, product, products, isRtl }: Props) {
  const [activeProduct, setActiveProduct] = useState<BarcodePrintProduct | null>(product);

  useEffect(() => {
    if (product) {
      setActiveProduct(product);
    } else if (products && products.length > 0 && !activeProduct) {
      setActiveProduct(products[0]);
    }
  }, [product, products]);

  const targetProduct = activeProduct || product;

  const [copies, setCopies] = useState<number>(1);
  const [selectedDimensionId, setSelectedDimensionId] = useState<string>('50x30');
  const [customWidthMm, setCustomWidthMm] = useState<number>(50);
  const [customHeightMm, setCustomHeightMm] = useState<number>(30);
  const [includePrice, setIncludePrice] = useState<boolean>(true);
  const [svgDataUrl, setSvgDataUrl] = useState<string>('');
  const [barcodeError, setBarcodeError] = useState<string | null>(null);

  // Active dimension settings
  const activeDimension = BARCODE_DIMENSIONS.find(d => d.id === selectedDimensionId) || BARCODE_DIMENSIONS[0];
  const effectiveWidthMm = selectedDimensionId === 'custom' ? customWidthMm : activeDimension.widthMm;
  const effectiveHeightMm = selectedDimensionId === 'custom' ? customHeightMm : activeDimension.heightMm;

  // Resolve code to encode (prefer barcode, fallback to SKU or generated code)
  const codeToEncode = targetProduct ? (targetProduct.barcode?.trim() || targetProduct.sku?.trim() || `PRD-${targetProduct.id}`) : '';

  // Generate SVG Barcode on changes
  useEffect(() => {
    if (!targetProduct || !codeToEncode) return;

    try {
      setBarcodeError(null);
      // Clean canvas/svg element for generation
      const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

      // Auto detect barcode format (EAN13 if 13 digits, CODE128 for others)
      const isDigitsOnly = /^\d+$/.test(codeToEncode);
      let format = 'CODE128';
      if (isDigitsOnly && codeToEncode.length === 13) {
        format = 'EAN13';
      } else if (isDigitsOnly && codeToEncode.length === 8) {
        format = 'EAN8';
      } else if (isDigitsOnly && codeToEncode.length === 12) {
        format = 'UPC';
      }

      // Height tailored to label
      const bHeight = Math.max(24, Math.min(60, Math.round(effectiveHeightMm * 1.3)));

      JsBarcode(svgNode, codeToEncode, {
        format,
        displayValue: false, // We render the number cleanly in bottom HTML as requested
        margin: 0,
        width: effectiveWidthMm < 45 ? 1.4 : 1.8,
        height: bHeight
      });

      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svgNode);
      const encoded = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
      setSvgDataUrl(encoded);
    } catch (err: any) {
      console.warn('Barcode generation warning:', err);
      // Fallback to Code 128 if strict checksum fails
      try {
        const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        JsBarcode(svgNode, codeToEncode, {
          format: 'CODE128',
          displayValue: false,
          margin: 0,
          width: 1.5,
          height: 35
        });
        const serializer = new XMLSerializer();
        setSvgDataUrl('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serializer.serializeToString(svgNode)));
      } catch (e: any) {
        setBarcodeError('Format de code-barres non supporté : ' + codeToEncode);
      }
    }
  }, [targetProduct, codeToEncode, effectiveWidthMm, effectiveHeightMm]);

  if (!isOpen || !targetProduct) return null;

  // Format currency
  const fmt = (n?: number) => (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' DA';

  // Direct Ticket Print Handler
  const handlePrint = () => {
    const totalCopies = Math.max(1, Math.min(500, copies || 1));
    const labelW = effectiveWidthMm;
    const labelH = effectiveHeightMm;

    // Generate individual label HTML
    const singleLabelHtml = `
      <div class="label-page">
        <div class="product-name">${escapeHtml(targetProduct.name)}</div>
        <div class="barcode-container">
          <img class="barcode-img" src="${svgDataUrl}" alt="${escapeHtml(codeToEncode)}" />
        </div>
        <div class="barcode-number">${escapeHtml(codeToEncode)}</div>
        ${includePrice && targetProduct.selling_price ? `<div class="product-price">${fmt(targetProduct.selling_price)}</div>` : ''}
      </div>
    `;

    // Repeat for requested number of copies
    const allLabelsHtml = Array(totalCopies).fill(singleLabelHtml).join('\n');

    const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Étiquettes - ${escapeHtml(targetProduct.name)} (${totalCopies} ex.)</title>
  <style>
    @page {
      size: ${labelW}mm ${labelH}mm;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .label-page {
      width: ${labelW}mm;
      height: ${labelH}mm;
      max-width: ${labelW}mm;
      max-height: ${labelH}mm;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 1.5mm 2mm;
      overflow: hidden;
    }
    .product-name {
      font-size: ${Math.max(6.5, Math.min(10, labelW * 0.16))}pt;
      font-weight: 700;
      color: #000000;
      line-height: 1.15;
      max-height: 2.3em;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      margin-bottom: 1mm;
      text-transform: uppercase;
      letter-spacing: -0.01em;
      width: 100%;
    }
    .barcode-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      margin: 0.5mm 0;
    }
    .barcode-img {
      max-width: 95%;
      height: auto;
      max-height: ${Math.max(16, labelH * 0.42)}mm;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
    .barcode-number {
      font-family: "Courier New", Courier, monospace, monospace;
      font-size: ${Math.max(6.5, Math.min(9.5, labelW * 0.15))}pt;
      font-weight: 700;
      letter-spacing: 0.14em;
      color: #000000;
      margin-top: 0.5mm;
      line-height: 1;
    }
    .product-price {
      font-size: ${Math.max(7, Math.min(11, labelW * 0.18))}pt;
      font-weight: 900;
      color: #000000;
      margin-top: 1mm;
      line-height: 1;
    }
    @media screen {
      body {
        background: #f1f5f9;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
      }
      .label-page {
        background: #ffffff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        border: 1px dashed #cbd5e1;
      }
    }
  </style>
</head>
<body>
  ${allLabelsHtml}
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() {
        window.close();
      }, 500);
    };
  </script>
</body>
</html>`;

    // Open clean print window configured with requested dimensions
    const winWidth = Math.max(380, labelW * 4);
    const winHeight = Math.max(320, labelH * 5);
    const printWindow = window.open('', '_blank', `width=${winWidth},height=${winHeight},scrollbars=yes`);
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
    }
  };

  function escapeHtml(str: string) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1300,
      direction: isRtl ? 'rtl' : 'ltr',
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
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
              background: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Barcode size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>
                Impression d'Étiquettes Code-barres
              </h3>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                Imprimante thermique d'étiquettes (Zebra, Xprinter, Dymo...)
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── BODY ── */}
        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Product Identification Card & Optional Selector */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {products && products.length > 1 && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Sélectionner un produit dans la liste :
                </label>
                <select
                  value={targetProduct.id}
                  onChange={(e) => {
                    const found = products.find(p => p.id === Number(e.target.value));
                    if (found) setActiveProduct(found);
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    background: '#ffffff',
                    fontWeight: 600,
                    color: '#0f172a'
                  }}
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.barcode ? `(${p.barcode})` : p.sku ? `[${p.sku}]` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  {targetProduct.name}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', gap: '12px' }}>
                  <span>SKU: <strong>{targetProduct.sku || '—'}</strong></span>
                  <span>Code: <strong>{codeToEncode}</strong></span>
                </div>
              </div>

              {targetProduct.selling_price ? (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                    Prix de Vente
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#16a34a' }}>
                    {fmt(targetProduct.selling_price)}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Dimension Selector */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '8px' }}>
              Format & Dimension de l'étiquette :
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {BARCODE_DIMENSIONS.map(dim => {
                const isSelected = selectedDimensionId === dim.id;
                return (
                  <button
                    key={dim.id}
                    type="button"
                    onClick={() => setSelectedDimensionId(dim.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: `2px solid ${isSelected ? '#0284c7' : '#e2e8f0'}`,
                      background: isSelected ? '#f0f9ff' : '#ffffff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: isSelected ? '#0369a1' : '#0f172a' }}>
                        {dim.name}
                      </span>
                      {isSelected && <Check size={14} color="#0284c7" />}
                    </div>
                    <div style={{ fontSize: '10px', color: isSelected ? '#0284c7' : '#64748b' }}>
                      {dim.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom dimensions inputs if selected */}
          {selectedDimensionId === 'custom' && (
            <div style={{
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Largeur (mm) :
                </label>
                <input
                  type="number"
                  min="20"
                  max="120"
                  value={customWidthMm}
                  onChange={(e) => setCustomWidthMm(Math.max(20, Math.min(120, Number(e.target.value) || 20)))}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px'
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Hauteur (mm) :
                </label>
                <input
                  type="number"
                  min="15"
                  max="100"
                  value={customHeightMm}
                  onChange={(e) => setCustomHeightMm(Math.max(15, Math.min(100, Number(e.target.value) || 15)))}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px'
                  }}
                />
              </div>
            </div>
          )}

          {/* Copies Count & Price Toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Nombre d'exemplaires à imprimer :
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCopies(c => Math.max(1, c - 1))}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    fontWeight: 800
                  }}
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, Math.min(500, parseInt(e.target.value, 10) || 1)))}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '6px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: 800
                  }}
                />
                <button
                  type="button"
                  onClick={() => setCopies(c => Math.min(500, c + 1))}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    fontWeight: 800
                  }}
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Options supplémentaires :
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={includePrice}
                  onChange={(e) => setIncludePrice(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
                />
                <span>Afficher le prix de vente sur l'étiquette</span>
              </label>
            </div>
          </div>

          {/* Visual Live Preview of the Ticket */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
              Aperçu en direct de l'étiquette ({effectiveWidthMm} mm × {effectiveHeightMm} mm) :
            </div>
            <div style={{
              background: '#f1f5f9',
              borderRadius: '10px',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #e2e8f0'
            }}>
              {/* Simulated Paper Label */}
              <div style={{
                background: '#ffffff',
                width: `${Math.min(320, effectiveWidthMm * 4.5)}px`,
                minHeight: `${Math.min(220, effectiveHeightMm * 4.5)}px`,
                boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                {/* 1. TOP: Product Name (Small text) */}
                <div style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#0f172a',
                  lineHeight: 1.2,
                  maxHeight: '2.4em',
                  overflow: 'hidden',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                  width: '100%'
                }}>
                  {targetProduct.name}
                </div>

                {/* 2. MIDDLE: The Barcode */}
                <div style={{ margin: '4px 0', width: '100%', display: 'flex', justifyContent: 'center' }}>
                  {svgDataUrl ? (
                    <img
                      src={svgDataUrl}
                      alt="Code-barres"
                      style={{ maxWidth: '95%', maxHeight: '45px', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ color: '#dc2626', fontSize: '11px' }}>{barcodeError || 'Génération...'}</div>
                  )}
                </div>

                {/* 3. BOTTOM: The code as number */}
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  color: '#000000'
                }}>
                  {codeToEncode}
                </div>

                {/* Optional Price */}
                {includePrice && targetProduct.selling_price ? (
                  <div style={{ fontSize: '12px', fontWeight: 900, color: '#16a34a', marginTop: '4px' }}>
                    {fmt(targetProduct.selling_price)}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          padding: '14px 22px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Total : <strong>{copies}</strong> étiquette(s) envoyée(s) à l'imprimante
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
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
              onClick={handlePrint}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 20px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
              }}
            >
              <Printer size={15} />
              <span>Lancer l'impression ({copies} ex.)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
