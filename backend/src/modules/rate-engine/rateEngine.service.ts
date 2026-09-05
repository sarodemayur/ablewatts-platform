import { RateStatus, UrdbRate } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../middleware/errorHandler";
import { UrdbRateData } from "../urdb/urdb.types";
import { HourlyReading, parseCsvGreenData } from "./greenDataParser";
import { periodFor, daysInMonth } from "./scheduleLookup";
import { calculateFlatDemandForPeriod, calculateDemandForPeriod, calculateEnergyForPeriod } from "./tieredRateCalculator";

// ---------------------------------------------------------------------------
// Rate matching — ports the 3-tier fallback query from
// Urdb_Calculator_Versiontwo::set_urdb_object(): try an overlap match first,
// then containment (green-data range fully inside the rate's validity
// window), then fall back to the latest open-ended (no end date) rate.
//
// NOTE: the original engine could stitch together multiple URDB "bills" when
// a rate changed mid-period; this port matches a single best-fit rate for
// the whole green-data range, which covers the common case but not a rate
// change occurring mid-series. Flagged as a follow-up refinement.
// ---------------------------------------------------------------------------
export async function findMatchingRate(params: {
  utility: string;
  sector: string;
  name: string;
  greenStart: Date;
  greenEnd: Date;
}): Promise<UrdbRate | null> {
  const { utility, sector, name, greenStart, greenEnd } = params;
  const base = { utility, sector, name, status: RateStatus.approved };

  const overlap = await prisma.urdbRate.findFirst({
    where: {
      ...base,
      OR: [
        { startDate: { gte: greenStart, lte: greenEnd } },
        { endDate: { gte: greenStart, lte: greenEnd } },
      ],
    },
    orderBy: { endDate: "asc" },
  });
  if (overlap) return overlap;

  const containment = await prisma.urdbRate.findFirst({
    where: {
      ...base,
      startDate: { lte: greenStart },
      OR: [{ endDate: { gte: greenEnd } }, { endDate: null }],
    },
    orderBy: { endDate: "asc" },
  });
  if (containment) return containment;

  const openEnded = await prisma.urdbRate.findFirst({
    where: { ...base, endDate: null },
    orderBy: { startDate: "desc" },
  });
  return openEnded;
}

// ---------------------------------------------------------------------------
// Billing calculation
// ---------------------------------------------------------------------------

interface MonthKey {
  year: number;
  month: number;
}

function monthKeyStr(k: MonthKey) {
  return `${k.year}-${k.month}`;
}

export interface MonthlyBillLine {
  year: number;
  month: number;
  daysInMonth: number;
  energy: { consumptionTotal: number; contributionTotal: number; perPeriod: Record<string, number> };
  demand: { consumptionTotal: number; contributionTotal: number; perPeriod: Record<string, number> };
  flatDemand: { consumptionTotal: number; contributionTotal: number };
  fixedCharge: number;
  total: number;
}

