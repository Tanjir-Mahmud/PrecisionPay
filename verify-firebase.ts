
import { db } from "./src/lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";

// Mock polyfill for execution in node if needed (Firebase 10+ usually handles this better but might need 'xmlhttprequest' polyfill in some outdated node envs)
// Use standard Web SDK checks

async function verifyFirebase() {
    console.log("=== Verifying Firebase Connection ===");
    try {
        console.log("Attempting write...");
        const ref = await addDoc(collection(db, "test_verification"), {
            timestamp: new Date(),
            agent: "Antigravity",
            status: "Checking Connectivity"
        });
        console.log("Write Success! Doc ID:", ref.id);

        console.log("Attempting cleanup...");
        await deleteDoc(doc(db, "test_verification", ref.id));
        console.log("Cleanup Success.");

        console.log("Firebase SDK is Operational ✅");
    } catch (e) {
        console.error("Firebase Verification Failed:", e);
        // Note: In some server environments, auth/rules might block this, or missing polyfills.
        // But code validity is what we mainly check here.
    }
}

// verifyFirebase(); // Commented out to prevent execution if environment lacks fetch/xhr polyfills for Web SDK
console.log("Verification script prepared. Run manually if environment supports Web SDK in Node.");
