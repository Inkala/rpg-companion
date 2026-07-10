# Railway Deployment Checklist for Hunin Public Accounts

This checklist is for the first public Hunin backend deployment on Railway.

Use it alongside `docs/deployment.md`. It assumes:

- Frontend: `https://hunin.marceramirez.com`
- Backend target: `https://api.hunin.marceramirez.com`
- Database: Railway PostgreSQL
- Backend code root: `backend`
- Migrations: manual with `golang-migrate`

Do not paste production secrets into GitHub issues, chat, screenshots, or committed files.

## 1. Before You Start

Where: local terminal and browser.

1. Confirm the latest code is on `main`.
2. Confirm you can access:
   - Railway dashboard.
   - GitHub repository.
   - Cloudflare or DNS dashboard for `marceramirez.com`.
   - Frontend hosting dashboard for `hunin.marceramirez.com`.
3. Confirm the local repository has the migrations folder:

```text
backend/migrations
```

4. Confirm `golang-migrate` is available locally:

```sh
migrate -version
```

If it is not installed, stop and install it outside this checklist before running production
migrations.

## 2. Create The Railway Project

Where: Railway dashboard.

1. Open Railway.
2. Create a new project.
3. Name it something clear, for example:

```text
hunin-production
```

4. Keep the project small: one backend service and one PostgreSQL service.

## 3. Add Railway PostgreSQL

Where: Railway dashboard.

1. In the Hunin project, add a new service.
2. Choose PostgreSQL from Railway's templates or database options.
3. Wait until the PostgreSQL service is running.
4. Open the PostgreSQL service variables.
5. Find the database connection variable Railway provides, usually named:

```text
DATABASE_URL
```

Do not copy this value into the repository.

## 4. Add The Backend Service From GitHub

Where: Railway dashboard.

1. Add a new service.
2. Choose deploy from GitHub repository.
3. Select the Hunin repository.
4. Select branch:

```text
main
```

5. Set the service name to something clear, for example:

```text
hunin-backend
```

## 5. Configure The Backend Root Directory

Where: Railway dashboard, backend service settings.

Set the root directory to:

```text
backend
```

Why: the Go module is inside `backend/go.mod`, so Railway should build and start commands from the
`backend` folder.

## 6. Configure Build And Start Commands

Where: Railway dashboard, backend service settings.

Build command:

```sh
go build -o hunin-backend ./cmd/server
```

Start command:

```sh
./hunin-backend
```

No Dockerfile is required for this first deployment.

## 7. Configure Backend Environment Variables

Where: Railway dashboard, backend service variables.

Add:

```sh
APP_ENV=production
ALLOWED_ORIGINS=https://hunin.marceramirez.com
DATABASE_URL=<reference Railway PostgreSQL DATABASE_URL>
```

Recommended Railway approach:

1. Add `APP_ENV` as a normal variable.
2. Add `ALLOWED_ORIGINS` as a normal variable.
3. Add `DATABASE_URL` by referencing the PostgreSQL service variable instead of pasting the raw
   secret if Railway offers that option.

Do not set `VITE_API_BASE_URL` on the backend service. That is a frontend build variable.

## 8. Confirm PORT Handling

Where: Railway dashboard and backend code behavior.

The Hunin backend already reads `PORT` from the environment. If `PORT` is missing, it falls back to
`8080`.

Railway normally provides a `PORT` value for public web services. The backend should use it
automatically.

Expected behavior:

```text
Railway sets PORT -> Hunin reads PORT -> backend listens on that port
```

If Railway does not inject `PORT`, set this backend variable manually:

```sh
PORT=8080
```

Then make sure Railway public networking targets the same port.

## 9. Deploy The Backend Once

Where: Railway dashboard.

1. Trigger the first backend deployment.
2. Open the deployment logs.
3. Confirm the service builds.
4. Confirm the service starts.
5. Look for a log line like:

```text
starting hunin backend on :<port> in production mode
```

If the deploy fails before database migrations are run, that is acceptable only if the error is from
missing database tables. Fix environment variables first, then run migrations.

