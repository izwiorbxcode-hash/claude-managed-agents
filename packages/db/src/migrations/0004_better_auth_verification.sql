-- Better Auth `verification` table (email verification + password reset
-- tokens). `user`, `session`, and `account` already exist from 0000; this
-- migration adds the only remaining table the auth adapter requires.

CREATE TABLE IF NOT EXISTS `verification` (
  `id` text PRIMARY KEY NOT NULL,
  `identifier` text NOT NULL,
  `value` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
CREATE INDEX IF NOT EXISTS `verification_identifier_idx` ON `verification` (`identifier`);