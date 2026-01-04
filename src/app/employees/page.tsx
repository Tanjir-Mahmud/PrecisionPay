"use client";

import EmployeeList from "@/components/employees/EmployeeList";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { getEmployees } from "@/lib/actions/employee-actions";
import { Loader2 } from "lucide-react";

export default function EmployeesPage() {
    const { user, loading: authLoading } = useAuth();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            if (!authLoading) setLoading(false);
            return;
        }

        const loadData = async () => {
            try {
                const token = await user.getIdToken();
                const { data, error } = await getEmployees(token);
                if (data) setEmployees(data);
                if (error) console.error(error);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user, authLoading]);

    if (authLoading || (loading && user)) {
        return <div className="flex h-96 items-center justify-center text-slate-400"><Loader2 className="animate-spin w-8 h-8" /></div>;
    }

    if (!user) {
        return <div className="text-center p-10 text-slate-400">Please log in to manage employees.</div>;
    }

    return <EmployeeList initialData={employees} />;
}
