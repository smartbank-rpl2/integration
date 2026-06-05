import { CONSTANTS } from '../config/constants';

/**
 * Formats a minor unit string into a localized currency string.
 * Money is ALWAYS represented as strings in this system.
 */
export function formatMoney(
  minorUnits: string | null | undefined, 
  currencyCode: string = CONSTANTS.CURRENCY,
  showSymbol: boolean = true
): string {
  if (!minorUnits) return showSymbol ? `${currencyCode} 0` : '0';
  
  try {
    // Parse to BigInt to ensure it's a valid integer string, then back to string for grouping
    const bigIntValue = BigInt(minorUnits);
    const isNegative = bigIntValue < 0n;
    
    // Absolute string
    const absStr = (isNegative ? -bigIntValue : bigIntValue).toString();
    
    // Add thousands separators
    const formatted = absStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    
    const sign = isNegative ? '-' : '';
    return showSymbol 
      ? `${sign}${currencyCode} ${formatted}` 
      : `${sign}${formatted}`;
  } catch (err) {
    console.error('Invalid money value:', minorUnits);
    return showSymbol ? `${currencyCode} ?` : '?';
  }
}

/**
 * Parses user input into a minor unit string.
 * Example: "1.000.000" -> "1000000"
 */
export function parseMoneyInput(input: string): string {
  // Strip everything except digits and minus sign
  const cleaned = input.replace(/[^\d-]/g, '');
  if (!cleaned) return '';
  return cleaned;
}
