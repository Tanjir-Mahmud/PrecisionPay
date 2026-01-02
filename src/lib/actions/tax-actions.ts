"use server";

import { prisma } from "@/lib/prisma";
import { getTaxReport, TaxReport } from "@/lib/tax-engine";

export async function calculateTaxDetails(taxableIncome: number): Promise<TaxReport> {
    // 1. Fetch current active country
    const settings = await getSettings();
    // @ts-ignore - 'country' might be missing in type definition if client is old, but 'getSettings' raw query handles it
    const countryCode = settings.country || "USA";

    // 2. Run Engine
    return getTaxReport(taxableIncome, countryCode);
}
