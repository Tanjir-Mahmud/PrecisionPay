"use client";

import {
    Clock,
    AlertTriangle,
    CheckCircle2,
    ShieldAlert,
    Loader2
} from "lucide-react";
import { getAttendanceLogs, clockInEmployee } from "@/lib/attendance-engine";
import { getEmployees } from "@/lib/actions/employee-actions";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState, useTransition } from "react";

export default function AttendancePage() {
    const { user, loading: authLoading } = useAuth();
    const [logs, setLogs] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]); // For Simulator Dropdown
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!user) {
            if (!authLoading) setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const token = await user.getIdToken();
                const [logsData, empResult] = await Promise.all([
                    getAttendanceLogs(token),
                    getEmployees(token)
                ]);

                setLogs(logsData);
                if (empResult.data) setEmployees(empResult.data);
            } catch (e) {
                console.error("Failed to load attendance data:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, authLoading]);

    const handleClockIn = (formData: FormData) => {
        if (!user) return;
        startTransition(async () => {
            try {
                const token = await user.getIdToken();
                const employeeId = formData.get("employeeId") as string;
                const timeStr = formData.get("time") as string;
                const [hours, minutes] = timeStr.split(':').map(Number);

                const now = new Date();
                now.setHours(hours, minutes, 0, 0);

                const result = await clockInEmployee(token, employeeId, now);
                if (result.success) {
                    alert(result.message);
                    // Refresh Logs
                    const logsData = await getAttendanceLogs(token);
                    setLogs(logsData);
                } else {
                    alert("Error: " + result.message);
                }
            } catch (e: any) {
                alert("Clock-In Failed: " + e.message);
            }
        });
    };

    if (authLoading || (loading && user)) {
        return <div className="flex h-96 items-center justify-center text-slate-400"><Loader2 className="animate-spin w-8 h-8" /></div>;
    }

    if (!user) {
        return <div className="text-center p-10 text-slate-400">Please log in to view attendance.</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100">Attendance Tracking</h2>
                    <p className="text-slate-400">Monitor clock-ins, lateness flags, and auto-deductions.</p>
                </div>
            </div>

            {/* Simulation / Manual Entry Card */}
            <div className="glass-card p-6 border-l-4 border-blue-500">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Manual Entry Simulator <span className="text-xs ml-2 text-slate-500 font-normal">(Since no biometric device connected)</span>
                </h3>
                <form action={handleClockIn} className="flex gap-4 items-end">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Employee</label>
                        <select name="employeeId" className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-3 py-2 text-sm w-48 focus:outline-none focus:border-blue-500">
                            {employees.length > 0 ? employees.map(e => (
                                <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                            )) : <option disabled>No Employees</option>}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Time (HH:mm)</label>
                        <input type="time" name="time" defaultValue={format(new Date(), "HH:mm")} className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                    <button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors disabled:opacity-50">
                        {isPending ? "Processing..." : "Simulate Clock In"}
                    </button>
                    <div className="text-xs text-slate-500 pb-2">
                        * Standard Shift: 09:00 AM<br />
                        * Grace Period: 15 mins (09:15)
                    </div>
                </form>
            </div>

            {/* Logs Table */}
            <div className="glass-card p-0 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/30">
                    <h3 className="font-semibold text-slate-100">Accrued Logs & Flags</h3>
                </div>
                <table className="min-w-full divide-y divide-slate-800">
                    <thead className="bg-slate-950">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs text-slate-400 uppercase">Employee</th>
                            <th className="px-6 py-3 text-left text-xs text-slate-400 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs text-slate-400 uppercase">Clock In</th>
                            <th className="px-6 py-3 text-left text-xs text-slate-400 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs text-slate-400 uppercase">Late Mins</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                        {logs.length === 0 && (
                            <tr><td colSpan={5} className="p-6 text-center text-slate-500">No records found.</td></tr>
                        )}
                        {logs.map((log) => {
                            const isLate = log.isLate;
                            const isPenalty = log.status === "HALF_DAY_DEDUCTION";

                            return (
                                <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-white">
                                        {log.employee?.firstName} {log.employee?.lastName}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400">
                                        {format(new Date(log.date), "MMM dd, yyyy")}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-300">
                                        {log.clockIn ? format(new Date(log.clockIn), "hh:mm a") : "-"}
                                    </td>
                                    <td className="px-6 py-4">
                                        {isPenalty ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                                                <ShieldAlert className="w-3 h-3 mr-1" />
                                                PENALTY (0.5 Day)
                                            </span>
                                        ) : isLate ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                <AlertTriangle className="w-3 h-3 mr-1" />
                                                LATE
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                ON TIME
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm text-slate-400 font-mono">
                                        {log.lateMinutes > 0 ? `+${log.lateMinutes}m` : "-"}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
