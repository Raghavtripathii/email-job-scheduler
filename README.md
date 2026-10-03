# Email Job Scheduler

A small version of what ReachInbox does under the hood: schedule emails through an API and a dashboard, send them at the right time, never twice, with rate limits, Slack alerts, and search.

Built for the Outbox Labs (ReachInbox) SDE Intern assignment.

**Demo video:** YOUR_VIDEO_LINK

## What it does

- Schedule emails through an API and a React dashboard (subject, body, a CSV or text file of leads, start time, delay, hourly limit).
- Uses **BullMQ delayed jobs with Redis**. There is no cron anywhere.
- Sends through **Ethereal** (fake SMTP) from **multiple senders**.
- Survives restarts: scheduled emails still go out on time, and are never sent twice.
- Limits sending per sender per hour, and pushes the extra emails into the next hours instead of dropping them.
- Sends a **real Slack message** when a sender hits its hourly limit.
- Search with **Elasticsearch**, live queue view with **Bull Board**.
- Real **Google login**.

## Tech

| Part | Choice |
|---|---|
| Backend | TypeScript, Express 5, Prisma |
| Queue | BullMQ on Redis |
| Database | MySQL 8 |
| Mail | Nodemailer with Ethereal |
| Search | Elasticsearch 8 |
| Frontend | React, Vite, TypeScript, Tailwind CSS v4 |
| Auth | Google OAuth, JWT in an httpOnly cookie |
| Infra | Docker Compose |

## Run it

Needs Node 20 or newer (built and tested on Node 26), Docker Desktop, a Google account, and a Slack workspace. ngrok is only needed for the Slack connect button.

### 1. Start Redis and MySQL (and Elasticsearch)

```bash
docker compose up -d                    # redis and mysql
docker compose --profile search up -d   # also starts elasticsearch
```

Redis runs with AOF persistence and `noeviction`, so scheduled jobs survive a restart and are never evicted. MySQL is on port 3307 so it does not clash with a local MySQL.

### 2. Set up Ethereal senders

Open https://ethereal.email/create and click **Create Ethereal Account** three times. Each gives a username (an email address) and a password. Put them in `ETHEREAL_SENDERS` as JSON on **one line** inside single quotes:

```
ETHEREAL_SENDERS='[{"name":"Sender 1","user":"a@ethereal.email","pass":"..."},{"name":"Sender 2","user":"b@ethereal.email","pass":"..."},{"name":"Sender 3","user":"c@ethereal.email","pass":"..."}]'
```

Use three different accounts. You can see the received emails by logging in at https://ethereal.email/login, and the worker prints a preview link for every email it sends.

### 3. Backend

```bash
cd backend
npm install
cp .env.example .env        # on Windows PowerShell: copy .env.example .env
```

Fill in `.env` (see the table below), then:

```bash
npx prisma migrate dev      # creates the tables
npm run dev                 # the API on http://localhost:4000
npm run dev:worker          # the BullMQ worker, in a second terminal
```

The API and the worker are separate processes on purpose. Run more workers to scale.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Always open `http://localhost:5173` (not `127.0.0.1`), so the login cookie and CORS match.

### Environment variables (`backend/.env`)

| Name | What it is |
|---|---|
| `PORT`, `FRONTEND_URL` | API port (4000) and the frontend address (5173) |
| `DATABASE_URL` | MySQL, for example `mysql://root:rootpass@localhost:3307/scheduler` |
| `REDIS_URL`, `ELASTICSEARCH_URL` | Redis and Elasticsearch addresses |
| `WORKER_CONCURRENCY` | How many emails a worker handles at once (default 5) |
| `MIN_DELAY_BETWEEN_EMAILS_MS` | Minimum gap between any two sends (default 2000, so **2 seconds**) |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | Upper cap for the hourly limit (default 100) |
| `JWT_SECRET` | Random string, for example `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Google OAuth |
| `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_REDIRECT_URL` | Slack OAuth (optional, only for the Connect Slack button) |
| `ETHEREAL_SENDERS` | The sender accounts from step 2 |

### Google login setup

1. In Google Cloud Console create a project, then an **OAuth client of type Web application**.
2. Authorized redirect URI: `http://localhost:4000/api/auth/google/callback`. Authorized JavaScript origin: `http://localhost:5173`.
3. Put the client ID and secret in `.env`. While the consent screen is in Testing mode, add your Google account as a test user.

