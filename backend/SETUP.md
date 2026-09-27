# Switching on the family leaderboard (about 5 minutes)

The game works without this; scores just stay on each phone. Once it's on, every player's
Daily Ronnie, Night Bus and furthest level go into one Google Sheet in your Drive, and the game
shows the family top 10.

1. In Google Drive, make a new **Google Sheet** called `Ronnie's Manor scores`.
2. In the sheet: **Extensions → Apps Script**.
3. Delete what's there, paste in everything from `backend/Code.gs`, and click **Save**.
4. Click **Deploy → New deployment**. Click the cog next to "Select type" and pick **Web app**.
   - Description: `Ronnie's Manor`
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy**, then **Authorise access** and allow it (Google warns because it's your own
   unverified script: **Advanced → Go to Ronnie's Manor (unsafe)** is fine, it's your code).
6. Copy the **Web app URL** (it ends in `/exec`).
7. Paste it into `js/config.js` as `leaderboardUrl`, then commit and push. Give Claude the URL and
   it will do this bit for you.

To check it: open the URL with `?code=MANOR&board=furthest` on the end. You should see
`{"ok":true,"rows":[]}`.

**Good to know**
- The family code (`MANOR`) is in the public code, so it only keeps out casual strangers. If silly
  scores ever appear, delete those rows in the sheet, or change the code in both `Code.gs` and
  `js/config.js`.
- If you change `Code.gs` later: **Deploy → Manage deployments → Edit → Version: New version →
  Deploy**. The URL stays the same.
