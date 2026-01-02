"use client";

import { Globe } from "lucide-react";
import { COUNTRY_CONFIGS } from "@/lib/tax-engine";

export default function CountrySwitcher({ currentCountry, name }: { currentCountry: string, name: string }) {
    return (
        <div className="glass-card p-6 space-y-4 border-l-4 border-indigo-500">
            <h3 className="text-lg font-semibold text-white flex items-center">
                <Globe className="w-5 h-5 mr-2 text-indigo-400" />
                Tax Jurisdiction
            </h3>
            <div>
                <label className="block text-sm text-slate-400 mb-1">Select Country for Tax Rules</label>
                <select
                    name={name}
                    defaultValue={currentCountry}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500 transition"
                >
                    {Object.values(COUNTRY_CONFIGS).map((config) => (
                        <option key={config.code} value={config.code}>
                            {config.name} ({config.currency})
                        </option>
                    ))}
                </select>
                <p className="text-xs text-slate-500 mt-2">
                    Start Year: Every country has specific tax brackets. Changing this will recalculate payroll tax for future runs.
                </p>
            </div>
        </div>
    );
}
