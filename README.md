# wts_vehicleaudio

**In-vehicle YouTube audio player for FiveM — standalone, no framework required.**

**Free & open source (GPL-3.0)** · Source & releases: https://github.com/Wts-scripts/wts_vehicleaudio

Made by **WTS Scripts**
📖 Documentation: https://wtsdocs.vercel.app/wts_vehicleaudio
💬 Discord (community): https://discord.gg/5VMgt422WX
🛒 Other WTS scripts: https://wts-scripts.tebex.store

🇬🇧 [English](#english) · 🇫🇷 [Français](#français) · 🇩🇪 [Deutsch](#deutsch) · 🇪🇸 [Español](#español) · 🇮🇹 [Italiano](#italiano)

---

## English

### Features

- Play / pause, previous / next track, volume
- Shuffle and repeat modes
- Playlists management
- Play music from YouTube (links and playlists)
- Synced for everyone inside and around the vehicle
- Music keeps playing (next track, shuffle, repeat) after you step out, as long as you stay within listening range
- Sound leaks out when a door, the hood or the trunk is open
- 4-band equalizer (sub / bass / mid / treble), defaults editable in `config.lua`
- Seat switching from the UI
- Optional integration with your vehicle key / remote start script
- Notifications via **wts_notify** (free, recommended) or built-in fallback — no ox_lib; 5 UI languages (EN / FR / DE / ES / IT)
- Editable `config.lua` and `web/` (UI) — full source code included

### Requirements

- Nothing else: **no ox_lib, no framework, no database**
- The **server** must be able to reach `youtube.com` (outbound HTTPS)
- Works with ESX, QBCore, QBox or standalone

### Installation

1. Put the `wts_vehicleaudio` folder in `resources/`.
2. Add to `server.cfg`:
   ```cfg
   ensure wts_vehicleaudio
   ```
3. Edit `config.lua` (keys, distances, equalizer defaults).
4. Restart the server.

### Usage

Open the interface in a vehicle with the configured key. **Default key: `A`.**

> On an AZERTY keyboard the physical key is `Q`. Every key can be rebound in **Settings → Key Bindings → FiveM**.

### Configuration

Everything lives in `config.lua`. Main options:

| Option | Default | Description |
|---|---|---|
| `Config.Debug` | `false` | Prints debug lines in F8 / server console |
| `Config.EvictGhostDrivers` | `false` | Removes invisible peds blocking the driver seat (see below) |
| `Config.Notifications` | enabled, `center-right`, 3500 ms | Notifications: title, position, duration, `locale`. Uses **wts_notify** automatically if it is started, otherwise built-in toasts |
| `Config.KeySystem.clientExport` | — | Export used to check if the player has the vehicle keys |
| `Config.KeySystem.lightsExport` | — | Export used to control vehicle lights |
| Equalizer defaults | sub 45 Hz / 8.5 · bass 120 Hz / 7.0 · mid 1000 Hz / 3.0 · treble 8000 Hz / 3.0 | Starting EQ values |

Door button positions in the UI: `web/style.css`, block **DOOR BUTTON POSITIONS — edit here**.
Built-in notifications have a fixed look (ring timer with the WTS "W"). To customize notifications (letter, ring, colors, position…), install **wts_notify** (free on our store): it is used automatically when started.

After any change: `restart wts_vehicleaudio`.

#### Seat switching / `Config.EvictGhostDrivers`

Some resources (drive-by scripts, "keep engine running" scripts…) place an invisible ped in the driver seat when the driver moves to another seat. While that ped is there, the Driver button cannot move you back.

- `false` (default) — the ped is left alone. Switch back using your other script's own control.
- `true` — the invisible ped is removed and the seat is given back. **Do not enable with a drive-by script**, it needs that ped.

Only non-player, invisible, non-networked peds are ever considered "ghosts". Real NPCs and players are never touched.

### Exports & events

Client export: `exports.wts_vehicleaudio:Notify(message, kind)` — `kind` = `info` | `success` | `error`.

All events are prefixed `wts_vehicleaudio:`. Full list:
https://wtsdocs.vercel.app/wts_vehicleaudio/exports-and-events

### Troubleshooting

**Interface does not open** — check the resource is started, the key in `config.lua`, and the F8 console. A notification tells you if you are not in a vehicle or have no access to it.

**No sound / network error** — the server cannot reach `youtube.com`.

**Can't switch back to the driver seat** — another resource holds the seat with an invisible ped. Set `Config.Debug = true`, try again and check F8: `seat -1 refused: occupied by ped <id> | script=NAME` tells you which resource owns it. See *Seat switching* above.

More: https://wtsdocs.vercel.app/wts_vehicleaudio/troubleshooting

### Support & license

**This is a free package: no support is provided.** No tickets, no priority help. If you find a bug, open an issue on GitHub (https://github.com/Wts-scripts/wts_vehicleaudio/issues) with your artifacts version, resource version and F8 / server console output — we'll look at it when we can. Discord support tickets are reserved for paid WTS scripts.

**License: GPL-3.0-or-later** (see `LICENSE`). You may use it on any server, read it, modify it and redistribute it, as long as you keep this license and credit WTS Scripts. You may not sell it as a closed-source or escrowed script.

**Disclaimer.** This resource plays audio from YouTube links provided by players. You are responsible for how it is used on your server and for complying with YouTube's Terms of Service and the copyright laws that apply to you. WTS Scripts does not host, distribute or monetise any media. This resource is **not sold** anywhere — if someone charges you for it, you are being scammed.

---

## Français

Documentation complète (en anglais) : https://wtsdocs.vercel.app/wts_vehicleaudio

### Installation

1. Placez le dossier `wts_vehicleaudio` dans `resources/`.
2. Ajoutez dans `server.cfg` :
   ```cfg
   ensure wts_vehicleaudio
   ```
3. Modifiez `config.lua` (touches, distances, égaliseur).
4. Redémarrez le serveur.

Le **serveur** doit pouvoir joindre `youtube.com`. Aucun framework requis.

### Utilisation

Ouvrez l'interface dans un véhicule avec la touche configurée. **Touche par défaut : `A`** (sur clavier AZERTY, c'est la touche physique `Q`). Les touches se modifient dans **Paramètres → Touches → FiveM**.

Fonctions : lecture / pause, piste précédente / suivante, volume, aléatoire, répétition, playlists, musique depuis YouTube, égaliseur, changement de siège, audio du véhicule (portes, capot, coffre).

### Configuration

Tout se trouve dans `config.lua`. Après modification : `restart wts_vehicleaudio`.

`Config.EvictGhostDrivers` (défaut `false`) : certains scripts (drive-by, moteur qui reste allumé) placent un ped invisible au volant. Laissez `false` si vous utilisez un script de drive-by ; passez à `true` uniquement pour retirer ce ped automatiquement.

### Dépannage

- **L'interface ne s'ouvre pas** : vérifiez que la resource est démarrée, la touche dans `config.lua`, et la console F8.
- **Pas de son** : le serveur n'arrive pas à joindre `youtube.com`.
- **Impossible de revenir au siège conducteur** : un autre script occupe le siège avec un ped invisible. `Config.Debug = true` puis regardez la ligne `seat -1 refused … script=NOM` dans F8.

Support : package gratuit, **sans SAV**. Bugs → issues GitHub : https://github.com/Wts-scripts/wts_vehicleaudio/issues. Licence GPL-3.0 (voir `LICENSE`).

---

## Deutsch

Vollständige Dokumentation (Englisch): https://wtsdocs.vercel.app/wts_vehicleaudio

### Installation

1. Ordner `wts_vehicleaudio` nach `resources/` kopieren.
2. In `server.cfg` eintragen:
   ```cfg
   ensure wts_vehicleaudio
   ```
3. `config.lua` anpassen (Tasten, Distanzen, Equalizer).
4. Server neu starten.

Der **Server** muss `youtube.com` erreichen können. Kein Framework erforderlich.

### Verwendung

Oberfläche im Fahrzeug mit der konfigurierten Taste öffnen. **Standardtaste: `A`** (QWERTY-Bezeichnung). Tasten lassen sich unter **Einstellungen → Tastenbelegung → FiveM** ändern.

Funktionen: Abspielen / Pause, vorheriger / nächster Titel, Lautstärke, Zufallswiedergabe, Wiederholung, Playlists, Musik von YouTube, Equalizer, Sitzwechsel, Fahrzeug-Audio (Türen, Motorhaube, Kofferraum).

### Konfiguration

Alles in `config.lua`. Nach Änderungen: `restart wts_vehicleaudio`.

`Config.EvictGhostDrivers` (Standard `false`): manche Scripts (Drive-by, Motor-an-lassen) setzen einen unsichtbaren Ped auf den Fahrersitz. Bei einem Drive-by-Script auf `false` lassen; nur auf `true` setzen, wenn dieser Ped automatisch entfernt werden soll.

### Fehlerbehebung

- **Oberfläche öffnet sich nicht**: prüfen, ob die Resource gestartet ist, die Taste in `config.lua` und die F8-Konsole.
- **Kein Ton**: der Server erreicht `youtube.com` nicht.
- **Rückkehr auf den Fahrersitz nicht möglich**: ein anderes Script belegt den Sitz mit einem unsichtbaren Ped. `Config.Debug = true` setzen und in F8 die Zeile `seat -1 refused … script=NAME` prüfen.

Support: kostenloses Paket, **kein Support**. Bugs → GitHub Issues: https://github.com/Wts-scripts/wts_vehicleaudio/issues. Lizenz GPL-3.0 (siehe `LICENSE`).

---

## Español

Documentación completa (en inglés): https://wtsdocs.vercel.app/wts_vehicleaudio

### Instalación

1. Coloca la carpeta `wts_vehicleaudio` en `resources/`.
2. Añade en `server.cfg`:
   ```cfg
   ensure wts_vehicleaudio
   ```
3. Edita `config.lua` (teclas, distancias, ecualizador).
4. Reinicia el servidor.

El **servidor** debe poder acceder a `youtube.com`. No requiere framework.

### Uso

Abre la interfaz dentro de un vehículo con la tecla configurada. **Tecla predeterminada: `A`**. Las teclas se cambian en **Ajustes → Controles → FiveM**.

Funciones: reproducir / pausar, pista anterior / siguiente, volumen, aleatorio, repetición, playlists, música desde YouTube, ecualizador, cambio de asiento, audio del vehículo (puertas, capó, maletero).

### Configuración

Todo está en `config.lua`. Tras cualquier cambio: `restart wts_vehicleaudio`.

`Config.EvictGhostDrivers` (por defecto `false`): algunos scripts (drive-by, motor encendido) colocan un ped invisible en el asiento del conductor. Déjalo en `false` si usas un script de drive-by; ponlo en `true` solo para eliminar ese ped automáticamente.

### Solución de problemas

- **La interfaz no se abre**: comprueba que el recurso está iniciado, la tecla en `config.lua` y la consola F8.
- **Sin sonido**: el servidor no puede acceder a `youtube.com`.
- **No se puede volver al asiento del conductor**: otro script ocupa el asiento con un ped invisible. Activa `Config.Debug = true` y mira la línea `seat -1 refused … script=NOMBRE` en F8.

Soporte: paquete gratuito, **sin soporte**. Bugs → issues de GitHub: https://github.com/Wts-scripts/wts_vehicleaudio/issues. Licencia GPL-3.0 (ver `LICENSE`).

---

## Italiano

Documentazione completa (in inglese): https://wtsdocs.vercel.app/wts_vehicleaudio

### Installazione

1. Inserisci la cartella `wts_vehicleaudio` in `resources/`.
2. Aggiungi in `server.cfg`:
   ```cfg
   ensure wts_vehicleaudio
   ```
3. Modifica `config.lua` (tasti, distanze, equalizzatore).
4. Riavvia il server.

Il **server** deve poter raggiungere `youtube.com`. Nessun framework richiesto.

### Utilizzo

Apri l'interfaccia in un veicolo con il tasto configurato. **Tasto predefinito: `A`**. I tasti si modificano in **Impostazioni → Comandi → FiveM**.

Funzioni: riproduci / pausa, brano precedente / successivo, volume, casuale, ripetizione, playlist, musica da YouTube, equalizzatore, cambio posto, audio del veicolo (porte, cofano, bagagliaio).

### Configurazione

Tutto si trova in `config.lua`. Dopo ogni modifica: `restart wts_vehicleaudio`.

`Config.EvictGhostDrivers` (predefinito `false`): alcuni script (drive-by, motore acceso) mettono un ped invisibile al posto di guida. Lascia `false` se usi uno script di drive-by; imposta `true` solo per rimuovere automaticamente quel ped.

### Risoluzione dei problemi

- **L'interfaccia non si apre**: verifica che la resource sia avviata, il tasto in `config.lua` e la console F8.
- **Nessun suono**: il server non raggiunge `youtube.com`.
- **Impossibile tornare al posto di guida**: un altro script occupa il posto con un ped invisibile. Imposta `Config.Debug = true` e controlla la riga `seat -1 refused … script=NOME` in F8.

Supporto: pacchetto gratuito, **nessun supporto**. Bug → issue GitHub: https://github.com/Wts-scripts/wts_vehicleaudio/issues. Licenza GPL-3.0 (vedi `LICENSE`).

---

© WTS Scripts — wts_vehicleaudio
