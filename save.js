export const SAVE_KEY = 'fairyCafeSave';

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('[FairyCafe] 讀取存檔失敗，將建立新存檔。', error);
    return null;
  }
}

export function saveSave(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

export function exportSave(state) {
  const json = JSON.stringify(state);
  return btoa(unescape(encodeURIComponent(json)));
}

export function importSave(text) {
  const cleaned = String(text || '').trim();
  if (!cleaned) throw new Error('沒有輸入存檔文字');

  try {
    const json = decodeURIComponent(escape(atob(cleaned)));
    return JSON.parse(json);
  } catch (_) {
    return JSON.parse(cleaned);
  }
}
