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

local audioOpen = false

-- ==========================================
-- AUDIO SOURCE VEHICLE
-- (declared here: it is used by the audioControl
-- callback higher up in the file, which
-- previously wrote global variables)
-- ==========================================

local audioSourceVehicleId = nil
local audioSourceVehicleEntity = nil

-- ==========================================
-- REMOTE LISTENING (bystanders)
-- ==========================================

local remoteActive = {}        -- vehicleId → true if a remote NUI player is active
local stateRequested = {}      -- vehicleId → GetGameTimer() of the last request
local sendRemoteState          -- defined below
local updateRemoteListening

-- ==========================================
-- AUDIO DISTANCE CONFIGURATION
-- ==========================================

local function sendAudioDistanceConfig()

    SendNUIMessage({
        action = 'vehicleAudioDistanceConfig',

        config = {
            veryClose = Config.AudioDistance.veryClose,
            close = Config.AudioDistance.close,
            medium = Config.AudioDistance.medium,
            far = Config.AudioDistance.far
        }
    })

end

-- ==========================================
-- AUDIO EFFECTS CONFIGURATION
-- ==========================================

local function sendAudioEffectsConfig()

    local effects = Config.AudioEffects or {}

    SendNUIMessage({
        action = 'vehicleAudioEffectsConfig',

        config = {
            enabled = effects.enabled ~= false,

            bass = {
                enabled = effects.bass and effects.bass.enabled ~= false,
                frequency = effects.bass and effects.bass.frequency or 120,
                gain = effects.bass and effects.bass.gain or 7.0
            },

            subwoofer = {
                enabled = effects.subwoofer and effects.subwoofer.enabled ~= false,
                frequency = effects.subwoofer and effects.subwoofer.frequency or 45,
                gain = effects.subwoofer and effects.subwoofer.gain or 8.5
            },

            mid = {
                enabled = effects.mid and effects.mid.enabled ~= false,
                frequency = effects.mid and effects.mid.frequency or 1000,
                gain = effects.mid and effects.mid.gain or 3.0
            },

            treble = {
                enabled = effects.treble and effects.treble.enabled ~= false,
                frequency = effects.treble and effects.treble.frequency or 8000,
                gain = effects.treble and effects.treble.gain or 3.0
            }
        }
    })

end

VehicleAudio = VehicleAudio or {}

local vehiclePermissions = {}
local vehicleStates = {}
local vehicleDoorStates = {}

local function getVehicleId(vehicle)
    if not vehicle
        or vehicle == 0
        or not DoesEntityExist(vehicle)
    then
        return nil
    end

    local netId = NetworkGetNetworkIdFromEntity(vehicle)

    if netId and netId ~= 0 then
        return netId
    end

    return vehicle
end

local function getVehiclePlate(vehicle)

    if not vehicle
        or vehicle == 0
        or not DoesEntityExist(vehicle)
    then
        return nil
    end

    local plate = GetVehicleNumberPlateText(vehicle)

    if not plate then
        return nil
    end

    return plate:gsub('^%s+', ''):gsub('%s+$', '')
end

function VehicleAudio:IsVehicle(vehicle)
    if not vehicle or vehicle == 0 then
        return false
    end

    if not DoesEntityExist(vehicle) then
        return false
    end

    return IsEntityAVehicle(vehicle)
end

function VehicleAudio:GetCurrentVehicle()
    local vehicle = GetVehiclePedIsIn(
        PlayerPedId(),
        false
    )

    if vehicle == 0 then
        return nil
    end

    return vehicle
end

function VehicleAudio:GetVehicleId(vehicle)
    return getVehicleId(vehicle)
end

function VehicleAudio:IsLocked(vehicle)
    if not self:IsVehicle(vehicle) then
        return false
    end

    local lockStatus = GetVehicleDoorLockStatus(vehicle)

    if lockStatus == 0
        or lockStatus == 1
    then
        return false
    end

    return true
end

function VehicleAudio:SetAllowed(vehicle, allowed)
    if not self:IsVehicle(vehicle) then
        return false
    end

    local vehicleId = getVehicleId(vehicle)

    if not vehicleId then
        return false
    end

    vehiclePermissions[vehicleId] = allowed == true

    return true
end

function VehicleAudio:ClearAllowed(vehicle)
    if not self:IsVehicle(vehicle) then
        return false
    end

    local vehicleId = getVehicleId(vehicle)

    if not vehicleId then
        return false
    end

    vehiclePermissions[vehicleId] = nil

    return true
end

function VehicleAudio:IsAllowed(vehicle)
    if not self:IsVehicle(vehicle) then
        return false
    end

    local vehicleId = getVehicleId(vehicle)

    if not vehicleId then
        return false
    end

    local permission = vehiclePermissions[vehicleId]

    if permission == nil then
        return true
    end

    return permission == true
end

function VehicleAudio:CanUse(vehicle)
    if not self:IsVehicle(vehicle) then
        return false
    end

    if not self:IsAllowed(vehicle) then
        return false
    end

    return true
end

-- ==========================================
-- NOTIFICATIONS
-- ==========================================
-- If wts_notify is started, notifications go through it
-- (unified style across the whole server). Otherwise the script shows
-- its own built-in notifications (no dependency).

local NOTIFY_TEXT = {
    notInVehicle = {
        en = 'You must be in a vehicle',
        fr = 'Tu dois être dans un véhicule',
        de = 'Du musst in einem Fahrzeug sein',
        es = 'Debes estar en un vehículo',
        it = 'Devi essere in un veicolo'
    },
    noAccess = {
        en = "You can't control this vehicle's audio",
        fr = "Tu n'as pas accès à l'audio de ce véhicule",
        de = 'Du hast keinen Zugriff auf das Audio dieses Fahrzeugs',
        es = 'No tienes acceso al audio de este vehículo',
        it = "Non hai accesso all'audio di questo veicolo"
    },
    seatOccupied = {
        en = 'This seat is occupied',
        fr = 'Ce siège est occupé',
        de = 'Dieser Sitz ist besetzt',
        es = 'Este asiento está ocupado',
        it = 'Questo posto è occupato'
    }
}

