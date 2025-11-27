# 📐 Architecture Complète - Système d'Authentification

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION FERROVIA-TER                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Header    │  │ NavigationBar │  │   Pages      │      │
│  │             │  │               │  │              │      │
│  │  Logo +     │  │  Menus +      │  │ - Accueil    │      │
│  │  Titre      │  │  UserMenu ◄───┼──┤ - Connexion  │      │
│  └─────────────┘  └──────┬────────┘  │ - Inscription│      │
│                          │           │ - Profil     │      │
│                          │           └──────────────┘      │
│                          ▼                                  │
│                   ┌──────────────┐                          │
│                   │  UserMenu    │                          │
│                   ├──────────────┤                          │
│                   │ useAuth() ◄──┼────┐                     │
│                   └──────────────┘    │                     │
│                                       │                     │
├───────────────────────────────────────┼─────────────────────┤
│                  API ROUTES           │                     │
│                                       │                     │
│  ┌────────────────────────────────────┼──────────┐         │
│  │  /api/auth/                        │          │         │
│  │  ├── register  (POST)              │          │         │
│  │  ├── login     (POST) ◄────────────┘          │         │
│  │  ├── logout    (POST)                         │         │
│  │  └── me        (GET)                          │         │
│  └────────────────┬──────────────────────────────┘         │
│                   │                                         │
│                   ▼                                         │
│         ┌─────────────────┐                                │
│         │   lib/db.js     │                                │
│         │   MySQL Pool    │                                │
│         └────────┬────────┘                                │
│                  │                                          │
└──────────────────┼──────────────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │   BASE DE DONNÉES   │
         │      MySQL          │
         ├─────────────────────┤
         │ ├── users           │
         │ └── sessions        │
         └─────────────────────┘
```

## 📦 Composants Frontend

### 1. Pages

#### `/se-connecter` (Connexion)
```javascript
FormData: { email, password }
    ↓
POST /api/auth/login
    ↓
Cookie: session_token
    ↓
Redirect: /
```

#### `/inscription` (Inscription)
```javascript
FormData: { email, password, nom, prenom, ... }
    ↓
POST /api/auth/register
    ↓
Success message
    ↓
Redirect: /se-connecter
```

#### `/profil` (Profil - Protégé)
```javascript
withAuth(ProfilPage)
    ↓
GET /api/auth/me
    ↓
Si non connecté → Redirect /se-connecter
Si connecté → Affiche les infos
```

### 2. Composants UI

#### Header
```
Logo SNCF + Titre
(Simplifié, pas de logique d'auth)
```

#### NavigationBar
```
Menus de navigation
    +
UserMenu (à droite)
```

#### UserMenu
```javascript
// État
const { user, loading, logout } = useAuth();

// Non connecté
<IconButton> → onClick → /se-connecter

// Connecté
<IconButton> → onClick → Ouvre menu
    ├── En-tête (Avatar + Nom + Email)
    ├── "Mon espace personnel" → /profil
    └── "Se déconnecter" → logout()
```

## 🔧 Utilitaires

### useAuth Hook
```javascript
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Vérifie l'auth au chargement
  useEffect(() => {
    checkAuth(); // GET /api/auth/me
  }, []);

  // Fonction de déconnexion
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
  };

  return { user, loading, logout, refreshUser };
}
```

### withAuth HOC
```javascript
export function withAuth(Component) {
  return function ProtectedRoute(props) {
    const { user, loading } = useAuth();
    
    if (!loading && !user) {
      router.push('/se-connecter');
    }
    
    if (!user) return <Loading />;
    
    return <Component {...props} user={user} />;
  };
}
```

## 🌐 API Routes

### POST /api/auth/register
```javascript
Input: { email, password, nom, prenom, ... }

Validation:
  ✓ Champs obligatoires
  ✓ Format email
  ✓ Longueur mot de passe (min 6)
  ✓ Email unique

Process:
  1. Hash password (bcrypt)
  2. INSERT INTO users
  3. Return userId

Output: { message, userId }
Status: 201 Created
```

### POST /api/auth/login
```javascript
Input: { email, password }

Validation:
  ✓ Champs présents

Process:
  1. SELECT user WHERE email
  2. Compare password (bcrypt)
  3. Generate session_token
  4. INSERT INTO sessions
  5. Set cookie (HTTP-only)

Output: { message, user }
Cookie: session_token (7 jours)
Status: 200 OK
```

### POST /api/auth/logout
```javascript
Input: Cookie session_token

Process:
  1. DELETE FROM sessions WHERE token
  2. Clear cookie

Output: { message }
Status: 200 OK
```

### GET /api/auth/me
```javascript
Input: Cookie session_token

Validation:
  ✓ Token présent
  ✓ Session existe
  ✓ Session non expirée

Process:
  1. SELECT session WHERE token
  2. Check expiration
  3. SELECT user WHERE id

