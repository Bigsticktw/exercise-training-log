export const TIME_ZONE = 'Asia/Taipei';
export const SCHEMA_VERSION = 1;
export const ACTIVITY_TYPES = Object.freeze(['strength', 'cardio', 'rest']);

export function taipeiDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function validateEntry(activityType, durationInput) {
  if (!ACTIVITY_TYPES.includes(activityType)) {
    return { valid: false, error: '請選擇今天的活動類型。' };
  }
  if (activityType === 'rest') {
    return { valid: true, durationMinutes: null };
  }
  const durationMinutes = Number(durationInput);
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) {
    return { valid: false, error: '訓練時長必須是 1–1440 分鐘的整數。' };
  }
  return { valid: true, durationMinutes };
}

export function buildRecord({ activityType, durationInput, now = new Date() }) {
  const validation = validateEntry(activityType, durationInput);
  if (!validation.valid) throw new Error(validation.error);
  const recordDate = taipeiDate(now);
  return {
    schema_version: SCHEMA_VERSION,
    record_id: `exercise-${recordDate}`,
    record_date: recordDate,
    activity_type: activityType,
    duration_minutes: validation.durationMinutes,
    timezone: TIME_ZONE,
    client_recorded_at: now.toISOString(),
  };
}

export function isValidEndpoint(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'script.google.com' && url.pathname.endsWith('/exec');
  } catch {
    return false;
  }
}
