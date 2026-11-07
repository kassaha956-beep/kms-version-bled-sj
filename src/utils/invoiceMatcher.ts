import type { Product } from '../components/ProductsPage';

/**
 * Cleans string: lowercase, strips accents, replaces separators with spaces,
 * removes non-alphanumeric characters, and compacts whitespace.
 */
export function cleanString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-/.\\,+*()#&[\]:;]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Compact string: removes all whitespace for continuous comparisons.
 * E.g. "coca cola" -> "cocacola", "coca_cola" -> "cocacola"
 */
export function compactString(str: string): string {
  return cleanString(str).replace(/\s+/g, '');
}

/**
 * Levenshtein distance between two strings
 */
export function levenshtein(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix: number[][] = Array.from({ length: bn + 1 }, (_, i) => [i]);
  for (let j = 0; j <= an; j++) matrix[0][j] = j;
  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[bn][an];
}

/**
 * Computes similarity ratio between 0 and 1
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return Math.max(0, (maxLen - levenshtein(a, b)) / maxLen);
}

/**
 * Advanced Multi-word & Fuzzy Matcher ("recherche chaque mot à part" + fuzzy)
 * Computes match score (0 - 100) between an extracted invoice line and a product.
 * Handles:
 *  - "coca cola" vs "cocacola" (compact equality)
 *  - "COCAcola" (case-insensitive)
 *  - "coca_cola" (separator-insensitive)
 *  - "coccola" (typo tolerance via Levenshtein / substring similarity)
 *  - Multi-word matching: each word of the product checked against invoice tokens
 */
export function matchProductScore(query: string, product: Product): number {
  if (!query || !product) return 0;
  const qClean = cleanString(query);
  const pNameClean = cleanString(product.name);
  const pSkuClean = cleanString(product.sku || '');
  const pBarcode = (product.barcode || '').trim();

  // 1. Direct barcode / SKU match
  if (pBarcode && query.includes(pBarcode)) return 100;
  if (pSkuClean && qClean.includes(pSkuClean)) return 100;

  // 2. Exact clean match
  if (qClean === pNameClean) return 100;

  // 3. Compact string match (e.g. "coca cola" === "coca_cola" === "cocacola")
  const qComp = compactString(query);
  const pComp = compactString(product.name);

  if (qComp === pComp) return 98;
  if (pComp.includes(qComp) || qComp.includes(pComp)) return 92;

  // 4. Compact fuzzy similarity (e.g. "coccola" vs "cocacola")
  const compSim = stringSimilarity(qComp, pComp);

  // 5. Word-by-word token analysis ("recherche chaque mot à part")
  const qWords = qClean.split(' ').filter(w => w.length > 1);
  const pWords = pNameClean.split(' ').filter(w => w.length > 1);

  if (pWords.length === 0 || qWords.length === 0) {
    return Math.round(compSim * 85);
  }

  let matchedWordsCount = 0;
  for (const pw of pWords) {
    let wordMatched = false;
    for (const qw of qWords) {
      if (pw === qw) {
        wordMatched = true;
        break;
      }
      if (qw.startsWith(pw) || pw.startsWith(qw)) {
        wordMatched = true;
        break;
      }
      // Fuzzy word matching with typo tolerance (e.g. "coccola" vs "coca")
      if (stringSimilarity(pw, qw) >= 0.72) {
        wordMatched = true;
        break;
      }
    }
    if (wordMatched) matchedWordsCount++;
  }

  const wordRatioScore = (matchedWordsCount / pWords.length) * 88;
  const finalScore = Math.max(wordRatioScore, compSim * 88);

  return Math.min(100, Math.round(finalScore));
}

/**
 * Finds best matching product and top candidates for a given invoice item
 */
export function findMatchingProducts(
  rawName: string,
  allProducts: Product[],
  minThreshold: number = 35
): {
  bestMatch: Product | null;
  bestScore: number;
  suggestions: Array<{ product: Product; score: number }>;
} {
  const scored = allProducts
    .map(p => ({ product: p, score: matchProductScore(rawName, p) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const bestMatch = best && best.score >= minThreshold ? best.product : null;
  const bestScore = best ? best.score : 0;
  const suggestions = scored.slice(0, 5);

  return {
    bestMatch,
    bestScore,
    suggestions
  };
}

