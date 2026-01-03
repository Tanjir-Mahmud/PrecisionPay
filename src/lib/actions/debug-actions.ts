"use server";

import { prisma } from "@/lib/prisma";

export async function testDatabaseConnection() {
    try {
        const start = Date.now();
        // Simple query to verify connection
        const count = await prisma.user.count();
        const duration = Date.now() - start;

        return {
            success: true,
            message: `Connected successfully in ${duration}ms`,
            userCount: count,
            timestamp: new Date().toISOString()
        };
    } catch (error: any) {
        console.error("Debug Connection Failed:", error);
        return {
            success: false,
            message: error.message,
            code: error.code,
            meta: error.meta,
            stack: error.stack
        };
    }
}
