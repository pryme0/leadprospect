/**
 * Client-side PDF generation using jsPDF.
 * Renders clean, branded report pages.
 */

interface PdfSection {
  heading?: string;
  body: string;
}

interface PdfReportOptions {
  title: string;
  subtitle?: string;
  meta?: { label: string; value: string }[];
  score?: { value: number; label: string } | null;
  sections: PdfSection[];
  filename: string;
}

/** Load image as base64 data URL for jsPDF embedding */
async function loadImageAsDataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadPdf(opts: PdfReportOptions): Promise<void> {
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 20;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const ACCENT = [0, 206, 200] as [number, number, number];   // #00CEC8 brand cyan
  const DARK  = [17, 33, 38]  as [number, number, number];    // #112126
  const GREY  = [100, 116, 139] as [number, number, number];  // slate-500
  const WHITE = [255, 255, 255] as [number, number, number];

  // Load brand icon
  const logoDataUrl = await loadImageAsDataUrl('/icon-512.png');

  let y = 0;

  const ensurePage = (needed = 10) => {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // ── Header band ─────────────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, PAGE_W, 48, 'F');

  // Brand logo (or fallback text chip)
  const LOGO_H = 12;
  const LOGO_W = LOGO_H * (219 / 249); // maintain aspect ratio from 219×249 source
  let titleX = MARGIN + 34;

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', MARGIN + 2, 8, LOGO_W, LOGO_H);
    titleX = MARGIN + LOGO_W + 8;
  } else {
    // Fallback: accent chip with text
    doc.setFillColor(...ACCENT);
    doc.roundedRect(MARGIN, 10, 28, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text('PG', MARGIN + 8, 16.5);
  }

  // Title
  doc.setTextColor(...WHITE);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(opts.title, titleX, 17);

  if (opts.subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GREY);
    doc.text(opts.subtitle, titleX, 23);
  }

  // Accent bottom border of header
  doc.setFillColor(...ACCENT);
  doc.rect(0, 47, PAGE_W, 1.2, 'F');

  y = 58;

  // ── Score badge (if provided) ────────────────────────────────────────────
  if (opts.score != null) {
    const { value, label } = opts.score;
    // Background pill
    doc.setFillColor(0, 208, 132, 15);
    doc.roundedRect(MARGIN, y, CONTENT_W, 20, 3, 3, 'F');
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.4);
    doc.roundedRect(MARGIN, y, CONTENT_W, 20, 3, 3, 'S');

    // Score number
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...ACCENT);
    doc.text(`${value}`, MARGIN + 8, y + 13);

    doc.setFontSize(9);
    doc.setTextColor(...GREY);
    doc.text('/100', MARGIN + 8 + doc.getTextWidth(`${value}`) + 1, y + 13);

    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(label, MARGIN + 40, y + 9);

    y += 26;
  }

  // ── Meta rows (Profile, Location, etc.) ────────────────────────────────
  if (opts.meta && opts.meta.length > 0) {
    opts.meta.forEach(({ label, value }) => {
      ensurePage(8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...GREY);
      doc.text(`${label}:`, MARGIN, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(value, MARGIN + doc.getTextWidth(`${label}: `) + 1, y);
      y += 6;
    });
    y += 4;
  }

  // ── Sections ─────────────────────────────────────────────────────────────
  for (const section of opts.sections) {
    if (section.heading) {
      ensurePage(14);
      // Section heading with accent left bar
      doc.setFillColor(...ACCENT);
      doc.rect(MARGIN, y, 2.5, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(section.heading, MARGIN + 5, y + 5);
      y += 10;
    }

    if (section.body) {
      // Strip markdown symbols and split into lines
      const cleaned = section.body
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/^#{1,4}\s+/gm, '')
        .replace(/^[-*•]\s+/gm, '• ')
        .replace(/^\d+\.\s+/gm, (m) => m);

      const lines = doc.splitTextToSize(cleaned, CONTENT_W - 4);

      for (const line of lines) {
        ensurePage(6);
        const isBullet = line.trim().startsWith('•');
        doc.setFont('helvetica', isBullet ? 'normal' : 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        const xOffset = isBullet ? MARGIN + 3 : MARGIN;
        doc.text(line, xOffset, y);
        y += 5.5;
      }
      y += 4;
    }
  }

  // ── Footer on every page — logo + brand + page number ────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages();
  const FOOTER_H = 14;
  const FOOTER_LOGO_H = 6;
  const FOOTER_LOGO_W = FOOTER_LOGO_H * (219 / 249);

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(248, 250, 252);
    doc.rect(0, PAGE_H - FOOTER_H, PAGE_W, FOOTER_H, 'F');
    // Thin accent line above footer
    doc.setFillColor(...ACCENT);
    doc.rect(0, PAGE_H - FOOTER_H, PAGE_W, 0.4, 'F');

    let footerTextX = MARGIN;

    if (logoDataUrl) {
      doc.addImage(
        logoDataUrl, 'PNG',
        MARGIN, PAGE_H - FOOTER_H + (FOOTER_H - FOOTER_LOGO_H) / 2,
        FOOTER_LOGO_W, FOOTER_LOGO_H,
      );
      footerTextX = MARGIN + FOOTER_LOGO_W + 3;
    }

    doc.setFontSize(7.5);
    doc.setTextColor(...GREY);
    doc.text('ProspectGrid — Lead Intelligence Platform', footerTextX, PAGE_H - 4.5);
    doc.text(`Page ${i} of ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 4.5, { align: 'right' });
  }

  doc.save(opts.filename);
}
