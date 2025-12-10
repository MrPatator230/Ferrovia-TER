-- Migration pour ajouter la table des événements
USE ferrovia_ter_bfc;

-- Table des événements
CREATE TABLE IF NOT EXISTS evenements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom_evenement VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    nom_bandeau VARCHAR(255),
    page_dediee TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    statut ENUM('actif', 'inactif', 'archive') DEFAULT 'actif',
    auteur_id INT,
    INDEX idx_statut (statut),
    FOREIGN KEY (auteur_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
