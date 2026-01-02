"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Calculator,
    ShieldCheck,
    FileBarChart,
    Settings,
    LogOut
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar() {
    const pathname = usePathname();
    const { logout } = useAuth(); // Destructure logout

    const links = [
        { name: "Dashboard", href: "/", icon: LayoutDashboard },
        { name: "Employees", href: "/employees", icon: Users },
        { name: "Payroll", href: "/payroll", icon: Calculator },
        { name: "Attendance", href: "/attendance", icon: ShieldCheck },
        { name: "Reports", href: "/reports", icon: FileBarChart },
        { name: "Settings", href: "/settings", icon: Settings },
    ];

    return (
        <aside className="fixed left-6 top-6 bottom-6 w-64 glass rounded-2xl flex flex-col z-50">
            {/* Brand */}
            <div className="h-24 flex flex-col items-center justify-center border-b border-slate-700/30">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mb-2 shadow-lg shadow-blue-500/20">
                    <span className="font-bold text-xl text-white">P</span>
                </div>
                <h1 className="text-lg font-bold tracking-wide text-white">PrecisionPay</h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-4 space-y-2">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;

                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={clsx(
                                "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                                isActive
                                    ? "bg-blue-600/90 text-white shadow-lg shadow-blue-900/20"
                                    : "text-slate-400 hover:bg-slate-700/30 hover:text-white"
                            )}
                        >
                            <Icon className="w-5 h-5 mr-3" />
                            {link.name}
                        </Link>
                    );
                })}
            </nav>

            {/* User / Footer */}
            <div className="p-4 border-t border-slate-700/30">
                <button
                    onClick={() => logout()}
                    className="flex items-center w-full px-4 py-3 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-900/10 rounded-xl transition-colors"
                >
                    <LogOut className="w-5 h-5 mr-3" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
