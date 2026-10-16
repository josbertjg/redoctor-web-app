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

/** What a spreadsheet would take for the start of a formula. */
const formulaStart = /^[=+\-@\t\r]/;
/** A figure as the web writes it («-12», «45,50», «-3 %»): it keeps its sign. */
const figure = /^[-+]?\d[\d.,\s]*%?$/;

/**
 * A field, quoted when it holds the separator, a quote or a line break. A
 * text that a spreadsheet would run as a formula (a reason named «=…»)
 * starts with an apostrophe, so Excel shows it as the text it is.
 */
function field(value: string | number): string {
  let text = String(value);
  if (
    typeof value === 'string' &&
    formulaStart.test(text) &&
    !figure.test(text)
  ) {
    text = `'${text}`;
  }
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
