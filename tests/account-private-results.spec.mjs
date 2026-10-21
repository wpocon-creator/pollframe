import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { MATCH_QUESTIONS } from "../src/party-match-data.js";
import { calculateMatches } from "../src/party-match-model.js";
import { resultDocument } from "../src/party-match-design.js";

test("local account: result upload is separate and consensual, export works, withdrawal preserves local copies", async ({
  page,
}, info) => {
  const answers = Object.fromEntries(
    MATCH_QUESTIONS.map((q, i) => [q.id, { value: (i % 3) - 1 }]),
  );
  const doc = resultDocument(calculateMatches(answers), 30, "de", {
    answers,
    questions: MATCH_QUESTIONS,
  });
  await page.goto("/?view=studio&lang=de&topic=current");
  await page.evaluate(async (doc) => {
    const { savePrivateResult } = await import("/src/party-match-storage.js");
    await savePrivateResult(
      "Mein privater Test",
      doc,
      { style: "editorial" },
      null,
      true,
    );
  }, doc);
  const requests = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/account/private-results"))
      requests.push(request.method());
  });
  await page.locator(".account-entry").click();
  const dialog = page.getByRole("dialog", { name: "Dein Pollframe-Konto" });
  const email = `private-${info.project.name}-${Date.now()}@example.test`,
    password = "A local test passphrase for personal results";
  await dialog.getByLabel("Test-E-Mail").fill(email);
  await dialog
    .getByRole("button", { name: "Mit E-Mail weiter", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Code übernehmen", exact: true })
    .first()
    .click();
  await dialog
    .getByRole("button", { name: "Code bestätigen", exact: true })
    .click();
  await dialog.locator(".account-display-name summary").click();
  await dialog.getByLabel("Anzeigename").fill("Testkonto");
  await dialog.getByLabel("Passwort", { exact: true }).fill(password);
  await dialog
    .getByRole("button", { name: "Testkonto erstellen", exact: true })
    .click();
  await expect(dialog).toContainText("Angemeldet als");
  await dialog
    .getByRole("button", {
      name: "Lokale Designs und Stile im Konto sichern",
      exact: true,
    })
    .click();
  await expect(dialog.getByRole("status")).toContainText(
    "0 Designs und 0 Stile",
  );
  expect(requests).toEqual([]);
  const panel = dialog.locator(".account-private-results");
  await panel.locator("summary").click();
  const save = panel.getByRole("button", {
    name: "Nur dieses Ergebnis im Konto sichern",
  });
  await expect(save).toBeDisabled();
  await panel.getByRole("combobox").click();
  await dialog
    .getByRole("option", { name: "Mein privater Test", exact: true })
    .click();
  await expect(panel.getByRole("checkbox")).not.toBeChecked();
  await expect(save).toBeDisabled();
  await panel.getByRole("checkbox").check();
  await save.click();
  await expect(panel.locator(".studio-account-documents")).toContainText(
    "Mein privater Test",
  );
  await expect(panel.getByRole("checkbox")).not.toBeChecked();
  expect(requests.filter((method) => method === "PUT")).toHaveLength(1);
  // Large text + narrow screen: check the actual expanded account panel.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => (document.documentElement.style.fontSize = "22px"));
  expect(
    await dialog.evaluate((el) => el.scrollWidth - el.clientWidth),
  ).toBeLessThan(3);
  await panel.locator("summary").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: info.outputPath("private-account-mobile-large.png"),
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => (document.documentElement.style.fontSize = ""));
  const management = dialog
    .locator(".studio-account-management")
    .filter({ has: page.locator("summary", { hasText: "Konto verwalten" }) });
  await management.locator("summary").click();
  const download = page.waitForEvent("download");
  await management
    .getByRole("button", { name: "Kontodaten herunterladen", exact: true })
    .click();
  const exportFile = JSON.parse(
    await readFile(await (await download).path(), "utf8"),
  );
  expect(exportFile.privateResults).toHaveLength(1);
  expect(exportFile.privateResults[0].payload.document.rows).toHaveLength(7);
  expect(exportFile.privateResults[0].payload.document.answers).toBeUndefined();
  page.once("dialog", (dialog) => dialog.accept());
  await panel
    .getByRole("button", {
      name: "Zustimmung widerrufen & alle Konto-Ergebnisse löschen",
      exact: true,
    })
    .click();
  await expect(panel).toContainText("Keine persönlichen Ergebnisse im Konto.");
  expect(
    await page.evaluate(async () => {
      const { listPrivateResults } = await import(
        "/src/party-match-storage.js"
      );
      return (await listPrivateResults()).length;
    }),
  ).toBe(1);
  await dialog.getByRole("button", { name: "Abmelden", exact: true }).click();
  await expect(panel).toHaveCount(0);
});
