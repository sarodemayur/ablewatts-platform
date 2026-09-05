import { createReadStream } from "fs";
import readline from "readline";
import { decideTimeDifferenceMetadata } from "./intervalTable";

export interface HourlyReading {
  timestamp: Date; // UTC, truncated to the top of the hour
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  isWeekend: boolean;
  kwh: number;
}

interface RawRow {
  timestamp: Date;
  value: number;
}

// Parses "DD-MM-YYYY" or "DD-MM-YYYY HH:mm" as a naive UTC timestamp, matching
// the original app forcing PHP_TIMEZONE=UTC for CSV green-data files.
function parseRowDate(raw: string): Date {
  const match = raw.trim().match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!match) {
    throw new Error(`Unrecognized green-data date format: "${raw}"`);
  }
  const [, dd, mm, yyyy, hh, min] = match;
  return new Date(
    Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), hh ? Number(hh) : 0, min ? Number(min) : 0)
  );
}

async function readCsvRows(filePath: string): Promise<RawRow[]> {
  const rows: RawRow[] = [];
  const rl = readline.createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [dateStr, valueStr] = trimmed.split(",");
    if (dateStr === undefined || valueStr === undefined) continue;
    rows.push({ timestamp: parseRowDate(dateStr), value: Number(valueStr) });
  }
  if (rows.length < 2) {
    throw new Error("Green-data file must contain at least two readings to detect its interval");
  }
  return rows;
}

function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

export async function parseCsvGreenData(filePath: string): Promise<{
  hourly: HourlyReading[];
  startDate: Date;
  endDate: Date;
  intervalMinutes: number;
}> {
  const rows = await readCsvRows(filePath);

  const startMinute = rows[0].timestamp.getUTCMinutes();
  const rawDiff = minutesBetween(rows[0].timestamp, rows[1].timestamp);
  const differenceMinutes = ((rawDiff % 60) + 60) % 60;

  const [groupFirstForHour, divideBy, , rangeConvertedTo] = decideTimeDifferenceMetadata(
    startMinute,
    differenceMinutes
  );

  // Expand each raw reading into `divideBy` equal sub-readings so the whole
  // series is in uniform `rangeConvertedTo`-minute buckets.
  const normalized: number[] = [];
  for (const row of rows) {
    const share = row.value / divideBy;
    for (let i = 0; i < divideBy; i++) normalized.push(share);
  }

  const bucketsPerHour = 60 / rangeConvertedTo;

  const firstHour = new Date(
    Date.UTC(
      rows[0].timestamp.getUTCFullYear(),
      rows[0].timestamp.getUTCMonth(),
      rows[0].timestamp.getUTCDate(),
      rows[0].timestamp.getUTCHours()
    )
  );

  const hourly: HourlyReading[] = [];
  let cursor = 0;
  let hourIndex = 0;
  let groupSize = groupFirstForHour;

  while (cursor < normalized.length) {
    const slice = normalized.slice(cursor, cursor + groupSize);
    if (slice.length === 0) break;
    const sum = slice.reduce((a, b) => a + b, 0);

    const ts = new Date(firstHour.getTime() + hourIndex * 60 * 60 * 1000);
    const dayOfWeek = ts.getUTCDay(); // 0 = Sunday, 6 = Saturday

    hourly.push({
      timestamp: ts,
      year: ts.getUTCFullYear(),
      month: ts.getUTCMonth() + 1,
      day: ts.getUTCDate(),
      hour: ts.getUTCHours(),
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      kwh: sum,
    });

    cursor += groupSize;
    hourIndex += 1;
    groupSize = bucketsPerHour;
  }

  return {
    hourly,
    startDate: rows[0].timestamp,
    endDate: rows[rows.length - 1].timestamp,
    intervalMinutes: rangeConvertedTo,
  };
}
