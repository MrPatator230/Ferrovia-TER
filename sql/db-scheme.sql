-- Schéma complet pour la base de données `horaires`
-- Usage: mysql -u <user> -p < sql/db-scheme.sql

-- Crée la base si nécessaire
CREATE DATABASE IF NOT EXISTS `horaires` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `horaires`;

-- Table principale: horaires
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
  INDEX `idx_depart_time` (`depart_time`),
  INDEX `idx_depart_station` (`depart_station_id`),
  INDEX `idx_arrivee_station` (`arrivee_station_id`),
  INDEX `idx_numero_train` (`numero_train`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table optionnelle: historiques de modifications (audit)
CREATE TABLE IF NOT EXISTS `horaires_audit` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `horaire_id` INT NOT NULL,
  `action` VARCHAR(32) NOT NULL,
  `payload` JSON DEFAULT NULL,
  `actor` VARCHAR(128) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX (`horaire_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: lignes (gestion des lignes de transport)
CREATE TABLE IF NOT EXISTS `lignes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nom` VARCHAR(255) NOT NULL,
  `code` VARCHAR(64) DEFAULT NULL,
  `stops` JSON DEFAULT NULL, -- tableau d'objets { station_id, ordre }
  `communications` JSON DEFAULT NULL, -- messages/infos affichables
  `meta` JSON DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_nom` (`nom`),
  INDEX `idx_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notes:
-- - Les tables `stations` et autres référentielles restent dans la BDD principale (ex: `ferrovia_ter_bfc`).
-- - Les colonnes `depart_station_id` et `arrivee_station_id` sont des entiers faisant référence aux ids de la BDD principale.
-- - Les contraintes de clé étrangère ne sont pas ajoutées ici car elles impliqueraient une relation inter-base; si vous migrez les référentielles vers cette DB, ajoutez les FOREIGN KEY appropriées.

-- Exemple d'insertion (facultatif)
-- INSERT INTO `horaires` (depart_station_id, arrivee_station_id, depart_time, arrivee_time, numero_train) VALUES (1, 2, '08:30:00', '09:10:00', '12345');
