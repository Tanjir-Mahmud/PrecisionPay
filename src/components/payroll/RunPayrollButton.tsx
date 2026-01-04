"use client";

import { useTransition } from "react";
import { Calculator } from "lucide-react";
import { runNewCalculation } from "@/lib/actions/payroll-actions";
import { useAuth } from "@/context/AuthContext";

export default function RunPayrollButton() {
    const { user } = useAuth();
    const [isPending, startTransition] = useTransition();

    const handleClick = () => {
        if (!user) return;
        startTransition(async () => {
            await runNewCalculation(user.uid);
        });
    };

    return (
        <button
            onClick={handleClick}
            disabled={isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Calculator className="w-4 h-4 mr-2" />
            {isPending ? "Running..." : "Run New Calculation"}
        </button>
    );
}
