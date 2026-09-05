import type { FlattenedTierStructure } from "../api/types";
import { newPeriod, type Period } from "../components/PeriodTierEditor";

export const ZERO_SCHEDULE: number[][] = Array.from({ length: 12 }, () => Array.from({ length: 24 }, () => 0));

export function parseTierStructure(
  structure: FlattenedTierStructure | undefined,
  prefix: string,
  hasUnit: boolean,
  hasSell: boolean,
  defaultUnit?: string
): Period[] {
  if (!structure || Object.keys(structure).length === 0) return [newPeriod(hasUnit ? defaultUnit : undefined, hasSell)];

  const periodRe = new RegExp(`^${prefix}\\/period(\\d+)\\/tier\\d+max$`);
  const periodIndices = new Set<number>();
  for (const key of Object.keys(structure)) {
    const m = key.match(periodRe);
    if (m) periodIndices.add(Number(m[1]));
  }
  if (periodIndices.size === 0) return [newPeriod(hasUnit ? defaultUnit : undefined, hasSell)];

  return Array.from(periodIndices)
    .sort((a, b) => a - b)
    .map((p) => {
      const tierRe = new RegExp(`^${prefix}\\/period${p}\\/tier(\\d+)max$`);
      const tierIndices = new Set<number>();
      for (const key of Object.keys(structure)) {
        const m = key.match(tierRe);
        if (m) tierIndices.add(Number(m[1]));
      }
      const tiers = Array.from(tierIndices)
        .sort((a, b) => a - b)
        .map((t) => ({
          max: String(structure[`${prefix}/period${p}/tier${t}max`] ?? ""),
          unit: hasUnit ? String(structure[`${prefix}/period${p}/tier${t}unit`] ?? defaultUnit ?? "") : undefined,
          rate: String(structure[`${prefix}/period${p}/tier${t}rate`] ?? ""),
          adj: String(structure[`${prefix}/period${p}/tier${t}adj`] ?? ""),
          sell: hasSell ? String(structure[`${prefix}/period${p}/tier${t}sell`] ?? "") : undefined,
        }));
      return { tiers };
    });
}

export function serializeTierStructure(
  periods: Period[],
  prefix: string,
  hasUnit: boolean,
  hasSell: boolean,
  defaultUnit: string
): FlattenedTierStructure {
  const out: FlattenedTierStructure = {};
  periods.forEach((period, p) => {
    period.tiers.forEach((tier, t) => {
      out[`${prefix}/period${p}/tier${t}max`] = Number(tier.max) || 0;
      if (hasUnit) out[`${prefix}/period${p}/tier${t}unit`] = tier.unit || defaultUnit;
      out[`${prefix}/period${p}/tier${t}rate`] = Number(tier.rate) || 0;
      out[`${prefix}/period${p}/tier${t}adj`] = Number(tier.adj) || 0;
      if (hasSell) out[`${prefix}/period${p}/tier${t}sell`] = Number(tier.sell) || 0;
    });
  });
  return out;
}

export function parseMonthAssignment(flatdemandmonths: Record<string, number> | undefined): number[] {
  const months = Array(12).fill(0);
  if (!flatdemandmonths) return months;
  for (let i = 0; i < 12; i++) {
    months[i] = flatdemandmonths[`flatdemandmonth${String(i + 1).padStart(2, "0")}`] ?? 0;
  }
  return months;
}

export function serializeMonthAssignment(months: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  months.forEach((p, i) => {
    out[`flatdemandmonth${String(i + 1).padStart(2, "0")}`] = p;
  });
  return out;
}

export function parseMonthlyValues(record: Record<string, number> | undefined): string[] {
  const out = Array(12).fill("");
  if (!record) return out;
  for (let i = 0; i < 12; i++) {
    const key = String(i + 1).padStart(2, "0");
    if (record[key] !== undefined) out[i] = String(record[key]);
  }
  return out;
}

export function serializeMonthlyValues(values: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  values.forEach((v, i) => {
    if (v !== "") out[String(i + 1).padStart(2, "0")] = Number(v) || 0;
  });
  return out;
}

export const ENERGY_UNIT_OPTIONS = ["kWh", "kWh_daily", "kWh/kW", "kWh/kW_daily", "kWh/hp", "kWh/kVA"];
export const DEMAND_UNIT_OPTIONS = ["kW", "kVA", "hp", "kW_daily", "kVA_daily"];
