// Deployment choices, never a hostname supplied by a request or forwarded header.
import { TEST_SITE_ORIGIN } from "../src/site-origin.js";
export const ACCOUNT_ORIGIN = "https://pollframe.com";
export const ACCOUNT_PREVIEW_ORIGIN =
  "https://pollframe-accounts-preview.pollframe.workers.dev";
export function checkedAccountOrigin(value = ACCOUNT_ORIGIN) {
  if (
    ![ACCOUNT_ORIGIN, ACCOUNT_PREVIEW_ORIGIN, TEST_SITE_ORIGIN].includes(value)
  )
    throw Error("Unsupported account origin");
  return value;
}
