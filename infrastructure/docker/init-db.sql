-- Enable pgvector extension for semantic memory and embeddings
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verification notice
DO $$
BEGIN
  RAISE NOTICE 'Personal AI OS database initialized with vector and uuid-ossp extensions.';
END $$;
