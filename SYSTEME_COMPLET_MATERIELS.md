# ✅ Système Complet de Gestion des Matériels Roulants

## 🎉 Fonctionnalités Implémentées

### 📋 Liste des matériels (Cards avec images)
- ✅ Affichage en grille responsive
- ✅ Cards WCS avec effet hover
- ✅ Image du matériel (200px hauteur, cover)
- ✅ Carrousel d'images avec flèches (prêt pour multi-images)
- ✅ Placeholder élégant si pas d'image
- ✅ Informations affichées :
  - 🏷️ Numéro de série
  - 👥 Capacité (places)
  - 🚂 Type de train
  - 🏢 Exploitant

### ➕ Création de matériels
- ✅ Modal WCS avec formulaire complet
- ✅ Champs :
  - Nom du matériel *
  - Nom technique
  - Capacité
  - Type de train * (TER, TGV, Intercités, RER, Transilien)
  - Type de train (Exploitant) : SNCF Voyageurs, IDF Mobilités, RATP, etc.
  - Image (upload fichier)
- ✅ Upload d'image avec nom original conservé
- ✅ Génération automatique du numéro de série (5 chiffres)
- ✅ Validation côté client et serveur
- ✅ Message de confirmation
- ✅ Rafraîchissement automatique de la liste

### ✏️ Modification de matériels
- ✅ Bouton "Modifier" sur chaque card
- ✅ Modal d'édition pré-remplie avec les données existantes
- ✅ Possibilité de changer l'image (remplace l'ancienne)
- ✅ Mise à jour en base de données
- ✅ Rafraîchissement automatique de la liste

### 🗑️ Suppression de matériels
- ✅ Bouton "Supprimer" (rouge) sur chaque card
- ✅ Confirmation avant suppression
- ✅ Suppression de l'enregistrement en DB
- ✅ Suppression du fichier image associé
- ✅ Rafraîchissement automatique de la liste

## 📁 Structure des fichiers

```
src/app/espace/admin/materiels/
├── page.js                              # Page principale (2 modals: création + édition)
├── materiels.module.css                 # Styles de la page
└── components/
    ├── MaterialForm.js                  # Formulaire (création ET édition)
    ├── MaterialList.js                  # Liste des cards avec boutons
    └── MaterialList.module.css          # Styles des cards et boutons

src/app/api/admin/materiels/
├── route.js                             # GET (liste) et POST (création)
└── [id]/
    └── route.js                         # GET, PUT (édition), DELETE (suppression)

public/
└── m-r/                                 # Images des matériels
    └── {nom_original}.jpg               # Ex: AGC_B82500.jpg
```

## 🔌 API Endpoints

### GET /api/admin/materiels
Liste tous les matériels roulants.

**Réponse** :
```json
{
  "items": [
    {
      "id": 1,
      "nom": "AGC B 82500",
      "nom_technique": "Autorail Grande Capacité",
      "capacite": 200,
      "image_path": "/m-r/AGC_B82500.jpg",
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
  "image_base64": "data:image/jpeg;base64,/9j/4AAQ...",
  "image_filename": "AGC_B82500.jpg"
}
```

### GET /api/admin/materiels/:id
Récupère un matériel spécifique.

### PUT /api/admin/materiels/:id
Modifie un matériel existant.

