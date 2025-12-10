# 📄 Module Fiches Horaires - Documentation

## 📋 Vue d'ensemble

Le module **Fiches Horaires** permet aux administrateurs de générer des fiches horaires au format PDF pour les différents services annuels. Ces fiches présentent les sillons (trains) de manière structurée, avec un design personnalisé selon la région.

## 🎯 Fonctionnalités

### 1. Création de fiches horaires
- **Nom** : Titre de la fiche horaire (ex: "Ligne Dijon - Besançon - Service Hiver 2025")
- **Service Annuel** : Association avec un service annuel existant
- **Type de fiche** :
  - Service Annuel (SA)
  - Travaux
  - Aménagement Spécial
- **Design de région** : Choix du template graphique (actuellement : Bourgogne - Franche-Comté)
- **Ligne** : Association optionnelle avec une ligne spécifique
- **Visibilité** : Option pour afficher la fiche sur la page de recherche publique

### 2. Génération de PDF
- Génération automatique d'un fichier PDF au design Mobigo BFC
- Layout paysage (landscape) format A4
- Colonnes avec les horaires de chaque train
- Liste des gares avec les horaires de passage
- En-tête avec logo et informations de validité
- Bandeau d'information pour les travaux
- Footer avec informations de contact

### 3. Gestion des fiches
- Liste de toutes les fiches créées
- Modification des propriétés d'une fiche
- Suppression de fiches
- Visualisation du statut (brouillon, généré, publié)
- Badges de type (SA, Travaux, Aménagement Spécial)

## 🗄️ Base de données

### Table : `fiches_horaires`

```sql
CREATE TABLE fiches_horaires (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    service_annuel_id INT NOT NULL,
    type_fiche ENUM('SA', 'Travaux', 'Aménagement Spécial') NOT NULL DEFAULT 'SA',
    design_region VARCHAR(100) NOT NULL DEFAULT 'Bourgogne - Franche-Comté',
    ligne_id INT DEFAULT NULL,
    afficher_page_recherche BOOLEAN DEFAULT FALSE,
    pdf_path VARCHAR(512) DEFAULT NULL,
    statut ENUM('brouillon', 'généré', 'publié') NOT NULL DEFAULT 'brouillon',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_annuel_id) REFERENCES services_annuels(id) ON DELETE CASCADE
);
```

### Migration

Pour créer la table, exécutez le fichier de migration :
```sql
mysql -u root -p horaires < sql/migration_add_fiches_horaires.sql
```

## 📁 Structure des fichiers

```
src/app/
├── espace/admin/fiches-horaires/
│   ├── page.js                           # Page principale
│   └── components/
│       ├── FicheHoraireForm.js          # Formulaire de création/édition
│       └── FichesHorairesList.js        # Liste des fiches
│
└── api/
    ├── fiches-horaires/
    │   ├── route.js                      # GET (liste), POST (créer)
    │   └── [id]/
    │       ├── route.js                  # GET, PUT, DELETE
    │       └── generate/
    │           └── route.js              # POST (générer PDF)
    ├── services-annuels/
    │   └── route.js                      # GET (liste)
    └── lignes/
        └── route.js                      # GET (liste)

public/
└── fh/                                   # Dossier des PDFs générés
    └── fiche_*.pdf

sql/
└── migration_add_fiches_horaires.sql     # Migration SQL
```

## 🎨 Design des fiches horaires

### Bourgogne - Franche-Comté (Mobigo)

Le design BFC utilise :
- **Couleurs** :
  - Rose Mobigo : `#e4007f` (header)
  - Vert Mobigo : `#0b7d48` (texte et accents)
  - Jaune Mobigo : `#f5d76a` (séparateurs et info)
  
- **Structure** :
  - En-tête rose avec logo Mobigo
  - Titre de la ligne centré
  - Dates de validité
  - Bandeau jaune d'information (si travaux)
  - Tableau avec colonnes de trains
  - Liste des gares avec horaires
  - Footer avec contacts et légendes

### Ajout de nouveaux designs

Pour ajouter un nouveau design régional :

1. Ajouter l'option dans le formulaire (`FicheHoraireForm.js`) :
```javascript
<option value="Nouvelle-Aquitaine">Nouvelle-Aquitaine</option>
```

2. Créer la fonction de génération dans `generate/route.js` :
```javascript
function generateNouvelleAquitaineDesign(doc, fiche, horaires) {
  // Votre code de génération
}
```

3. Appeler la fonction dans `generatePDF()` :
```javascript
if (fiche.design_region === 'Nouvelle-Aquitaine') {
  generateNouvelleAquitaineDesign(doc, fiche, horaires);
}
```

