-- Migration: ajouter colonnes depart_station_code et arrivee_station_code à la table horaires
USE ferrovia_ter_bfc;

-- Ajouter colonnes code pour référencer les codes de gares (CHAR(3))
ALTER TABLE horaires
  ADD COLUMN IF NOT EXISTS depart_station_code CHAR(3) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS arrivee_station_code CHAR(3) DEFAULT NULL;

-- Indexer ces colonnes pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_depart_station_code ON horaires (depart_station_code);
CREATE INDEX IF NOT EXISTS idx_arrivee_station_code ON horaires (arrivee_station_code);

-- Note: certains moteurs MySQL plus anciens n'acceptent pas IF NOT EXISTS sur ADD COLUMN ou CREATE INDEX;
-- adaptez la migration selon votre SGBD avant exécution.