Output: { user }
Status: 200 OK
```

## 🗄️ Base de données

### Table: users
```sql
CREATE TABLE users (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password        VARCHAR(255) NOT NULL,  -- bcrypt hash
    nom             VARCHAR(100) NOT NULL,
    prenom          VARCHAR(100) NOT NULL,
    telephone       VARCHAR(20),
    date_naissance  DATE,
    adresse         TEXT,
    ville           VARCHAR(100),
    code_postal     VARCHAR(10),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);
```

### Table: sessions
```sql
CREATE TABLE sessions (
    id             INT PRIMARY KEY AUTO_INCREMENT,
    user_id        INT NOT NULL,
    session_token  VARCHAR(255) UNIQUE NOT NULL,
    expires        TIMESTAMP NOT NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_token (session_token)
);
```

## 🔐 Flux d'authentification

### Inscription
```
1. User remplit formulaire (/inscription)
2. Frontend: Validation client
3. POST /api/auth/register
4. Backend: Validation + Hash password
5. Backend: INSERT INTO users
6. Frontend: Message succès
7. Frontend: Redirect /se-connecter
```

### Connexion
```
1. User entre email + password (/se-connecter)
2. POST /api/auth/login
3. Backend: Vérifie credentials
4. Backend: Crée session + cookie
5. Frontend: Stocke cookie
6. Frontend: Redirect /
7. useAuth détecte session
8. UserMenu affiche user
```

### Vérification session (à chaque page)
```
1. useAuth() appelé
2. GET /api/auth/me (avec cookie)
3. Backend: Vérifie session
4. Backend: Retourne user
5. Frontend: setUser(data.user)
6. UI: Affiche menu utilisateur
```

### Déconnexion
```
1. User clique "Se déconnecter"
2. POST /api/auth/logout
3. Backend: DELETE session
4. Backend: Clear cookie
5. Frontend: setUser(null)
6. Frontend: Redirect /
7. UI: Affiche "Connexion"
```

## 🛡️ Sécurité

### Mots de passe
- ✅ Jamais stockés en clair
- ✅ Hachage bcrypt (10 rounds)
- ✅ Validation longueur minimum

### Sessions
- ✅ Token aléatoire unique
- ✅ Expiration 7 jours
- ✅ Stockage sécurisé (DB + Cookie)
- ✅ Vérification à chaque requête

### Cookies
- ✅ HTTP-only (protection XSS)
- ✅ SameSite: lax (protection CSRF)
- ✅ Secure en production (HTTPS)

### Requêtes SQL
- ✅ Requêtes paramétrées
- ✅ Protection injection SQL
- ✅ Validation des données

### API
- ✅ Validation côté serveur
- ✅ Messages d'erreur génériques
- ✅ Rate limiting possible

## 📊 Diagramme de flux complet

```
┌──────────────┐
│   Browser    │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────┐
│          PAGES (React)                   │
│  ┌────────────┐  ┌─────────────┐        │
│  │ Connexion  │  │ Inscription │        │
│  └──────┬─────┘  └──────┬──────┘        │
│         │                │               │
│         │                │               │
│  ┌──────▼────────────────▼──────┐       │
│  │      UserMenu                │       │
│  │    ┌──────────────┐          │       │
│  │    │  useAuth()   │          │       │
│  │    └──────┬───────┘          │       │
│  └───────────┼──────────────────┘       │
└──────────────┼──────────────────────────┘
               │
               ▼ HTTP Requests
┌──────────────────────────────────────────┐
│         API ROUTES (Next.js)             │
│  ┌────────────────────────────────┐     │
│  │  /api/auth/                    │     │
│  │  ├─ register → Hash → Insert   │     │
│  │  ├─ login → Check → Session    │     │
│  │  ├─ logout → Delete            │     │
│  │  └─ me → Verify → Return       │     │
│  └─────────────┬──────────────────┘     │
└────────────────┼────────────────────────┘
                 │
                 ▼ SQL Queries
┌──────────────────────────────────────────┐
│         MySQL Database                   │
│  ┌────────────┐    ┌────────────┐       │
│  │   users    │    │  sessions  │       │
│  │  (données) │◄───┤  (tokens)  │       │
│  └────────────┘    └────────────┘       │
└──────────────────────────────────────────┘
```

## 📝 Résumé des fichiers

### Pages
- `src/app/se-connecter/page.js` + `.module.css`
- `src/app/inscription/page.js` + `.module.css`
- `src/app/profil/page.js` + `.module.css`

### Composants
- `src/components/Header.js`
- `src/components/NavigationBar.js`
- `src/components/UserMenu.js` + `.module.css`

### API
- `src/app/api/auth/register/route.js`
- `src/app/api/auth/login/route.js`
- `src/app/api/auth/logout/route.js`
- `src/app/api/auth/me/route.js`

### Utilitaires
- `src/lib/db.js` - Connexion MySQL
- `src/lib/useAuth.js` - Hook + HOC

### Base de données
- `sql/schema.sql` - Structure

### Configuration
- `.env.local` - Variables d'environnement
- `.env.example` - Template

---

**Architecture complète et fonctionnelle** ✅

