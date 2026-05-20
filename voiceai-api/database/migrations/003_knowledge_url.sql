-- Make gcs_path nullable and add url column for Knowledge Base
ALTER TABLE knowledge_documents ALTER COLUMN gcs_path DROP NOT NULL;
ALTER TABLE knowledge_documents ADD COLUMN url TEXT;
