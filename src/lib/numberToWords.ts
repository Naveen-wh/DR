/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen"
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
];

function convertLessThanThousand(num: number): string {
  let result = "";
  if (num >= 100) {
    result += ONES[Math.floor(num / 100)] + " Hundred ";
    num %= 100;
  }
  if (num >= 20) {
    result += TENS[Math.floor(num / 10)] + " ";
    num %= 10;
  }
  if (num > 0) {
    result += ONES[num] + " ";
  }
  return result.trim();
}

/**
 * Converts a number to words in Indian numbering system (Lakhs, Crores).
 */
export function numberToWordsIndian(amount: number, currency: string = "INR"): string {
  if (isNaN(amount) || amount === 0) return `${currency} Zero Only`;

  const absAmount = Math.abs(amount);
  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  let num = integerPart;
  let words = "";

  const crore = Math.floor(num / 10000000);
  num %= 10000000;

  const lakh = Math.floor(num / 100000);
  num %= 100000;

  const thousand = Math.floor(num / 1000);
  num %= 1000;

  const remainder = num;

  if (crore > 0) {
    words += convertLessThanThousand(crore) + " Crore ";
  }
  if (lakh > 0) {
    words += convertLessThanThousand(lakh) + " Lakh ";
  }
  if (thousand > 0) {
    words += convertLessThanThousand(thousand) + " Thousand ";
  }
  if (remainder > 0) {
    words += convertLessThanThousand(remainder);
  }

  words = words.trim();
  if (!words) words = "Zero";

  const currPrefix = currency ? `${currency} ` : "";
  let result = `${currPrefix}${words}`;

  if (decimalPart > 0) {
    const decimalWords = convertLessThanThousand(decimalPart);
    const subUnit = currency === "INR" ? "Paise" : "Cents";
    result += ` and ${decimalWords} ${subUnit}`;
  }

  return `${result} Only`.replace(/\s+/g, " ");
}
