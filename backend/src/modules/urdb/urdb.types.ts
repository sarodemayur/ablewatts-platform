// Mirrors the NREL Utility Rate Database (URDB) JSON schema fields the
// original PHP calculation engine reads. Kept as a loose/sparse shape
// (fields are optional) because real-world tariffs only populate the
// charge types that actually apply to them.

// Flattened tier keys, e.g. "energyratestructure/period0/tier0max".
// tier0max === 0 means "uncapped" (the last/only tier).
export type FlattenedTierStructure = Record<string, number | string>;

// [month(0-11)][hour(0-23)] => period index referenced by the matching
// tier structure above (e.g. energyratestructure/period<N>/...).
export type ScheduleMatrix = number[][];

export interface UrdbRateData {
  flatdemandunit?: string;
  flatdemandstructure?: FlattenedTierStructure;
  // Keyed "flatdemandmonth01".."flatdemandmonth12" -> period index for that month.
  flatdemandmonths?: Record<string, number>;

  demandrateunit?: string;
  demandratestructure?: FlattenedTierStructure;
  demandweekdayschedule?: ScheduleMatrix;
  demandweekendschedule?: ScheduleMatrix;
  // Keyed "01".."12" -> ratchet percentage for that month. Not applied by the
  // calculation engine yet (matches the original's incomplete wiring); kept
  // for data completeness/round-tripping.
  demandratchetpercentage?: Record<string, number>;
  demandcomments?: string;

  coincidentrateunit?: string;
  coincidentratestructure?: FlattenedTierStructure;
  coincidentrateschedule?: ScheduleMatrix;

  energyratestructure: FlattenedTierStructure;
  energyweekdayschedule: ScheduleMatrix;
  energyweekendschedule: ScheduleMatrix;
  // Keyed "01".."12" -> $/kWh fuel adjustment for that month. Not applied by
  // the calculation engine yet; kept for data completeness/round-tripping.
  energyfueladjustments?: Record<string, number>;
  energycomments?: string;

  // Free-form custom attributes from the "Other Attributes" tab — not read by
  // the calculation engine, kept for parity with the original's
  // demandattrs/energyattrs/fixedattrs fields.
  demandattrs?: { attribute: string; value: string }[];
  energyattrs?: { attribute: string; value: string }[];
  fixedattrs?: { attribute: string; value: string }[];
}

export const EMPTY_SCHEDULE_12X24: ScheduleMatrix = Array.from({ length: 12 }, () =>
  Array.from({ length: 24 }, () => 0)
);
