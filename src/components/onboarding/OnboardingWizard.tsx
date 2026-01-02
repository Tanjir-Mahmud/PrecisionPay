"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { completeOnboarding } from "@/lib/actions/onboarding-actions";
import { COUNTRY_CONFIGS } from "@/lib/tax-engine";
import { Globe, Clock, DollarSign, CheckCircle, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";

export default function OnboardingWizard() {
    const { user } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        // Step 1: Company Profile
        companyName: (user as any)?.companyName || "", // Fallback to auth context if available
        country: "USA",
        currency: "$",

        // Step 2: Attendance Rules
        gracePeriod: "09:15",
        lateThreshold: 3,
        latePenaltyAmount: 50,

        // Step 3: Payroll & Data
        payCycleStart: 1, // Day of month
        absentDeductionRate: 5, // % per day
        loadDemoData: true
    });

    const handleNext = () => setStep(s => Math.min(s + 1, 3));
    const handlePrev = () => setStep(s => Math.max(s - 1, 1));

    const handleSubmit = async () => {
        if (!user) return;
        setSubmitting(true);
        try {
            await completeOnboarding(formData, user.uid);
            // On success, the OnboardingGuard should automatically detect the new settings
            // and redirect, or we can force it here.
            router.push("/");
        } catch (error) {
            console.error("Onboarding failed:", error);
            alert("Failed to save settings. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Auto-update currency if country changes
        if (field === "country") {
            const config = COUNTRY_CONFIGS[value as keyof typeof COUNTRY_CONFIGS];
            if (config) {
                setFormData(prev => ({ ...prev, country: value, currency: config.currency }));
            }
        }
    };

    return (
        <div className="w-full max-w-4xl bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">

            {/* Sidebar / Progress */}
            <div className="w-full md:w-1/3 bg-slate-900/80 p-8 flex flex-col justify-between">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-300 bg-clip-text text-transparent mb-2">
                        Setup Wizard
                    </h2>
                    <p className="text-slate-400 text-sm mb-8">
                        Configure your enterprise environment in 3 simple steps.
                    </p>

                    <div className="space-y-6">
                        <StepIndicator
                            current={step}
                            index={1}
                            icon={Globe}
                            title="Company Profile"
                            desc="Region & Currency"
                        />
                        <StepIndicator
                            current={step}
                            index={2}
                            icon={Clock}
                            title="Attendance Rules"
                            desc="Shifts & Penalties"
                        />
                        <StepIndicator
                            current={step}
                            index={3}
                            icon={DollarSign}
                            title="Payroll Config"
                            desc="Cycles & Data"
                        />
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-500">
                    Step {step} of 3
                </div>
            </div>

            {/* Main Content */}
            <div className="w-full md:w-2/3 p-8 bg-slate-800/30 flex flex-col">
                <div className="flex-1 overflow-y-auto">
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <h3 className="text-xl font-semibold text-white">Company & Region</h3>
                            <InputGroup label="Company Name">
                                <input
                                    type="text"
                                    value={formData.companyName}
                                    onChange={(e) => updateField("companyName", e.target.value)}
                                    className="input-field"
                                    placeholder="e.g. Acme Corp"
                                />
                            </InputGroup>

                            <InputGroup label="Primary Jurisdiction">
                                <select
                                    value={formData.country}
                                    onChange={(e) => updateField("country", e.target.value)}
                                    className="input-field"
                                >
                                    {Object.values(COUNTRY_CONFIGS).map((config) => (
                                        <option key={config.code} value={config.code}>
                                            {config.name} ({config.currency})
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-400 mt-1">
                                    Determines tax brackets and compliance rules.
                                </p>
                            </InputGroup>

                            <InputGroup label="Operating Currency">
                                <input
                                    type="text"
                                    value={formData.currency}
                                    readOnly
                                    className="input-field bg-slate-900/50 cursor-not-allowed text-slate-400"
                                />
                            </InputGroup>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <h3 className="text-xl font-semibold text-white">Attendance Rules</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <InputGroup label="Daily Grace Period">
                                    <input
                                        type="time"
                                        value={formData.gracePeriod}
                                        onChange={(e) => updateField("gracePeriod", e.target.value)}
                                        className="input-field"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">Cutoff for "On Time"</p>
                                </InputGroup>

                                <InputGroup label="Late Flag Threshold">
                                    <input
                                        type="number"
                                        value={formData.lateThreshold}
                                        onChange={(e) => updateField("lateThreshold", parseInt(e.target.value))}
                                        className="input-field"
                                        min={1}
                                    />
                                    <p className="text-xs text-slate-400 mt-1">Days before penalty</p>
                                </InputGroup>
                            </div>

                            <InputGroup label={`Penalty Amount (${formData.currency})`}>
                                <input
                                    type="number"
                                    value={formData.latePenaltyAmount}
                                    onChange={(e) => updateField("latePenaltyAmount", parseFloat(e.target.value))}
                                    className="input-field"
                                    min={0}
                                />
                                <p className="text-xs text-slate-400 mt-1">
                                    Deducted from salary after threshold reached.
                                </p>
                            </InputGroup>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <h3 className="text-xl font-semibold text-white">Payroll & Data</h3>

                            <InputGroup label="Pay Cycle Start Day">
                                <select
                                    value={formData.payCycleStart}
                                    onChange={(e) => updateField("payCycleStart", parseInt(e.target.value))}
                                    className="input-field"
                                >
                                    {[1, 5, 10, 15, 20, 25].map(day => (
                                        <option key={day} value={day}>Day {day} of Month</option>
                                    ))}
                                </select>
                            </InputGroup>

                            <InputGroup label="Absent Deduction Rate (%)">
                                <input
                                    type="number"
                                    value={formData.absentDeductionRate}
                                    onChange={(e) => updateField("absentDeductionRate", parseFloat(e.target.value))}
                                    className="input-field"
                                    min={0}
                                    max={100}
                                />
                            </InputGroup>

                            <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.loadDemoData}
                                        onChange={(e) => updateField("loadDemoData", e.target.checked)}
                                        className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
                                    />
                                    <div>
                                        <span className="text-white font-medium">Load "Starter Pack" Data</span>
                                        <p className="text-xs text-slate-400">
                                            Adds 2 demo employees and sample attendance logs so you can visualize charts immediately.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="mt-8 pt-6 border-t border-slate-700 flex justify-between">
                    <button
                        onClick={handlePrev}
                        disabled={step === 1 || submitting}
                        className={`flex items-center px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 transition ${step === 1 ? 'opacity-0 pointer-events-none' : ''}`}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </button>

                    {step < 3 ? (
                        <button
                            onClick={handleNext}
                            className="flex items-center px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shadow-lg shadow-indigo-500/20"
                        >
                            Next Step
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex items-center px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                            {submitting ? "Configuring..." : "Finish Setup"}
                        </button>
                    )}
                </div>
            </div>

            <style jsx>{`
                select {
                    @apply w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition shadow-sm appearance-none;
                    /* Ensure dropdown options are readable */
                }
                option {
                     @apply bg-white text-black;
                }
                .input-field {
                    @apply w-full bg-slate-900/80 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition shadow-sm;
                }
            `}</style>
        </div>
    );
}

// Subcomponents

function StepIndicator({ current, index, icon: Icon, title, desc }: any) {
    const isActive = current === index;
    const isCompleted = current > index;

    return (
        <div className={`flex items-center transition-opacity duration-300 ${isActive || isCompleted ? 'opacity-100' : 'opacity-40'}`}>
            <div className={`
                w-10 h-10 rounded-full flex items-center justify-center mr-4 shrink-0 transition-colors
                ${isActive ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500 border border-slate-700'}
            `}>
                {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
            </div>
            <div>
                <div className={`font-medium ${isActive ? 'text-white' : 'text-slate-300'}`}>{title}</div>
                <div className="text-xs text-slate-500">{desc}</div>
            </div>
        </div>
    );
}

function InputGroup({ label, children }: { label: string, children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
            {children}
        </div>
    );
}
