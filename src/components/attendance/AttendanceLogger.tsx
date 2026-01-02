"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Clock, UserCheck, AlertTriangle, CheckCircle } from "lucide-react";

interface EmployeeLite {
    id: string;
    name: string;
    role: string;
}

export default function AttendanceLogger() {
    const [employees, setEmployees] = useState<EmployeeLite[]>([]);
    const [selectedEmp, setSelectedEmp] = useState("");
    const [time, setTime] = useState("09:00");
    const [status, setStatus] = useState<"idle" | "success" | "late">("idle");
    const [loading, setLoading] = useState(true);

    // Fetch Employees for Dropdown (Scoped)
    useEffect(() => {
        // Wait for auth? 
        // Let's assume user is loaded (protected route). But for safety:
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;

        const q = query(collection(db, "employees"), where("adminId", "==", uid));

        const unsub = onSnapshot(q, (snap) => {
            const list: EmployeeLite[] = [];
            snap.forEach(d => {
                const data = d.data();
                if (data.status === "Active") {
                    list.push({ id: d.id, name: `${data.firstName} ${data.lastName}`, role: data.designation });
                }
            });
            setEmployees(list);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleClockIn = async () => {
        if (!selectedEmp) return alert("Select an employee");

        try {
            // 1. Fetch Grace Period Rule
            const settingsSnap = await getDoc(doc(db, "payroll_settings", "default"));
            const gracePeriod = settingsSnap.exists() ? settingsSnap.data().gracePeriod : "09:15";

            // 2. Determine Late Status
            // Simple string comparison works for 24h format "HH:MM" e.g., "09:20" > "09:15"
            // For robustness, could parse to minutes, but string compare is fine for fixed format inputs
            const isLate = time > gracePeriod;

            // 3. Log to Firestore (Scoped)
            const adminId = auth.currentUser?.uid;

            if (!adminId) throw new Error("Must be logged in");

            await addDoc(collection(db, "attendance_logs"), {
                employeeId: selectedEmp,
                time: time,
                isLate: isLate,
                timestamp: serverTimestamp(),
                date: new Date().toISOString().split('T')[0],
                adminId: adminId
            });

            setStatus(isLate ? "late" : "success");
            setTimeout(() => setStatus("idle"), 3000);

        } catch (e) {
            console.error(e);
            alert("Clock In Failed");
        }
    };

    if (loading) return <div className="h-40 glass-card animate-pulse"></div>;

    return (
        <div className="glass-card p-6 border-l-4 border-emerald-500">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-emerald-400" />
                Attendance Simulator
            </h3>

            <div className="space-y-4">
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Select Employee</label>
                    <select
                        className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg p-2.5 focus:ring-emerald-500"
                        value={selectedEmp}
                        onChange={(e) => setSelectedEmp(e.target.value)}
                    >
                        <option value="">-- Choose Employee --</option>
                        {employees.map(e => (
                            <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="text-xs text-slate-400 block mb-1">Simulated Time</label>
                    <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg p-2.5 focus:ring-emerald-500"
                    />
                </div>

                <div className="pt-2">
                    <button
                        onClick={handleClockIn}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm px-5 py-2.5 transition-colors flex justify-center items-center"
                    >
                        <UserCheck className="w-4 h-4 mr-2" />
                        Simulate Clock In
                    </button>
                </div>

                {status !== "idle" && (
                    <div className={`mt-3 p-3 rounded-lg flex items-center text-sm ${status === 'late' ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                        {status === 'late' ? <AlertTriangle className="w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                        {status === 'late' ? "Marked as LATE based on rules." : "Clock In Successful (On Time)."}
                    </div>
                )}
            </div>
        </div>
    );
}
