import { FlattenedTierStructure } from "../urdb/urdb.types";

function numField(structure: FlattenedTierStructure, key: string): number {
  const v = structure[key];
  if (v === undefined) return 0;
  return typeof v === "number" ? v : Number(v) || 0;
}

function tierCountFor(structure: FlattenedTierStructure, prefix: string, period: number, fieldsPerTier: number): number {
  const re = new RegExp(`^${prefix}\\/period${period}\\/tier`, "i");
  const keys = Object.keys(structure).filter((k) => re.test(k));
  return Math.round(keys.length / fieldsPerTier);
}

export interface TierWalkResult {
  total: number;
  perTier: Record<string, number>;
}

// Shared tier-walking logic used by flat-demand/demand/energy: charge tier0's
// rate up to tier0max, then progressively higher tiers for the remainder,
// where a tier max of 0 means "uncapped / last tier".
function walkTiers(opts: {
  consumption: number;
  multiplier: number;
  structure: FlattenedTierStructure;
  prefix: string;
  period: number;
  fieldsPerTier: number;
  enterLoopOnlyIfTierMaxNonZero: boolean;
  costLabel: string;
  tierMaxScale?: (tier: number, rawMax: number) => number;
}): TierWalkResult {
  const { consumption, multiplier, structure, prefix, period, fieldsPerTier, enterLoopOnlyIfTierMaxNonZero, costLabel } =
    opts;
  const scale = opts.tierMaxScale ?? ((_tier, rawMax) => rawMax);

  const perTier: Record<string, number> = {};
  const tier0MaxRaw = numField(structure, `${prefix}/period${period}/tier0max`);
  const shouldWalk = enterLoopOnlyIfTierMaxNonZero
    ? consumption > tier0MaxRaw && tier0MaxRaw !== 0
    : consumption > tier0MaxRaw;

  if (!shouldWalk) {
    const rate = numField(structure, `${prefix}/period${period}/tier0rate`);
    const adj = numField(structure, `${prefix}/period${period}/tier0adj`);
    const total = consumption * multiplier * (rate + adj);
    perTier[`${costLabel}/period${period}/tier0`] = total;
    return { total, perTier };
  }

  const tierCount = tierCountFor(structure, prefix, period, fieldsPerTier);
  let tierMin = 0;
  let tierMax = tier0MaxRaw;
  let total = 0;

  for (let tier = 0; tier < tierCount; tier++) {
    const rate = numField(structure, `${prefix}/period${period}/tier${tier}rate`);
    if (rate === 0) continue;

    const rawMax = numField(structure, `${prefix}/period${period}/tier${tier}max`);
    const adj = numField(structure, `${prefix}/period${period}/tier${tier}adj`);

    if (rawMax !== 0) {
      if (tier !== 0) tierMin = tierMax;
      tierMax = scale(tier, rawMax);

      let tierConsumption: number;
      let breakTier = false;
      if (consumption > tierMax) {
        tierConsumption = tierMax - tierMin;
      } else {
        tierConsumption = consumption - tierMin;
        breakTier = true;
      }
      const tierTotal = tierConsumption * multiplier * (rate + adj);
      perTier[`${costLabel}/period${period}/tier${tier}`] = tierTotal;
      total += tierTotal;
      if (breakTier) break;
    } else {
      // uncapped / last tier
      if (consumption > tierMax) {
        const tierConsumption = consumption - tierMax;
        const tierTotal = tierConsumption * multiplier * (rate + adj);
        perTier[`${costLabel}/period${period}/tier${tier}`] = tierTotal;
        total += tierTotal;
      }
      break;
    }
  }

  return { total, perTier };
}

const UNIT_MULTIPLIER: Record<string, (daysInMonth: number) => number> = {
  kW: () => 1,
  kVA: () => 1,
  hp: () => 1.341,
  kW_daily: (days) => days,
  kVA_daily: (days) => 1.341 * days,
};

export function flatDemandMultiplier(unit: string | undefined, daysInMonth: number): number {
  if (!unit) return 0;
  return UNIT_MULTIPLIER[unit]?.(daysInMonth) ?? 0;
}

export function calculateFlatDemandForPeriod(
  consumption: number,
  period: number,
  structure: FlattenedTierStructure,
  unit: string | undefined,
  daysInMonth: number
): TierWalkResult {
  return walkTiers({
    consumption,
    multiplier: flatDemandMultiplier(unit, daysInMonth),
    structure,
    prefix: "flatdemandstructure",
    period,
    fieldsPerTier: 3,
    enterLoopOnlyIfTierMaxNonZero: true,
    costLabel: "flatDemandCost",
  });
}

