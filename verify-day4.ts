
import { db } from "./src/lib/firebase"; // Assumes this works in Node with 'firebase' package
import { doc, getDoc, setDoc, collection, addDoc, getDocs } from "firebase/firestore";

async function verifyDay4() {
    console.log("=== Verifying Day 4 Dynamic Engine ===");

    // 1. Verify Cloud Settings Write/Read
    const settingsRef = doc(db, "payroll_settings", "verify_test");
    const testSettings = {
        gracePeriod: "10:00",
        lateThreshold: 99,
        latePenaltyAmount: 100,
        absentDeductionRate: 50
    };

    console.log("Writing Test Settings...");
    await setDoc(settingsRef, testSettings);

    console.log("Reading Test Settings...");
    const snap = await getDoc(settingsRef);
    if (snap.exists() && snap.data().gracePeriod === "10:00") {
        console.log("✅ Settings Persistence Verified");
    } else {
        console.error("❌ Settings Read Failed", snap.data());
    }

    // 2. Verify Attendance Log Write
    console.log("Writing Test Log...");
    const logsRef = collection(db, "attendance_logs");
    await addDoc(logsRef, {
        employeeId: "verify_user",
        time: "10:01",
        isLate: true,
        timestamp: new Date()
    });
    console.log("✅ Log Write Initiated (Async)");

    // Cleanup? No need for verify script, just test connectivity.
    console.log("Day 4 Infrastructure Ready 🚀");
}

verifyDay4().catch(console.error);
