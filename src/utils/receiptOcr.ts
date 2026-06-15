/**
 * Receipt OCR - extracts text from receipt images and PDFs using OCR.space API
 * Optimized for Indian grocery apps: Blinkit, Instamart, Flipkart, Zepto, BigBasket
 */

const OCR_API_URL = 'https://api.ocr.space/parse/image';
const OCR_API_KEY = 'K85930188388957'; // Free tier API key

export interface OcrResult {
  success: boolean;
  text: string;
  error?: string;
}

/**
 * Extract text from a base64 image
 */
export async function extractTextFromImage(base64: string): Promise<OcrResult> {
  return callOcrApi(`data:image/jpeg;base64,${base64}`, false);
}

/**
 * Extract text from a PDF file URI
 */
export async function extractTextFromPdf(fileUri: string): Promise<OcrResult> {
  try {
    // Read file and send as URL for PDF processing
    const formData = new FormData();
    formData.append('url', fileUri);
    formData.append('apikey', OCR_API_KEY);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2');
    formData.append('filetype', 'PDF');

    const response = await fetch(OCR_API_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      return { success: false, text: '', error: `API returned status ${response.status}` };
    }

    const data = await response.json();
    return processOcrResponse(data);
  } catch (error: any) {
    return { success: false, text: '', error: error.message || 'Failed to process PDF' };
  }
}

/**
 * Extract text from a file (PDF or image) using its base64 content
 */
export async function extractTextFromFile(base64: string, mimeType: string): Promise<OcrResult> {
  const dataUri = `data:${mimeType};base64,${base64}`;
  const isPdf = mimeType === 'application/pdf';
  return callOcrApi(dataUri, isPdf);
}

async function callOcrApi(base64DataOrUrl: string, isPdf: boolean): Promise<OcrResult> {
  try {
    const formData = new FormData();
    formData.append('base64Image', base64DataOrUrl);
    formData.append('apikey', OCR_API_KEY);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('isTable', 'true'); // Better for receipt tables
    formData.append('OCREngine', '2'); // Engine 2 is better for receipts/tables

    if (isPdf) {
      formData.append('filetype', 'PDF');
    }

    const response = await fetch(OCR_API_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      // Try Engine 1 as fallback
      return callOcrApiFallback(base64DataOrUrl, isPdf);
    }

    const data = await response.json();
    const result = processOcrResponse(data);

    // If Engine 2 gives poor results, retry with Engine 1
    if (result.success && result.text.length < 20) {
      return callOcrApiFallback(base64DataOrUrl, isPdf);
    }

    return result;
  } catch (error: any) {
    return callOcrApiFallback(base64DataOrUrl, isPdf);
  }
}

async function callOcrApiFallback(base64DataOrUrl: string, isPdf: boolean): Promise<OcrResult> {
  try {
    const formData = new FormData();
    formData.append('base64Image', base64DataOrUrl);
    formData.append('apikey', OCR_API_KEY);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('isTable', 'true');
    formData.append('OCREngine', '1'); // Fallback engine

    if (isPdf) {
      formData.append('filetype', 'PDF');
    }

    const response = await fetch(OCR_API_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return { success: false, text: '', error: `OCR API error (status ${response.status})` };
    }

    const data = await response.json();
    return processOcrResponse(data);
  } catch (error: any) {
    return { success: false, text: '', error: error.message || 'Network error during OCR' };
  }
}

function processOcrResponse(data: any): OcrResult {
  if (data.OCRExitCode === 1 && data.ParsedResults && data.ParsedResults.length > 0) {
    const fullText = data.ParsedResults
      .map((result: any) => result.ParsedText || '')
      .join('\n');

    if (fullText.trim().length > 0) {
      return { success: true, text: fullText };
    }
  }

  if (data.ErrorMessage && data.ErrorMessage.length > 0) {
    return { success: false, text: '', error: data.ErrorMessage[0] };
  }

  if (data.IsErroredOnProcessing) {
    return { success: false, text: '', error: 'OCR processing failed. Try a clearer image.' };
  }

  return { success: false, text: '', error: 'No text could be detected. Try a clearer image or paste text manually.' };
}

/**
 * Clean up OCR output from grocery receipts
 * Optimized for Blinkit, Instamart, Flipkart receipt formats
 */
