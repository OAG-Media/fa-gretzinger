# Arbeitsregeln – Fa. Gretzinger Hörgeräte

Verbindlich für dieses Projekt.

## Regel 1: Projektplan hat Priorität
- Phasen aktuell halten; neue Wünsche sofort in `projektplan.md` eintragen.

## Regel 2: Nachfragen bei Unklarheit
- Technisch unsinnig / fehlende Zwischenschritte → kurze Frage-Antwort-Runde.

## Regel 3: Kreativ Lücken schließen
- Fehlende Steps/Tools benennen und gemeinsam lösen.

## Regel 4: Localhost
- Google Drive-Pfad (`G:\...`) bricht `npm start` / `npm install` oft.
- Dev läuft aus: `C:\Users\info\AppData\Local\fa-gretzinger-dev`
- Vor Start / nach Code-Änderungen: `src`, `api`, `scripts`, `public` und `.env.local` vom Drive-Repo dorthin syncen.
- Port App: **3001** (`PORT=3001 BROWSER=none npm start` im Local-Pfad).
- E-Mail-Dev: `npm run email:dev` → Port **3002** — ebenfalls aus dem Local-Pfad starten (nicht von `G:\...`).
- **Immer ohne Nachfrage:** Nach App-/API-Code-Änderungen kurz prüfen, ob Localhost läuft (3001 + bei E-Mail-Arbeit 3002). Fehlt einer → sofort starten, **nicht erst fragen**.
- Nur bei reinen `.md`/Diskussionen kein Restart nötig. Kill/Restart nur wenn Prozess hängt oder Env gewechselt wurde.

## Regel 5: Medien nur per Link/CDN
- Assets über BunnyCDN: `https://oag-media.b-cdn.net/fa-gretzinger/...`

## Regel 6: Projektplan ist das Gehirn
- Entscheidungen, Deployments, offene Punkte in `projektplan.md` ablegen.

## Regel 7: Git / Deploy
- Remote: `https://github.com/OAG-Media/fa-gretzinger.git` (Branch `master`)
- Vercel deployt automatisch nach Push auf `master`.
- Nur committen/pushen wenn der Nutzer es verlangt.
