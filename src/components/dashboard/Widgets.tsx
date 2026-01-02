"use client";

import {
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Clock,
    MoreHorizontal,
    Users
} from "lucide-react";
import clsx from "clsx";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

// --- Stats Card ---
// --- Stats Card ---
export function StatsCard({
    title,
    value,
    subtext,
    isPositive,
    icon
}: {
    title: string;
    value: string;
    subtext?: string;
    isPositive?: boolean;
    icon?: React.ReactNode;
}) {
    return (
        <div className="glass-card p-6 flex flex-col justify-between h-40 relative overflow-hidden group">
            {/* Background decoration */}
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />

            <div className="flex justify-between items-start">
                <h3 className="text-slate-400 text-sm font-medium">{title}</h3>
                {icon && <div className="text-slate-500">{icon}</div>}
            </div>

            <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">{value}</h2>
                {subtext && (
                    <div className="flex items-center mt-2 space-x-2">
                        {isPositive !== undefined && (
                            <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full flex items-center",
                                isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                            )}>
                                {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingUp className="w-3 h-3 mr-1 rotate-180" />}
                                {isPositive ? "+" : "-"}{subtext.split(' ')[0]}
                            </span>
                        )}
                        <span className="text-slate-500 text-xs">{subtext.split(' ').slice(1).join(' ')}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Chart: Payroll Trend (Dynamic Firestore) ---
export function PayrollTrendChart() {
    const [data, setData] = useState<{ month: string, payroll: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const load = async () => {
            try {
                // Dynamic Import or Static
                // Since we fixed analytics-engine sync, let's use the static import assumed above or dynamic if we must
                // Ideally static import getPayrollAnalytics at top level for type safety
                const { getPayrollAnalytics } = await import("@/lib/analytics-engine");
                const stats = await getPayrollAnalytics(user.uid);
                setData(stats.trend.reverse());
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        load();
    }, [user]);

    if (loading) return <div className="glass-card p-6 col-span-2 h-48 animate-pulse"></div>;

    // Normalizing for Chart (0-100 Scale)
    const maxVal = Math.max(...data.map(d => d.payroll), 1000); // Avoid div/0
    // Generate SVG Points
    // X axis: distribute 0 to 100. Step = 100 / (data.length - 1)
    const stepX = data.length > 1 ? 100 / (data.length - 1) : 0;

    // Y axis: 100 - (val / max * 80) // Leave margin
    const points = data.map((d, i) => {
        const x = i * stepX;
        const y = 100 - ((d.payroll / maxVal) * 80); // Use 80% height Max
        return `${x},${y}`;
    }).join(" ");

    const fillPath = `M0,100 ${points} V100 H0 Z`;
    const strokePath = points ? `M${points.split(" ")[0]} ${points}` : "";

    return (
        <div className="glass-card p-6 col-span-2">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-semibold flex items-center">
                    Payroll Trend <span className="ml-2 text-slate-500 text-sm font-normal">(Last 6 Months)</span>
                </h3>
            </div>

            <div className="relative h-48 w-full group">
                {/* Tooltip Wrapper */}

                {/* Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between text-xs text-slate-600">
                    {[maxVal, maxVal * 0.75, maxVal * 0.5, maxVal * 0.25, 0].map((val) => (
                        <div key={val} className="flex items-center w-full">
                            <span className="w-10 text-right mr-2">${(val / 1000).toFixed(0)}k</span>
                            <div className="h-px bg-slate-700/30 flex-1" />
                        </div>
                    ))}
                </div>

                {/* Chart Area */}
                <div className="absolute inset-0 ml-12 top-2 bottom-6 right-0">
                    {data.length > 0 ? (
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                            <defs>
                                <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path d={fillPath} fill="url(#gradient)" />
                            <path d={strokePath} fill="none" stroke="#60a5fa" strokeWidth="2" vectorEffect="non-scaling-stroke" />

                            {/* Points & Tooltips */}
                            {data.map((d, i) => (
                                <g key={i} className="group/point">
                                    <circle cx={i * stepX} cy={100 - ((d.payroll / maxVal) * 80)} r="2" fill="#bae6fd" stroke="#0ea5e9" strokeWidth="0.5" className="hover:scale-150 transition-transform origin-center cursor-pointer" />
                                    {/* Tooltip */}
                                    <foreignObject x={i * stepX - 10} y={100 - ((d.payroll / maxVal) * 80) - 15} width="40" height="20" className="opacity-0 group-hover/point:opacity-100 transition-opacity pointer-events-none">
                                        <div className="bg-slate-900 text-[8px] text-white p-1 rounded text-center border border-slate-700 shadow-xl">
                                            ${(d.payroll / 1000).toFixed(1)}k
                                        </div>
                                    </foreignObject>
                                </g>
                            ))}
                        </svg>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-500 text-sm">No Data Available</div>
                    )}
                </div>

                {/* X Axis */}
                <div className="absolute bottom-0 left-12 right-0 flex justify-between text-xs text-slate-500 font-medium px-2">
                    {data.map((m, i) => (
                        <span key={i}>{m.month}</span>
                    ))}
                </div>
            </div>
        </div>
    );
}

// --- List: Top Performers ---
export function PerformersCard() {
    const [performers, setPerformers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            try {
                const { getPayrollAnalytics } = await import("@/lib/analytics-engine");
                const stats = await getPayrollAnalytics(user.uid);
                // Map Analytics ROI to Display Format
                const mapped = stats.roi.slice(0, 3).map(p => ({
                    name: p.name,
                    score: Math.min(Math.round(p.roiScore / 1000), 100), // Scale ROI to 0-100 logic roughly or just use KPI if available. 
                    // Wait, getPayrollAnalytics returns 'roiScore' and 'kpi'. Let's use KPI for "Score" display as it's 0-100 friendly.
                    // Actually, let's use KPI.
                    rawScore: p.kpi, // Use KPI for display %
                    role: p.role,
                    color: p.kpi > 90 ? "bg-emerald-500" : "bg-blue-500"
                }));
                setPerformers(mapped);
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        load();
    }, [user]);

    if (loading) return <div className="glass-card p-6 h-64 animate-pulse"></div>;

    if (performers.length === 0) return (
        <div className="glass-card p-6 h-64 flex flex-col items-center justify-center text-slate-500">
            <p className="mb-2">No Performance Data</p>
            <p className="text-xs">Run payroll to generate KPIs.</p>
        </div>
    );

    return (
        <div className="glass-card p-6">
            <h3 className="text-white font-semibold mb-6 flex justify-between items-center">
                Top Performers
                <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded">KPI based</span>
            </h3>
            <div className="space-y-6">
                {performers.map((p, i) => (
                    <div key={i} className="group relative">
                        <div className="flex justify-between text-sm mb-2">
                            <div>
                                <span className="text-slate-300 font-medium block">{p.name}</span>
                                <span className="text-xs text-slate-500">{p.role}</span>
                            </div>
                            <div className="text-right">
                                <span className={clsx("font-bold", p.rawScore > 90 ? "text-emerald-400" : "text-blue-400")}>{p.rawScore}%</span>
                                {p.rawScore > 90 && (
                                    <div className="text-[10px] text-emerald-300 font-bold animate-pulse mt-0.5">
                                        ★ BONUS ELIGIBLE
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="h-2 w-full bg-slate-700/50 rounded-full overflow-hidden relative cursor-help"
                            title={`KPI Score: ${p.rawScore}%`}>
                            <div
                                className={`h-full ${p.color} shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000`}
                                style={{ width: `${p.rawScore}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- List: Low Attendance ---
export function AttendanceAlert() {
    const atRisk = [
        { name: "David B.", status: "Absent 3d" },
        { name: "Sarah L.", status: "Late 5x" },
    ];

    return (
        <div className="glass-card p-6">
            <h3 className="text-white font-semibold mb-4">Low Attendance Alert</h3>
            <div className="space-y-3">
                {atRisk.map((p, i) => (
                    <div key={i} className="flex items-center p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-rose-500 mr-3 animate-pulse" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-rose-200">{p.name}</p>
                        </div>
                        <span className="text-xs font-bold text-rose-400 bg-rose-950/30 px-2 py-1 rounded">
                            ! {p.status}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- List: Activities ---
export function RecentActivity() {
    const activities = [
        { text: "Payslips generated for July", time: "10:30 AM", icon: CheckCircle2, color: "text-emerald-400" },
        { text: "New employee added: Omar H", time: "09:15 AM", icon: Users, color: "text-blue-400" },
    ];

    return (
        <div className="glass-card p-6 col-span-2">
            <h3 className="text-white font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-4">
                {activities.map((act, i) => {
                    const Ic = act.icon;
                    return (
                        <div key={i} className="flex items-center space-x-4 p-2 hover:bg-slate-700/20 rounded-lg transition-colors">
                            <div className={`p-2 rounded-full bg-slate-800 border border-slate-700 ${act.color}`}>
                                <Ic size={18} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-slate-300">{act.text}</p>
                            </div>
                            <span className="text-xs text-slate-500 flex items-center">
                                <Clock size={12} className="mr-1" /> {act.time}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
