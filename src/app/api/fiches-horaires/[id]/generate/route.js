import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: 'horaires',
  charset: 'utf8mb4'
};

async function getConnection() {
  return await mysql.createConnection(dbConfig);
}

// POST - Générer le PDF pour une fiche horaire
export async function POST(request, { params }) {
  let connection;
  try {
    const { id } = await params;
    connection = await getConnection();

    // Récupérer la fiche horaire
    const [fiches] = await connection.execute(
      `SELECT 
        fh.*,
        sa.nom as service_annuel_nom,
        sa.date_debut as service_date_debut,
        sa.date_fin as service_date_fin
       FROM fiches_horaires fh
       LEFT JOIN services_annuels sa ON fh.service_annuel_id = sa.id
       WHERE fh.id = ?`,
      [id]
    );

    if (fiches.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Fiche horaire non trouvée'
      }, { status: 404 });
    }

    const fiche = fiches[0];

    // Vérifier que le service_annuel_id existe
    if (!fiche.service_annuel_id) {
      return NextResponse.json({
        success: false,
        message: 'La fiche horaire n\'a pas de service annuel associé'
      }, { status: 400 });
    }

    // Récupérer les horaires (sillons) pour ce service annuel
    const [horaires] = await connection.execute(
      `SELECT 
        h.*,
        ds.nom as depart_station_nom,
        as_.nom as arrivee_station_nom,
        mr.nom as materiel_nom
       FROM horaires h
       LEFT JOIN ferrovia_ter_bfc.stations ds ON h.depart_station_id = ds.id
       LEFT JOIN ferrovia_ter_bfc.stations as_ ON h.arrivee_station_id = as_.id
       LEFT JOIN ferrovia_ter_bfc.materiel_roulant mr ON h.materiel_id = mr.id
       WHERE h.service_annuel_id = ?
       ORDER BY h.depart_time ASC`,
      [fiche.service_annuel_id]
    );

    // Générer le PDF
    const pdfPath = await generatePDF(fiche, horaires);

    // Mettre à jour la fiche avec le chemin du PDF
    await connection.execute(
      `UPDATE fiches_horaires 
       SET pdf_path = ?, statut = 'généré'
       WHERE id = ?`,
      [pdfPath, id]
    );

    return NextResponse.json({
      success: true,
      message: 'PDF généré avec succès',
      pdf_path: pdfPath
    });
  } catch (error) {
    console.error('Erreur génération PDF:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la génération du PDF: ' + error.message
    }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}