local function notifyEnabled()
    return Config.Notifications
        and Config.Notifications.enabled ~= false
end

local function useWtsNotify()
    return Config.Notifications
        and Config.Notifications.useWtsNotify ~= false
        and GetResourceState('wts_notify') == 'started'
end

local function sendNotification(payload)
    if useWtsNotify() then
        exports.wts_notify:Notify({
            title    = payload.title,
            message  = payload.text,
            type     = payload.kind,
            duration = payload.duration,
            position = payload.position
        })
        return
    end

    SendNUIMessage({
        action   = 'notify',
        key      = payload.key,
        text     = payload.text,
        kind     = payload.kind,
        title    = payload.title,
        position = payload.position,
        duration = payload.duration
    })
end

-- key  : NOTIFY_TEXT key (translated according to Config.Notifications.locale)
-- kind : 'info' | 'success' | 'error'
local function Notify(key, kind)
    if not notifyEnabled() then return end

    local texts = NOTIFY_TEXT[key]
    local locale = Config.Notifications.locale or 'en'
    local text = texts and (texts[locale] or texts.en) or key

    sendNotification({
        key      = key,
        text     = useWtsNotify() and text or nil, -- internally, the NUI translates according to the player language
        kind     = kind or 'info',
        title    = Config.Notifications.title,
        position = Config.Notifications.position,
        duration = Config.Notifications.duration
    })
end

-- Export for other resources:
-- exports.wts_vehicleaudio:Notify('Free text', 'success')
exports('Notify', function(message, kind)
    if not notifyEnabled() then return end

    sendNotification({
        text     = message,
        kind     = kind or 'info',
        title    = Config.Notifications.title,
        position = Config.Notifications.position,
        duration = Config.Notifications.duration
    })
end)

function VehicleAudio:GetState(vehicle)
    if not self:IsVehicle(vehicle) then
        return nil
    end

    local vehicleId = getVehicleId(vehicle)

    if not vehicleId then
        return nil
    end

    if not vehicleStates[vehicleId] then
        vehicleStates[vehicleId] = {
            videoId = nil,
            title = nil,
            artist = nil,
            thumbnail = nil,
            playing = false,
            currentTime = 0.0,
            volume = Config.DefaultVolume,
            shuffle = false,
            repeatMode = 'off'
        }
    end

    return vehicleStates[vehicleId]
end

function VehicleAudio:SetState(vehicle, state)
    if not self:IsVehicle(vehicle) then
        return false
    end

    if type(state) ~= 'table' then
        return false
    end

    local vehicleId = getVehicleId(vehicle)

    if not vehicleId then
        return false
    end

    vehicleStates[vehicleId] = state

    return true
end

function VehicleAudio:SetStateValue(vehicle, key, value)
    if not self:IsVehicle(vehicle) then
        return false
    end

    if type(key) ~= 'string' then
        return false
    end

    local state = self:GetState(vehicle)

    if not state then
        return false
    end

    state[key] = value

    return true
end

function VehicleAudio:GetStateValue(vehicle, key)
    local state = self:GetState(vehicle)

    if not state then
        return nil
    end

    return state[key]
end

function VehicleAudio:ClearState(vehicle)
    if not self:IsVehicle(vehicle) then
        return false
    end

    local vehicleId = getVehicleId(vehicle)

    if not vehicleId then
        return false
    end

    vehicleStates[vehicleId] = nil

    return true
end

exports(
    'IsVehicleAudioAllowed',
    function(vehicle)
        return VehicleAudio:IsAllowed(vehicle)
    end
)

exports(
    'SetVehicleAudioAllowed',
    function(vehicle, allowed)
        return VehicleAudio:SetAllowed(
            vehicle,
            allowed
        )
    end
)

exports(
    'ClearVehicleAudioAllowed',
    function(vehicle)
        return VehicleAudio:ClearAllowed(vehicle)
    end
)

exports(
    'CanUseVehicleAudio',
    function(vehicle)
        return VehicleAudio:CanUse(vehicle)
    end
)

exports(
    'IsVehicleAudioLocked',
    function(vehicle)
        return VehicleAudio:IsLocked(vehicle)
    end
)

exports(
    'GetVehicleAudioVehicle',
    function()
        return VehicleAudio:GetCurrentVehicle()
    end
)

exports(
    'GetVehicleAudioState',
    function(vehicle)
        return VehicleAudio:GetState(vehicle)
    end
)

exports(
    'SetVehicleAudioState',
    function(vehicle, state)
        return VehicleAudio:SetState(
            vehicle,
            state
        )
    end
)

exports(
    'ClearVehicleAudioState',
    function(vehicle)
        return VehicleAudio:ClearState(vehicle)
    end
)

RegisterNetEvent(
    'wts_vehicleaudio:setAllowed',
    function(vehicle, allowed)
        VehicleAudio:SetAllowed(
            vehicle,
            allowed
        )
    end
)

RegisterNetEvent(
    'wts_vehicleaudio:clearAllowed',
    function(vehicle)
        VehicleAudio:ClearAllowed(vehicle)
    end
)

