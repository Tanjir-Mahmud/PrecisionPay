"use client";

import {
    CheckCircle,
    AlertTriangle,
    Flag,
    FileDown,
    CheckCheck,
    Info,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { PayrollWithVariance, approvePayroll, flagPayroll, bulkApprove } from "@/lib/actions/payroll-actions";
import { useState, useTransition } from "react";
import clsx from "clsx";
import TaxWaterfall from "./TaxWaterfall";

interface Props {
    initialData: PayrollWithVariance[];
}

export default function PayrollTable({ initialData }: Props) {
    const [isPending, startTransition] = useTransition();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleApprove = (id: string) => {
        startTransition(async () => await approvePayroll(id));
    };

    const handleFlag = (id: string) => {
        startTransition(async () => await flagPayroll(id));
    };

    const handleBulkApprove = () => {
        if (confirm("Are you sure you want to approve all unflagged items?")) {
            startTransition(async () => await bulkApprove());
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const calculateTaxable = (p: PayrollWithVariance) => {
        // Gross Pay
        const gross = p.basePay + p.hra + p.transport + p.overtimePay + p.bonus;
        // Non-Tax Deductions (PF, Leave) - Tax is the result, not deduction here
        // We pass the "Taxable Income" to the engine to reproduce the calc
        return Math.max(0, gross - p.pf - p.leaveDeduction);
    };

    const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

    return (
        <div className="space-y-4">
            <div className="flex justify-end space-x-3">
                <button className="flex items-center px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition">
                    <FileDown className="w-4 h-4 mr-2" />
                    Export Bank File
                </button>
                <button
                    onClick={handleBulkApprove}
                    disabled={isPending}
                    className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                >
                    <CheckCheck className="w-4 h-4 mr-2" />
                    Approve All
                </button>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                <table className="min-w-full divide-y divide-slate-800">
                    <thead className="bg-slate-950">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Employee</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Dept</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Pay</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Tax & Ded.</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Pay</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Variance</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                        {initialData.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                    All payrolls for this month are approved or none exist.
                                </td>
                            </tr>
                        )}
                        {initialData.map((run) => {
                            const highVariance = Math.abs(run.variancePct) > 15;
                            const isExpanded = expandedId === run.id;

                            return (
                                <>
                                <tr key={run.id} className={clsx("transition-colors", run.flaggedForReview ? "bg-rose-950/20" : "hover:bg-slate-800/50")}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="ml-0">
                                                <div className="text-sm font-medium text-white">{run.employeeName}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-400">{run.department}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-300 font-mono">
                                        {fmt(run.basePay + run.hra + run.transport + run.overtimePay + run.bonus)}
                                        <div className="text-[10px] text-slate-500">Base: {run.basePay}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <span className="text-sm text-rose-300 font-mono">
                                                {fmt(run.tax + run.pf + run.leaveDeduction)}
                                            </span>
                                            <button 
                                                onClick={() => toggleExpand(run.id)}
                                                className="text-slate-500 hover:text-indigo-400 focus:outline-none"
                                                title="View Breakdown"
                                            >
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <div className="text-[10px] text-slate-500">Tax: {run.tax} | PF: {run.pf}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="text-sm font-bold text-white font-mono">{fmt(run.netPay)}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        {run.variancePct !== 0 && (
                                            <span className={clsx(
                                                "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                                                highVariance ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "text-slate-400"
                                            )}>
                                                {highVariance && <AlertTriangle className="w-3 h-3 mr-1" />}
                                                {run.variancePct > 0 ? "+" : ""}{run.variancePct}%
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button
                                            onClick={() => handleFlag(run.id)}
                                            disabled={isPending}
                                            className={clsx("p-1.5 rounded-md transition", run.flaggedForReview ? "bg-rose-500 text-white" : "text-slate-400 hover:bg-slate-700")}
                                            title="Flag for Review"
                                        >
                                            <Flag className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleApprove(run.id)}
                                            disabled={isPending || run.flaggedForReview}
                                            className="p-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Approve"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                                {isExpanded && (
                                    <tr className="bg-slate-950/50">
                                        <td colSpan={7} className="px-6 py-4 shadow-inner">
                                            <div className="max-w-md mx-auto">
                                                <TaxWaterfall taxableIncome={calculateTaxable(run)} />
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                </>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
