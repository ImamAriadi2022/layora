const DB_NAME = 'layora_workspace_db';
const DB_VERSION = 1;

const STORES = {
  PROJECTS: 'projects',
  DOCUMENTS: 'documents',
  VERSIONS: 'versions',
  REFERENCES: 'references',
  AGENTS: 'agents',
  DESIGN_SYSTEMS: 'design_systems',
  SETTINGS: 'settings',
  ACTIVITY: 'activity',
};

const memoryFallback = {
  [STORES.PROJECTS]: new Map(),
  [STORES.DOCUMENTS]: new Map(),
  [STORES.VERSIONS]: new Map(),
  [STORES.REFERENCES]: new Map(),
  [STORES.AGENTS]: new Map(),
  [STORES.DESIGN_SYSTEMS]: new Map(),
  [STORES.SETTINGS]: new Map(),
  [STORES.ACTIVITY]: new Map(),
};

let dbPromise = null;

function openDatabase() {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      Object.values(STORES).forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export async function dbGetAll(storeName) {
  try {
    const db = await openDatabase();
    if (!db) {
      return Array.from(memoryFallback[storeName]?.values() || []);
    }
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return Array.from(memoryFallback[storeName]?.values() || []);
  }
}

export async function dbGetById(storeName, id) {
  try {
    const db = await openDatabase();
    if (!db) {
      return memoryFallback[storeName]?.get(id) || null;
    }
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return memoryFallback[storeName]?.get(id) || null;
  }
}

export async function dbPut(storeName, record) {
  if (!record || !record.id) {
    throw new Error(`Record for store "${storeName}" must include an "id" field.`);
  }
  memoryFallback[storeName]?.set(record.id, record);
  try {
    const db = await openDatabase();
    if (!db) return record;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
    return record;
  } catch {
    return record;
  }
}

export async function dbDelete(storeName, id) {
  memoryFallback[storeName]?.delete(id);
  try {
    const db = await openDatabase();
    if (!db) return true;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
    return true;
  } catch {
    return true;
  }
}

export { STORES };
