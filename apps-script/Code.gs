const SCHEMA_VERSION = 1;
const DEFAULT_SHEET_NAME = 'exercise_training_log';
const HEADERS = [
  'schema_version',
  'record_id',
  'record_date',
  'activity_type',
  'duration_minutes',
  'timezone',
  'client_recorded_at',
  'server_received_at',
];

function doGet() {
  return jsonOutput_({ ok: true, service: 'exercise-training-log', schema_version: SCHEMA_VERSION });
}

function doPost(e) {
  let lock;
  try {
    const request = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    validateToken_(request.token);
    const record = validateRecord_(request.payload || {});
    lock = LockService.getScriptLock();
    lock.waitLock(10000);
    const sheet = getSheet_();
    ensureHeader_(sheet);
    const row = [
      record.schema_version,
      record.record_id,
      record.record_date,
      record.activity_type,
      record.duration_minutes === null ? '' : record.duration_minutes,
      record.timezone,
      record.client_recorded_at,
      new Date().toISOString(),
    ];
    const existingRow = findRecordRow_(sheet, record.record_id);
    if (existingRow) {
      sheet.getRange(existingRow, 1, 1, HEADERS.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
    SpreadsheetApp.flush();
    return jsonOutput_({ ok: true, action: existingRow ? 'updated' : 'created', record_id: record.record_id });
  } catch (error) {
    return jsonOutput_({ ok: false, error: String(error.message || error) });
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function validateToken_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  if (!expected || !token || token !== expected) throw new Error('Unauthorized');
}

function getSheet_() {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  const sheetName = properties.getProperty('SHEET_NAME') || DEFAULT_SHEET_NAME;
  if (!spreadsheetId) throw new Error('Missing Script Property: SPREADSHEET_ID');
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  return spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }
  const current = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (JSON.stringify(current) !== JSON.stringify(HEADERS)) {
    throw new Error('Sheet header does not match schema v1');
  }
}

function findRecordRow_(sheet, recordId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const match = sheet.getRange(2, 2, lastRow - 1, 1)
    .createTextFinder(recordId)
    .matchEntireCell(true)
    .findNext();
  return match ? match.getRow() : null;
}

function validateRecord_(payload) {
  const allowedTypes = ['strength', 'cardio', 'rest'];
  if (payload.schema_version !== SCHEMA_VERSION) throw new Error('Unsupported schema_version');
  if (!/^exercise-\d{4}-\d{2}-\d{2}$/.test(payload.record_id || '')) throw new Error('Invalid record_id');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.record_date || '')) throw new Error('Invalid record_date');
  if (payload.record_id !== 'exercise-' + payload.record_date) throw new Error('record_id and record_date mismatch');
  if (!allowedTypes.includes(payload.activity_type)) throw new Error('Invalid activity_type');
  if (payload.timezone !== 'Asia/Taipei') throw new Error('Invalid timezone');
  if (isNaN(Date.parse(payload.client_recorded_at))) throw new Error('Invalid client_recorded_at');

  if (payload.activity_type === 'rest') {
    if (payload.duration_minutes !== null) throw new Error('Rest must have null duration_minutes');
  } else if (!Number.isInteger(payload.duration_minutes) || payload.duration_minutes < 1 || payload.duration_minutes > 1440) {
    throw new Error('duration_minutes must be an integer from 1 to 1440');
  }
  return payload;
}

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
