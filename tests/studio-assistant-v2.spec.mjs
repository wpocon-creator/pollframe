import { test, expect } from "@playwright/test";
test.skip(process.env.POLLFRAME_ASSISTANT_EXPERIMENT !== '1', 'Parked assistant: run only against an explicitly enabled local development server.');
test("compound edits, quoted copy, conversational referents and safe clarification stay local", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "chromium-desktop");
  const inference = [];
  page.on("request", (r) => {
    if (
      /studio-assistant|huggingface|openai|anthropic/.test(r.url()) &&
      !r.url().includes("/assets/")
    )
      inference.push(r.url());
  });
  await page.goto(
    "/?view=studio&lang=de&template=poll-wide&topic=current&editor=1&workspace=edit&theme=dark",
  );
  await expect(page.locator(".studio-current-preview-image svg")).toBeVisible();
  await page.getByRole("button", { name: "KI-Assistent", exact: true }).click();
  const chat = page.locator(".studio-assistant");
  const state = async () =>
    JSON.parse(
      await page
        .locator("[data-assistant-state]")
        .getAttribute("data-assistant-state"),
    );
  const send = async (text) => {
    await chat.getByRole("textbox").fill(text);
    await chat.getByRole("button", { name: "Senden", exact: true }).click();
    await expect(
      chat.getByRole("button", { name: "Senden", exact: true }),
    ).toBeVisible();
  };
  await send("Schriftgröße 42, Schrift Lora, Hintergrund dunkel");
  await expect.poll(async () => (await state()).titleSize).toBe(42);
  await send("Noch etwas größer");
  await expect.poll(async () => (await state()).titleSize).toBe(48);
  await send('Titel: "Dunkle Zeiten für die Regierung"');
  await expect
    .poll(async () => (await state()).headline)
    .toBe("Dunkle Zeiten für die Regierung");
  expect((await state()).template).toBe("poll-wide");
  const before = await state();
  await page.context().setOffline(true);
  await send("Font Lora and add a unicorn");
  await expect(chat).toContainText("nichts geändert");
  expect(await state()).toEqual(before);
  await send("Schriftgröße 52");
  await expect.poll(async () => (await state()).titleSize).toBe(52);
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  expect((await state()).titleSize).toBe(48);
  await send("Noch größer");
  await expect(chat).toContainText("Was soll größer");
  expect((await state()).titleSize).toBe(48);
  expect(inference).toEqual([]);
  await page.screenshot({ path: info.outputPath("assistant-v2-dark.png") });
});
