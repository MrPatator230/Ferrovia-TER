-- Migration: Ajout de la table services_annuels et du champ dans horaires
-- Base de données: horaires

USE horaires;

-- Table des services annuels
CREATE TABLE IF NOT EXISTS services_annuels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL COMMENT 'Nom du service annuel (ex: "Service Été 2025")',
    date_debut DATE NOT NULL COMMENT 'Date de début du service annuel',
    date_fin DATE NOT NULL COMMENT 'Date de fin du service annuel',
    description TEXT DEFAULT NULL COMMENT 'Description optionnelle du service annuel',
    actif BOOLEAN DEFAULT TRUE COMMENT 'Indique si le service annuel est actif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_date_debut (date_debut),
    INDEX idx_date_fin (date_fin),
    INDEX idx_actif (actif)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ajouter le champ service_annuel_id dans la table horaires
ALTER TABLE horaires
ADD COLUMN service_annuel_id INT DEFAULT NULL COMMENT 'Référence au service annuel',
ADD CONSTRAINT fk_horaires_service_annuel
    FOREIGN KEY (service_annuel_id)
    REFERENCES services_annuels(id)
    ON DELETE SET NULL;

-- Créer un index sur service_annuel_id
CREATE INDEX idx_service_annuel ON horaires(service_annuel_id);

