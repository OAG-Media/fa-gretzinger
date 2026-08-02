# Projektplan – Fa. Gretzinger Hörgeräte

## Status
App läuft produktiv auf Vercel (`fa-gretzinger.vercel.app`), Daten in Supabase (`gzurjjuhfjbcafmfdaog`).

## Erledigt (2026-07-29)
- Gutschrift in Kommission-Spalte (UI/PDF/Excel)
- Excel-Export für Rechnungspositionen
- Doppelte Rechnungsnummer-Fix (Auto-Save upsert statt doppeltem INSERT)
- PDF: „Steuerschuldnerschaft des Leistungsempfängers“ für Österreich / Optik Bauer (auch bestehende Rechnungen per PDF-Download, inkl. 0%-MwSt)
- Akustiker archivieren + Archiv-Ansicht; archivierte fehlen bei Reparaturaufträgen
- Akustiker: Mehrfacheinträge (exakt Name+Straße, ähnlich ohne große Ketten wie Langer)
- Ähnliche Mehrfacheinträge: grüner Haken (duplicate_ok) + Gruppe OK + Aktualisieren
- Erstellte Rechnungen: Live-Suche + Monats-/Zeitraumfilter + Akustiker-Dropdown (Nr., Name, Datum, Beträge)
- DB: `customers.archived`, `customers.duplicate_ok`

## Erledigt (2026-08-02)
- Filiale-Filter bei Reparaturaufträgen
- Doppelverrechnung blockiert (draft/invoiced) inkl. Hinweis „bereits in Rechnung XY“
- Auto-Split nach Filiale wieder entfernt (Filiale-Filter reicht; eine Rechnung für die Auswahl)
- Entfernte Aufträge aus Rechnungsentwurf werden wieder freigegeben (invoice_status = null)
- Reparaturauftrag: Unrepariert kostenlos+ohne Porto; Unrepariert/Verschrotten mit per/Datum wie KV
- PDF neu (pdf_version≥2): „Auftrag von:“ statt „Sendedatum“; alte Aufträge unverändert
- Arbeiten: Noahlink/nEARcom-Label, Preisfelder rechtsbündig, max. 3 manuelle Positionen (+ Linie)
- Einstellungen-Kachel: Länder/Steuer/Porto (Tabelle `country_settings`)
- Modern-Dashboard (Sidebar, KPIs, Charts), Switcher, Default „Neu“
- Rollen: Mitarbeiter (ohne Rechnungen/Umsatz) + Admin (`A-Gretz`)
- Hinweis: Logins früher hardcoded — siehe Security-Abschnitt unten

## Erledigt (2026-08-02 Admin-Analytics)
- Admin-Home: Kacheln mit eigenem Zeitraum + Chart-Switcher (Icon-Cycle), Prefs in `localStorage`
- Umsatz nur monatsweise; laufendes Jahr bis aktueller Monat (z. B. Jan–Jul)
- Top-Kunden-Umsatz-Ranking; Aufträge umschaltbar auf Kunden-Ranking (Anzahl)
- Menü **Finanzen** (Admin): Filter 35% / Visualisierung 65% + Kunden-Tabelle + Analyse-PDF (kein Rechnungs-PDF)

## Erledigt (2026-08-02 Security — Supabase Auth + RLS)
- Login über **Supabase Auth** (gleiche UX, gehashte Passwörter nur in Supabase)
  - Mitarbeiter: `Fa-Gretzinger` / `2026-GretzFa!$`
  - Admin: `A-Gretz` / `Loefish2026!` (unverändert)
- **Keine Passwörter mehr im Frontend-Code**
- RLS auf allen Tabellen aktiv: ohne Login → keine API-Daten
- `invoices` / `invoice_items`: nur Rolle **admin**
- `customers` / `repair_orders` / `country_settings`: nur **authenticated**
- Alte `localStorage`-only-Sessions werden verworfen (erneut anmelden)

## Offen / Hinweise
- Optional: Postgres-Upgrade in Supabase Dashboard; HaveIBeenPwned / MFA später
- Eventuell bestehende Entwürfe mit doppelter Nummer-Historie manuell prüfen
- Production Branch in Vercel sollte `master` sein (sonst nur Preview)
- **Security-Deploy:** Auth+RLS ist in Supabase schon live; App-Code zuerst auf Localhost testen, dann auf `master` pushen

## E-Rechnung / Pflicht ab 01.01.2028 — Gap-Analyse
**Kurzantwort: Noch nicht erfüllt.** Aktuell nur klassisches **PDF** (`jsPDF`) — das gilt **nicht** als E-Rechnung.

### Was bereits gilt / gelten wird (DE, B2B inland)
| Frist | Pflicht |
| --- | --- |
| seit 01.01.2025 | **Empfang** von E-Rechnungen möglich sein |
| ab 01.01.2027 | **Versand** für Unternehmen mit Vorjahresumsatz > 800.000 € |
| ab **01.01.2028** | **Versandpflicht für alle** inländischen B2B-Umsätze |

Zulässige Formate (EN 16931): **XRechnung** (XML) und/oder **ZUGFeRD** ≥ 2.0.1 (PDF/A-3 + eingebettetes XML; Profile MINIMUM/BASIC-WL reichen nicht). Quelle u. a. [BMF-FAQ E-Rechnung](https://www.bundesfinanzministerium.de/Content/DE/FAQ/e-rechnung.html).

### Ist-Zustand in dieser App
- Rechnungs-Export = visuelles PDF ohne strukturiertes XML
- Kein XRechnung-/ZUGFeRD-Generator, kein Validator, kein E-Rechnungs-Import/Empfang
- Pflichtfelder für EN 16931 nur teilweise vorhanden (z. B. USt-Id Kunde, Positionen, Steuer) — Leitweg-ID / Buyer Reference etc. fehlen für den strukturierten Datensatz

### Was noch gebaut werden muss (Phase „E-Rechnung“)
1. **Versand:** ZUGFeRD (hybride PDF+XML) und/oder XRechnung-XML aus denselben Rechnungsdaten erzeugen
2. Pflichtfelder EN 16931 absichern (Verkäufer/Käufer, USt-Id, Steuersätze, Positionen, Rechnungsnr./Datum, Zahlungsbedingungen)
3. Optional: Validierung vor Download/Versand (EN 16931 / KoSIT)
4. **Empfang:** Upload/Archiv eingehender E-Rechnungen (mind. speichern + anzeigen) — seit 2025 relevant, organisatorisch ggf. auch per Mail/Steuerberater lösbar
5. GoBD: Originalformat (XML bzw. ZUGFeRD) revisionssicher aufbewahren (nicht nur gerendertes PDF)

Priorität: vor 2027 prüfen, ob Umsatz > 800k → sonst spätestens Q3/Q4 2027 umsetzen.

## Tech
- React (CRA), Supabase, jsPDF (+ autotable für Finanzanalyse)
- Localhost: siehe `regeln.md` (Port 3001, Dev-Pfad)
- DB: `country_settings`, `repair_orders.pdf_version`, `repair_orders.unrepariert_kostenlos`
- Prefs: `localStorage` Key `gretzinger_admin_dashboard_prefs`
