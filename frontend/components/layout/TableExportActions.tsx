"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showError, showInfo } from "@/lib/toast";

function reportName() {
  const title = document.querySelector("main h1")?.textContent?.trim() || "solar-report";
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "solar-report";
}

function getTable() {
  const source = document.querySelector("main table") as HTMLTableElement | null;
  if (!source) return null;
  const table = source.cloneNode(true) as HTMLTableElement;
  const remove = Array.from(table.querySelectorAll("thead tr:last-child th")).flatMap((cell, i) => {
    const label = cell.textContent?.trim().toLowerCase() ?? "";
    return !label || label === "action" ? [i] : [];
  }).sort((a, b) => b - a);
  for (const row of Array.from(table.querySelectorAll("tr"))) for (const index of remove) row.children.item(index)?.remove();
  return table;
}

export default function TableExportActions() {
  const excel = async () => {
    const table = getTable();
    if (!table) { showInfo("No table is available to export."); return; }
    try {
      const XLSX = await import("xlsx");
      XLSX.writeFile(XLSX.utils.table_to_book(table, { sheet: "Report" }), `${reportName()}.xlsx`);
    } catch { showError("Excel export failed. Please try again."); }
  };
  const pdf = async () => {
    const table = getTable();
    if (!table) { showInfo("No table is available to export."); return; }
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setFontSize(16);
      doc.text(document.querySelector("main h1")?.textContent?.trim() || "Report", 40, 36);
      autoTable(doc, { html: table, startY: 52, theme: "grid", styles: { fontSize: 8, cellPadding: 4 }, headStyles: { fillColor: [30, 41, 59] } });
      doc.save(`${reportName()}.pdf`);
    } catch { showError("PDF export failed. Please try again."); }
  };

  return <div className="flex items-center gap-2 self-end lg:self-auto">
    <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={pdf} title="Download table as PDF"><Download size={15} /> PDF</Button>
    <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={excel} title="Download table as Excel"><FileSpreadsheet size={15} /> Excel</Button>
  </div>;
}
