--[[
    wts_vehicleaudio - in-vehicle audio player for FiveM
    Copyright (C) 2026 WTS Scripts (Whippin The Sauce)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
    <https://www.gnu.org/licenses/gpl-3.0.html>
]]

Config = {}

-- ==========================================
-- VEHICLE AUDIO
-- ==========================================

Config.Debug = false

-- Command to open/close the interface
Config.Command = 'caraudio'

-- Key to open the interface
Config.OpenKey = 'A'

-- ==========================================
-- GTA NATIVE RADIO
-- ==========================================

-- The GTA radio wheel sits on the physical A key on
-- AZERTY keyboards (Q on QWERTY) and can pop up while
-- you use the player. These options turn it off.
Config.GtaRadio = {
    -- Block the GTA radio wheel and station switching in vehicles
    disableWheel = true,

    -- Fully turn off the GTA radio in vehicles
    -- (so it never plays over the player's music)
    disableRadio = true
}

-- Maximum distance at which the vehicle can be heard
Config.MaxDistance = 25.0

-- Maximum volume
Config.MaxVolume = 1.0

-- Initial volume
Config.DefaultVolume = 0.75

-- ==========================================
-- NOTIFICATIONS (built-in, no dependency)
-- ==========================================

Config.Notifications = {
    enabled = true,

    -- Use wts_notify if it is started (unified style).
    -- Otherwise the script shows its own notifications.
    useWtsNotify = true,

    -- Notification language when they go through wts_notify:
    -- 'en' | 'fr' | 'de' | 'es' | 'it'
    -- (internally, the language follows the one chosen in the player)
    locale = 'en',

    -- Title shown at the top of every notification
    title = 'WTS Vehicle Audio',

    -- 'center-right' | 'center-left' | 'top-right'
    -- | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center'
    position = 'center-right',

    -- Display duration (ms)
    duration = 3500
}

-- ==========================================
-- PLAY/PAUSE KEY
-- ==========================================

Config.PlayPauseKey = 'MEDIA_PLAY_PAUSE' -- Play/Pause key of the multimedia keyboard
-- Other examples: 'K', 'NUMPAD0', 'F7'...
-- List of names: https://docs.fivem.net/docs/game-references/input-mapper-parameter-ids/keyboard/

-- ==========================================
-- AUDIO
-- ==========================================

Config.DefaultStation = nil

-- Automatic playback when the audio engine
-- receives a start request
Config.AutoPlay = true

-- ==========================================
-- INTERFACE
-- ==========================================

-- Allow closing the interface with the Escape key
Config.CloseWithEscape = true

-- ==========================================
-- OUTSIDE AUDIO DISTANCE
-- ==========================================

Config.AudioDistance = {
    veryClose = 1.5,
    close = 3.0,
    medium = 7.0,
    far = 12.0
}

-- ==========================================
-- PLAYER POSITION / DRAGGING
-- ==========================================

Config.PlayerWindow = {

    -- Enable dragging with the mouse
    draggable = true,

    -- Initial position
    -- 0.50 = center of the screen
    x = 0.50,
    y = 0.50,

    -- Remember the position chosen by the player
    savePosition = true
}

-- ==========================================
-- SEAT SWITCHING
-- ==========================================

-- Some scripts (drive-by, engine kept running...)
-- place an invisible ped in the driver seat when the driver
-- leaves their seat. While that ped is there, the player's
-- "Driver" button cannot put you back behind the wheel.
--
-- false (default): this ped is left alone. Getting back to the
--                  driver seat is done through the means
--                  provided by the other script.
-- true           : the ghost ped is deleted to free the
--                  seat. DO NOT enable with a drive-by
--                  script, which needs it.
Config.EvictGhostDrivers = false

-- ==========================================
-- DRIVE CONTROL
-- ==========================================

-- Keep control of the vehicle (accelerate/brake/
-- honk...) while the interface is open
Config.KeepInputWhileOpen = true

-- ==========================================
-- EQUALIZER / AUDIO ENHANCEMENT
-- ==========================================

Config.AudioEffects = {

    enabled = true,

    -- 🎵 BASS
    bass = {
        enabled = true,
        frequency = 120,
        gain = 7.0
    },

    -- 🔊 SUBWOOFER
    subwoofer = {
        enabled = true,
        frequency = 45,
        gain = 8.5
    },

    -- 🎚️ MEDIUM
    mid = {
        enabled = true,
        frequency = 1000,
        gain = 3.0
    },

    -- 🔊 TREBLE
    treble = {
        enabled = true,
        frequency = 8000,
        gain = 3.0
    }
}

-- ==========================================
-- KEY SYSTEM (optional)
-- ==========================================

-- wts_vehicleaudio stays independent: if the resource
-- is not started, only the vehicle occupants
-- can control the audio. If it is started,
-- the holder of a key can also control it
-- remotely (remote start, remote control).
Config.KeySystem = {
    enabled = true,
    resource = 'wts_vehiclekeys',

    -- SERVER export: (source, plate) → boolean
    -- Allows remote control (outside the vehicle).
    export = 'hasValidKey',

    -- CLIENT export: (vehicle) → boolean
    -- Marks the vehicle as "yours" in the interface
    -- (automatic access).
    clientExport = 'hasKeyForVehicle',

    -- CLIENT export: (mode, vehicle, silent)
    -- mode = 'hazard' | 'off'. Only used if
    -- Config.SyncLightsWithKeySystem is enabled.
    lightsExport = 'SetVehicleLightsMode'
}

-- Sync the player's "hazards" button with
-- the wts_vehiclekeys lights menu if present.
Config.SyncLightsWithKeySystem = true

-- ==========================================
-- AUDIO FOR BYSTANDERS
-- ==========================================

-- Vehicles playing music nearby are heard
-- by players who are not inside them.
Config.RemoteListening = {
    enabled = true,

    -- Discovery / listening distance (game units)
    distance = 30.0,

    -- Beyond this distance, the vehicle's player
    -- is stopped and released client-side
    stopDistance = 45.0,

    -- Scan interval for nearby vehicles (ms)
    scanInterval = 1500
}
