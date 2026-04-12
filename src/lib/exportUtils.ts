/**
 * Generate a CSV string from an array of data records.
 * Handles null values, nested objects (stringified), commas in values (quoted), and newlines.
 */
export function generateCSV(
  data: Record<string, unknown>[],
  columns?: { key: string; label: string }[]
): string {
  if (data.length === 0) return '';

  const cols = columns ?? Object.keys(data[0]).map(key => ({ key, label: key }));
  const headers = cols.map(c => escapeCSVField(c.label));
  const rows = data.map(row =>
    cols.map(col => {
      const value = row[col.key];
      return escapeCSVField(formatCSVValue(value));
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

function formatCSVValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Generate a formatted JSON string with 2-space indentation.
 */
export function generateJSON(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Trigger a file download in the browser using Blob + URL.createObjectURL.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
