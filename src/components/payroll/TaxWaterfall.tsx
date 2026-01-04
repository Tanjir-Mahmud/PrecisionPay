"use client";

import { useState, useEffect } from "react";
import { Info, Loader2 } from "lucide-react";
import { TaxReport } from "@/lib/tax-engine";
import { calculateTaxDetails } from "@/lib/actions/tax-actions";
import { useAuth } from "@/context/AuthContext";

export default function TaxWaterfall({ taxableIncome }: { taxableIncome: number }) {
    const { user } = useAuth();
    const [report, setReport] = useState<TaxReport | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        let mounted = true;
        setLoading(true);

        user.getIdToken().then(token => {
            calculateTaxDetails(token, taxableIncome).then(data => {
                if (mounted) {
                    setReport(data);
                    setLoading(false);
                }
            });
        });

        return () => { mounted = false; };
    }, [taxableIncome, user]);

    if (loading) return <div className="flex items-center text-slate-400 text-sm"><Loader2 className="w-3 h-3 animate-spin mr-2" /> Calculating Tax...</div>;
    if (!report) return null;

    return (
        <div className="mt-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
            <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>Tax Logic ({report.currency})</span>
                <span className="text-emerald-400">{report.effectiveRate}% Effective</span>
            </h4>

            <div className="space-y-1">
                {report.breakdown.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                        <span className="text-slate-500">
                            Layer {i + 1} ({item.rate}% on {item.taxableAmount})
                        </span>
                        <span className="text-slate-200 font-mono">
                            {item.tax.toFixed(2)}
                        </span>
                    </div>
                ))}
                <div className="pt-2 mt-1 border-t border-slate-700/30 flex justify-between text-xs font-bold text-slate-100">
                    <span>Total Tax</span>
                    <span>{report.totalTax.toFixed(2)}</span>
                </div>
            </div>

            <div className="mt-2 text-[10px] text-slate-600 flex items-center">
                <Info className="w-3 h-3 mr-1" />
                Marginal Rate: {report.marginalSlab}%
            </div>
        </div>
    );
}
