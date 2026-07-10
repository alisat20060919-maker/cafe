import { migrateLegacySaveIds } from './data-aliases.js?v=core001';

export const SAVE_KEY = 'fairyCafeSave';

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseSaveJson(raw) {
  const parsed = JSON.parse(raw);
  if (!isRecord(parsed)) throw new Error('存檔根節點必須是物件');
  return migrateLegacySaveIds(parsed);
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return parseSaveJson(raw);
  } catch (error) {
    console.warn('[FairyCafe] 讀取存檔失敗，將建立新存檔。', error);
    return null;
  }
}

export function saveSave(state) {
  try {
    if (!isRecord(state)) throw new Error('拒絕儲存非物件狀態');
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error('[FairyCafe] 儲存存檔失敗。', error);
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
    return true;
  } catch (error) {
    console.error('[FairyCafe] 清除存檔失敗。', error);
    return false;
  }
}

export function exportSave(state) {
  if (!isRecord(state)) throw new Error('沒有可匯出的有效存檔');
  const json = JSON.stringify(state);
  return btoa(unescape(encodeURIComponent(json)));
}

export function importSave(text) {
  const cleaned = String(text || '').trim();
  if (!cleaned) throw new Error('沒有輸入存檔文字');

  try {
    const json = decodeURIComponent(escape(atob(cleaned)));
    return parseSaveJson(json);
  } catch (base64Error) {
    return parseSaveJson(cleaned);
  }
}