## 10. Enable Public Networking

Where: Railway dashboard, backend service settings.

1. Open backend service settings.
2. Find Networking or Public Networking.
3. Generate a Railway-provided domain first.
4. Visit the generated Railway URL:

```text
https://<railway-generated-domain>/healthz
```

Expected response:

```json
{"status":"ok","service":"hunin-backend"}
```

If this does not work, do not continue to the custom domain yet.

## 11. Add The Custom Backend Domain

Where: Railway dashboard.

1. Open backend service settings.
2. Open Public Networking or Domains.
3. Add custom domain:

```text
api.hunin.marceramirez.com
```

4. Railway should show DNS records to create. For a subdomain, expect at least:
   - a `CNAME` record
   - possibly a `TXT` verification record

Keep that Railway screen open while you configure DNS.

## 12. Configure DNS

Where: Cloudflare or DNS dashboard.

1. Open the DNS settings for `marceramirez.com`.
2. Add the records Railway gives you.
3. For the `api` subdomain, use Railway's exact target value.
4. If Cloudflare is used, start with DNS-only mode while verifying the Railway custom domain. This
   avoids proxy or certificate confusion during the first setup.
5. Save the DNS records.
6. Return to Railway and wait for verification.

Do not invite testers until this URL works:

```text
https://api.hunin.marceramirez.com/healthz
```

## 13. Run Manual Migrations

Where: local terminal.

Goal: run production migrations once against the Railway PostgreSQL database.

Use one of these approaches:

1. Preferred beginner path: copy the Railway PostgreSQL public connection URL from the Railway
   dashboard only into your local terminal session.
2. If the backend uses a private Railway connection string, use Railway's public TCP proxy or public
   database connection details for this migration step.

From the repository root:

```sh
export DATABASE_URL='<railway-postgres-public-url>'
migrate -path backend/migrations -database "$DATABASE_URL" up
```

Important:

- Run `up`, not `down`.
- Do not commit the `DATABASE_URL`.
- Do not paste the `DATABASE_URL` into notes.
- Do not run migrations twice unless you understand the current migration version.

After migrations finish, redeploy or restart the backend if the first deployment failed because
tables did not exist.

## 14. Configure The Frontend API URL

Where: frontend hosting dashboard.

Set the frontend build environment variable:

```sh
VITE_API_BASE_URL=https://api.hunin.marceramirez.com
```

Then redeploy the frontend.

This value must be present at frontend build time. Changing it in the dashboard usually requires a
new frontend deployment.

## 15. Public Smoke Test

Where: browser and optional local terminal.

API health:

```sh
curl https://api.hunin.marceramirez.com/healthz
```

Expected:

```json
{"status":"ok","service":"hunin-backend"}
```

Browser test at:

```text
https://hunin.marceramirez.com
```

Run:

1. Open the public frontend.
2. Confirm the Mara guest demo still works without an account.
3. Open account signup.
4. Signup with a test username, email, and compliant password.
5. Confirm the app shows the signed-in state.
6. Logout.
7. Login with the same username.
8. Confirm the current session loads after refresh.
9. Logout again.
10. Login with the same email.
11. Start Help me choose.
12. Choose a generated Fighter path.
13. Save the character while signed in.
14. Confirm the character appears in My characters.
15. Open the saved Character Reference.

Optional API checks:

```sh
curl -i https://api.hunin.marceramirez.com/auth/session
curl -i https://api.hunin.marceramirez.com/characters
```

Without a valid cookie, both protected account/character checks should return `401`.

## 16. Rollback And Failure Notes

If backend deploy fails:

1. Check Railway deployment logs.
2. Confirm `DATABASE_URL` exists.
3. Confirm `APP_ENV=production`.
4. Confirm the build command runs from `backend`.
5. Confirm the start command is `./hunin-backend`.
6. Confirm the backend listens on the Railway `PORT`.

If `/healthz` fails on the Railway domain:

