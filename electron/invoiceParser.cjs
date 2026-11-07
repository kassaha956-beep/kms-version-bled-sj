const fs = require('fs');

/**
 * Extracts raw text from a PDF Buffer using pdf-parse
 */
async function extractTextFromPdfBuffer(buffer) {
  try {
    const pdfModule = require('pdf-parse');
    if (typeof pdfModule === 'function') {
      const res = await pdfModule(buffer);
      return res.text || '';
    }
    if (pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: buffer });
      const textResult = await parser.getText();
      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
      return typeof textResult === 'string'
        ? textResult
        : (textResult?.text || textResult?.pages?.map(p => p.text).join('\n') || '');
    }
    throw new Error('Module pdf-parse non initialisé.');
  } catch (err) {
    console.error('Erreur extraction texte PDF:', err);
    throw err;
  }
}

/**
 * Parses invoice text lines to extract item rows:
 *  - Product name / description
 *  - Quantity
 *  - Purchase price
 *  - Total line amount
 */
function parseInvoiceLines(text) {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items = [];

  const skipKeywords = [
    'total', 'tva', 'ht', 'ttc', 'facture', 'invoice', 'date', 'page', 'client', 'fournisseur',
    'adresse', 'tel', 'email', 'rc', 'nif', 'nis', 'art', 'banque', 'rip', 'rib', 'arrete',
    'somme', 'signature', 'cachet', 'remise', 'net a payer', 'reglement', 'mode', 'merci',
    'designation', 'description', 'qte', 'quantite', 'p.u', 'prix unitaire', 'montant',
    'societe', 'sarl', 'eurl', 'spa', 'solde', 'timbre', 'cheque', 'versement'
  ];

  for (const rawLine of lines) {
    if (rawLine.length < 3) continue;
    const lower = rawLine.toLowerCase();

    // Skip page markers and horizontal divider lines
    if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(rawLine) || /^page\s*\d+/i.test(lower) || /^[-=_*#.]+$/.test(rawLine)) {
      continue;
    }

    // Skip headers and meta lines
    if (skipKeywords.some(w => lower.startsWith(w) || lower.includes('arrete la presente') || lower.includes('net a payer') || lower.includes('page 1/'))) {
      continue;
    }

    // Attempt Columnar parsing first (columns separated by 2+ spaces or tabs or |)
    const columns = rawLine.split(/[\t|]|\s{2,}/).map(c => c.trim()).filter(Boolean);

    let rawName = '';
    let qty = 1;
    let price = 0;
    let total = 0;

    if (columns.length >= 3) {
      const numCandidates = [];
      const nameCols = [];

      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const isPureNum = /^[\d\s]+[.,]?\d*\s*(?:da|dzd|dz)?$/i.test(col);
        const cleanNum = parseFloat(col.replace(/\s+/g, '').replace(/da|dzd|dz/gi, '').replace(',', '.'));
        if (isPureNum && !isNaN(cleanNum) && cleanNum > 0) {
          numCandidates.push({ colIndex: i, val: cleanNum, raw: col });
        } else {
          nameCols.push(col);
        }
      }

      if (numCandidates.length >= 2 && nameCols.length >= 1) {
        rawName = nameCols.join(' ');
        if (numCandidates.length >= 3) {
          const [n1, n2, n3] = numCandidates.slice(-3);
          if (Math.abs(n1.val * n2.val - n3.val) < Math.max(1, n3.val * 0.05)) {
            qty = n1.val;
            price = n2.val;
            total = n3.val;
          } else if (Math.abs(n2.val * n3.val - n1.val) < Math.max(1, n1.val * 0.05)) {
            total = n1.val;
            qty = n2.val;
            price = n3.val;
          } else {
            qty = n1.val;
            price = n2.val;
            total = n3.val;
          }
        } else {
          const [n1, n2] = numCandidates.slice(-2);
          if (n1.val <= n2.val) {
            qty = n1.val;
            price = n2.val;
            total = qty * price;
          } else {
            price = n1.val;
            qty = n2.val;
            total = qty * price;
          }
        }
      }
    }

    // Fallback: standalone numbers extraction from line tail
    if (!rawName || price <= 0) {
      const standaloneNumRegex = /(?:^|\s)(\d{1,6}(?:[.,]\d{1,4})?)(?=\s*(?:da|dzd)?(?:\s|$))/gi;
      const matches = [];
      let m;
      while ((m = standaloneNumRegex.exec(rawLine)) !== null) {
        const val = parseFloat(m[1].replace(',', '.'));
        if (!isNaN(val) && val > 0) {
          matches.push({ val, index: m.index });
        }
      }

      if (matches.length >= 2) {
        const lastNums = matches.slice(-3);
        if (lastNums.length === 3) {
          const [n1, n2, n3] = lastNums;
          if (Math.abs(n1.val * n2.val - n3.val) < Math.max(1, n3.val * 0.05)) {
            qty = n1.val;
            price = n2.val;
            total = n3.val;
          } else {
            qty = n1.val;
            price = n2.val;
            total = n3.val;
          }
          rawName = rawLine.substring(0, n1.index).trim();
        } else {
          const [n1, n2] = lastNums;
          qty = n1.val;
          price = n2.val;
          total = qty * price;
          rawName = rawLine.substring(0, n1.index).trim();
        }
      }
    }

    // Clean leading sequence index (e.g. "1.", "01 -", "1 ")
    rawName = rawName.replace(/^\d+[\s.\-)]+\s*/, '').trim();

    // Verify name has actual letters or numbers
    const alphanumericCount = (rawName.match(/[a-zA-Z0-9]/g) || []).length;

    if (rawName && alphanumericCount >= 2 && price > 0) {
      items.push({
        rawLine,
        rawName,
        quantity: Math.max(1, qty),
        purchasePrice: price,
        total: total > 0 ? total : qty * price
      });
    }
  }

  return items;
}

module.exports = {
  extractTextFromPdfBuffer,
  parseInvoiceLines
};
