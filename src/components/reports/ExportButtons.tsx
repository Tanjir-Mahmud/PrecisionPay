"use client";

import { Download } from "lucide-react";
import { ReportData } from "@/lib/actions/report-actions";

export default function ExportButtons({ data }: { data: ReportData }) {

    const handlePrint = () => {
        window.print();
    };

    const handleExcel = () => {
        // Generate CSV
        let csvContent = "data:text/csv;charset=utf-8,";

        // Section 1: Variance
        csvContent += "VARIANCE REPORT\n";
        csvContent += "Metric,Previous Month,Current Month,Difference,Status\n";
        data.variance.forEach(row => {
            csvContent += `${row.category},${row.previous},${row.current},${row.diffPct}%,${row.status}\n`;
        });

        // Section 2: Tax
        csvContent += "\nTAX LIABILITY (YTD)\n";
        csvContent += "Month,Amount\n";
        data.taxLiability.forEach(row => {
            csvContent += `${row.month},${row.amount}\n`;
        });

        // Section 3: Performers
        csvContent += "\nTOP PERFORMERS ROI\n";
        csvContent += "Name,Department,Cost,Score\n";
        data.topPerformers.forEach(row => {
            csvContent += `${row.name},${row.dept},${row.cost},${row.score}\n`;
        });

        // Download Trigger
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `precisionpay_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex space-x-2">
            <button
                onClick={handlePrint}
                className="flex items-center px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition"
            >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
            </button>
            <button
                onClick={handleExcel}
                className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
                <Download className="w-4 h-4 mr-2" />
                Export Excel
            </button>
        </div>
    );
}
