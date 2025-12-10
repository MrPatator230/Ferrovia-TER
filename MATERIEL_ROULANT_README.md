# Système de Gestion des Matériels Roulants - Documentation

## 📋 Résumé des fonctionnalités

Le système permet de gérer les matériels roulants avec les fonctionnalités suivantes :
- ✅ Création de matériels via une modal WCS
- ✅ Affichage sous forme de cards avec images
- ✅ Carrousel d'images (préparé pour plusieurs images par matériel)
- ✅ Stockage des images dans `public/m-r/{numero_serie}.{ext}`
- ✅ Génération automatique de numéros de série uniques (5 chiffres)
- ✅ Champs : nom, nom technique, capacité, type de train, exploitant, image
- ✅ Rafraîchissement automatique de la liste après création

## 🗄️ Base de données

### Table : materiel_roulant

```sql
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
```

### Migration

Si la table existe déjà, exécutez :
```bash
mysql -u root -p < sql/migration_add_exploitant.sql
```

Ou exécutez manuellement :
```sql
ALTER TABLE materiel_roulant 
ADD COLUMN IF NOT EXISTS exploitant VARCHAR(100) DEFAULT NULL 
AFTER type_train;
```

## 📁 Structure des fichiers

```
src/app/espace/admin/materiels/
├── page.js                          # Page principale (Client Component)
├── materiels.module.css             # Styles de la page
└── components/
    ├── MaterialForm.js              # Formulaire de création
    ├── MaterialList.js              # Liste des matériels (cards)
    └── MaterialList.module.css      # Styles des cards

src/app/api/admin/materiels/
└── route.js                         # API GET et POST

public/
└── m-r/                             # Dossier des images (créé automatiquement)
    └── {numero_serie}.jpg           # Images nommées par numéro de série
```

## 🎨 Composants

### MaterialForm
- **Type** : Client Component
- **Champs** :
  - Nom du matériel * (requis)
  - Nom technique
  - Capacité (nombre de places)
  - Type de train * (TER, TGV, Intercités, RER, Transilien)
  - Type de train (Exploitant) : SNCF Voyageurs, IDF Mobilités, RATP, etc.
  - Image (fichier)
- **Actions** :
  - Créer : enregistre le matériel
  - Réinitialiser : efface le formulaire
- **Événements** :
  - Émet `materiel-created` après création réussie
  - Ferme automatiquement la modal après 1 seconde

### MaterialList
- **Type** : Client Component
- **Affichage** : Grid responsive de cards WCS
- **Fonctionnalités** :
  - Carrousel d'images avec flèches (prêt pour multi-images)
  - Affichage des détails : N° série, capacité, type, exploitant
  - Icons WCS pour chaque information
  - Placeholder quand pas d'image
  - Rafraîchissement automatique via événement

## 🔌 API

### GET /api/admin/materiels
Récupère tous les matériels roulants.

**Réponse** :
```json
{
  "items": [
    {
      "id": 1,
      "nom": "AGC B 82500",
      "nom_technique": "Autorail Grande Capacité",
      "capacite": 200,
      "image_path": "/m-r/12345.jpg",
      "type_train": "TER",
      "exploitant": "SNCF Voyageurs",
      "numero_serie": "12345",
      "created_at": "2025-01-28T10:00:00.000Z",
      "updated_at": "2025-01-28T10:00:00.000Z"
    }
  ]
}
```

### POST /api/admin/materiels
Crée un nouveau matériel roulant.

**Requête** :
```json
{
  "nom": "AGC B 82500",
  "nom_technique": "Autorail Grande Capacité",
  "capacite": 200,
  "type_train": "TER",
  "exploitant": "SNCF Voyageurs",
  "image_base64": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**Réponse** (201) :
```json
{
  "id": 1,
  "nom": "AGC B 82500",
  "nom_technique": "Autorail Grande Capacité",
  "capacite": 200,
  "image_path": "/m-r/12345.jpg",
  "type_train": "TER",
  "exploitant": "SNCF Voyageurs",
  "numero_serie": "12345",
  "created_at": "2025-01-28T10:00:00.000Z",
  "updated_at": "2025-01-28T10:00:00.000Z"
}
```

## 🖼️ Stockage des images

- **Emplacement** : `public/m-r/`
- **Nom** : `{nom_du_fichier_original}`
- **Exemple** : `public/m-r/AGC_B82500.jpg`
- **URL** : `http://localhost:3000/m-r/AGC_B82500.jpg`
- **Fallback** : Si le nom n'est pas fourni, utilise `{numero_serie}.{extension}`

### Avantages
- Conserve le nom original du fichier
- Facilite l'identification visuelle
- Les caractères spéciaux sont nettoyés (remplacés par `_`)
- Structure claire et organisée

## 🎯 Utilisation

### 1. Créer un matériel
1. Accédez à `/espace/admin/materiels`
2. Cliquez sur "Créer"
3. Remplissez le formulaire
4. Sélectionnez une image (optionnel)
5. Cliquez sur "Créer"
6. La liste se rafraîchit automatiquement

### 2. Voir les matériels
- La page affiche automatiquement tous les matériels sous forme de cards
- Chaque card affiche :
  - Image du matériel (ou placeholder)
  - Nom et nom technique
  - Numéro de série
  - Capacité
  - Type de train
  - Exploitant

### 3. Carrousel d'images
- Si un matériel a plusieurs images (futur) :
  - Utilisez les flèches pour naviguer
  - Le compteur affiche l'image courante

## 🔮 Évolutions futures

### Fonctionnalités à ajouter
- [ ] Édition de matériels existants
- [ ] Suppression de matériels
- [ ] Support de plusieurs images par matériel
- [ ] Filtrage et recherche
- [ ] Tri (par nom, date, type, etc.)
- [ ] Pagination
- [ ] Export CSV/PDF
- [ ] Historique des modifications
- [ ] Gestion des livrées/versions d'un même modèle

### Améliorations techniques
- [ ] Compression automatique des images
- [ ] Thumbnails pour meilleures performances
- [ ] Upload direct (multipart) au lieu de base64
- [ ] Validation côté serveur des types MIME
- [ ] Cache des images
- [ ] CDN pour les images

## 🐛 Dépannage

### La modal ne s'ouvre pas
- Vérifiez que WcsClient est chargé dans le layout
- Vérifiez la console pour des erreurs
- Rechargez la page

### Les images ne s'affichent pas
- Vérifiez que le dossier `public/m-r/` existe
- Vérifiez les permissions du dossier
- Vérifiez que l'image a bien été uploadée
- Vérifiez le chemin dans la base de données

### La liste ne se rafraîchit pas
- Vérifiez la console pour des erreurs API
- Vérifiez que l'événement `materiel-created` est bien émis
- Rechargez manuellement la page

## 📝 Notes techniques

- **Next.js App Router** : Server Components par défaut, Client Components marqués avec `"use client"`
- **WCS Components** : Web Components SNCF pour l'UI
- **MySQL** : Base de données avec pool de connexions
- **Base64** : Images converties côté client pour simplifier l'upload
- **Custom Events** : Communication entre composants via `window.dispatchEvent`

