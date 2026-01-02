import {
    Settings,
    Building2,
    Clock,
    Banknote,
    Save
} from "lucide-react";
import { getSettings, updateSettings } from "@/lib/actions/settings-actions";
import CountrySwitcher from "@/components/settings/CountrySwitcher";
import PenaltyConfig from "@/components/settings/PenaltyConfig";
import BonusConfig from "@/components/settings/BonusConfig";
import DangerZone from "@/components/settings/DangerZone";

export default async function SettingsPage() {
    const settings = await getSettings();

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100">System Configuration</h2>
                    <p className="text-slate-400">Manage global rules for payroll, attendance, and company profile.</p>
                </div>
            </div>

            <form action={updateSettings} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 1. Company Profile */}
                <div className="glass-card p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                        <Building2 className="w-5 h-5 mr-2 text-blue-400" />
                        Company Profile
                    </h3>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Company Name</label>
                        <input name="companyName" defaultValue={settings.companyName} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition" />
                    </div>
                </div>

                {/* 2. Attendance Rules (Legacy SQL) & New Dynamic Engine */}
                <div className="space-y-6">
                    {/* New Firestore Config */}
                    <PenaltyConfig />

                    {/* Legacy Settings (Optional fallback or keep for hybrid) */}
                    <div className="glass-card p-6 space-y-4 opacity-75 grayscale hover:grayscale-0 transition-all">
                        <h3 className="text-lg font-semibold text-white flex items-center">
                            <Clock className="w-5 h-5 mr-2 text-emerald-400" />
                            Shift Logic (Legacy SQL)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Shift Start</label>
                                <input type="time" name="shiftStart" defaultValue={settings.shiftStart} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition" />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Shift End</label>
                                <input type="time" name="shiftEnd" defaultValue={settings.shiftEnd} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Country Switcher (New) */}
                <CountrySwitcher currentCountry={settings.country || "USA"} name="country" />

                {/* 3. Performance Bonus (New) */}
                <BonusConfig />

                {/* 4. Payroll Factors */}
                <div className="glass-card p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                        <Banknote className="w-5 h-5 mr-2 text-purple-400" />
                        Payroll Rules
                    </h3>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Overtime Multiplier (x Hourly Rate)</label>
                        <input type="number" step="0.1" name="overtimeMultiplier" defaultValue={settings.overtimeMultiplier} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition" />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Tax Bracket Configuration</label>
                        <div className="p-3 bg-slate-800/50 rounded border border-slate-700 text-xs text-slate-500 font-mono">
                            JSON Editor Placeholder - Tax Brackets are currently managed in code.
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2 flex justify-end">
                    <button type="submit" className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all transform active:scale-95">
                        <Save className="w-4 h-4 mr-2" />
                        Save Configuration
                    </button>
                </div>
            </form>

            {/* 4. Danger Zone */}
            <DangerZone />
        </div>
    );
}
