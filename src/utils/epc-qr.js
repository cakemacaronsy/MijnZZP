/**
 * Build an EPC QR code data string per the European Payments Council standard.
 * This string can be rendered by react-native-qrcode-svg to generate a
 * scannable payment QR code for Dutch bank apps.
 *
 * @param {Object} params
 * @param {string} params.iban - IBAN of the beneficiary (e.g., 'NL91ABNA0417164300')
 * @param {string} params.name - Name of the beneficiary (max 70 chars)
 * @param {number} params.amount - Amount in EUR (e.g., 125.50)
 * @param {string} params.reference - Payment reference / description (max 140 chars)
 * @returns {string} EPC QR code data string
 */
export function buildEpcQrData({ iban, name, amount, reference }) {
  // EPC QR code standard fields (EPC069-12):
  // Line 1: Service Tag (fixed: BCD)
  // Line 2: Version (002)
  // Line 3: Character set (1 = UTF-8)
  // Line 4: Identification code (SCT = SEPA Credit Transfer)
  // Line 5: BIC of beneficiary bank (optional, can be empty)
  // Line 6: Name of beneficiary (max 70 chars)
  // Line 7: IBAN of beneficiary
  // Line 8: Amount (EUR prefixed, e.g., EUR125.50)
  // Line 9: Purpose code (optional, empty)
  // Line 10: Remittance reference (Structured, optional, empty)
  // Line 11: Remittance text (Unstructured, max 140 chars)
  // Line 12: Beneficiary to originator information (optional, empty)

  const cleanName = (name || '').substring(0, 70).trim();
  const cleanIban = (iban || '').replace(/\s/g, '').toUpperCase();
  const cleanReference = (reference || '').substring(0, 140).trim();
  const formattedAmount = `EUR${parseFloat(amount || 0).toFixed(2)}`;

  const lines = [
    'BCD',           // Service Tag
    '002',           // Version
    '1',             // Character set (UTF-8)
    'SCT',           // SEPA Credit Transfer
    '',              // BIC (optional, left empty — bank apps resolve from IBAN)
    cleanName,       // Beneficiary name
    cleanIban,       // Beneficiary IBAN
    formattedAmount, // Amount
    '',              // Purpose code (optional)
    '',              // Structured remittance reference (optional)
    cleanReference,  // Unstructured remittance text
  ];

  return lines.join('\n');
}
