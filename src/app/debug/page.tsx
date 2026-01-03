import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default function DebugPage() {
    const dbUrl = process.env.DATABASE_URL || "NOT_SET";
    const dbUnpooled = process.env.DATABASE_URL_UNPOOLED || "NOT_SET";
    const prismaUrl = process.env.POSTGRES_PRISMA_URL || "NOT_SET";

    // Safe masking
    const mask = (s: string) => {
        if (s === "NOT_SET") return s;
        if (s.includes("localhost")) return "⚠️ CONTAINS LOCALHOST";
        try {
            const url = new URL(s);
            return `Protocol: ${url.protocol}, Host: ${url.hostname} (Valid Cloud URL)`;
        } catch (e) {
            return "INVALID_URL_FORMAT";
        }
    };

    const envCheck = {
        DATABASE_URL: mask(dbUrl),
        DATABASE_URL_UNPOOLED: mask(dbUnpooled),
        POSTGRES_PRISMA_URL: mask(prismaUrl),
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL ? "YES" : "NO",
    };

    return (
        <div className="p-10 font-mono text-sm bg-black text-green-400 min-h-screen">
            <h1 className="text-xl font-bold mb-4">Environment Debugger</h1>
            <pre>{JSON.stringify(envCheck, null, 2)}</pre>

            <div className="mt-8 border-t border-gray-700 pt-4">
                <h2 className="text-lg font-bold text-white mb-2">Troubleshooting Guide</h2>
                <ul className="list-disc ml-5 space-y-1 text-gray-300">
                    <li>If <b>DATABASE_URL</b> says "NOT_SET", check Vercel Settings.</li>
                    <li>If it says "⚠️ CONTAINS LOCALHOST", your Vercel Project Variable is incorrect.</li>
                    <li>If valid, the issue is likely Code/Prisma Logic.</li>
                </ul>
            </div>
        </div>
    );
}