async function generatePDF(fiche, horaires) {
  try {
    // Créer le dossier public/fh s'il n'existe pas
    const fhDir = path.join(process.cwd(), 'public', 'fh');
    await fs.mkdir(fhDir, { recursive: true });

    // Nom du fichier PDF
    const filename = `fiche_${fiche.id}_${Date.now()}.pdf`;
    const filepath = path.join(fhDir, filename);
    const publicPath = `/fh/${filename}`;

    // Créer un nouveau document PDF
    const pdfDoc = await PDFDocument.create();

    // Ajouter une page A4 en mode paysage
    const page = pdfDoc.addPage([842, 595]); // A4 landscape
    const { width, height } = page.getSize();

    // Charger les polices
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Couleurs Mobigo BFC - Exact matching de l'image
    const mobigoPink = rgb(0.894, 0, 0.498);       // #E4007F
    const mobigoYellow = rgb(1, 0.867, 0);         // #FFdd00
    const mobigoOrange = rgb(1, 0.549, 0);         // #FF8C00
    const black = rgb(0, 0, 0);
    const white = rgb(1, 1, 1);
    const lightGray = rgb(0.95, 0.95, 0.95);

    // === HEADER SECTION (Rose) - pixel perfect (sans logo) ===

    // Dimensions de l'en-tête (A4 landscape 842x595)
    const headerHeight = 92;        // hauteur totale de l'entête
    const logoAreaWidth = 140;      // zone blanche à gauche (où le logo est placé normalement)
    const titleLeftPadding = 22;    // padding intérieur à gauche de la bande rose

    // Dessiner la zone blanche gauche (espace logo)
    page.drawRectangle({
      x: 0,
      y: height - headerHeight,
      width: logoAreaWidth,
      height: headerHeight,
      color: white,
    });

    // Dessiner la grande bande rose à droite (commence après la zone logo)
    page.drawRectangle({
      x: logoAreaWidth,
      y: height - headerHeight,
      width: width - logoAreaWidth,
      height: headerHeight,
      color: mobigoPink,
    });

    // Calcul vertical centré pour titre et sous-titre dans la bande rose
    const titleFontSize = 28;    // taille du titre (gras)
    const subtitleFontSize = 8;  // taille du sous-titre

    // Position X pour le texte (à l'intérieur de la bande rose)
    const textX = logoAreaWidth + titleLeftPadding;

    // Position Y : centrer le bloc titre+subtitle dans la bande rose
    const titleBlockCenterY = height - headerHeight / 2;

    // Titre principal (ligne) — mise en majuscules
    const routeTitle = (fiche.nom || '').toUpperCase();
    page.drawText(routeTitle, {
      x: textX,
      y: titleBlockCenterY + 8, // léger offset pour visuel identique
      size: titleFontSize,
      font: fontBold,
      color: white,
    });

    // Sous-titre : dates de validité
    const dateDebut = fiche.service_date_debut ? new Date(fiche.service_date_debut).toLocaleDateString('fr-FR') : '';
    const dateFin = fiche.service_date_fin ? new Date(fiche.service_date_fin).toLocaleDateString('fr-FR') : '';
    const validityText = `HORAIRES VALABLES DU ${dateDebut} AU ${dateFin}`;

    page.drawText(validityText, {
      x: textX,
      y: titleBlockCenterY - 14,
      size: subtitleFontSize,
      font: font,
      color: white,
    });

    // Bande orange d'information sous l'en-tête
    const orangeBandHeight = 18;
    const orangeBandY = height - headerHeight - orangeBandHeight - 6; // léger espacement

    if (fiche.type_fiche === 'Travaux') {
      // Bande orange pleine largeur
      page.drawRectangle({
        x: 0,
        y: orangeBandY,
        width: width,
        height: orangeBandHeight,
        color: mobigoOrange,
      });

      // Petit triangle d'avertissement stylisé (fallback texte) — placé dans la zone orange
      page.drawText('/!\\', {
        x: 18,
        y: orangeBandY + 3,
        size: 10,
        font: fontBold,
        color: white,
      });

      // Texte principal dans la bande orange
      page.drawText('INFO TRAFIC TRAVAUX :', {
        x: 44,
        y: orangeBandY + 4,
        size: 8,
        font: fontBold,
        color: white,
      });

      page.drawText('Les travaux peuvent impacter la circulation des trains. Durant ces périodes, les horaires des trains peuvent être modifiés.', {
        x: 180,
        y: orangeBandY + 4,
        size: 7,
        font: font,
        color: white,
      });

      // Dessiner chevrons diagonaux blancs sur la partie droite de la bande orange
      const chevronW = 20; // largeur d'un chevron
      const chevronGap = 8; // espace entre chevrons
      // point de départ à droite
      let cx = width - 12 - chevronW;
      while (cx > logoAreaWidth + 60) {
        // triangle incliné (chevron) - construire points en sens basique
        const points = [
          { x: cx + chevronW, y: orangeBandY },
          { x: cx, y: orangeBandY + orangeBandHeight / 2 },
          { x: cx + chevronW, y: orangeBandY + orangeBandHeight },
        ];
        page.drawPolygon(points, { color: white });
        cx -= chevronW + chevronGap;
      }
    }

    // Avancer la position Y pour le reste du contenu après header + bande orange
    let yPosition = orangeBandY - 22;

    // === TABLEAU DES HORAIRES ===
    yPosition -= 15;
    const tableTop = yPosition;
    const leftMargin = 12;
    const firstColWidth = 160;

    // Construire l'objet `trains` à partir des horaires (clé: numero_train)
    const trains = {};
    (horaires || []).forEach(h => {
      const key = h.numero_train || (`train_${h.id || Math.random()}`);
      if (!trains[key]) trains[key] = [];
      trains[key].push(h);
    });

    // Préparer trains et colonnes
    const trainKeys = Object.keys(trains);
    const maxCols = Math.min(trainKeys.length, 14);
    const availableWidth = width - leftMargin - firstColWidth - 12;
    const colWidth = Math.max(36, Math.floor(availableWidth / Math.max(1, maxCols)));

    // En-tête à deux niveaux
    const headerLevel1Height = 18; // petites pastilles roses
    const headerLevel2Height = 20; // ligne des numéros

    const headerYTop = tableTop;

    // Dessiner la ligne des petites pastilles roses (niveau 1)
    for (let i = 0; i < maxCols; i++) {
      const x = leftMargin + firstColWidth + i * colWidth;
      // petite pastille rose (rectangle) centrée horizontalement dans la colonne
      const pad = 4;
      const pillW = colWidth - pad * 2;
      const pillH = headerLevel1Height - 6;
      page.drawRectangle({
        x: x + pad,
        y: headerYTop - pillH - 4,
        width: pillW,
        height: pillH,
        color: mobigoPink,
      });

      // Label blanc 'TRAIN' au-dessus (petit)
      page.drawText('TRAIN', {
        x: x + (colWidth - fontBold.widthOfTextAtSize('TRAIN', 6)) / 2,
        y: headerYTop - 8,
        size: 6,
        font: fontBold,
        color: white,
      });
    }

    // Niveau 2 : barre claire pour les numéros (sous les pastilles)
    const header2Y = headerYTop - headerLevel1Height - 2;
    page.drawRectangle({
      x: leftMargin,
      y: header2Y - headerLevel2Height,
      width: width - leftMargin * 2,
      height: headerLevel2Height,
      color: rgb(0.98, 0.95, 0.97),
    });

    // Label première colonne (Numéro de circulation)
    page.drawText('Numéro de circulation', {
      x: leftMargin + 4,
      y: header2Y - headerLevel2Height + 6,
      size: 6.5,
      font: fontBold,
      color: black,
    });

    // Lignes des numéros de train centrés
    for (let i = 0; i < maxCols; i++) {
      const trainNum = trainKeys[i] || '';
      const x = leftMargin + firstColWidth + i * colWidth;
      const txtW = font.widthOfTextAtSize(trainNum, 7);
      page.drawText(trainNum, {
        x: x + (colWidth - txtW) / 2,
        y: header2Y - headerLevel2Height + 6,
        size: 7,
        font: font,
        color: black,
      });
    }

    // Simuler des séparateurs verticaux 'pointillés' entre colonnes (petits rectangles)
    const dashH = 6;
    const dashGap = 3;
    for (let i = 0; i <= maxCols; i++) {
      const sx = leftMargin + firstColWidth + i * colWidth;
      // ne pas dessiner pour la première ligne à gauche du nom de gare
      if (i === 0) continue;
      let dy = header2Y - headerLevel2Height - 2;
      while (dy > header2Y - headerLevel2Height - 180) { // tirer un peu sous les en-têtes
        page.drawRectangle({ x: sx - 0.5, y: dy, width: 1, height: dashH, color: rgb(0.88, 0.78, 0.82) });
        dy -= (dashH + dashGap);
      }
    }

    // Construire la liste des gares (préservée) — réutiliser stationsList si existante
    const stations = new Set();
    horaires.forEach(h => {
      if (h.depart_station_nom) stations.add(h.depart_station_nom);
      if (h.arrivee_station_nom) stations.add(h.arrivee_station_nom);
    });
    const stationsList = Array.from(stations).slice(0, 30);

    // Dessiner les lignes de gare
    let rowY = header2Y - headerLevel2Height - 8;
    const rowHeight = 16;
    stationsList.forEach((station, idx) => {
      // Fond alterné très pâle (rose) pour certaines lignes comme sur l'image
      if (idx % 2 === 1) {
        page.drawRectangle({ x: leftMargin, y: rowY - rowHeight + 2, width: width - leftMargin * 2, height: rowHeight, color: rgb(0.995, 0.97, 0.978) });
      }

      const isMain = idx === 0 || idx === stationsList.length - 1;
      const stationFont = isMain ? fontBold : font;
      const stationSize = isMain ? 8 : 7;

      // Nom de la gare dans la première colonne
      page.drawText(station || '', { x: leftMargin + 6, y: rowY - 3, size: stationSize, font: stationFont, color: black });

      // Pour chaque train, afficher l'heure centrée
      for (let i = 0; i < maxCols; i++) {
        const trainNum = trainKeys[i];
        const trainHoraires = trains[trainNum] || [];
        // chercher un horaire correspondant à cette gare
        const horaire = trainHoraires.find(h => h.depart_station_nom === station || h.arrivee_station_nom === station);
        let timeText = '';
        if (horaire) {
          if (horaire.depart_station_nom === station && horaire.depart_time) timeText = horaire.depart_time.substring(0,5);
          else if (horaire.arrivee_station_nom === station && horaire.arrivee_time) timeText = horaire.arrivee_time.substring(0,5);
        }
        const x = leftMargin + firstColWidth + i * colWidth;
        const tw = font.widthOfTextAtSize(timeText || '', 7);
        page.drawText(timeText || '|', { x: x + (colWidth - tw) / 2, y: rowY - 3, size: 7, font: font, color: black });
      }

      // séparateurs verticaux (simples) pour la ligne
      for (let i = 0; i <= maxCols; i++) {
        const sx = leftMargin + firstColWidth + i * colWidth;
        // trait fin
        page.drawLine({ start: { x: sx, y: rowY + 6 }, end: { x: sx, y: rowY - rowHeight + 6 }, thickness: 0.5, color: rgb(0.9,0.85,0.88) });
      }

      rowY -= rowHeight;
    });

    // Dessiner une petite bande d'icones (pictos vélos etc.) sous le tableau — placeholder cercles
    let iconX = leftMargin + 4;
    const iconY = rowY - 8;
    for (let i = 0; i < 12; i++) {
      page.drawCircle({ x: iconX + 6, y: iconY, size: 3, color: black });
      iconX += 20;
    }

    // Ajuster yPosition pour la suite
    yPosition = rowY - 12;

    // === FOOTER ===
    const footerY = 65;

    // Ligne de séparation avant le footer
    page.drawLine({
      start: { x: leftMargin, y: footerY + 45 },
      end: { x: width - leftMargin, y: footerY + 45 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    // Informations sur les trains (gauche)
    page.drawText('TRAIN Mobigo', {
      x: leftMargin,
      y: footerY + 30,
      size: 7,
      font: fontBold,
      color: black,
    });

    page.drawText('Train organisé par la Région Bourgogne-Franche-Comté', {
      x: leftMargin + 60,
      y: footerY + 30,
      size: 6,
      font: font,
      color: black,
    });

    page.drawText('TER AURA', {
      x: leftMargin,
      y: footerY + 20,
      size: 7,
      font: fontBold,
      color: black,
    });

    page.drawText('Train organisé par la Région Auvergne-Rhône-Alpes', {
      x: leftMargin + 60,
      y: footerY + 20,
      size: 6,
      font: font,
      color: black,
    });

    // Légende circulation (milieu gauche)
    page.drawText('Circulation:', {
      x: leftMargin,
      y: footerY,
      size: 7,
      font: fontBold,
      color: black,
    });

    page.drawText('(1) Circule les :', {
      x: leftMargin + 60,
      y: footerY,
      size: 6,
      font: font,
      color: black,
    });

    page.drawText('(2) Circule le :', {
      x: leftMargin + 150,
      y: footerY,
      size: 6,
      font: font,
      color: black,
    });

    page.drawText("(3) Circule les jours ouvres, c'est a dire : 25 mai.", {
      x: leftMargin + 240,
      y: footerY,
      size: 6,
      font: font,
      color: black,
    });

    // Informations horaires (milieu)
    page.drawText("(4) Horaires donnes a titre indicatif, consultez vos horaires avant depart.", {
      x: width / 2 - 100,
      y: footerY + 30,
      size: 6,
      font: font,
      color: black,
    });

    page.drawText("(5) N'oubliez pas de vous reporter aux renvois.", {
      x: width / 2 - 100,
      y: footerY + 20,
      size: 6,
      font: font,
      color: black,
    });

    // Contact (droite)
    page.drawText('Nous contacter :', {
      x: width - 200,
      y: footerY + 35,
      size: 8,
      font: fontBold,
      color: black,
    });

    page.drawText('Site TER', {
      x: width - 200,
      y: footerY + 23,
      size: 7,
      font: fontBold,
      color: black,
    });

    page.drawText('Bourgogne-Franche-Comté', {
      x: width - 200,
      y: footerY + 15,
      size: 6,
      font: font,
      color: black,
    });

    page.drawText('www.ter.sncf.com/bourgogne-franche-comte', {
      x: width - 200,
      y: footerY + 7,
      size: 6,
      font: font,
      color: black,
    });

    page.drawText('Mobigo', {
      x: width - 80,
      y: footerY + 23,
      size: 7,
      font: fontBold,
      color: black,
    });

    page.drawText('03 80 11 29 29', {
      x: width - 80,
      y: footerY + 15,
      size: 6,
      font: font,
      color: black,
    });

    page.drawText('Du lundi au samedi de 7h à 20h', {
      x: width - 80,
      y: footerY + 7,
      size: 5,
      font: font,
      color: black,
    });

    // Logo region et SNCF (bas)
    page.drawText('Service assuré par', {
      x: leftMargin,
      y: 15,
      size: 5,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText('REGION BOURGOGNE FRANCHE COMTE', {
      x: leftMargin + 80,
      y: 15,
      size: 6,
      font: fontBold,
      color: black,
    });

    page.drawText('|  www.mobigo-bfc.fr', {
      x: leftMargin + 240,
      y: 15,
      size: 6,
      font: font,
      color: black,
    });

    // Sauvegarder le PDF
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(filepath, pdfBytes);

    return publicPath;
  } catch (error) {
    console.error('Erreur dans generatePDF:', error);
    throw error;
  }
}

export { generatePDF };
