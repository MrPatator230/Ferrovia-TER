-- Migration: Ajout de la table lignes
-- Base de données: horaires

USE horaires;

-- Table des lignes de train
CREATE TABLE IF NOT EXISTS lignes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL COMMENT 'Nom de la ligne (ex: Dijon - Besançon)',
    code VARCHAR(50) DEFAULT NULL COMMENT 'Code de la ligne (ex: L01)',
    couleur VARCHAR(7) DEFAULT NULL COMMENT 'Couleur de la ligne en hexadécimal (ex: #0b7d48)',
    description TEXT DEFAULT NULL COMMENT 'Description de la ligne',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nom (nom),
    INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insérer quelques lignes d'exemple
INSERT INTO lignes (nom, code, couleur, description) VALUES
('Dijon - Besançon', 'L01', '#E4007F', 'Ligne principale Dijon - Besançon via Dole'),
('Dijon - Lyon', 'L02', '#0b7d48', 'Ligne Dijon - Lyon Part-Dieu'),
('Besançon - Belfort', 'L03', '#FF8C00', 'Ligne Besançon Viotte - Belfort'),
('Dijon - Auxerre', 'L04', '#1E90FF', 'Ligne Dijon - Auxerre - Paris'),
('Bourg-en-Bresse - Dijon', 'L05', '#FFdd00', 'Ligne Bourg-en-Bresse - Seurre - Dijon')
ON DUPLICATE KEY UPDATE nom=VALUES(nom);

