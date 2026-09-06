/**
 * Joins class names. Deliberately NOT tailwind-merge: on this codebase's web
 * side twMerge has already silently dropped valid classes and thrown dialogs
 * off-screen, and NativeWind resolves conflicts itself by applying the last
 * matching style. Plain concatenation is both correct here and impossible to
 * get subtly wrong.
 */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
