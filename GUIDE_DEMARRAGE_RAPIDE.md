# 🚀 Guide de Démarrage Rapide - Matériels Roulants

## ✅ Système Complet Implémenté !

Votre système de gestion des matériels roulants est maintenant **100% fonctionnel** avec toutes les fonctionnalités demandées.

## 📋 Ce qui est disponible

### 🎯 Liste des matériels (Cards avec images défilantes)
- ✅ Affichage en grille responsive
- ✅ Images avec carrousel (flèches gauche/droite)
- ✅ Informations complètes sur chaque card
- ✅ Boutons Modifier et Supprimer

### ➕ Création
- ✅ Modal avec formulaire WCS complet
- ✅ Upload d'image (nom original conservé)
- ✅ Génération auto du numéro de série

### ✏️ Modification
- ✅ Modal d'édition pré-remplie
- ✅ Possibilité de changer l'image
- ✅ Mise à jour instantanée

### 🗑️ Suppression
- ✅ Confirmation avant suppression
- ✅ Suppression du fichier image
- ✅ Rafraîchissement auto

## 🏃 Démarrer en 3 étapes

### 1️⃣ Base de données
```bash
# Si la table existe déjà
mysql -u root -p < sql/migration_add_exploitant.sql

# Si vous créez depuis le début
mysql -u root -p < sql/schema.sql
```

### 2️⃣ Lancer l'application
```bash
npm run dev
```

### 3️⃣ Accéder à la page
```
http://localhost:3000/espace/admin/materiels
```

## 🎯 Utilisation

### Créer un matériel
1. Cliquez sur **"Créer"**
2. Remplissez le formulaire
3. Sélectionnez une image (optionnel)
4. Cliquez sur **"Créer"**
5. ✅ La card apparaît immédiatement !

### Modifier un matériel
1. Cliquez sur **"Modifier"** (✏️) sur une card
2. Modifiez les champs
3. Changez l'image si besoin
4. Cliquez sur **"Modifier"**
5. ✅ La card se met à jour !

### Supprimer un matériel
1. Cliquez sur **"Supprimer"** (🗑️ rouge)
2. Confirmez
3. ✅ La card disparaît et l'image est supprimée !

## 🖼️ Images

### Où sont-elles stockées ?
```
public/m-r/
├── AGC_B82500.jpg
├── Train_TER.jpg
└── Regiolis.jpg
```

### Format du nom
- **Upload** : `Train TER (2024).jpg`
- **Stocké** : `Train_TER__2024_.jpg`
- Les caractères spéciaux sont remplacés par `_`

## 🎨 Apparence

### Cards
Chaque matériel s'affiche dans une card avec :
- 📷 **Image** en haut (200px, cover)
- 📝 **Nom** en gras
- 🔧 **Nom technique** en italique
- 🏷️ **N° de série** avec icône
- 👥 **Capacité** (places) avec icône
- 🚂 **Type de train** avec icône
- 🏢 **Exploitant** avec icône
- 🎛️ **Boutons** : Modifier + Supprimer

### Carrousel d'images
- ◀️ Flèche gauche
- ▶️ Flèche droite
- 📊 Compteur : "1 / 3"
- Prêt pour plusieurs images par matériel !

## 🔧 Architecture

```
Page principale (page.js)
├── Modal de création
│   └── MaterialForm (mode création)
├── Modal d'édition
│   └── MaterialForm (mode édition)
└── Liste (MaterialList)
    └── Cards avec boutons
        ├── Modifier → ouvre modal édition
        └── Supprimer → supprime + refresh
```

## 🎯 API disponibles

```javascript
// Liste
GET /api/admin/materiels

// Détail
GET /api/admin/materiels/:id

// Créer
POST /api/admin/materiels

// Modifier
PUT /api/admin/materiels/:id

// Supprimer
DELETE /api/admin/materiels/:id
```

## ✅ Checklist de test

- [ ] Créer un matériel sans image → ✅ Placeholder affiché
- [ ] Créer un matériel avec image → ✅ Image visible
- [ ] Fichier dans `public/m-r/` → ✅ Vérifié
- [ ] Modifier le nom → ✅ Card mise à jour
- [ ] Changer l'image → ✅ Ancienne supprimée, nouvelle affichée
- [ ] Supprimer un matériel → ✅ Card disparaît
- [ ] Fichier image supprimé → ✅ Vérifié dans `public/m-r/`
- [ ] Plusieurs matériels → ✅ Grille responsive

## 🎉 Tout est prêt !

Le système est **complet et fonctionnel**. Vous pouvez maintenant :

1. ✅ **Créer** des matériels roulants
2. ✅ **Lister** tous les matériels en cards
3. ✅ **Voir** les images (carrousel prêt)
4. ✅ **Modifier** les matériels
5. ✅ **Supprimer** les matériels

---

**🚀 Bon travail avec votre système de gestion des matériels roulants !**

## 📝 Notes importantes

### Si la modal ne s'ouvre pas
- Rechargez la page (Ctrl+R)
- Vérifiez la console (F12)

### Si les images ne s'affichent pas
- Vérifiez que le dossier `public/m-r/` existe
- Vérifiez que l'image a été uploadée
- Regardez le chemin dans la base de données

### Si la liste ne se rafraîchit pas
- Rechargez manuellement (Ctrl+R)
- Vérifiez la console pour des erreurs API

## 🆘 Support

Consultez les fichiers de documentation :
- `SYSTEME_COMPLET_MATERIELS.md` - Documentation complète
- `MATERIEL_ROULANT_README.md` - Guide technique
- `MODIFICATION_COMPLETE.md` - Détails des modifications

---

**Tout fonctionne ! Amusez-vous bien ! 🎉**