export function cleanReceiptText(rawText: string): string {
  let lines = rawText.split('\n');

  // Detect Blinkit table format
  const hasTableHeader = lines.some((l) =>
    /description|particulars/i.test(l) && (/qty|quantity|rate|amount/i.test(l))
  );

  if (hasTableHeader) {
    lines = extractTableItems(lines);
  }

  lines = lines
    .map((line) => line.trim())
    .filter((line) => {
      if (line.length < 2) return false;
      const lower = line.toLowerCase();

      const skipPatterns = [
        'order id', 'order #', 'order no', 'order number',
        'invoice', 'receipt', 'bill no', 'tax invoice',
        'delivered', 'delivery by', 'delivery to',
        'total', 'sub total', 'subtotal', 'grand total', 'net amount',
        'discount', 'coupon', 'promo', 'offer',
        'payment', 'paid via', 'paid by', 'upi', 'card ending',
        'thank you', 'thanks for',
        'address', 'pin code', 'pincode',
        'phone', 'mobile', 'email',
        'free delivery', 'handling charge', 'platform fee',
        'delivery fee', 'delivery charge', 'convenience',
        'bill details', 'order summary', 'item total',
        'gst', 'cgst', 'sgst', 'igst', 'tax',
        'savings', 'you saved', 'cashback',
        'blinkit', 'instamart', 'swiggy', 'zomato', 'flipkart',
        'zepto', 'bigbasket', 'jiomart', 'dunzo',
        'customer care', 'helpline', 'support',
        'fssai', 'license', 'gstin', 'cin', 'pan',
        'date:', 'time:', 'placed on', 'delivered on',
        'items in this order', 'your order', 'order details',
        'description', 'hsn', 'particulars', 'sac code',
        'seller', 'sold by', 'marketed by', 'manufactured',
        'warehouse', 'store name', 'hub',
        'signature', 'authorized',
      ];

      if (skipPatterns.some((p) => lower.includes(p))) return false;
      if (/^[₹$]?\s*[\d,]+\.?\d*\s*$/.test(line)) return false;
      if (/^\d+[\-\/]\d+[\-\/]\d+$/.test(line)) return false;
      if (/^\d{4,8}$/.test(line.replace(/\s/g, ''))) return false;

      return true;
    })
    .map((line) => {
      let cleaned = line;
      cleaned = cleaned.replace(/[₹$]\s*[\d,]+\.?\d*/g, '');
      cleaned = cleaned.replace(/Rs\.?\s*[\d,]+\.?\d*/gi, '');
      cleaned = cleaned.replace(/MRP\s*[:\-]?\s*[₹$]?\s*[\d,]+[\.,]?\d*/gi, '');
      cleaned = cleaned.replace(/\b\d{4,8}\b/g, ''); // HSN codes
      cleaned = cleaned.replace(/Qty\s*[:\-=]\s*/gi, '');
      cleaned = cleaned.replace(/^[\-\|:;,]+/, '').replace(/[\-\|:;,]+$/, '');
      cleaned = cleaned.replace(/\s{2,}/g, ' ');
      return cleaned.trim();
    })
    .filter((line) => line.length > 2);

  return lines.join('\n');
}

/**
 * Extract items from table-format receipts (Blinkit Tax Invoice)
 */
function extractTableItems(lines: string[]): string[] {
  const results: string[] = [];
  let inTable = false;

  for (const line of lines) {
    if (/description|particulars|item\s*name/i.test(line) && /qty|quantity|rate|amount/i.test(line)) {
      inTable = true;
      continue;
    }
    if (inTable && (/total|sub\s*total|grand/i.test(line.toLowerCase()) || /^[\-=]+$/.test(line.trim()))) {
      inTable = false;
      continue;
    }
    if (inTable && line.trim().length > 2) {
      const parts = line.split(/\s{2,}|\t/).map((p) => p.trim()).filter((p) => p.length > 0);
      if (parts.length >= 2) {
        const description = parts[0];
        let qty = '1';
        for (let i = 1; i < parts.length; i++) {
          if (/^\d+$/.test(parts[i]) && parseInt(parts[i]) < 100) {
            qty = parts[i];
            break;
          }
        }
        results.push(parseInt(qty) > 1 ? `${description} x${qty}` : description);
      } else {
        results.push(line);
      }
    } else if (!inTable) {
      results.push(line);
    }
  }
  return results;
}
