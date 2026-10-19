// Download rows as a CSV file. Cells that a spreadsheet would read as a formula
// (=, +, -, @) get a leading apostrophe so names can't run as formulas.
export function downloadCsv(rows: Record<string, unknown>[], name: string) {
  if (!rows.length) return;
  const cell = (v: unknown) => {
    let t = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(t) && !/^-?\d+(\.\d+)?$/.test(t)) t = `'${t}`;
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const head = Object.keys(rows[0]);
  const blob = new Blob([[head.join(","), ...rows.map((r) => head.map((h) => cell(r[h])).join(","))].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}
