# ULP Sprint Planning

A simple web app for teams that run **2-week sprints** and rotate **Release Master** and **Scrum Master** duties. It shows who is on duty for the current and next sprint, and lets you browse past and upcoming sprints—all from a single JSON config, no database required.

---

## What it does

- **Home:** At-a-glance view of the **current sprint** (Sprint number, Release number, date range, Release Master, Scrum Master) and a collapsible **next sprint** section you can “unbox” to reveal.
- **History:** A table of past and upcoming sprints (newest first), with the current sprint row highlighted. Columns: Sprint, Release, Release Master, Scrum Master, Start date, Date range.

Sprint dates are **calculated** from an anchor (first sprint start date + 14-day cadence). Assignments are **computed from rotation**: you define the order of people in config; the app figures out who is on duty for each sprint. Sprints run **Monday to Friday** (end date = start + 11 days).

---

## Tech stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Data:** Single JSON file (`data/config.json`); no backend or database
- **Hosting:** Suited for static/serverless (e.g. **Vercel**)

---

## Quick start

### Prerequisites

- Node.js 18+
- npm (or pnpm / yarn)

### Run locally

```bash
git clone <your-repo-url>
cd ulp-sprint-planning
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for production

```bash
npm run build
npm start
```

---

## Configuration

All data lives in **`data/config.json`**. Edit this file to match your team and calendar; no code changes needed.

### Config fields

| Field | Description |
|-------|-------------|
| `firstSprintNumber` | Sprint number of the “first” sprint (e.g. `1.194`). Used to compute Sprint/Release numbers for all sprints. |
| `firstSprintStartDate` | Start date of that sprint in **dd/mm/yyyy** (e.g. `"19/01/2026"`). Must be a **Monday**. |
| `sprintLengthDays` | Length of each sprint in days (e.g. `14`). Used to compute which sprint a date falls into. |
| `releaseMasters` | Array of names in **rotation order**. One person is Release Master per sprint; the list cycles. |
| `scrumMasters` | Array of names in **rotation order**. One person is Scrum Master per sprint; the list cycles. |
| `releaseMasterIndexAtFirstSprint` | Index in `releaseMasters` for who was RM in the first sprint (usually `0` if the first name was on duty). |
| `scrumMasterIndexAtFirstSprint` | Index in `scrumMasters` for who was SM in the first sprint (usually `0` if the first name was on duty). |

### Example

```json
{
  "firstSprintNumber": 1.194,
  "firstSprintStartDate": "19/01/2026",
  "sprintLengthDays": 14,
  "releaseMasters": ["Eizlan", "Zul", "Minker"],
  "scrumMasters": ["Fahmi", "Rubee", "Anessa", "Zul", "Minker", "Eizlan"],
  "releaseMasterIndexAtFirstSprint": 0,
  "scrumMasterIndexAtFirstSprint": 0
}
```

With seeds `0` and `0`, the **first** sprint (the one starting `19/01/2026`) has **Eizlan** as Release Master and **Fahmi** as Scrum Master. The app then rotates through the lists for every sprint before and after.

---

## Updating the team

You only need to edit **`data/config.json`**. Redeploy (or restart) the app to see changes.

### Rule: no same person as RM and SM in the same sprint

The app **validates** that no sprint has the same person as both Release Master and Scrum Master. If your config breaks this rule, the app will throw an error so you can fix it.

To keep the rule when changing config:

- **Release Masters** cycle every 3 sprints (if you have 3 people).
- **Scrum Masters** cycle every 6 sprints (if you have 6 people).
- The **order** of names in `scrumMasters` must be chosen so that whenever someone is RM, they are **not** SM that sprint. The example above is already phased that way; when you add or reorder people, check that no sprint has RM = SM.

### Add a person

- Append the name to `releaseMasters` or `scrumMasters` (order = rotation).
- Re-check that the same person is never RM and SM in the same sprint.

### Remove a person

- Remove the name from the relevant array.

### Change rotation order

- Reorder names in `releaseMasters` and/or `scrumMasters`.
- Optionally adjust `releaseMasterIndexAtFirstSprint` and `scrumMasterIndexAtFirstSprint` if you want the “first” sprint’s assignment to stay the same.
- Ensure the no-RM/SM-same-person rule still holds.

---

## Deploying (e.g. Vercel)

1. Push this repo to GitHub (or your Git provider).
2. In [Vercel](https://vercel.com), import the repo and deploy.
3. **Set environment variables** in Vercel (Project → Settings → Environment Variables):
   - `NEXT_PUBLIC_POCKETBASE_URL` – your PocketBase API URL (e.g. `https://your-pb.example.com`). Required for the client to talk to PocketBase.
   - Optionally for scripts: `POCKETBASE_URL`, `POCKETBASE_ADMIN_EMAIL`, `POCKETBASE_ADMIN_PASSWORD` (do **not** commit these in `.env`; use Vercel’s env UI).
4. Each deploy uses the **config in the repo at build time** for the roster.

The app is read-only for visitors; only people with access to the repo can change who is on duty by editing `data/config.json` and redeploying.

---

## Project structure

```
ulp-sprint-planning/
├── app/
│   ├── page.tsx          # Home (current + next sprint)
│   ├── history/
│   │   └── page.tsx      # Sprint history table
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/               # shadcn components (Card, Table, Badge, etc.)
│   └── unbox-next-sprint.tsx
├── data/
│   └── config.json       # Single source of truth (edit this)
├── lib/
│   ├── sprint.ts         # Config, dates, rotation, history
│   └── utils.ts
└── README.md
```

---

## License

Use and adapt as you like. If you fork this for your team, updating `data/config.json` is all you need to get going.