export function calculateDemandForPeriod(
  consumption: number,
  period: number,
  structure: FlattenedTierStructure,
  unit: string | undefined,
  daysInMonth: number
): TierWalkResult {
  return walkTiers({
    consumption,
    multiplier: flatDemandMultiplier(unit, daysInMonth),
    structure,
    prefix: "demandratestructure",
    period,
    fieldsPerTier: 5,
    enterLoopOnlyIfTierMaxNonZero: false,
    costLabel: "demandCost",
    // Original PHP scales each non-tier0 demand tier max by number_of_days,
    // but indexes that lookup without the year dimension (`$number_of_days
    // [$urdb][$month]` instead of `[$year][$urdb][$month]`), which is a
    // latent bug (silently divides/multiplies against an undefined value in
    // PHP's loose typing). We intentionally implement the evidently-intended
    // behavior instead: scale by the correct days-in-month for tiered
    // kW_daily/kVA_daily demand rates.
    tierMaxScale: (_tier, rawMax) => rawMax * daysInMonth,
  });
}

const ENERGY_TIER_MAX: Record<
  string,
  (rawMax: number, daysInMonth: number, monthPeakKw: number) => number
> = {
  kWh: (rawMax) => rawMax,
  kWh_daily: (rawMax, days) => rawMax * days,
  "kWh/kW": (rawMax, _days, peak) => rawMax / peak,
  "kWh/kW_daily": (rawMax, days, peak) => (rawMax * days) / peak,
  "kWh/hp": (rawMax, _days, peak) => rawMax / (peak * 3),
  "kWh/kVA": (rawMax, _days, peak) => rawMax / Math.sqrt(peak ** 2),
};

export function calculateEnergyForPeriod(
  consumption: number,
  period: number,
  structure: FlattenedTierStructure,
  daysInMonth: number,
  monthPeakKw: number
): TierWalkResult {
  // Energy tiers each carry their own unit (unlike flat-demand/demand, which
  // have a single rate-level unit), so tier max must be resolved per tier.
  const resolveTierMax = (tier: number, rawMax: number) => {
    const unit = String(structure[`energyratestructure/period${period}/tier${tier}unit`] ?? "kWh");
    const fn = ENERGY_TIER_MAX[unit];
    return fn ? fn(rawMax, daysInMonth, monthPeakKw) : 0;
  };

  // tier0's unit-based max also needs resolving before the entry check, so
  // we can't reuse walkTiers' raw tier0max directly — pre-scale it here by
  // substituting a structure clone isn't practical, so replicate the entry
  // check inline using the same resolver for tier0.
  const tier0RawMax = numField(structure, `energyratestructure/period${period}/tier0max`);
  const tier0Max = resolveTierMax(0, tier0RawMax);

  if (!(consumption > tier0Max)) {
    const rate = numField(structure, `energyratestructure/period${period}/tier0rate`);
    const adj = numField(structure, `energyratestructure/period${period}/tier0adj`);
    return {
      total: consumption * (rate + adj),
      perTier: { [`energyCost/period${period}/tier0`]: consumption * (rate + adj) },
    };
  }

  const tierCount = tierCountFor(structure, "energyratestructure", period, 5);
  let tierMin = 0;
  let tierMax = tier0Max;
  let total = 0;
  const perTier: Record<string, number> = {};

  for (let tier = 0; tier < tierCount; tier++) {
    const rate = numField(structure, `energyratestructure/period${period}/tier${tier}rate`);
    if (rate === 0) continue;
    const rawMax = numField(structure, `energyratestructure/period${period}/tier${tier}max`);
    const adj = numField(structure, `energyratestructure/period${period}/tier${tier}adj`);

    if (rawMax !== 0) {
      if (tier !== 0) tierMin = tierMax;
      tierMax = resolveTierMax(tier, rawMax);
      let tierConsumption: number;
      let breakTier = false;
      if (consumption > tierMax) {
        tierConsumption = tierMax - tierMin;
      } else {
        tierConsumption = consumption - tierMin;
        breakTier = true;
      }
      const tierTotal = tierConsumption * (rate + adj);
      perTier[`energyCost/period${period}/tier${tier}`] = tierTotal;
      total += tierTotal;
      if (breakTier) break;
    } else {
      if (consumption > tierMax) {
        const tierConsumption = consumption - tierMax;
        const tierTotal = tierConsumption * (rate + adj);
        perTier[`energyCost/period${period}/tier${tier}`] = tierTotal;
        total += tierTotal;
      }
      break;
    }
  }

  return { total, perTier };
}
