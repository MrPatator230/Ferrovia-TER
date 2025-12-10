-- Migration pour ajouter la table des actualités
USE ferrovia_ter_bfc;

-- Table des actualités
CREATE TABLE IF NOT EXISTS actualites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    resume TEXT,
    image_couverture VARCHAR(512),
    pieces_jointes JSON,
    date_publication DATE NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    statut ENUM('brouillon', 'publie', 'archive') DEFAULT 'publie',
    auteur_id INT,
    INDEX idx_date_publication (date_publication),
    INDEX idx_statut (statut),
    FOREIGN KEY (auteur_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
