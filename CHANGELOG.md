# Changelog

## 1.1.2 — 2026-11-06

### Fixed
- **Root cause:** infinite loop in `web/app.js` — the translation `MutationObserver` rewrote texts inside the zone it was watching and re-triggered itself forever, freezing the whole NUI (character selection, then the game). The observer is now paused while it refreshes.
- Web Audio: when the effects chain failed to attach, the half-built `AudioContext` was never closed, so each retry leaked one (audio threads piling up). It is now closed on failure.
- `vehicle_states.json` grew forever (one entry per plate ever used) and was re-encoded every few seconds. Entries without a track or unused for 14 days are now removed on start and on save.
- Character selection still blocked on recent FiveM builds (default ped, no buttons): the NUI page now stays empty (`web/index.html` is a blank loader) until the player is in game, then loads the real player (`web/player.html`).

### Updating
- Replace every file except your `config.lua` (new file: `web/player.html`), then restart the server.

## 1.1.1 — 2026-11-06

### Fixed
- Recent FiveM builds: the script could block the character selection (default ped, no menu buttons). The script now waits until the player is really in game before starting its loops, turning off the GTA radio and loading YouTube in the NUI.
- The YouTube API and the notification font no longer block the NUI page from loading.

### Updating from 1.1.0
- Replace every file except your `config.lua`, then restart the server (or `restart wts_vehicleaudio`).

## 1.1.0 — 2026-10-21

### Added
- `Config.GtaRadio` — turns off GTA's native radio in vehicles:
  - `disableWheel` (default `true`): blocks the radio wheel (physical `A` on AZERTY / `Q` on QWERTY) and next / previous station.
  - `disableRadio` (default `true`): switches the vehicle's GTA radio off so it never plays over the player's music.

### Updating from 1.0.0
- Replace every file except your `config.lua`, then `restart wts_vehicleaudio`.
- Your 1.0.0 `config.lua` keeps working: if `Config.GtaRadio` is missing, both options are on. To change them, copy the `GTA NATIVE RADIO` block from the new `config.lua`.

## 1.0.0 — 2026-10-16

- First public release (GPL-3.0).