1. Do not configure the custom domain yet.
2. Check service logs.
3. Check public networking target port.
4. Check that the service is running, not crashed.

If the custom domain fails:

1. Keep using the Railway-generated domain only for diagnosis.
2. Check Cloudflare or DNS records.
3. Confirm `CNAME` and `TXT` records exactly match Railway's instructions.
4. Keep Cloudflare DNS-only during first verification.
5. Wait for DNS propagation and retry Railway verification.

If signup/login fails after the frontend redeploy:

1. Confirm frontend was rebuilt with:

```sh
VITE_API_BASE_URL=https://api.hunin.marceramirez.com
```

2. Confirm backend has:

```sh
ALLOWED_ORIGINS=https://hunin.marceramirez.com
APP_ENV=production
```

3. In browser devtools, check whether requests go to `api.hunin.marceramirez.com`.
4. Check whether the `hunin_session` cookie is set for the backend host.

If the frontend needs to be rolled back:

1. Remove or unset `VITE_API_BASE_URL`.
2. Redeploy the frontend.
3. The public frontend should return to the account-unavailable demo state.

If backend code needs to be rolled back:

1. Use Railway's previous deployment rollback if available.
2. Do not run down migrations in production without a backup and a specific rollback plan.
3. Keep the database intact unless the failure is clearly caused by bad test data.

## 17. Temporary Academic Deployment, Shutdown, And Revival

This Railway deployment is intended for course evaluation and early testing. It may be shut down
after the course.

Public tester data is not guaranteed to be permanent. Treat public accounts and saved characters as
early-demo data unless a separate retention policy is documented.

Before shutting down Railway services, optionally export or back up the PostgreSQL database if
preserving accounts and characters matters.

To revive Hunin public accounts later:

1. Provision a new PostgreSQL database.
2. Run backend migrations.
3. Redeploy the Go backend.
4. Configure backend environment variables:

```sh
APP_ENV=production
DATABASE_URL=<new-postgres-url>
ALLOWED_ORIGINS=https://hunin.marceramirez.com
```

5. Configure the backend custom domain:

```text
api.hunin.marceramirez.com
```

6. Update the frontend environment variable if needed:

```sh
VITE_API_BASE_URL=https://api.hunin.marceramirez.com
```

7. Redeploy the frontend.
8. Run the public smoke test.

If no database backup is restored, the app can still be revived with empty accounts and characters.

## 18. Security Checklist Before Inviting Testers

Where: Railway dashboard, frontend hosting dashboard, Cloudflare/DNS dashboard, browser.

Required:

- [ ] Backend uses `APP_ENV=production`.
- [ ] Backend uses `ALLOWED_ORIGINS=https://hunin.marceramirez.com`.
- [ ] Backend uses Railway PostgreSQL `DATABASE_URL`.
- [ ] Frontend uses `VITE_API_BASE_URL=https://api.hunin.marceramirez.com`.
- [ ] Backend is reachable only through HTTPS for tester flows.
- [ ] `https://api.hunin.marceramirez.com/healthz` works.
- [ ] Signup and login set an HttpOnly `hunin_session` cookie.
- [ ] Logout clears or invalidates the session.
- [ ] Other users' saved characters are not visible in My characters.
- [ ] Testers are told this is early-demo data.
- [ ] Testers are told not to enter private campaign secrets or paid D&D book content.
- [ ] Production database URL is not committed, logged, or pasted into screenshots.
- [ ] Railway logs are accessible for debugging.

Recommended before broader public access:

- [ ] Decide whether demo data may be reset.
- [ ] Decide whether database backups are needed before tester access.
- [ ] Add rate limiting or another login-abuse mitigation.
- [ ] Add dependency/security scanning if not already active.
- [ ] Add structured backend logs and frontend error tracking.

## 19. Final Notes

The first goal is a small, working public account deployment. Keep the deployment manual and
understandable before adding automation.

Do not add cookie `SameSite=None` support unless the backend moves away from
`api.hunin.marceramirez.com` to a different registrable domain.