### Slack setup

1. Create an app at https://api.slack.com/apps (from scratch) and turn **Incoming Webhooks** on.
2. Slack needs an https redirect URL, so start a tunnel: `ngrok http 4000`.
3. Under **OAuth & Permissions → Redirect URLs** add `https://<your-ngrok-domain>/api/slack/callback`, and put the same value in `SLACK_REDIRECT_URL`.
4. Copy the client ID and secret into `.env`, restart the API, then click **Connect Slack** on the dashboard.

## How it works

```
Browser (React)  --cookie-->  Express API  --->  MySQL  (every email and its status)
                                  |
                                  | one delayed job per email (jobId = email id)
                                  v
                               Redis / BullMQ  <---  Bull Board (/admin/queues)
                                  ^
                                  | the job is picked up when its time comes
                               Worker(s)
                    1. skip if the email is already handled
                    2. take an hourly slot for the sender (Redis Lua script)
                       - full: move the job to a later hour, tell Slack once
                    3. claim the row in MySQL (scheduled -> sending)
                    4. send through Ethereal, mark sent or failed
                    5. keep the Elasticsearch document in sync
```

### Scheduling

`POST /api/schedule` saves the batch and every email in MySQL in one transaction. Email number *i* is scheduled at `start + i × delay`, and senders are used in turns. Each email becomes a **BullMQ delayed job** whose id is the email's id. There is no cron or polling loop.

### Persistence across restarts

- A delayed job lives in Redis (with AOF on), so it survives a restart of the API, the worker, or Redis itself.
- MySQL is the source of truth. On boot, the API and the worker both run a **reconcile**: scheduled rows with no live job get their job back, and rows stuck in `sending` for over a minute are marked `failed`.
- Emails are never sent twice (idempotency, two guards): the job id is the email id, so Redis ignores a duplicate. The worker also claims the row with `UPDATE ... WHERE status='scheduled'`, and a worker that loses the claim skips it.

### Concurrency and delay between emails

- `WORKER_CONCURRENCY` sets how many jobs one worker runs in parallel.
- **Minimum delay: 2 seconds between sends**, using BullMQ's limiter (`max: 1` per `MIN_DELAY_BETWEEN_EMAILS_MS`), shared by every worker on the queue.

### Hourly limit per sender

- Counter in Redis per sender per **fixed UTC hour** (`rate:{sender}:{hour}`), checked and increased by one **atomic Lua script**, so several workers or instances can never exceed the limit.
- When the hour is full, the job is **not dropped or failed**. It gets a numbered place in line (a second Redis counter) and is moved to the next hour, spaced by the minimum delay, so the original order is kept as far as possible. The first `limit` go to the next hour, the next `limit` to the hour after, and so on. The email's time in the dashboard updates too.
- The limit is set per batch in the compose form and can never go above `MAX_EMAILS_PER_HOUR_PER_SENDER`.
- India is UTC+5:30, so limit windows start at :30 on a clock in India.

### Behavior under load (1000+ emails at once)

Each email is its own delayed job. Workers take at most `WORKER_CONCURRENCY` at a time, one send every 2 seconds, and each sender stops at its hourly limit. Extra emails move to later hours, and nothing is dropped. `npm run loadtest` (in `backend`) fires 1000 limiter calls at the same instant for 3 senders with a limit of 100, and checks the limit holds:

```
sender 1: send now 100, pushed 234 (+1h: 100, +2h: 100, +3h: 34) ok
sender 2: send now 100, pushed 233 (+1h: 100, +2h: 100, +3h: 33) ok
sender 3: send now 100, pushed 233 (+1h: 100, +2h: 100, +3h: 33) ok
total: 300 now + 700 pushed = 1000 of 1000
PASS: limit held, nothing dropped, order kept
```

