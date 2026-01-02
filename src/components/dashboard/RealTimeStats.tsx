"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { StatsCard } from "./Widgets";
import { Banknote, Scale, FileText } from "lucide-react";
import { getTaxReport } from "@/lib/tax-engine";

export default function RealTimeStats() {
    const [stats, setStats] = useState({
        totalPayout: 0,
        taxLiabilities: 0,
        employeesCount: 0
    });
    const [loading, setLoading] = useState(true);

    const { user } = useAuth(); // Auth Context

    useEffect(() => {
        if (!user) return; // Wait for user

        // Real-time Listener Scoped by Admin
        const q = query(collection(db, "employees"), where("adminId", "==", user.uid));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let totalPay = 0;
            let totalTax = 0;
            let count = 0;

            snapshot.forEach((doc) => {
                const data = doc.data();
                const salary = Number(data.baseSalary) || 0;

                // Use Strategy Engine for Logic
                const taxReport = getTaxReport(salary, "USA"); // Defaulting to USA for this view as per prompt simplicity, or could fetch global setting

                totalPay += salary;
                totalTax += taxReport.totalTax;
                count++;
            });

            setStats({
                totalPayout: totalPay,
                taxLiabilities: totalTax,
                employeesCount: count
            });
            setLoading(false);
        }, (error) => {
            console.error("Firebase Snapshot Error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Format currency
    const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                <div className="h-40 bg-slate-800/50 rounded-xl"></div>
                <div className="h-40 bg-slate-800/50 rounded-xl"></div>
                <div className="h-40 bg-slate-800/50 rounded-xl"></div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatsCard
                title="Total Company Payout (Real-Time)"
                value={fmt(stats.totalPayout)}
                subtext="Live from Firebase"
                isPositive={true}
                icon={<Banknote className="w-5 h-5 text-amber-400" />}
            />
            <StatsCard
                title="Monthly Tax Liabilities"
                value={fmt(stats.taxLiabilities)}
                icon={<Scale className="w-5 h-5 text-indigo-400" />}
            />
            <StatsCard
                title="Total Employees"
                value={stats.employeesCount.toString()}
                subtext="Active in Firestore"
                icon={<FileText className="w-5 h-5 text-emerald-400" />}
            />
        </div>
    );
}