local function sendVehicleState()
    local vehicle =
        VehicleAudio:GetCurrentVehicle()

    if not vehicle then
        return
    end

    local state =
        VehicleAudio:GetState(vehicle)

    if not state then
        return
    end

    local vehicleId =
        getVehicleId(vehicle)

    if not vehicleId then
        return
    end

    SendNUIMessage({
        action = 'vehicleState',

        vehicleId =
            vehicleId,

        state = {
            videoId = state.videoId,
            title = state.title,
            artist = state.artist,
            thumbnail = state.thumbnail,
            playing = state.playing,
            currentTime = state.currentTime,
            volume = state.volume,
            shuffle = state.shuffle,
            repeatMode = state.repeatMode
        }
    })
end

local function openAudio()
    if audioOpen then
        return
    end

    local vehicle =
        VehicleAudio:GetCurrentVehicle()

    if not vehicle then
        Notify('notInVehicle', 'info')
        return
    end

    if not VehicleAudio:CanUse(vehicle) then
        Notify('noAccess', 'error')
        return
    end

    audioOpen = true

	SetNuiFocus(
		true,
		true
	)

	SetNuiFocusKeepInput(false)

    SendNUIMessage({
        action = 'open'
    })

	SendNUIMessage({
    action = 'windowConfig',

    config = {
        draggable =
            Config.PlayerWindow.draggable == true,

        x =
            Config.PlayerWindow.x,

        y =
            Config.PlayerWindow.y,

        savePosition =
            Config.PlayerWindow.savePosition == true,

        closeWithEscape =
            Config.CloseWithEscape == true
    }
})

    sendAudioDistanceConfig()
    sendAudioEffectsConfig()

    sendVehicleState()

    TriggerServerEvent(
        'wts_vehicleaudio:requestPlaylist'
    )

    local vehicleId =
        getVehicleId(vehicle)

    if vehicleId then
        TriggerServerEvent(
            'wts_vehicleaudio:requestVehicleState',
            vehicleId,
            getVehiclePlate(vehicle)
        )
    end
end

local function closeAudio()
    if not audioOpen then
        return
    end

    audioOpen = false

	SetNuiFocus(
		false,
		false
	)

	SetNuiFocusKeepInput(false)

    SendNUIMessage({
        action = 'close'
    })
end

RegisterCommand(
    Config.Command,
    function()
        if audioOpen then
            closeAudio()
        else
            openAudio()
        end
    end,
    false
)

RegisterKeyMapping(
    Config.Command,
    'Vehicle audio: open player',
    'keyboard',
    Config.OpenKey
)

RegisterNUICallback(
    'close',
    function(_, cb)
        closeAudio()
        cb('ok')
    end
)

RegisterNUICallback(
    'ready',
    function(_, cb)
        cb('ok')
    end
)

RegisterNUICallback(
    'savePlaylist',
    function(data, cb)
        if type(data) ~= 'table' then
            cb('error')
            return
        end

        local playlist = data.playlist

        if type(playlist) ~= 'table' then
            cb('error')
            return
        end

        TriggerServerEvent(
            'wts_vehicleaudio:savePlaylist',
            playlist
        )

        cb('ok')
    end
)

RegisterNUICallback(
    'requestMetadata',
    function(data, cb)
        if type(data) ~= 'table' then
            cb('error')
            return
        end

        if not data.videoId then
            cb('error')
            return
        end

        if not data.requestId then
            cb('error')
            return
        end

        TriggerServerEvent(
            'wts_vehicleaudio:requestMetadata',
            data.videoId,
            data.requestId
        )

        cb('ok')
    end
)

RegisterNUICallback(
    'requestVehicleState',
    function(data, cb)

        local vehicle = VehicleAudio:GetCurrentVehicle()

        if not vehicle then
            cb('ok')
            return
        end

        local vehicleId = getVehicleId(vehicle)

        if not vehicleId then
            cb('ok')
            return
        end

        TriggerServerEvent(
            'wts_vehicleaudio:requestVehicleState',
            vehicleId,
            getVehiclePlate(vehicle)
        )

        cb('ok')

    end
)

-- ==========================================
-- AUDIO KEEPER
-- When the player leaves a vehicle whose music is
-- playing, they keep "driving" its playlist (next
-- track, repeat, position sync) as long as nobody
-- else is inside and they stay within listening
-- range. Without this, the music stopped at the
-- end of the current track as soon as the vehicle
-- was empty.
-- ==========================================

local keeperVehicleId = nil
local keeperVehicleEntity = nil

local function vehicleHasPlayerOccupant(vehicle)
    local maxSeats = GetVehicleMaxNumberOfPassengers(vehicle)
    for seat = -1, maxSeats - 1 do
        local occupant = GetPedInVehicleSeat(vehicle, seat)
        if occupant ~= 0 and IsPedAPlayer(occupant) then
            return true
        end
    end
    return false
end

local function getKeeperVehicle()
    if not keeperVehicleId or not keeperVehicleEntity then
        return nil
    end

    local vehicle = keeperVehicleEntity

    if not DoesEntityExist(vehicle)
        or getVehicleId(vehicle) ~= keeperVehicleId then
        keeperVehicleId = nil
        keeperVehicleEntity = nil
        return nil
    end

    if vehicleHasPlayerOccupant(vehicle) then
        return nil
    end

    local maxDistance =
        (Config.RemoteListening and Config.RemoteListening.distance or 30.0)

    local distance = #(GetEntityCoords(PlayerPedId()) - GetEntityCoords(vehicle))

    if distance > maxDistance then
        return nil
    end

    return vehicle
end

