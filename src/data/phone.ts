/**
 * Nigerian mobile number check for the booking form (the server applies the same rule).
 *
 * Accepted (spaces, dashes, dots and brackets ignored): 0803 123 4567,
 * 08031234567, 0803-123-4567, (0803) 123-4567, 803 123 4567.
 * Must be a mobile: 070x/071x/080x/081x/090x/091x, 11 digits.
 * Numbers written with the country code (+234…, 234…, 00234…) are not accepted:
 * patients enter the local number starting with 0.
 */

const MOBILE = /^0[789][01]\d{8}$/;

export const NG_PHONE_HINT = "Nigerian mobile number starting with 0, e.g. 0803 123 4567";

/** True when the number is written with the country code (+234, 234 or 00234). */
export const hasCountryCode = (raw: string) => {
  const text = String(raw ?? "").trim();
  const digits = text.replace(/\D/g, "");
  return text.startsWith("+") || digits.startsWith("234") || digits.startsWith("00234");
};

/** '0803 123 4567' -> '08031234567', or null if it isn't an accepted Nigerian mobile number. */
export function toLocalNgMobile(raw: string): string | null {
  const text = String(raw ?? "").trim();
  if (!text || /[^\d\s().\-]/.test(text) || hasCountryCode(text)) return null;
  let digits = text.replace(/\D/g, "");
  if (digits.length === 10 && !digits.startsWith("0")) digits = "0" + digits;
  return MOBILE.test(digits) ? digits : null;
}

/** "" when valid, otherwise a short message to show under the field. */
export function ngPhoneProblem(raw: string): string {
  const text = String(raw ?? "").trim();
  if (!text) return "Enter your phone number.";
  if (hasCountryCode(text)) return "Enter your number starting with 0 (e.g. 0803 123 4567), without +234 or 234.";
  if (/[^\d\s().\-]/.test(text)) return "Use digits only (spaces and dashes are fine).";
  if (toLocalNgMobile(text)) return "";
  const digits = text.replace(/\D/g, "");
  const local = digits.length === 10 && !digits.startsWith("0") ? "0" + digits : digits;
  if (local.length >= 2 && !/^0[789]/.test(local)) return "Enter a Nigerian mobile number. It should start with 070, 071, 080, 081, 090 or 091.";
  if (local.length >= 3 && !/^0[789][01]/.test(local)) return "That doesn't look like a Nigerian mobile number. It should start with 070, 071, 080, 081, 090 or 091.";
  if (local.length < 11) return "The number is too short: a Nigerian mobile number has 11 digits (e.g. 0803 123 4567).";
  return "The number is too long: a Nigerian mobile number has 11 digits (e.g. 0803 123 4567).";
}

/** '08031234567' -> '0803 123 4567' (for showing a tidy number back to the patient). */
export const formatNgMobile = (local: string) => local.replace(/^(\d{4})(\d{3})(\d{4})$/, "$1 $2 $3");
