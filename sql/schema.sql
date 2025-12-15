-- Schéma de la base de données pour le système d'authentification
-- Base de données: ferrovia_ter

CREATE DATABASE IF NOT EXISTS ferrovia_ter_bfc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE ferrovia_ter_bfc;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    telephone VARCHAR(20),
    date_naissance DATE,
    adresse TEXT,
    ville VARCHAR(100),
    code_postal VARCHAR(10),
    role ENUM('user','admin') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des sessions (optionnel pour NextAuth)
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    expires TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_token (session_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des matériels roulants
CREATE TABLE IF NOT EXISTS materiel_roulant (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    nom_technique VARCHAR(255) DEFAULT NULL,
    capacite INT UNSIGNED DEFAULT 0,
    image_path VARCHAR(512) DEFAULT NULL,
    type_train VARCHAR(100) NOT NULL,
    exploitant VARCHAR(100) DEFAULT NULL,
    numero_serie CHAR(5) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type_train (type_train)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des gares
CREATE TABLE IF NOT EXISTS stations (
                                        id INT AUTO_INCREMENT PRIMARY KEY,
                                        nom VARCHAR(255) NOT NULL,
    type_gare ENUM('interurbaine', 'ville') NOT NULL DEFAULT 'ville',
    service JSON NOT NULL COMMENT 'Liste des services: TER, TGV, Intercités, Fret',
    quais JSON NOT NULL COMMENT 'Liste des quais avec nom et distance',
    transports_commun JSON NOT NULL COMMENT 'Liste des transports en commun avec type et couleur',
    code CHAR(3) DEFAULT NULL,
    correspondance JSON DEFAULT JSON_ARRAY(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nom (nom),
    INDEX idx_type_gare (type_gare)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des informations trafic
CREATE TABLE IF NOT EXISTS info_trafic (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(512) NOT NULL,
    description LONGTEXT NOT NULL,
    type ENUM('information','travaux','alerte','administration') NOT NULL DEFAULT 'information',
    date_debut DATE DEFAULT NULL,
    date_fin DATE DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_date_debut (date_debut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exemple: créer un utilisateur admin (remplacez le mot_de_passe_par_hash par un mot de passe haché, p.ex. bcrypt)
-- INSERT INTO users (email, password, nom, prenom, role) VALUES ('admin@example.com', '<mot_de_passe_par_hash>', 'Admin', 'SNCF', 'admin');

-- Vous pouvez créer un compte admin depuis l'application en utilisant l'endpoint d'enregistrement
-- et en attribuant le champ role = 'admin' côté base de données ou via une migration sécurisée.
