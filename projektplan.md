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
- Erstellte Rechnungen: Live-Suche + Monats-/Zeitraumfilter (Nr., Name, Datum, Beträge)
- DB: `customers.archived` Spalte

## Offen / Hinweise
- RLS auf `invoices` / `invoice_items` ist deaktiviert (Security-Hinweis, bewusst nicht auto-gefixt)
- Eventuell bestehende Entwürfe mit doppelter Nummer-Historie manuell prüfen

## Tech
- React (CRA), Supabase, jsPDF
- Localhost: siehe `regeln.md` (Port 3001, Dev-Pfad)
