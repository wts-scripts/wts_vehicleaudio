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

local RESOURCE_NAME = GetCurrentResourceName()

local PLAYLIST_FILE = 'playlist.json'

local VEHICLE_STATES_FILE = 'vehicle_states.json'

local function loadVehicleStatesFile()

    local content = LoadResourceFile(RESOURCE_NAME, VEHICLE_STATES_FILE)

    if not content or content == '' then
        return {}
    end

    local success, data = pcall(json.decode, content)

    if not success or type(data) ~= 'table' then
        print('^1[wts_vehicleaudio]^7 Failed to load vehicle_states.json')
        return {}
    end

    return data
end

local function saveVehicleStatesFile(data)

    local success, encoded = pcall(json.encode, data)

    if not success then
        print("^1[wts_vehicleaudio]^7 Failed to encode vehicle_states.json")
        return false
    end

    SaveResourceFile(RESOURCE_NAME, VEHICLE_STATES_FILE, encoded, -1)
    return true
end

-- In-memory cache + write debounce
local persistedVehicleStates = loadVehicleStatesFile()
local pendingVehicleStatesSave = false

local function scheduleVehicleStatesSave()

    if pendingVehicleStatesSave then
        return
    end

    pendingVehicleStatesSave = true

    SetTimeout(5000, function()
        pendingVehicleStatesSave = false
        saveVehicleStatesFile(persistedVehicleStates)
    end)
end

-- Mapping netId -> plate, known at runtime only
local vehiclePlateByNetId = {}

-- ==========================================
-- SECURITY: CLIENT REQUEST VALIDATION
-- ==========================================

-- Max distance (in game units) between the player
-- and the vehicle targeted by a state update.
-- Since the player is supposed to be INSIDE the vehicle
-- to trigger these events, a generous value is
-- used to absorb network lag without
-- allowing to target a vehicle at the other
-- end of the map.
local MAX_STATE_UPDATE_DISTANCE = 15.0

-- Max distance to simply REQUEST the state of a
-- vehicle (discovery of vehicles playing
-- nearby, so bystanders can hear them).
local MAX_STATE_REQUEST_DISTANCE = 40.0

-- Anti-spam on state updates (ms between two)
local STATE_UPDATE_MIN_INTERVAL = 20
local stateUpdateTimestamps = {}

-- YouTube metadata cache (videoId → {title, artist, thumbnail})
local metadataCache = {}

-- ==========================================
-- ACCESS CONTROL
-- The player must be INSIDE the vehicle, or
-- hold its key if a key system is
-- present (Config.KeySystem). Without a started
-- key system, only occupants can act.
-- ==========================================

local function playerHasVehicleKey(playerSource, vehicle)

    local keySystem = Config.KeySystem

    if not keySystem or not keySystem.enabled then
        return false
    end

    if GetResourceState(keySystem.resource) ~= 'started' then
        return false
    end

    local plate = GetVehicleNumberPlateText(vehicle)

    if not plate then
        return false
    end

    local ok, result = pcall(function()
        return exports[keySystem.resource][keySystem.export](nil, playerSource, plate)
    end)

    return ok and result == true
end

-- Last player who controlled a vehicle's audio from
-- inside. They may keep updating it after leaving, as
-- long as the vehicle has no player occupant (audio keeper).
local lastController = {}

local function vehicleHasPlayerOccupant(vehicle)
    for _, playerId in ipairs(GetPlayers()) do
        local ped = GetPlayerPed(tonumber(playerId))
        if ped and ped ~= 0 and GetVehiclePedIsIn(ped, false) == vehicle then
            return true
        end
    end
    return false
end

