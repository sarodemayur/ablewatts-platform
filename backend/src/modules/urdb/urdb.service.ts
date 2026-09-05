import { Prisma, RateStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../middleware/errorHandler";
import { UrdbRateData } from "./urdb.types";

export interface CreateUrdbRateInput {
  label?: string;
  name: string;
  utility: string;
  sector: string;
  state?: string;
  description?: string;
  source?: string;
  startDate: string;
  endDate?: string | null;

  supersedesLabel?: string;
  serviceType?: string;
  sourceParent?: string;
  compensationForDistributionGeneration?: string;
  assumeNetMetering?: boolean;
  basicComments?: string;

  demandApplicabilityMin?: number | null;
  demandApplicabilityMax?: number | null;
  demandApplicabilityUnit?: string;
  demandApplicabilityHistoryMonths?: number | null;
  energyApplicabilityMin?: number | null;
  energyApplicabilityMax?: number | null;
  energyApplicabilityHistoryMonths?: number | null;
  serviceVoltageMin?: number | null;
  serviceVoltageMax?: number | null;
  voltageCategory?: string;
  phaseWiring?: string;

  fixedDailyCharge?: number;
  fixedMonthlyCharge?: number;
  minMonthlyCharge?: number;
  annualMinCharge?: number;
  rateData: UrdbRateData;
}

// Fields that map 1:1 onto the Prisma model (no type conversion needed).
const PASSTHROUGH_FIELDS = [
  "label",
  "name",
  "utility",
  "sector",
  "state",
  "description",
  "source",
  "supersedesLabel",
  "serviceType",
  "sourceParent",
  "compensationForDistributionGeneration",
  "assumeNetMetering",
  "basicComments",
  "demandApplicabilityMin",
  "demandApplicabilityMax",
  "demandApplicabilityUnit",
  "demandApplicabilityHistoryMonths",
  "energyApplicabilityMin",
  "energyApplicabilityMax",
  "energyApplicabilityHistoryMonths",
  "serviceVoltageMin",
  "serviceVoltageMax",
  "voltageCategory",
  "phaseWiring",
  "fixedDailyCharge",
  "fixedMonthlyCharge",
  "minMonthlyCharge",
  "annualMinCharge",
] as const satisfies readonly (keyof CreateUrdbRateInput)[];

function buildData(input: Partial<CreateUrdbRateInput>) {
  const data: Record<string, unknown> = {};
  for (const field of PASSTHROUGH_FIELDS) {
    if (input[field] !== undefined) data[field] = input[field];
  }
  if (input.startDate !== undefined) data.startDate = new Date(input.startDate);
  if (input.endDate !== undefined) data.endDate = input.endDate ? new Date(input.endDate) : null;
  if (input.rateData !== undefined) data.rateData = input.rateData as unknown as Prisma.InputJsonValue;
  return data;
}

function logRevision(adminId: number, action: string, urdbId: number, note?: string) {
  return prisma.adminActionLog.create({
    data: {
      adminId,
      actionGroup: "urdb_rate",
      action,
      targetType: "urdb_rate",
      targetId: String(urdbId),
      note,
    },
  });
}

export async function listRates(filters: {
  utility?: string;
  sector?: string;
  state?: string;
  status?: RateStatus;
  effectiveAsOf?: string;
  orderBy?: "updatedAt" | "utility" | "name" | "startDate";
  direction?: "asc" | "desc";
  page?: number;
  limit?: number;
}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 25;

  const where: Prisma.UrdbRateWhereInput = {
    ...(filters.utility ? { utility: { contains: filters.utility, mode: "insensitive" } } : {}),
    ...(filters.sector ? { sector: { contains: filters.sector, mode: "insensitive" } } : {}),
    ...(filters.state ? { state: filters.state } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.effectiveAsOf
      ? {
          startDate: { lte: new Date(filters.effectiveAsOf) },
          OR: [{ endDate: null }, { endDate: { gte: new Date(filters.effectiveAsOf) } }],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.urdbRate.findMany({
      where,
      orderBy: { [filters.orderBy ?? "updatedAt"]: filters.direction ?? "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { createdBy: { select: { firstName: true, lastName: true, username: true } } },
    }),
    prisma.urdbRate.count({ where }),
  ]);

  return { rows, total, page, limit };
}

export async function getRateById(id: number) {
  const rate = await prisma.urdbRate.findUnique({ where: { id } });
  if (!rate) throw new ApiError(404, "Rate not found");
  return rate;
}

export async function createRate(adminId: number, input: CreateUrdbRateInput) {
  const rate = await prisma.urdbRate.create({
    data: {
      ...buildData(input),
      name: input.name,
      utility: input.utility,
      sector: input.sector,
      startDate: new Date(input.startDate),
      rateData: input.rateData as unknown as Prisma.InputJsonValue,
      createdByAdminId: adminId,
      status: RateStatus.unapproved,
    } as Prisma.UrdbRateUncheckedCreateInput,
  });
  await logRevision(adminId, "create", rate.id, `Created "${rate.name}" (${rate.utility})`);
  return rate;
}

export async function updateRate(adminId: number, id: number, input: Partial<CreateUrdbRateInput>) {
  await getRateById(id);
  const rate = await prisma.urdbRate.update({
    where: { id },
    data: buildData(input),
  });
  await logRevision(adminId, "update", id, "Updated rate details");
  return rate;
}

export async function setApprovalStatus(adminId: number, id: number, status: RateStatus) {
  await getRateById(id);
  const rate = await prisma.urdbRate.update({ where: { id }, data: { status } });
  await logRevision(adminId, status, id, `Marked as ${status}`);
  return rate;
}

export async function deleteRate(id: number) {
  await getRateById(id);
  await prisma.urdbRate.delete({ where: { id } });
}

export async function listRevisions(urdbId: number) {
  return prisma.adminActionLog.findMany({
    where: { targetType: "urdb_rate", targetId: String(urdbId) },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { admin: { select: { firstName: true, lastName: true, username: true } } },
  });
}

export async function listDistinctUtilities(sector?: string, state?: string) {
  const rows = await prisma.urdbRate.findMany({
    where: {
      ...(sector ? { sector } : {}),
      ...(state ? { state } : {}),
    },
    select: { utility: true },
    distinct: ["utility"],
    orderBy: { utility: "asc" },
  });
  return rows.map((r) => r.utility);
}

export async function listDistinctNames(utility: string, sector: string) {
  const rows = await prisma.urdbRate.findMany({
    where: { utility, sector },
    select: { name: true },
    distinct: ["name"],
    orderBy: { name: "asc" },
  });
  return rows.map((r) => r.name);
}

export interface OtherAttributeRow {
  rateId: number;
  attribute: string;
  value: string;
  attributeGroup: "demand" | "energy" | "fixed";
  state: string | null;
  utility: string;
  sector: string;
  name: string;
  status: RateStatus;
  updatedAt: Date;
}

// Flattens demandattrs/energyattrs/fixedattrs out of every matching rate's
// JSONB rateData into individual rows — backs the standalone "Other
// Attributes" browser page (distinct from the per-rate attribute editor on
// the rate form's "Other Attributes" tab).
export async function searchOtherAttributes(filters: {
  state?: string;
  utility?: string;
  sector?: string;
  name?: string;
  attributeGroup?: "demand" | "energy" | "fixed";
  orderBy?: "attribute" | "utility" | "sector" | "name" | "updatedAt";
  direction?: "asc" | "desc";
}) {
  const rates = await prisma.urdbRate.findMany({
    where: {
      ...(filters.state ? { state: filters.state } : {}),
      ...(filters.utility ? { utility: filters.utility } : {}),
      ...(filters.sector ? { sector: filters.sector } : {}),
      ...(filters.name ? { name: filters.name } : {}),
    },
    select: { id: true, state: true, utility: true, sector: true, name: true, status: true, updatedAt: true, rateData: true },
  });

  const groups: { key: "demand" | "energy" | "fixed"; field: "demandattrs" | "energyattrs" | "fixedattrs" }[] = [
    { key: "demand", field: "demandattrs" },
    { key: "energy", field: "energyattrs" },
    { key: "fixed", field: "fixedattrs" },
  ];

  let rows: OtherAttributeRow[] = [];
  for (const rate of rates) {
    const rateData = rate.rateData as Record<string, { attribute: string; value: string }[] | undefined>;
    for (const group of groups) {
      if (filters.attributeGroup && filters.attributeGroup !== group.key) continue;
      for (const attr of rateData[group.field] ?? []) {
        rows.push({
          rateId: rate.id,
          attribute: attr.attribute,
          value: attr.value,
          attributeGroup: group.key,
          state: rate.state,
          utility: rate.utility,
          sector: rate.sector,
          name: rate.name,
          status: rate.status,
          updatedAt: rate.updatedAt,
        });
      }
    }
  }

  const orderField = filters.orderBy ?? "attribute";
  const direction = filters.direction ?? "desc";
  rows.sort((a, b) => {
    const av = orderField === "updatedAt" ? a.updatedAt.getTime() : String(a[orderField]);
    const bv = orderField === "updatedAt" ? b.updatedAt.getTime() : String(b[orderField]);
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return direction === "asc" ? cmp : -cmp;
  });

  return rows;
}
