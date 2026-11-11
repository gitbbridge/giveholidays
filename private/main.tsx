import { useEffect, useRef, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  FileText,
  LockKeyhole,
  Plus,
  Trash2,
} from "lucide-react";
import type { CaraDraft } from "../server/cara-validation";
import type { Field } from "../server/cara-fields";
import "../src/styles.css";
import "../src/sections.css";
import "./private.css";

type Values = Record<string, string>;
type Item = Record<string, unknown>;
type Metadata = {
  content: Record<string, unknown>;
  groups: Record<string, Field[]>;
  seasons: string[];
  allocationTypes: string[];
  legalReviewRequired: boolean;
};
type DocumentInfo = {
  id: string;
  kind: string;
  original_name: string;
  scan_status: string;
};
type Submission = {
  id: string;
  hotel_id: string;
  status: string;
  method: "online" | "upload";
  draft: CaraDraft;
  revision: number;
  revision_message?: string;
  documents: DocumentInfo[];
  versions: { id: string; version: number }[];
  notes?: { id: string; note: string; created_at: string }[];
};
let csrf = "";
class ApiError extends Error {
  constructor(
    message: string,
    public details: string[] = [],
  ) {
    super(message);
  }
}
async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      "X-CSRF-Token": csrf,
      ...options.headers,
    },
  });
  const result = await response.json();
  if (!response.ok)
    throw new ApiError(
      result.message || "The request could not be completed.",
      result.errors || [],
    );
  return result;
}
function action<T>(path: string, body: unknown, method = "POST") {
  return api<T>(path, { method, body: JSON.stringify(body) });
}
function FieldGrid({
  fields,
  values,
  onChange,
  requiredOnly,
}: {
  fields: Field[];
  values: Values;
  onChange: (values: Values) => void;
  requiredOnly?: string[];
}) {
  return (
    <div className="private-fields">
      {fields.map((field) => (
        <label
          className={field.type === "textarea" ? "wide" : ""}
          key={field.key}
        >
          {field.label}
          {(requiredOnly ? requiredOnly.includes(field.key) : field.required)
            ? " *"
            : ""}
          {field.type === "textarea" ? (
            <textarea
              rows={3}
              maxLength={8000}
              required={
                requiredOnly ? requiredOnly.includes(field.key) : field.required
              }
              value={values[field.key] || ""}
              onChange={(event) =>
                onChange({ [field.key]: event.target.value })
              }
            />
          ) : field.type === "select" ? (
            <select
              required={field.required}
              value={values[field.key] || ""}
              onChange={(event) =>
                onChange({ [field.key]: event.target.value })
              }
            >
              <option value="">Select an option</option>
              {field.options?.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          ) : (
            <input
              type={field.type || "text"}
              min={field.type === "number" ? 0 : undefined}
              step={field.type === "number" ? "any" : undefined}
              maxLength={8000}
              required={
                requiredOnly ? requiredOnly.includes(field.key) : field.required
              }
              value={values[field.key] || ""}
              onInput={
                field.type === "date"
                  ? (event) =>
                      onChange({ [field.key]: event.currentTarget.value })
                  : undefined
              }
              onChange={(event) =>
                onChange({ [field.key]: event.target.value })
              }
            />
          )}
        </label>
      ))}
    </div>
  );
}
function Information({ item }: { item: unknown }) {
  if (!item || typeof item !== "object") return null;
  const block = item as { title: string; text: string };
  return (
    <aside className="information-card">
      <h3>{block.title}</h3>
      {block.text
        .split("\n\n")
        .filter(Boolean)
        .map((paragraph, index) => (
          <p key={index}>
            {paragraph.startsWith("*") && !paragraph.startsWith("**") ? (
              <em>{paragraph.slice(1, -1)}</em>
            ) : (
              paragraph
                .split(/(\*\*.*?\*\*)/g)
                .map((part, i) =>
                  part.startsWith("**") ? (
                    <strong key={i}>{part.slice(2, -2)}</strong>
                  ) : (
                    part
                  ),
                )
            )}
          </p>
        ))}
    </aside>
  );
}
function ValuesView({
  title,
  values,
  fields,
}: {
  title: string;
  values: Values;
  fields?: Field[];
}) {
  return (
    <section className="review-section">
      <h3>{title}</h3>
      <dl>
        {(
          fields || Object.keys(values).map((key) => ({ key, label: key }))
        ).map((field) => (
          <div key={field.key}>
            <dt>{field.label}</dt>
            <dd>{values[field.key] || "Not provided"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
function Review({
  draft,
  metadata,
  edit,
}: {
  draft: CaraDraft;
  metadata?: Metadata;
  edit?: (step: number) => void;
}) {
  const groupNames = [
      "property",
      "contact",
      "booking",
      "payment",
      "cancellation",
      "amenities",
      "contract",
    ],
    titles = [
      "Property details",
      "Hotel contact",
      "Booking rules",
      "Payment terms",
      "Cancellation and no-shows",
      "Services and amenities",
      "Proposed contractual provisions",
    ],
    indexes = [0, 1, 6, 7, 8, 9, 10];
  return (
    <div className="review">
      {draft.additionalComments && (
        <ValuesView
          title="Additional hotel comments"
          values={{ comments: draft.additionalComments }}
        />
      )}
      {groupNames.slice(0, 2).map((group, i) => (
        <div key={group}>
          {edit && (
            <button
              type="button"
              className="text-link"
              onClick={() => edit(indexes[i])}
            >
              Edit {titles[i]}
            </button>
          )}
          <ValuesView
            title={titles[i]}
            values={draft[group as keyof CaraDraft] as Values}
            fields={metadata?.groups[group]}
          />
        </div>
      ))}
      <section className="review-section">
        <h3>Room categories and seasonal rates</h3>
        {edit && (
          <button type="button" className="text-link" onClick={() => edit(2)}>
            Edit rooms
          </button>
        )}
        {draft.rooms.map((room) => (
          <ValuesView
            key={room.id}
            title={room.values.name || "Room category"}
            values={room.values}
            fields={metadata?.groups.room}
          />
        ))}
        {edit && (
          <button type="button" className="text-link" onClick={() => edit(3)}>
            Edit rates
          </button>
        )}
        {draft.rates.map((rate) => (
          <div className="review-rate" key={rate.id}>
            <h4>
              {rate.season} ·{" "}
              {draft.rooms.find((room) => room.id === rate.roomId)?.values.name}
            </h4>
            <p>
              {rate.ranges
                .map((range) => `${range.start} – ${range.end}`)
                .join("; ")}
            </p>
            <ValuesView
              title="Nightly rates and inclusions"
              values={rate.values}
              fields={metadata?.groups.rate}
            />
          </div>
        ))}
      </section>
      <section className="review-section">
        <h3>Allocations and unavailable / restricted dates</h3>
        {edit && (
          <button type="button" className="text-link" onClick={() => edit(4)}>
            Edit allocations
          </button>
        )}
        {draft.allocationRules.map((rule) => (
          <p key={rule.id}>
            {rule.type}: {rule.quantity || "No guaranteed quantity"} ·{" "}
            {rule.period || "On request"}
          </p>
        ))}
        <ValuesView
          title="Inventory rules"
          values={draft.inventory}
          fields={metadata?.groups.inventory}
        />
        {edit && (
          <button type="button" className="text-link" onClick={() => edit(5)}>
            Edit dates
          </button>
        )}
        {draft.blackouts.length ? (
          draft.blackouts.map((period) => (
            <p key={period.id}>
              {period.kind} · {period.start} – {period.end} ·{" "}
              {period.recurrence} · {period.details}
            </p>
          ))
        ) : (
          <p>No blackout dates specified.</p>
        )}
      </section>
      {groupNames.slice(2).map((group, j) => {
        const i = j + 2;
        return (
          <div key={group}>
            {edit && (
              <button
                type="button"
                className="text-link"
                onClick={() => edit(indexes[i])}
              >
                Edit {titles[i]}
              </button>
            )}
            <ValuesView
              title={titles[i]}
              values={draft[group as keyof CaraDraft] as Values}
              fields={metadata?.groups[group]}
            />
          </div>
        );
      })}
    </div>
  );
}
function Uploads({
  documents,
  onUploaded,
  kind = "proposal",
  adminId,
}: {
  documents: DocumentInfo[];
  onUploaded: () => void;
  kind?: "proposal" | "property_logo" | "executed";
  adminId?: string;
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function send(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files?.length) return;
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("kind", kind);
      for (const file of files) form.append("documents", file);
      await api(
        adminId
          ? `/api/admin/submissions/${adminId}/documents`
          : "/api/private/cara/documents",
        { method: "POST", body: form },
      );
      setMessage(
        "Files saved. Downloads are available after validation and malware checks pass.",
      );
      onUploaded();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }
  return (
    <section className="upload-panel">
      <h3>
        {kind === "property_logo"
          ? "Property logo (optional)"
          : kind === "executed"
            ? "Upload already executed agreement"
            : "Upload existing wholesale / FIT agreement"}
      </h3>
      <p>
        {kind === "property_logo"
          ? "PNG or JPEG."
          : "PDF, DOC or DOCX. Up to five files per upload."}{" "}
        Maximum 10 MB per file. Files are stored privately.
      </p>
      <label className="upload-control">
        Choose {kind === "property_logo" ? "logo" : "documents"}
        <input
          type="file"
          accept={
            kind === "property_logo" ? ".png,.jpg,.jpeg" : ".pdf,.doc,.docx"
          }
          multiple={kind !== "property_logo"}
          onChange={send}
          disabled={busy}
        />
      </label>
      <p role="status">{busy ? "Uploading…" : message}</p>
      <ul className="document-list">
        {documents
          .filter((document) => document.kind === kind)
          .map((document) => (
            <li key={document.id}>
              <FileText size={18} />
              <span>
                {document.original_name} ·{" "}
                {document.scan_status === "clean"
                  ? "Ready for review"
                  : "Quarantined pending scan"}
              </span>
              {document.scan_status === "clean" && (
                <a
                  href={`/api/private/documents/${document.id}`}
                  className="text-link"
                >
                  Download
                </a>
              )}
            </li>
          ))}
      </ul>
    </section>
  );
}
const steps = [
  "Property details",
  "Hotel contact",
  "Room types",
  "Seasonal rates",
  "Room allocation",
  "Blackout dates",
  "Booking rules",
  "Payment terms",
  "Cancellation policies",
  "Services and amenities",
  "Contract provisions",
  "Review and submit",
];
function HotelPortal() {
  const [record, setRecord] = useState<Submission>(),
    [metadata, setMetadata] = useState<Metadata>(),
    [draft, setDraft] = useState<CaraDraft>(),
    [method, setMethod] = useState<"online" | "upload">("online"),
    [chosen, setChosen] = useState(false),
    [step, setStep] = useState(0),
    [saveState, setSaveState] = useState(""),
    [error, setError] = useState(""),
    [validation, setValidation] = useState<string[]>([]),
    [busy, setBusy] = useState(false);
  const revision = useRef(0),
    chain = useRef(Promise.resolve()),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    lastSaved = useRef(""),
    draftRef = useRef<CaraDraft | undefined>(undefined);
  useEffect(() => {
    Promise.all([
      api<Submission>("/api/private/cara"),
      api<Metadata>("/api/private/cara/content"),
    ])
      .then(([data, meta]) => {
        setRecord(data);
        setDraft(data.draft);
        draftRef.current = data.draft;
        setMetadata(meta);
        setMethod(data.method);
        revision.current = data.revision;
        lastSaved.current = JSON.stringify({
          draft: data.draft,
          method: data.method,
        });
      })
      .catch((failure) => setError(failure.message));
    return () => clearTimeout(timer.current);
  }, []);
  async function refresh() {
    const data = await api<Submission>("/api/private/cara");
    setRecord(data);
  }
  function persist(data: CaraDraft, selectedMethod: "online" | "upload") {
    const serialized = JSON.stringify({ draft: data, method: selectedMethod });
    const job = chain.current
      .catch(() => {})
      .then(async () => {
        if (lastSaved.current === serialized) return;
        setSaveState("Saving…");
        const result = await action<{ revision: number }>(
          "/api/private/cara/draft",
          { revision: revision.current, method: selectedMethod, draft: data },
          "PUT",
        );
        revision.current = result.revision;
        lastSaved.current = serialized;
        setSaveState("Draft saved securely");
      });
    chain.current = job;
    return job.catch((failure) => {
      setSaveState("Draft not saved");
      setError(failure.message);
      throw failure;
    });
  }
  function update(next: CaraDraft) {
    draftRef.current = next;
    setDraft(next);
    setError("");
    clearTimeout(timer.current);
    setSaveState("Unsaved changes");
    timer.current = setTimeout(() => {
      persist(next, method).catch(() => {});
    }, 1000);
  }
  function group(name: string, values: Values) {
    const current = draftRef.current;
    if (current)
      update({
        ...current,
        [name]: { ...(current[name as keyof CaraDraft] as Values), ...values },
      });
  }
  async function advance(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    setError("");
    setValidation([]);
    clearTimeout(timer.current);
    try {
      await persist(draft, method);
      if ((method === "upload" && step === 2) || step === 11) {
        await action("/api/private/cara/submit", {
          revision: revision.current,
        });
        await refresh();
        setSaveState("Proposal submitted");
        window.scrollTo({ top: 0, behavior: "instant" });
      } else setStep(step + 1);
    } catch (failure) {
      setError((failure as Error).message);
      setValidation(failure instanceof ApiError ? failure.details : []);
    } finally {
      setBusy(false);
    }
  }
  if (!record || !draft || !metadata)
    return (
      <div className="private-card">
        <h1>Private Hotel Partnerships</h1>
        <p role="status">{error || "Loading your authorized proposal…"}</p>
      </div>
    );
  if (!["Draft", "Revision Requested"].includes(record.status))
    return (
      <div className="private-card">
        <span className="eyebrow">Private proposal · {record.status}</span>
        <h1>Thank You for Your Interest in Partnering With Give Holidays</h1>
        <p>
          Your agreement has been received for review. Our partnership team will
          evaluate the proposed terms and contact you regarding the next steps.
        </p>
        <p>
          Submissions remain proposals until approved and executed by authorized
          representatives of both parties.
        </p>
        <div className="private-actions">
          {record.versions.map((version) => (
            <a
              key={version.id}
              className="button secondary"
              href={`/api/private/cara/pdf/${version.id}`}
            >
              Download proposal PDF · v{version.version}
            </a>
          ))}
        </div>
        <Review draft={draft} metadata={metadata} />
      </div>
    );
  if (!chosen)
    return (
      <div className="private-card">
        <span className="eyebrow">Private hotel partnerships</span>
        <h1>Partner With Give Holidays</h1>
        <p>
          Give Holidays partners with hotels and resorts to create exceptional
          travel experiences for nonprofit fundraising auctions.
        </p>
        <p>
          Our goal is to establish long-term hospitality partnerships that
          generate incremental room revenue while supporting charitable
          organizations and the causes they serve.
        </p>
        <p>
          We welcome preferred wholesale agreements from hotels and resorts
          interested in participating in our charity auction travel program.
        </p>
        {record.revision_message && (
          <aside className="information-card">
            <h3>Revision requested</h3>
            <p>{record.revision_message}</p>
          </aside>
        )}
        <div className="option-grid">
          <article>
            <FileText />
            <h2>Already Have a Wholesale or FIT Agreement?</h2>
            <p>
              If your property maintains an existing wholesale, FIT, or travel
              trade agreement, you're welcome to submit it directly for
              consideration.
            </p>
            <button
              className="button primary"
              onClick={() => {
                setMethod("upload");
                setChosen(true);
                setStep(0);
              }}
            >
              Upload Existing Agreement
            </button>
          </article>
          <article>
            <Check />
            <h2>Charity Auction Rate Agreement (CARA)</h2>
            <p>
              Our streamlined agreement makes it easy to provide your property's
              preferred wholesale rates, room availability, blackout dates, and
              reservation terms.
            </p>
            <button
              className="button primary"
              onClick={() => {
                setMethod("online");
                setChosen(true);
                setStep(0);
              }}
            >
              Create Your CARA Agreement
            </button>
          </article>
        </div>
        <p>
          Submission does not constitute automatic approval or contract
          execution.
        </p>
      </div>
    );
  const activeSteps =
    method === "upload"
      ? ["Property details", "Hotel contact", "Upload, review and submit"]
      : steps;
  const onRoom = (index: number, values: Values) => {
    const current = draftRef.current!;
    update({
      ...current,
      rooms: current.rooms.map((room, i) =>
        i === index ? { ...room, values: { ...room.values, ...values } } : room,
      ),
    });
  };
  const onRate = (id: string, change: Partial<CaraDraft["rates"][number]>) => {
    const current = draftRef.current!;
    update({
      ...current,
      rates: current.rates.map((rate) =>
        rate.id === id
          ? { ...rate, ...change, values: { ...rate.values, ...change.values } }
          : rate,
      ),
    });
  };
  const onRange = (
    id: string,
    index: number,
    key: "start" | "end",
    value: string,
  ) => {
    const current = draftRef.current!.rates.find((rate) => rate.id === id)!;
    onRate(id, {
      ranges: current.ranges.map((range, i) =>
        i === index ? { ...range, [key]: value } : range,
      ),
    });
  };
  const onAllocation = (
    id: string,
    patch: Partial<CaraDraft["allocationRules"][number]>,
  ) => {
    const current = draftRef.current!;
    update({
      ...current,
      allocationRules: current.allocationRules.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  };
  const onBlackout = (
    id: string,
    patch: Partial<CaraDraft["blackouts"][number]>,
  ) => {
    const current = draftRef.current!;
    update({
      ...current,
      blackouts: current.blackouts.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  };
  return (
    <div className="private-card wizard">
      <div className="private-page-heading">
        <div>
          <span className="eyebrow">Confidential · proposal only</span>
          <h1>
            {method === "upload"
              ? "Existing Wholesale Agreement"
              : "Charity Auction Rate Agreement"}
          </h1>
        </div>
        <button
          type="button"
          className="text-link"
          onClick={() => setChosen(false)}
        >
          Change submission option
        </button>
      </div>
      <div className="progress-label">
        Step {step + 1} of {activeSteps.length}: {activeSteps[step]}
      </div>
      <progress max={activeSteps.length} value={step + 1} />
      <p role="status" className="save-status">
        {saveState ||
          "Your proposal is private to your hotel and Give Holidays."}
      </p>
      <form onSubmit={advance} className="wizard-form">
        <h2>{activeSteps[step]}</h2>
        {step === 0 && (
          <>
            <FieldGrid
              fields={metadata.groups.property}
              values={draft.property}
              onChange={(values) => group("property", values)}
              requiredOnly={
                method === "upload"
                  ? ["name", "legalEntity", "address", "country", "website"]
                  : undefined
              }
            />
            <Uploads
              kind="property_logo"
              documents={record.documents}
              onUploaded={refresh}
            />
          </>
        )}
        {step === 1 && (
          <FieldGrid
            fields={metadata.groups.contact}
            values={draft.contact}
            onChange={(values) => group("contact", values)}
            requiredOnly={
              method === "upload"
                ? ["name", "jobTitle", "email", "phone"]
                : undefined
            }
          />
        )}
        {method === "online" && step === 2 && (
          <>
            {draft.rooms.map((room, index) => (
              <article className="repeat-card" key={room.id}>
                <div className="repeat-heading">
                  <h3>Room category {index + 1}</h3>
                  <button
                    type="button"
                    className="remove-button"
                    onClick={() =>
                      update({
                        ...draft,
                        rooms: draft.rooms.filter(
                          (item) => item.id !== room.id,
                        ),
                        rates: draft.rates.filter(
                          (item) => item.roomId !== room.id,
                        ),
                      })
                    }
                  >
                    <Trash2 size={16} />
                    Remove room
                  </button>
                </div>
                <FieldGrid
                  fields={metadata.groups.room}
                  values={room.values}
                  onChange={(values) => onRoom(index, values)}
                />
              </article>
            ))}
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                update({
                  ...draft,
                  rooms: [
                    ...draft.rooms,
                    { id: crypto.randomUUID(), values: {} },
                  ],
                })
              }
            >
              <Plus size={17} />
              Add room category
            </button>
          </>
        )}
        {method === "online" && step === 3 && (
          <>
            <Information item={metadata.content.pricing} />
            <Information item={metadata.content.production} />
            {metadata.seasons.map((season) => (
              <section className="season" key={season}>
                <h3>{season}</h3>
                {draft.rates
                  .filter((rate) => rate.season === season)
                  .map((rate) => (
                    <article className="repeat-card" key={rate.id}>
                      <div className="repeat-heading">
                        <label>
                          Room category *
                          <select
                            required
                            value={rate.roomId}
                            onChange={(event) =>
                              onRate(rate.id, { roomId: event.target.value })
                            }
                          >
                            <option value="">Select a room</option>
                            {draft.rooms.map((room) => (
                              <option key={room.id} value={room.id}>
                                {room.values.name || "Unnamed room"}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          className="remove-button"
                          onClick={() =>
                            update({
                              ...draft,
                              rates: draft.rates.filter(
                                (item) => item.id !== rate.id,
                              ),
                            })
                          }
                        >
                          Remove rate
                        </button>
                      </div>
                      {rate.ranges.map((range, index) => (
                        <div className="date-range" key={index}>
                          <label>
                            Start date *
                            <input
                              required
                              type="date"
                              value={range.start}
                              onInput={(event) =>
                                onRange(
                                  rate.id,
                                  index,
                                  "start",
                                  event.currentTarget.value,
                                )
                              }
                              onChange={(event) =>
                                onRange(
                                  rate.id,
                                  index,
                                  "start",
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                          <label>
                            End date *
                            <input
                              required
                              type="date"
                              min={range.start}
                              value={range.end}
                              onInput={(event) =>
                                onRange(
                                  rate.id,
                                  index,
                                  "end",
                                  event.currentTarget.value,
                                )
                              }
                              onChange={(event) =>
                                onRange(
                                  rate.id,
                                  index,
                                  "end",
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                          {rate.ranges.length > 1 && (
                            <button
                              type="button"
                              className="text-link"
                              onClick={() =>
                                onRate(rate.id, {
                                  ranges: rate.ranges.filter(
                                    (_, i) => i !== index,
                                  ),
                                })
                              }
                            >
                              Remove dates
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        className="text-link"
                        onClick={() =>
                          onRate(rate.id, {
                            ranges: [...rate.ranges, { start: "", end: "" }],
                          })
                        }
                      >
                        Add date range
                      </button>
                      <FieldGrid
                        fields={metadata.groups.rate}
                        values={rate.values}
                        onChange={(values) => onRate(rate.id, { values })}
                      />
                    </article>
                  ))}
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    update({
                      ...draft,
                      rates: [
                        ...draft.rates,
                        {
                          id: crypto.randomUUID(),
                          season:
                            season as CaraDraft["rates"][number]["season"],
                          roomId: draft.rooms[0]?.id || crypto.randomUUID(),
                          ranges: [{ start: "", end: "" }],
                          values: {},
                        },
                      ],
                    })
                  }
                >
                  Add {season} rate
                </button>
              </section>
            ))}
          </>
        )}
        {method === "online" && step === 4 && (
          <>
            <p>
              Rooms and room nights are different inventory units. Guaranteed
              allocations are distinct from availability subject to
              confirmation.
            </p>
            {draft.allocationRules.map((rule) => (
              <div className="repeat-card private-fields" key={rule.id}>
                <label>
                  Allocation control *
                  <select
                    value={rule.type}
                    onChange={(event) =>
                      onAllocation(rule.id, {
                        type: event.target.value as typeof rule.type,
                      })
                    }
                  >
                    {metadata.allocationTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </label>
                {rule.type !== "On request" && (
                  <>
                    <label>
                      Quantity *
                      <input
                        required
                        type="number"
                        min={1}
                        step={1}
                        value={rule.quantity}
                        onChange={(event) =>
                          onAllocation(rule.id, {
                            quantity: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Applicable period(s) *
                      <input
                        required
                        value={rule.period}
                        onChange={(event) =>
                          onAllocation(rule.id, { period: event.target.value })
                        }
                      />
                    </label>
                  </>
                )}
                <button
                  type="button"
                  className="remove-button"
                  onClick={() =>
                    update({
                      ...draft,
                      allocationRules: draft.allocationRules.filter(
                        (item) => item.id !== rule.id,
                      ),
                    })
                  }
                >
                  Remove allocation
                </button>
              </div>
            ))}
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                update({
                  ...draft,
                  allocationRules: [
                    ...draft.allocationRules,
                    {
                      id: crypto.randomUUID(),
                      type: "On request",
                      quantity: "",
                      period: "",
                    },
                  ],
                })
              }
            >
              Add allocation control
            </button>
            <FieldGrid
              fields={metadata.groups.inventory}
              values={draft.inventory}
              onChange={(values) => group("inventory", values)}
            />
          </>
        )}
        {method === "online" && step === 5 && (
          <>
            <p>
              Unavailable dates cannot be booked. Restricted-rate periods remain
              bookable only under the applicable agreed seasonal rate.
            </p>
            {draft.blackouts.map((period) => (
              <article key={period.id} className="repeat-card private-fields">
                <label>
                  Restriction type
                  <select
                    value={period.kind}
                    onChange={(event) =>
                      onBlackout(period.id, {
                        kind: event.target.value as typeof period.kind,
                      })
                    }
                  >
                    {["Unavailable", "Restricted Rate", "Special Event"].map(
                      (kind) => (
                        <option key={kind}>{kind}</option>
                      ),
                    )}
                  </select>
                </label>
                {(["start", "end"] as const).map((key) => (
                  <label key={key}>
                    {key === "start" ? "Start / individual date" : "End date"} *
                    <input
                      required
                      type="date"
                      value={period[key]}
                      onInput={(event) =>
                        onBlackout(period.id, {
                          [key]: event.currentTarget.value,
                        })
                      }
                      onChange={(event) =>
                        onBlackout(period.id, { [key]: event.target.value })
                      }
                    />
                  </label>
                ))}
                <label>
                  Repeat restriction
                  <select
                    value={period.recurrence}
                    onChange={(event) =>
                      onBlackout(period.id, {
                        recurrence: event.target
                          .value as typeof period.recurrence,
                      })
                    }
                  >
                    {["None", "Weekly", "Monthly", "Annually"].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label className="wide">
                  Recurring pattern / special-event details / restricted-rate
                  reference
                  <textarea
                    value={period.details}
                    required={period.recurrence !== "None"}
                    onChange={(event) =>
                      onBlackout(period.id, { details: event.target.value })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="remove-button"
                  onClick={() =>
                    update({
                      ...draft,
                      blackouts: draft.blackouts.filter(
                        (item) => item.id !== period.id,
                      ),
                    })
                  }
                >
                  Remove restriction
                </button>
              </article>
            ))}
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                update({
                  ...draft,
                  blackouts: [
                    ...draft.blackouts,
                    {
                      id: crypto.randomUUID(),
                      kind: "Unavailable",
                      start: "",
                      end: "",
                      recurrence: "None",
                      details: "",
                    },
                  ],
                })
              }
            >
              Add unavailable or restricted dates
            </button>
          </>
        )}
        {method === "online" && [6, 7, 8].includes(step) && (
          <>
            {step === 7 && <p>Do not provide raw credit-card details.</p>}
            <FieldGrid
              fields={
                metadata.groups[
                  step === 6
                    ? "booking"
                    : step === 7
                      ? "payment"
                      : "cancellation"
                ]
              }
              values={
                draft[
                  step === 6
                    ? "booking"
                    : step === 7
                      ? "payment"
                      : "cancellation"
                ]
              }
              onChange={(values) =>
                group(
                  step === 6
                    ? "booking"
                    : step === 7
                      ? "payment"
                      : "cancellation",
                  values,
                )
              }
            />
          </>
        )}
        {method === "online" && step === 9 && (
          <>
            <Information item={metadata.content.breakfast} />
            {draft.amenities.breakfast?.startsWith("Complimentary") && (
              <span className="preferred-benefit">Preferred Guest Benefit</span>
            )}
            <FieldGrid
              fields={metadata.groups.amenities.filter(
                (field) =>
                  !["breakfastAmount", "breakfastCurrency"].includes(
                    field.key,
                  ) ||
                  draft.amenities.breakfast ===
                    "Preferred discounted breakfast",
              )}
              values={draft.amenities}
              onChange={(values) => group("amenities", values)}
            />
          </>
        )}
        {method === "online" && step === 10 && (
          <>
            <aside className="information-card">
              <h3>Legal review required</h3>
              <p>
                The CARA contractual template must be reviewed and approved by
                legal counsel before live execution. No signature or contract
                acceptance is created by this form.
              </p>
            </aside>
            <div className="clause-checklist">
              {String(metadata.content.clauseChecklist || "").replace(
                /\*\*/g,
                "",
              )}
            </div>
            <FieldGrid
              fields={metadata.groups.contract}
              values={draft.contract}
              onChange={(values) => group("contract", values)}
            />
          </>
        )}
        {((method === "online" && step === 11) ||
          (method === "upload" && step === 2)) && (
          <>
            {method === "upload" && (
              <>
                <Uploads documents={record.documents} onUploaded={refresh} />
                <label>
                  Additional comments
                  <textarea
                    maxLength={5000}
                    value={draft.additionalComments || ""}
                    onChange={(event) =>
                      update({
                        ...draftRef.current!,
                        additionalComments: event.target.value,
                      })
                    }
                  />
                </label>
              </>
            )}
            <Review
              draft={draft}
              metadata={metadata}
              edit={method === "online" ? setStep : undefined}
            />
            <aside className="information-card">
              <p>
                Submitting a CARA agreement does not create a binding hotel
                partnership until the agreement has been reviewed, approved, and
                executed by authorized representatives of both parties.
              </p>
            </aside>
            <label className="acknowledgment">
              <input
                type="checkbox"
                required
                checked={draft.accuracyAcknowledged}
                onChange={(event) =>
                  update({
                    ...draft,
                    accuracyAcknowledged: event.target.checked,
                  })
                }
              />
              I confirm that I am authorized to submit these proposed terms and
              that the supplied information is accurate.
            </label>
          </>
        )}
        {error && (
          <div className="private-error" role="alert">
            <p>{error}</p>
            {validation.length > 0 && (
              <ul>
                {validation.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="wizard-controls">
          {step > 0 && (
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => setStep(step - 1)}
            >
              <ChevronLeft size={17} />
              Back
            </button>
          )}
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => {
              clearTimeout(timer.current);
              persist(draft, method).catch(() => {});
            }}
          >
            Save Draft
          </button>
          <button type="submit" className="button primary" disabled={busy}>
            {busy
              ? "Saving…"
              : (method === "upload" && step === 2) || step === 11
                ? "Submit CARA for Review"
                : "Continue"}
            <ArrowRight size={17} />
          </button>
        </div>
      </form>
    </div>
  );
}
function AdminPortal() {
  const [tab, setTab] = useState("Inquiries"),
    [schema, setSchema] = useState<Metadata>(),
    [items, setItems] = useState<Item[]>([]),
    [selected, setSelected] = useState<Submission>(),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function load(section = tab) {
    setError("");
    try {
      const result = await api<{ items: Item[] }>(
        `/api/admin/${section.toLowerCase()}`,
      );
      setItems(result.items);
    } catch (failure) {
      setError((failure as Error).message);
    }
  }
  useEffect(() => {
    api<Metadata>("/api/admin/cara-schema")
      .then(setSchema)
      .catch((failure) => setError(failure.message));
    let active = true;
    api<{ items: Item[] }>("/api/admin/inquiries")
      .then((result) => {
        if (active) setItems(result.items);
      })
      .catch((failure) => setError(failure.message));
    return () => {
      active = false;
    };
  }, []);
  async function mutate(path: string, body: unknown = {}) {
    setError("");
    setMessage("");
    try {
      await action(path, body);
      setMessage("Change saved.");
      await load();
    } catch (failure) {
      setError((failure as Error).message);
    }
  }
  async function detail(id: string) {
    try {
      setSelected(await api<Submission>(`/api/admin/submissions/${id}`));
    } catch (failure) {
      setError((failure as Error).message);
    }
  }
  async function note(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = event.currentTarget;
    await mutate(
      `/api/admin/submissions/${selected.id}/notes`,
      Object.fromEntries(new FormData(form)),
    );
    await detail(selected.id);
    form.reset();
  }
  async function status(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await mutate(`/api/admin/submissions/${selected.id}/status`, {
      ...data,
      executionConfirmed: data.executionConfirmed === "on",
    });
    await detail(selected.id);
  }
  if (selected)
    return (
      <div className="private-card">
        <button className="text-link" onClick={() => setSelected(undefined)}>
          ← Back to administration
        </button>
        <span className="eyebrow">Confidential · {selected.status}</span>
        <h1>{selected.draft.property.name || "Hotel proposal"}</h1>
        <Review draft={selected.draft} metadata={schema} />
        <section className="admin-documents">
          <h2>Private agreements and proposal PDFs</h2>
          <ul className="document-list">
            {selected.documents.map((document) => (
              <li key={document.id}>
                <span>
                  {document.original_name} · {document.scan_status}
                </span>
                {document.scan_status === "clean" ? (
                  <a
                    href={`/api/private/documents/${document.id}`}
                    className="text-link"
                  >
                    Download
                  </a>
                ) : (
                  <button
                    className="text-link"
                    onClick={async () => {
                      await mutate(`/api/admin/documents/${document.id}/scan`);
                      await detail(selected.id);
                    }}
                  >
                    Run malware scan
                  </button>
                )}
              </li>
            ))}
          </ul>
          {selected.versions.map((version) => (
            <a
              className="button secondary"
              key={version.id}
              href={`/api/private/cara/pdf/${version.id}`}
            >
              Proposal PDF v{version.version}
            </a>
          ))}
          <Uploads
            kind="executed"
            adminId={selected.id}
            documents={selected.documents}
            onUploaded={() => detail(selected.id)}
          />
        </section>
        <section className="admin-notes">
          <h2>Private administrative notes</h2>
          {selected.notes?.map((item) => (
            <article key={item.id}>
              <time>{new Date(item.created_at).toLocaleString()}</time>
              <p>{item.note}</p>
            </article>
          ))}
          <form onSubmit={note}>
            <label>
              Add private note
              <textarea name="note" maxLength={10000} required />
            </label>
            <button className="button secondary">Save Private Note</button>
          </form>
        </section>
        <section className="admin-status">
          <h2>Agreement status</h2>
          <p>
            Legal approval is required before signature or execution. Executed
            status additionally requires a scanned executed agreement and
            explicit confirmation of both parties' execution.
          </p>
          <form onSubmit={status}>
            <label>
              New status
              <select name="status" defaultValue="" required>
                <option value="" disabled>
                  Choose status
                </option>
                {[
                  "Submitted",
                  "Under Review",
                  "Revision Requested",
                  "Approved for Signature",
                  "Executed",
                  "Declined",
                  "Expired",
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Hotel-facing revision instructions / status message
              <textarea name="message" maxLength={5000} />
            </label>
            <label className="acknowledgment">
              <input name="executionConfirmed" type="checkbox" />
              For Executed status only: I confirm the attached agreement has
              already been executed by authorized representatives of both
              parties.
            </label>
            <button className="button primary">Update Status</button>
          </form>
        </section>
        {error && (
          <p className="private-error" role="alert">
            {error}
          </p>
        )}
        <p role="status">{message}</p>
      </div>
    );
  return (
    <div className="private-card">
      <span className="eyebrow">Authorized administrators only</span>
      <h1>Hotel Partnership Administration</h1>
      <div
        className="admin-tabs"
        role="tablist"
        aria-label="Administration sections"
      >
        {["Inquiries", "Invitations", "Submissions", "Audit"].map((section) => (
          <button
            key={section}
            role="tab"
            aria-selected={tab === section}
            onClick={() => {
              setTab(section);
              load(section);
            }}
          >
            {section}
          </button>
        ))}
        <a className="button secondary" href="/api/admin/export">
          Export Contract Data
        </a>
      </div>
      {error && (
        <p className="private-error" role="alert">
          {error}
        </p>
      )}
      <p role="status">{message}</p>
      <div className="admin-list">
        {items.length === 0 && <p>No records in this section yet.</p>}
        {items.map((item) => (
          <article key={String(item.id)}>
            <div>
              <h2>
                {String(
                  item.property_name ||
                    item.name ||
                    item.email ||
                    item.action ||
                    "Record",
                )}
              </h2>
              <p>
                {String(item.email || item.status || item.review_status || "")}
              </p>
              {tab === "Inquiries" && (
                <>
                  <p>{String(item.message || "")}</p>
                  <p>
                    {String(item.website || "")} ·{" "}
                    {String(item.job_title || "")} · {String(item.phone || "")}
                  </p>
                </>
              )}
              {tab === "Invitations" && (
                <p>
                  Expires {new Date(String(item.expires_at)).toLocaleString()} ·{" "}
                  {item.revoked_at
                    ? "Revoked"
                    : item.consumed_at
                      ? "Verified"
                      : "Awaiting verification"}
                </p>
              )}
              {tab === "Audit" && (
                <p>
                  {new Date(String(item.created_at)).toLocaleString()} ·{" "}
                  {String(item.action).replaceAll("_", " ")}
                </p>
              )}
            </div>
            <div className="private-actions">
              {tab === "Inquiries" && item.kind === "partnership" && (
                <>
                  <button
                    className="button secondary"
                    onClick={() =>
                      mutate(`/api/admin/inquiries/${item.id}/review`, {
                        status: "Approved",
                      })
                    }
                  >
                    Approve Inquiry
                  </button>
                  <button
                    className="button secondary"
                    onClick={() =>
                      mutate(`/api/admin/inquiries/${item.id}/review`, {
                        status: "Declined",
                      })
                    }
                  >
                    Decline
                  </button>
                  {item.review_status === "Approved" && (
                    <button
                      className="button primary"
                      onClick={() =>
                        mutate("/api/admin/invitations", { inquiryId: item.id })
                      }
                    >
                      Send Private Invitation
                    </button>
                  )}
                </>
              )}
              {tab === "Invitations" && (
                <>
                  <button
                    className="button secondary"
                    onClick={() =>
                      mutate(`/api/admin/invitations/${item.id}/resend`)
                    }
                  >
                    Resend Invitation
                  </button>
                  <button
                    className="button secondary"
                    onClick={() =>
                      mutate(`/api/admin/invitations/${item.id}/revoke`)
                    }
                  >
                    Revoke Access
                  </button>
                </>
              )}
              {tab === "Submissions" && (
                <button
                  className="button primary"
                  onClick={() => detail(String(item.id))}
                >
                  Review Proposal
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
function PrivateApp() {
  const [identity, setIdentity] = useState<{
      role: "admin" | "hotel";
      email: string;
    }>(),
    [error, setError] = useState("");
  useEffect(() => {
    api<{ role: "admin" | "hotel"; email: string; csrf: string }>(
      "/api/private/me",
    )
      .then((result) => {
        csrf = result.csrf;
        setIdentity(result);
      })
      .catch((failure) => setError(failure.message));
  }, []);
  async function logout() {
    try {
      await action("/api/private/logout", {});
      window.location.assign("/");
    } catch (failure) {
      setError((failure as Error).message);
    }
  }
  return (
    <>
      {import.meta.env.VITE_APP_ENV === "staging" && (
        <div className="test-mode" role="status">TEST MODE — fictional test data only</div>
      )}
      <header className="portal-header">
        <div className="portal-shell">
          <a href="/" aria-label="Give Holidays home">
            <img
              src="/assets/give-holidays-logo.png"
              alt="Give Holidays"
              width="211"
              height="72"
            />
          </a>
          <span>
            <LockKeyhole size={16} />
            Private Hotel Partnerships
          </span>
          {identity && (
            <button className="button secondary" onClick={logout}>
              Sign Out
            </button>
          )}
        </div>
      </header>
      <main className="portal-shell">
        {error ? (
          <section className="private-card">
            <h1>Verified access required</h1>
            <p role="alert">{error}</p>
            <a href="/admin-entry" className="text-link">
              Administrator verification
            </a>
          </section>
        ) : identity ? (
          identity.role === "admin" ? (
            <AdminPortal />
          ) : (
            <HotelPortal />
          )
        ) : (
          <p>Verifying your private session…</p>
        )}
      </main>
      <footer className="portal-footer">
        Give Holidays · Confidential commercial proposals · Legal review
        required before execution
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PrivateApp />
  </StrictMode>,
);
