import { z } from "zod";
import { groups, seasons, allocationTypes } from "./cara-fields.ts";
const values = z.record(z.string().max(80), z.string().max(8000));
const date = z.string().max(10);
export const draftSchema = z.object({
  property: values,
  contact: values,
  rooms: z.array(z.object({ id: z.uuid(), values })).max(30),
  rates: z
    .array(
      z.object({
        id: z.uuid(),
        season: z.enum(seasons),
        roomId: z.uuid(),
        ranges: z
          .array(z.object({ start: date, end: date }))
          .min(1)
          .max(30),
        values,
      }),
    )
    .max(150),
  allocationRules: z
    .array(
      z.object({
        id: z.uuid(),
        type: z.enum(allocationTypes),
        quantity: z.string().max(12),
        period: z.string().max(500),
      }),
    )
    .max(100),
  inventory: values,
  blackouts: z
    .array(
      z.object({
        id: z.uuid(),
        kind: z.enum(["Unavailable", "Restricted Rate", "Special Event"]),
        start: date,
        end: date,
        recurrence: z.enum(["None", "Weekly", "Monthly", "Annually"]),
        details: z.string().max(2000),
      }),
    )
    .max(300),
  booking: values,
  payment: values,
  cancellation: values,
  amenities: values,
  contract: values,
  additionalComments: z.string().max(5000).default(""),
  accuracyAcknowledged: z.boolean(),
});
export type CaraDraft = z.infer<typeof draftSchema>;
export function validateFinal(input: unknown, method: "online" | "upload") {
  const result = draftSchema.safeParse(input);
  if (!result.success)
    return {
      errors: ["Check the form structure, dates, and repeated entries."],
      draft: undefined,
    };
  const d = result.data,
    errors: string[] = [];
  const validate = (
    group: string,
    data: Record<string, string>,
    requiredKeys?: string[],
  ) => {
    const allowed = new Set(groups[group].map((f) => f.key));
    for (const key of Object.keys(data))
      if (!allowed.has(key)) errors.push(`${group}: unrecognized field`);
    for (const field of groups[group]) {
      const value = data[field.key]?.trim() || "";
      if (
        (requiredKeys ? requiredKeys.includes(field.key) : field.required) &&
        !value
      )
        errors.push(`${field.label} is required.`);
      if (!value) continue;
      if (field.type === "email" && !z.email().safeParse(value).success)
        errors.push(`${field.label}: enter a valid email.`);
      if (
        field.type === "url" &&
        (!z.url().safeParse(value).success || !/^https?:\/\//.test(value))
      )
        errors.push(`${field.label}: use an HTTP or HTTPS URL.`);
      if (field.type === "date" && !z.iso.date().safeParse(value).success)
        errors.push(`${field.label}: enter a valid date.`);
      if (
        field.type === "number" &&
        (!/^\d+(\.\d{1,4})?$/.test(value) || Number(value) > 10000000)
      )
        errors.push(`${field.label}: enter a nonnegative number.`);
      if (field.options && !field.options.includes(value))
        errors.push(`${field.label}: choose an available option.`);
    }
  };
  validate(
    "property",
    d.property,
    method === "upload"
      ? ["name", "legalEntity", "address", "country", "website"]
      : undefined,
  );
  validate(
    "contact",
    d.contact,
    method === "upload" ? ["name", "jobTitle", "email", "phone"] : undefined,
  );
  if (!d.accuracyAcknowledged)
    errors.push("Confirm the accuracy acknowledgment.");
  if (method === "online") {
    for (const group of [
      "inventory",
      "booking",
      "payment",
      "cancellation",
      "amenities",
      "contract",
    ])
      validate(group, d[group as keyof CaraDraft] as Record<string, string>);
    if (!d.rooms.length) errors.push("Add at least one room category.");
    const roomIds = new Set(d.rooms.map((r) => r.id));
    if (roomIds.size !== d.rooms.length)
      errors.push("Room identifiers must be unique.");
    for (const room of d.rooms) {
      validate("room", room.values);
      if (
        !Number.isInteger(Number(room.values.maxOccupancy)) ||
        Number(room.values.maxOccupancy) < 1 ||
        !Number.isInteger(Number(room.values.includedGuests)) ||
        Number(room.values.includedGuests) < 1 ||
        Number(room.values.includedGuests) > Number(room.values.maxOccupancy)
      )
        errors.push("Check room occupancy and included guests.");
    }
    for (const season of seasons)
      if (!d.rates.some((r) => r.season === season))
        errors.push(`Add rates for ${season}.`);
    for (const rate of d.rates) {
      validate("rate", rate.values);
      if (!roomIds.has(rate.roomId))
        errors.push("Each rate must reference one of your room categories.");
      if (!/^[A-Z]{3}$/.test(rate.values.currency || ""))
        errors.push("Use a 3-letter currency code.");
      if (Number(rate.values.taxPercent) > 100)
        errors.push("Tax percentage cannot exceed 100.");
      for (const range of rate.ranges)
        if (
          !z.iso.date().safeParse(range.start).success ||
          !z.iso.date().safeParse(range.end).success ||
          range.end < range.start
        )
          errors.push(
            "Rate date ranges must be valid and end on or after their start.",
          );
      if (
        rate.values.designation === "Commissionable" &&
        !rate.values.commission?.trim()
      )
        errors.push("Provide commission details for commissionable rates.");
    }
    if (!d.allocationRules.length)
      errors.push(
        "Add an allocation control or select on-request availability.",
      );
    if (
      d.inventory.availability === "Guaranteed inventory" &&
      !d.allocationRules.some((rule) => rule.type !== "On request")
    )
      errors.push(
        "Guaranteed inventory requires a quantified allocation control.",
      );
    for (const rule of d.allocationRules)
      if (
        rule.type !== "On request" &&
        (!/^\d+$/.test(rule.quantity) ||
          Number(rule.quantity) < 1 ||
          !rule.period.trim())
      )
        errors.push(
          "Allocation quantities and applicable periods are required.",
        );
    for (const item of d.blackouts)
      if (
        !z.iso.date().safeParse(item.start).success ||
        !z.iso.date().safeParse(item.end).success ||
        item.end < item.start ||
        (item.recurrence !== "None" && !item.details.trim())
      )
        errors.push("Check blackout ranges and recurring restriction details.");
    if (d.contract.expirationDate < d.contract.effectiveDate)
      errors.push("Agreement expiration must follow its effective date.");
    if (Number(d.inventory.maxStay) < Number(d.inventory.minStay))
      errors.push("Maximum stay cannot be shorter than minimum stay.");
    for (const key of ["maxPerReservation", "maxPerGroup", "minStay", "maxStay"])
      if (!Number.isInteger(Number(d.inventory[key])) || Number(d.inventory[key]) < 1)
        errors.push("Room and stay limits must be positive whole numbers.");
    if (!Number.isInteger(Number(d.booking.advanceDays)))
      errors.push("Advance booking notice must be a whole number of days.");
    if (
      d.amenities.breakfast === "Preferred discounted breakfast" &&
      (!d.amenities.breakfastAmount ||
        !/^\d+(\.\d{1,4})?$/.test(d.amenities.breakfastAmount) ||
        !/^[A-Z]{3}$/.test(d.amenities.breakfastCurrency || ""))
    )
      errors.push("Enter discounted breakfast amount and currency.");
  }
  return { errors, draft: d };
}
