import { buildRecord, isValidEndpoint, taipeiDate } from './lib/record.js';

const ENDPOINT_KEY = 'exerciseLog.endpoint.v1';
const QUEUE_KEY = 'exerciseLog.pending.v1';

const form = document.querySelector('#exercise-form');
const durationField = document.querySelector('#duration-field');
const durationInput = document.querySelector('#duration');
const submitButton = document.querySelector('#submit-button');
const endpointInput = document.querySelector('#endpoint');
const saveEndpointButton = document.querySelector('#save-endpoint');
const retryButton = document.querySelector('#retry-button');
const queueStatus = document.querySelector('#queue-status');
const message = document.querySelector('#message');

document.querySelector('#today-label').textContent = `${taipeiDate()}（台北時間）`;
endpointInput.value = localStorage.getItem(ENDPOINT_KEY) ?? '';

function readQueue() {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
    return Array.isArray(queue) ? queue : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  renderQueue();
}

function enqueue(record) {
  const queue = readQueue();
  const withoutSameDay = queue.filter((item) => item.record_id !== record.record_id);
  writeQueue([...withoutSameDay, record]);
}

function setMessage(text, state = '') {
  message.textContent = text;
  message.dataset.state = state;
}

function renderQueue() {
  const count = readQueue().length;
  queueStatus.textContent = count ? `${count} 筆資料等待同步` : '沒有待同步資料';
  retryButton.hidden = count === 0;
}

function setBusy(busy) {
  submitButton.disabled = busy;
  retryButton.disabled = busy;
  saveEndpointButton.disabled = busy;
}

async function flushQueue() {
  const endpoint = localStorage.getItem(ENDPOINT_KEY) ?? '';
  const queue = readQueue();
  if (!queue.length) return true;
  if (!isValidEndpoint(endpoint)) {
    setMessage('紀錄已保存在本機。請先設定有效的 Apps Script /exec 端點。', 'error');
    return false;
  }

  setBusy(true);
  try {
    for (const record of [...queue]) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(record),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.ok !== true) throw new Error(result.error || 'Apps Script 拒絕資料');
      writeQueue(readQueue().filter((item) => item.record_id !== record.record_id));
    }
    setMessage('今日紀錄已同步到 Google Sheets。', 'success');
    return true;
  } catch (error) {
    setMessage(`同步失敗，資料仍保存在本機，可稍後重送。${error.message ? `（${error.message}）` : ''}`, 'error');
    return false;
  } finally {
    setBusy(false);
  }
}

form.addEventListener('change', (event) => {
  if (event.target.name !== 'activity') return;
  const needsDuration = event.target.value !== 'rest';
  durationField.hidden = !needsDuration;
  durationInput.required = needsDuration;
  if (!needsDuration) durationInput.value = '';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const activityType = new FormData(form).get('activity');
  try {
    const record = buildRecord({ activityType, durationInput: durationInput.value });
    enqueue(record);
    setMessage('紀錄已先安全保存在本機，正在同步…');
    await flushQueue();
  } catch (error) {
    setMessage(error.message, 'error');
  }
});

saveEndpointButton.addEventListener('click', async () => {
  const endpoint = endpointInput.value.trim();
  if (!isValidEndpoint(endpoint)) {
    setMessage('請輸入以 https://script.google.com 開頭、/exec 結尾的 Web App URL。', 'error');
    return;
  }
  localStorage.setItem(ENDPOINT_KEY, endpoint);
  setMessage('同步端點已保存在這台裝置。', 'success');
  await flushQueue();
});

retryButton.addEventListener('click', flushQueue);
window.addEventListener('online', flushQueue);
renderQueue();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}
