// Helper functions for validation, query building, and transformation
export function validatePagination(
  limit: string,
  page: string,
): { limit: number; page: number } {
  // Implement validation logic here (e.g., range checks, type conversion)
  const effectiveLimit = Math.max(parseInt(limit, 10) || 10, 1);
  const effectivePage = Math.max(parseInt(page, 10) || 1, 1);
  return { limit: effectiveLimit, page: effectivePage };
}
