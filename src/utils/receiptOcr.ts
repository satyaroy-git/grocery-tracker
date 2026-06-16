/**
 * Receipt OCR using OCR.space free API.
 * Optimized for Blinkit/Instamart Tax Invoice table format.
 */

const OCR_API_URL = 'https://api.ocr.space/parse/image';
const OCR_API_KEY = 'K85930188388957';

export interface OcrResult {
  success: boolean;
  text: string;
  error?: string;
}

/**
 * Extract text from base64 image using OCR.space
 * Tries Engine 2 (better for tables), falls back to Engine 1
 */
export async function extractTextFromImage(base64: string): Promise<OcrResult> {
  // Try Engine 2 first (better for tables/receipts)
  const result = await callOcr(base64, '2');
  if (result.success && result.text.length > 30) return result;

  // Fallback to Engine 1
  return callOcr(base64, '1');
}

async function callOcr(base64: string, engine: string): Promise<OcrResult> {
  try {
    const formData = new FormData();
    formData.append('base64Image', `data:image/jpeg;base64,${base64}`);
    formData.append('apikey', OCR_API_KEY);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('isTable', 'true');
    formData.append('OCREngine', engine);

    const response = await fetch(OCR_API_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      return { success: false, text: '', error: `API status ${response.status}` };
    }

    const data = await response.json();

    if (data.OCRExitCode === 1 && data.ParsedResults?.length > 0) {
      const text = data.ParsedResults.map((r: any) => r.ParsedText || '').join('\n');
      if (text.trim()) return { success: true, text };
    }

    return { success: false, text: '', error: data.ErrorMessage?.[0] || 'No text detected' };
  } catch (e: any) {
    return { success: false, text: '', error: e.message || 'Network error' };
  }
}

/**
 * Parse Blinkit Tax Invoice OCR text into clean item lines.
 * Blinkit format: Sr.no | UPC | Item Description | MRP | Discount | Qty | ...
 * 
 * Strategy: Find lines that contain item descriptions by looking for
 * patterns that match product names (text with numbers, brackets, etc.)
 */
export function cleanReceiptText(rawText: string): string {
  const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const itemLines: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Skip obvious noise
    if (isNoiseLine(lower)) continue;

    // Skip lines that are just numbers, dates, or codes
    if (/^[\d\s.,/\-]+$/.test(line)) continue;
    if (/^\d{4,}$/.test(line.replace(/\s/g, ''))) continue;

    // Skip delivery charges lines
    if (/delivery\s*and\s*other/i.test(line)) continue;

    // Must have at least 4 alphabetic characters to be a product name
    const alphaCount = (line.match(/[a-zA-Z]/g) || []).length;
    if (alphaCount < 4) continue;

    // Clean the line
    let cleaned = line;
    // Remove leading serial numbers: "1", "2", etc.
    cleaned = cleaned.replace(/^\d{1,2}\s+/, '');
    // Remove UPC codes (8+ digit numbers)
    cleaned = cleaned.replace(/\b\d{4}\s*\d{4}\b/g, '');
    cleaned = cleaned.replace(/\b\d{8,}\b/g, '');
    // Remove HSN codes in brackets
    cleaned = cleaned.replace(/\(HSN[-\s]*\d+\)/gi, '');
    // Remove prices
    cleaned = cleaned.replace(/\b\d+\.\d{2}\b/g, '');
    // Remove standalone small numbers that might be qty/discount columns
    cleaned = cleaned.replace(/\s+\d{1,3}\s+/g, ' ');
    // Clean up
    cleaned = cleaned.replace(/[|]/g, '').replace(/\s{2,}/g, ' ').trim();

    if (cleaned.length >= 4 && (cleaned.match(/[a-zA-Z]/g) || []).length >= 4) {
      itemLines.push(cleaned);
    }
  }

  return itemLines.join('\n');
}

function isNoiseLine(lower: string): boolean {
  const noise = [
    'tax invoice', 'sold by', 'seller', 'blink commerce', 'bcpl',
    'measuring', 'corresponding', 'gstin', 'fssai', 'cin', 'pan',
    'invoice to', 'order id', 'invoice', 'date', 'place of supply',
    'sr. no', 'sr.no', 'upc', 'item description', 'mrp', 'discount',
    'taxable value', 'cgst', 'sgst', 'cess', 'additional cess', 'total',
    'delivery and other', 'charges',
    'grand total', 'net amount', 'round off',
    'address', 'pin code', 'state', 'name :',
    'bhubaneswar', 'odisha', 'plot no', 'floor',
    'invoice number', 'license number',
  ];
  return noise.some((n) => lower.includes(n));
}
