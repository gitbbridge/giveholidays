import PDFDocument from "pdfkit";
import { resolve } from "node:path";
import { groups } from "./cara-fields.ts";
import type { CaraDraft } from "./cara-validation.ts";

export function proposalPdf(
  draft: CaraDraft,
  content: Record<string, unknown>,
  version: number,
  status: string,
): Promise<Buffer> {
  return new Promise((resolveBuffer, reject) => {
    const doc = new PDFDocument({
        size: "A4",
        margin: 48,
        bufferPages: true,
        info: {
          Title: "Give Holidays - CARA proposal",
          Author: "Give Holidays",
          Subject:
            "Confidential proposed commercial terms - not an executed agreement",
        },
      }),
      chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolveBuffer(Buffer.concat(chunks)));
    doc.on("error", reject);
    const forest = "#0c5342",
      muted = "#52695d";
    const clean = (value: unknown) =>
      String(value ?? "Not provided")
        .replace(/[\u2010-\u2015]/g, "-")
        .replace(/\*\*/g, "");
    function heading(text: string) {
      if (doc.y > 710) doc.addPage();
      doc
        .moveDown(0.6)
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor(forest)
        .text(text)
        .moveDown(0.4);
    }
    function value(label: string, text: unknown) {
      if (doc.y > 730) doc.addPage();
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(forest)
        .text(clean(label), { continued: false });
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(muted)
        .text(clean(text || "Not provided"), { lineGap: 3 })
        .moveDown(0.6);
    }
    function section(group: string, data: Record<string, string>) {
      heading(group.replace(/\b\w/g, (c) => c.toUpperCase()));
      for (const field of groups[group]) value(field.label, data[field.key]);
    }
    doc.image(resolve("public/assets/give-holidays-logo.png"), 40, 26, {
      fit: [220, 74],
    });
    doc.y = 115;
    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .fillColor(forest)
      .text("Charity Auction Rate Agreement");
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(muted)
      .text(`CONFIDENTIAL PROPOSAL | Version ${version} | ${status}`)
      .moveDown();
    doc
      .fontSize(10)
      .text(
        "LEGAL REVIEW REQUIRED. This document records proposed terms only. Submission does not create a binding partnership or a signature. Agreement execution requires approval and authorized representatives of both parties. No signatures have been inserted.",
      )
      .moveDown();
    section("property", draft.property);
    section("contact", draft.contact);
    if (draft.additionalComments) {
      heading("Additional hotel comments");
      value("Comments", draft.additionalComments);
    }
    heading("Room categories");
    for (const [i, room] of draft.rooms.entries()) {
      value(`Room ${i + 1}`, room.values.name);
      for (const field of groups.room)
        value(field.label, room.values[field.key]);
    }
    heading("Seasonal rates");
    for (const rate of draft.rates) {
      value("Season", rate.season);
      value(
        "Room category",
        draft.rooms.find((r) => r.id === rate.roomId)?.values.name,
      );
      value(
        "Applicable dates",
        rate.ranges.map((r) => `${r.start} to ${r.end}`).join("; "),
      );
      for (const field of groups.rate)
        value(field.label, rate.values[field.key]);
    }
    heading("Room and room-night allocations");
    for (const rule of draft.allocationRules)
      value(
        rule.type,
        `${rule.quantity || "No guaranteed quantity"} | ${rule.period || "On request"}`,
      );
    section("inventory", draft.inventory);
    heading("Blackout and restricted dates");
    if (!draft.blackouts.length) value("Blackout dates", "None specified");
    for (const item of draft.blackouts)
      value(
        item.kind,
        `${item.start} to ${item.end}; ${item.recurrence}; ${item.details}`,
      );
    for (const group of [
      "booking",
      "payment",
      "cancellation",
      "amenities",
      "contract",
    ])
      section(group, draft[group as keyof CaraDraft] as Record<string, string>);
    heading("Approved program information and clause checklist");
    for (const [key, item] of Object.entries(content)) {
      if (key === "sourceVersion") continue;
      if (typeof item === "object" && item) {
        const block = item as Record<string, unknown>;
        heading(clean(block.title || key));
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor(muted)
          .text(clean(block.text), { lineGap: 3 })
          .moveDown();
      } else value(key === "clauseChecklist" ? "Draft contractual clause checklist" : key, item);
    }
    heading("Submission acknowledgment");
    value(
      "Accuracy acknowledgment",
      draft.accuracyAcknowledged
        ? "Confirmed by submitting contact"
        : "Not confirmed",
    );
    value(
      "Signatures",
      "Not signed. Authorized signature and execution must occur separately.",
    );
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(muted)
        .text(
          `Give Holidays | Confidential proposal | ${i + 1} / ${pages.count}`,
          48,
          794,
          { lineBreak: false },
        );
    }
    doc.end();
  });
}
