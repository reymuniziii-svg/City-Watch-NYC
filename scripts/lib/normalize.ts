export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

export function toSlug(value: string): string {
  return normalizeText(value).replace(/\s+/g, "-");
}

export function normalizePersonName(value: string): string {
  return normalizeText(
    value
      .replace(/\b(speaker|majority leader|minority leader|deputy speaker|council member|dr)\b/gi, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/\s+/g, " "),
  );
}
