/*
 * Copying from a tap (the payment's «Copiar», the profile's link). The
 * Clipboard API first; for the browsers that refuse it (some apps' web
 * views, a page not served over https), the old way: a hidden text selected
 * and copied. False when both are refused, so the person can be told to
 * copy it by hand and nothing stale is pasted.
 */

function copyBySelection(value: string): boolean {
  const area = document.createElement('textarea');
  area.value = value;
  area.setAttribute('readonly', '');
  area.className = 'fixed top-0 left-0 opacity-0';
  document.body.append(area);
  area.select();
  // iOS selects nothing in a read-only field without an explicit range.
  area.setSelectionRange(0, value.length);
  try {
    // Deprecated, and still the only way left in those browsers.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return copyBySelection(value);
  }
}
