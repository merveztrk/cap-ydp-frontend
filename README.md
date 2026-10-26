# ÇAP / YDP frontend

## Local run

The frontend and backend are separate repositories and run in separate terminals. The frontend proxies `/api` requests to the backend at `http://localhost:5021` by default, so keep the existing backend checkout running.

In the first PowerShell window, start the existing backend:

```powershell
cd C:\Users\PC\Projeler\cap_ydp_otomasyonu\backend
$env:COORDINATOR_SETUP_KEY = [guid]::NewGuid().ToString('N')
dotnet run --launch-profile http
```

The backend must already have its PostgreSQL connection string configured in .NET User Secrets, as described in `backend/README.md` in the backend repository. On startup, the backend applies pending database migrations.

In a second PowerShell window, start this frontend checkout:

```powershell
cd C:\Users\PC\Projeler\cap-ydp-frontend
npm run dev
```

Open `http://localhost:3000`. Sign-in, setup, and academic API requests go through the frontend proxy to the backend; no frontend API endpoint changes are needed for local development.

## UI demo without the backend

To preview the coordinator, student, and department-chair screens without PostgreSQL or the backend, start only the frontend with `npm run dev` and select a role under **Backend olmadan arayüzü inceleyin** on the sign-in page. Each menu option opens its own screen, with messaging separate from course registration. This demo is available only in development, uses synthetic sample data, and does not send demo actions to the API or save changes. It does not change the normal sign-in flow or backend configuration.

Student documents are stored in a private Supabase Storage bucket and linked to the student's archive record. Students can upload PDFs up to 25 MB; the backend rejects uploads unless ClamAV scanning succeeds. Coordinators can review documents and request replacements; department chairs can view and download them read-only. The document features require the backend storage and scanner settings described in the backend repository's `README.md`; do not upload real documents until those services are configured and verified.

## Vercel

Set the server-side environment variable `BACKEND_API_URL` to the deployed Render API origin, for example `https://cap-ydp-backend.onrender.com`, then redeploy. Do not use a `NEXT_PUBLIC_*` variable for the backend URL; the same-origin proxy is needed for secure authentication cookies.

Use only synthetic test accounts and data.
