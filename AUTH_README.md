# Système d'Authentification - TER Bourgogne-Franche-Comté

## Configuration

### 1. Installation des dépendances

Les dépendances ont déjà été installées :
- `mysql2` : Pour la connexion à MySQL
- `bcryptjs` : Pour le hachage sécurisé des mots de passe
- `next-auth` : Pour la gestion des sessions

### 2. Configuration de la base de données

#### A. Créer la base de données MySQL

1. Ouvrez votre client MySQL (phpMyAdmin, MySQL Workbench, ou ligne de commande)
2. Exécutez le script SQL situé dans `sql/schema.sql`

**Via ligne de commande :**
```bash
mysql -u root -p < sql/schema.sql
```

**Via phpMyAdmin :**
- Créez une nouvelle base de données nommée `ferrovia_ter`
- Importez le fichier `sql/schema.sql`

#### B. Configurer les variables d'environnement

Le fichier `.env.local` a été créé à la racine du projet. Modifiez-le selon votre configuration :

```env
# Configuration de la base de données MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=votre_mot_de_passe_mysql
DB_NAME=ferrovia_ter

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=changez_ceci_par_une_chaine_aleatoire_securisee
```

**Important :** Générez une clé secrète aléatoire pour `NEXTAUTH_SECRET` en production :
```bash
openssl rand -base64 32
```

### 3. Structure de la base de données

#### Table `users`
- `id` : Identifiant unique (auto-incrémenté)
- `email` : Email unique de l'utilisateur
- `password` : Mot de passe haché
- `nom` : Nom de famille
- `prenom` : Prénom
- `telephone` : Numéro de téléphone (optionnel)
- `date_naissance` : Date de naissance (optionnel)
- `adresse` : Adresse complète (optionnel)
- `ville` : Ville (optionnel)
- `code_postal` : Code postal (optionnel)
- `created_at` : Date de création du compte
- `updated_at` : Date de dernière modification

#### Table `sessions`
- `id` : Identifiant unique
- `user_id` : Référence à l'utilisateur
- `session_token` : Token de session unique
- `expires` : Date d'expiration de la session
- `created_at` : Date de création de la session

## Utilisation

### Pages créées

1. **Page de connexion** : `/se-connecter`
   - Accessible via le bouton "Connexion" dans le header
   - Permet de se connecter avec email et mot de passe
   - Lien vers la page d'inscription

2. **Page d'inscription** : `/inscription`
   - Accessible depuis la page de connexion
   - Formulaire complet d'inscription
   - Validation des données côté client et serveur

### API Routes

#### POST `/api/auth/register`
Crée un nouveau compte utilisateur.

**Body :**
```json
{
  "email": "exemple@email.com",
  "password": "motdepasse123",
  "nom": "Dupont",
  "prenom": "Jean",
  "telephone": "0612345678",
  "date_naissance": "1990-01-01",
  "adresse": "123 rue Example",
  "ville": "Besançon",
  "code_postal": "25000"
}
```

#### POST `/api/auth/login`
Connecte un utilisateur existant.

**Body :**
```json
{
  "email": "exemple@email.com",
  "password": "motdepasse123"
}
```

#### POST `/api/auth/logout`
Déconnecte l'utilisateur actuel.

#### GET `/api/auth/me`
Récupère les informations de l'utilisateur connecté.

### Fonctionnalités du Header

Le header affiche dynamiquement :
- **Non connecté** : Bouton "Connexion" qui redirige vers `/se-connecter`
- **Connecté** : 
  - Message de bienvenue avec le prénom de l'utilisateur
  - Bouton "Déconnexion"

## Sécurité

### Mots de passe
- Hachage avec bcrypt (10 rounds)
- Validation de longueur minimum (6 caractères)
- Jamais stockés en clair

### Sessions
- Token unique généré pour chaque session
- Durée de 7 jours
- Stocké dans un cookie HTTP-only
- Vérification d'expiration automatique

### Validation
- Validation du format email
- Vérification de l'unicité de l'email
- Protection contre les injections SQL (requêtes paramétrées)

## Développement

### Lancer le serveur de développement

```bash
npm run dev
```

L'application sera accessible sur http://localhost:3000

### Tester le système

1. Créez un compte via `/inscription`
2. Connectez-vous via `/se-connecter`
3. Vérifiez que le header affiche votre prénom
4. Testez la déconnexion

## Production

### Avant de déployer :

1. Changez `NEXTAUTH_SECRET` avec une clé sécurisée
2. Configurez `DB_PASSWORD` avec un mot de passe fort
3. Mettez à jour `NEXTAUTH_URL` avec votre domaine
4. Activez HTTPS pour les cookies sécurisés
5. Configurez les sauvegardes de la base de données

### Variables d'environnement de production

```env
DB_HOST=votre_serveur_mysql
DB_USER=votre_utilisateur
DB_PASSWORD=mot_de_passe_securise
DB_NAME=ferrovia_ter
NEXTAUTH_URL=https://votre-domaine.com
NEXTAUTH_SECRET=cle_secrete_aleatoire_longue
NODE_ENV=production
```

## Améliorations futures possibles

- [ ] Récupération de mot de passe par email
- [ ] Vérification d'email
- [ ] Authentification OAuth (Google, Facebook)
- [ ] Authentification à deux facteurs (2FA)
- [ ] Gestion de profil utilisateur
- [ ] Historique de connexions
- [ ] Limitation du nombre de tentatives de connexion
- [ ] Page de profil utilisateur
- [ ] Modification des informations personnelles

## Support

Pour toute question ou problème, consultez la documentation de :
- [Next.js](https://nextjs.org/docs)
- [MySQL](https://dev.mysql.com/doc/)
- [bcryptjs](https://www.npmjs.com/package/bcryptjs)

