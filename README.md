# Sprint Planner

A sprint planning tool for agile teams. Track **2-week sprints**, rotate **Release Master** and **Scrum Master** duties, plan team capacity, and run **planning poker** sessions -- all in one place. Configure your team from a single JSON file and get going.

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
cd sprint-planner
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
| `rotations` | Roster periods. Each era has `fromSprintNumber` plus RM/SM lists. A sprint uses the latest era whose `fromSprintNumber` is less than or equal to that sprint. Add a new era when the team changes so past History stays frozen. |
| `releaseMasters` / `scrumMasters` | Optional fallback if `rotations` is omitted: a single roster from `firstSprintNumber`. |

Each rotation era also has `releaseMasterIndexAtFirstSprint` and `scrumMasterIndexAtFirstSprint`. Those seeds are relative to sprint **index 0** (the first sprint), not the start of the era.

### Example

```json
{
  "firstSprintNumber": 1.194,
  "firstSprintStartDate": "19/01/2026",
  "sprintLengthDays": 14,
  "rotations": [
    {
      "fromSprintNumber": 1.194,
      "releaseMasters": ["Eizlan", "Zul", "Minker"],
      "scrumMasters": ["Fahmi", "Rubee", "Anessa", "Zul", "Minker", "Eizlan"],
      "releaseMasterIndexAtFirstSprint": 0,
      "scrumMasterIndexAtFirstSprint": 0
    }
  ]
}
```

With seeds `0` and `0`, the **first** sprint (the one starting `19/01/2026`) has **Eizlan** as Release Master and **Fahmi** as Scrum Master. The app then rotates through that era’s lists until a later era begins.

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

- Add a **new rotation era** from the current (or next) sprint with the updated lists. Do not edit an era that already covers past sprints.
- Re-check that the same person is never RM and SM in the same sprint **within that era**.

### Remove a person

- Add a new era without that name, instead of editing the historical era.

### Change rotation order

- Add a new era with the new order from the sprint where it should take effect.
- Ensure the no-RM/SM-same-person rule still holds for that era.

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
sprint-planner/
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
