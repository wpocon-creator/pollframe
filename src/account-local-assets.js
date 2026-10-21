// Only authenticated cloud designs have local asset attachments. Keys include
// the verified owner, so another account in this browser cannot inherit them.
export async function localDesignAssets(owner, id, value) {
  const db = await new Promise((resolve, reject) => {
    const r = indexedDB.open("pollframe-account-assets", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("assets");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      "assets",
      value === undefined ? "readonly" : "readwrite",
    );
    const store = tx.objectStore("assets"),
      key = `${owner}:${id}`,
      r =
        value === undefined
          ? store.get(key)
          : value === null
            ? store.delete(key)
            : store.put(value, key);
    let result;
    r.onsuccess = () => {
      result = r.result;
    };
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
