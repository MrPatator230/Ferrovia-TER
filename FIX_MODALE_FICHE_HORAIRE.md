# 🐛 Fix : Modale de formulaire non affichée

## Problème
Le formulaire de création/modification de fiche horaire n'était pas affiché dans la modale WCS.

## Cause
La structure de la modale WCS (`wcs-modal`) utilisée était incorrecte :
- ❌ Utilisation de `slot="content"` qui n'existe pas dans wcs-modal
- ❌ Propriété `onWcsDialogClosed` au lieu de l'événement `wcsDialogClosed`
- ❌ Propriété `size` non reconnue
- ❌ Propriété `show={showModal}` au lieu de simplement `show`

## Solution appliquée

### 1. Structure correcte de la modale WCS

```javascript
{showModal && (
  <wcs-modal
    ref={modalRef}
    show                              // ✅ Propriété booléenne simple
    show-close-button                 // ✅ Afficher le bouton de fermeture
    close-button-aria-label="Fermer"  // ✅ Accessibilité
    disable-auto-focus                // ✅ Désactiver le focus automatique
    modal-trigger-controls-id="modal-trigger-fiche"
  >
    <div slot="header">
      <wcs-mat-icon icon="description" size="s"></wcs-mat-icon>
      {editFiche ? 'Modifier...' : 'Créer...'}
    </div>
    <FicheHoraireForm ... />          // ✅ Contenu direct, pas dans slot="content"
  </wcs-modal>
)}
```

### 2. Gestion de l'événement de fermeture

```javascript
useEffect(() => {
  const modal = modalRef.current;
  if (!modal) return;

  const handleClose = () => {
    closeModal();
  };

  modal.addEventListener('wcsDialogClosed', handleClose);
  return () => {
    modal.removeEventListener('wcsDialogClosed', handleClose);
  };
}, [showModal]);
```

## Différences clés avec wcs-modal

### ❌ Incorrect
```javascript
<wcs-modal
  show={showModal}              // Binding React
  onWcsDialogClosed={closeModal} // Handler React
  size="l"
>
  <div slot="content">           // Slot qui n'existe pas
    <Form />
  </div>
</wcs-modal>
```

### ✅ Correct
```javascript
<wcs-modal
  show                           // Attribut booléen
  show-close-button
  disable-auto-focus
>
  <div slot="header">...</div>   // Slot existant
  <Form />                       // Contenu direct
  <div slot="actions">...</div>  // Slot optionnel pour les boutons
</wcs-modal>
```

## Slots disponibles dans wcs-modal

1. **`slot="header"`** : En-tête de la modale (titre)
2. **Contenu principal** : Placé directement dans la modale (pas de slot)
3. **`slot="actions"`** : Zone des boutons d'action (optionnel)

## Propriétés importantes de wcs-modal

- `show` : Afficher/masquer la modale (booléen)
- `show-close-button` : Afficher le bouton de fermeture (X)
- `close-button-aria-label` : Label d'accessibilité pour le bouton de fermeture
- `disable-auto-focus` : Désactiver le focus automatique sur le premier élément
- `modal-trigger-controls-id` : ID de l'élément qui déclenche la modale (accessibilité)

## Événements de wcs-modal

- `wcsDialogClosed` : Déclenché quand la modale se ferme
- `wcsDialogOpened` : Déclenché quand la modale s'ouvre

## Référence

Pour plus d'informations sur les composants WCS, consultez :
- Documentation SNCF Web Components
- Exemples dans `src/app/espace/admin/horaires/page.js`
- Exemples dans `src/app/espace/admin/materiels/page.js`

---

**Date de correction** : 9 décembre 2025  
**Fichier corrigé** : `src/app/espace/admin/fiches-horaires/page.js`

