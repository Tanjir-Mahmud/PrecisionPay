"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Lock, Mail, User, Building2 } from "lucide-react";

export default function SignupPage() {
    const { signup } = useAuth();

    const [form, setForm] = useState({
        name: "",
        company: "",
        email: "",
        password: ""
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!form.name || !form.company || !form.email || !form.password) {
            setError("All fields are required");
            return;
        }

        if (form.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            await signup(form.name, form.company, form.email, form.password);
        } catch (err: any) {
            console.error(err);
            if (err.code === "auth/email-already-in-use") {
                setError("Email is already registered.");
            } else {
                setError("Signup Failed. Please try again.");
            }
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full bg-[#0f172a] z-0" />
            <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px] z-0" />
            <div className="absolute top-[10%] left-[10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] z-0" />

            <div className="glass-card w-full max-w-md p-8 relative z-10 border border-white/10 shadow-2xl">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Create Account</h2>
                    <p className="text-slate-400 text-sm mt-2">Get started with PrecisionPay today</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm text-center animate-pulse">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-300 ml-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                            <input
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                                placeholder="John Doe"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-300 ml-1">Company Name</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                            <input
                                name="company"
                                value={form.company}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                                placeholder="Acme Inc."
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-300 ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                            <input
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                                placeholder="name@company.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-300 ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                            <input
                                name="password"
                                type="password"
                                value={form.password}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                                placeholder="Create a strong password"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-emerald-900/20 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Creating Account..." : "Create Account"}
                        </button>
                    </div>
                </form>

                <p className="mt-8 text-center text-sm text-slate-500">
                    Already have an account?{" "}
                    <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
}
