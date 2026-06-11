ALTER TABLE `users`
  ADD COLUMN `identity_document_type` VARCHAR(32) NULL,
  ADD COLUMN `identity_document_number` VARCHAR(64) NULL,
  ADD COLUMN `identity_document_name` VARCHAR(191) NULL,
  ADD COLUMN `identity_document_data_url` LONGTEXT NULL,
  ADD COLUMN `identity_document_uploaded_at` DATETIME(3) NULL;