RegisterNUICallback(
    'audioControl',
    function(data, cb)

        if type(data) ~= 'table' then
            cb('error')
            return
        end

        local vehicle =
            VehicleAudio:GetCurrentVehicle()

        -- Outside: only the audio keeper may keep the
        -- playlist going for the vehicle they just left.
        if not vehicle then
            vehicle = getKeeperVehicle()
        end

        if not vehicle then
            cb('ok')
            return
        end

        if not VehicleAudio:CanUse(vehicle) then
            cb('ok')
            return
        end

        local vehicleId =
            getVehicleId(vehicle)

        if not vehicleId then
            cb('ok')
            return
        end

        -- ======================================
        -- AUDIO SOURCE VEHICLE
        -- ======================================

        audioSourceVehicleId =
            vehicleId

        audioSourceVehicleEntity =
            vehicle

        local updates = {}

        -- ======================================
        -- PLAY
        -- ======================================

        if data.action == 'play' then

            updates.playing = true

        end

        -- ======================================
        -- PAUSE
        -- ======================================

        if data.action == 'pause' then

            updates.playing = false

        end

        if data.action == 'volume' then

            local volume =
                tonumber(data.volume)

            if not volume then
                cb('ok')
                return
            end

            volume =
                math.max(
                    0.0,
                    math.min(
                        1.0,
                        volume
                    )
                )

            updates.volume =
                volume

        end

        if data.action == 'currentTime' then

            local currentTime =
                tonumber(data.currentTime)

            if not currentTime then
                cb('ok')
                return
            end

            if currentTime < 0 then
                currentTime = 0.0
            end

            updates.currentTime =
                currentTime

        end

        if data.action == 'shuffle' then

            if type(data.shuffle) ~= 'boolean' then
                cb('ok')
                return
            end

            updates.shuffle =
                data.shuffle

        end

        if data.action == 'repeat' then

            if
                data.repeatMode ~= 'off'
                and data.repeatMode ~= 'all'
                and data.repeatMode ~= 'one'
            then
                cb('ok')
                return
            end

            updates.repeatMode =
                data.repeatMode

        end

        -- ======================================
        -- TRACK
        -- ======================================

        if data.action == 'track' then

            if not data.videoId then
                cb('ok')
                return
            end

            updates.videoId =
                data.videoId

            updates.title =
                data.title

            updates.artist =
                data.artist

            updates.thumbnail =
                data.thumbnail

            updates.playing =
                true

            updates.currentTime =
                0.0

        end

        if next(updates) then

            -- ======================================
            -- LOCAL CACHE UPDATE
            -- The server does NOT rebroadcast this
            -- update to its own author (only
            -- to other players). Without this local merge,
            -- the local cache (vehicleStates) stayed
            -- stale for the player who just acted,
            -- and sendVehicleState() returned that old
            -- state (e.g. "playing = false") on the
            -- next opening of the interface, while
            -- the music was actually still
            -- playing.
            -- ======================================

            local localState =
                VehicleAudio:GetState(vehicle)

            if localState then

                for key, value in pairs(updates) do
                    localState[key] = value
                end

            end

            TriggerServerEvent(
                'wts_vehicleaudio:updateVehicleState',
                vehicleId,
                updates,
                getVehiclePlate(vehicle)
            )

        end

        cb('ok')

    end
)

RegisterNetEvent(
    'wts_vehicleaudio:loadPlaylist',
    function(playlist)

        if type(playlist) ~= 'table' then
            playlist = {}
        end

        SendNUIMessage({
            action = 'loadPlaylist',
            playlist = playlist
        })

    end
)

RegisterNetEvent(
    'wts_vehicleaudio:metadataResult',
    function(
        requestId,
        videoId,
        metadata
    )

        SendNUIMessage({
            action = 'metadataResult',
            requestId = requestId,
            videoId = videoId,
            metadata = metadata
        })

    end
)

RegisterNetEvent(
    'wts_vehicleaudio:syncVehicleState',
    function(
        netId,
        state
    )

        if type(netId) ~= 'number' then
            return
        end

        if type(state) ~= 'table' then
            return
        end

        local currentVehicle =
            VehicleAudio:GetCurrentVehicle()

        local isCurrent =
            currentVehicle ~= nil
            and getVehicleId(currentVehicle) == netId

        -- An empty state (no track) of a vehicle
        -- that is not ours is not kept:
        -- it generates neither a player nor distance messages.
        if not isCurrent
            and (not state.videoId or state.videoId == '')
            and not vehicleStates[netId]
        then
            return
        end

        vehicleStates[netId] = state

        if isCurrent then
            sendVehicleState()
            return
        end

        -- Bystander: apply the state to the remote player
        -- if the vehicle is within listening range.
        if remoteActive[netId] then
            sendRemoteState(netId, state)
        else
            updateRemoteListening(netId)
        end

    end
)

RegisterNetEvent(
    'wts_vehicleaudio:removeVehicleState',
    function(netId)

        if type(netId) ~= 'number' then
            return
        end

        vehicleStates[netId] = nil
        vehicleDoorStates[netId] = nil

    end
)

-- ==========================================
-- REMOTE LISTENING: HELPERS
-- ==========================================

local function remoteListeningEnabled()
    return Config.RemoteListening
        and Config.RemoteListening.enabled ~= false
end

sendRemoteState = function(vehicleId, state)

    SendNUIMessage({
        action = 'remoteVehicleState',
        vehicleId = vehicleId,
        state = {
            videoId = state.videoId,
            title = state.title,
            artist = state.artist,
            thumbnail = state.thumbnail,
            playing = state.playing,
            currentTime = state.currentTime,
            volume = state.volume,
            shuffle = state.shuffle,
            repeatMode = state.repeatMode
        }
    })

end

local function stopRemoteListening(vehicleId)

    if not remoteActive[vehicleId] then
        return
    end

    remoteActive[vehicleId] = nil

    SendNUIMessage({
        action = 'remoteVehicleStop',
        vehicleId = vehicleId
    })

end

