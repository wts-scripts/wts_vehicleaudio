# Changelog

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
