import { normalizeStyle } from "./studio-style-model.js";

async function transaction(mode, run) {
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open("pollframe-studio-styles", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("styles", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Storage blocked"));
  });
  return new Promise((resolve, reject) => {
    const tx = database.transaction("styles", mode);
    let result;
    tx.oncomplete = () => {
      database.close();
      resolve(result);
    };
    tx.onabort = tx.onerror = () => {
      database.close();
      reject(tx.error || new Error("Storage unavailable"));
    };
    try {
      const request = run(tx.objectStore("styles"));
      request.onsuccess = () => {
        result = request.result;
      };
    } catch (error) {
      tx.abort();
      reject(error);
    }
  });
}
export const listStyles = async () =>
  (await transaction("readonly", (store) => store.getAll())).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
export async function saveStyle(name, style, id) {
  const label = String(name).trim().slice(0, 80);
  if (!label) throw new Error("Name required");
  const record = {
    id: id || crypto.randomUUID(),
    name: label,
    style: normalizeStyle(style),
    updatedAt: new Date().toISOString(),
  };
  await transaction("readwrite", (store) => store.put(record));
  window.dispatchEvent(new Event("studio-styles-change"));
  return record;
}
export const deleteStyle = async (id) => {
  await transaction("readwrite", (store) => store.delete(id));
  window.dispatchEvent(new Event("studio-styles-change"));
};