local function canPlayerControlVehicle(playerSource, vehicleId)

    if type(vehicleId) ~= 'number' then
        return false
    end

    local ped = GetPlayerPed(playerSource)

    if not ped or ped == 0 then
        return false
    end

    local vehicle = NetworkGetEntityFromNetworkId(vehicleId)

    if not vehicle
        or vehicle == 0
        or not DoesEntityExist(vehicle)
        or GetEntityType(vehicle) ~= 2
    then
        return false
    end

    -- Vehicle occupant
    if GetVehiclePedIsIn(ped, false) == vehicle then
        lastController[vehicleId] = playerSource
        return true
    end

    local distance = #(GetEntityCoords(ped) - GetEntityCoords(vehicle))

    -- Audio keeper: last controller, vehicle empty, within listening range
    if lastController[vehicleId] == playerSource
        and distance <= MAX_STATE_REQUEST_DISTANCE
        and not vehicleHasPlayerOccupant(vehicle) then
        return true
    end

    -- Remote: key required + within range
    if distance > MAX_STATE_UPDATE_DISTANCE then
        return false
    end

    return playerHasVehicleKey(playerSource, vehicle)
end

-- Prevents a client from forging a vehicleId/plate
-- for a vehicle it has no access to.
local function isVehicleNearPlayer(playerSource, vehicleId, maxDistance)

    if type(vehicleId) ~= 'number' then
        return false
    end

    local ped = GetPlayerPed(playerSource)

    if not ped or ped == 0 then
        return false
    end

    local vehicle = NetworkGetEntityFromNetworkId(vehicleId)

    if not vehicle
        or vehicle == 0
        or not DoesEntityExist(vehicle)
        or GetEntityType(vehicle) ~= 2
    then
        return false
    end

    local playerCoords = GetEntityCoords(ped)
    local vehicleCoords = GetEntityCoords(vehicle)

    local distance = #(playerCoords - vehicleCoords)

    return distance <= (maxDistance or MAX_STATE_UPDATE_DISTANCE)
end

-- Anti-spam on YouTube metadata requests
-- (each request triggers an outgoing HTTP call).
local METADATA_MIN_INTERVAL = 400 -- ms
local metadataRequestTimestamps = {}

-- Sanitization limits for saved playlists
local MAX_PLAYLIST_TRACKS = 300
local MAX_FIELD_LENGTH = 200

local function sanitizePlaylist(playlist)

    local sanitized = {}

    for _, track in ipairs(playlist) do

        if #sanitized >= MAX_PLAYLIST_TRACKS then
            break
        end

        if type(track) == 'table'
            and type(track.videoId) == 'string'
            and track.videoId:match('^[%w_%-]+$')
            and #track.videoId <= 20
        then

            sanitized[#sanitized + 1] = {

                videoId =
                    track.videoId,

                title =
                    type(track.title) == 'string'
                        and track.title:sub(1, MAX_FIELD_LENGTH)
                        or nil,

                artist =
                    type(track.artist) == 'string'
                        and track.artist:sub(1, MAX_FIELD_LENGTH)
                        or nil,

                thumbnail =
                    type(track.thumbnail) == 'string'
                        and track.thumbnail:sub(1, MAX_FIELD_LENGTH)
                        or nil
            }

        end

    end

    return sanitized
end

AddEventHandler(
    'playerDropped',
    function()
        metadataRequestTimestamps[source] = nil
    end
)

-- ==========================================
-- VEHICLE AUDIO STATES
-- ==========================================

local vehicleAudioStates = {}


local function getDefaultVehicleState()

    return {

        videoId = nil,

        title = nil,

        artist = nil,

        thumbnail = nil,

        playing = false,

        currentTime = 0.0,

        volume = 0.75,

        shuffle = false,

        repeatMode = 'off'

    }

end


local function getVehicleState(vehicleId)

    if not vehicleAudioStates[vehicleId] then

        vehicleAudioStates[vehicleId] =
            getDefaultVehicleState()

    end

    return vehicleAudioStates[vehicleId]

end


-- ==========================================
-- PLAYER IDENTIFIER
-- ==========================================

local function getPlayerIdentifier(source)

    local identifiers = GetPlayerIdentifiers(source)

    for _, identifier in ipairs(identifiers) do

        if identifier:sub(1, 8) == 'license:' then
            return identifier
        end

    end

    return nil

end


-- ==========================================
-- LOAD PLAYLISTS
-- ==========================================

local function loadPlaylists()

    local content = LoadResourceFile(
        RESOURCE_NAME,
        PLAYLIST_FILE
    )


    if not content or content == '' then
        return {}
    end


    local success, data = pcall(
        json.decode,
        content
    )


    if not success or type(data) ~= 'table' then

        print(
            '^1[wts_vehicleaudio]^7 Failed to load playlist.json'
        )

        return {}

    end


    return data

