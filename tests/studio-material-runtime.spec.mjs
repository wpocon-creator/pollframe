import { test, expect } from "@playwright/test";
test.skip(
  !process.env.POLLFRAME_ELECTION_RUNTIME,
  "Explicit local Worker and production CSP check",
);
test.use({ serviceWorkers: "block" });
test("plain party-colour 3D and PNG work under the actual browser security policy", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/?view=studio&editor=1&template=poll-material&profile=current-poll&lang=de&parties=1,2,4",
  );
  await expect(
    page.locator(".studio-current-preview-image [data-render-ready]"),
  ).toHaveAttribute("data-render-ready", "true", { timeout: 90000 });
  const download = page.waitForEvent("download", { timeout: 15000 });
  await page
    .getByRole("button", { name: "PNG herunterladen", exact: true })
    .click();
  await page.locator("dialog[open]").getByRole("button",{name:"PNG herunterladen",exact:true}).click();
  await (await download).saveAs(info.outputPath("material-csp.png"));
  expect(errors).toEqual([]);
});
