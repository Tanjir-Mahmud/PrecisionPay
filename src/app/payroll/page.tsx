"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    Calculator,
    History,
    CheckCircle2 // Audit Icon
} from "lucide-react";
import PayrollTable from "@/components/payroll/PayrollTable";
import { getPendingPayrolls, PayrollWithVariance } from "@/lib/actions/payroll-actions";
import RunPayrollButton from "@/components/payroll/RunPayrollButton";

export default function PayrollPage() {
    const { user, loading } = useAuth();
    const [pendingData, setPendingData] = useState<PayrollWithVariance[]>([]);
    const [isFetching, setIsFetching] = useState(true);

    useEffect(() => {
        if (!user) {
            if (!loading) setIsFetching(false);
            return;
        }

        getPendingPayrolls(user.uid).then((data) => {
            setPendingData(data);
            setIsFetching(false);
        });
    }, [user, loading]);

    if (loading || isFetching) {
        return <div className="p-8 text-center text-slate-400">Loading payroll data...</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100">Pending Payroll Review</h2>
                    <p className="text-slate-400">Review, flag, and approve employee salaries before payout.</p>
                </div>
                <RunPayrollButton />
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="glass-card p-0 overflow-hidden">
                    <PayrollTable initialData={pendingData} />
                </div>
            </div>

            {/* Info / Legend */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-400">
                <div className="glass-card p-4 flex items-center">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 mr-3" />
                    <span>Approved: Ready for Bank Transfer</span>
                </div>
                <div className="glass-card p-4 flex items-center">
                    <div className="w-3 h-3 rounded-full bg-rose-500 mr-3" />
                    <span>Flagged: Needs Manual Adjustment</span>
                </div>
                <div className="glass-card p-4 flex items-center">
                    <div className="w-3 h-3 rounded-full bg-amber-500 mr-3" />
                    <span>Variance: &gt;15% Change detected</span>
                </div>
            </div>
        </div>
    );
}