end


-- ==========================================
-- SAVE PLAYLISTS
-- ==========================================

local function savePlaylists(data)

    local success, encoded = pcall(
        json.encode,
        data
    )


    if not success then

        print(
            "^1[wts_vehicleaudio]^7 Failed to encode playlist.json"
        )

        return false

    end


    SaveResourceFile(
        RESOURCE_NAME,
        PLAYLIST_FILE,
        encoded,
        -1
    )


    return true

end


-- ==========================================
-- LOAD THE PLAYER'S PLAYLIST
-- ==========================================

RegisterNetEvent(
    'wts_vehicleaudio:requestPlaylist',
    function()

        local source = source

        local identifier =
            getPlayerIdentifier(source)


        if not identifier then

            TriggerClientEvent(
                'wts_vehicleaudio:loadPlaylist',
                source,
                {}
            )

            return

        end


        local playlists =
            loadPlaylists()


        local playlist =
            playlists[identifier] or {}


        TriggerClientEvent(
            'wts_vehicleaudio:loadPlaylist',
            source,
            playlist
        )

    end
)


-- ==========================================
-- SAVE THE PLAYLIST
-- ==========================================

RegisterNetEvent(
    'wts_vehicleaudio:savePlaylist',
    function(playlist)

        local source = source

        local identifier =
            getPlayerIdentifier(source)


        if not identifier then
            return
        end


        if type(playlist) ~= 'table' then
            return
        end


        local playlists =
            loadPlaylists()


        playlists[identifier] =
            sanitizePlaylist(playlist)


        savePlaylists(playlists)


        if Config.Debug then

            print(
                ('^2[wts_vehicleaudio]^7 Playlist saved for %s (%s tracks)')
                :format(
                    identifier,
                    #playlist
                )
            )

        end

    end
)


-- ==========================================
-- FETCH YOUTUBE INFO
-- ==========================================

RegisterNetEvent(
    'wts_vehicleaudio:requestMetadata',
    function(videoId, requestId)

        local source = source


        if type(videoId) ~= 'string' then
            return
        end


        if type(requestId) ~= 'number' then
            return
        end


        -- ======================================
        -- ANTI-SPAM
        -- ======================================

        local now = GetGameTimer()
        local lastRequest = metadataRequestTimestamps[source] or 0

        if now - lastRequest < METADATA_MIN_INTERVAL then
            return
        end

        metadataRequestTimestamps[source] = now


        -- ======================================
        -- VIDEO ID FORMAT VALIDATION
        -- ======================================

        if not videoId:match('^[%w_%-]+$')
            or #videoId > 20
        then
            return
        end


        -- ======================================
        -- METADATA CACHE
        -- ======================================

        local cached = metadataCache[videoId]

        if cached then

            TriggerClientEvent(
                'wts_vehicleaudio:metadataResult',
                source,
                requestId,
                videoId,
                cached
            )

            return
        end

        local url =
            ('https://www.youtube.com/watch?v=%s')
            :format(videoId)


        local oembedUrl =
            ('https://www.youtube.com/oembed?url=%s&format=json')
            :format(
                url:gsub(' ', '%%20')
            )


        PerformHttpRequest(
            oembedUrl,
            function(statusCode, response)

                local metadata = nil


                if statusCode == 200 and response then

                    local success, data =
                        pcall(
                            json.decode,
                            response
                        )


                    if success and type(data) == 'table' then

                        metadata = {

                            title =
                                data.title,

                            artist =
                                data.author_name,

                            thumbnail =
                                data.thumbnail_url

                        }

                    end

                end


                if metadata then
                    metadataCache[videoId] = metadata
                end

                TriggerClientEvent(
                    'wts_vehicleaudio:metadataResult',
                    source,
                    requestId,
                    videoId,
                    metadata
                )

            end,
            'GET',
            '',
            {
                ['Accept'] = 'application/json'
            }
        )

    end
)

-- ==========================================
-- UPDATE A VEHICLE'S AUDIO STATE
-- ==========================================

