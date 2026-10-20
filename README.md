# Family Health Track

A lightweight, mobile-friendly web app for recording **blood pressure** and **blood glucose** for several family members, with interactive charts, a family overview, reminders, CSV export and printable reports.

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + Recharts + Lucide icons, hosted free on **GitHub Pages**
- **Backend:** **Supabase** free tier (PostgreSQL + Auth + Row Level Security). No server of your own to run.

> This is a personal monitoring tool, not a medical device. It does not diagnose or recommend treatment. Default category labels come from published guidelines (sources listed in the app's Settings page), and each person's targets can be changed to match what their healthcare professional has advised.

---

## 1. Try it in 1 minute (demo mode, no database)

```bash
npm install
npm run dev
```

Open http://localhost:5173. Without Supabase settings the app runs in **demo mode**: three fictional people with 45 days of sample readings, stored only in your browser. You can add, edit and delete freely, and reset the data under Settings → Demo data.

---

## 2. Features

| Area | What you get |
|---|---|
| Family access | One family account, or several accounts joined with an invite code. Everyone with access can see and record readings for every profile. |
| Profiles | Add/edit/delete people (name, optional date of birth, gender, avatar colour). Each person has their own readings, display unit, glucose targets, BP categories and reminder times. |
| Blood pressure | Systolic, diastolic, optional heart rate, date/time (pre-filled), session (Morning/Afternoon/Evening/Additional), notes. Multiple readings per session, plus "Save and add another". |
| Blood sugar | Value in mg/dL or mmol/L (converted at 1 mmol/L = 18.016 mg/dL), 9 reading types, notes. Readings keep the unit they were entered in. |
| Dashboard | Latest reading, today/7-day/30-day averages (systolic and diastolic averaged **separately**), sessions done today (out of 3), trends, session grid for the last 7 days (missed sessions shown in neutral grey), charts, recent readings. |
| Charts | BP chart (two lines, solid vs dashed), optional heart-rate chart, glucose chart with fasting/before/after-meal filters, each-reading / daily / weekly / monthly views, target bands and reference lines, range filters (Today, 7, 30, 90 days, custom). |
| Family overview | One card per person: latest BP and glucose, last recorded time, BP sessions done today. |
| History | Filter by date, session/reading type and notes; newest/oldest sort; edit and delete; export the filtered rows to CSV. |
| Export | BP CSV, glucose CSV, all readings in one CSV, and a printable report (use "Save as PDF" in the print dialog). |
| Reminders | Three daily BP reminder times per person. In-app banner, plus an optional browser notification while the app is open. No push service. |
| Accessibility | Large touch targets, high-contrast tokens, light and dark themes, large-text option, keyboard focus styles, labelled form fields, and status shown with icon + text rather than colour alone. |

### Default reference ranges (all editable per person)

**Blood pressure (adults):** 2017 ACC/AHA categories, retained in the 2025 AHA/ACC guideline: Normal < 120/< 80 · Elevated 120–129/< 80 · Stage 1 130–139 or 80–89 · Stage 2 ≥ 140 or ≥ 90 · Very high > 180 and/or > 120. "Low" below 90/60 (NHLBI).

**Blood glucose:** you pick a starting preset for each person:
- *ADA general targets for adults with diabetes:* before meals 80–130 mg/dL, 1–2 h after meals < 180, bedtime/random 70–180 (Time-in-Range consensus), low < 70.
- *Typical ranges without diabetes:* fasting 70–99, after meals < 140, low < 70.
- *Custom:* any numbers, for example ones set by a clinician.

---

## 3. Set up Supabase (free)

1. Create a project at https://supabase.com (Free plan).
2. **SQL Editor → New query**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. This creates the tables, indexes, Row Level Security policies and helper functions.
3. **Project Settings → API**: copy the **Project URL** and the **anon / publishable** key. These are public values. **Never** use the `service_role` / secret key in this app.
4. **Authentication → Sign In / Providers → Email**: keep Email enabled. For a family app you can switch off "Confirm email" to make sign-up simpler, or leave it on (see the redirect URLs below).
5. **Authentication → URL Configuration**:
   - **Site URL:** `https://<your-github-username>.github.io/<repo-name>/`
   - **Redirect URLs:** add both
     - `https://<your-github-username>.github.io/<repo-name>/**`
     - `http://localhost:5173/**`

   Confirmation and password-reset emails link back to these addresses. The app uses the PKCE flow (`?code=…`), which works with the hash-based router.

### Local development against Supabase

```bash
cp .env.example .env.local
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

### First use

1. Open the app and choose **Create account**, then **Start a new family**. You become the family *owner*.
2. Add profiles under **Profiles**.
3. To give a relative access, either share the family login, or have them create their own account and choose **Join with invite code**. The code is shown under **Settings → Family access**, where the owner can also generate a new code, turn invites off, or remove accounts.
4. Once everyone has joined, you can turn off **Authentication → Sign In / Providers → Allow new users to sign up** in Supabase so nobody else can register.

### Sample data (optional)

1. Sign up once in the app.
2. Open [`supabase/seed.sql`](supabase/seed.sql), set `v_email` to that account's email, and run it in the SQL Editor.

It adds three fictional people with about 45 days of readings to your family (or creates a "Sample Family" if you have none yet). You can delete them later from Profiles.

---

## 4. Deploy to GitHub Pages (free)

1. Create a GitHub repository and push this project to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Family Health Track"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo-name>.git
   git push -u origin main
   ```
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. **Settings → Secrets and variables → Actions → Variables tab → New repository variable**, and add:
   - `VITE_SUPABASE_URL`: your Project URL
   - `VITE_SUPABASE_ANON_KEY`: your anon/publishable key
4. Push again, or run the workflow manually from the **Actions** tab. [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds the app with the correct base path (`/<repo-name>/`, or `/` for a `<you>.github.io` repository) and publishes it.
5. Open `https://<you>.github.io/<repo-name>/`, then confirm that the Site URL / Redirect URLs in Supabase match it (step 3.5).

If the two variables are missing, the deployed site runs in demo mode, which shows only local sample data.

**Refreshing works on every page** because the app uses `HashRouter` (URLs look like `…/#/member/<id>`), so GitHub Pages always serves `index.html`.

### Production checklist

- [ ] `schema.sql` has been run, and the **Table Editor** shows RLS "enabled" on all five tables
- [ ] Only the anon/publishable key is used. The service-role key is not in the repo, the variables or `.env` files
- [ ] Site URL and Redirect URLs point at the GitHub Pages address
- [ ] Sign up, create the family, add a profile, add a BP and a glucose reading, then refresh the page
- [ ] Sign in from a second account with the invite code and confirm it sees the same profiles
- [ ] Sign out and confirm that no data is visible
- [ ] (Optional) Turn off new sign-ups once the family has joined

> **Supabase free tier note:** projects with no activity for about a week may be paused. Normal daily use prevents this, and a paused project can be restored from the Supabase dashboard without losing data.

---

## 5. Security model

- Every table has **Row Level Security** enabled. The `anon` role has no table privileges, so nothing is readable without signing in.
- Access is granted per family through `family_access`. Helper functions (`is_family_member`, `can_access_member`) check `auth.uid()` against that table, and every select/insert/update/delete policy uses them. A reading can only be created for, or moved to, a member of a family you belong to.
- Families can only be created or joined through the `create_family` / `join_family` RPCs. Invite codes are 12 random hex characters, and the owner can rotate or disable them.
- `get_family_overview` is `SECURITY INVOKER`, so RLS still applies.
- Database check constraints mirror the form validation: plausible BP, heart-rate and glucose ranges, systolic > diastolic, and notes ≤ 500 characters.
- CSV export neutralises spreadsheet formula injection.

---

## 6. Project structure

```
src/
  components/        UI pieces (cards, badges, dialogs, layout, charts/, settings/)
  contexts/          AuthContext (session), FamilyContext (family, members, selection)
  hooks/             useReadings (cached fetch), useReminders, useRouteMember, useNow…
  lib/               supabase client, data-change events, theme, safe localStorage
  pages/             one file per route (lazy-loaded)
  services/          api.ts (interface) → supabaseApi.ts | demoApi.ts
  styles/            Tailwind entry + colour tokens (light/dark)
  types/             shared TypeScript types
  utils/             BP/glucose classification, conversions, stats, CSV, dates, validation
supabase/
  schema.sql         tables, indexes, RLS, functions
  seed.sql           fictional sample data
.github/workflows/deploy.yml
```

Scripts: `npm run dev`, `npm run build` (type-check + production build), `npm run preview`.

## 7. Customising

- **Reference ranges:** defaults are in `src/utils/bp.ts` and `src/utils/glucose.ts`. Per-person overrides are stored in `family_members.settings`.
- **Colours:** CSS variables in `src/styles/index.css`. The chart series colours in `src/components/charts/chartTheme.ts` were checked for colour-blind separation.
- **Sessions/reminders:** default times are in `src/utils/settings.ts`.
