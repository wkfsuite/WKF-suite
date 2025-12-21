// Assicurati di includere jsPDF nella pagina HTML:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

// Funzione helper per caricare il logo come base64
async function loadLogoAsBase64() {
  return new Promise(async (resolve, reject) => {
    // Prima prova a recuperare il logo personalizzato dalle impostazioni aziendali
    let logoPath = '/logo.png'; // Default fallback

    try {
      const companyResponse = await fetch('/api/company-settings');
      if (companyResponse.ok) {
        const companySettings = await companyResponse.json();
        if (companySettings && companySettings.logo_path) {
          logoPath = companySettings.logo_path;
          console.log('📸 Usando logo aziendale personalizzato per PDF:', logoPath);
        }
      }
    } catch (error) {
      console.log('⚠️ Impossibile recuperare logo personalizzato, uso default');
    }

    const img = new Image();
    img.crossOrigin = "anonymous"; // Per evitare problemi CORS

    img.onload = function() {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const base64 = canvas.toDataURL('image/png');
        resolve(base64);
      } catch (error) {
        resolve(null);
      }
    };

    img.onerror = function() {
      resolve(null); // Non bloccare il PDF se il logo non si carica
    };

    img.src = logoPath;
  });
}

window.generaPDF = async (r) => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');

  // Logo aziendale
  try {
    // Carica il logo in modo asincrono
    const logoBase64 = await loadLogoAsBase64();
    if (logoBase64) {
      const logoWidth = 35;
      const logoHeight = 20;
      doc.addImage(logoBase64, 'PNG', 10, 10, logoWidth, logoHeight);
    }
  } catch (error) {
    console.log('Logo non disponibile per PDF:', error);
  }

  // Titolo (spostato un po' più in basso per fare spazio al logo)
  doc.setFontSize(18);
  doc.text("Permesso Aziendale", 105, 35, null, null, "center");

  doc.setFontSize(12);
  let y = 50;

  const addLine = (label, value) => {
    doc.text(`${label}: ${value || "-"}`, 20, y);
    y += 10;
  };

  addLine("Nome", r.nome || r.username || "Sconosciuto");
  addLine("Ruolo", r.ruolo || "utente");
  addLine("Tipo permesso", r.tipo);
  addLine("Data", r.data || (r.dal + " - " + r.al) || "-");
  addLine("Orario", r.oraInizio ? `${r.oraInizio} - ${r.oraFine || "-"}` : "-");
  addLine("Note", r.note);
  addLine("Stato", r.stato);

  // Aggiungi tipi di permesso
  let tipiPermesso = [];
  if (r.retribuito) tipiPermesso.push("Retribuito");
  if (r.daRecuperare) tipiPermesso.push("Da Recuperare");
  if (r.nonRetribuito) tipiPermesso.push("Non Retribuito");
  if (r.permessoSindacale) tipiPermesso.push("Permesso Sindacale");
  if (r.inCFerie) tipiPermesso.push("In C/Ferie");

  if (tipiPermesso.length > 0) {
    addLine("Tipologia", tipiPermesso.join(", "));
  }

  // Firma e data (modificabile)
  y += 10;
  doc.text("Firma:", 20, y);
  doc.text("Data:", 120, y);

  // Messaggio ambientale professionale
  y += 25;

  // Bordo verde sottile per evidenziare il messaggio
  doc.setDrawColor(34, 139, 34); // Verde foresta
  doc.setLineWidth(0.5);
  doc.rect(15, y - 8, 180, 20);

  // Sfondo verde molto chiaro
  doc.setFillColor(240, 255, 240); // Verde molto chiaro
  doc.rect(15, y - 8, 180, 20, 'F');

  // Messaggio principale con icona
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(34, 139, 34); // Verde foresta

  // Icone e testi in italiano e inglese
  doc.text("🌱 NON STAMPARE - SALVA IL PIANETA", 105, y - 2, null, null, "center");
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.text("Rispetta l'ambiente. Hai davvero bisogno di stampare questo documento?", 105, y + 4, null, null, "center");

  // Separatore
  doc.setTextColor(100, 100, 100);
  doc.text("•   •   •", 105, y + 8, null, null, "center");

  // Versione inglese
  doc.setTextColor(34, 139, 34);
  doc.text("🌍 DON'T PRINT - SAVE THE PLANET", 105, y + 12, null, null, "center");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text("Please consider the environment – Do you really need to print this document?", 105, y + 16, null, null, "center");

  // Salvataggio PDF
  doc.save(`Permesso_${r.id}.pdf`);
};

// Wrapper async per compatibilità con onclick
window.generaPDFAsync = async (r) => {
  try {
    await generaPDF(r);
  } catch (error) {
    console.error('Errore generazione PDF:', error);
    alert('Errore durante la generazione del PDF');
  }
};
