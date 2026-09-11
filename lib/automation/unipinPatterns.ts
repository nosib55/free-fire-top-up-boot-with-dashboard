// lib/automation/unipinPatterns.ts

export interface UnipinPatternMap {
  [amount: string]: RegExp[];
}

export const UNIPIN_DIAMOND_MAP: Record<string, number | string> = {
  "20": 25,
  "36": 50,
  "80": 115,
  "160": 240,
  "405": 610,
  "810": 1240,
  "1625": 2530,
  "161": "Weekly Membership",
  "800": "Monthly Membership",
  "2000": "3000+ Diamonds",
};

export function getUnipinPatterns(): UnipinPatternMap {
  return {
    "20": [
      /BDMB-T-S-\d{8}\s*\d{4}-\d{4}-\d{4}-\d{4}/i,
      /UPBD-Q-S-\d{8}\s*\d{4}-\d{4}-\d{4}-\d{4}/i,
    ],
    "36": [
      /BDMB-U-S-\d{8}\s*\d{4}-\d{4}-\d{4}-\d{4}/i,
      /UPBD-R-S-\d{8}\s*\d{4}-\d{4}-\d{4}-\d{4}/i,
    ],
    "80": [
      /BDMB-J-S-\d{8}\s*\d{4}-\d{4}-\d{4}-\d{4}/i,
      /UPBD-G-S-\d{8}\s*\d{4}-\d{4}-\d{4}-\d{4}/i,
    ],
    "160": [
      /BDMB-I-S-\d{8}\s*\d{4}-\d{4}-\d{4}-\d{4}/i,
      /UPBD-F-S-\d{8}\s*\d{4}-\d{4}-\d{4}-\d{4}/i,
    ],
    "161": [
      /BDMB-Q-S-\d{8}\s*\d{4}-\d{4}-\d{4}-\d{4}/i,
      /UPBD-N-S-\d{8}\s*\d{4}-\d{4}-\d{4}-\d{4}/i,
    ],
    "405": [
      /BDMB-K-S-\d{8}\s*\d{4}-\d{4}-\d{4}-\d{4}/i,
      /UPBD-H-S-\d{8}\s*\d{4}-\d{4}-\d{4}-\d{4}/i,
    ],
    "800": [
      /BDMB-S-S-\d{8}\s*\d{4}-\d{4}-\d{4}-\d{4}/i,
      /UPBD-P-S-\d{8}\s*\d{4}-\d{4}-\d{4}-\d{4}/i,
    ],
    "810": [
      /BDMB-L-S-\d{8}\s*\d{4}-\d{4}-\d{4}-\d{4}/i,
      /UPBD-I-S-\d{8}\s*\d{4}-\d{4}-\d{4}-\d{4}/i,
    ],
    "1625": [
      /BDMB-M-S-\d{8}\s*\d{4}-\d{4}-\d{4}-\d{4}/i,
      /UPBD-J-S-\d{8}\s*\d{4}-\d{4}-\d{4}-\d{4}/i,
    ],
    "2000": [
      /UPBD-7-S-\d{8}\s*\d{4}-\d{4}-\d{4}-\d{4}/i,
    ],
  };
}

export interface DetectedVoucherInfo {
  code: string;
  matchedPattern: string;
  diamondLabel: string;
  rawAmountKey: string;
  diamonds: number;
}

/**
 * Automatically detects the UniPin Diamond package amount from a raw voucher string.
 * Maps raw voucher keys (e.g., "80", "161") to exact Free Fire reward ("115 Diamonds", "Weekly Membership").
 */
export function detectUnipinDenomination(voucherText: string): DetectedVoucherInfo | null {
  if (!voucherText) return null;
  const patterns = getUnipinPatterns();

  // First try full regex match
  for (const [amountKey, regexes] of Object.entries(patterns)) {
    for (const regex of regexes) {
      const match = voucherText.match(regex);
      if (match) {
        const mappedValue = UNIPIN_DIAMOND_MAP[amountKey];
        const diamondLabel = typeof mappedValue === 'number' ? `${mappedValue} Diamonds` : String(mappedValue);
        const diamonds = typeof mappedValue === 'number' ? mappedValue : (parseInt(mappedValue, 10) || 0);

        return {
          code: amountKey,
          matchedPattern: match[0],
          diamondLabel,
          rawAmountKey: amountKey,
          diamonds,
        };
      }
    }
  }

  // Fallback: match by Serial Prefix (e.g., UPBD-N-S, BDMB-Q-S for Weekly)
  const SERIAL_PREFIX_MAP: Record<string, string> = {
    'BDMB-T-S': '20',
    'UPBD-Q-S': '20',
    'BDMB-U-S': '36',
    'UPBD-R-S': '36',
    'BDMB-J-S': '80',
    'UPBD-G-S': '80',
    'BDMB-I-S': '160',
    'UPBD-F-S': '160',
    'BDMB-Q-S': '161',
    'UPBD-N-S': '161',
    'BDMB-K-S': '405',
    'UPBD-H-S': '405',
    'BDMB-S-S': '800',
    'UPBD-P-S': '800',
    'BDMB-L-S': '810',
    'UPBD-I-S': '810',
    'BDMB-M-S': '1625',
    'UPBD-J-S': '1625',
    'UPBD-7-S': '2000',
  };

  const upper = voucherText.toUpperCase();
  for (const [prefix, amountKey] of Object.entries(SERIAL_PREFIX_MAP)) {
    if (upper.includes(prefix)) {
      const mappedValue = UNIPIN_DIAMOND_MAP[amountKey];
      const diamondLabel = typeof mappedValue === 'number' ? `${mappedValue} Diamonds` : String(mappedValue);
      const diamonds = typeof mappedValue === 'number' ? mappedValue : (parseInt(mappedValue, 10) || 0);

      return {
        code: amountKey,
        matchedPattern: prefix,
        diamondLabel,
        rawAmountKey: amountKey,
        diamonds,
      };
    }
  }

  return null;
}
