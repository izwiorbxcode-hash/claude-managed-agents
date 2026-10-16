-- Align `account` with the Better Auth 1.7 core schema.
--
-- 1.7 requires `issuer` and keys accounts on a unique (issuer, account_id)
-- index; the single `expires_at` column from the Phase-1 stub is replaced by
-- the separate access/refresh token expiry columns. SQLite cannot drop a
-- column inside a transaction-safe migration on older engines, so the legacy
-- column is left in place and simply ignored by the adapter.

ALTER TABLE `account` ADD COLUMN `issuer` text;
ALTER TABLE `account` ADD COLUMN `access_token_expires_at` integer;
ALTER TABLE `account` ADD COLUMN `refresh_token_expires_at` integer;
ALTER TABLE `account` ADD COLUMN `scope` text;

-- Backfill `issuer` from `provider_id` for rows created before this migration.
-- `credential` is the provider Better Auth uses for email+password accounts.
UPDATE `account` SET `issuer` = `provider_id` WHERE `issuer` IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS `account_issuer_account_id_unique`
  ON `account` (`issuer`, `account_id`);
CREATE INDEX IF NOT EXISTS `account_user_id_idx` ON `account` (`user_id`);