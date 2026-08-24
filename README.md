# 今日運動紀錄（Exercise Training Log）

正式網站：https://bigsticktw.github.io/exercise-training-log/

一個無框架、可離線開啟的靜態 PWA，用來記錄「今天」的運動狀態。三個選項互斥：

1. `strength`：力量訓練，必填 1–1440 分鐘的整數。
2. `cardio`：有氧訓練，必填 1–1440 分鐘的整數。
3. `rest`：今日無活動，時長固定為空值。

日期一律以 `Asia/Taipei` 計算。前端不收集姓名、帳號、位置等個資，也不硬編碼 Sheet ID 或任何密鑰。

## 手機安裝

- Android Chrome：開啟正式網站，從瀏覽器選單選擇「加到主畫面」或「安裝應用程式」。
- iPhone Safari：開啟正式網站，點分享按鈕，再選擇「加入主畫面」。

## 架構

- `index.html`、`styles.css`、`app.js`：靜態前端與同步介面。
- `lib/record.js`：日期、欄位驗證與 payload 組裝，可由 Node 直接測試。
- `sw.js`、`manifest.webmanifest`：離線快取與 PWA 安裝資訊。
- `apps-script/Code.gs`：Google Apps Script Web App，驗證並新增或更新 Sheet 列。
- `tests/record.test.js`：時區、時長、payload 與端點驗證測試。

送出時資料會先存進瀏覽器 `localStorage` 待送佇列，再呼叫 Apps Script。網路或伺服器失敗時資料保留，可按「重新傳送」；恢復連線時也會自動重試。同一天的待送資料會合併成最新一筆。伺服器以固定的 `record_id` 更新同一天資料，因此重送不會重複新增列。

## 固定資料 schema（v1）

Sheet 第一列必須完全符合下列欄位順序；若工作表為空，Apps Script 會自動建立標題列。

| 欄位 | 型別 | 範例 | 說明 |
|---|---|---|---|
| `schema_version` | integer | `1` | 固定 schema 版本 |
| `record_id` | string | `exercise-2026-08-24` | 每個台北日期的固定識別碼，也是更新鍵 |
| `record_date` | `YYYY-MM-DD` | `2026-08-24` | 台北日期 |
| `activity_type` | enum | `strength` | `strength`、`cardio` 或 `rest` |
| `duration_minutes` | integer / blank | `45` | 訓練為 1–1440；無活動為空白 |
| `timezone` | string | `Asia/Taipei` | 固定值 |
| `client_recorded_at` | ISO 8601 string | `2026-08-24T01:02:03.000Z` | 裝置送出時間（UTC） |
| `server_received_at` | ISO 8601 string | `2026-08-24T01:02:04.000Z` | Apps Script 寫入時間（UTC） |

## Google Sheets / Apps Script 人工部署

1. 自行建立一份 Google Sheet。這個專案不會替你建立或存取真實 Sheet。
2. 在 Sheet URL 中取得試算表 ID：`https://docs.google.com/spreadsheets/d/<這一段是 ID>/edit`。
3. 到 [script.google.com](https://script.google.com/) 建立獨立 Apps Script 專案。
4. 將 `apps-script/Code.gs` 貼入 `Code.gs`，並把 `apps-script/appsscript.json` 內容放入專案資訊清單（需在設定開啟顯示資訊清單）。
5. 到「專案設定 → 指令碼屬性」新增：
   - `SPREADSHEET_ID`：第 2 步取得的 ID。
   - `SHEET_NAME`：選填；預設為 `exercise_training_log`。
   - `API_TOKEN`：自行產生至少 24 個字元的隨機私人 Token。
6. 「部署 → 新增部署作業 → 網頁應用程式」：執行身分選「我」，存取權限依你的實際託管方式選擇。若前端公開託管且要直接跨網域送出，必須允許 Web App 接受該使用者範圍的請求。
7. 完成授權，複製以 `/exec` 結尾的 Web App URL。不要使用測試部署的 `/dev` URL。
8. 開啟本 App 的「同步設定」，貼上 URL 與相同的 `API_TOKEN` 後儲存。設定只存在該裝置的瀏覽器。

注意：前端網站與 Web App URL 仍是公開的，但 Apps Script 只接受帶有正確 `API_TOKEN` 的寫入。Token 不會提交到 GitHub，請勿分享或截圖；每支要使用的手機需手動設定一次。

## 本機執行與驗證

需要 Node.js 18+ 與任一靜態 HTTP server。PWA/service worker 不能用 `file://` 完整測試。

```powershell
cd C:\Users\bigst\Desktop\project\exercise-training-log
npm test
npm run serve
```

瀏覽 `http://localhost:4173`。建議手動確認：

- 未選活動時不能產生紀錄。
- 力量與有氧缺少有效時長時顯示錯誤。
- 無活動會隱藏時長且送出 `null`。
- 未設定私人端點／Token 或離線時，紀錄留在待同步佇列。
- 設定有效 `/exec` URL 後可重送，成功時待同步筆數歸零。
- 同一天修改選項後，Sheet 只更新同一 `record_id` 的列。

## 靜態託管

可將整個資料夾部署到 GitHub Pages、Cloudflare Pages 等純靜態主機；不需要 build。請使用 HTTPS，確保 service worker 與 Apps Script 請求可正常運作。部署後若更新資產，請同步調整 `sw.js` 的 `CACHE_NAME`，讓舊快取失效。
