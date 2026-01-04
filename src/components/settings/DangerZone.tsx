"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { resetPrismaData } from "@/lib/actions/settings-actions";


export default function DangerZone() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleReset = async () => {
        if (!user) return;

        const confirmed = confirm("⚠️ DANGER: This will PERMANENTLY DELETE all your employees, attendance logs, and payroll history.\n\nType 'DELETE' to confirm.");

        // Simple confirmation for now (or prompt input)
        if (!confirmed) return;

        // Extra safety check for input if native prompt used (browser native prompt not always great UI, but standard Confirm is basically boolean).
        // Let's stick to boolean Confirm for simplicity in Day 6.
        // Actually, prompt text input is safer. 
        const text = prompt("Type 'DELETE' to confirm permanent data wipe:");
        if (text !== "DELETE") return alert("Deletion Cancelled.");

        setLoading(true);

        try {
            const batch = writeBatch(db);
            let count = 0;

            // 1. Delete Employees
            const empQ = query(collection(db, "employees"), where("adminId", "==", user.uid));
            const empSnap = await getDocs(empQ);
            empSnap.forEach((d) => {
                batch.delete(d.ref);
                count++;
            });

            // 2. Delete Logs
            const logQ = query(collection(db, "attendance_logs"), where("adminId", "==", user.uid));
            const logSnap = await getDocs(logQ);
            logSnap.forEach((d) => {
                batch.delete(d.ref);
                count++;
            });

            // 3. Delete Payroll History
            const payQ = query(collection(db, "payrollHistory"), where("adminId", "==", user.uid));
            const paySnap = await getDocs(payQ);
            paySnap.forEach((d) => {
                batch.delete(d.ref);
                count++;
            });

            if (count > 0) {
                await batch.commit();
            }

            // 4. Wipe Local SQL Data (Prisma)
            const token = await user.getIdToken();
            await resetPrismaData(token);

            alert(`Successfully deleted ${count} remote records and all local SQL data.`);
            window.location.reload();

        } catch (e: any) {
            console.error("Wipe Error:", e);
            alert("Failed to wipe data: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card p-6 border border-rose-500/30">
            <h3 className="text-lg font-semibold text-rose-400 flex items-center mb-4">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Danger Zone
            </h3>

            <p className="text-slate-400 text-sm mb-6">
                Irreversible actions. Use with caution.
            </p>

            <button
                onClick={handleReset}
                disabled={loading}
                className="flex items-center justify-center w-full md:w-auto px-4 py-2 bg-rose-900/20 hover:bg-rose-900/40 border border-rose-800 text-rose-200 rounded-lg transition-all"
            >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete All Data
            </button>


        </div>
    );
}
