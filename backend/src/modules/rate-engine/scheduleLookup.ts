import { ScheduleMatrix } from "../urdb/urdb.types";
import { HourlyReading } from "./greenDataParser";

// schedule[month-1][hour] -> period index, matching the original URDB
// weekday/weekend schedule matrices (12 months x 24 hours).
export function periodFor(reading: HourlyReading, weekday: ScheduleMatrix, weekend: ScheduleMatrix): number {
  const matrix = reading.isWeekend ? weekend : weekday;
  const monthRow = matrix[reading.month - 1] ?? [];
  return monthRow[reading.hour] ?? 0;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
