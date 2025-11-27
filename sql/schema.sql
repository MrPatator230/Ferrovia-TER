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

-- Exemple: créer un utilisateur admin (remplacez le mot_de_passe_par_hash par un mot de passe haché, p.ex. bcrypt)
-- INSERT INTO users (email, password, nom, prenom, role) VALUES ('admin@example.com', '<mot_de_passe_par_hash>', 'Admin', 'SNCF', 'admin');

-- Vous pouvez créer un compte admin depuis l'application en utilisant l'endpoint d'enregistrement
-- et en attribuant le champ role = 'admin' côté base de données ou via une migration sécurisée.
