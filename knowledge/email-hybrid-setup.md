# E-Mail-Setup: Hybrid Hostinger + Resend (fa-gretzinger.de)

Ziel: App-Postfach **und** Handy-IMAP für `kv@` + `info@`.

## Architektur

| Aufgabe | System |
| --- | --- |
| Empfang + IMAP/POP (Handy) | Hostinger-Postfächer |
| Versand aus der Software | Resend (From/Reply-To je Postfach) |
| Eingang in der Software | Hostinger „Kopie weiterleiten“ → Resend-Inbound-Subdomain |
| Gesendet aus der Software | nur in der App (`email_logs`) — **nicht** automatisch in Hostinger |
| Vom Handy gesendet → App | später IMAP-Sync (noch nicht gebaut) |

### Warum Gesendet nicht in Hostinger liegt

Die App verschickt über **Resend** (API), nicht über den Hostinger-SMTP der Mailbox.
Hostinger sieht diese Mails daher nicht im Ordner „Gesendet“.

| Ort | Eingang | Gesendet |
| --- | --- | --- |
| Software (Desktop) | nach Hybrid-Setup | ja (sofort) |
| Handy IMAP (Hostinger) | ja | nur was vom Handy selbst gesendet wurde |
| Hostinger Webmail | ja | nur Handy/SMTP, nicht App-Resend |

Für Papa am Handy: Eingang sieht er per IMAP. App-Gesendet am Handy erst mit späterem IMAP-Sync oder wenn er die Web-App öffnet.

---

## Checkliste vor Commit / Push (Vercel)

### A) Du (manuell) — Empfang aktivieren

1. **Resend → Domains**
   - `fa-gretzinger.de`: Status **Verified**, **Sending** an, **Receiving auf Root AUS**
   - Neue Domain: `inbound.fa-gretzinger.de` anlegen → nur dort **Receiving / MX** laut Resend eintragen (bei Hostinger DNS)
2. **Resend → Webhooks**
   - URL: `https://fa-gretzinger.vercel.app/api/resend-inbound`
   - Event: `email.received`
   - **Zusätzlich (Bounce-Benachrichtigung):**
   - URL: `https://fa-gretzinger.vercel.app/api/resend-events`
   - Event: `email.bounced` (Pflicht), optional `email.delivery_delayed`
3. **Hostinger → E-Mail → Weiterleitung** (Kopie behalten!)
   - `kv@fa-gretzinger.de` → `kv@inbound.fa-gretzinger.de`
   - `info@fa-gretzinger.de` → `info@inbound.fa-gretzinger.de`
4. **Vercel → Project → Settings → Environment Variables** (Production)
   - `RESEND_API_KEY` (Full Access, nicht nur Sending)
   - `RESEND_FROM=Fa. Gretzinger <info@fa-gretzinger.de>`
   - `RESEND_REPLY_TO=info@fa-gretzinger.de`
   - `SUPABASE_SERVICE_ROLE_KEY` (für Webhook/Sync)
   - `REACT_APP_SUPABASE_URL` / `REACT_APP_SUPABASE_ANON_KEY` (falls noch nicht gesetzt)
5. **Test:** Mail an `info@` und `kv@` senden → erscheint in Hostinger **und** nach kurzer Zeit / Sync in der App

### B) Ich / Git (erst wenn du „committen/pushen“ sagst)

- Geänderte Dateien committen und auf `master` pushen → Vercel baut automatisch
- Ohne deinen Auftrag wird nichts gepusht

### C) Optional Papa-Handy (sofort, ohne App-Empfang)

- iPhone/Android Mail-App: IMAP für `kv@` und `info@` (Zugangsdaten Hostinger)

---

## 1. Resend: Domain verifizieren (nur Versand)

1. Resend → Domains → **Add Domain** `fa-gretzinger.de`
2. DNS bei Hostinger laut Resend eintragen (SPF, DKIM, optional DMARC)
3. Warten bis Status **Verified**
4. **MX der Hauptdomain nicht auf Resend umstellen** — sonst stirbt Hostinger-IMAP

## 2. Resend: Inbound-Subdomain (nur für die App)

**Wichtig:** „Enable Receiving“ auf der **Hauptdomain** `fa-gretzinger.de` **nicht** aktivieren /
bzw. wieder **ausschalten**. Resend würde sonst den Root-MX übernehmen → Konflikt mit Hostinger
(Handy-IMAP bricht).

Stattdessen:

1. In Resend eine **eigene Empfangs-Domain** anlegen: `inbound.fa-gretzinger.de`
2. Nur für diese Subdomain die Resend-**MX**-Records setzen
3. Webhook: `https://fa-gretzinger.vercel.app/api/resend-inbound`  
   Event: `email.received`

Empfangsadressen:

- `kv@inbound.fa-gretzinger.de`
- `info@inbound.fa-gretzinger.de`

Auf der Hauptdomain in Resend reicht: **DKIM + Enable Sending (SPF)**.

## Hostinger: Keine „Subdomain“-Seite nötig

Den Tab **Subdomains** bei Hostinger **ignorieren** (der ist für Websites).  
Alles läuft über **DNS-Einträge** der Hauptdomain `fa-gretzinger.de`:

