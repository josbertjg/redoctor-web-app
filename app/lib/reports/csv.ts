/*
 * The statistics as a spreadsheet (M14), the app's `ReportCsvBuilder`: the
 * title, the period and when it was made, then each table with its heading.
 * A semicolon between fields, as Excel opens it in a Spanish locale, and a
 * byte-order mark so the accents survive. The words and the figures arrive
 * already written: this only lays them out.
 */

export type CsvTable = {
  title: string;
  headers: readonly string[];
  rows: readonly (readonly (string | number)[])[];
};

export type CsvReport = {
  title: string;
  /** Label and value lines under the title: the period, when it was made. */
  details: readonly (readonly [string, string])[];
  tables: readonly CsvTable[];
};

const separator = ';';
const byteOrderMark = '\uFEFF';

/** A field, quoted when it holds the separator, a quote or a line break. */
function field(value: string | number): string {
  const text = String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function line(values: readonly (string | number)[]): string {
  return values.map(field).join(separator);
}

export function buildCsv(report: CsvReport): string {
  const lines: string[] = [line([report.title])];
  for (const [label, value] of report.details) lines.push(line([label, value]));
  for (const table of report.tables) {
    lines.push('', line([table.title]), line(table.headers));
    for (const row of table.rows) lines.push(line(row));
  }
  return `${byteOrderMark}${lines.join('\r\n')}\r\n`;
}
