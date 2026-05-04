export function cn(
  ...classes: (string | number | null | false | undefined)[]
): string {
  return classes.filter(Boolean).join(" ");
}
