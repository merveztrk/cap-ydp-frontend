# ÇAP / YDP frontend

## Local run

Start the backend first in a separate PowerShell window:

```powershell
cd C:\Users\PC\Projeler\cap_ydp_otomasyonu\backend
$env:COORDINATOR_SETUP_KEY = [guid]::NewGuid().ToString('N')
dotnet run --launch-profile http
```

Then run the frontend:

```powershell
cd C:\Users\PC\Projeler\cap_ydp_otomasyonu\frontend
npm run dev
```

Open `http://localhost:3000`. The Next.js server proxies `/api` requests to `http://localhost:5021` by default. Configure the backend's Supabase connection and first coordinator as documented in `../backend/README.md`.

## Vercel

Set the server-side environment variable `BACKEND_API_URL` to the deployed Render API origin, for example `https://cap-ydp-backend.onrender.com`, then redeploy. Do not use a `NEXT_PUBLIC_*` variable for the backend URL; the same-origin proxy is needed for secure authentication cookies.

Use only synthetic test accounts and data.
