-- Migration: creation table horaires

CREATE TABLE IF NOT EXISTS `horaires` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `depart_station_id` INT NOT NULL,
  `arrivee_station_id` INT NOT NULL,
  `depart_time` TIME NOT NULL,
  `arrivee_time` TIME NOT NULL,
  `numero_train` VARCHAR(64) DEFAULT NULL,
  `type_train` VARCHAR(128) DEFAULT NULL,
  `materiel_id` INT DEFAULT NULL,
  `stops` JSON DEFAULT NULL,
  `is_substitution` TINYINT(1) DEFAULT 0,
  `jours_circulation` JSON DEFAULT NULL,
  `circulent_jours_feries` TINYINT(1) DEFAULT 0,
  `circulent_dimanches` TINYINT(1) DEFAULT 0,
  `jours_personnalises` JSON DEFAULT NULL,
  `meta` JSON DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX (`depart_time`),
  INDEX (`depart_station_id`),
  INDEX (`arrivee_station_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: FK constraints to stations/materiel are intentionally omitted for simplicity; add if desired.
