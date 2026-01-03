"use client";

import { useState } from "react";
import { testDatabaseConnection } from "@/lib/actions/debug-actions";

export default function DebugPage() {
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const runTest = async () => {
        setLoading(true);
        const res = await testDatabaseConnection();
        setResult(res);
        setLoading(false);
    };

    return (
        <div className="p-10 font-mono text-sm bg-black text-green-400 min-h-screen">
            <h1 className="text-xl font-bold mb-4">Environment Debugger</h1>

            <div className="mb-8">
                <button
                    onClick={runTest}
                    disabled={loading}
                    className="bg-green-600 text-black px-4 py-2 font-bold rounded hover:bg-green-500 disabled:opacity-50"
                >
                    {loading ? "Testing..." : "Run Database Connection Test"}
                </button>
            </div>

            {result && (
                <div className={`p-4 rounded mb-6 border ${result.success ? "border-green-500 bg-green-900/20" : "border-red-500 bg-red-900/20"}`}>
                    <h2 className="text-lg font-bold mb-2">{result.success ? "SUCCESS" : "CONNECTION FAILED"}</h2>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}

            <div className="mt-8 border-t border-gray-700 pt-4">
                <h2 className="text-lg font-bold text-white mb-2">Troubleshooting Guide</h2>
                <ul className="list-disc ml-5 space-y-1 text-gray-300">
                    <li>If test succeeds, the DB is fine and the 500 loop is in Dashboard Code.</li>
                    <li>If test fails, the DB Connection is broken (check error code).</li>
                </ul>
            </div>
        </div>
    );
}
