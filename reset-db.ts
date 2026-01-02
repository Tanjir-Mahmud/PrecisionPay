
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, deleteDoc, doc } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: "AIzaSyAKSAtUfYS3_crilgLwHMbW8hg7TnMvv9U",
    authDomain: "precisionpay.firebaseapp.com",
    projectId: "precisionpay",
    storageBucket: "precisionpay.firebasestorage.app",
    messagingSenderId: "229554517164",
    appId: "1:229554517164:web:8eb3c43b4ee0d5417a5b09",
    measurementId: "G-CF5YRRCFKL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearCollections() {
    console.log("⚠️ Starting Database Reset...");

    const collections = [
        "employees",
        "payrollHistory",
        "attendance_logs",
        "payroll_settings"
    ];

    for (const colName of collections) {
        process.stdout.write(`Cleaning '${colName}'... `);
        try {
            const snapshot = await getDocs(collection(db, colName));
            if (snapshot.empty) {
                console.log(`Already empty.`);
                continue;
            }

            const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, colName, d.id)));
            await Promise.all(deletePromises);
            console.log(`Deleted ${snapshot.size} documents.`);
        } catch (e) {
            console.error(`Error cleaning ${colName}:`, e.message);
        }
    }

    console.log("✅ Database successfully cleared.");
}

clearCollections().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
