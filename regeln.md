# Arbeitsregeln – Fa. Gretzinger Hörgeräte

Verbindlich für dieses Projekt.

## Regel 1: Projektplan hat Priorität
- Phasen aktuell halten; neue Wünsche sofort in `projektplan.md` eintragen.

## Regel 2: Nachfragen bei Unklarheit
- Technisch unsinnig / fehlende Zwischenschritte → kurze Frage-Antwort-Runde.

## Regel 3: Kreativ Lücken schließen
- Fehlende Steps/Tools benennen und gemeinsam lösen.

## Regel 4: Localhost
- Google Drive-Pfad (`G:\...`) bricht `npm start` oft.
- Dev läuft aus: `C:\Users\info\AppData\Local\fa-gretzinger-dev`
- Vor Start: `src` vom Drive-Repo dorthin syncen.
- Port: **3001** (3000 oft belegt). Kill/Restart nur nach App-Code-Änderungen.

## Regel 5: Medien nur per Link/CDN
- Assets über BunnyCDN: `https://oag-media.b-cdn.net/fa-gretzinger/...`

## Regel 6: Projektplan ist das Gehirn
- Entscheidungen, Deployments, offene Punkte in `projektplan.md` ablegen.

## Regel 7: Git / Deploy
- Remote: `https://github.com/OAG-Media/fa-gretzinger.git` (Branch `master`)
- Vercel deployt automatisch nach Push auf `master`.
- Nur committen/pushen wenn der Nutzer es verlangt.
