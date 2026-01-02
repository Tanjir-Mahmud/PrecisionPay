"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, getDoc, doc, serverTimestamp, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getTaxReport } from "@/lib/tax-engine";
import { CheckCircle2, AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface PayrollRow {
    id: string; // Firestore Doc ID
    employeeId: string; // Same as ID in this simple schema
    name: string;
    role: string;
    baseSalary: number;
    attendanceStatus: string; // "Present", "Absent 3d", "Late 5x"
    performanceScore?: number;
    bonus?: number;
    grossPay: number;
    tax: number;
    penalty: number;
    netPay: number;
    status: string; // "Draft", "Paid"
}

export default function FirebasePayrollTable() {
    const [rows, setRows] = useState<PayrollRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [country, setCountry] = useState("USA");
    const [approving, setApproving] = useState(false);
    const { user } = useAuth();

    // 1. Listen to Employees (Scoped)
    const [bonusConfig, setBonusConfig] = useState({ threshold: 101, rate: 0 }); // Default off

    useEffect(() => {
        if (!user) return;

        // Fetch Settings
        const fetchSettings = async () => {
            try {
                const settingsSnap = await getDoc(doc(db, "payroll_settings", user.uid));
                if (settingsSnap.exists()) {
                    const d = settingsSnap.data();
                    setCountry(d.country || "USA");
                    setBonusConfig({
                        threshold: d.bonusThreshold ?? 101, // Default > 100 impossible
                        rate: d.bonusRate ?? 0
                    });
                }
            } catch (e) {
                console.error("Settings fetch error:", e);
            }
        };
        fetchSettings();

        const q = query(collection(db, "employees"), where("adminId", "==", user.uid));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const employees: any[] = [];
            snapshot.forEach((doc) => employees.push({ id: doc.id, ...doc.data() }));

            // Filter Active & Calculate Draft Payroll
            const activeEmployees = employees.filter(e => e.status === "Active" || !e.status);

            // Dynamic Engine Calculation (Async)
            const { calculateEmployeeDeductions } = await import("@/lib/dynamic-deductions");

            const draftPromises = activeEmployees.map(async (data) => {
                const base = Number(data.baseSalary) || 0;

                // Bonus Logic
                const score = data.performanceScore || 50; // Default 50 if missing
                let bonusAmount = 0;
                if (score >= bonusConfig.threshold) {
                    bonusAmount = base * (bonusConfig.rate / 100);
                }

                const gross = base + bonusAmount;

                // Tax Calculation (Engine)
                const taxReport = getTaxReport(gross, data.country || country); // Tax on Gross (including bonus)

                // Deductions
                const deductionResult = await calculateEmployeeDeductions(
                    data.id || data.employeeId,
                    base, // Deductions on base usually? Or Gross? Let's stay on base for penalties to be fair.
                    data.attendanceStatus || "Present",
                    user.uid
                );

                return {
                    id: data.id,
                    employeeId: data.id,
                    name: `${data.firstName} ${data.lastName}`,
                    role: data.designation,
                    baseSalary: base,
                    attendanceStatus: data.attendanceStatus || "Present",
                    performanceScore: score,
                    bonus: bonusAmount,
                    grossPay: gross,
                    tax: taxReport.totalTax,
                    penalty: deductionResult.totalDeduction,
                    netPay: gross - taxReport.totalTax - deductionResult.totalDeduction,
                    status: "Draft"
                };
            });

            const resolvedRows = await Promise.all(draftPromises);
            setRows(resolvedRows);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [country, user, bonusConfig.threshold]); // Re-run if config changes (though fetch is inside... standard React effect dependency fix needed maybe?)
    // Actually, extracting fetchSettings outside or using a separate effect for settings is cleaner to avoid loops.
    // For now, let's keep it simple: fetch once. If user updates settings, they reload page or we subscribe to settings too. 
    // Let's settle for fetch once on mount.

    // 2. Approve Action
    const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());

    const handleApproveAll = async () => {
        if (!confirm("Confirm Payroll for all active employees?")) return;
        setApproving(true);
        try {
            const batchPromises = rows.filter(r => !approvedIds.has(r.id)).map(async (row) => {
                await addDoc(collection(db, "payrollHistory"), {
                    ...row,
                    approvedAt: serverTimestamp(),
                    status: "Paid"
                });
            });
            await Promise.all(batchPromises);
            // Mark all as approved
            const allIds = new Set(approvedIds);
            rows.forEach(r => allIds.add(r.id));
            setApprovedIds(allIds);

            alert("Payroll Processed Successfully! Archives saved.");
        } catch (e) {
            console.error(e);
            alert("Approval Failed.");
        } finally {
            setApproving(false);
        }
    };

    const handleApproveSingle = async (row: PayrollRow) => {
        setApproving(true); // Re-using global loading or specific? Let's generic for now or just trust quick firestore.
        try {
            await addDoc(collection(db, "payrollHistory"), {
                ...row,
                approvedAt: serverTimestamp(),
                status: "Paid"
            });
            setApprovedIds(prev => new Set(prev).add(row.id));
        } catch (e) {
            console.error(e);
            alert("Approval Failed");
        } finally {
            setApproving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500"><Loader2 className="animate-spin w-8 h-8 mx-auto mb-2" />Loading Engine...</div>;

    return (
        <div className="glass-card overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-800">
                <div>
                    <h3 className="text-lg font-semibold text-white">Current Month Drafts (Real-Time)</h3>
                    <p className="text-xs text-slate-500">Live from Firestore • {country} Tax Rules Applied</p>
                </div>
                <button
                    onClick={handleApproveAll}
                    disabled={approving || rows.length === 0}
                    className="flex items-center bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    {approving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Approve All
                </button>
            </div>

            <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-950">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Employee</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Gross Pay</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Tax</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-rose-400 uppercase">Penalty</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-emerald-400 uppercase">Net Pay</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                    {rows.map((row) => {
                        const isApproved = approvedIds.has(row.id);
                        return (
                            <tr key={row.id} className="hover:bg-slate-800/30">
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-white">{row.name}</div>
                                    <div className="text-xs text-slate-500">{row.role}</div>
                                    {row.attendanceStatus !== "Present" && (
                                        <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded mt-1 inline-flex items-center">
                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                            {row.attendanceStatus}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right text-sm text-slate-300 font-mono">
                                    ${row.grossPay.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-right text-sm text-slate-300 font-mono">
                                    ${row.tax.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-right text-sm text-rose-400 font-mono">
                                    {row.penalty > 0 ? `-$${row.penalty.toLocaleString()}` : '-'}
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-bold text-emerald-400 font-mono">
                                    ${row.netPay.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {isApproved ? (
                                        <span className="text-xs text-emerald-400 flex items-center justify-end">
                                            <CheckCircle2 className="w-4 h-4 mr-1" /> Paid
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => handleApproveSingle(row)}
                                            className="text-xs bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 px-3 py-1.5 rounded transition"
                                        >
                                            Approve
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">
                                No active employees found for payroll generation.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