### Slack alert

When a sender hits its hourly limit, the owner gets a real Slack message through the webhook they connected. It is sent at most once per user, per sender, per hour. If Slack is not connected, nothing is sent and nothing breaks. Connecting later works on the very next limit hit, with no restart. If Slack removes the webhook, the connection is deleted and the dashboard shows **Connect Slack** again.

### Search and queue dashboard

- Every email is indexed in Elasticsearch when it is scheduled, and updated when it is rescheduled, sent, or failed. `GET /api/emails/search?q=` searches email, subject, sender, and body. Results are read back from MySQL in Elasticsearch's order.
- Elasticsearch is best effort. If it is down, scheduling and sending keep working. The index is rebuilt from MySQL when missing, or with `npm run reindex`.
- Bull Board is at `http://localhost:4000/admin/queues` (login required).

## Features

**Backend**

| Feature | Where |
|---|---|
| Scheduler (BullMQ delayed jobs, no cron) | `services/scheduleService.ts`, `queues/` |
| Persistence and restart safety | Redis AOF, `services/reconcile.ts` |
| Idempotency | job id and the claim step in `workers/emailWorker.ts` |
| Concurrency, minimum delay | `workers/emailWorker.ts` |
| Hourly rate limit (Redis, atomic) | `services/rateLimiter.ts` |
| Multiple senders | `services/senderService.ts`, `lib/mailer.ts` |
| Slack OAuth and alert | `routes/slack.ts`, `services/slackNotifier.ts` |
| Elasticsearch search | `services/searchIndex.ts`, `services/searchService.ts` |
| Bull Board | `routes/queueBoard.ts` |
| Google OAuth, JWT cookie | `routes/auth.ts`, `middleware/auth.ts` |

**Frontend**

Google login page, header with name, email, and avatar plus logout, **Scheduled** and **Sent** tabs with live counts, **Compose New Email** (subject, body, CSV or text upload with the number of emails found, start time, delay, hourly limit), tables with loading, empty, and error states, pagination, search, Connect Slack button, toasts, reusable UI components, and typed API calls.

## API

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | database and Redis check |
| GET | `/api/auth/google`, `/api/auth/google/callback` | Google login |
| GET, POST | `/api/auth/me`, `/api/auth/logout` | current user, logout |
| POST | `/api/schedule` | create a batch |
| GET | `/api/emails/scheduled`, `/api/emails/sent` | the two lists |
| GET | `/api/emails/search?q=` | search |
| GET, DELETE | `/api/slack/connect`, `/callback`, `/status`, `/disconnect` | Slack |
| GET | `/admin/queues` | Bull Board |

## Assumptions, shortcuts, and trade-offs

- **Fixed UTC hour windows** are simpler than rolling windows, at the cost of a possible burst at an hour edge.
- **An hourly slot is used before sending**, so a failed send still counts, like a real provider would count it.
- **No automatic retries.** A failed email is marked `failed`. After a crash, an email left in `sending` is marked `failed` rather than risk sending it twice (at-most-once). A database error before an email is claimed leaves it `scheduled` until the next boot reconcile.
- **The minimum delay is global**, so pushed emails also use a limiter slot while being moved.
- **Counters are per sender**, so two batches with different hourly limits share one counter, and each job checks it against its own limit.
- **Slack webhooks and Ethereal passwords are stored in plain text** in MySQL. Ethereal accounts are fake, and a real product would encrypt the webhook.
- **Slack's redirect URL must be https**, so ngrok is needed for local development.
- **Elasticsearch is best effort**, the body is indexed up to 2000 characters, and multi-word searches match words in the same field.
- **Bull Board is open to any logged-in user.** Job payloads only contain an email id. A real product would limit it to admins.
- **The dashboard polls every 5 seconds** (only while the tab is visible) instead of using websockets.
- **No unit tests.** I checked behavior with the load test script and manual scenarios (restart, Redis restart, outage, limit hit, Slack disconnect and reconnect).
- **Design:** DESIGN_NOTE