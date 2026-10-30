import { showError } from "@/lib/toast";

export type ExportRow = Record<string, string | number | boolean | null | undefined>;

export async function exportRowsToExcel(rows: ExportRow[], fileName: string, sheetName = "Report") {
  try {
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } catch { showError("Excel export failed. Please try again."); }
}

export async function exportSimplePdf(title: string, fields: [string, string][], fileName: string) {
  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(title, 18, 22);
    doc.setFontSize(11);
    let y = 38;
    for (const [label, value] of fields) {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.text(label, 18, y);
      doc.setFont("helvetica", "normal");
      const printableValue = (value || "-").replace(/₹/g, "INR ").replace(/—/g, "-");
      const lines = doc.splitTextToSize(printableValue, 115);
      doc.text(lines, 75, y);
      y += Math.max(9, lines.length * 6 + 3);
    }
    doc.save(`${fileName}.pdf`);
  } catch { showError("PDF export failed. Please try again."); }
}
