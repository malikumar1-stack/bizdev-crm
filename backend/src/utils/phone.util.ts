/**
 * Phone Number Normalization Utility
 * Standardizes phone numbers for WhatsApp API dispatch, storage, and UI presentation.
 * Special handling for Pakistan standard mobile formats (03XX-XXXXXXX, +92, 0092).
 */

export interface NormalizedPhone {
  isValid: boolean;
  e164: string;       // "+923001234567"
  apiNumber: string;  // "923001234567" (Required by Meta WhatsApp Cloud API)
  display: string;    // "0300-1234567" or "+92 300 1234567"
  raw: string;
  country: 'PK' | 'INTL' | 'INVALID';
  error?: string;
}

export function normalizePhoneNumber(rawPhone: string | null | undefined): NormalizedPhone {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return {
      isValid: false,
      e164: '',
      apiNumber: '',
      display: '',
      raw: rawPhone || '',
      country: 'INVALID',
      error: 'Phone number is empty or missing'
    };
  }

  const trimmed = rawPhone.trim();
  // Strip spaces, dashes, parentheses, dots
  let digits = trimmed.replace(/[^0-9+]/g, '');

  // Handle leading zeros or plus
  // 1. Pakistani local format: 03001234567 (11 digits starting with 03)
  if (/^03[0-9]{9}$/.test(digits)) {
    const withoutZero = digits.slice(1); // 3001234567
    const apiNumber = `92${withoutZero}`;
    const e164 = `+${apiNumber}`;
    const display = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return {
      isValid: true,
      e164,
      apiNumber,
      display,
      raw: trimmed,
      country: 'PK'
    };
  }

  // 2. Pakistani with double zero: 00923001234567
  if (/^00923[0-9]{9}$/.test(digits)) {
    const apiNumber = digits.slice(2); // 923001234567
    const e164 = `+${apiNumber}`;
    const display = `0${apiNumber.slice(2, 5)}-${apiNumber.slice(5)}`;
    return {
      isValid: true,
      e164,
      apiNumber,
      display,
      raw: trimmed,
      country: 'PK'
    };
  }

  // 3. Pakistani with 92 prefix: 923001234567 or +923001234567
  if (/^\+?923[0-9]{9}$/.test(digits)) {
    const apiNumber = digits.replace(/^\+/, ''); // 923001234567
    const e164 = `+${apiNumber}`;
    const display = `0${apiNumber.slice(2, 5)}-${apiNumber.slice(5)}`;
    return {
      isValid: true,
      e164,
      apiNumber,
      display,
      raw: trimmed,
      country: 'PK'
    };
  }

  // 4. Pakistani without leading zero: 3001234567 (10 digits)
  if (/^3[0-9]{9}$/.test(digits)) {
    const apiNumber = `92${digits}`;
    const e164 = `+${apiNumber}`;
    const display = `0${digits.slice(0, 3)}-${digits.slice(3)}`;
    return {
      isValid: true,
      e164,
      apiNumber,
      display,
      raw: trimmed,
      country: 'PK'
    };
  }

  // 5. Generic international format (E.164: + followed by 7 to 15 digits)
  const cleanDigits = digits.replace(/^\+/, '');
  if (/^[1-9][0-9]{6,14}$/.test(cleanDigits)) {
    return {
      isValid: true,
      e164: `+${cleanDigits}`,
      apiNumber: cleanDigits,
      display: `+${cleanDigits}`,
      raw: trimmed,
      country: 'INTL'
    };
  }

  return {
    isValid: false,
    e164: '',
    apiNumber: '',
    display: trimmed,
    raw: trimmed,
    country: 'INVALID',
    error: `Invalid phone number format: "${trimmed}". Expected Pakistani mobile (e.g. 03001234567) or international (+92...) format.`
  };
}
