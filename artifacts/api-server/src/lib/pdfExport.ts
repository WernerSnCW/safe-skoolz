import PDFDocument from "pdfkit";

const COLORS = {
  primary: "#1e293b",
  secondary: "#475569",
  muted: "#94a3b8",
  accent: "#0d9488",
  danger: "#dc2626",
  warning: "#d97706",
  border: "#e2e8f0",
  bgLight: "#f8fafc",
  white: "#ffffff",
};

function formatDatePdf(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTimePdf(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function addHeader(doc: PDFKit.PDFDocument, title: string, referenceNumber: string, schoolName: string) {
  doc.fontSize(8).fillColor(COLORS.muted).text(schoolName, 50, 40, { align: "left" });
  doc.fontSize(8).fillColor(COLORS.danger).text("CONFIDENTIAL", 50, 40, { align: "right" });

  doc.moveDown(0.5);
  doc.fontSize(7).fillColor(COLORS.accent).text("safeskoolz", 50, doc.y);
  doc.moveDown(0.3);

  doc.fontSize(14).fillColor(COLORS.primary).text(title, 50, doc.y, { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor(COLORS.secondary).text(referenceNumber, { align: "center" });
  doc.moveDown(0.5);

  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(COLORS.border).lineWidth(1).stroke();
  doc.moveDown(0.5);
}

function addSectionTitle(doc: PDFKit.PDFDocument, title: string) {
  if (doc.y > 700) doc.addPage();
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor(COLORS.accent).text(title.toUpperCase(), 50, doc.y);
  doc.moveDown(0.2);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(COLORS.border).lineWidth(0.5).stroke();
  doc.moveDown(0.3);
}

function addField(doc: PDFKit.PDFDocument, label: string, value: string | null | undefined) {
  if (doc.y > 730) doc.addPage();
  doc.fontSize(8).fillColor(COLORS.muted).text(label, 60, doc.y, { continued: false });
  doc.fontSize(9).fillColor(COLORS.primary).text(value || "—", 60, doc.y);
  doc.moveDown(0.2);
}

function addFieldInline(doc: PDFKit.PDFDocument, label: string, value: string | null | undefined, x: number, width: number) {
  doc.fontSize(8).fillColor(COLORS.muted).text(label, x, doc.y, { width });
  doc.fontSize(9).fillColor(COLORS.primary).text(value || "—", x, doc.y, { width });
}

function addFooter(doc: PDFKit.PDFDocument, generatedBy: string) {
  const now = formatDateTimePdf(new Date());
  const footerY = 760;
  doc.fontSize(7).fillColor(COLORS.muted);
  doc.text(`Generated on ${now} by ${generatedBy} — CONFIDENTIAL`, 50, footerY, { align: "center", width: 495 });
  doc.text("This document is subject to LOPIVI data retention requirements", 50, footerY + 10, { align: "center", width: 495 });
}

export function generateIncidentPdf(data: {
  incident: any;
  schoolName: string;
  generatedBy: string;
}): Promise<Buffer> {
  const { incident, schoolName, generatedBy } = data;
  const inc = incident;

  const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });

  addHeader(doc, "SAFEGUARDING INCIDENT REPORT", inc.referenceNumber || "—", schoolName);

  addSectionTitle(doc, "Incident Details");
  const startY = doc.y;
  addFieldInline(doc, "Reference Number", inc.referenceNumber, 60, 200);
  const refEndY = doc.y;
  doc.y = startY;
  addFieldInline(doc, "Date of Incident", formatDatePdf(inc.incidentDate), 280, 200);
  doc.y = Math.max(refEndY, doc.y);
  doc.moveDown(0.3);

  const startY2 = doc.y;
  addFieldInline(doc, "Category", inc.category?.replace(/,/g, ", "), 60, 200);
  const catEndY = doc.y;
  doc.y = startY2;
  addFieldInline(doc, "Time", inc.incidentTime || "Not specified", 280, 200);
  doc.y = Math.max(catEndY, doc.y);
  doc.moveDown(0.3);

  const startY3 = doc.y;
  addFieldInline(doc, "Location", inc.location || "Not specified", 60, 200);
  const locEndY = doc.y;
  doc.y = startY3;
  addFieldInline(doc, "Escalation Tier", `Tier ${inc.escalationTier || "—"}`, 280, 200);
  doc.y = Math.max(locEndY, doc.y);
  doc.moveDown(0.3);

  if (inc.emotionalState) {
    addField(doc, "Emotional State", inc.emotionalState);
  }

  addField(doc, "Description", inc.description);

  addSectionTitle(doc, "People Involved");
  addField(doc, "Reporter", inc.anonymous ? "Anonymous" : (inc.reporterName || "Unknown"));
  addField(doc, "Reporter Role", inc.reporterRole || "—");
  if (inc.victimNames?.length > 0) {
    addField(doc, "Victim(s)", inc.victimNames.join(", "));
  }
  if (inc.perpetratorNames?.length > 0) {
    addField(doc, "Perpetrator(s)", inc.perpetratorNames.join(", "));
  }
  if (inc.witnessStatements && Array.isArray(inc.witnessStatements) && inc.witnessStatements.length > 0) {
    addField(doc, "Witnesses", inc.witnessStatements.map((w: any) => w.witnessName).filter(Boolean).join(", ") || "—");
  }

  addSectionTitle(doc, "Assessment");
  const startY4 = doc.y;
  addFieldInline(doc, "Status", inc.status, 60, 200);
  const statusEndY = doc.y;
  doc.y = startY4;
  addFieldInline(doc, "Assessed By", inc.assessedByName || "Not yet assessed", 280, 200);
  doc.y = Math.max(statusEndY, doc.y);
  doc.moveDown(0.3);

  if (inc.assessedAt) {
    addField(doc, "Assessed At", formatDateTimePdf(inc.assessedAt));
  }
  if (inc.staffNotes) {
    addField(doc, "Staff Notes", inc.staffNotes);
  }
  addField(doc, "Safeguarding Trigger", inc.safeguardingTrigger ? "Yes" : "No");
  addField(doc, "Added to File", inc.addedToFile ? "Yes" : "No");

  if (inc.escalationTier >= 2) {
    addSectionTitle(doc, "Protocol Guidance");
    addField(doc, "Escalation Tier", `Tier ${inc.escalationTier}`);
    if (inc.protocolId) {
      addField(doc, "Linked Protocol", "Yes — see protocol record");
    } else {
      addField(doc, "Linked Protocol", "No protocol opened yet");
    }
    if (inc.formalResponseRequested) {
      addField(doc, "Formal Response Requested", "Yes");
    }
    if (inc.requestExternalReferral) {
      addField(doc, "External Referral Requested", "Yes");
    }
  }

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    addFooter(doc, generatedBy);
  }

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export function generateProtocolPdf(data: {
  protocol: any;
  caseTasks: any[];
  schoolName: string;
  generatedBy: string;
}): Promise<Buffer> {
  const { protocol, caseTasks, schoolName, generatedBy } = data;
  const prot = protocol;

  const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });

  addHeader(doc, "SAFEGUARDING PROTOCOL", prot.referenceNumber || "—", schoolName);

  addSectionTitle(doc, "Protocol Details");
  const startY = doc.y;
  addFieldInline(doc, "Reference Number", prot.referenceNumber, 60, 200);
  const refEndY = doc.y;
  doc.y = startY;
  addFieldInline(doc, "Status", prot.status, 280, 200);
  doc.y = Math.max(refEndY, doc.y);
  doc.moveDown(0.3);

  const startY2 = doc.y;
  addFieldInline(doc, "Type", prot.protocolType, 60, 200);
  const typeEndY = doc.y;
  doc.y = startY2;
  addFieldInline(doc, "Source", prot.protocolSource || "—", 280, 200);
  doc.y = Math.max(typeEndY, doc.y);
  doc.moveDown(0.3);

  addField(doc, "Opened By", prot.openedByName || "—");
  addField(doc, "Opened At", formatDateTimePdf(prot.openedAt));
  if (prot.genderBasedViolence) {
    doc.fontSize(9).fillColor(COLORS.danger).text("⚠ Gender-based violence protocol active", 60, doc.y);
    doc.moveDown(0.3);
  }
  if (prot.context) {
    addField(doc, "Context", prot.context);
  }

  addSectionTitle(doc, "Risk Assessment");
  addField(doc, "Risk Level", prot.riskLevel || "Not assessed");
  if (prot.riskAssessment) {
    addField(doc, "Risk Assessment", prot.riskAssessment);
  }
  if (prot.riskFactors?.length > 0) {
    addField(doc, "Risk Factors", prot.riskFactors.join(", "));
  }
  if (prot.protectiveFactors?.length > 0) {
    addField(doc, "Protective Factors", prot.protectiveFactors.join(", "));
  }
  if (prot.protectiveMeasures?.length > 0) {
    addField(doc, "Protective Measures", prot.protectiveMeasures.join(", "));
  }

  addSectionTitle(doc, "People");
  addField(doc, "Victim", prot.victimName || "—");
  if (prot.allegedPerpetratorNames?.length > 0) {
    addField(doc, "Alleged Perpetrator(s)", prot.allegedPerpetratorNames.join(", "));
  } else if (prot.allegedPerpetratorIds?.length > 0) {
    addField(doc, "Alleged Perpetrator(s)", `${prot.allegedPerpetratorIds.length} person(s) — see system record`);
  }

  addSectionTitle(doc, "Referral");
  addField(doc, "External Referral Required", prot.externalReferralRequired ? "Yes" : "No");
  if (prot.externalReferralBody) {
    addField(doc, "Referral Body", prot.externalReferralBody);
  }
  addField(doc, "Parent Notification Sent", prot.parentNotificationSent ? "Yes" : "No");
  addField(doc, "Interviews Required", prot.interviewsRequired ? "Yes" : "No");

  if (caseTasks.length > 0) {
    addSectionTitle(doc, "Case Tasks");
    for (const task of caseTasks) {
      if (doc.y > 700) doc.addPage();
      const assignee = task.assigneeFirstName ? `${task.assigneeFirstName} ${task.assigneeLastName}` : "Unassigned";
      doc.fontSize(9).fillColor(COLORS.primary).text(`• ${task.title}`, 60, doc.y, { width: 400 });
      doc.fontSize(8).fillColor(COLORS.muted).text(
        `  Assigned to: ${assignee} | Status: ${task.status} | Due: ${task.dueAt ? formatDatePdf(task.dueAt) : "No date"}`,
        70, doc.y, { width: 420 }
      );
      doc.moveDown(0.3);
    }
  }

  if (prot.resolutionNotes || prot.closedAt) {
    addSectionTitle(doc, "Resolution");
    if (prot.closedAt) {
      addField(doc, "Closed At", formatDateTimePdf(prot.closedAt));
    }
    if (prot.resolutionNotes) {
      addField(doc, "Resolution Notes", prot.resolutionNotes);
    }
  }

  if (prot.linkedIncidentIds?.length > 0) {
    addSectionTitle(doc, "Linked Incidents");
    addField(doc, "Linked Incident IDs", `${prot.linkedIncidentIds.length} incident(s) linked — see system for details`);
  }

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    addFooter(doc, generatedBy);
  }

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}
