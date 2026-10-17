/**
 * Exact Money & Currency Utilities
 * 
 * All financial values in Ruchi Gift Collection are strictly stored and computed
 * in integer paise (1 INR = 100 paise) to prevent floating-point rounding errors.
 */

/**
 * Converts a rupee input (number or string like "12.50" or "450") to exact integer paise.
 * Safely parses string representations to avoid IEEE 754 floating point inaccuracies.
 */
export function rupeesToPaise(rupees: number | string): number {
  if (typeof rupees === 'number') {
    if (isNaN(rupees) || !isFinite(rupees)) return 0;
    rupees = rupees.toString();
  }

  const clean = rupees.trim();
  if (!clean) return 0;

  // Check for negative numbers
  const isNegative = clean.startsWith('-');
  const unsigned = isNegative ? clean.substring(1) : clean;

  const parts = unsigned.split('.');
  const wholePart = parseInt(parts[0] || '0', 10);
  if (isNaN(wholePart)) return 0;

  let fractionalPart = 0;
  if (parts.length > 1) {
    // Pad or slice to exactly 2 digits (e.g. "5" -> "50", "258" -> "25")
    const fracStr = (parts[1] + '00').slice(0, 2);
    fractionalPart = parseInt(fracStr, 10);
  }

  const paise = wholePart * 100 + fractionalPart;
  return isNegative ? -paise : paise;
}

/**
 * Converts integer paise to rupees as a standard number (for display/editing).
 */
export function paiseToRupees(paise: number): number {
  if (isNaN(paise)) return 0;
  return Math.round(paise) / 100;
}

/**
 * Formats integer paise into Indian currency string: e.g. ₹1,250.00 or ₹450
 */
export function formatRupees(paise: number, showDecimals: boolean = true): string {
  if (typeof paise !== 'number' || isNaN(paise)) return '₹0';

  const isNegative = paise < 0;
  const absPaise = Math.abs(Math.round(paise));
  const rupeesPart = Math.floor(absPaise / 100);
  const paisePart = absPaise % 100;

  // Format integer with Indian numbering system (e.g. 1,00,000)
  const rupeeString = rupeesPart.toLocaleString('en-IN');

  const prefix = isNegative ? '-₹' : '₹';
  if (!showDecimals && paisePart === 0) {
    return `${prefix}${rupeeString}`;
  }

  const paiseString = paisePart.toString().padStart(2, '0');
  return `${prefix}${rupeeString}.${paiseString}`;
}

/**
 * Line total calculation strictly in integer paise.
 */
export function calculateLineTotal(unitPricePaise: number, quantity: number): number {
  if (quantity <= 0 || unitPricePaise <= 0) return 0;
  return Math.round(unitPricePaise) * Math.round(quantity);
}

/**
 * Cart grand total calculation in integer paise.
 */
export function calculateCartTotal(
  items: Array<{ product: { selling_price: number }; quantity: number }>
): number {
  return items.reduce((sum, item) => {
    return sum + calculateLineTotal(item.product.selling_price, item.quantity);
  }, 0);
}
