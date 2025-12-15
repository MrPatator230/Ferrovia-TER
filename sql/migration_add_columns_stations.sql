-- Migration: ajouter colonnes `code` (CHAR(3)) et `correspondance` (JSON) à la table stations
USE ferrovia_ter_bfc;

-- Si la colonne `code` n'existe pas, l'ajouter
ALTER TABLE stations
  ADD COLUMN IF NOT EXISTS code CHAR(3) DEFAULT NULL;

-- Si la colonne `correspondance` n'existe pas, l'ajouter
ALTER TABLE stations
  ADD COLUMN IF NOT EXISTS correspondance JSON DEFAULT (JSON_ARRAY());

-- Note: certains moteurs MySQL plus anciens n'acceptent pas ADD COLUMN IF NOT EXISTS; adaptez la migration
-- à votre RDBMS si nécessaire. Vous pouvez exécuter manuellement des checks avant d'appliquer cette migration.