export function computeMonthlyBill(hourly: HourlyReading[], rate: UrdbRate): MonthlyBillLine[] {
  const data = rate.rateData as unknown as UrdbRateData;

  const monthPeak = new Map<string, number>();
  const energySumByMonthPeriod = new Map<string, Map<number, number>>();
  const demandMaxByMonthPeriod = new Map<string, Map<number, number>>();
  const monthKeys = new Map<string, MonthKey>();

  const energyWeekday = data.energyweekdayschedule;
  const energyWeekend = data.energyweekendschedule;
  const demandWeekday = data.demandweekdayschedule;
  const demandWeekend = data.demandweekendschedule;

  for (const reading of hourly) {
    const key = monthKeyStr(reading);
    monthKeys.set(key, { year: reading.year, month: reading.month });

    monthPeak.set(key, Math.max(monthPeak.get(key) ?? 0, reading.kwh));

    const energyPeriod = periodFor(reading, energyWeekday, energyWeekend);
    if (!energySumByMonthPeriod.has(key)) energySumByMonthPeriod.set(key, new Map());
    const eMap = energySumByMonthPeriod.get(key)!;
    eMap.set(energyPeriod, (eMap.get(energyPeriod) ?? 0) + reading.kwh);

    if (demandWeekday && demandWeekend) {
      const demandPeriod = periodFor(reading, demandWeekday, demandWeekend);
      if (!demandMaxByMonthPeriod.has(key)) demandMaxByMonthPeriod.set(key, new Map());
      const dMap = demandMaxByMonthPeriod.get(key)!;
      dMap.set(demandPeriod, Math.max(dMap.get(demandPeriod) ?? 0, reading.kwh));
    }
  }

  const lines: MonthlyBillLine[] = [];

  for (const [key, { year, month }] of monthKeys) {
    const days = daysInMonth(year, month);
    const peak = monthPeak.get(key) ?? 0;

    // Energy
    let energyTotal = 0;
    let energyConsumption = 0;
    const energyPerPeriod: Record<string, number> = {};
    for (const [period, consumption] of energySumByMonthPeriod.get(key) ?? []) {
      const { total, perTier } = calculateEnergyForPeriod(consumption, period, data.energyratestructure, days, peak);
      energyTotal += total;
      energyConsumption += consumption;
      energyPerPeriod[`energyCost/period${period}/total`] = total;
      Object.assign(energyPerPeriod, perTier);
    }

    // Demand (time-of-use demand charge, based on peak-per-period, not sum)
    let demandTotal = 0;
    let demandConsumption = 0;
    const demandPerPeriod: Record<string, number> = {};
    if (data.demandratestructure && data.demandrateunit) {
      for (const [period, consumption] of demandMaxByMonthPeriod.get(key) ?? []) {
        const { total, perTier } = calculateDemandForPeriod(consumption, period, data.demandratestructure, data.demandrateunit, days);
        demandTotal += total;
        demandConsumption += consumption;
        demandPerPeriod[`demandCost/period${period}/total`] = total;
        Object.assign(demandPerPeriod, perTier);
      }
    }

    // Flat demand (single peak-of-month value, period selected by calendar month)
    let flatDemandTotal = 0;
    if (data.flatdemandstructure && data.flatdemandunit && data.flatdemandmonths) {
      const monthKey = `flatdemandmonth${String(month).padStart(2, "0")}`;
      const period = data.flatdemandmonths[monthKey] ?? 0;
      const { total } = calculateFlatDemandForPeriod(peak, period, data.flatdemandstructure, data.flatdemandunit, days);
      flatDemandTotal = total;
    }

    const chargesBeforeFixed = flatDemandTotal + demandTotal + energyTotal;
    const fixedCharge =
      chargesBeforeFixed < rate.minMonthlyCharge ? rate.fixedMonthlyCharge + rate.minMonthlyCharge : rate.fixedMonthlyCharge;

    lines.push({
      year,
      month,
      daysInMonth: days,
      energy: { consumptionTotal: round2(energyConsumption), contributionTotal: round2(energyTotal), perPeriod: roundMap(energyPerPeriod) },
      demand: { consumptionTotal: round2(demandConsumption), contributionTotal: round2(demandTotal), perPeriod: roundMap(demandPerPeriod) },
      flatDemand: { consumptionTotal: round2(peak), contributionTotal: round2(flatDemandTotal) },
      fixedCharge: round2(fixedCharge),
      total: round2(chargesBeforeFixed + fixedCharge),
    });
  }

  lines.sort((a, b) => (a.year - b.year) || (a.month - b.month));
  return lines;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function roundMap(m: Record<string, number>) {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(m)) out[k] = round2(v);
  return out;
}

// ---------------------------------------------------------------------------
// Daily breakdown — same engine (period assignment, tier math) as the
// monthly bill, just rolled up per calendar day instead of per month. Matches
// the original's dual output (StoreAll_values vs StoreAll_values_for_days_
// graph) off a single calculation pass.
//
// Flat/seasonal demand and the fixed/minimum monthly charge are inherently
// monthly concepts, so they're intentionally omitted from the daily
// breakdown rather than arbitrarily attributed to one day.
// ---------------------------------------------------------------------------

interface DayKey {
  year: number;
  month: number;
  day: number;
}

function dayKeyStr(k: DayKey) {
  return `${k.year}-${k.month}-${k.day}`;
}

export interface DailyBillLine {
  year: number;
  month: number;
  day: number;
  energy: { consumptionTotal: number; contributionTotal: number; perPeriod: Record<string, number> };
  demand: { consumptionTotal: number; contributionTotal: number; perPeriod: Record<string, number> };
  total: number;
}

