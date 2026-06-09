const STORAGE_KEY = "mangalovers-inapp";

export function isInAppEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== "false";
}

export function setInAppEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY, enabled.toString());
}
