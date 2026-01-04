"use client";

import { useState, useTransition } from "react";
import {
    UserPlus,
    Trash2,
    Shield,
    Briefcase,
    X,
    Save
} from "lucide-react";
import { addEmployee, deleteEmployee } from "@/lib/actions/employee-actions";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    designation: string;
    department: string;
    isActive: boolean;
    adminId?: string;
}

export default function EmployeeList({ initialData }: { initialData: Employee[] }) {
    const { user } = useAuth();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleDelete = async (id: string, email: string) => {
        if (!confirm("Are you sure you want to deactivate/delete this employee?")) return;

        // 1. Firestore Delete (Real-Time Engine Update)
        try {
            const { deleteDoc, doc, collection, getDocs, query, where } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase");

            const q = query(collection(db, "employees"), where("email", "==", email));
            const snap = await getDocs(q);
            snap.forEach(async (d) => await deleteDoc(doc(db, "employees", d.id)));

        } catch (e) {
            console.error("Firestore Delete Error", e);
        }

        // 2. SQL Delete (List Update)
        startTransition(async () => await deleteEmployee(id));
    };

    const handleStatusToggle = async (id: string, email: string, currentStatus: boolean) => {
        // Toggle Active <-> On Leave
        const newStatus = !currentStatus;
        const newStatusStr = newStatus ? "Active" : "On Leave";

        // Firestore Update
        try {
            const { updateDoc, doc, collection, getDocs, query, where } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase");

            const q = query(collection(db, "employees"), where("email", "==", email));
            const snap = await getDocs(q);
            snap.forEach(async (d) => await updateDoc(doc(db, "employees", d.id), { status: newStatusStr }));
        } catch (e) { console.error(e); }

        // Server Action (if exists for status, else just UI opt update or ignore SQL for Day 2 specific logic)
        location.reload();
    };

    const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            // Firebase Persistence (Day 2 Challenge)
            const { collection, addDoc } = await import("firebase/firestore");
            const { db, auth } = await import("@/lib/firebase"); // Use initialized instances
            const { signInAnonymously } = await import("firebase/auth");

            // Ensure Auth for Rules
            if (!auth.currentUser) {
                try {
                    await signInAnonymously(auth);
                } catch (authError) {
                    console.warn("Auto-signin failed", authError);
                }
            }

            const email = formData.get("email") as string;
            const baseSalary = parseFloat(formData.get("baseSalary") as string);

            // Validation
            if (!email.includes("@") || baseSalary <= 0) {
                alert("Invalid Email or Salary");
                setIsSubmitting(false);
                return;
            }

            // 1. ADD TO FIRESTORE (Source of Truth)
            if (!user) throw new Error("No User");
            await addDoc(collection(db, "employees"), {
                firstName: formData.get("firstName"),
                lastName: formData.get("lastName"),
                email: formData.get("email"),
                designation: formData.get("designation"),
                department: formData.get("department"),
                baseSalary: parseFloat(formData.get("baseSalary") as string),
                status: "Active",
                joinedAt: new Date().toISOString(),
                adminId: user.uid // Scoping to Current Admin
            });

            // 2. Dual-write to Postgres
            const token = await user.getIdToken();
            await addEmployee(token, formData);

            setIsAddOpen(false);
            // Optional: location.reload(); if needed, but State update usually preferred or letting RevalidatePath handle it.

        } catch (e: any) {
            console.error("Error adding employee:", e);
            alert("Error saving: " + e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-100">Employees</h2>
                <button
                    onClick={() => setIsAddOpen(true)}
                    className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Employee
                </button>
            </div>

            {/* List */}
            <div className="glass-card p-0 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-800">
                    <thead className="bg-slate-950">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                        {initialData.map((emp) => (
                            <tr key={emp.id} className="hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 flex-shrink-0 bg-slate-700 rounded-full flex items-center justify-center text-slate-300 font-bold border border-slate-600">
                                            {emp.firstName[0]}{emp.lastName[0]}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-white">{emp.firstName} {emp.lastName}</div>
                                            <div className="text-sm text-slate-500">{emp.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-slate-300">{emp.designation}</div>
                                    <div className="text-xs text-slate-500 flex items-center mt-0.5">
                                        <Briefcase className="w-3 h-3 mr-1" /> {emp.department}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <button
                                        onClick={() => handleStatusToggle(emp.id, emp.email, emp.isActive)}
                                        title="Toggle Status (Active <-> On Leave)"
                                        className="focus:outline-none"
                                    >
                                        {emp.isActive ? (
                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-700 text-slate-400 border border-slate-600 hover:bg-slate-600 cursor-pointer">
                                                On Leave
                                            </span>
                                        )}
                                    </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleDelete(emp.id, emp.email)}
                                        disabled={isPending}
                                        className="text-slate-400 hover:text-rose-400 transition-colors p-2 hover:bg-rose-500/10 rounded-lg"
                                        title="Deactivate / Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Overlay */}
            {isAddOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="glass-card w-full max-w-lg p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setIsAddOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                            <UserPlus className="w-5 h-5 mr-3 text-blue-400" />
                            Add New Employee
                        </h3>

                        <form onSubmit={handleAddSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase text-slate-500 mb-1">First Name</label>
                                    <input required name="firstName" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-slate-500 mb-1">Last Name</label>
                                    <input required name="lastName" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-slate-500 mb-1">Email Address</label>
                                <input required type="email" name="email" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase text-slate-500 mb-1">Department</label>
                                    <select name="department" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                                        <option>Engineering</option>
                                        <option>Product</option>
                                        <option>Design</option>
                                        <option>Marketing</option>
                                        <option>Sales</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-slate-500 mb-1">Designation</label>
                                    <input required name="designation" placeholder="e.g. Senior Dev" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase text-slate-500 mb-1">Base Salary ($)</label>
                                    <input required type="number" name="baseSalary" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-slate-500 mb-1">Joining Date</label>
                                    <input required type="date" name="joiningDate" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddOpen(false)}
                                    className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={clsx(
                                        "flex items-center text-white px-4 py-2 rounded-lg transition-colors",
                                        isSubmitting ? "bg-blue-600/50 cursor-wait" : "bg-blue-600 hover:bg-blue-700"
                                    )}
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {isSubmitting ? "Saving..." : "Save Employee"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
