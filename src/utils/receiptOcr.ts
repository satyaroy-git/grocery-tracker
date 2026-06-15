/**
 * Receipt OCR - extracts text from receipt images using OCR.space free API
 * Falls back to manual paste if OCR fails.
 * 
 * Supports receipts from: Blinkit, Instamart, Flipkart, Zepto, BigBasket
 */

const OCR_API_URL = 'https://api.ocr.space/parse/image';
const OCR_API_KEY = 'K85930188388957'; // Free tier API key (10,000 calls/month)

export interface OcrResult {
  success: boolean;
  text: string;
  error?: string;
}

/**
 * Extract text from an image using OCR.space API
 * @param imageUri - local file URI of the image
 * @param base64 - base64 encoded image data
 */
export async function extractTextFromImage(base64: string): Promise<OcrResult> {
  try {
    const formData = new FormData();
    formData.append('base64Image', `data:image/jpeg;base64,${base64}`);
    formData.append('apikey', OCR_API_KEY);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Engine 2 is better for receipts

    const response = await fetch(OCR_API_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      return { success: false, text: '', error: `API returned status ${response.status}` };
    }

    const data = await response.json();

    if (data.OCRExitCode === 1 && data.ParsedResults && data.ParsedResults.length > 0) {
      const fullText = data.ParsedResults
        .map((result: any) => result.ParsedText)
        .join('\n');
      return { success: true, text: fullText };
    }

    if (data.ErrorMessage) {
      return { success: false, text: '', error: data.ErrorMessage[0] || 'OCR failed' };
    }

    return { success: false, text: '', error: 'No text detected in image' };
  } catch (error: any) {
    return { success: false, text: '', error: error.message || 'Network error' };
  }
}

/**
 * Clean up OCR output from grocery receipts
 * Removes common receipt noise and formats for parsing
 */
export function cleanReceiptText(rawText: string): string {
  let text = rawText;

  // Remove common receipt headers/footers
  const removePatterns = [
    /order\s*(id|no|#|number)\s*[:\-]?\s*[\w\-]+/gi,
    /invoice\s*(id|no|#|number)\s*[:\-]?\s*[\w\-]+/gi,
    /transaction\s*(id|no|#)\s*[:\-]?\s*[\w\-]+/gi,
    /date\s*[:\-]?\s*\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4}/gi,
    /time\s*[:\-]?\s*\d{1,2}:\d{2}/gi,
    /[₹$]\s*\d+[\.,]?\d*/g, // Prices
    /Rs\.?\s*\d+[\.,]?\d*/gi,
    /MRP\s*[:\-]?\s*\d+/gi,
    /GST\s*[:\-]?\s*\d+/gi,
    /CGST\s*[:\-]?\s*\d+/gi,
    /SGST\s*[:\-]?\s*\d+/gi,
    /total\s*[:\-]?\s*\d+/gi,
    /subtotal\s*[:\-]?\s*\d+/gi,
    /discount\s*[:\-]?\s*\d+/gi,
    /savings?\s*[:\-]?\s*\d+/gi,
    /delivery\s*(fee|charge)\s*[:\-]?\s*\d*/gi,
    /platform\s*fee\s*[:\-]?\s*\d*/gi,
    /handling\s*charge\s*[:\-]?\s*\d*/gi,
  ];

  for (const pattern of removePatterns) {
    text = text.replace(pattern, '');
  }

  // Clean up multiple spaces and empty lines
  text = text.replace(/\t/g, '\n');
  text = text.replace(/ {2,}/g, ' ');
  text = text.split('\n').map(l => l.trim()).filter(l => l.length > 1).join('\n');

  return text;
}