export function computeDailyBill(hourly: HourlyReading[], rate: UrdbRate): DailyBillLine[] {
  const data = rate.rateData as unknown as UrdbRateData;

  const energySumByDayPeriod = new Map<string, Map<number, number>>();
  const demandMaxByDayPeriod = new Map<string, Map<number, number>>();
  const dayKeys = new Map<string, DayKey>();

  const energyWeekday = data.energyweekdayschedule;
  const energyWeekend = data.energyweekendschedule;
  const demandWeekday = data.demandweekdayschedule;
  const demandWeekend = data.demandweekendschedule;

  for (const reading of hourly) {
    const key = dayKeyStr(reading);
    dayKeys.set(key, { year: reading.year, month: reading.month, day: reading.day });

    const energyPeriod = periodFor(reading, energyWeekday, energyWeekend);
    if (!energySumByDayPeriod.has(key)) energySumByDayPeriod.set(key, new Map());
    const eMap = energySumByDayPeriod.get(key)!;
    eMap.set(energyPeriod, (eMap.get(energyPeriod) ?? 0) + reading.kwh);

    if (demandWeekday && demandWeekend) {
      const demandPeriod = periodFor(reading, demandWeekday, demandWeekend);
      if (!demandMaxByDayPeriod.has(key)) demandMaxByDayPeriod.set(key, new Map());
      const dMap = demandMaxByDayPeriod.get(key)!;
      dMap.set(demandPeriod, Math.max(dMap.get(demandPeriod) ?? 0, reading.kwh));
    }
  }

  const lines: DailyBillLine[] = [];

  for (const [key, { year, month, day }] of dayKeys) {
    const days = daysInMonth(year, month);
    const dayPeak = Math.max(0, ...(Array.from(demandMaxByDayPeriod.get(key)?.values() ?? [0])));

    let energyTotal = 0;
    let energyConsumption = 0;
    const energyPerPeriod: Record<string, number> = {};
    for (const [period, consumption] of energySumByDayPeriod.get(key) ?? []) {
      const { total, perTier } = calculateEnergyForPeriod(consumption, period, data.energyratestructure, days, dayPeak);
      energyTotal += total;
      energyConsumption += consumption;
      energyPerPeriod[`energyCost/period${period}/total`] = total;
      Object.assign(energyPerPeriod, perTier);
    }

    let demandTotal = 0;
    let demandConsumption = 0;
    const demandPerPeriod: Record<string, number> = {};
    if (data.demandratestructure && data.demandrateunit) {
      for (const [period, consumption] of demandMaxByDayPeriod.get(key) ?? []) {
        const { total, perTier } = calculateDemandForPeriod(consumption, period, data.demandratestructure, data.demandrateunit, days);
        demandTotal += total;
        demandConsumption += consumption;
        demandPerPeriod[`demandCost/period${period}/total`] = total;
        Object.assign(demandPerPeriod, perTier);
      }
    }

    lines.push({
      year,
      month,
      day,
      energy: { consumptionTotal: round2(energyConsumption), contributionTotal: round2(energyTotal), perPeriod: roundMap(energyPerPeriod) },
      demand: { consumptionTotal: round2(demandConsumption), contributionTotal: round2(demandTotal), perPeriod: roundMap(demandPerPeriod) },
      total: round2(energyTotal + demandTotal),
    });
  }

  lines.sort((a, b) => a.year - b.year || a.month - b.month || a.day - b.day);
  return lines;
}

export interface CalculateBillParams {
  utility: string;
  sector: string;
  name: string;
  filePath: string;
  responseType?: "monthly" | "daily";
}

export async function calculateBill(params: CalculateBillParams) {
  const { hourly, startDate, endDate, intervalMinutes } = await parseCsvGreenData(params.filePath);

  const rate = await findMatchingRate({
    utility: params.utility,
    sector: params.sector,
    name: params.name,
    greenStart: startDate,
    greenEnd: endDate,
  });

  if (!rate) {
    throw new ApiError(404, "No approved rate found matching this utility/sector/name for the given date range");
  }

  const rateSummary = { id: rate.id, name: rate.name, utility: rate.utility, sector: rate.sector, label: rate.label };
  const greenDataRange = { start: startDate, end: endDate };

  if (params.responseType === "daily") {
    return {
      rate: rateSummary,
      greenDataDurationMinutes: intervalMinutes,
      greenDataRange,
      daily: computeDailyBill(hourly, rate),
    };
  }

  return {
    rate: rateSummary,
    greenDataDurationMinutes: intervalMinutes,
    greenDataRange,
    monthly: computeMonthlyBill(hourly, rate),
  };
}
