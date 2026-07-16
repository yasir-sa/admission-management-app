const parseTimePart = (str) => {
  const match = str.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return null;
  return {
    hour: parseInt(match[1], 10),
    minute: match[2] ? parseInt(match[2], 10) : 0,
    ampm: match[3] ? match[3].toUpperCase() : null,
  };
};

const parseTimeRange = (timing) => {
  if (!timing) return null;
  const parts = timing.split("-").map((s) => s.trim());
  if (parts.length !== 2) return null;

  const start = parseTimePart(parts[0]);
  const end = parseTimePart(parts[1]);
  if (!start || !end) return null;

  if (!start.ampm && end.ampm) start.ampm = end.ampm;
  if (!end.ampm && start.ampm) end.ampm = start.ampm;

  const to24 = (t) => {
    let h = t.hour;
    if (t.ampm === "PM" && h !== 12) h += 12;
    if (t.ampm === "AM" && h === 12) h = 0;
    return h * 60 + t.minute;
  };

  return { startMinutes: to24(start), endMinutes: to24(end) };
};

const rangesOverlap = (a, b) =>
  a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;

module.exports = { parseTimeRange, rangesOverlap };