-- Enables / disables the remote player of a known
-- vehicle depending on its distance to the player.
updateRemoteListening = function(vehicleId)

    if not remoteListeningEnabled() then
        return
    end

    local state = vehicleStates[vehicleId]

    if not state or not state.videoId or state.videoId == '' then
        stopRemoteListening(vehicleId)
        return
    end

    if not NetworkDoesEntityExistWithNetworkId(vehicleId) then
        stopRemoteListening(vehicleId)
        return
    end

    local vehicle = NetworkGetEntityFromNetworkId(vehicleId)

    if not VehicleAudio:IsVehicle(vehicle) then
        stopRemoteListening(vehicleId)
        return
    end

    -- Our current vehicle is handled by applyVehicleState
    if VehicleAudio:GetCurrentVehicle() == vehicle then
        remoteActive[vehicleId] = nil
        return
    end

    local distance =
        #(GetEntityCoords(PlayerPedId()) - GetEntityCoords(vehicle))

    local listenDistance = Config.RemoteListening.distance or 30.0
    local stopDistance = Config.RemoteListening.stopDistance or 45.0

    if remoteActive[vehicleId] then

        if distance > stopDistance then
            stopRemoteListening(vehicleId)
        end

        return
    end

    if distance <= listenDistance then
        remoteActive[vehicleId] = true
        sendRemoteState(vehicleId, state)
    end

end

-- Scan of nearby vehicles: requests the state of those
-- we do not know yet, and updates the
-- remote players depending on distance.
CreateThread(function()

    while true do

        local interval =
            Config.RemoteListening
            and Config.RemoteListening.scanInterval
            or 1500

        Wait(interval)

        if remoteListeningEnabled() then

            local playerCoords = GetEntityCoords(PlayerPedId())
            local currentVehicle = VehicleAudio:GetCurrentVehicle()
            local listenDistance = Config.RemoteListening.distance or 30.0
            local now = GetGameTimer()

            for _, vehicle in ipairs(GetGamePool('CVehicle')) do

                if vehicle ~= currentVehicle
                    and DoesEntityExist(vehicle)
                    and NetworkGetEntityIsNetworked(vehicle)
                then

                    local distance =
                        #(playerCoords - GetEntityCoords(vehicle))

                    if distance <= listenDistance then

                        local vehicleId = NetworkGetNetworkIdFromEntity(vehicle)

                        if vehicleId and vehicleId ~= 0 then

                            if vehicleStates[vehicleId] then

                                updateRemoteListening(vehicleId)

                            else

                                local last = stateRequested[vehicleId] or 0

                                if now - last > 30000 then

                                    stateRequested[vehicleId] = now

                                    TriggerServerEvent(
                                        'wts_vehicleaudio:requestVehicleState',
                                        vehicleId,
                                        getVehiclePlate(vehicle)
                                    )

                                end

                            end

                        end

                    end

                end

            end

            -- Known vehicles that moved away / disappeared
            for vehicleId in pairs(remoteActive) do
                updateRemoteListening(vehicleId)
            end

        end

    end

end)

-- ==========================================
-- PLAYER'S VEHICLE?
-- With a key system: holds the key.
-- Without: all vehicles (original behavior).
-- ==========================================

local function isOwnVehicle(vehicle)

    local keySystem = Config.KeySystem

    if not keySystem
        or not keySystem.enabled
        or GetResourceState(keySystem.resource) ~= 'started'
    then
        return true
    end

    local ok, result = pcall(function()
        return exports[keySystem.resource][keySystem.clientExport or 'hasKeyForVehicle'](nil, vehicle)
    end)

    return ok and result == true
end

-- ==========================================
-- VEHICLE INSIDE / OUTSIDE DETECTION
-- ==========================================

local lastVehicleId = nil
local lastVehicleEntity = nil
local lastInsideState = nil

CreateThread(function()

    while true do

        Wait(500)

        local vehicle =
            VehicleAudio:GetCurrentVehicle()

        local isInside =
            vehicle ~= nil

        -- ======================================
        -- INSIDE / OUTSIDE CHANGE
        -- ======================================

        if lastInsideState ~= isInside then

            lastInsideState =
                isInside

            SendNUIMessage({
                action = 'vehicleInteriorState',
                inside = isInside
            })

        end

        -- ======================================
        -- LEAVING THE VEHICLE
        -- ======================================

        if not vehicle then

            if lastVehicleId ~= nil then

                -- ======================================
                -- AUDIO KEEPER: keep driving the playlist
                -- of the vehicle we just left if its music
                -- is playing.
                -- ======================================

                local leftState = vehicleStates[lastVehicleId]

                if leftState and leftState.playing
                    and leftState.videoId and leftState.videoId ~= '' then
                    keeperVehicleId = lastVehicleId
                    keeperVehicleEntity = lastVehicleEntity
                else
                    keeperVehicleId = nil
                    keeperVehicleEntity = nil
                end

                lastVehicleId = nil

                -- ======================================
                -- DO NOT CLEAR THE SOURCE VEHICLE
                -- ======================================

                SendNUIMessage({
                    action = 'vehicleChanged',
                    vehicleId = nil,
                    keeperVehicleId = keeperVehicleId
                })

            end

        -- ======================================
        -- INSIDE A VEHICLE
        -- ======================================

        else

            local vehicleId =
                getVehicleId(vehicle)

            if vehicleId then

                if lastVehicleId ~= vehicleId then

                    lastVehicleId =
                        vehicleId

                    lastVehicleEntity =
                        vehicle

                    -- ======================================
                    -- REMEMBER THE AUDIO SOURCE VEHICLE
                    -- ======================================

                    if not audioSourceVehicleId then

                        audioSourceVehicleId =
                            vehicleId

                        audioSourceVehicleEntity =
                            vehicle

                    end

                    remoteActive[vehicleId] = nil

                    keeperVehicleId = nil
                    keeperVehicleEntity = nil

                    SendNUIMessage({
                        action = 'vehicleChanged',
                        vehicleId = vehicleId,
                        owned = isOwnVehicle(vehicle)
                    })

                    TriggerServerEvent(
                        'wts_vehicleaudio:requestVehicleState',
                        vehicleId,
                        getVehiclePlate(vehicle)
                    )

                end

            end

        end

    end

end)

