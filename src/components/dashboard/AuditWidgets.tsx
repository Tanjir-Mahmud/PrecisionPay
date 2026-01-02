"use client";

import { useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { AlertTriangle, ShieldCheck, Banknote, Globe } from "lucide-react";

// 1. Global Compliance Badge
export function ComplianceBadge({ country, year, currency }: { country: string, year: string, currency: string }) {
    return (
        <div className="flex items-center space-x-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-indigo-500/30">
            <Globe className="w-3 h-3 text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-300 tracking-wide uppercase">
                {country} Region • {year} • {currency} Base
            </span>
        </div>
    );
}

// 2. Pro Audit Summary Card
export function AuditSummary({ summary }: { summary: { taxMisses: number, salaryAnomalies: number, attendanceAlerts: number } }) {
    const hasIssues = summary.taxMisses > 0 || summary.salaryAnomalies > 0 || summary.attendanceAlerts > 0;
    const [showRisks, setShowRisks] = useState(false);
    const [riskList, setRiskList] = useState<any[]>([]);
    const [loadingRisks, setLoadingRisks] = useState(false);
    const { user } = useAuth();

    const handleFetchRisks = async () => {
        if (showRisks) {
            setShowRisks(false);
            return;
        }

        setShowRisks(true);
        if (riskList.length > 0) return; // Cached

        setLoadingRisks(true);
        try {
            // Fetch directly from server (Prisma)
            const { getRiskDetails } = await import("@/lib/actions/dashboard-actions");
            const risks = await getRiskDetails();
            setRiskList(risks);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingRisks(false);
        }
    };

    return (
        <div className="glass-card p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <ShieldCheck className="w-24 h-24 text-indigo-400" />
            </div>

            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <ShieldCheck className="w-5 h-5 mr-2 text-indigo-400" />
                Audit & Compliance Log
            </h3>

            {/* Risk Detail Modal / List Overlay */}
            {showRisks && (
                <div className="absolute inset-0 bg-slate-900/95 z-20 p-4 overflow-y-auto animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-orange-500/30">
                        <h4 className="text-sm font-bold text-orange-400">High Risk Employees</h4>
                        <button onClick={() => setShowRisks(false)} className="text-xs text-slate-400 hover:text-white">Close</button>
                    </div>
                    {loadingRisks ? <div className="text-xs text-slate-500">Scanning logs...</div> : (
                        <ul className="space-y-2">
                            {riskList.length === 0 ? <li className="text-xs text-slate-500">No high risks found.</li> :
                                riskList.map((r, i) => (
                                    <li key={i} className={`flex justify-between text-xs p-2 rounded border mb-1 ${r.count >= 3
                                        ? "bg-orange-950/30 border-orange-500/30 text-orange-200"
                                        : "bg-amber-950/20 border-amber-500/20 text-amber-200"
                                        }`}>
                                        <span>{r.name}</span>
                                        <span className="font-mono font-bold">
                                            {r.count} {r.count === 1 ? "Day" : "Days"} Late
                                        </span>
                                    </li>
                                ))
                            }
                        </ul>
                    )}
                </div>
            )}

            {!hasIssues ? (
                <div className="text-center py-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 mb-2">
                        <ShieldCheck className="w-6 h-6 text-emerald-400" />
                    </div>
                    <p className="text-emerald-300 font-medium">All Systems Nominal</p>
                    <p className="text-xs text-slate-500">No anomalies detected in current run.</p>
                </div>
            ) : (
                <div className="space-y-3 relative z-10">
                    {summary.taxMisses > 0 && (
                        <div className="flex items-center justify-between p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                            <div className="flex items-center text-rose-300 text-sm">
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Tax Discrepancies
                            </div>
                            <span className="text-xs font-bold bg-rose-500/20 px-2 py-0.5 rounded text-rose-200">{summary.taxMisses}</span>
                        </div>
                    )}
                    {summary.salaryAnomalies > 0 && (
                        <div className="flex items-center justify-between p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <div className="flex items-center text-amber-300 text-sm">
                                <Banknote className="w-4 h-4 mr-2" />
                                Salary Anomalies
                            </div>
                            <span className="text-xs font-bold bg-amber-500/20 px-2 py-0.5 rounded text-amber-200">{summary.salaryAnomalies}</span>
                        </div>
                    )}
                    {summary.attendanceAlerts > 0 && (
                        <div
                            onClick={handleFetchRisks}
                            className="flex items-center justify-between p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg cursor-pointer hover:bg-orange-500/20 transition-colors"
                        >
                            <div className="flex items-center text-orange-300 text-sm">
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Attendance Risks
                            </div>
                            <span className="text-xs font-bold bg-orange-500/20 px-2 py-0.5 rounded text-orange-200">{summary.attendanceAlerts}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// 3. Expense Breakdown Donut (Pure SVG)
export function ExpenseDonut({ expenses }: { expenses: { netSalaries: number, taxes: number, benefits: number, bonuses: number } }) {
    const total = expenses.netSalaries + expenses.taxes + expenses.benefits + expenses.bonuses;
    if (total === 0) return (
        <div className="glass-card p-6 flex flex-col justify-center items-center text-slate-500 text-sm h-full">
            No expense data available.
        </div>
    );

    // Calculate segments
    const data = [
        { label: "Net Pay", value: expenses.netSalaries, color: "#10b981" }, // Emerald
        { label: "Taxes", value: expenses.taxes, color: "#6366f1" },       // Indigo
        { label: "Benefits", value: expenses.benefits, color: "#f59e0b" }, // Amber
        { label: "Bonus", value: expenses.bonuses, color: "#ec4899" }      // Pink
    ];

    let cumulativePercent = 0;

    function getCoordinatesForPercent(percent: number) {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    }

    return (
        <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Fund Distribution</h3>
            <div className="flex items-center justify-between">
                <div className="relative w-32 h-32">
                    <svg viewBox="-1 -1 2 2" className="transform -rotate-90 w-full h-full">
                        {data.map((slice, i) => {
                            const start = cumulativePercent;
                            const slicePercent = slice.value / total;
                            cumulativePercent += slicePercent;
                            const end = cumulativePercent;

                            // If single slice is 100%, draw full circle
                            if (slicePercent === 1) {
                                return <circle key={i} cx="0" cy="0" r="0.8" fill="transparent" stroke={slice.color} strokeWidth="0.4" />;
                            }

                            const [startX, startY] = getCoordinatesForPercent(start);
                            const [endX, endY] = getCoordinatesForPercent(end);
                            const largeArcFlag = slicePercent > 0.5 ? 1 : 0;

                            const pathData = [
                                `M ${startX} ${startY}`,    // Move
                                `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, // Arc
                                `L 0 0`, // Line to center
                            ].join(' ');

                            return (
                                <path key={i} d={pathData} fill={slice.color} className="hover:opacity-80 transition-opacity" />
                            );
                        })}
                        {/* Cutout for Donut */}
                        <circle cx="0" cy="0" r="0.6" fill="#0f172a" />
                    </svg>
                </div>
                <div className="space-y-2 text-xs">
                    {data.map((item, i) => (
                        <div key={i} className="flex items-center">
                            <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                            <span className="text-slate-400 w-16">{item.label}</span>
                            <span className="text-white font-mono">{((item.value / total) * 100).toFixed(0)}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// 4. Simulation Trigger

