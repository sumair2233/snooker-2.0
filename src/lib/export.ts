import * as XLSX from "xlsx";

export function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName = "Sheet1") {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-size columns
  const maxProps = Object.keys(data[0] || {});
  const colWidths = maxProps.map((key) => {
    let maxLen = key.length;
    for (const row of data) {
      const val = row[key];
      if (val !== undefined && val !== null) {
        maxLen = Math.max(maxLen, String(val).length);
      }
    }
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
  });
  worksheet["!cols"] = colWidths;

  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`);
}
