import { passwordStrength } from "./password-policy.js";
self.onmessage = ({ data }) => {
  // Only the estimate returns to the UI. Nothing is persisted or fetched.
  const { id, password, email } = data;
  self.postMessage({ id, result: passwordStrength(password, email) });
};