-- ==========================================
-- DISTANCE / SPATIALIZATION / DOORS
-- ==========================================

local doorNames = {
    [0] = 'front-left',
    [1] = 'front-right',
    [2] = 'rear-left',
    [3] = 'rear-right',
    [4] = 'hood',
    [5] = 'trunk'
}

CreateThread(function()

    while true do

        Wait(100)

        local playerCoords =
            GetEntityCoords(
                PlayerPedId()
            )

        local camCoords =
            GetGameplayCamCoord()

        local camRot =
            GetGameplayCamRot(2)

        local pitch =
            math.rad(camRot.x)

        local yaw =
            math.rad(camRot.z)

        local forward = vector3(
            -math.sin(yaw) * math.cos(pitch),
            math.cos(yaw) * math.cos(pitch),
            math.sin(pitch)
        )

        local up = vector3(
            -math.sin(pitch) * math.sin(yaw),
            math.sin(pitch) * math.cos(yaw),
            math.cos(pitch)
        )

		local spatialMaxDistance =
			(Config.RemoteListening and Config.RemoteListening.stopDistance or 45.0) + 5.0

		for vehicleId, state in pairs(vehicleStates) do

					if vehicleId
						and NetworkDoesEntityExistWithNetworkId(vehicleId)
						and #(playerCoords - GetEntityCoords(NetworkGetEntityFromNetworkId(vehicleId))) <= spatialMaxDistance
					then

						local vehicle =
							NetworkGetEntityFromNetworkId(
								vehicleId
							)

						if vehicle
							and vehicle ~= 0
							and DoesEntityExist(vehicle)
							and IsEntityAVehicle(vehicle)
						then

                    -- ==========================================
                    -- DISTANCE + SPATIALIZATION
                    -- ==========================================

                    local vehicleCoords =
                        GetEntityCoords(
                            vehicle
                        )

                    local distance =
                        #(playerCoords - vehicleCoords)

                    local inside =
                        VehicleAudio:GetCurrentVehicle() == vehicle

                    SendNUIMessage({
                        action =
                            'vehicleAudioDistance',

                        distance =
                            distance,

                        vehicleId =
                            vehicleId,

                        inside =
                            inside
                    })

                    SendNUIMessage({
                        action =
                            'vehicleAudioSpatial',

                        vehicleId =
                            vehicleId,

                        sourceCoords = {
                            x = vehicleCoords.x,
                            y = vehicleCoords.y,
                            z = vehicleCoords.z
                        },

                        listenerCoords = {
                            x = camCoords.x,
                            y = camCoords.y,
                            z = camCoords.z
                        },

                        listenerForward = {
                            x = forward.x,
                            y = forward.y,
                            z = forward.z
                        },

                        listenerUp = {
                            x = up.x,
                            y = up.y,
                            z = up.z
                        }
                    })

                    -- ==========================================
                    -- DOOR STATE
                    -- ==========================================

                    local anyDoorOpen = false
                    local doorStates = vehicleDoorStates[vehicleId]

                    if not doorStates then
                        doorStates = {}
                        vehicleDoorStates[vehicleId] = doorStates
                    end

                    for doorIndex = 0, 5 do

                        local doorName = doorNames[doorIndex]
                        local angle =
                            GetVehicleDoorAngleRatio(
                                vehicle,
                                doorIndex
                            )

                        local isOpen = angle > 0.05

                        if isOpen then
                            anyDoorOpen = true
                        end

                        if doorStates[doorName] ~= isOpen then

                            doorStates[doorName] = isOpen

                            SendNUIMessage({
                                action = 'vehicleDoorState',
                                vehicleId = vehicleId,
                                door = doorName,
                                open = isOpen
                            })

                        end

                    end

                    -- Global state kept for the existing audio system.
                    if doorStates._anyOpen ~= anyDoorOpen then

                        doorStates._anyOpen = anyDoorOpen

                        SendNUIMessage({
                            action = 'vehicleDoorState',
                            vehicleId = vehicleId,
                            open = anyDoorOpen
                        })

                    end

                else

                    vehicleDoorStates[vehicleId] = nil

                end

            end

        end

    end

end)

-- ==========================================
-- DOOR CONTROL
-- ==========================================

RegisterNUICallback(
    'vehicleDoor',
    function(data, cb)

        if type(data) ~= 'table' then
            cb('error')
            return
        end

        local validDoors = {
            ['front-left'] = 0,
            ['front-right'] = 1,
            ['rear-left'] = 2,
            ['rear-right'] = 3,
            ['hood'] = 4,
            ['trunk'] = 5
        }

        local doorIndex = validDoors[data.door]

        if doorIndex == nil then
            cb('ok')
            return
        end

        local vehicle =
            VehicleAudio:GetCurrentVehicle()

        if not vehicle then
            cb('ok')
            return
        end

        if not VehicleAudio:CanUse(vehicle) then
            cb('ok')
            return
        end

        -- Without network control, the door only moves locally
        -- and the real owner's sync closes it again later.
        if NetworkGetEntityIsNetworked(vehicle)
            and not NetworkHasControlOfEntity(vehicle) then

            local timeout = GetGameTimer() + 500

            repeat
                NetworkRequestControlOfEntity(vehicle)
                Wait(0)
            until NetworkHasControlOfEntity(vehicle)
                or GetGameTimer() > timeout
        end

        local angle =
            GetVehicleDoorAngleRatio(
                vehicle,
                doorIndex
            )

        if angle > 0.05 then

            SetVehicleDoorShut(
                vehicle,
                doorIndex,
                false
            )

        else

            SetVehicleDoorOpen(
                vehicle,
                doorIndex,
                false,
                false
            )

        end

        cb('ok')

    end
)


