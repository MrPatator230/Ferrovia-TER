-- Migration: Ajout de la colonne ligne_id dans la table horaires

USE horaires;

ALTER TABLE horaires
  ADD COLUMN ligne_id INT DEFAULT NULL COMMENT 'Référence à la ligne',
  ADD INDEX idx_ligne_id (ligne_id);

-- No FK added to keep things simple; add constraint if desired

