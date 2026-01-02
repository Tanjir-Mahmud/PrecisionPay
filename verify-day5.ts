
import { getAnalyticsData } from "./src/lib/analytics-engine";
import { generatePDF } from "./src/lib/export-utils";

// Mock window for client-side libs if needed, or stick to Node compatible checks
// jsPDF usually requires window or specific node configuration.
// We will test the Logic Engine mainly.

async function verifyDay5() {
    console.log("=== Verifying Day 5 Analytics Engine ===");

    try {
        const data = await getAnalyticsData("USA");
        console.log("✅ Analytics Data Fetched");
        console.log("   - Variance Status:", data.variance.status);
        console.log("   - ROI Records:", data.roi.length);
        console.log("   - YTD Tax:", data.ytdTax.totalLiabilities);
        console.log("   - Trend Data Points:", data.trend.length);

        if (data.trend.length === 6) {
            console.log("✅ Trend Data Verified (6 Months)");
        } else {
            console.log("⚠️ Trend Data Length Mismatch:", data.trend.length);
        }

        // Test Export Logic (Internal Check)
        if (generatePDF) console.log("✅ Export Utilities Loaded");

    } catch (e) {
        console.error("❌ Verification Failed", e);
    }
}

verifyDay5();