**Requête** : Même structure que POST (l'image est optionnelle)

### DELETE /api/admin/materiels/:id
Supprime un matériel et son image.

## 🎯 Flux d'utilisation

### Créer un matériel
1. Cliquer sur "Créer"
2. Remplir le formulaire
3. Sélectionner une image
4. Voir le nom du fichier s'afficher
5. Cliquer sur "Créer"
6. La liste se rafraîchit automatiquement

### Modifier un matériel
1. Cliquer sur "Modifier" sur une card
2. Le formulaire s'ouvre pré-rempli
3. Modifier les champs souhaités
4. (Optionnel) Changer l'image
5. Cliquer sur "Modifier"
6. La liste se rafraîchit automatiquement

### Supprimer un matériel
1. Cliquer sur "Supprimer" (bouton rouge)
2. Confirmer dans la popup
3. Le matériel et son image sont supprimés
4. La liste se rafraîchit automatiquement

## 🖼️ Gestion des images

### Upload
- Format accepté : `image/*` (jpg, png, etc.)
- Conversion en base64 côté client
- Envoi avec le nom original
- Stockage dans `public/m-r/{nom_nettoyé}.jpg`

### Nettoyage du nom
```javascript
filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
```
- Caractères autorisés : `a-z A-Z 0-9 . _ -`
- Autres caractères → remplacés par `_`

### Modification d'image
- L'ancienne image est supprimée du système de fichiers
- La nouvelle image est sauvegardée
- Le chemin en DB est mis à jour

### Suppression
- Lors de la suppression d'un matériel, l'image associée est automatiquement supprimée

## 🎨 Interface utilisateur

### Cards
- Design moderne avec ombre et hover
- Image en haut (cover, 200px)
- Titre en gras
- Sous-titre en italique
- Icônes Material Design pour chaque info
- Boutons d'action en bas :
  - ✏️ Modifier (mode clear)
  - 🗑️ Supprimer (rouge, mode clear)

### Carrousel (préparé pour multi-images)
- Flèches gauche/droite
- Compteur "1 / 3"
- Contrôles semi-transparents
- Désactivation auto aux extrémités

### Modals
- **Modal de création** : Formulaire vierge
- **Modal d'édition** : Formulaire pré-rempli
- Fermeture automatique après succès (1 sec)
- Bouton X pour fermer manuellement

## 🔒 Sécurité

### Validation serveur
- Champs requis vérifiés
- Types de données validés
- Noms de fichiers nettoyés
- Requêtes SQL préparées (protection injection SQL)

### Confirmation
- Popup de confirmation avant suppression
- Message explicite avec le nom du matériel

## 📊 Base de données

### Table : materiel_roulant
```sql
CREATE TABLE materiel_roulant (
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
);
```

## 🚀 Tests à effectuer

### Test création
```bash
1. Ouvrir /espace/admin/materiels
2. Cliquer "Créer"
3. Remplir: Nom="AGC", Type="TER", Capacité=200
4. Upload image "train.jpg"
5. Vérifier: fichier dans public/m-r/train.jpg
6. Vérifier: card apparaît dans la liste
```

### Test édition
```bash
1. Cliquer "Modifier" sur une card
2. Changer le nom
3. Vérifier: modifications enregistrées
4. Vérifier: card mise à jour
```

### Test suppression
```bash
1. Cliquer "Supprimer" (rouge)
2. Confirmer
3. Vérifier: card disparaît
4. Vérifier: fichier supprimé de public/m-r/
```

### Test image
```bash
1. Upload "Train (Test).jpg"
2. Vérifier: public/m-r/Train__Test_.jpg créé
3. Vérifier: image s'affiche dans la card
4. Modifier et changer l'image
5. Vérifier: ancienne image supprimée
```

## ✨ Fonctionnalités avancées prêtes

### Carrousel multi-images
Le code est prêt pour supporter plusieurs images par matériel :
- Flèches de navigation déjà implémentées
- Compteur d'images fonctionnel
- Il suffit d'ajouter une table `materiel_images` pour activer

### Événements personnalisés
- `materiel-updated` : déclenché après création/modification
- `open-edit-modal` : ouvre la modal d'édition avec les données

### Rafraîchissement intelligent
- Auto-refresh de la liste après chaque action
- Pas besoin de recharger la page manuellement

## 🎉 Résumé

Vous disposez maintenant d'un **système complet de gestion des matériels roulants** avec :
- ✅ Liste en cards avec images et carrousel
- ✅ Création de matériels
- ✅ Modification de matériels
- ✅ Suppression de matériels
- ✅ Upload d'images (nom original conservé)
- ✅ Interface moderne WCS SNCF
- ✅ Sécurité et validation
- ✅ Rafraîchissement automatique

**Le système est opérationnel et prêt à l'emploi !** 🚀

