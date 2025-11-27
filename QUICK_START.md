# 🚀 Guide de Démarrage Rapide - Système d'Authentification

## ⚡ Installation en 5 minutes

### 1. Installer MySQL (si nécessaire)

**Windows :**
- Téléchargez [XAMPP](https://www.apachefriends.org/) ou [MySQL Community Server](https://dev.mysql.com/downloads/mysql/)
- Démarrez le service MySQL

**Vérifier que MySQL fonctionne :**
```powershell
mysql --version
```

### 2. Créer la base de données

**Option A : Avec phpMyAdmin (XAMPP)**
1. Ouvrez http://localhost/phpmyadmin
2. Cliquez sur "Nouveau" pour créer une base de données
3. Nommez-la `ferrovia_ter`
4. Allez dans l'onglet "SQL"
5. Copiez le contenu de `sql/schema.sql` et exécutez-le

**Option B : En ligne de commande**
```powershell
# Se connecter à MySQL
mysql -u root -p

# Dans le terminal MySQL :
CREATE DATABASE ferrovia_ter CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ferrovia_ter;
source C:/Users/MrPatator/Documents/Développement/Ferrovia-TER/sql/schema.sql
exit;
```

### 3. Configurer les variables d'environnement

Le fichier `.env.local` existe déjà. Modifiez-le si nécessaire :

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=votre_mot_de_passe
DB_NAME=ferrovia_ter
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=changez_moi
```

### 4. Tester la connexion à la base de données

```powershell
npm run test:db
```

Si tout est OK, vous verrez : ✅ Connexion réussie à MySQL !

### 5. Démarrer l'application

```powershell
npm run dev
```

Ouvrez http://localhost:3000

## 🎯 Test du système

### Créer un compte
1. Allez sur http://localhost:3000
2. Cliquez sur "Connexion" dans le header
3. Cliquez sur "Créer un compte"
4. Remplissez le formulaire (email, mot de passe, nom, prénom minimum)
5. Validez

### Se connecter
1. Sur la page de connexion, entrez votre email et mot de passe
2. Cliquez sur "Se connecter"
3. Vous êtes redirigé vers l'accueil
4. Le header affiche "Bonjour, [Prénom]"

### Voir son profil
1. Une fois connecté, allez sur http://localhost:3000/profil
2. Vous verrez toutes vos informations

### Se déconnecter
1. Cliquez sur "Déconnexion" dans le header

## 📁 Fichiers créés

### Pages
- `/src/app/se-connecter/page.js` - Page de connexion
- `/src/app/inscription/page.js` - Page d'inscription
- `/src/app/profil/page.js` - Page de profil (protégée)

### API Routes
- `/src/app/api/auth/register/route.js` - Inscription
- `/src/app/api/auth/login/route.js` - Connexion
- `/src/app/api/auth/logout/route.js` - Déconnexion
- `/src/app/api/auth/me/route.js` - Infos utilisateur

### Utilitaires
- `/src/lib/db.js` - Connexion MySQL
- `/src/lib/useAuth.js` - Hook d'authentification
- `/src/lib/test-db.js` - Script de test

### Base de données
- `/sql/schema.sql` - Schéma de la base de données

## 🔐 Sécurité

- ✅ Mots de passe hachés avec bcrypt
- ✅ Sessions sécurisées (7 jours)
- ✅ Validation des données
- ✅ Protection contre les injections SQL
- ✅ Cookies HTTP-only

## 🛠️ Personnalisation

### Protéger une page

```javascript
import { withAuth } from '@/lib/useAuth';

function MaPage({ user }) {
  return <div>Bonjour {user.prenom}</div>;
}

export default withAuth(MaPage);
```

### Utiliser l'authentification dans un composant

```javascript
import { useAuth } from '@/lib/useAuth';

export default function MonComposant() {
  const { user, loading, logout } = useAuth();
  
  if (loading) return <div>Chargement...</div>;
  if (!user) return <div>Non connecté</div>;
  
  return (
    <div>
      <p>Bonjour {user.prenom}</p>
      <button onClick={logout}>Déconnexion</button>
    </div>
  );
}
```

## ❓ Problèmes courants

### "Cannot connect to MySQL"
- Vérifiez que MySQL est démarré
- Vérifiez les informations dans `.env.local`
- Testez avec `npm run test:db`

### "Table users doesn't exist"
- Exécutez le script `sql/schema.sql`
- Vérifiez que la base de données `ferrovia_ter` existe

### "Session invalide" après connexion
- Videz les cookies du navigateur
- Redémarrez le serveur Next.js

### Mot de passe oublié
Pour l'instant, il faut le réinitialiser manuellement dans la base de données.
Un système de récupération par email peut être ajouté plus tard.

## 📚 Documentation complète

Consultez `AUTH_README.md` pour la documentation complète.

## 🎉 Félicitations !

Votre système d'authentification est opérationnel ! 🚀

