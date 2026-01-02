"use client";

import { useState, useEffect } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Save, Gavel, Clock, AlertOctagon } from "lucide-react";

export default function PenaltyConfig() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState({
        gracePeriod: "09:30",
        lateThreshold: 3,
        latePenaltyAmount: 50,
        absentDeductionRate: 5 // Percentage
    });

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const docRef = doc(db, "payroll_settings", "default");
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setConfig(snap.data() as any);
                }
            } catch (e) {
                console.error("Config fetch error", e);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, "payroll_settings", "default"), config, { merge: true });
            alert("Penalty Rules Updated Successfully!");
        } catch (e) {
            console.error(e);
            alert("Failed to save rules.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="h-48 glass-card animate-pulse"></div>;

    return (
        <div className="glass-card p-6">
            <div className="flex items-center space-x-3 mb-6 border-b border-white/10 pb-4">
                <div className="p-2 bg-rose-500/10 rounded-lg">
                    <Gavel className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">Penalty & Attendance Rules</h3>
                    <p className="text-xs text-slate-400">Configure global deduction logic (Day 4 Dynamic Engine)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Grace Period */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 flex items-center">
                        <Clock className="w-3 h-3 mr-1" /> Daily Grace Period
                    </label>
                    <input
                        type="time"
                        value={config.gracePeriod}
                        onChange={(e) => setConfig({ ...config, gracePeriod: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>

                {/* Late Threshold */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">Late Threshold (Days/Month)</label>
                    <input
                        type="number"
                        value={config.lateThreshold}
                        onChange={(e) => setConfig({ ...config, lateThreshold: parseInt(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>

                {/* Penalty Amount */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 flex items-center">
                        <AlertOctagon className="w-3 h-3 mr-1" /> Late Penalty Amount ($)
                    </label>
                    <input
                        type="number"
                        value={config.latePenaltyAmount}
                        onChange={(e) => setConfig({ ...config, latePenaltyAmount: parseFloat(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>

                {/* Absent Rate */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">Absent Deduction Rate (%)</label>
                    <input
                        type="number"
                        value={config.absentDeductionRate}
                        onChange={(e) => setConfig({ ...config, absentDeductionRate: parseFloat(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving Rules..." : "Save Configuration"}
                </button>
            </div>
        </div>
    );
}
