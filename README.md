# NORDSTEIN CRM — Sales OS

**Das komplette Vertriebs-OS für Nordstein-Agency**, gebaut in Next.js 15 + Supabase.

---

## Stack

- **Next.js 15** — App Router, Server Components
- **Supabase** — PostgreSQL, Auth, RLS, Realtime-ready
- **TypeScript** — vollständig typisiert
- **Tailwind v4** — mit Nordstein CI Design System
- **Outscraper API** — Lead-Generator via Google Maps

---

## Features

| Feature | Beschreibung |
|---------|-------------|
| 🔐 Auth | Supabase Auth, Login, Rollen (Admin / Sales / Viewer) |
| 🏆 Dashboard | KPI-Cards, Pipeline-Funnel, Aktivitäts-Feed, Termine |
| 🎯 Pipeline | 7-stufige Pipeline-Tabbar mit Live-Filter |
| 📋 Leads | Vollständige Lead-Tabelle, Bulk-Aktionen, CSV-Export |
| 📝 Notizen | Pro-Lead Notizen mit vollem Audit-Trail |
| 📅 Kalender | Monatsansicht, Terminverwaltung, .ics Export |
| 📊 Reports | Status-Charts, Monats-Barchart, Team-Aktivität |
| ⚡ Generator | Outscraper Google Maps mit Auto-Dedup |
| 📥 Import | CSV/XLSX mit Field-Mapping & Duplikat-Check |
| 👥 User-Mgmt | Admin: Benutzer anlegen, Rollen zuweisen |
| 🕵️ Audit-Log | Jede Status-Änderung, Notiz, Aktion wird geloggt |

---

## Pipeline-Stufen

```
Neu → Verkaufsgespräch → Closing Call → Abschluss
                    ↓
          Follow Up | Kein Interesse | Nicht erreicht
```

---

## Setup

### 1. Supabase Projekt

1. [supabase.com](https://supabase.com) → Neues Projekt
2. SQL Editor → `supabase/schema.sql` ausführen
3. Authentication → Email bestätigen optional deaktivieren (für Entwicklung)
4. API Keys kopieren

### 2. Environment Variables

```bash
cp .env.example .env.local
# .env.local befüllen:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
# OUTSCRAPER_API_KEY (optional)
```

### 3. Ersten Admin-User anlegen

In Supabase Dashboard → Authentication → Users → Add User:
- E-Mail + Passwort setzen
- Dann im SQL Editor:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'deine@email.com';
```

### 4. Lokal starten

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## Deployment (Vercel)

```bash
# 1. Vercel CLI
npx vercel

# 2. Environment Variables im Vercel Dashboard setzen
# 3. Deploy
git push origin main
```

---

## Kalender-Abo (.ics)

```
https://deine-app.vercel.app/api/calendar/ics
```
(Einloggen erforderlich — Cookie-basiert)

---

## Outscraper Setup (Lead-Generator)

1. [outscraper.com](https://outscraper.com) Account erstellen
2. API Key kopieren → in `.env.local` als `OUTSCRAPER_API_KEY`
3. Credits aufladen (ab ~$10)

---

## Design System (Nordstein CI)

| Token | Wert |
|-------|------|
| `--nordstein-purple` | `#451a3d` |
| `--nordstein-beige` | `#e6ded3` |
| `--nordstein-grey` | `#d2d2d2` |
| `--bg` | `#0d0b0d` |
| Font | Inter Tight (Semi Bold Headings) |

---

## Datenbankstruktur

```
profiles          → Nutzerprofile (extends auth.users)
leads             → Alle Leads mit Dedup-Key
notes             → Pro-Lead Notizen
appointments      → Termine mit Kalender-Integration
activity_log      → Vollständiger Audit-Trail
tags              → Lead-Tags
lead_tags         → M:N Tags ↔ Leads
generator_sessions → Verlauf der Lead-Generator-Suchen
pipeline_goals    → Monatliche Ziele pro User
```

---

*Gebaut für Nordstein-Agency GmbH — Linz, Österreich*
