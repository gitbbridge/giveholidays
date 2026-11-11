import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Express, Response } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { authorizedTransaction, type Query } from "./database.ts";
import {
  HttpError,
  getActor,
  audit,
  registerAccess,
  type PrivateConfig,
} from "./access.ts";
import { token, digest } from "./security.ts";
import { queueMail } from "./private-mail.ts";
import {
  draftSchema,
  validateFinal,
  type CaraDraft,
} from "./cara-validation.ts";
import { groups, seasons, allocationTypes, statuses } from "./cara-fields.ts";
import { upload, saveDocument, storagePath, scanner } from "./documents.ts";
import { proposalPdf } from "./proposal-pdf.ts";

const uuid = (value: unknown) => {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) throw new HttpError(400, "Invalid record identifier.");
  return parsed.data;
};
const emptyDraft = (): CaraDraft => ({
  property: {},
  contact: {},
  rooms: [],
  rates: [],
  allocationRules: [],
  inventory: {},
  blackouts: [],
  booking: {},
  payment: {},
  cancellation: {},
  amenities: {},
  contract: {},
  additionalComments: "",
  accuracyAcknowledged: false,
});
export function registerCara(app: Express, config: PrivateConfig) {
  const access = registerAccess(app, config),
    db = config.database;
  app.use("/api/private", access.authenticate, access.csrf);
  app.use("/api/admin", access.authenticate, access.admin, access.csrf);
  const within = <T>(res: Response, fn: (query: Query) => Promise<T>) =>
    authorizedTransaction(db, getActor(res), fn);
  const current = async (q: Query, res: Response) => {
    const row = (
      await q("SELECT * FROM cara_submissions WHERE hotel_id=$1", [
        getActor(res).hotelId,
      ])
    ).rows[0];
    if (!row)
      throw new HttpError(404, "No authorized submission is available.");
    return row;
  };
  async function approvedContent() {
    return JSON.parse(await readFile(config.contentPath, "utf8")) as Record<
      string,
      unknown
    >;
  }
  app.get("/api/private/cara/content", access.hotel, async (_req, res) =>
    res.json({
      content: await approvedContent(),
      groups,
      seasons,
      allocationTypes,
      legalReviewRequired: true,
    }),
  );
  app.get("/api/private/cara", access.hotel, async (_req, res) =>
    res.json(
      await within(res, async (q) => {
        const row = await current(q, res);
        const documents = (
          await q(
            "SELECT id,kind,original_name,mime,size_bytes,scan_status FROM private_documents WHERE hotel_id=$1 AND submission_id=$2 ORDER BY created_at",
            [getActor(res).hotelId, row.id],
          )
        ).rows;
        const versions = (
          await q(
            "SELECT id,version,created_at FROM agreement_versions WHERE hotel_id=$1 AND submission_id=$2 ORDER BY version DESC",
            [getActor(res).hotelId, row.id],
          )
        ).rows;
        return { ...row, documents, versions };
      }),
    ),
  );
  app.put("/api/private/cara/draft", access.hotel, async (req, res) => {
    const input = z
      .object({
        revision: z.number().int().min(0),
        method: z.enum(["online", "upload"]),
        draft: draftSchema,
      })
      .safeParse(req.body);
    if (!input.success)
      throw new HttpError(400, "Check the saved draft format.");
    const row = await within(res, async (q) => {
      const old = await current(q, res);
      if (!["Draft", "Revision Requested"].includes(String(old.status)))
        throw new HttpError(
          409,
          "This proposal is under review and cannot be edited.",
        );
      const updated = (
        await q(
          "UPDATE cara_submissions SET draft=$1,method=$2,revision=revision+1,updated_at=now() WHERE hotel_id=$3 AND revision=$4 RETURNING revision",
          [
            JSON.stringify(input.data.draft),
            input.data.method,
            getActor(res).hotelId,
            input.data.revision,
          ],
        )
      ).rows[0];
      if (!updated)
        throw new HttpError(
          409,
          "A newer draft exists. Reload before editing.",
        );
      return updated;
    });
    res.json(row);
  });
  app.post("/api/private/cara/submit", access.hotel, async (req, res) => {
    const expected = z.number().int().min(0).safeParse(req.body?.revision);
    if (!expected.success)
      throw new HttpError(400, "Reload your draft before submitting.");
    const content = await approvedContent();
    const result = await within(res, async (q) => {
      const row = (
        await q("SELECT * FROM cara_submissions WHERE hotel_id=$1 FOR UPDATE", [
          getActor(res).hotelId,
        ])
      ).rows[0];
      if (
        !row ||
        !["Draft", "Revision Requested"].includes(String(row.status)) ||
        Number(row.revision) !== expected.data
      )
        throw new HttpError(
          409,
          "This draft changed or was already submitted. Reload it.",
        );
      const method = row.method as "online" | "upload",
        validation = validateFinal(row.draft, method);
      if (validation.errors.length || !validation.draft) {
        res
          .status(400)
          .json({
            message: "Review the highlighted requirements.",
            errors: validation.errors,
          });
        return;
      }
      const draft = validation.draft,
        hotelId = getActor(res).hotelId!;
      if (
        draft.contact.email.toLowerCase() !== getActor(res).email.toLowerCase()
      )
        throw new HttpError(
          400,
          "The business email must match your verified invitation contact.",
        );
      if (
        method === "upload" &&
        !(
          await q(
            "SELECT id FROM private_documents WHERE hotel_id=$1 AND submission_id=$2 AND kind='proposal' AND scan_status='clean'",
            [hotelId, row.id],
          )
        ).rows.length
      )
        throw new HttpError(
          400,
          "Upload at least one agreement that has passed malware scanning.",
        );
      await q("UPDATE hotel_properties SET name=$1,details=$2 WHERE id=$3", [
        draft.property.name,
        JSON.stringify(draft.property),
        hotelId,
      ]);
      for (const table of [
        "seasonal_rates",
        "room_types",
        "allocations",
        "blackout_periods",
        "booking_rules",
        "payment_terms",
        "cancellation_policies",
        "guest_benefits",
      ])
        await q(`DELETE FROM ${table} WHERE submission_id=$1 AND hotel_id=$2`, [
          row.id,
          hotelId,
        ]);
      for (const room of draft.rooms)
        await q(
          "INSERT INTO room_types(id,hotel_id,submission_id,details) VALUES($1,$2,$3,$4)",
          [room.id, hotelId, row.id, JSON.stringify(room.values)],
        );
      for (const rate of draft.rates)
        await q(
          "INSERT INTO seasonal_rates(id,hotel_id,submission_id,room_type_id,season,details) VALUES($1,$2,$3,$4,$5,$6)",
          [
            rate.id,
            hotelId,
            row.id,
            rate.roomId,
            rate.season,
            JSON.stringify({ ranges: rate.ranges, ...rate.values }),
          ],
        );
      for (const rule of draft.allocationRules)
        await q(
          "INSERT INTO allocations(id,hotel_id,submission_id,details) VALUES($1,$2,$3,$4)",
          [rule.id, hotelId, row.id, JSON.stringify(rule)],
        );
      for (const period of draft.blackouts)
        await q(
          "INSERT INTO blackout_periods(id,hotel_id,submission_id,kind,details) VALUES($1,$2,$3,$4,$5)",
          [period.id, hotelId, row.id, period.kind, JSON.stringify(period)],
        );
      for (const [table, group] of [
        ["booking_rules", "booking"],
        ["payment_terms", "payment"],
        ["cancellation_policies", "cancellation"],
        ["guest_benefits", "amenities"],
      ] as const)
        await q(
          `INSERT INTO ${table}(submission_id,hotel_id,details) VALUES($1,$2,$3)`,
          [row.id, hotelId, JSON.stringify(draft[group])],
        );
      const version = Number(
        (
          await q(
            "SELECT coalesce(max(version),0)+1 AS next FROM agreement_versions WHERE submission_id=$1 AND hotel_id=$2",
            [row.id, hotelId],
          )
        ).rows[0].next,
      );
      await q(
        "INSERT INTO agreement_versions(id,hotel_id,submission_id,version,payload,approved_content) VALUES($1,$2,$3,$4,$5,$6)",
        [
          randomUUID(),
          hotelId,
          row.id,
          version,
          JSON.stringify(draft),
          JSON.stringify(content),
        ],
      );
      await q(
        "UPDATE cara_submissions SET status='Submitted',submitted_at=now(),updated_at=now(),revision=revision+1 WHERE id=$1 AND hotel_id=$2",
        [row.id, hotelId],
      );
      await queueMail(
        q,
        {
          to: getActor(res).email,
          subject: "Give Holidays agreement received for review",
          text: "Thank You for Your Interest in Partnering With Give Holidays\n\nYour agreement has been received for review. Our partnership team will evaluate the proposed terms and contact you regarding the next steps.\n\nSubmission does not create a binding partnership or execute a contract.",
        },
        config.secret,
      );
      for (const email of config.adminEmails)
        await queueMail(
          q,
          {
            to: email,
            subject: "CARA proposal submitted for review",
            text: `A hotel proposal is ready in your secure administrator dashboard: ${config.origin}/admin`,
          },
          config.secret,
        );
      return { status: "Submitted", version };
    });
    if (result) res.status(201).json(result);
  });
  const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    keyGenerator: (_req, res) => getActor(res).sessionId,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });
  app.post(
    "/api/private/cara/documents",
    access.hotel,
    uploadLimiter,
    upload,
    async (req, res) => {
      const files = req.files as Express.Multer.File[];
      if (!files?.length) throw new HttpError(400, "Choose at least one file.");
      const kind =
        req.body?.kind === "property_logo" ? "property_logo" : "proposal";
      const saved = await within(res, async (q) => {
        const row = await current(q, res);
        if (!["Draft", "Revision Requested"].includes(String(row.status)))
          throw new HttpError(
            409,
            "Documents cannot be changed while the proposal is under review.",
          );
        const items = [];
        for (const file of files)
          items.push(
            await saveDocument(
              q,
              config,
              getActor(res).hotelId!,
              String(row.id),
              file,
              kind,
            ),
          );
        return items;
      });
      res.status(201).json({ documents: saved });
    },
  );
  app.get("/api/private/documents/:id", async (req, res) => {
    const id = uuid(req.params.id),
      actor = getActor(res);
    const row = await within(
      res,
      async (q) =>
        (
          await q(
            `SELECT * FROM private_documents WHERE id=$1 ${actor.role === "hotel" ? "AND hotel_id=$2" : ""}`,
            [id, ...(actor.role === "hotel" ? [actor.hotelId] : [])],
          )
        ).rows[0],
    );
    if (!row) throw new HttpError(404, "Document not found.");
    if (row.scan_status !== "clean")
      throw new HttpError(
        423,
        "The document is quarantined pending malware scanning.",
      );
    if (actor.role === "admin")
      await db.transaction((q) =>
        audit(q, actor, "private_document_downloaded", id),
      );
    res
      .type("application/octet-stream")
      .attachment(String(row.original_name))
      .sendFile(storagePath(config, String(row.storage_name)), {
        dotfiles: "allow",
      });
  });
  app.get("/api/private/cara/pdf/:id", async (req, res) => {
    const id = uuid(req.params.id),
      actor = getActor(res);
    const row = await within(
      res,
      async (q) =>
        (
          await q(
            `SELECT v.*,s.status FROM agreement_versions v JOIN cara_submissions s ON s.id=v.submission_id WHERE v.id=$1 ${actor.role === "hotel" ? "AND v.hotel_id=$2" : ""}`,
            [id, ...(actor.role === "hotel" ? [actor.hotelId] : [])],
          )
        ).rows[0],
    );
    if (!row) throw new HttpError(404, "Proposal version not found.");
    if (actor.role === "admin")
      await db.transaction((q) =>
        audit(q, actor, "proposal_pdf_downloaded", id),
      );
    const pdf = await proposalPdf(
      row.payload as CaraDraft,
      row.approved_content as Record<string, unknown>,
      Number(row.version),
      String(row.status),
    );
    res
      .type("application/pdf")
      .attachment(`Give-Holidays-CARA-proposal-v${row.version}.pdf`)
      .send(pdf);
  });
  app.get("/api/admin/inquiries", async (_req, res) =>
    res.json({
      items: (
        await db.query("SELECT * FROM inquiries ORDER BY created_at DESC")
      ).rows,
    }),
  );
  app.get("/api/admin/cara-schema", async (_req, res) =>
    res.json({
      groups,
      content: await approvedContent(),
      seasons,
      allocationTypes,
      legalReviewRequired: !config.legalReviewApproved,
    }),
  );
  app.post("/api/admin/inquiries/:id/review", async (req, res) => {
    const id = uuid(req.params.id),
      status = z.enum(["Approved", "Declined"]).safeParse(req.body?.status);
    if (!status.success)
      throw new HttpError(400, "Choose Approved or Declined.");
    await db.transaction(async (q) => {
      const row = (
        await q(
          "UPDATE inquiries SET review_status=$2 WHERE id=$1 AND kind='partnership' RETURNING id",
          [id, status.data],
        )
      ).rows[0];
      if (!row) throw new HttpError(404, "Partnership inquiry not found.");
      await audit(q, getActor(res), "inquiry_review", id, {
        status: status.data,
      });
    });
    res.json({ status: status.data });
  });
  async function createInvitation(
    q: Query,
    res: Response,
    hotelId: string,
    contactId: string,
    email: string,
  ) {
    const credential = token(),
      id = randomUUID();
    await q(
      "INSERT INTO invitations(id,hotel_id,contact_id,email,token_hash,expires_at,created_by) VALUES($1,$2,$3,$4,$5,now()+interval '7 days',$6)",
      [
        id,
        hotelId,
        contactId,
        email,
        digest(credential),
        getActor(res).adminId,
      ],
    );
    await queueMail(
      q,
      {
        to: email,
        subject: "Your private Give Holidays hotel invitation",
        text: `You are invited to the private Give Holidays hotel contracting portal.\n\n${config.origin}/access#${credential}\n\nThis single-use invitation expires in seven days. Verification through this email address is required. Do not forward it.`,
      },
      config.secret,
    );
    await audit(q, getActor(res), "invitation_sent", id);
    return { id };
  }
  app.post("/api/admin/invitations", async (req, res) => {
    const inquiryId = uuid(req.body?.inquiryId);
    const result = await authorizedTransaction(db, getActor(res), async (q) => {
      const inquiry = (
        await q(
          "SELECT * FROM inquiries WHERE id=$1 AND kind='partnership' AND review_status='Approved' FOR UPDATE",
          [inquiryId],
        )
      ).rows[0];
      if (!inquiry)
        throw new HttpError(
          400,
          "Approve the partnership inquiry before inviting the hotel.",
        );
      const existing = (
        await q(
          "SELECT c.* FROM hotel_contacts c JOIN hotel_properties h ON h.id=c.hotel_id WHERE c.email=$1 AND h.source_inquiry_id=$2",
          [String(inquiry.email).toLowerCase(), inquiryId],
        )
      ).rows[0];
      let hotelId = existing?.hotel_id,
        contactId = existing?.id;
      if (!hotelId) {
        hotelId = randomUUID();
        contactId = randomUUID();
        const draft = emptyDraft();
        draft.property = {
          name: String(inquiry.property_name),
          website: String(inquiry.website),
        };
        draft.contact = {
          name: String(inquiry.name),
          email: String(inquiry.email).toLowerCase(),
          jobTitle: String(inquiry.job_title),
          phone: String(inquiry.phone),
        };
        await q(
          "INSERT INTO hotel_properties(id,name,source_inquiry_id) VALUES($1,$2,$3)",
          [hotelId, inquiry.property_name, inquiryId],
        );
        await q(
          "INSERT INTO hotel_contacts(id,hotel_id,name,email,job_title,phone) VALUES($1,$2,$3,$4,$5,$6)",
          [
            contactId,
            hotelId,
            inquiry.name,
            String(inquiry.email).toLowerCase(),
            inquiry.job_title,
            inquiry.phone,
          ],
        );
        await q(
          "INSERT INTO cara_submissions(id,hotel_id,draft) VALUES($1,$2,$3)",
          [randomUUID(), hotelId, JSON.stringify(draft)],
        );
      }
      await q(
        "UPDATE invitations SET revoked_at=now() WHERE hotel_id=$1 AND contact_id=$2 AND revoked_at IS NULL",
        [hotelId, contactId],
      );
      return createInvitation(
        q,
        res,
        String(hotelId),
        String(contactId),
        String(inquiry.email).toLowerCase(),
      );
    });
    res.status(201).json(result);
  });
  app.get("/api/admin/invitations", async (_req, res) =>
    res.json(await within(res, async q => ({
      items: (
        await q(
          "SELECT i.id,i.hotel_id,i.email,i.expires_at,i.revoked_at,i.consumed_at,h.name FROM invitations i JOIN hotel_properties h ON h.id=i.hotel_id ORDER BY i.created_at DESC",
        )
      ).rows,
    }))),
  );
  app.post("/api/admin/invitations/:id/revoke", async (req, res) => {
    const id = uuid(req.params.id);
    await db.transaction(async (q) => {
      await q("UPDATE invitations SET revoked_at=now() WHERE id=$1", [id]);
      await q(
        "UPDATE private_sessions SET revoked_at=now() WHERE invitation_id=$1",
        [id],
      );
      await audit(q, getActor(res), "invitation_revoked", id);
    });
    res.json({ revoked: true });
  });
  app.post("/api/admin/invitations/:id/resend", async (req, res) => {
    const id = uuid(req.params.id);
    const result = await db.transaction(async (q) => {
      const row = (
        await q(
          "UPDATE invitations SET revoked_at=now() WHERE id=$1 RETURNING *",
          [id],
        )
      ).rows[0];
      if (!row) throw new HttpError(404, "Invitation not found.");
      await q(
        "UPDATE private_sessions SET revoked_at=now() WHERE invitation_id=$1",
        [id],
      );
      return createInvitation(
        q,
        res,
        String(row.hotel_id),
        String(row.contact_id),
        String(row.email),
      );
    });
    res.status(201).json(result);
  });
  app.get("/api/admin/submissions", async (_req, res) =>
    res.json(
      await within(res, async (q) => ({
        items: (
          await q(
            "SELECT s.*,h.name AS property_name FROM cara_submissions s JOIN hotel_properties h ON h.id=s.hotel_id ORDER BY s.updated_at DESC",
          )
        ).rows,
      })),
    ),
  );
  app.get("/api/admin/submissions/:id", async (req, res) => {
    const id = uuid(req.params.id);
    res.json(
      await within(res, async (q) => {
        const row = (
          await q("SELECT * FROM cara_submissions WHERE id=$1", [id])
        ).rows[0];
        if (!row) throw new HttpError(404, "Submission not found.");
        return {
          ...row,
          notes: (
            await q(
              "SELECT * FROM administrative_notes WHERE submission_id=$1 ORDER BY created_at",
              [id],
            )
          ).rows,
          documents: (
            await q(
              "SELECT id,kind,original_name,scan_status FROM private_documents WHERE submission_id=$1",
              [id],
            )
          ).rows,
          versions: (
            await q(
              "SELECT id,version FROM agreement_versions WHERE submission_id=$1 ORDER BY version DESC",
              [id],
            )
          ).rows,
        };
      }),
    );
  });
  app.post("/api/admin/submissions/:id/notes", async (req, res) => {
    const id = uuid(req.params.id),
      note = z.string().trim().min(1).max(10000).safeParse(req.body?.note);
    if (!note.success)
      throw new HttpError(400, "Enter a note of 1 to 10,000 characters.");
    await within(res, async (q) => {
      const row = (
        await q("SELECT hotel_id FROM cara_submissions WHERE id=$1", [id])
      ).rows[0];
      if (!row) throw new HttpError(404, "Submission not found.");
      await q(
        "INSERT INTO administrative_notes(id,hotel_id,submission_id,admin_id,note) VALUES($1,$2,$3,$4,$5)",
        [randomUUID(), row.hotel_id, id, getActor(res).adminId, note.data],
      );
      await audit(q, getActor(res), "private_note_added", id);
    });
    res.status(201).json({ saved: true });
  });
  app.post("/api/admin/submissions/:id/status", async (req, res) => {
    const id = uuid(req.params.id),
      input = z
        .object({
          status: z.enum(statuses),
          message: z.string().max(5000).optional(),
          executionConfirmed: z.boolean().optional(),
        })
        .safeParse(req.body);
    if (!input.success) throw new HttpError(400, "Choose an agreement status.");
    await within(res, async (q) => {
      const row = (
        await q("SELECT * FROM cara_submissions WHERE id=$1 FOR UPDATE", [id])
      ).rows[0];
      if (!row) throw new HttpError(404, "Submission not found.");
      const transitions: Record<string, string[]> = {
        Submitted: [
          "Under Review",
          "Revision Requested",
          "Declined",
          "Expired",
        ],
        "Under Review": [
          "Revision Requested",
          "Approved for Signature",
          "Declined",
          "Expired",
        ],
        "Revision Requested": ["Under Review", "Declined", "Expired"],
        "Approved for Signature": [
          "Executed",
          "Revision Requested",
          "Declined",
          "Expired",
        ],
        Executed: ["Expired"],
      };
      if (!transitions[String(row.status)]?.includes(input.data.status))
        throw new HttpError(409, "That status transition is not available.");
      if (
        ["Approved for Signature", "Executed"].includes(input.data.status) &&
        !config.legalReviewApproved
      )
        throw new HttpError(
          409,
          "Legal review approval must be configured before progressing to signature or execution.",
        );
      if (
        input.data.status === "Executed" &&
        (!input.data.executionConfirmed ||
          !(
            await q(
              "SELECT id FROM private_documents WHERE submission_id=$1 AND kind='executed' AND scan_status='clean'",
              [id],
            )
          ).rows.length)
      )
        throw new HttpError(
          400,
          "Attach the malware-scanned executed agreement and confirm both authorized parties executed it.",
        );
      if (
        input.data.status === "Revision Requested" &&
        !input.data.message?.trim()
      )
        throw new HttpError(
          400,
          "Provide revision instructions for the hotel.",
        );
      await q(
        "UPDATE cara_submissions SET status=$2,revision_message=$3,updated_at=now() WHERE id=$1",
        [
          id,
          input.data.status,
          input.data.status === "Revision Requested"
            ? input.data.message
            : null,
        ],
      );
      await audit(q, getActor(res), "agreement_status_changed", id, {
        from: row.status,
        to: input.data.status,
      });
      for (const contact of (
        await q("SELECT email FROM hotel_contacts WHERE hotel_id=$1", [
          row.hotel_id,
        ])
      ).rows)
        await queueMail(
          q,
          {
            to: String(contact.email),
            subject: `Give Holidays agreement: ${input.data.status}`,
            text: `Your proposed agreement status is ${input.data.status}.\n${input.data.message || ""}\nAccess is available only through a valid private invitation. No automatic contract execution occurs.`,
          },
          config.secret,
        );
    });
    res.json({ status: input.data.status });
  });
  app.post(
    "/api/admin/submissions/:id/documents",
    uploadLimiter,
    upload,
    async (req, res) => {
      const id = uuid(req.params.id),
        files = req.files as Express.Multer.File[];
      if (!files?.length)
        throw new HttpError(400, "Choose an executed agreement.");
      const result = await within(res, async (q) => {
        const row = (
          await q("SELECT hotel_id FROM cara_submissions WHERE id=$1", [id])
        ).rows[0];
        if (!row) throw new HttpError(404, "Submission not found.");
        const items = [];
        for (const file of files)
          items.push(
            await saveDocument(
              q,
              config,
              String(row.hotel_id),
              id,
              file,
              "executed",
            ),
          );
        await audit(q, getActor(res), "executed_document_uploaded", id);
        return items;
      });
      res.status(201).json({ documents: result });
    },
  );
  app.post("/api/admin/documents/:id/scan", async (req, res) => {
    const id = uuid(req.params.id);
    await within(res, async (q) => {
      const row = (await q("SELECT * FROM private_documents WHERE id=$1", [id]))
        .rows[0];
      if (!row) throw new HttpError(404, "Document not found.");
      if (
        !(await (config.scanFile || scanner)(
          storagePath(config, String(row.storage_name)),
        ))
      )
        throw new HttpError(409, "Malware scanner is not configured.");
      await q("UPDATE private_documents SET scan_status='clean' WHERE id=$1", [
        id,
      ]);
      await audit(q, getActor(res), "document_scanned", id);
    });
    res.json({ scanStatus: "clean" });
  });
  app.get("/api/admin/export", async (_req, res) => {
    const data = await within(res, async (q) => {
      await audit(q, getActor(res), "contract_data_exported", "all");
      return {
        submissions: (await q("SELECT * FROM cara_submissions")).rows,
        versions: (await q("SELECT * FROM agreement_versions")).rows,
        documents: (
          await q(
            "SELECT id,hotel_id,submission_id,kind,original_name,scan_status FROM private_documents",
          )
        ).rows,
      };
    });
    res
      .attachment("give-holidays-contract-export.json")
      .type("application/json")
      .send(JSON.stringify(data, null, 2));
  });
  app.get("/api/admin/audit", async (_req, res) =>
    res.json({
      items: (
        await db.query(
          "SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 500",
        )
      ).rows,
    }),
  );
  app.use(
    ["/cara", "/admin", "/private-assets"],
    (_req, res, next) => {
      res.set({
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "Referrer-Policy": "no-referrer",
      });
      next();
    },
    access.authenticate,
  );
  app.get("/admin", access.admin, (_req, res) =>
    res.sendFile(resolve("build/private/index.html")),
  );
  app.get("/cara", access.hotel, (_req, res) =>
    res.sendFile(resolve("build/private/index.html")),
  );
  return access;
}
