"use client";

import { useState, useTransition } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { importData } from "@/lib/actions/import-actions";
import { useAuth } from "@/context/AuthContext";

export default function DataImportCard() {
    const { user } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [isPending, startTransition] = useTransition();
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus({ type: null, message: '' });
        }
    };

    const handleUpload = () => {
        if (!file) return;
        if (!user) {
            setStatus({ type: 'error', message: "You must be logged in to import data." });
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        startTransition(async () => {
            const result = await importData(user.uid, formData);
            if (result.success) {
                setStatus({ type: 'success', message: result.message });
                setFile(null);
            } else {
                setStatus({ type: 'error', message: result.message });
            }
        });
    };

    return (
        <div className="glass-card p-6 border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold text-white flex items-center mb-4">
                <UploadCloud className="w-5 h-5 mr-2 text-blue-400" />
                Data Migration & Import
            </h3>

            <div className="space-y-4">
                <div className="p-4 border-2 border-dashed border-slate-700 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors">
                    <div className="flex flex-col items-center justify-center text-center">
                        <FileSpreadsheet className="w-10 h-10 text-slate-500 mb-3" />
                        <label htmlFor="file-upload" className="cursor-pointer">
                            <span className="text-blue-400 font-medium hover:text-blue-300">Click to upload</span>
                            <span className="text-slate-400"> or drag and drop</span>
                            <input
                                id="file-upload"
                                type="file"
                                className="hidden"
                                accept=".xlsx,.csv"
                                onChange={handleFileChange}
                                disabled={isPending}
                            />
                        </label>
                        <p className="text-xs text-slate-500 mt-2">
                            Supports .xlsx, .csv (Max 5MB)
                        </p>
                        {file && (
                            <div className="mt-4 flex items-center bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm">
                                <CheckCircle2 className="w-3 h-3 mr-2" />
                                {file.name}
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-xs text-slate-500 bg-slate-900/50 p-3 rounded">
                    <strong>Format Guide:</strong> Columns should be named 'Name', 'Email', 'Basic', 'Dept', 'Designation', 'Joining'.
                    <br />
                    <em>Tip: Any extra column like "Jan-2024" will be treated as historical net pay.</em>
                </div>

                {status.message && (
                    <div className={`p-3 rounded text-sm flex items-start ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {status.type === 'success' ? <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5" /> : <AlertCircle className="w-4 h-4 mr-2 mt-0.5" />}
                        {status.message}
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        onClick={handleUpload}
                        disabled={!file || isPending}
                        className="flex items-center bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <UploadCloud className="w-4 h-4 mr-2" />
                                Upload & Migrate
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
