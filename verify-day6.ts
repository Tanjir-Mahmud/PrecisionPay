
// Verification for Day 6 is unique: We cannot easily script "Login" in Node without admin SDK or emulators.
// We will verify that the files exist and the Context is exported correctly.

import Layout from "./src/app/layout";
import { AuthProvider } from "./src/context/AuthContext";
import SidebarWrapper from "./src/components/SidebarWrapper";

async function verifyDay6() {
    console.log("=== Verifying Day 6 Auth Module ===");

    if (AuthProvider && SidebarWrapper) {
        console.log("✅ Auth Components Exported Successfully");
    } else {
        console.error("❌ Auth Components Missing");
    }

    // Check File Structure
    const fs = require('fs');
    const files = [
        "src/app/login/page.tsx",
        "src/app/signup/page.tsx",
        "src/context/AuthContext.tsx",
        "src/components/SidebarWrapper.tsx"
    ];

    files.forEach(f => {
        if (fs.existsSync(f)) console.log(`✅ Found: ${f}`);
        else console.error(`❌ Missing: ${f}`);
    });

    console.log("⚠️ Manual Test Required: Open Browser to test Login/Signup Flow.");
}

verifyDay6().catch(console.error);
