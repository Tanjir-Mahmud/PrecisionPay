import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

interface ExportRow {
    name: string;
    role: string;
    department: string;
    gross: number;
    tax: number;
    penalty: number;
    net: number;
}

export function generatePDF(data: ExportRow[], companyName: string, region: string) {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();

    // 1. Header
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text(companyName || "Company Name", 14, 20); // Dynamic Company

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Payroll Summary - ${region} `, 14, 28);
    doc.text(`Date: ${date} `, 14, 33);

    // 2. Table Data
    const tableRows = data.map(row => [
        row.name,
        row.role,
        row.department,
        row.gross.toLocaleString(),
        row.tax.toLocaleString(),
        row.penalty.toLocaleString(),
        row.net.toLocaleString()
    ]);

    // 3. AutoTable
    autoTable(doc, {
        head: [["Employee", "Role", "Dept", "Gross", "Tax", "Penalty", "Net Pay"]],
        body: tableRows,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    // 4. Footer Summary
    const totalNet = data.reduce((acc, curr) => acc + curr.net, 0);
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Payout: ${totalNet.toLocaleString()} `, 14, finalY);

    // Save
    doc.save(`Payroll_${date.replace(/\//g, "-")}.pdf`);
}

export function generateExcel(data: ExportRow[], companyName: string) {
    // 1. Prepare Data
    const ws = XLSX.utils.json_to_sheet(data);

    // 2. Add Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll Data");

    // 3. Save
    const date = new Date().toLocaleDateString().replace(/\//g, "-");
    XLSX.writeFile(wb, `${companyName}_Payroll_${date}.xlsx`);
}
