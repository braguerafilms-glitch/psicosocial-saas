export function supabaseErrorMessage(
  error: { message?: string } | null,
  fallback = "Ocorreu um erro. Tente novamente.",
): string {
  return error?.message?.trim() || fallback;
}
