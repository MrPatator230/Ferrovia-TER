# Page Diffusion d'Informations

## Vue d'ensemble

Cette page permet de gérer la diffusion d'informations vers les usagers via trois catégories distinctes :
- **Infos Trafic** : Gestion des perturbations, travaux et informations importantes
- **Actus** : Gestion des actualités et communications
- **Événements** : Gestion des événements spéciaux

## Caractéristiques

### Composants WCS SNCF utilisés
- `wcs-tabs` : Système d'onglets pour organiser les différentes sections
- `wcs-card` : Cartes pour afficher les informations
- `wcs-button` : Boutons d'action
- `wcs-modal` : Modales pour créer/modifier les entrées
- `wcs-form-field` : Champs de formulaire
- `wcs-input` : Champs de saisie
- `wcs-textarea` : Zones de texte
- `wcs-select` : Listes déroulantes
- `wcs-badge` : Badges pour les types d'infos
- `wcs-mat-icon` : Icônes Material

### Fonctionnalités

#### Tab "Infos Trafic"
- Création d'informations trafic
- Classification par type (information, perturbation, travaux)
- Gestion des périodes (date début/fin)
- Modification et suppression des infos

#### Tab "Actus"
- Création d'actualités
- Publication datée
- Gestion complète (CRUD)

#### Tab "Événements"
- Création d'événements
- Gestion de la date et du lieu
- Modification et suppression

## Structure des fichiers

```
src/app/espace/admin/diffusion-infos/
├── page.js              # Composant principal de la page
├── diffusion.module.css # Styles de la page
└── (documentation dans DIFFUSION_INFOS_README.md à la racine)
```

## Utilisation

### Accès à la page
La page est accessible via l'URL : `/espace/admin/diffusion-infos`

**Note importante** : Cette page est réservée aux administrateurs. L'accès est restreint via l'espace admin.

### Gestion des informations

1. **Créer une nouvelle entrée**
   - Cliquez sur le bouton "+ Nouvelle [type]" dans l'onglet souhaité
   - Remplissez le formulaire dans la modale
   - Cliquez sur "Enregistrer"

2. **Modifier une entrée**
   - Cliquez sur le bouton "Modifier" de la carte concernée
   - Modifiez les informations dans la modale
   - Cliquez sur "Enregistrer"

3. **Supprimer une entrée**
   - Cliquez sur le bouton "Supprimer" de la carte concernée
   - Confirmez la suppression

## Prochaines étapes

Pour compléter cette page, vous pourriez :

1. **Intégration base de données**
   - Créer les tables SQL nécessaires
   - Implémenter les API endpoints (GET, POST, PUT, DELETE)
   - Connecter le frontend aux APIs

2. **Upload d'images**
   - Ajouter la possibilité d'uploader des images pour les actus et événements
   - Utiliser le système de stockage d'images existant

3. **Filtres et recherche**
   - Ajouter des filtres par date, type, statut
   - Implémenter une barre de recherche

4. **Pagination**
   - Ajouter la pagination pour les listes longues

5. **Permissions**
   - Restreindre l'accès aux utilisateurs autorisés
   - Différencier les rôles (admin, éditeur, etc.)

6. **Notifications**
   - Ajouter des notifications de succès/erreur
   - Utiliser `wcs-snackbar` pour les notifications

7. **Prévisualisation**
   - Ajouter une vue de prévisualisation avant publication
   - Permettre de voir comment l'info sera affichée aux usagers

## Exemple de structure SQL

```sql
-- Table infos_trafic
CREATE TABLE infos_trafic (
  id SERIAL PRIMARY KEY,
  titre VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'information', 'perturbation', 'travaux'
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table actus
CREATE TABLE actus (
  id SERIAL PRIMARY KEY,
  titre VARCHAR(255) NOT NULL,
  description TEXT,
  date_publication DATE NOT NULL,
  image_url VARCHAR(500),
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table evenements
CREATE TABLE evenements (
  id SERIAL PRIMARY KEY,
  titre VARCHAR(255) NOT NULL,
  description TEXT,
  date_evenement DATE NOT NULL,
  lieu VARCHAR(255) NOT NULL,
  image_url VARCHAR(500),
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Exemple d'API endpoints

```javascript
// API Routes à créer dans src/app/api/

// Infos Trafic
GET    /api/infos-trafic       // Liste toutes les infos
POST   /api/infos-trafic       // Crée une nouvelle info
PUT    /api/infos-trafic/[id]  // Met à jour une info
DELETE /api/infos-trafic/[id]  // Supprime une info

// Actus
GET    /api/actus              // Liste toutes les actus
POST   /api/actus              // Crée une nouvelle actu
PUT    /api/actus/[id]         // Met à jour une actu
DELETE /api/actus/[id]         // Supprime une actu

// Événements
GET    /api/evenements         // Liste tous les événements
POST   /api/evenements         // Crée un nouvel événement
PUT    /api/evenements/[id]    // Met à jour un événement
DELETE /api/evenements/[id]    // Supprime un événement
```

## Design responsive

La page est entièrement responsive et s'adapte aux différentes tailles d'écran :
- Desktop : grille de cartes multi-colonnes
- Tablette : grille adaptative
- Mobile : vue en colonne unique

## Accessibilité

Les composants WCS SNCF sont conçus pour l'accessibilité :
- Labels ARIA appropriés
- Navigation au clavier
- Contrastes conformes WCAG
- Structure sémantique HTML