-- ==========================================
-- SEAT SWITCHING
-- ==========================================

-- IsVehicleSeatFree(vehicle, -1) sometimes returns false
-- on an EMPTY driver seat: GTA keeps a reference
-- to the last driver after they switched seats.
-- So we look at who actually occupies the seat.
--
-- Some "engine kept running" scripts place a ghost
-- ped (invisible, local, non-player) in the driver seat when
-- the driver gets out. If Config.EvictGhostDrivers is
-- enabled, this ped is deleted to free the seat.
local function isGhostPed(occupant)

    if IsPedAPlayer(occupant) then
        return false
    end

    if IsEntityVisible(occupant) then
        return false
    end

    if NetworkGetEntityIsNetworked(occupant) then
        return false
    end

    return true
end

local function isSeatAvailable(vehicle, seatIndex, ped)

    local occupant = GetPedInVehicleSeat(vehicle, seatIndex)

    if not occupant
        or occupant == 0
        or not DoesEntityExist(occupant)
        or occupant == ped
    then
        return true
    end

    -- A ped already seated but no longer actually
    -- in this vehicle (ghost reference)
    if GetVehiclePedIsIn(occupant, false) ~= vehicle then
        return true
    end

    if Config.EvictGhostDrivers ~= false and isGhostPed(occupant) then

        if Config.Debug then
            print(('[wts_vehicleaudio] evicting ghost ped %s (script=%s) from seat %s')
                :format(occupant, GetEntityScript(occupant) or 'none', seatIndex))
        end

        SetEntityAsMissionEntity(occupant, true, true)
        DeleteEntity(occupant)

        return not DoesEntityExist(occupant)
            or GetPedInVehicleSeat(vehicle, seatIndex) ~= occupant
    end

    return false
end

RegisterNUICallback('vehicleSeat', function(data, cb)

    local vehicle = VehicleAudio:GetCurrentVehicle()

    if not vehicle
        or vehicle == 0
        or not DoesEntityExist(vehicle)
        or not IsEntityAVehicle(vehicle) then

        cb('ok')
        return
    end

    if not VehicleAudio:CanUse(vehicle) then
        cb('ok')
        return
    end

    local seat = data and data.seat
    local seatIndex = nil

    if seat == 'driver' then
        seatIndex = -1

    elseif seat == 'passenger' then
        seatIndex = 0

    elseif seat == 'rear-left' then
        seatIndex = 1

    elseif seat == 'rear-right' then
        seatIndex = 2
    end

    if seatIndex == nil then
        cb('ok')
        return
    end

    local ped = PlayerPedId()

    if not isSeatAvailable(vehicle, seatIndex, ped) then

        if Config.Debug then

            local occupant = GetPedInVehicleSeat(vehicle, seatIndex)

            print(('[wts_vehicleaudio] seat %s refused: occupied by ped %s | script=%s | model=%s | player=%s | visible=%s | mission=%s | netId=%s')
                :format(
                    seatIndex,
                    occupant,
                    GetEntityScript(occupant) or 'none',
                    GetEntityModel(occupant),
                    IsPedAPlayer(occupant) and 'yes' or 'no',
                    IsEntityVisible(occupant) and 'yes' or 'no',
                    IsEntityAMissionEntity(occupant) and 'yes' or 'no',
                    NetworkGetEntityIsNetworked(occupant) and NetworkGetNetworkIdFromEntity(occupant) or 'local'
                ))
        end

        Notify('seatOccupied', 'error')
        cb('ok')
        return
    end

    cb('ok')

    -- Direct move (without going through the task
    -- system, which sometimes ignores the driver seat
    -- when the ped is already in the vehicle).
    SetPedIntoVehicle(ped, vehicle, seatIndex)

    CreateThread(function()

        Wait(150)

        if GetPedInVehicleSeat(vehicle, seatIndex) == ped then
            return
        end

        -- Fallback: classic warp
        TaskWarpPedIntoVehicle(ped, vehicle, seatIndex)

        Wait(300)

        if Config.Debug then
            print(('[wts_vehicleaudio] seat %s -> %s')
                :format(
                    seatIndex,
                    GetPedInVehicleSeat(vehicle, seatIndex) == ped and 'OK (fallback)' or 'FAILED'
                ))
        end

    end)

end)

-- ==========================================
-- DRIVE CONTROL
-- ==========================================

RegisterNUICallback(
    'setDriveControl',
    function(data, cb)

        local enabled =
            data
            and data.enabled == true

        SetNuiFocusKeepInput(
            enabled
        )

        cb('ok')

    end
)

-- ==========================================
-- HAZARD LIGHTS
-- ==========================================

local vehicleHazardsState = {}   -- vehicleId → boolean

local function keySystemLightsAvailable()
    return Config.SyncLightsWithKeySystem ~= false
        and Config.KeySystem
        and Config.KeySystem.enabled
        and GetResourceState(Config.KeySystem.resource) == 'started'
end

