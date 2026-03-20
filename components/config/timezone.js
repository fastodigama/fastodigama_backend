const APP_TIMEZONE = "America/Toronto";

const formatterCache = new Map();

function getFormatter(timeZone) {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(
      timeZone,
      new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }),
    );
  }

  return formatterCache.get(timeZone);
}

export function getAppTimeZone() {
  return APP_TIMEZONE;
}

function getTimeZoneParts(date, timeZone = getAppTimeZone()) {
  const parts = getFormatter(timeZone).formatToParts(date);
  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = Number(part.value);
    }
  }

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function getTimeZoneOffsetMs(date, timeZone = getAppTimeZone()) {
  const parts = getTimeZoneParts(date, timeZone);
  const utcTimestamp = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    0,
  );

  return utcTimestamp - date.getTime();
}

function zonedDateTimeToUtc(dateParts, timeZone = getAppTimeZone()) {
  const {
    year,
    month,
    day,
    hour = 0,
    minute = 0,
    second = 0,
    millisecond = 0,
  } = dateParts;

  const utcGuess = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    millisecond,
  );

  const firstOffset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  let utcTimestamp = utcGuess - firstOffset;

  const secondOffset = getTimeZoneOffsetMs(new Date(utcTimestamp), timeZone);
  if (secondOffset !== firstOffset) {
    utcTimestamp = utcGuess - secondOffset;
  }

  return new Date(utcTimestamp);
}

function normalizeDateParts(dateInput, timeZone = getAppTimeZone()) {
  if (typeof dateInput === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput);
    if (!match) {
      throw new Error(`Invalid date format: ${dateInput}`);
    }

    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    };
  }

  const parts = getTimeZoneParts(new Date(dateInput), timeZone);
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
  };
}

export function getCurrentDateInTimeZone(timeZone = getAppTimeZone()) {
  const { year, month, day } = getTimeZoneParts(new Date(), timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function shiftDateString(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getUtcRangeForDateInTimeZone(
  dateInput,
  timeZone = getAppTimeZone(),
) {
  const { year, month, day } = normalizeDateParts(dateInput, timeZone);
  const start = zonedDateTimeToUtc({ year, month, day }, timeZone);

  const nextDate = new Date(Date.UTC(year, month - 1, day));
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const end = zonedDateTimeToUtc(
    {
      year: nextDate.getUTCFullYear(),
      month: nextDate.getUTCMonth() + 1,
      day: nextDate.getUTCDate(),
    },
    timeZone,
  );

  return { start, end };
}

export { APP_TIMEZONE };
