"use client";
import React, { useState, useRef, useEffect } from 'react';

export default function MaterialForm(){
  const [editMateriel, setEditMateriel] = useState(null);
  const [nom, setNom] = useState('');
  const [nomTechnique, setNomTechnique] = useState('');
  const [capacite, setCapacite] = useState(0);
  const [typeTrain, setTypeTrain] = useState('TER');
  const [exploitant, setExploitant] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleEditEvent = (event) => {
      const materiel = event.detail;
      setEditMateriel(materiel);
      setNom(materiel.nom || '');
      setNomTechnique(materiel.nom_technique || '');
      setCapacite(materiel.capacite || 0);
      setTypeTrain(materiel.type_train || 'TER');
      setExploitant(materiel.exploitant || '');
      setImageFile(null);
      setMessage(null);

      // Ouvrir la modal de création (elle servira aussi pour l'édition)
      const modal = document.querySelector('wcs-modal[data-materiel-modal]');
      if(modal){
        modal.setAttribute('show', '');
      }
    };

    window.addEventListener('edit-materiel', handleEditEvent);
    return () => window.removeEventListener('edit-materiel', handleEditEvent);
  }, []);

  function fileToBase64(file){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onload = ()=> resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function handleFileChange(e){
    const input = e.target;
    const file = input.files && input.files[0];
    console.log('Fichier sélectionné:', file ? file.name : 'aucun');
    setImageFile(file || null);
  }

  async function handleSubmit(e){
    e && e.preventDefault();
    setMessage(null);
    if(!nom || !typeTrain) return setMessage('Nom et type sont requis');
    if(Number(capacite) < 0) return setMessage('Capacité invalide');

    setLoading(true);
    const isEditing = editMateriel && editMateriel.id;

    try{
      let image_base64 = null;
      let image_filename = null;
      if(imageFile){
        console.log('[MaterialForm] Encodage de l\'image:', imageFile.name);
        image_base64 = await fileToBase64(imageFile);
        image_filename = imageFile.name;
        console.log('[MaterialForm] Image encodée, taille base64:', image_base64?.length);
      } else {
        console.log('[MaterialForm] Aucun fichier image sélectionné');
      }

      const payload = {
        nom,
        nom_technique: nomTechnique,
        capacite,
        type_train: typeTrain,
        exploitant,
        image_base64,
        image_filename
      };
      console.log('[MaterialForm] Envoi du payload avec image_filename:', image_filename);

      const url = isEditing ? `/api/admin/materiels/${editMateriel.id}` : '/api/admin/materiels';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if(!res.ok){
        const err = await res.json();
        setMessage(err.error || 'Erreur');
      } else {
        const data = await res.json();
        const successMsg = isEditing
          ? `Matériel modifié (ID ${data.id}, N° ${data.numero_serie})`
          : `Matériel créé (ID ${data.id}, N° ${data.numero_serie})`;
        setMessage(successMsg);

        // reset form
        setNom('');
        setNomTechnique('');
        setCapacite(0);
        setTypeTrain('TER');
        setExploitant('');
        setImageFile(null);
        setEditMateriel(null);

        // Réinitialiser l'input file
        if(fileInputRef.current){
          fileInputRef.current.value = '';
        }

        // Déclencher un événement pour rafraîchir la liste
        window.dispatchEvent(new CustomEvent('materiel-created'));

        // fermer la modal WCS après un court délai pour voir le message
        setTimeout(() => {
          try{
            const modal = document.querySelector('wcs-modal[data-materiel-modal]');
            if(modal){
              modal.removeAttribute('show');
            }
          }catch(e){
            console.warn('Impossible de fermer la modal automatiquement', e);
          }
        }, 1000);
      }

    }catch(err){
      console.error(err);
      setMessage(isEditing ? 'Erreur lors de la modification' : 'Erreur lors de la création');
    }finally{
      setLoading(false);
    }
  }

  function resetForm() {
    setNom('');
    setNomTechnique('');
    setCapacite(0);
    setTypeTrain('TER');
    setExploitant('');
    setImageFile(null);
    setMessage(null);
    setEditMateriel(null);
    if(fileInputRef.current){
      fileInputRef.current.value = '';
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {editMateriel && (
        <div style={{
          padding: '12px',
          background: '#e3f2fd',
          borderLeft: '4px solid #2196f3',
          borderRadius: '4px',
          marginBottom: '8px'
        }}>
          <strong>Mode édition</strong> - Matériel: {editMateriel.nom} (N° {editMateriel.numero_serie})
        </div>
      )}

      <div>
        <label htmlFor="nom" style={{display: "block", marginBottom: "8px"}}>Nom du matériel *</label>
        <wcs-input id="nom" value={nom} onInput={(e)=>setNom(e.target.value)} required></wcs-input>
      </div>

      <div>
        <label htmlFor="nom-technique" style={{display: "block", marginBottom: "8px"}}>Nom technique</label>
        <wcs-input id="nom-technique" value={nomTechnique} onInput={(e)=>setNomTechnique(e.target.value)}></wcs-input>
      </div>

      <div>
        <label htmlFor="capacite" style={{display: "block", marginBottom: "8px"}}>Capacité</label>
        <wcs-input id="capacite" type="number" value={String(capacite)} onInput={(e)=>setCapacite(Number(e.target.value))}></wcs-input>
      </div>

      <div>
        <label htmlFor="type-train" style={{display: "block", marginBottom: "8px"}}>Type de train *</label>
        <wcs-input
          id="type-train"
          value={typeTrain}
          onInput={(e)=>setTypeTrain(e.target.value)}
          placeholder="Ex: TER, TGV, Intercités, RER..."
          required
        ></wcs-input>
        <p style={{fontSize: '12px', color: '#666', marginTop: '4px'}}>
          Exemples: TER, TGV, Intercités, RER, Transilien, TGV INOUI, OUIGO, etc.
        </p>
      </div>

      <div>
        <label htmlFor="exploitant" style={{display: "block", marginBottom: "8px"}}>Type de train (Exploitant)</label>
        <wcs-native-select size="m">
          <select id="exploitant" value={exploitant} onChange={(e)=>setExploitant(e.target.value)}>
            <option value="">-- Sélectionner --</option>
            <option value="SNCF Voyageurs">SNCF Voyageurs</option>
            <option value="Île-de-France Mobilités">Île-de-France Mobilités</option>
            <option value="RATP">RATP</option>
            <option value="Régiolis">Régiolis</option>
            <option value="Régio2N">Régio2N</option>
            <option value="Autre">Autre</option>
          </select>
        </wcs-native-select>
      </div>

      <div>
        <label htmlFor="image" style={{display: "block", marginBottom: "8px"}}>Image du matériel</label>
        <input 
          ref={fileInputRef}
          id="image" 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange}
          style={{
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            width: '100%',
            fontSize: '14px'
          }}
        />
        {imageFile && <p style={{fontSize: '12px', color: '#666', marginTop: '4px'}}>Fichier sélectionné : {imageFile.name}</p>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <wcs-button type="submit" disabled={loading}>
          {loading ? 'Envoi...' : (editMateriel ? 'Modifier' : 'Créer')}
        </wcs-button>
        <wcs-button mode="clear" type="button" onClick={resetForm}>
          Réinitialiser
        </wcs-button>
      </div>

      {message && (
        <div style={{ marginTop: 12 }}>
          <wcs-alert show>
            <span slot="header">{message}</span>
          </wcs-alert>
        </div>
      )}
    </form>
  )
}
