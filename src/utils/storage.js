const STORAGE_KEY = 'blackboard_current_board';
const SNAPSHOTS_KEY = 'blackboard_version_snapshots';
const SETTINGS_KEY = 'blackboard_user_settings';
const INIT_FLAG_KEY = 'blackboard_ink_defaults_v2';

export const defaultSettings = {
  // 1. Export Defaults & Asset Rendering
  export: {
    format: 'PNG', // 'PNG' | 'SVG' | 'PDF'
    transparentBg: false,
    multiplier: 2, // 1 | 2 | 3
    framing: 'crop' // 'crop' | 'full'
  },
  // 2. Performance & Rendering Fidelity
  performance: {
    hardwareAccel: true,
    fpsLimit: '60', // '30' | '60' | 'uncapped'
    imageDownsampling: true,
    lowPowerMode: false
  },
  // 3. Version History & Offline Cache Management
  versionHistory: {
    autoSaveInterval: '30s', // '30s' | '1m' | '5m' | 'off'
    milestoneSnapshots: true,
    conflictResolution: 'local', // 'local' | 'remote' | 'ask'
    storageLimitMB: 50
  },
  // 4. Auto-Shape & Stroke Recognition (Ink-to-Shape) - ALL DISABLED BY DEFAULT ON FIRST BOOT
  inkToShape: {
    enabled: false, // Automatically disabled on first boot (Photo 2)
    delayMs: 500, // 200 - 1500 ms
    arrowSnapping: false, // Automatically disabled on first boot (Photo 2)
    inkToText: false // Automatically disabled on first boot (Photo 2)
  },
  // 5. Pin / sit on top
  pinOnTop: false
};

export function loadSettings() {
  try {
    const isV2 = localStorage.getItem(INIT_FLAG_KEY);
    const raw = localStorage.getItem(SETTINGS_KEY);

    if (!isV2) {
      // First time booting with v2 settings: guarantee Ink-to-Shape features are disabled
      localStorage.setItem(INIT_FLAG_KEY, 'true');
      const base = raw ? JSON.parse(raw) : {};
      const updated = {
        ...defaultSettings,
        ...base,
        inkToShape: {
          enabled: false,
          delayMs: 500,
          arrowSnapping: false,
          inkToText: false
        }
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultSettings, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return defaultSettings;
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function saveCurrentBoard(boardData) {
  try {
    const payload = JSON.stringify({
      ...boardData,
      savedAt: new Date().toISOString()
    });
    localStorage.setItem(STORAGE_KEY, payload);
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

export function clearCurrentBoard() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('LocalStorage clear failed:', e);
  }
}

export function loadCurrentBoard() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load current board:', e);
  }
  return null;
}

export function createMilestoneSnapshot(boardData, tag = 'Auto milestone') {
  try {
    const existingRaw = localStorage.getItem(SNAPSHOTS_KEY);
    const snapshots = existingRaw ? JSON.parse(existingRaw) : [];
    const snapshot = {
      id: 'snap_' + Date.now(),
      timestamp: new Date().toISOString(),
      tag,
      elementCount: boardData.elements ? boardData.elements.length : 0,
      title: boardData.title || 'Untitled',
      data: boardData
    };
    const updated = [snapshot, ...snapshots.slice(0, 19)];
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Snapshot failed:', e);
    return [];
  }
}

export function getSnapshots() {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function calculateStorageUsage() {
  let totalBytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('blackboard')) {
      const val = localStorage.getItem(key) || '';
      totalBytes += key.length + val.length;
    }
  }
  const kb = (totalBytes / 1024).toFixed(1);
  const mb = (totalBytes / (1024 * 1024)).toFixed(2);
  return totalBytes > 1024 * 1024 ? `${mb} MB` : `${kb} KB`;
}

export function clearOfflineCache() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('blackboard') && key !== SETTINGS_KEY && key !== INIT_FLAG_KEY) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    return true;
  } catch {
    return false;
  }
}