## 🔗 API Endpoints

### `GET /api/fiches-horaires`
Liste toutes les fiches horaires avec leurs informations de service annuel.

**Response :**
```json
{
  "success": true,
  "fiches": [
    {
      "id": 1,
      "nom": "Ligne Dijon - Besançon",
      "service_annuel_id": 1,
      "service_annuel_nom": "Service Hiver 2025",
      "type_fiche": "SA",
      "design_region": "Bourgogne - Franche-Comté",
      "afficher_page_recherche": true,
      "pdf_path": "/fh/fiche_1_1234567890.pdf",
      "statut": "généré"
    }
  ]
}
```

### `POST /api/fiches-horaires`
Créer une nouvelle fiche horaire.

**Body :**
```json
{
  "nom": "Ligne Dijon - Besançon",
  "service_annuel_id": 1,
  "type_fiche": "SA",
  "design_region": "Bourgogne - Franche-Comté",
  "ligne_id": 5,
  "afficher_page_recherche": true
}
```

### `GET /api/fiches-horaires/[id]`
Récupérer une fiche horaire spécifique.

### `PUT /api/fiches-horaires/[id]`
Modifier une fiche horaire.

### `DELETE /api/fiches-horaires/[id]`
Supprimer une fiche horaire.

### `POST /api/fiches-horaires/[id]/generate`
Générer le PDF pour une fiche horaire.

**Response :**
```json
{
  "success": true,
  "message": "PDF généré avec succès",
  "pdf_path": "/fh/fiche_1_1234567890.pdf"
}
```

## 🚀 Utilisation

### 1. Créer une fiche horaire

1. Accéder à **Espace Admin** > **Fiches Horaires**
2. Cliquer sur **"Créer une fiche horaire"**
3. Remplir le formulaire :
   - Nom de la fiche
   - Sélectionner un service annuel
   - Choisir le type (SA, Travaux, Aménagement Spécial)
   - Sélectionner le design de région
   - (Optionnel) Associer une ligne
   - Cocher "Afficher sur la page de recherche" si souhaité
4. Cliquer sur **"Créer"**

### 2. Générer le PDF

1. Dans la liste des fiches, cliquer sur **"Générer PDF"**
2. Le PDF est créé dans `public/fh/`
3. Le statut passe de "brouillon" à "généré"

### 3. Modifier une fiche

1. Cliquer sur **"Modifier"** sur une fiche
2. Modifier les champs souhaités
3. Cliquer sur **"Modifier"**

### 4. Supprimer une fiche

1. Cliquer sur l'icône **poubelle**
2. Confirmer la suppression

## 📦 Dépendances

- **pdfkit** : Génération de PDF
  ```bash
  npm install pdfkit --legacy-peer-deps
  ```

## 🔧 Configuration

### Variables d'environnement

```env
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=votre_mot_de_passe
```

### Dossier de stockage

Les PDFs sont stockés dans `public/fh/`. Assurez-vous que ce dossier existe et a les bonnes permissions :

```bash
mkdir -p public/fh
chmod 755 public/fh
```

## 🎯 Prochaines étapes

- [ ] Ajouter d'autres designs régionaux (Nouvelle-Aquitaine, Occitanie, etc.)
- [ ] Améliorer le layout PDF avec plus de détails (pictogrammes, services à bord, etc.)
- [ ] Ajouter la possibilité de prévisualiser le PDF avant génération
- [ ] Permettre le téléchargement direct depuis l'interface admin
- [ ] Ajouter des filtres par ligne dans les horaires sélectionnés
- [ ] Implémenter la page de recherche publique des fiches horaires
- [ ] Ajouter la gestion des versions de fiches
- [ ] Intégrer la génération automatique lors de la création d'un service annuel

## 🐛 Problèmes connus

- Les très grandes listes d'horaires peuvent nécessiter plusieurs pages PDF
- Les caractères spéciaux dans les noms de gares doivent être encodés correctement
- Le design est optimisé pour un maximum de 10-12 trains par page

## 💡 Conseils

- **Nommage** : Utilisez des noms descriptifs pour vos fiches (ex: "Ligne 25 Dijon-Besançon - Hiver 2025")
- **Type de fiche** : Utilisez "Travaux" pour les périodes avec modifications d'horaires
- **Visibilité** : Ne cochez "Afficher sur la page de recherche" que pour les fiches validées
- **Régénération** : Vous pouvez régénérer un PDF à tout moment (l'ancien sera écrasé)

---

**Développé pour TER Bourgogne-Franche-Comté**  
Date : Décembre 2025

