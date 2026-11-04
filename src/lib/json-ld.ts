/** Keep catalog content inside its JSON script, including text containing </script>. */
export function serializeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
