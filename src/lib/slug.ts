export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export function uniqueSlug(title: string): string {
  return `${slugify(title) || "campanha"}-${Math.random().toString(36).slice(2, 8)}`;
}
