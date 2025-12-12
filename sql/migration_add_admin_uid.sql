-- filepath: c:\Users\MrPatator\Documents\Développement\Ferrovia-TER\sql\migration_add_admin_uid.sql
-- Migration: ajouter la colonne admin_uid dans la table users
-- Méthode compatible MySQL : vérifier information_schema et exécuter l'ALTER TABLE seulement si nécessaire

-- Attention : exécutez ce script contre la base de données cible (USE <db> si besoin)

SET @exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'admin_uid'
);

SET @sql := IF(@exists = 0,
  'ALTER TABLE users ADD COLUMN admin_uid VARCHAR(36) NULL UNIQUE AFTER role',
  'SELECT "admin_uid column already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Note : certains clients MySQL afficheront la ligne 'admin_uid column already exists' si la colonne est déjà présente.
-- Si vous préférez une version simple (qui échouera si la colonne existe), remplacez par :
-- ALTER TABLE users ADD COLUMN admin_uid VARCHAR(36) NULL UNIQUE AFTER role;
