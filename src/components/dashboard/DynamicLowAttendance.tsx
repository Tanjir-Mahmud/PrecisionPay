"use client";

import { useEffect, useState } from "react";
import { doc, collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Violation {
    name: string;
    lateCount: number;
    threshold: number;
}

export default function DynamicLowAttendance() {
    const [violations, setViolations] = useState<Violation[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        let unsubscribeSettings: () => void;
        let unsubscribeLogs: () => void;
        let unsubscribeEmployees: () => void;

        const init = async () => {
            // 1. Fetch Rules (Assuming Default or Scoped later)
            unsubscribeSettings = onSnapshot(doc(db, "payroll_settings", "default"), (snap) => {
                const settings = snap.exists() ? snap.data() : { lateThreshold: 3 };
                const threshold = settings.lateThreshold || 3;

                // 2. Fetch Logs Scoped by Admin
                const logQ = query(collection(db, "attendance_logs"), where("adminId", "==", user.uid));
                unsubscribeLogs = onSnapshot(logQ, (logSnap) => {
                    const latesByEmp: Record<string, number> = {};

                    logSnap.forEach(d => {
                        const data = d.data();
                        if (data.isLate) {
                            latesByEmp[data.employeeId] = (latesByEmp[data.employeeId] || 0) + 1;
                        }
                    });

                    // 3. Fetch Employees Scoped by Admin
                    const empQ = query(collection(db, "employees"), where("adminId", "==", user.uid));
                    unsubscribeEmployees = onSnapshot(empQ, (empSnap) => {
                        const newViolations: Violation[] = [];

                        empSnap.forEach(d => {
                            const emp = d.data();
                            const count = latesByEmp[d.id] || 0;

                            // Check Day 2 "Late 5x" string fallback (Legacy support for older data if migrated)
                            let stringCount = 0;
                            if (emp.attendanceStatus?.includes("Late")) {
                                const match = emp.attendanceStatus.match(/(\d+)/);
                                stringCount = match ? parseInt(match[1]) : 1;
                            }

                            const totalLates = Math.max(count, stringCount); // Hybrid Priority

                            if (totalLates >= threshold && emp.status === "Active") {
                                newViolations.push({
                                    name: `${emp.firstName} ${emp.lastName}`,
                                    lateCount: totalLates,
                                    threshold
                                });
                            }
                        });

                        setViolations(newViolations);
                        setLoading(false);
                    });
                });
            });
        };

        init();

        return () => {
            if (unsubscribeSettings) unsubscribeSettings();
            if (unsubscribeLogs) unsubscribeLogs();
            if (unsubscribeEmployees) unsubscribeEmployees();
        };
    }, [user]);

    if (loading) return <div className="glass-card p-6 h-40 animate-pulse"></div>;

    return (
        <div className="glass-card p-6 border-t-4 border-rose-500">
            <h3 className="text-white font-semibold mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-rose-400" />
                Low Attendance Alert
            </h3>
            <div className="space-y-3">
                {violations.length === 0 ? (
                    <p className="text-slate-500 text-sm">No attendance violations detected.</p>
                ) : (
                    violations.map((v, i) => (
                        <div key={i} className="flex items-center p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                            <div className="w-2 h-2 rounded-full bg-rose-500 mr-3 animate-pulse" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-rose-200">{v.name}</p>
                                <p className="text-xs text-rose-400/70">{v.lateCount} Lates (Threshold: {v.threshold})</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
