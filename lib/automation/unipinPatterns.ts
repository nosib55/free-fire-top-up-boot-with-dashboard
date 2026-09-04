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

  for (const [amountKey, regexes] of Object.entries(patterns)) {
    for (const regex of regexes) {
      const match = voucherText.match(regex);
      if (match) {
        const mappedValue = UNIPIN_DIAMOND_MAP[amountKey];
        let diamondLabel = 'Unknown Package';

        if (typeof mappedValue === 'number') {
          diamondLabel = `${mappedValue} Diamonds`;
        } else if (typeof mappedValue === 'string') {
          diamondLabel = mappedValue;
        }

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

  return null;
}
