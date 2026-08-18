import type { Application } from '../types';
import { formatDate } from '../lib/dateUtils';

function line(doc: any, y: number, lm: number, pw: number) {
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(lm, y, pw - lm, y);
}

function sectionTitle(doc: any, text: string, y: number, lm: number, pw: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(text.toUpperCase(), lm, y + 4);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.4);
  doc.line(lm, y + 6, pw - lm, y + 6);
  return y + 11;
}

function kv(doc: any, k: string, v: string, x: number, y: number, kw = 35, vw = 50): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(k, x, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  const lines = doc.splitTextToSize(v || '—', vw);
  doc.text(lines, x + kw, y);
  return y + lines.length * 4.5;
}

export async function generateApplicationPDF(app: Application): Promise<void> {
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();   // 210
  const H = doc.internal.pageSize.getHeight();  // 297
  const lm = 12;
  const cw = W - lm * 2;                        // content width = 186
  const mid = lm + cw / 2;                      // center-x = 105
  const fd = app.formData;

  let y = 0;

  // ── HEADER BAND ─────────────────────────────────────────────────────────────
  let textStartX = lm + 45;
  try {
    const img = new Image();
    img.src = '/pu-logo.png';
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
    const imgRatio = img.width / img.height;
    const imgHeight = 20; // Original logo height
    const imgWidth = imgHeight * imgRatio;
    doc.addImage(img, 'PNG', lm, 5, imgWidth, imgHeight);
    textStartX = lm + imgWidth + 8;
  } catch {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('PARUL UNIVERSITY', lm, 12);
    textStartX = lm + 55;
  }

  // Left/Center: Department & Form Info (Address removed per requirement)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text('Internship Cell', textStartX, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text('Candidate Information Form', textStartX, 15);

  // Right: Application Details (Status removed per requirement)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text(app.id, W - lm, 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`Applied: ${formatDate(app.appliedDate)}`, W - lm, 15, { align: 'right' });
  doc.text(`Position: ${app.internship.postName}  |  Dept: ${app.internship.department}`, W - lm, 20, { align: 'right' });

  y = 32;

  // ── SEC 1: CANDIDATE INFORMATION ────────────────────────────────────────────
  y = sectionTitle(doc, '1. Candidate Information', y, lm, W);

  // Row 1
  const kw = 35;
  const vw = 50;
  let y1, y2;

  y1 = kv(doc, 'Institute:', fd?.instituteName ?? 'Parul University', lm, y, kw, vw);
  y2 = kv(doc, 'Department:', fd?.departmentName ?? app.internship.department, mid, y, kw, vw);
  y = Math.max(y1, y2) + 1;

  y1 = kv(doc, 'Full Name:', fd?.fullName ?? '—', lm, y, kw, vw);
  y2 = kv(doc, 'Enrollment No:', fd?.enrollmentNumber ?? '—', mid, y, kw, vw);
  y = Math.max(y1, y2) + 1;

  y1 = kv(doc, 'Contact No:', fd?.contact ?? '—', lm, y, kw, vw);
  y2 = kv(doc, 'Parul Email:', fd?.email ?? '—', mid, y, kw, vw);
  y = Math.max(y1, y2) + 1;

  y1 = kv(doc, "Father's Name:", fd?.fatherName ?? '—', lm, y, kw, vw);
  y2 = kv(doc, "Mother's Name:", fd?.motherName ?? '—', mid, y, kw, vw);
  y = Math.max(y1, y2) + 1;

  y1 = kv(doc, 'Date of Birth:', fd?.dateOfBirth ? formatDate(fd.dateOfBirth) : '—', lm, y, kw, vw);
  y2 = kv(doc, 'Gender:', fd?.gender ?? '—', mid, y, kw, vw);
  y = Math.max(y1, y2) + 1;

  const addrLines = doc.splitTextToSize(fd?.presentAddress ?? '—', cw - kw);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('Address:', lm, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text(addrLines, lm + kw, y);
  y += addrLines.length * 4.5 + 2;

  line(doc, y, lm, W);
  y += 3;

  // ── SEC 2: LANGUAGES ────────────────────────────────────────────────────────
  y = sectionTitle(doc, '2. Languages Known', y, lm, W);
  kv(doc, 'Languages:', fd?.languagesKnown ?? '—', lm, y, 35, cw - 35);
  y += 5;

  // ── SEC 3: EDUCATION ────────────────────────────────────────────────────────
  y = sectionTitle(doc, '3. Education Information', y, lm, W);

  // SPI table
  const spiScores = fd?.spiScores ?? {};
  const cellW = cw / 8;
  const hh = 6;
  const rh = 7;

  doc.setFillColor(250, 250, 250);
  doc.rect(lm, y, cw, hh, 'F');
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.rect(lm, y, cw, hh + rh);
  for (let i = 1; i < 8; i++) {
    doc.line(lm + i * cellW, y, lm + i * cellW, y + hh + rh);
  }
  doc.line(lm, y + hh, lm + cw, y + hh);

  for (let i = 0; i < 8; i++) {
    const cx = lm + i * cellW + cellW / 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`Sem ${i + 1}`, cx, y + 4, { align: 'center' });

    const score = (spiScores as any)[`sem${i + 1}`];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text(score != null && String(score).trim() !== '' ? String(score) : '—', cx, y + hh + 5, { align: 'center' });
  }
  y += hh + rh + 5;

  // CGPA / Backlogs / Semester / Attendance
  const stats = [
    ['CGPA:', fd?.cgpa != null ? String(fd.cgpa) : '—'],
    ['Live Backlogs:', fd?.backlogs != null ? String(fd.backlogs) : '—'],
    ['Current Semester:', fd?.semester != null ? String(fd.semester) : '—'],
    ['Attendance:', fd?.attendance != null ? `${fd.attendance}%` : '—'],
  ];
  const sw = cw / 4;
  stats.forEach(([k, v], i) => {
    const sx = lm + i * sw;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(k, sx, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text(v, sx, y + 5);
  });
  y += 8;

  // ── SEC 4: TASKS ─────────────────────────────────────────────────────────────
  y = sectionTitle(doc, '4. Relevant Tasks / Experience', y, lm, W);
  const taskLines = doc.splitTextToSize(fd?.tasksCanPerform ?? '—', cw);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text(taskLines.slice(0, 4), lm, y);
  y += Math.min(taskLines.length, 4) * 4.5 + 4;

  // ── SEC 5: SUPPORT ───────────────────────────────────────────────────────────
  y = sectionTitle(doc, '5. Support Information', y, lm, W);
  const suppLines = doc.splitTextToSize(fd?.supportInformation || '(Not provided)', cw);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text(suppLines.slice(0, 3), lm, y);
  y += Math.min(suppLines.length, 3) * 4.5 + 4;

  // ── SEC 6: REFERENCES ────────────────────────────────────────────────────────
  y = sectionTitle(doc, '6. References', y, lm, W);

  const r1x = lm, r2x = mid;
  const refs = [
    { x: r1x, name: fd?.reference1Name, desig: fd?.reference1Designation, contact: fd?.reference1Contact, label: 'Reference 1' },
    { x: r2x, name: fd?.reference2Name, desig: fd?.reference2Designation, contact: fd?.reference2Contact, label: 'Reference 2' },
  ];
  for (const ref of refs) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(ref.label, ref.x, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text(ref.name || '—', ref.x, y + 4.5);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text((ref.desig || '—') + '  |  ' + (ref.contact || '—'), ref.x, y + 9);
  }
  y += 13;

  // ── SEC 7: DECLARATION ───────────────────────────────────────────────────────
  y = sectionTitle(doc, '7. Declaration', y, lm, W);
  const decl = 'I hereby declare that the information provided by me is true and accurate. Any false or misleading information may disqualify me from the internship program.';
  const declLines = doc.splitTextToSize(decl, cw - 5);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(declLines, lm, y);
  y += declLines.length * 4.5 + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text(fd?.declarationAccepted ? '[X]  I agree to the above declaration.' : '[ ]  (Not accepted)', lm, y);
  y += 6;

  // ── SEC 8: SIGNATURE ─────────────────────────────────────────────────────────
  y = sectionTitle(doc, '8. Digital Signature', y, lm, W);

  const sigW = 75;
  const sigH = 16;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(lm, y, sigW, sigH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(10);
  doc.setTextColor(24, 24, 27);
  doc.text(fd?.digitalSignature || '—', lm + sigW / 2, y + 9, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(140, 140, 140);
  doc.text('Applicant Signature', lm + sigW / 2, y + 14.5, { align: 'center' });

  // Date / place on the right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text(`Date: ${formatDate(app.appliedDate)}`, W - lm, y + 6, { align: 'right' });
  doc.text('Place: Vadodara, Gujarat', W - lm, y + 11, { align: 'right' });

  y += sigH + 4;

  // ── FOOTER ───────────────────────────────────────────────────────────────────
  doc.setFillColor(245, 245, 245);
  doc.rect(0, H - 10, W, 10, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text('Parul University Internship Portal — Confidential Document', W / 2, H - 5.5, { align: 'center' });
  doc.text(`Generated: ${formatDate(new Date())}  |  ${app.id}`, W / 2, H - 2, { align: 'center' });

  doc.save(`PU_Application_${app.id}.pdf`);
}
