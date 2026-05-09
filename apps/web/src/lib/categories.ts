/// On-chain `uint8 category` mapping. Order matters — must match contract.
export const CATEGORIES = [
  { id: 0, slug: "medical", label: "Medical" },
  { id: 1, slug: "safety", label: "Safety" },
  { id: 2, slug: "education", label: "Education" },
  { id: 3, slug: "community", label: "Community" },
  { id: 4, slug: "other", label: "Other" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export function getCategory(id: number) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function getCategoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}
