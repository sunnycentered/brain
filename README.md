# Public Insta (example)

This repository is a starter project that demonstrates how to build a local application to:

- Collect public Instagram activity using the official APIs (requires proper OAuth and tokens).
- Use a local LLM (ollama CLI) to help expand keywords and generate content prompts.
- Persist activity, keywords, plans and reports to a local SQLite database.
- Serve a React Single Page Application to inspect activity, keywords, plans and reports.

Important: This code is an example and does not ship with Instagram credentials or an OAuth-approved app. You must follow Instagram's Platform Policy and the Facebook Developer documentation when creating an app, requesting permissions, and storing tokens.

Quick start
-----------

1. Install prerequisites on your machine (Windows WSL recommended for the following commands):

- Node.js (>=18)
- npm
- Ollama (https://ollama.ai) and at least one local model (configure `OLLAMA_MODEL` in `.env`)

2. Copy server env:

```bash
cd C:\Users\sunce\WebStormProjects\public-insta\server
cp .env.example .env
# Edit .env and add your IG app id/secret or set IG_USER_ACCESS_TOKEN for development
```

3. Install dependencies:

```bash
# from project root (WSL)
npm install
npm --prefix server install
npm --prefix client install
```

4. Start dev servers (two terminals or use the root `npm run dev` which uses concurrently):

```bash
# start backend
npm --prefix ./server run dev
# start frontend
npm --prefix ./client run dev
```

5. Open browser to the Vite dev URL (usually http://localhost:5173). The backend defaults to port 4000.

Usage notes and security
------------------------
- Do not commit real credentials. Use environment variables or a secrets manager.
- The example uses the Instagram Basic Display / Graph API endpoints. For production, you must configure an Instagram Business account and appropriate app permissions.
- Ollama calls are performed locally via the `ollama` CLI. Ensure you run an authorized model locally.
- This project persists data to SQLite in `server/data/public_insta.db`.

Next steps you might take
-------------------------
- Implement robust OAuth with token refresh and secure storage.
- Add scheduled sync jobs (CRON) to fetch activity periodically.
- Use more advanced analytics (engagement, growth curves) and better UI visualizations.
- Add tests and CI config.

License
-------
This is example code provided for educational purposes.

