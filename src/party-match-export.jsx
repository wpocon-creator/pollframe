import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./pollframe-ui.jsx";
import { localText } from "./party-match-data.js";
import {
  resultDocument,
  normalizeMatchDesign,
  renderMatchPng,
  renderMatchSvg,
  MATCH_DESIGNS,
} from "./party-match-design.js";
import GraphicFileOptions from "./graphic-file-options.jsx";
import { graphicFile } from "./graphic-file.js";

export function MatchDialog({
  title,
  closeLabel,
  onClose,
  children,
  returnFocus,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const trigger = returnFocus || document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="pm-dialog"
      aria-label={title}
      onKeyDown={(event) => {
        if (event.key === "Escape") event.stopPropagation();
        if (
          event.key !== "Tab" ||
          event.ctrlKey ||
          event.altKey ||
          event.metaKey
        )
          return;
        event.stopPropagation();
        // Chromium can tab from a native dialog into browser chrome; explicitly
        // cycle the ends so keyboard use is consistent with Firefox and touch.
        const controls = [
          ...event.currentTarget.querySelectorAll(
            "button, a[href], input, select, textarea, [tabindex]",
          ),
        ].filter(
          (el) =>
            el.tabIndex >= 0 &&
            !el.disabled &&
            el.getClientRects().length &&
            getComputedStyle(el).visibility !== "hidden",
        );
        const first = controls[0],
          last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(e) => {
        // React propagates a nested info dialog's cancel event to this handler.
        // Escape must close only that topmost dialog, not the arguments beneath it.
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const r = e.currentTarget.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button
          className="pm-icon-button"
          onClick={onClose}
          aria-label={closeLabel}
          autoFocus
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="pm-dialog-content">{children}</div>
    </dialog>
  );
}

// Dedicated layout, not a screenshot of responsive DOM. The preview and download
// use the SAME PNG blob. No images, fonts, answers or results are fetched/uploaded.
export async function createMatchPng(options) {
  const documentRecord =
    options.document ||
    resultDocument(options.result, options.length, options.locale);
  const design = normalizeMatchDesign({
    ...options.design,
    format: options.format ?? options.design?.format,
    dark: options.dark ?? options.design?.dark,
  });
  return renderMatchPng(documentRecord, design);
}

export function MatchExport({
  result,
  length,
  document: documentRecord,
  design: inputDesign,
  locale,
  c,
  onClose,
}) {
  const [format, setFormat] = useState(inputDesign?.format || "square");
  const [fileType, setFileType] = useState("png");
  const [style, setStyle] = useState(inputDesign?.style || "pollframe");
  const [dark, setDark] = useState(
    () =>
      inputDesign?.dark ??
      (document.documentElement.dataset.theme === "dark" ||
        document.body.dataset.theme === "dark" ||
        (document.documentElement.dataset.theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)),
  );
  const [asset, setAsset] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [sharing, setSharing] = useState(false);
  useEffect(() => {
    let cancelled = false,
      url;
    setAsset(null);
    setError(false);
    createMatchPng({
      result,
      length,
      document: documentRecord,
      design: { ...inputDesign, style },
      locale,
      c,
      format,
      dark,
    })
      .then(async (blob) => {
        if (cancelled) return;
        const exportDesign = normalizeMatchDesign({...inputDesign, style, format, dark});
        const record = documentRecord || resultDocument(result, length, locale);
        const vector = fileType === "svg" ? (await renderMatchSvg(record, exportDesign)).svg : null;
        const file = await graphicFile({blob, filename: `wahlframe-${format}.png`}, fileType, vector);
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setAsset({ blob: file.blob, url, fileType, format, dark, style, inputDesign });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [
    result,
    length,
    documentRecord,
    inputDesign,
    locale,
    format,
    dark,
    style,
    attempt,
    fileType,
  ]);
  const ready = asset && asset.fileType === fileType && asset.format === format && asset.dark === dark && asset.style === style && asset.inputDesign === inputDesign;
  const filename = `pollframe-positions-2025-${format}-${dark ? "dark" : "light"}.${fileType}`;
  const file = ready
    ? new File([asset.blob], filename, { type: asset.blob.type })
    : null;
  let canShare = false;
  try {
    canShare =
      !!file &&
      typeof navigator.share === "function" &&
      !!navigator.canShare?.({ files: [file] });
  } catch {
    /* Download remains available. */
  }
  const download = () => {
    if (!ready) return;
    const url = URL.createObjectURL(asset.blob),
      a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    // Safari may consume a download after the click handler returns.
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  const share = () => {
    if (!file || sharing) return;
    setSharing(true);
    navigator
      .share({ files: [file] })
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      })
      .finally(() => setSharing(false));
  };
  return (
    <MatchDialog
      title={c("exportTitle").replace("PNG", fileType.toUpperCase())}
      closeLabel={c("close")}
      onClose={onClose}
    >
      <GraphicFileOptions value={fileType} onChange={setFileType} locale={locale} vector />
      <div className="pm-export-controls">
        <fieldset>
          <legend>{c("style")}</legend>
          {MATCH_DESIGNS.filter(
            (item) => item.graphic === (inputDesign?.graphic || "ranking"),
          ).map((item) => (
            <label key={item.id}>
              <input
                type="radio"
                name="export-style"
                checked={style === item.id}
                onChange={() => setStyle(item.id)}
              />
              {localText(item.name, locale)}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>
            {locale === "de"
              ? "Format"
              : locale === "es"
                ? "Formato"
                : "Format"}
          </legend>
          {["square", "portrait", "wide"].map((value) => (
            <label key={value}>
              <input
                type="radio"
                name="export-format"
                checked={format === value}
                onChange={() => setFormat(value)}
              />
              {c(value)}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>
            {locale === "de"
              ? "Darstellung"
              : locale === "es"
                ? "Aspecto"
                : "Appearance"}
          </legend>
          {[false, true].map((value) => (
            <label key={String(value)}>
              <input
                type="radio"
                name="export-theme"
                checked={dark === value}
                onChange={() => setDark(value)}
              />
              {c(value ? "dark" : "light")}
            </label>
          ))}
        </fieldset>
      </div>
      <div className="pm-export-preview">
        {ready ? (
          <img
            src={asset.url}
            alt={c("resultsTitle")}
            width={
              format === "portrait" ? 1080 : format === "wide" ? 1600 : 1200
            }
            height={
              format === "portrait" ? 1350 : format === "wide" ? 1000 : 1200
            }
          />
        ) : (
          <p role="status">{c(error ? "exportError" : "rendering")}</p>
        )}
      </div>
      {error && (
        <p role="alert">
          {c("exportError")}{" "}
          <button
            className="pm-text-button"
            onClick={() => setAttempt((v) => v + 1)}
          >
            {c("retry")}
          </button>
        </p>
      )}
      <p className="pm-small">{c("exportPrivacy")}</p>
      <div className="pm-actions">
        <button className="pm-primary" onClick={download} disabled={!ready}>
          <Icon name="download" />
          {c("download").replace("PNG", fileType.toUpperCase())}
        </button>
        {canShare && (
          <button className="pm-secondary" onClick={share} disabled={sharing}>
            <Icon name="share" />
            {fileType === "png" ? c("share") : locale === "de" ? "Datei teilen" : locale === "es" ? "Compartir archivo" : "Share file"}
          </button>
        )}
      </div>
    </MatchDialog>
  );
}
