export function getErrorDetails(error: unknown): string | undefined {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return undefined;
}

export function getErrorMessage(
  error: unknown,
  fallback = "Něco se nepodařilo. Zkuste to znovu.",
): string {
  return getErrorDetails(error) || fallback;
}
