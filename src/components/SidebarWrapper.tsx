"use client";

import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

import OnboardingGuard from "./auth/OnboardingGuard";

export default function SidebarWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading } = useAuth();

    const isAuthPage = pathname === "/login" || pathname === "/signup" || pathname === "/debug";
    const isOnboardingPage = pathname === "/onboarding";

    // Route Protection
    useEffect(() => {
        if (!loading) {
            if (!user && !isAuthPage) {
                router.push("/login");
            } else if (user && isAuthPage) {
                router.push("/");
            }
        }
    }, [user, loading, pathname, isAuthPage, router]);

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500">Loading App...</div>;

    if (isAuthPage) {
        return <main className="min-h-screen bg-slate-950">{children}</main>;
    }

    // Onboarding Page: Authenticated but NO Sidebar
    if (isOnboardingPage) {
        return (
            <OnboardingGuard>
                <main className="min-h-screen bg-slate-900">
                    {children}
                </main>
            </OnboardingGuard>
        );
    }

    // Dashboard & App: Authenticated + Onboarding Check + Sidebar
    return (
        <OnboardingGuard>
            <div className="flex min-h-screen">
                <Sidebar />
                <main className="flex-1 ml-80 p-8">
                    {children}
                </main>
            </div>
        </OnboardingGuard>
    );
}
