"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Save, Loader2 } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export default function BonusConfig() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Config State
    const [threshold, setThreshold] = useState(90);
    const [rate, setRate] = useState(5.0);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            try {
                const snap = await getDoc(doc(db, "payroll_settings", user.uid));
                if (snap.exists()) {
                    const data = snap.data();
                    if (data.bonusThreshold) setThreshold(data.bonusThreshold);
                    if (data.bonusRate) setRate(data.bonusRate);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save to Firestore for Client UI (Engine)
            await setDoc(doc(db, "payroll_settings", user?.uid || "default"), {
                bonusThreshold: Number(threshold),
                bonusRate: Number(rate)
            }, { merge: true });

            // TODO: Call Server Action to sync to Prisma if needed for server-side payroll
            // For now, client-side payroll engine uses Firestore.

            alert("Bonus Configuration Saved!");
        } catch (e) {
            console.error(e);
            alert("Failed to save.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="animate-pulse h-32 bg-slate-800 rounded-xl"></div>;

    return (
        <div className="glass-card p-6 border border-emerald-500/20">
            <h3 className="text-lg font-semibold text-white flex items-center mb-4">
                <TrendingUp className="w-5 h-5 mr-2 text-emerald-400" />
                Performance Bonus Rules
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm text-slate-400 mb-2">
                        Min. Score to Qualify (0-100)
                    </label>
                    <input
                        type="number"
                        min="0" max="100"
                        value={threshold}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        Employees with performance score ≥ {threshold} will receive a bonus.
                    </p>
                </div>

                <div>
                    <label className="block text-sm text-slate-400 mb-2">
                        Bonus Rate (% of Base Salary)
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            min="0" step="0.5"
                            value={rate}
                            onChange={(e) => setRate(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-emerald-500 focus:outline-none pr-8"
                        />
                        <span className="absolute right-3 top-2 text-slate-500">%</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Example: $5,000 Salary + {rate}% = ${5000 * (1 + rate / 100)}
                    </p>
                </div>
            </div>

            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Rules
                </button>
            </div>
        </div>
    );
}
