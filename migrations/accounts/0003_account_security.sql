ALTER TABLE "user" ADD COLUMN "twoFactorEnabled" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "twoFactor" (
  id TEXT PRIMARY KEY NOT NULL,
  secret TEXT NOT NULL,
  backupCodes TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  verified INTEGER DEFAULT 1,
  failedVerificationCount INTEGER DEFAULT 0,
  lockedUntil DATE
);
CREATE UNIQUE INDEX twoFactor_userId ON twoFactor(userId);
CREATE INDEX twoFactor_secret ON twoFactor(secret);
CREATE TABLE account_notice (
  owner TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  notice TEXT NOT NULL CHECK(notice IN ('studio-guide-v1','feedback-v1')),
  shown_at TEXT NOT NULL,
  PRIMARY KEY(owner,notice)
);
