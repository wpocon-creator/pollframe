import test from "node:test";
import assert from "node:assert/strict";
import { installModalScrollGuard, openModalDialog } from "../src/modal-scroll-guard.js";

function fakeDocument(run) {
  const saved = Object.fromEntries(["document", "window", "MutationObserver"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const document = new EventTarget(), values = new Map(), dialogs = [];
  document.documentElement = { dataset: {}, style: { setProperty: (key,value) => values.set(key,value), removeProperty: key => values.delete(key) } };
  document.body = {};
  document.querySelectorAll = () => dialogs.filter(dialog => dialog.open);
  const window = { scrollY: 450, scrollX: 7, scrollTo({top,left}) { this.scrollY=top;this.scrollX=left; } };
  let sync;
  Object.assign(globalThis, { document, window, MutationObserver: class { constructor(callback) { sync=callback; } observe() {} disconnect() {} } });
  const cleanup = installModalScrollGuard();
  const dialog = () => {
    const item = { open: false, closest: () => null, getClientRects: () => [1], showModal() { this.open=true;window.scrollY=0; } };
    dialogs.push(item);return item;
  };
  try { run({ document, window, values, sync: () => sync(), dialog }); }
  finally {
    cleanup();
    for (const [key,descriptor] of Object.entries(saved)) if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
  }
}
test("native focus scroll before MutationObserver cannot replace the original page position", () => fakeDocument(({document,window,values,sync,dialog}) => {
  const modal=dialog();openModalDialog(modal);sync();
  assert.equal(values.get('--modal-scroll-top'), '-450px');
  assert.equal(document.documentElement.dataset.modalScrollLocked, 'true');
  modal.open=false;sync();
  assert.equal(window.scrollY,450);assert.equal(window.scrollX,7);
}));
test("nested dialogs preserve the outer position until the final close", () => fakeDocument(({window,values,sync,dialog}) => {
  const outer=dialog(),inner=dialog();openModalDialog(outer);sync();openModalDialog(inner);sync();
  inner.open=false;sync();assert.equal(values.get('--modal-scroll-top'),'-450px');
  outer.open=false;sync();assert.equal(window.scrollY,450);
}));
test("a rejected native opening cannot leave the page permanently locked", () => fakeDocument(({document,window,dialog}) => {
  const modal=dialog();modal.showModal=()=>{throw Error('Native opening rejected');};
  assert.throws(()=>openModalDialog(modal),/Native opening rejected/);
  assert.equal(document.documentElement.dataset.modalScrollLocked,undefined);
  assert.equal(window.scrollY,450);
}));
