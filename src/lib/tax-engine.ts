export interface TaxBracket {
    limit: number;
    rate: number;
}

export interface TaxBreakdownItem {
    slab: string;
    taxableAmount: number;
    rate: number;
    tax: number;
}

export interface TaxReport {
    totalTax: number;
    effectiveRate: number;
    marginalSlab: number;
    breakdown: TaxBreakdownItem[];
    currency: string;
}

export interface CountryConfig {
    code: string;
    name: string;
    currency: string;
    brackets: TaxBracket[];
    standardDeduction: number;
}

export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
    USA: {
        code: "USA",
        name: "United States",
        currency: "$",
        standardDeduction: 0, // Prompt implies gross slab logic, keeping 0 to respect prompt limits directly
        brackets: [
            { limit: 11000, rate: 0.10 },
            { limit: 44000, rate: 0.12 },
            { limit: 95000, rate: 0.22 },
            { limit: Infinity, rate: 0.24 } // Fallback for higher
        ]
    },
    UK: {
        code: "UK",
        name: "United Kingdom",
        currency: "£",
        standardDeduction: 0,
        brackets: [
            { limit: 12500, rate: 0.00 },
            { limit: 50000, rate: 0.20 },
            { limit: 125000, rate: 0.40 },
            { limit: Infinity, rate: 0.45 }
        ]
    },
    DE: {
        code: "DE",
        name: "Germany",
        currency: "€",
        standardDeduction: 0,
        brackets: [
            { limit: 11604, rate: 0.00 },
            { limit: 60000, rate: 0.14 }, // Starting from 14%
            { limit: Infinity, rate: 0.42 }
        ]
    },
    BD: {
        code: "BD",
        name: "Bangladesh",
        currency: "৳",
        standardDeduction: 0,
        brackets: [
            { limit: 350000, rate: 0.00 },
            { limit: 450000, rate: 0.05 },
            { limit: 750000, rate: 0.10 },
            { limit: Infinity, rate: 0.15 }
        ]
    },
    IN: {
        code: "IN",
        name: "India",
        currency: "₹",
        standardDeduction: 0,
        brackets: [
            { limit: 300000, rate: 0.00 },
            { limit: 600000, rate: 0.05 },
            { limit: 900000, rate: 0.10 },
            { limit: Infinity, rate: 0.30 }
        ]
    },
    PK: {
        code: "PK",
        name: "Pakistan",
        currency: "₨",
        standardDeduction: 0,
        brackets: [
            { limit: 600000, rate: 0.00 },
            { limit: 1200000, rate: 0.025 },
            { limit: 2400000, rate: 0.125 },
            { limit: Infinity, rate: 0.20 }
        ]
    },
    PH: {
        code: "PH",
        name: "Philippines",
        currency: "₱",
        standardDeduction: 0,
        brackets: [
            { limit: 250000, rate: 0.00 },
            { limit: 400000, rate: 0.15 },
            { limit: 800000, rate: 0.20 },
            { limit: Infinity, rate: 0.30 }
        ]
    },
    NP: {
        code: "NP",
        name: "Nepal",
        currency: "N₨",
        standardDeduction: 0,
        brackets: [
            { limit: 500000, rate: 0.01 },
            { limit: 700000, rate: 0.10 },
            { limit: Infinity, rate: 0.20 }
        ]
    },
    CN: {
        code: "CN",
        name: "China",
        currency: "¥",
        standardDeduction: 0,
        brackets: [
            { limit: 36000, rate: 0.03 },
            { limit: 144000, rate: 0.10 },
            { limit: 300000, rate: 0.20 },
            { limit: Infinity, rate: 0.45 }
        ]
    },
    ES: {
        code: "ES",
        name: "Spain",
        currency: "€",
        standardDeduction: 0,
        brackets: [
            { limit: 12450, rate: 0.19 },
            { limit: 20200, rate: 0.24 },
            { limit: 35200, rate: 0.30 },
            { limit: 60000, rate: 0.37 },
            { limit: Infinity, rate: 0.45 }
        ]
    }
};

function infinityLimit() { return Infinity; }

export function getTaxReport(income: number, countryCode: string = "USA"): TaxReport {
    const config = COUNTRY_CONFIGS[countryCode] || COUNTRY_CONFIGS["USA"];

    // 1. Apply Standard Deduction
    const taxableIncome = Math.max(0, income - config.standardDeduction);

    let tax = 0;
    let previousLimit = 0;
    const breakdown: TaxBreakdownItem[] = [];
    let marginalSlab = 0;

    // 2. Iterate Brackets (Progressive)
    for (const bracket of config.brackets) {
        if (taxableIncome > previousLimit) {
            const slabIncome = Math.min(taxableIncome, bracket.limit) - previousLimit;
            const slabTax = slabIncome * bracket.rate;

            tax += slabTax;
            marginalSlab = bracket.rate * 100;

            breakdown.push({
                slab: `${config.currency}${previousLimit} - ${bracket.limit === Infinity ? 'Above' : bracket.limit}`,
                taxableAmount: parseFloat(slabIncome.toFixed(2)),
                rate: bracket.rate * 100,
                tax: parseFloat(slabTax.toFixed(2))
            });

            previousLimit = bracket.limit;
        } else {
            break;
        }
    }

    return {
        totalTax: parseFloat(tax.toFixed(2)),
        effectiveRate: income > 0 ? parseFloat(((tax / income) * 100).toFixed(2)) : 0,
        marginalSlab,
        breakdown,
        currency: config.currency
    };
}
