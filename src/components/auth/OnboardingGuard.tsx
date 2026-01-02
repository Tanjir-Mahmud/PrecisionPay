import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [hasSettings, setHasSettings] = useState<boolean | null>(null);

    useEffect(() => {
        if (!user) return;

        // Listen to payroll_settings/{uid}
        const unsub = onSnapshot(doc(db, "payroll_settings", user.uid), (doc) => {
            if (doc.exists()) {
                setHasSettings(true);
            } else {
                setHasSettings(false);
            }
        });

        return () => unsub();
    }, [user]);

    useEffect(() => {
        if (loading || hasSettings === null) return;

        const isOnboarding = pathname === "/onboarding";

        // 1. If user has NO settings, force them to /onboarding
        if (!hasSettings && !isOnboarding) {
            router.push("/onboarding");
        }

        // 2. If user HAS settings, block them from /onboarding (redirect to dashboard)
        if (hasSettings && isOnboarding) {
            router.push("/");
        }
    }, [loading, hasSettings, pathname, router]);

    // Show loading spinner while checking access
    if (loading || (user && hasSettings === null)) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return <>{children}</>;
}
