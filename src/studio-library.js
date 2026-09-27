import { normalizeStudioState, isPausedStudioRequest } from "./studio-model.js";
const db = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open("pollframe-studio-designs", 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore("designs", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("Storage blocked"));
  });
async function transaction(mode, run) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction("designs", mode),
      request = run(tx.objectStore("designs"));
    let result;
    request.onsuccess = () => {
      result = request.result;
    };
    tx.oncomplete = () => {
      database.close();
      resolve(result);
    };
    tx.onabort = tx.onerror = () => {
      database.close();
      reject(tx.error);
    };
  });
}
export async function saveDesign(name, state, backgroundImage, thumbnail, id) {
  if (isPausedStudioRequest(state)) throw Error("Approval designs are temporarily unavailable");
  const record = {
    id: id || crypto.randomUUID(),
    name: String(name).trim().slice(0, 80) || "Design",
    state: normalizeStudioState({ ...state, workspace: "preview" }),
    backgroundImage: backgroundImage || "",
    thumbnail: thumbnail || "",
    updatedAt: new Date().toISOString(),
  };
  if (
    record.backgroundImage.length > 8_000_000 ||
    (record.backgroundImage &&
      !/^data:image\/(png|jpeg|webp);base64,/.test(record.backgroundImage))
  )
    throw Error("background");
  if (
    record.thumbnail.length > 2_000_000 ||
    (record.thumbnail &&
      !/^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(record.thumbnail))
  )
    throw Error("thumbnail");
  await transaction("readwrite", (store) => store.put(record));
  window.dispatchEvent(new Event("studio-library-change"));
  return record;
}
export async function getDesign(id) {
  return transaction("readonly", (store) => store.get(id));
}
export async function listDesigns() {
  const items = await transaction("readonly", (store) => store.getAll());
  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function deleteDesign(id) {
  await transaction("readwrite", (store) => store.delete(id));
  window.dispatchEvent(new Event("studio-library-change"));
}
