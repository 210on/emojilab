const escapeCsvValue = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = <T extends Record<string, unknown>>(
  rows: T[],
  headers: Array<keyof T & string>,
  options: { bom?: boolean } = {},
) => {
  const body = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(',')),
  ].join('\n');

  return `${options.bom ? '\uFEFF' : ''}${body}`;
};
