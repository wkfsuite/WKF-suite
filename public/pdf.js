// Make sure to include jsPDF in the HTML page:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

// Helper function to load the logo as base64
async function loadLogoAsBase64() {
  return new Promise(async (resolve, reject) => {
    // First, try to retrieve the custom logo from company settings
    let logoPath = '/logo.png'; // Default fallback

    try {
      const companyResponse = await fetch('/api/company-settings');
      if (companyResponse.ok) {
        const companySettings = await companyResponse.json();
        if (companySettings && companySettings.logo_path) {
          logoPath = companySettings.logo_path;
          console.log('📸 Using custom company logo for PDF:', logoPath);
        }
      }
    } catch (error) {
      console.log('⚠️ Impossibile recuperare logo personalizzato, uso default');
    }

    const img = new Image();
    img.crossOrigin = "anonymous"; // To avoid CORS issues

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
      resolve(null); // Don't block the PDF if the logo fails to load
    };

    img.src = logoPath;
  });
}

window.generatePDF = async (r) => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');

  // Company Logo
  try {
    // Load the logo asynchronously
    const logoBase64 = await loadLogoAsBase64();
    if (logoBase64) {
      const logoWidth = 35;
      const logoHeight = 20;
      doc.addImage(logoBase64, 'PNG', 10, 10, logoWidth, logoHeight);
    }
  } catch (error) {
    console.log('Logo not available for PDF:', error);
  }

  // Title (moved down a bit to make space for the logo)
  doc.setFontSize(18);
  doc.text("Company Leave Request", 105, 35, null, null, "center");

  doc.setFontSize(12);
  let y = 50;

  const addLine = (label, value) => {
    doc.text(`${label}: ${value || "-"}`, 20, y);
    y += 10;
  };

  addLine("Name", r.name || r.username || "Unknown");
  addLine("Role", r.ruolo || "user");
  addLine("Leave Type", r.type);
  addLine("Date(s)", r.date || (r.from + " - " + r.to) || "-");
  addLine("Time", r.startTime ? `${r.startTime} - ${r.endTime || "-"}` : "-");
  addLine("Notes", r.notes);
  addLine("Status", r.status);

  // Add leave categories
  let leaveCategories = [];
  if (r.retribuito) leaveCategories.push("Paid");
  if (r.daRecuperare) leaveCategories.push("To Be Compensated");
  if (r.nonRetribuito) leaveCategories.push("Unpaid");
  if (r.permessoSindacale) leaveCategories.push("Union Leave");
  if (r.inCFerie) leaveCategories.push("On Vacation");

  if (leaveCategories.length > 0) {
    addLine("Category", leaveCategories.join(", "));
  }

  // Signature and date (editable)
  y += 10;
  doc.text("Signature:", 20, y);
  doc.text("Data:", 120, y);

  // Professional environmental message
  y += 25;

  // Thin green border to highlight the message
  doc.setDrawColor(34, 139, 34); // Forest Green
  doc.setLineWidth(0.5);
  doc.rect(15, y - 8, 180, 20);

  // Very light green background
  doc.setFillColor(240, 255, 240); // Very light green
  doc.rect(15, y - 8, 180, 20, 'F');

  // Main message with icon
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(34, 139, 34); // Forest Green

  // Icons and text in Italian and English
  doc.text("🌱 NON STAMPARE - SALVA IL PIANETA", 105, y - 2, null, null, "center");
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.text("Rispetta l'ambiente. Hai davvero bisogno di stampare questo documento?", 105, y + 4, null, null, "center");

  // Separator
  doc.setTextColor(100, 100, 100);
  doc.text("•   •   •", 105, y + 8, null, null, "center");

  // English version
  doc.setTextColor(34, 139, 34);
  doc.text("🌍 DON'T PRINT - SAVE THE PLANET", 105, y + 12, null, null, "center");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text("Please consider the environment – Do you really need to print this document?", 105, y + 16, null, null, "center");

  // Save PDF
  doc.save(`LeaveRequest_${r.id}.pdf`);
};

// Async wrapper for onclick compatibility
window.generatePDFAsync = async (r) => {
  try {
    await window.generatePDF(r);
  } catch (error) {
    console.error('PDF generation error:', error);
    alert('Error during PDF generation');
  }
};
