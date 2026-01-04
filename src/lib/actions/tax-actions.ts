"use server";

import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/actions/settings-actions";
import { getTaxReport, TaxReport } from "@/lib/tax-engine";

export async function calculateTaxDetails(idToken: string, taxableIncome: number): Promise<TaxReport> {
    // 1. Fetch current active country
    const { data: settings } = await getSettings(idToken);

    // Default to USA if unauthorized or missing
    const countryCode = settings?.country || "USA";

    // 2. Run Engine
    return getTaxReport(taxableIncome, countryCode);
}
