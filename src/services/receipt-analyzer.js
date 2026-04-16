import { hasApiKey, callClaude } from './claude';

/**
 * Analyze a receipt image and extract structured data via Claude Vision API.
 * @param {string} base64ImageData - Base64-encoded image (no data: prefix)
 * @returns {Promise<{supplier: string, description: string, amount: number, vatRate: number, date: string, category: string}>}
 */
export async function analyzeReceipt(base64ImageData) {
  if (!hasApiKey()) {
    console.warn('[receipt-analyzer] No API key — returning placeholder data.');
    return {
      supplier: 'Demo Supplier',
      description: 'Sample receipt (configure Claude API key in Settings for real OCR)',
      amount: 25.50,
      vatRate: 21,
      date: new Date().toISOString().split('T')[0],
      category: 'office',
      _placeholder: true,
    };
  }

  const systemPrompt = `You are a receipt analysis assistant for Dutch freelancers (ZZP'ers).
Extract the following fields from the receipt image and return ONLY valid JSON (no markdown, no explanation):
{
  "supplier": "company/store name",
  "description": "brief description of purchase",
  "amount": 0.00,
  "vatRate": 21,
  "date": "YYYY-MM-DD",
  "category": "best matching category"
}

Category must be one of: office, travel, venue, equipment, software, insurance, education, marketing, telecom, vehicle, professional, representation, other

Rules:
- amount should be the total including VAT (incl. BTW)
- vatRate should be 0, 9, or 21 (Dutch VAT rates)
- date should be in YYYY-MM-DD format
- If a field cannot be determined, use reasonable defaults
- All text should be in the original language of the receipt`;

  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: base64ImageData,
          },
        },
        {
          type: 'text',
          text: 'Please analyze this receipt and extract the data as JSON.',
        },
      ],
    },
  ];

  const response = await callClaude({
    messages,
    system: systemPrompt,
    maxTokens: 1024,
  });

  if (!response) {
    throw new Error('Empty response from Claude');
  }

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    supplier: parsed.supplier || 'Unknown',
    description: parsed.description || '',
    amount: typeof parsed.amount === 'number' ? parsed.amount : 0,
    vatRate: [0, 9, 21].includes(parsed.vatRate) ? parsed.vatRate : 21,
    date: parsed.date || new Date().toISOString().split('T')[0],
    category: parsed.category || 'other',
  };
}
