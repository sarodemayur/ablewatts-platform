// Ported verbatim from the original PHP engine's
// GreenData_Calculator_Versiontwo::decide_time_difference_metadata().
//
// Given the minute-of-hour the first two readings start on, and the minute
// difference between them, this table says how to normalize the raw
// interval-usage series into fixed-size clock-aligned buckets before it can
// be summed into hourly consumption and matched against a rate schedule.
//
// Tuple = [groupFirstForHour, divideEachReadingBy, minuteDifferenceLeft, rangeConvertedToMinutes]
//   groupFirstForHour        - how many raw sub-readings make up the FIRST
//                              (partial) hour, needed to realign the series
//                              to a clean clock-hour boundary.
//   divideEachReadingBy      - each raw reading is split into this many
//                              equal sub-readings (value / N, repeated N
//                              times) to reach a uniform bucket size.
//   minuteDifferenceLeft     - informational; minutes left over after the
//                              first realignment group (not needed by the
//                              downstream math, kept for parity/debugging).
//   rangeConvertedToMinutes  - the uniform bucket size, in minutes, that the
//                              normalized series ends up in.

export type IntervalCaseData = [number, number, number, number];

type DifferenceTable = Record<number, IntervalCaseData>;

const TABLE: Record<number, DifferenceTable> = {
  5: {
    5: [11, 1, 0, 5],
    10: [11, 2, 5, 5],
    15: [11, 3, 5, 5],
    20: [11, 4, 5, 5],
    30: [11, 6, 5, 5],
    0: [11, 12, 5, 5],
  },
  10: {
    5: [10, 1, 0, 5],
    10: [5, 1, 0, 10],
    15: [10, 3, 10, 5],
    20: [5, 2, 10, 10],
    30: [5, 3, 10, 10],
    0: [5, 6, 10, 10],
  },
  15: {
    5: [9, 1, 0, 5],
    10: [9, 2, 5, 5],
    15: [3, 1, 0, 15],
    20: [9, 4, 15, 5],
    30: [3, 2, 15, 15],
    0: [3, 4, 15, 15],
  },
  20: {
    5: [8, 1, 0, 5],
    10: [4, 1, 0, 10],
    15: [8, 3, 15, 5],
    20: [2, 1, 0, 20],
    30: [4, 3, 20, 10],
    0: [2, 3, 20, 20],
  },
  30: {
    5: [6, 1, 0, 5],
    10: [3, 1, 0, 10],
    15: [2, 1, 0, 15],
    20: [3, 2, 10, 10],
    30: [1, 1, 0, 30],
    0: [1, 2, 30, 30],
  },
  0: {
    5: [12, 1, 0, 5],
    10: [6, 1, 0, 10],
    15: [4, 1, 0, 15],
    20: [3, 1, 0, 20],
    30: [2, 1, 0, 30],
    0: [1, 1, 0, 60],
  },
};

export class UnsupportedIntervalError extends Error {
  constructor(startMinute: number, differenceMinutes: number) {
    super(
      `Unsupported green-data interval: first reading starts at minute ${startMinute}, ` +
        `${differenceMinutes} minutes apart. Supported start minutes are 0/5/10/15/20/30 ` +
        `with differences of 0/5/10/15/20/30 minutes.`
    );
  }
}

export function decideTimeDifferenceMetadata(startMinute: number, differenceMinutes: number): IntervalCaseData {
  const byStart = TABLE[startMinute];
  const result = byStart?.[differenceMinutes];
  if (!result) {
    throw new UnsupportedIntervalError(startMinute, differenceMinutes);
  }
  return result;
}
