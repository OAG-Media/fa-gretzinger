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
- Startseite: klassisches Dashboard bleibt Default; animierter Switcher → neues Modern-Dashboard (Sidebar, KPIs, Charts)
- Modern-Modus: Sidebar auf allen Seiten; Switcher unten rechts; Abmelden-Abstand korrigiert (nur localhost bisher)
- Rollen: Mitarbeiter (bisheriger Login, ohne Rechnungen/Umsatz-Dashboard) + Admin (`A-Gretz` / `Loefish2026!`); Default-Ansicht „Neu“
- Hinweis: Logins aktuell in `src/authRoles.js` (nicht Supabase/Vercel-Env)


## Offen / Hinweise
- RLS auf `invoices` / `invoice_items` ist deaktiviert (Security-Hinweis, bewusst nicht auto-gefixt)
- Eventuell bestehende Entwürfe mit doppelter Nummer-Historie manuell prüfen
- Production Branch in Vercel sollte `master` sein (sonst nur Preview)

## Tech
- React (CRA), Supabase, jsPDF
- Localhost: siehe `regeln.md` (Port 3001, Dev-Pfad)
- DB: `country_settings`, `repair_orders.pdf_version`, `repair_orders.unrepariert_kostenlos`