local function setHazards(vehicle, enabled)

    -- If wts_vehiclekeys is present, go through its lights
    -- menu so both systems stay in agreement.
    if keySystemLightsAvailable() then

        local ok = pcall(function()
            exports[Config.KeySystem.resource][Config.KeySystem.lightsExport or 'SetVehicleLightsMode'](
                nil,
                enabled and 'hazard' or 'off',
                vehicle,
                true -- silent
            )
        end)

        if ok then
            return
        end

    end

    SetVehicleIndicatorLights(vehicle, 0, enabled)
    SetVehicleIndicatorLights(vehicle, 1, enabled)

end

RegisterNUICallback(
    'vehicleHazards',
    function(data, cb)

        local vehicle =
            VehicleAudio:GetCurrentVehicle()

        if not vehicle
            or vehicle == 0
            or not DoesEntityExist(vehicle)
            or not IsEntityAVehicle(vehicle)
        then
            cb('ok')
            return
        end

        if not VehicleAudio:CanUse(vehicle) then
            cb('ok')
            return
        end

        -- 0 = none, 1 = left, 2 = right, 3 = hazards
        local hazardsOn =
            GetVehicleIndicatorLights(vehicle) == 3

        setHazards(vehicle, not hazardsOn)

        local vehicleId = getVehicleId(vehicle)

        if vehicleId then
            vehicleHazardsState[vehicleId] = not hazardsOn
        end

        SendNUIMessage({
            action = 'vehicleHazardsState',
            active = not hazardsOn
        })

        cb('ok')
    end
)


-- ==========================================
-- HAZARD LIGHTS STATE MONITORING
-- ==========================================

CreateThread(function()

    local lastSent = nil

    while true do

        Wait(200)

        local vehicle =
            VehicleAudio:GetCurrentVehicle()

        local active = false

        if vehicle
            and vehicle ~= 0
            and DoesEntityExist(vehicle)
            and IsEntityAVehicle(vehicle)
        then

            active =
                GetVehicleIndicatorLights(vehicle) == 3

            local vehicleId = getVehicleId(vehicle)

            if vehicleId then
                vehicleHazardsState[vehicleId] = active
            end

        end

        if lastSent ~= active then

            lastSent = active

            SendNUIMessage({
                action = 'vehicleHazardsState',
                active = active
            })

        end

    end

end)

-- ==========================================
-- PLAY/PAUSE KEY
-- ==========================================

RegisterCommand('vehicleaudio_playpause', function()
    if not IsPedInAnyVehicle(PlayerPedId(), false) then
        return
    end

    SendNUIMessage({ action = 'togglePlayPause' })
end, false)

RegisterKeyMapping(
    'vehicleaudio_playpause',
    'Vehicle audio: play / pause',
    'keyboard',
    Config.PlayPauseKey
)

RegisterNetEvent('wts_vehicleaudio:vehicleRemoved', function(netId)

    vehicleStates[netId] = nil
    vehicleDoorStates[netId] = nil
    remoteActive[netId] = nil
    stateRequested[netId] = nil

    SendNUIMessage({
        action = 'vehicleRemoved',
        vehicleId = netId
    })

end)
-- ==========================================
-- REMOTE CONTROL (remote start,
-- remote key). Exports: StartVehicleAudio,
-- StopVehicleAudio, SetVehicleAudioPlaying.
-- The player is outside: playback goes through
-- the vehicle's "bystander" player (remote listening).
-- ==========================================

-- Returns true if the request is accepted (playback
-- starts asynchronously, once the server state
-- and the YouTube player are ready).
local function remoteSetPlaying(vehicle, playing)

    if not VehicleAudio:IsVehicle(vehicle) then
        return false
    end

    if not VehicleAudio:IsAllowed(vehicle) then
        return false
    end

    local vehicleId = getVehicleId(vehicle)

    if not vehicleId then
        return false
    end

    local plate = getVehiclePlate(vehicle)

    -- From inside: same path as the play/pause button
    if VehicleAudio:GetCurrentVehicle() == vehicle then

        local state = VehicleAudio:GetState(vehicle)

        if not state then
            return false
        end

        if playing and (not state.videoId or state.videoId == '') then
            return false
        end

        state.playing = playing == true
        sendVehicleState()

        TriggerServerEvent(
            'wts_vehicleaudio:updateVehicleState',
            vehicleId,
            { playing = playing == true },
            plate
        )

        return true
    end

    CreateThread(function()

        local state = vehicleStates[vehicleId]

        -- State unknown locally: fetch it
        -- (persistence by plate on the server side)
        if not state or not state.videoId or state.videoId == '' then

            stateRequested[vehicleId] = GetGameTimer()

            TriggerServerEvent(
                'wts_vehicleaudio:requestVehicleState',
                vehicleId,
                plate
            )

            local timeout = GetGameTimer() + 2000

            repeat
                Wait(100)
                state = vehicleStates[vehicleId]
            until (state and state.videoId and state.videoId ~= '')
                or GetGameTimer() > timeout

        end

        if not state or not state.videoId or state.videoId == '' then
            -- Nothing to play in this vehicle
            return
        end

        if not DoesEntityExist(vehicle) then
            return
        end

        state.playing = playing == true

        audioSourceVehicleId = vehicleId
        audioSourceVehicleEntity = vehicle

        remoteActive[vehicleId] = true
        sendRemoteState(vehicleId, state)

        TriggerServerEvent(
            'wts_vehicleaudio:updateVehicleState',
            vehicleId,
            { playing = playing == true },
            plate
        )

    end)

    return true

end

exports(
    'StartVehicleAudio',
    function(vehicle)
        return remoteSetPlaying(vehicle, true)
    end
)

exports(
    'StopVehicleAudio',
    function(vehicle)
        return remoteSetPlaying(vehicle, false)
    end
)

exports(
    'SetVehicleAudioPlaying',
    function(vehicle, playing)
        return remoteSetPlaying(vehicle, playing == true)
    end
)
