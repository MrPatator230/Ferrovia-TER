-- Migration: Ajout de la table fiches_horaires
-- Base de données: horaires

USE horaires;

-- Table des fiches horaires
CREATE TABLE IF NOT EXISTS fiches_horaires (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL COMMENT 'Nom de la fiche horaire',
    service_annuel_id INT NOT NULL COMMENT 'Référence au service annuel',
    type_fiche ENUM('SA', 'Travaux', 'Aménagement Spécial') NOT NULL DEFAULT 'SA' COMMENT 'Type de fiche horaire',
    design_region VARCHAR(100) NOT NULL DEFAULT 'Bourgogne - Franche-Comté' COMMENT 'Région pour le design de la fiche',
    ligne_id INT DEFAULT NULL COMMENT 'Référence à la ligne concernée',
    afficher_page_recherche BOOLEAN DEFAULT FALSE COMMENT 'Afficher sur la page de recherche',
    pdf_path VARCHAR(512) DEFAULT NULL COMMENT 'Chemin du fichier PDF généré',
    statut ENUM('brouillon', 'généré', 'publié') NOT NULL DEFAULT 'brouillon' COMMENT 'Statut de la fiche',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_annuel_id) REFERENCES services_annuels(id) ON DELETE CASCADE,
    INDEX idx_service_annuel (service_annuel_id),
    INDEX idx_type_fiche (type_fiche),
    INDEX idx_afficher_page_recherche (afficher_page_recherche),
    INDEX idx_statut (statut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