RegisterNetEvent(
    'wts_vehicleaudio:updateVehicleState',
    function(vehicleId, updates, plate)

        local source = source

        if type(vehicleId) ~= 'number' then
            return
        end

        if type(updates) ~= 'table' then
            return
        end

        if not canPlayerControlVehicle(source, vehicleId) then
            return
        end

        local now = GetGameTimer()
        local lastUpdate = stateUpdateTimestamps[source] or 0

        if now - lastUpdate < STATE_UPDATE_MIN_INTERVAL then
            return
        end

        stateUpdateTimestamps[source] = now

        local state = getVehicleState(vehicleId)

        for key, value in pairs(updates) do

            if key == 'videoId'
                or key == 'title'
                or key == 'artist'
                or key == 'thumbnail'
                or key == 'playing'
                or key == 'currentTime'
                or key == 'volume'
                or key == 'shuffle'
                or key == 'repeatMode'
            then
                state[key] = value
            end

        end

        -- ======================================
        -- PERSISTENCE BY PLATE
        -- ======================================

        if type(plate) == 'string' and plate ~= '' then

            vehiclePlateByNetId[vehicleId] = plate

            persistedVehicleStates[plate] = state

            scheduleVehicleStatesSave()

        end

        for _, playerId in ipairs(GetPlayers()) do

            local targetId = tonumber(playerId)

            if targetId ~= source then

                TriggerClientEvent(
                    'wts_vehicleaudio:syncVehicleState',
                    targetId,
                    vehicleId,
                    state
                )

            end

        end

    end
)

-- ==========================================
-- REQUEST A VEHICLE'S AUDIO STATE
-- ==========================================

RegisterNetEvent(
    'wts_vehicleaudio:requestVehicleState',
    function(vehicleId, plate)

        local source = source

        if type(vehicleId) ~= 'number' then
            return
        end

        if not isVehicleNearPlayer(source, vehicleId, MAX_STATE_REQUEST_DISTANCE) then
            return
        end

        local isNewRuntimeState = vehicleAudioStates[vehicleId] == nil

        local state = getVehicleState(vehicleId)

        -- ======================================
        -- RESTORE FROM PERSISTENCE
        -- ======================================

        if isNewRuntimeState
            and type(plate) == 'string'
            and plate ~= ''
            and persistedVehicleStates[plate]
        then

            local saved = persistedVehicleStates[plate]

            for key, value in pairs(saved) do
                state[key] = value
            end

            -- A restored state (after restart / respawn) does not
            -- play on its own: the vehicle just appeared,
            -- nothing is actually playing. Auto access
            -- (if enabled, player's vehicle) is what resumes the music.
            state.playing = false

        end

        if type(plate) == 'string' and plate ~= '' then
            vehiclePlateByNetId[vehicleId] = plate
        end

        TriggerClientEvent(
            'wts_vehicleaudio:syncVehicleState',
            source,
            vehicleId,
            state
        )

    end
)


-- ==========================================
-- STARTUP
-- ==========================================

AddEventHandler(
    'onResourceStart',
    function(resourceName)

        if resourceName ~= RESOURCE_NAME then
            return
        end


        local playlists =
            loadPlaylists()


        local count = 0

        for _ in pairs(playlists) do
            count = count + 1
        end


        print(
            ('^2[wts_vehicleaudio]^7 Save system loaded (%s playlist(s))')
            :format(count)
        )

    end
)

AddEventHandler('entityRemoved', function(entity)

    if GetEntityType(entity) ~= 2 then
        return
    end

    local netId = NetworkGetNetworkIdFromEntity(entity)

    if not netId or netId == 0 then
        return
    end

    vehicleAudioStates[netId] = nil
    vehiclePlateByNetId[netId] = nil
    lastController[netId] = nil

    TriggerClientEvent('wts_vehicleaudio:vehicleRemoved', -1, netId)

end)

AddEventHandler('playerDropped', function()
    local source = source
    stateUpdateTimestamps[source] = nil
    metadataRequestTimestamps[source] = nil
    for vehicleId, controller in pairs(lastController) do
        if controller == source then
            lastController[vehicleId] = nil
        end
    end
end)