1. Tab **DNS-Einträge** (nicht Subdomains)
2. Resend zeigt nach **Enable Receiving = ON** neue **MX**-Records (Name oft `inbound` oder leer mit Host `inbound.fa-gretzinger.de`)
3. Diese MX-Werte 1:1 bei Hostinger als DNS-Eintrag anlegen (Typ MX)
4. DKIM/SPF für `inbound` hast du laut Screenshot schon → gut

Receiving nur auf **`inbound.fa-gretzinger.de`** einschalten — **nicht** auf der Root-Domain `fa-gretzinger.de`.

## Antworten / Weiterleitung (wichtig)

Hostinger „Kopie weiterleiten“ an `…@inbound…` ist nur ein **technischer Tunnel zur App**.

| Ort | Was passiert bei „Antworten“ |
| --- | --- |
| **Handy / Hostinger-Mail** | Antwort geht an den **Original-Absender** (Kunde), nicht an inbound |
| **Unsere App** | „Antworten“ füllt `An:` mit dem gespeicherten `from_address` = Kunde |

Absender der Antwort ist weiterhin `kv@` bzw. `info@` (nicht inbound).  
`inbound@` sieht der Kunde nie — das ist nur Resend-Empfang.

Falls Hostinger eine Weiterleitung als „neu geschrieben“ macht (selten): From wird `info@` statt Kunde → dann in der App prüfen und ggf. Header `Reply-To`/`Resent-From` auswerten. Normalerweise bleibt der Kunde Absender.

## 3. Hostinger: Kopie weiterleiten

Pro Postfach:

1. `kv@fa-gretzinger.de` → Weiterleitung **Kopie behalten** an `kv@inbound.fa-gretzinger.de`
2. `info@fa-gretzinger.de` → Weiterleitung **Kopie behalten** an `info@inbound.fa-gretzinger.de`

So bleiben Originale im Hostinger-Postfach (Handy), die App bekommt die Kopie.

## 4. Vercel Env

```
RESEND_API_KEY=re_...
RESEND_FROM=Fa. Gretzinger <info@fa-gretzinger.de>
RESEND_REPLY_TO=info@fa-gretzinger.de
SUPABASE_SERVICE_ROLE_KEY=...
```

Absender für KV kommt aus dem App-Code (`kv@…`), nicht nur aus Env.

## 5. Handy (IMAP)

Hostinger → Postfach → E-Mail-Clients:

- Server/IMAP/SMTP laut Hostinger-Hilfe
- Zwei Konten: `kv@…` und `info@…`

## 7. IMAP „Gesendet“-Kopie + Inbox-Sync (App ↔ Hostinger)

### Gesendet (App → Hostinger)
Nach jedem Versand über Resend legt die API eine Kopie per IMAP APPEND in
`INBOX.Sent` (info@ oder kv@).

### Eingang (Hostinger → App)
**Synchronisieren** holt zusätzlich per IMAP die Hostinger-Inbox nach
(wichtig, weil Hostinger-Weiterleitung an Resend bei manchen Absendern wie
t-online ausbleiben kann). Resend-Webhook bleibt parallel aktiv.

### Env (`.env.local` + Vercel)

```
IMAP_HOST=imap.hostinger.com
IMAP_PORT=993
IMAP_INFO_USER=info@fa-gretzinger.de
IMAP_INFO_PASSWORD=********
IMAP_KV_USER=kv@fa-gretzinger.de
IMAP_KV_PASSWORD=********
```

## Später

- Periodischer Auto-Sync / Realtime-Badge
- Outlook-Threading, Ordner
- Langer-Filialen / Doppel-Akustiker-Check

## 8. Bounce-Benachrichtigung (nicht zustellbare E-Mails)

Wenn Resend eine ausgehende Mail nicht zustellen kann (`email.bounced`):

1. **Webhook** `POST /api/resend-events` (Resend Dashboard → Webhooks)
2. `email_logs.status` wird auf `bounced` gesetzt, `error_message` enthält deutschen Grund
3. **NDR-ähnliche E-Mail** an `info@` bzw. `kv@` (je nach Postfach) mit Empfänger, Betreff, Grund und Handlungstipps
4. **Fallback:** Bei „Synchronisieren“ prüft `/api/sync-inbound` zusätzlich kürzlich gesendete Mails bei Resend (`syncOutboundBounces`)

### Typische Ursache (kein österreichisches Sondergesetz)

Wenn nur ein Empfänger (z. B. `buchhaltung@optikbauer.at` über `mail2.itpool.at`) ablehnt,
andere `.de`/`.at`-Adressen aber ankommen und manueller Versand über `fa-gretzinger@t-online.de` klappt:

- **Empfänger-seitige Filter** (Spam/Transaktionsmail/AWS SES), nicht fehlendes SPF/DKIM bei uns
- Resend meldet oft nur `Undetermined` ohne SMTP-Detail — der IT-Partner des Empfängers muss `fa-gretzinger.de` / `amazonses.com` erlauben oder eine alternative Adresse nennen

### Resend Webhook einrichten

| URL | Events |
| --- | --- |
| `https://fa-gretzinger.vercel.app/api/resend-events` | `email.bounced`, optional `email.delivery_delayed` |

