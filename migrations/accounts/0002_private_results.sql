-- Separate sensitive storage: names, results, designs and consent receipts are
-- application-encrypted; ownership is enforced on every query by the Worker.
CREATE TABLE private_result (
  id TEXT NOT NULL,
  owner TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  nonce TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(owner,id)
);
CREATE INDEX private_result_owner_updated ON private_result(owner,updated_at);
