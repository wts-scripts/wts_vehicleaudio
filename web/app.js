/*

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
*/

const app = document.getElementById('audio-app');

const AUDIO_EFFECT_BANDS =
    ['subwoofer', 'bass', 'mid', 'treble'];

// ==========================================
// PLAYER POSITION / DRAGGING
// ==========================================

let playerWindowConfig = {
    draggable: true,
    x: 0.50,
    y: 0.50,
    savePosition: true
};

let closeWithEscapeEnabled = false;

let playerWindowDragging = false;

let playerWindowOffsetX = 0;
let playerWindowOffsetY = 0;

// Batching of position updates via requestAnimationFrame
// to avoid reading offsetWidth/offsetHeight (forced reflow) on
// every raw mousemove.
let playerWindowDragFrame = null;
let playerWindowPendingX = 0;
let playerWindowPendingY = 0;

let playerWindowPosition = {
    x: null,
    y: null
};

const PLAYER_WINDOW_STORAGE_KEY =
    'vehicle_audio_player_window_position';

function loadPlayerWindowPosition() {

    if (!playerWindowConfig.savePosition) {
        return null;
    }

    try {

        const saved =
            localStorage.getItem(
                PLAYER_WINDOW_STORAGE_KEY
            );

        if (!saved) {
            return null;
        }

        const position =
            JSON.parse(saved);

        if (
            typeof position.x !== 'number' ||
            typeof position.y !== 'number'
        ) {
            return null;
        }

        return position;

    } catch (error) {

        return null;

    }
}

function savePlayerWindowPosition(x, y) {

    if (!playerWindowConfig.savePosition) {
        return;
    }

    try {

        localStorage.setItem(
            PLAYER_WINDOW_STORAGE_KEY,

            JSON.stringify({
                x: x,
                y: y
            })
        );

    } catch (error) {

        // Nothing to do
    }
}

function clampPlayerWindowPosition(
    x,
    y
) {

    if (!app) {
        return {
            x: x,
            y: y
        };
    }

    const maxX =
        Math.max(
            0,
            window.innerWidth -
            app.offsetWidth
        );

    const maxY =
        Math.max(
            0,
            window.innerHeight -
            app.offsetHeight
        );

    return {
        x:
            Math.max(
                0,
                Math.min(
                    x,
                    maxX
                )
            ),

        y:
            Math.max(
                0,
                Math.min(
                    y,
                    maxY
                )
            )
    };
}

function setPlayerWindowPosition(
    x,
    y,
    save = false
) {

    if (!app) {
        return;
    }

    const position =
        clampPlayerWindowPosition(
            x,
            y
        );

    app.style.left =
        `${position.x}px`;

    app.style.top =
        `${position.y}px`;

    app.style.right =
        'auto';

    app.style.bottom =
        'auto';

    app.style.transform =
        'none';

    playerWindowPosition =
        position;

    if (save) {

        savePlayerWindowPosition(
            position.x,
            position.y
        );

    }
}

function setInitialPlayerWindowPosition() {

    if (!app) {
        return;
    }

    const saved =
        loadPlayerWindowPosition();

    if (saved) {

        setPlayerWindowPosition(
            saved.x,
            saved.y
        );

        return;
    }

    const x =
        (
            window.innerWidth -
            app.offsetWidth
        ) *
        playerWindowConfig.x;

    const y =
        (
            window.innerHeight -
            app.offsetHeight
        ) *
        playerWindowConfig.y;

    setPlayerWindowPosition(
        x,
        y
    );
}

// ==========================================
// WINDOW PADLOCK
// ==========================================

let windowLocked =
    localStorage.getItem(
        'vehicle_audio_window_locked'
    ) !== 'false';

    // ==========================================
// WINDOW PADLOCK
// ==========================================

const windowLockButton =
    document.getElementById(
        'window-lock-btn'
    );

const windowLockIcon =
    windowLockButton
        ? windowLockButton.querySelector(
            '.window-lock-icon'
        )
        : null;


function updateWindowLockState() {

    if (!windowLockButton) {
        return;
    }

    if (windowLocked) {

        windowLockButton.classList.add(
            'locked'
        );

        windowLockButton.classList.remove(
            'unlocked'
        );

        windowLockButton.title =
            'Déverrouiller l\'interface';

        windowLockButton.setAttribute(
            'aria-label',
            'Déverrouiller l\'interface'
        );

        if (windowLockIcon) {
            windowLockIcon.textContent = '🔒';
        }

    } else {

        windowLockButton.classList.remove(
            'locked'
        );

        windowLockButton.classList.add(
            'unlocked'
        );

        windowLockButton.title =
            'Verrouiller l\'interface';

        windowLockButton.setAttribute(
            'aria-label',
            'Verrouiller l\'interface'
        );

        if (windowLockIcon) {
            windowLockIcon.textContent = '🔓';
        }
    }
}


if (windowLockButton) {

    windowLockButton.addEventListener(
        'click',
        function(event) {

            event.preventDefault();
            event.stopPropagation();

            windowLocked =
                !windowLocked;

            localStorage.setItem(
                'vehicle_audio_window_locked',
                windowLocked
            );

            updateWindowLockState();
        }
    );
}


updateWindowLockState();
// ==========================================
// PLAYER DRAG
// ==========================================

function startPlayerWindowDrag(event) {

    if (windowLocked) {
        return;
    }

    if (!app) {
        return;
    }

    if (event.button !== 0) {
        return;
    }

    // Do not start the drag on the controls
    if (
        event.target.closest(
            'button, input, textarea, select, a'
        )
    ) {
        return;
    }

    const rect =
        app.getBoundingClientRect();

    playerWindowDragging = true;

    playerWindowOffsetX =
        event.clientX -
        rect.left;

    playerWindowOffsetY =
        event.clientY -
        rect.top;

    app.classList.add(
        'window-dragging'
    );

    event.preventDefault();
    event.stopPropagation();
	
updateWindowLockState();
}


function applyPendingPlayerWindowPosition() {

    playerWindowDragFrame = null;

    if (!playerWindowDragging) {
        return;
    }

    setPlayerWindowPosition(
        playerWindowPendingX,
        playerWindowPendingY
    );
}


function movePlayerWindow(event) {

    if (!playerWindowDragging) {
        return;
    }

    playerWindowPendingX =
        event.clientX -
        playerWindowOffsetX;

    playerWindowPendingY =
        event.clientY -
        playerWindowOffsetY;

    // Only one layout update is scheduled per frame,
    // instead of applying/re-reading the style on every raw mousemove.
    if (playerWindowDragFrame === null) {

        playerWindowDragFrame =
            requestAnimationFrame(
                applyPendingPlayerWindowPosition
            );

    }
}


function stopPlayerWindowDrag() {

    if (!playerWindowDragging) {
        return;
    }

    playerWindowDragging = false;

    if (playerWindowDragFrame !== null) {

        cancelAnimationFrame(
            playerWindowDragFrame
        );

        playerWindowDragFrame = null;

    }

    app.classList.remove(
        'window-dragging'
    );

    savePlayerWindowPosition(
        playerWindowPosition.x,
        playerWindowPosition.y
    );
}


// ==========================================
// DRAG LISTENERS
// ==========================================

if (app) {

    app.addEventListener(
        'mousedown',
        startPlayerWindowDrag
    );

    document.addEventListener(
        'mousemove',
        movePlayerWindow
    );

    document.addEventListener(
        'mouseup',
        stopPlayerWindowDrag
    );

    window.addEventListener(
        'resize',
        () => {

            if (
                playerWindowPosition.x === null ||
                playerWindowPosition.y === null
            ) {
                return;
            }

            setPlayerWindowPosition(
                playerWindowPosition.x,
                playerWindowPosition.y
            );

        }
    );

}

const closeButton = document.getElementById('close-btn');
const playButton = document.getElementById('play');
const previousButton = document.getElementById('previous');
const nextButton = document.getElementById('next');
const volumeSlider = document.getElementById('volume');
const progressBar = document.querySelector('.progress-bar');

const shuffleButton = document.getElementById('shuffle');
const repeatButton = document.getElementById('repeat');

// ==========================================
// EQUALIZER BUTTONS (STACKABLE BANDS)
// ==========================================

AUDIO_EFFECT_BANDS.forEach(
    (bandName) => {

        const button =
            document.getElementById(
                'audio-effect-' + bandName
            );

        if (!button) {
            return;
        }

        button.addEventListener(
            'click',
            function(event) {

                event.preventDefault();

                const vehicleId =
                    window.currentVehicleId;

                if (
                    vehicleId === null ||
                    vehicleId === undefined
                ) {
                    return;
                }

                if (
                    !initVehicleWebAudio(
                        vehicleId
                    )
                ) {
                    return;
                }

                const activeBands =
                    vehicleActiveEffectPreset[
                        vehicleId
                    ] || {};

                const currentlyActive =
                    activeBands[bandName] === true;

                setAudioEffectBand(
                    vehicleId,
                    bandName,
                    !currentlyActive
                );

            }
        );

    }
);

const coverImage = document.getElementById('cover-image');
const coverIcon = document.getElementById('cover-icon');


// ==========================================
// ADD MODAL
// ==========================================

const addTrackButton = document.getElementById('add-track');

const addModal = document.getElementById('add-modal');
const modalClose = document.getElementById('modal-close');
const modalCancel = document.getElementById('modal-cancel');
const modalAdd = document.getElementById('modal-add');

const youtubeUrl = document.getElementById('youtube-url');


// ==========================================
// PLAYLIST
// ==========================================

let playlist = [];

let currentTrackIndex = -1;

let isPlaying = false;

let metadataRequestId = 0;

let shuffleEnabled = false;

let repeatMode = 'off';

let autoAccessEnabled =
    localStorage.getItem(
        'vehicle_audio_auto_access'
    ) === 'true';	
	
// ==========================================
// WINDOW LOCKING
// ==========================================


// ==========================================
// VEHICLE STATE
// ==========================================

let vehicleState = {
    videoId: null,
    title: null,
    artist: null,
    thumbnail: null,
    playing: false,
    currentTime: 0,
    volume: 0.35,
    shuffle: false,
    repeatMode: 'off'
};

let vehicleStateReceived = false;

let autoAccessVehicleId = null;


// ==========================================
// INSIDE / OUTSIDE AUDIO STATE
// ==========================================

let isInsideVehicle = false;
let isVehicleDoorOpen = false;

// ==========================================
// INDIVIDUAL DOOR STATE
// ==========================================

const vehicleDoorStates = {
    'hood': false,
    'front-left': false,
    'front-right': false,
    'rear-left': false,
    'rear-right': false,
    'trunk': false
};

const vehicleDoorButtons = {
    'hood': document.getElementById('door-hood'),
    'front-left': document.getElementById('door-front-left'),
    'front-right': document.getElementById('door-front-right'),
    'rear-left': document.getElementById('door-rear-left'),
    'rear-right': document.getElementById('door-rear-right'),
    'trunk': document.getElementById('door-trunk')
};

function updateDoorButtonState(door, isOpen) {

    const button = vehicleDoorButtons[door];

    if (!button) {
        return;
    }

    const status =
        button.querySelector('.zone-label small');

    vehicleDoorStates[door] =
        isOpen === true;

    button.classList.toggle(
        'open',
        vehicleDoorStates[door]
    );

    if (status) {
        status.textContent =
            vehicleDoorStates[door]
                ? 'Ouverte'
                : 'Fermée';
    }
}

function updateAllDoorButtons(states) {

    if (!states || typeof states !== 'object') {
        return;
    }

    Object.keys(vehicleDoorButtons).forEach(
        (door) => {

            if (
                Object.prototype.hasOwnProperty.call(
                    states,
                    door
                )
            ) {

                updateDoorButtonState(
                    door,
                    states[door] === true
                );
            }
        }
    );
}



// ==========================================
// AUDIO DISTANCE CONFIGURATION
// ==========================================

let audioDistanceConfig = {
    veryClose: 1.5,
    close: 4.0,
    medium: 7.0,
    far: 12.0
};


// ==========================================
// YOUTUBE PLAYERS PER VEHICLE
// ==========================================

let youtubePlayers = {};

// ==========================================
// REMOTE LISTENING (bystanders)
// Vehicles whose player is playing while the
// player is not inside. Their track end never
// touches the local playlist.
// ==========================================

let remoteVehicleIds = new Set();

let youtubeReady = false;


// ==========================================
// CURRENT VEHICLE PLAYER
// ==========================================

function getCurrentVehiclePlayer() {

    // Outside the vehicle, the audio keeper keeps
    // driving the playlist of the vehicle they left.
    const vehicleId =
        (window.currentVehicleId !== null && window.currentVehicleId !== undefined)
            ? window.currentVehicleId
            : window.keeperVehicleId;

    if (
        vehicleId === null ||
        vehicleId === undefined
    ) {
        return null;
    }

    let player =
        youtubePlayers[vehicleId];

    // The vehicle may have been detected
    // before the YouTube API was ready.
    if (
        !player &&
        youtubeReady &&
        typeof createVehicleYoutubePlayer === 'function'
    ) {
        player =
            createVehicleYoutubePlayer(vehicleId);
    }

    if (!player) {
        return null;
    }

    return player;
}


function isVehiclePlayerReady(player) {

    if (!player) {
        return false;
    }

    return (
        typeof player.playVideo === 'function' &&
        typeof player.pauseVideo === 'function' &&
        typeof player.loadVideoById === 'function'
    );
}


// ==========================================
// WEB AUDIO ENGINES PER VEHICLE
// ==========================================

let vehicleAudioChains = {};

// ==========================================
// AUDIO EQUALIZER (PRESET PARAMETERS)
// ==========================================

let audioEffectsConfig = null;

// Equalizer fallback values: identical to
// Config.AudioEffects (config.lua). Used as long as
// the client has not received vehicleAudioEffectsConfig.
const DEFAULT_AUDIO_EFFECTS = {
    bass:      { frequency: 120,  gain: 7.0 },
    subwoofer: { frequency: 45,   gain: 8.5 },
    mid:       { frequency: 1000, gain: 3.0 },
    treble:    { frequency: 8000, gain: 3.0 }
};

let vehicleActiveEffectPreset = {};


// ==========================================
// AUDIO STATES PER VEHICLE
// ==========================================

let vehicleAudioEnvironmentStates = {};


// ==========================================
// REMEMBERED VOLUME PER VEHICLE
// ==========================================

let vehicleVolumes = {};


// ==========================================
// INITIALIZE WEB AUDIO FOR A VEHICLE
// ==========================================

function initVehicleWebAudio(vehicleId) {

    if (!vehicleId) {
        return false;
    }

    // ======================================
    // ALREADY INITIALIZED
    // ======================================

    if (
        vehicleAudioChains[vehicleId] &&
        vehicleAudioChains[vehicleId].connected
    ) {

        return true;

    }

    const player =
        youtubePlayers[vehicleId];

    if (!player) {
        return false;
    }

    try {

        const iframe =
            player.getIframe();

        if (!iframe) {
            return false;
        }

        const iframeDocument =
            iframe.contentDocument;

        if (!iframeDocument) {
            return false;
        }

        const video =
            iframeDocument.querySelector(
                'video'
            );

        if (!video) {
            return false;
        }

        // ======================================
        // CONTEXT
        // ======================================

        const audioContext =
            new AudioContext();

        // ======================================
        // SOURCE
        // ======================================

        const audioSource =
            audioContext.createMediaElementSource(
                video
            );

        // ======================================
        // USER VOLUME (SLIDER)
        // Handled via a GainNode with a smooth
        // transition (setTargetAtTime) rather than the
        // raw <video> volume (video.volume),
        // which jumps abruptly on every
        // pixel of slider dragging and
        // causes audible crackling.
        // ======================================

        const initialVolume =
            Number.isFinite(
                vehicleVolumes[vehicleId]
            )
                ? vehicleVolumes[vehicleId]
                : (
                    Number.isFinite(vehicleState.volume)
                        ? vehicleState.volume
                        : 1.0
                );

        const userVolumeGain =
            audioContext.createGain();

        userVolumeGain.gain.value =
            initialVolume;

        // The native <video> volume is fixed at 100%:
        // all volume control now goes
        // through userVolumeGain, smoothly.
        if (typeof player.setVolume === 'function') {
            player.setVolume(100);
        }

        // ======================================
        // FILTER (INSIDE / OUTSIDE)
        // ======================================

        const audioFilter =
            audioContext.createBiquadFilter();

        audioFilter.type =
            'lowpass';

        audioFilter.frequency.value =
            20000;

        audioFilter.Q.value =
            0.8;

        // ======================================
        // EQUALIZER (BASS / SUB / MID / TREBLE)
        // ======================================

        const eqSub =
            audioContext.createBiquadFilter();

        eqSub.type =
            'lowshelf';

        eqSub.frequency.value =
            DEFAULT_AUDIO_EFFECTS.subwoofer.frequency;

        eqSub.gain.value =
            0;

        const eqBass =
            audioContext.createBiquadFilter();

        eqBass.type =
            'lowshelf';

        eqBass.frequency.value =
            DEFAULT_AUDIO_EFFECTS.bass.frequency;

        eqBass.gain.value =
            0;

        const eqMid =
            audioContext.createBiquadFilter();

        eqMid.type =
            'peaking';

        eqMid.frequency.value =
            DEFAULT_AUDIO_EFFECTS.mid.frequency;

        eqMid.Q.value =
            1.0;

        eqMid.gain.value =
            0;

        const eqTreble =
            audioContext.createBiquadFilter();

        eqTreble.type =
            'highshelf';

        eqTreble.frequency.value =
            DEFAULT_AUDIO_EFFECTS.treble.frequency;

        eqTreble.gain.value =
            0;

        // ======================================
        // GAIN
        // ======================================

        const audioGain =
            audioContext.createGain();

        audioGain.gain.value =
            1.0;

        // ======================================
        // LIMITER (ANTI-CLIPPING)
        // Placed at the very end of the chain,
        // AFTER the inside/outside ambience
        // gain, to always catch the
        // final level actually sent to the
        // audio output (otherwise the peaks created
        // by the BASS/SUB boosts + the inside
        // gain went back above
        // 0dBFS after processing -> dropouts/
        // crackling).
        // ======================================

        const audioLimiter =
            audioContext.createDynamicsCompressor();

        audioLimiter.threshold.value =
            -3;

        audioLimiter.knee.value =
            0;

        audioLimiter.ratio.value =
            20;

        audioLimiter.attack.value =
            0.001;

        audioLimiter.release.value =
            0.15;

        // ======================================
        // SAFETY MARGIN (HEADROOM)
        // Small level reduction before the limiter
        // to give it some room and avoid
        // having it work too hard all the
        // time (which sounds "squashed").
        // ======================================

        const audioHeadroom =
            audioContext.createGain();

        audioHeadroom.gain.value =
            0.85;

        // ======================================
        // CHAIN
        // ======================================

        audioSource.connect(
            userVolumeGain
        );

        userVolumeGain.connect(
            eqSub
        );

        eqSub.connect(
            eqBass
        );

        eqBass.connect(
            eqMid
        );

        eqMid.connect(
            eqTreble
        );

        eqTreble.connect(
            audioFilter
        );

        audioFilter.connect(
            audioGain
        );

        audioGain.connect(
            audioHeadroom
        );

        audioHeadroom.connect(
            audioLimiter
        );

        audioLimiter.connect(
            audioContext.destination
        );

        // ======================================
        // STORE THE CHAIN
        // ======================================

        vehicleAudioChains[vehicleId] = {

            context:
                audioContext,

            source:
                audioSource,

            filter:
                audioFilter,

            gain:
                audioGain,

            volume:
                userVolumeGain,

            limiter:
                audioLimiter,

            eq: {
                subwoofer: eqSub,
                bass: eqBass,
                mid: eqMid,
                treble: eqTreble
            },

            connected:
                true

        };

        // ======================================
        // REAPPLY THE ACTIVE BANDS (IF ANY)
        // ======================================

        reapplyAudioEffectBands(
            vehicleId
        );

        // ======================================
        // WAKE UP THE CONTEXT
        // ======================================

        if (
            audioContext.state ===
            'suspended'
        ) {

            audioContext.resume();

        }

        return true;

    }
    catch (error) {

        return false;

    }

}

// ==========================================
// APPLY THE USER VOLUME (WITHOUT CLICK)
// Goes through the dedicated GainNode when the vehicle's
// Web Audio chain exists (smooth
// transition), otherwise falls back to the classic
// YouTube API (setVolume) until it
// is ready.
// ==========================================

function setVehicleVolume(
    vehicleId,
    vehiclePlayer,
    volume
) {

    const chain =
        vehicleAudioChains[vehicleId];

    if (chain && chain.connected && chain.volume) {

        const now =
            chain.context.currentTime;

        chain.volume.gain.cancelScheduledValues(
            now
        );

        chain.volume.gain.setTargetAtTime(
            volume,
            now,
            0.03
        );

        return;

    }

    if (
        vehiclePlayer &&
        typeof vehiclePlayer.setVolume === 'function'
    ) {

        vehiclePlayer.setVolume(
            Math.round(volume * 100)
        );

    }

}

// ==========================================
// APPLY THE ACTIVE EQUALIZER BANDS
// (each button toggles independently,
// several bands can be stacked)
// ==========================================

function setAudioEffectBand(
    vehicleId,
    band,
    enabled,
    silent = false
) {

    if (
        vehicleId === null ||
        vehicleId === undefined
    ) {
        return;
    }

    const chain =
        vehicleAudioChains[vehicleId];

    if (!chain || !chain.eq || !chain.eq[band]) {
        return;
    }

    if (!vehicleActiveEffectPreset[vehicleId]) {

        vehicleActiveEffectPreset[vehicleId] =
            {};

    }

    const now =
        chain.context.currentTime;

    const config =
        audioEffectsConfig || {};

    const filter =
        chain.eq[band];

    filter.gain.cancelScheduledValues(
        now
    );

    if (enabled) {

        const bandDefaults =
            DEFAULT_AUDIO_EFFECTS[band] || {};

        const bandConfig =
            config[band] || {};

        const frequency =
            Number(bandConfig.frequency) ||
            bandDefaults.frequency ||
            filter.frequency.value;

        const gain =
            Number(bandConfig.gain);

        filter.frequency.value =
            frequency;

        filter.gain.setTargetAtTime(
            Number.isFinite(gain)
                ? gain
                : (bandDefaults.gain ?? 0),
            now,
            0.05
        );

        vehicleActiveEffectPreset[vehicleId][band] =
            true;

    } else {

        filter.gain.setTargetAtTime(
            0,
            now,
            0.05
        );

        vehicleActiveEffectPreset[vehicleId][band] =
            false;

    }

    if (!silent) {

        updateAudioEffectButtonsUI(
            vehicleId
        );

    }

}

function reapplyAudioEffectBands(vehicleId) {

    const activeBands =
        vehicleActiveEffectPreset[vehicleId];

    if (!activeBands) {
        return;
    }

    AUDIO_EFFECT_BANDS.forEach(
        (bandName) => {

            if (activeBands[bandName]) {

                setAudioEffectBand(
                    vehicleId,
                    bandName,
                    true,
                    true
                );

            }

        }
    );

}

function updateAudioEffectButtonsUI(vehicleId) {

    const activeBands =
        vehicleActiveEffectPreset[vehicleId] ||
        {};

    AUDIO_EFFECT_BANDS.forEach(
        (bandName) => {

            const button =
                document.getElementById(
                    'audio-effect-' + bandName
                );

            if (!button) {
                return;
            }

            button.classList.toggle(
                'active',
                activeBands[bandName] === true
            );

        }
    );

}

// ==========================================
// VEHICLE AUDIO ENVIRONMENT
// ==========================================

function updateVehicleAudioEnvironment(
    distance = 0,
    vehicleId = null,
    inside = false
) {

    // ======================================
    // SOURCE VEHICLE
    // ======================================

    if (
        vehicleId === null ||
        vehicleId === undefined
    ) {
        return;
    }

    // ======================================
    // VEHICLE AUDIO CHAIN
    // ======================================

    const audioChain =
        vehicleAudioChains[
            vehicleId
        ];

    if (
        !audioChain ||
        !audioChain.connected
    ) {
        return;
    }

    const audioContext =
        audioChain.context;

    const audioFilter =
        audioChain.filter;

    const audioGain =
        audioChain.gain;

    // ======================================
    // DISTANCE VALIDATION
    // ======================================

    distance =
        Number(distance);

    if (
        !Number.isFinite(distance) ||
        distance < 0
    ) {
        distance = 0;
    }

    // ======================================
    // VEHICLE STATE
    // ======================================

    const doorOpen =
        isVehicleDoorOpen === true;

    // ======================================
    // REMEMBERED STATE FOR THIS VEHICLE
    // ======================================

    if (
        !vehicleAudioEnvironmentStates[
            vehicleId
        ]
    ) {

        vehicleAudioEnvironmentStates[
            vehicleId
        ] = {

            // FIX: we remember the last distance
            // ACTUALLY APPLIED to the audio (and not
            // the last distance merely received), so
            // that the 0.25 threshold represents a movement
            // accumulated since the last audio update.
            appliedDistance: -1,

            doorOpen:
                null,

            inside:
                null

        };

    }

    const environmentState =
        vehicleAudioEnvironmentStates[
            vehicleId
        ];

    // ======================================
    // CHANGE DETECTION
    // ======================================

    const distanceChanged =
        environmentState.appliedDistance < 0 ||
        Math.abs(
            distance -
            environmentState.appliedDistance
        ) >= 0.25;

    const doorChanged =
        environmentState.doorOpen !==
        doorOpen;

    const insideChanged =
        environmentState.inside !==
        inside;

    // ======================================
    // NO CHANGE
    // ======================================

    if (
        !distanceChanged &&
        !doorChanged &&
        !insideChanged
    ) {
        return;
    }

    // ======================================
    // REMEMBER (only when an update is
    // actually applied to the audio)
    // ======================================

    environmentState.appliedDistance =
        distance;

    environmentState.doorOpen =
        doorOpen;

    environmentState.inside =
        inside;

    const now =
        audioContext.currentTime;

    // ======================================
    // INSIDE
    // ======================================

    if (inside) {

        audioGain.gain
            .cancelScheduledValues(
                now
            );

        audioFilter.frequency
            .cancelScheduledValues(
                now
            );

        audioGain.gain
            .setTargetAtTime(
                1.0,
                now,
                0.30
            );

        audioFilter.frequency
            .setTargetAtTime(
                20000,
                now,
                0.30
            );

        return;
    }

    // ======================================
    // VERY CLOSE
    // ======================================

    if (
        distance <
        audioDistanceConfig.veryClose
    ) {

        audioGain.gain
            .cancelScheduledValues(
                now
            );

        audioFilter.frequency
            .cancelScheduledValues(
                now
            );

        audioGain.gain
            .setTargetAtTime(
                doorOpen
                    ? 0.75
                    : 0.50,
                now,
                0.30
            );

        audioFilter.frequency
            .setTargetAtTime(
                doorOpen
                    ? 16000
                    : 1000,
                now,
                0.30
            );

        return;
    }

    // ======================================
    // CLOSE
    // ======================================

    if (
        distance <
        audioDistanceConfig.close
    ) {

        audioGain.gain
            .cancelScheduledValues(
                now
            );

        audioFilter.frequency
            .cancelScheduledValues(
                now
            );

        audioGain.gain
            .setTargetAtTime(
                doorOpen
                    ? 0.70
                    : 0.30,
                now,
                0.35
            );

        audioFilter.frequency
            .setTargetAtTime(
                doorOpen
                    ? 12000
                    : 750,
                now,
                0.35
            );

        return;
    }

    // ======================================
    // MEDIUM DISTANCE
    // ======================================

    if (
        distance <
        audioDistanceConfig.medium
    ) {

        audioGain.gain
            .cancelScheduledValues(
                now
            );

        audioFilter.frequency
            .cancelScheduledValues(
                now
            );

        audioGain.gain
            .setTargetAtTime(
                doorOpen
                    ? 0.55
                    : 0.15,
                now,
                0.40
            );

        audioFilter.frequency
            .setTargetAtTime(
                doorOpen
                    ? 9000
                    : 500,
                now,
                0.40
            );

        return;
    }

    // ======================================
    // FAR DISTANCE
    // ======================================

    if (
        distance <
        audioDistanceConfig.far
    ) {

        audioGain.gain
            .cancelScheduledValues(
                now
            );

        audioFilter.frequency
            .cancelScheduledValues(
                now
            );

        audioGain.gain
            .setTargetAtTime(
                doorOpen
                    ? 0.40
                    : 0.08,
                now,
                0.65
            );

        audioFilter.frequency
            .setTargetAtTime(
                doorOpen
                    ? 7000
                    : 350,
                now,
                0.65
            );

        return;
    }

    // ======================================
    // BEYOND MAX DISTANCE
    // ======================================

    const fadeStart =
        audioDistanceConfig.far;

    const fadeEnd =
        audioDistanceConfig.far + 4.0;

    const fadeProgress =
        Math.min(
            1,
            Math.max(
                0,
                (
                    distance -
                    fadeStart
                ) /
                (
                    fadeEnd -
                    fadeStart
                )
            )
        );

    const fadeCurve =
        fadeProgress *
        fadeProgress;

    const startGain =
        doorOpen
            ? 0.40
            : 0.08;

    const finalGain =
        startGain *
        (
            1 -
            fadeCurve
        );

    audioGain.gain.setTargetAtTime(
        finalGain,
        now,
        0.35
    );

    audioFilter.frequency.setTargetAtTime(
        doorOpen
            ? (
                7000 *
                (
                    1 -
                    fadeCurve
                ) +
                300
            )
            : (
                350 *
                (
                    1 -
                    fadeCurve
                ) +
                150
            ),
        now,
        0.35
    );

}


// ==========================================
// CREATE A YOUTUBE PLAYER FOR A VEHICLE
// ==========================================

// ==========================================
// APPLY THE STATE OF A REMOTE VEHICLE
// (without touching the interface or vehicleState)
// ==========================================

function applyRemoteVehicleState(vehicleId, state, attempt = 0) {

    if (
        vehicleId === null ||
        vehicleId === undefined ||
        !state ||
        typeof state !== 'object'
    ) {
        return;
    }

    // Our current vehicle is handled by applyVehicleState
    if (window.currentVehicleId === vehicleId) {
        return;
    }

    const retry = () => {
        if (attempt < 20) {
            setTimeout(
                () => applyRemoteVehicleState(vehicleId, state, attempt + 1),
                500
            );
        }
    };

    if (!youtubeReady) {
        retry();
        return;
    }

    remoteVehicleIds.add(vehicleId);

    const receivedVolume = Number(state.volume);

    if (Number.isFinite(receivedVolume)) {
        vehicleVolumes[vehicleId] = receivedVolume;
    }

    const player = createVehicleYoutubePlayer(vehicleId);

    if (!player) {
        return;
    }

    const ready =
        typeof player.loadVideoById === 'function' &&
        typeof player.playVideo === 'function' &&
        typeof player.pauseVideo === 'function';

    if (!ready) {
        retry();
        return;
    }

    if (!state.videoId) {
        try { player.pauseVideo(); } catch (e) {}
        return;
    }

    const currentVideo = safeGetVideoId(player);

    if (currentVideo !== state.videoId) {

        player.loadVideoById({
            videoId: state.videoId,
            startSeconds: Number(state.currentTime) || 0
        });

    }

    if (state.playing === true) {

        if (safeGetPlayerState(player) !== YT.PlayerState.PLAYING) {
            player.playVideo();
        }

    }
    else {

        if (safeGetPlayerState(player) !== YT.PlayerState.PAUSED) {
            player.pauseVideo();
        }

    }

    if (Number.isFinite(receivedVolume)) {
        setVehicleVolume(vehicleId, player, receivedVolume);
    }

}

function stopRemoteVehicle(vehicleId) {

    if (!remoteVehicleIds.has(vehicleId)) {
        return;
    }

    remoteVehicleIds.delete(vehicleId);

    if (window.currentVehicleId === vehicleId) {
        return;
    }

    const player = youtubePlayers[vehicleId];

    if (player) {
        try { player.stopVideo(); } catch (e) {}
        try { player.destroy(); } catch (e) {}
        delete youtubePlayers[vehicleId];
    }

    const leftover =
        document.getElementById(`youtube-player-${vehicleId}`);

    if (leftover) {
        leftover.remove();
    }

    const chain = vehicleAudioChains[vehicleId];

    if (chain) {
        try { chain.context.close(); } catch (e) {}
        delete vehicleAudioChains[vehicleId];
    }

    delete vehicleAudioEnvironmentStates[vehicleId];
    delete vehicleVolumes[vehicleId];

}

function createVehicleYoutubePlayer(vehicleId) {

    if (!vehicleId) {
        return null;
    }

    if (youtubePlayers[vehicleId]) {
        return youtubePlayers[vehicleId];
    }

    const playerContainer =
        document.createElement('div');

    playerContainer.id =
        `youtube-player-${vehicleId}`;

    playerContainer.style.position =
        'absolute';

    playerContainer.style.width =
        '1px';

    playerContainer.style.height =
        '1px';

    playerContainer.style.opacity =
        '0';

    playerContainer.style.pointerEvents =
        'none';

    document.body.appendChild(
        playerContainer
    );

    const player =
        new YT.Player(
            playerContainer.id,
            {
                width: '200',
                height: '200',

                videoId: '',

                playerVars: {
                    autoplay: 0,
                    controls: 0,
                    disablekb: 1,
                    playsinline: 1,
                    rel: 0,
                    origin: window.location.origin
                },

                events: {

					onReady: function () {

						setTimeout(
							() => {

								initVehicleWebAudio(
									vehicleId
								);

								// ==================================
								// AUTO ACCESS AFTER YOUTUBE READY
								// ==================================

								if (
									autoAccessEnabled &&
									autoAccessVehicleId === vehicleId &&
									vehicleState &&
									vehicleState.videoId
								) {

									applyVehicleState(
										vehicleState,
										vehicleId
									);

								}

							},
							500
						);

					},

onStateChange: function (event) {

    if (
        event.data !==
        YT.PlayerState.ENDED
    ) {
        return;
    }

    // Remote vehicle: the track end is handled
    // by its occupants, not by our playlist —
    // unless we are its audio keeper (we left it
    // playing and nobody is inside).
    if (
        remoteVehicleIds.has(vehicleId) &&
        window.currentVehicleId !== vehicleId &&
        window.keeperVehicleId !== vehicleId
    ) {
        return;
    }

    // ======================================
    // REPEAT ONE
    // ======================================

    if (
        repeatMode === 'one'
    ) {

        player.seekTo(
            0,
            true
        );

        player.playVideo();

        return;
    }

    // ======================================
    // SHUFFLE
    // ======================================

    if (
        shuffleEnabled &&
        playlist.length > 1
    ) {

        let nextIndex;

        do {

            nextIndex =
                Math.floor(
                    Math.random() *
                    playlist.length
                );

        } while (
            nextIndex ===
            currentTrackIndex
        );

        playTrack(
            nextIndex
        );

        return;
    }

    // ======================================
    // NEXT TRACK
    // ======================================

    if (
        currentTrackIndex <
        playlist.length - 1
    ) {

        playTrack(
            currentTrackIndex + 1
        );

        return;
    }

    // ======================================
    // REPEAT ALL
    // ======================================

    if (
        repeatMode === 'all' &&
        playlist.length > 0
    ) {

        playTrack(0);

        return;
    }

    // ======================================
    // END OF PLAYLIST
    // ======================================

    isPlaying = false;

    playButton.textContent =
        '▶';

    fetch(
        `https://${GetParentResourceName()}/audioControl`,
        {
            method: 'POST',

            headers: {
                'Content-Type':
                    'application/json'
            },

            body: JSON.stringify({
                action: 'pause'
            })
        }
    );

}

                }

            }
        );

    youtubePlayers[vehicleId] =
        player;

    return player;
}


// YouTube automatically calls this function
// when the API is ready.

window.onYouTubeIframeAPIReady = function () {

    youtubePlayer = new YT.Player(
        'youtube-player',
        {
            width: '200',
            height: '200',

            videoId: '',

                playerVars: {
                    autoplay: 0,
                    controls: 0,
                    disablekb: 1,
                    playsinline: 1,
                    rel: 0,
                    origin: window.location.origin
                },

            events: {

                // ==================================
                // YOUTUBE READY
                // ==================================

                onReady: function () {

                    youtubeReady = true;

                    // If the vehicle was detected before
                    // the YouTube API was ready, create
                    // its dedicated player now.
                    if (
                        window.currentVehicleId !== null &&
                        window.currentVehicleId !== undefined
                    ) {
                        createVehicleYoutubePlayer(
                            window.currentVehicleId
                        );
                    }

                    youtubePlayer.setVolume(
                        Number(volumeSlider.value)
                    );

                    setTimeout(
                        () => {
                            initVehicleWebAudio();
                        },
                        500
                    );

                },

                // ==================================
                // YOUTUBE STATE
                // ==================================

                onStateChange: function (event) {

                    // ------------------------------
                    // PLAYING
                    // ------------------------------

                    if (
                        event.data ===
                        YT.PlayerState.PLAYING
                    ) {

                        isPlaying = true;

                        playButton.textContent =
                            '❚❚';

                    }

                    // ------------------------------
                    // PAUSED
                    // ------------------------------

                    else if (
                        event.data ===
                        YT.PlayerState.PAUSED
                    ) {

                        isPlaying = false;

                        playButton.textContent =
                            '▶';

                    }

                    // ------------------------------
                    // END OF TRACK
                    // ------------------------------

                    else if (
                        event.data ===
                        YT.PlayerState.ENDED
                    ) {

                        // ==========================
                        // REPEAT ONE
                        // ==========================

                        if (
                            repeatMode === 'one'
                        ) {

                            youtubePlayer.seekTo(
                                0,
                                true
                            );

                            youtubePlayer.playVideo();

                            return;

                        }

                        // ==========================
                        // SHUFFLE
                        // ==========================

                        if (
                            shuffleEnabled &&
                            playlist.length > 1
                        ) {

                            let nextIndex;

                            do {

                                nextIndex =
                                    Math.floor(
                                        Math.random() *
                                        playlist.length
                                    );

                            } while (
                                nextIndex ===
                                currentTrackIndex
                            );

                            playTrack(
                                nextIndex
                            );

                            return;

                        }

                        // ==========================
                        // NEXT TRACK
                        // ==========================

                        if (
                            currentTrackIndex <
                            playlist.length - 1
                        ) {

                            playTrack(
                                currentTrackIndex + 1
                            );

                            return;

                        }

                        // ==========================
                        // REPEAT ALL
                        // ==========================

                        if (
                            repeatMode === 'all'
                        ) {

                            playTrack(0);

                            return;

                        }

                        // ==========================
                        // END OF PLAYLIST
                        // ==========================

                        isPlaying = false;

                        playButton.textContent =
                            '▶';

                    }

                }

            }

        }
    );

};


// ==========================================
// NUI MESSAGE
// ==========================================

window.addEventListener(
    'message',
    (event) => {

        const data =
            event.data;

        if (
            !data ||
            !data.action
        ) {
            return;
        }

		switch (data.action) {

			case 'windowConfig':

				if (
					data.config &&
					typeof data.config === 'object'
				) {

					playerWindowConfig = {

						draggable:
							data.config.draggable === true,

						x:
							typeof data.config.x === 'number'
								? data.config.x
								: 0.50,

						y:
							typeof data.config.y === 'number'
								? data.config.y
								: 0.50,

						savePosition:
							data.config.savePosition === true
					};

					closeWithEscapeEnabled =
						data.config.closeWithEscape === true;

					if (
						playerWindowConfig.draggable
					) {

						app.classList.add(
							'window-draggable'
						);

					} else {

						app.classList.remove(
							'window-draggable'
						);

					}

					requestAnimationFrame(
						() => {
							setInitialPlayerWindowPosition();
						}
					);
				}

				break;

            case 'open':

                openPlayer();

                break;

            case 'notify':

                showVehicleAudioNotification(data);

                break;

            case 'close':

                closePlayer();

                break;
				
			case 'togglePlayPause':

                if (playButton) {
                    playButton.click();
                }

                break;

            case 'loadPlaylist':

                loadPlaylist(
                    data.playlist
                );

                break;

            case 'metadataResult':

                handleMetadataResult(
                    data
                );

                break;

            // ==================================
            // VEHICLE AUDIO STATE
            // ==================================

            case 'vehicleState':

                applyVehicleState(
                    data.state,
                    data.vehicleId
                );

                break;

            // ==================================
            // REMOTE VEHICLE (bystander)
            // ==================================

            case 'remoteVehicleState':

                applyRemoteVehicleState(
                    data.vehicleId,
                    data.state
                );

                break;

            case 'remoteVehicleStop':

                stopRemoteVehicle(
                    data.vehicleId
                );

                break;
				
			case 'vehicleRemoved': {

                const id = data.vehicleId;

                remoteVehicleIds.delete(id);

                const player = youtubePlayers[id];

                if (player) {
                    try { player.stopVideo(); } catch (e) {}
                    try { player.destroy(); } catch (e) {}
                    delete youtubePlayers[id];
                }

                const leftover =
                    document.getElementById(`youtube-player-${id}`);

                if (leftover) {
                    leftover.remove();
                }

                const chain = vehicleAudioChains[id];

                if (chain) {
                    try { chain.context.close(); } catch (e) {}
                    delete vehicleAudioChains[id];
                }

                delete vehicleAudioEnvironmentStates[id];
                delete vehicleActiveEffectPreset[id];
                delete vehicleVolumes[id];

                if (window.currentVehicleId === id) {
                    isPlaying = false;
                    playButton.textContent = '▶';
                }

                break;
            }

            // ==================================
            // VEHICLE CHANGE
            // ==================================

			case 'vehicleChanged':

				window.currentVehicleId =
					data.vehicleId;

				if (
					data.vehicleId !== null &&
					data.vehicleId !== undefined
				) {
					remoteVehicleIds.delete(data.vehicleId);
				}

				// ==================================
				// LEAVING THE VEHICLE
				// ==================================

				if (
					data.vehicleId === null ||
					data.vehicleId === undefined
				) {

					autoAccessVehicleId =
						null;

					window.keeperVehicleId =
						(data.keeperVehicleId !== null && data.keeperVehicleId !== undefined)
							? data.keeperVehicleId
							: null;

					break;

				}

				window.keeperVehicleId = null;

				// ==================================
				// NEW VEHICLE
				// Auto access only concerns the
				// player's vehicle (owned, decided
				// on the Lua side via the key system).
				// ==================================

				autoAccessVehicleId =
					data.owned === false
						? null
						: data.vehicleId;

				// ==================================
				// CREATE THE VEHICLE PLAYER
				// ==================================

				if (
					youtubeReady &&
					typeof createVehicleYoutubePlayer === 'function'
				) {

					createVehicleYoutubePlayer(
						data.vehicleId
					);

				}

				updateAudioEffectButtonsUI(
					data.vehicleId
				);

				break;

                // ==================================
                // ENTERING A VEHICLE
                // ==================================

                break;

            // ==========================================
            // INSIDE / OUTSIDE STATE
            // ==========================================

			case 'vehicleInteriorState':

				isInsideVehicle =
					data.inside === true;

				console.log(
					'[wts_vehicleaudio] audio environment:',
					isInsideVehicle
						? 'INTÉRIEUR'
						: 'EXTÉRIEUR'
				);

				if (window.currentVehicleId != null) {
				const st = vehicleAudioEnvironmentStates[window.currentVehicleId];
				updateVehicleAudioEnvironment(
					st ? st.appliedDistance : 0,
					window.currentVehicleId,
					isInsideVehicle
				);
}

				break;

            // ==========================================
            // VEHICLE DISTANCE
            // ==========================================

            case 'vehicleAudioDistance':

                updateVehicleAudioEnvironment(
                    data.distance,
                    data.vehicleId,
                    data.inside === true
                );

                break;

            case 'vehicleAudioDistanceConfig':

                if (
                    data.config &&
                    typeof data.config === 'object'
                ) {

                    audioDistanceConfig = {
                        veryClose:
                            Number(data.config.veryClose) || 1.5,

                        close:
                            Number(data.config.close) || 4.0,

                        medium:
                            Number(data.config.medium) || 7.0,

                        far:
                            Number(data.config.far) || 12.0
                    };

                }

                break;

            case 'vehicleAudioEffectsConfig':

                if (
                    data.config &&
                    typeof data.config === 'object'
                ) {

                    audioEffectsConfig =
                        data.config;

                }

                break;

            case 'vehicleDoorState':

                isVehicleDoorOpen =
                    data.open === true;

                // Individual state of a door
                if (data.door) {

                    updateDoorButtonState(
                        data.door,
                        data.open === true
                    );

                }

                // Full state sent by the client
                if (data.states) {

                    updateAllDoorButtons(
                        data.states
                    );

                }

				if (window.currentVehicleId != null) {
					const st = vehicleAudioEnvironmentStates[window.currentVehicleId];
					updateVehicleAudioEnvironment(
						st ? st.appliedDistance : 0,
						window.currentVehicleId,
						isInsideVehicle
					);
}

                break;
				
			case 'vehicleHazardsState': {

				const button =
					document.getElementById('vehicle-hazards');

				if (!button) {
					break;
				}

				button.classList.toggle(
					'active',
					data.active === true
				);

				const label =
					button.querySelector('.lock-label');

				if (label) {
					label.textContent =
						data.active === true
							? 'Feux de détresse ACTIVÉS'
							: 'Feux de détresse';
				}

				break;
			}	

        }

    }	
);


// ==========================================
// APPLY VEHICLE STATE
// ==========================================



function safeGetPlayerState(player) {

    if (
        !player ||
        typeof player.getPlayerState !== 'function'
    ) {
        return null;
    }

    try {
        return player.getPlayerState();
    } catch (error) {
        return null;
    }
}


function safeGetVideoId(player, fallback = null) {

    if (
        !player ||
        typeof player.getVideoData !== 'function'
    ) {
        return fallback;
    }

    try {
        const data = player.getVideoData();

        if (
            data &&
            typeof data.video_id === 'string'
        ) {
            return data.video_id;
        }
    } catch (error) {}

    return fallback;
}

function applyVehicleState(
    state,
    vehicleId = null
) {

    if (!state || typeof state !== 'object') {
        return;
    }

    if (
        vehicleId === null ||
        vehicleId === undefined
    ) {
        return;
    }

    const previousVideoId =
        vehicleState.videoId;

    const sameVideo =
        previousVideoId &&
        state.videoId &&
        previousVideoId === state.videoId;

    vehicleState = {
        videoId: state.videoId ?? null,
        title: state.title ?? null,
        artist: state.artist ?? null,
        thumbnail: state.thumbnail ?? null,
        playing: state.playing === true,
        currentTime: Number(state.currentTime) || 0,
        volume: Number(state.volume),
        shuffle: state.shuffle === true,
        repeatMode: state.repeatMode || 'off'
    };

    if (
        volumeSlider &&
        window.currentVehicleId !== null &&
        window.currentVehicleId !== undefined
    ) {

        const currentVehicle =
            window.currentVehicleId;

        const receivedVolume =
            Number(
                vehicleState.volume
            );

        if (
            Number.isFinite(
                receivedVolume
            )
        ) {

            vehicleVolumes[
                currentVehicle
            ] =
                receivedVolume;

        }

        const vehicleVolume =
            vehicleVolumes[
                currentVehicle
            ];

        if (
            Number.isFinite(
                vehicleVolume
            )
        ) {

            volumeSlider.value =
                Math.round(
                    vehicleVolume * 100
                );

        }

    }

    shuffleEnabled =
        vehicleState.shuffle;

    updateShuffleDisplay();

    repeatMode =
        vehicleState.repeatMode;

    if (
        repeatMode !== 'off' &&
        repeatMode !== 'all' &&
        repeatMode !== 'one'
    ) {

        repeatMode =
            'off';

    }

    updateRepeatDisplay();

    if (vehicleState.videoId) {

        const index =
            playlist.findIndex(
                track =>
                    track &&
                    track.videoId ===
                    vehicleState.videoId
            );

        if (index !== -1) {

            currentTrackIndex =
                index;

        }

    }

    if (!sameVideo) {

        updateCurrentTrackDisplay();

        renderPlaylist();

    }

    // ==========================================
    // VEHICLE PLAYER
    // ==========================================

    const vehiclePlayer =
        getCurrentVehiclePlayer();

    if (
        youtubeReady &&
        vehiclePlayer &&
        vehicleState.videoId
    ) {

        // ======================================
        // SAFEGUARDS: the per-vehicle YT player
        // may exist without its API methods
        // being attached yet (right after its
        // creation, before the internal iframe has
        // finished initializing). Each method is
        // checked before calling it to avoid a
        // JS crash that would stop the whole script.
        // ======================================

        const hasGetVideoData =
            typeof vehiclePlayer.getVideoData === 'function';

        const hasGetPlayerState =
            typeof vehiclePlayer.getPlayerState === 'function';

        const hasLoadVideoById =
            typeof vehiclePlayer.loadVideoById === 'function';

        const hasPlayVideo =
            typeof vehiclePlayer.playVideo === 'function';

        const hasPauseVideo =
            typeof vehiclePlayer.pauseVideo === 'function';

        const currentVideo =
            hasGetVideoData
                ? safeGetVideoId(vehiclePlayer)
                : null;

        if (
            hasLoadVideoById &&
            currentVideo !==
            vehicleState.videoId
        ) {

            vehiclePlayer.loadVideoById({
                videoId:
                    vehicleState.videoId,

                startSeconds:
                    vehicleState.currentTime
            });

        }

        if (vehicleState.playing) {

            if (
                hasPlayVideo &&
                (
                    !hasGetPlayerState ||
                    safeGetPlayerState(vehiclePlayer) !==
                    YT.PlayerState.PLAYING
                )
            ) {

                vehiclePlayer.playVideo();

            }

            isPlaying =
                true;

            playButton.textContent =
                '❚❚';

        }
        else {

            if (
                hasPauseVideo &&
                (
                    !hasGetPlayerState ||
                    safeGetPlayerState(vehiclePlayer) !==
                    YT.PlayerState.PAUSED
                )
            ) {

                vehiclePlayer.pauseVideo();

            }

            isPlaying =
                false;

            playButton.textContent =
                '▶';

        }

    }
    else {

        isPlaying =
            vehicleState.playing;

        if (isPlaying) {

            playButton.textContent =
                '❚❚';

        }
        else {

            playButton.textContent =
                '▶';

        }

    }

vehicleStateReceived =
    true;


// ==========================================
// AUTO ACCESS
// ==========================================

if (
    autoAccessEnabled &&
    autoAccessVehicleId === vehicleId &&
    vehicleState.videoId
) {

    const autoVehicleId =
        vehicleId;

    setTimeout(
        () => {

            // Check that the player is
            // still in the same vehicle

            if (
                window.currentVehicleId !==
                autoVehicleId
            ) {
                return;
            }

            const vehiclePlayer =
                youtubePlayers[
                    autoVehicleId
                ];

            if (
                !youtubeReady ||
                !vehiclePlayer
            ) {
                return;
            }

            // ==================================
            // LOAD THE LAST TRACK
            // ==================================

            const currentVideo =
                typeof vehiclePlayer.getVideoData === 'function'
                    ? safeGetVideoId(vehiclePlayer)
                    : null;

            if (
                typeof vehiclePlayer.loadVideoById === 'function' &&
                currentVideo !==
                vehicleState.videoId
            ) {

                vehiclePlayer.loadVideoById({
                    videoId:
                        vehicleState.videoId,

                    startSeconds:
                        vehicleState.currentTime || 0
                });

            }

            // ==================================
            // RESTORE THE VOLUME
            // ==================================

            const savedVolume =
                Number(
                    vehicleState.volume
                );

            if (
                Number.isFinite(
                    savedVolume
                )
            ) {

                setVehicleVolume(
                    autoVehicleId,
                    vehiclePlayer,
                    savedVolume
                );

                volumeSlider.value =
                    Math.round(
                        savedVolume * 100
                    );

                vehicleVolumes[
                    autoVehicleId
                ] =
                    savedVolume;

            }

            // ==================================
            // AUTOMATIC PLAYBACK
            // ==================================

            if (
                typeof vehiclePlayer.playVideo === 'function'
            ) {

                vehiclePlayer.playVideo();

            }

            isPlaying =
                true;

            playButton.textContent =
                '❚❚';

            // ==================================
            // INFORM THE SERVER
            // ==================================

            fetch(
                `https://${GetParentResourceName()}/audioControl`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        action:
                            'play'
                    })
                }
            );

        },
        800
    );

}

}


// ==========================================
// SHUFFLE DISPLAY
// ==========================================

function updateShuffleDisplay() {

    if (!shuffleButton) {
        return;
    }

    if (shuffleEnabled) {

        shuffleButton.style.color =
            '#ffffff';

        shuffleButton.style.background =
            'rgba(255, 255, 255, 0.10)';

    }
    else {

        shuffleButton.style.color =
            '';

        shuffleButton.style.background =
            '';

    }

}


// ==========================================
// REPEAT DISPLAY
// ==========================================

function updateRepeatDisplay() {

    if (!repeatButton) {
        return;
    }

    // ======================================
    // OFF
    // ======================================

    if (
        repeatMode === 'off'
    ) {

        repeatButton.textContent =
            '↻';

        repeatButton.style.color =
            '';

        repeatButton.style.background =
            '';

    }

    // ======================================
    // ALL
    // ======================================

    else if (
        repeatMode === 'all'
    ) {

        repeatButton.textContent =
            '↻';

        repeatButton.style.color =
            '#ffffff';

        repeatButton.style.background =
            'rgba(255, 255, 255, 0.10)';

    }

    // ======================================
    // ONE
    // ======================================

    else if (
        repeatMode === 'one'
    ) {

        repeatButton.textContent =
            '↻¹';

        repeatButton.style.color =
            '#ffffff';

        repeatButton.style.background =
            'rgba(255, 255, 255, 0.10)';

    }

}


// ==========================================
// OPENING
// ==========================================

function openPlayer() {

    app.classList.remove(
        'hidden'
    );

    // Restore the last Drive Control choice
    const savedDriveControl =
        localStorage.getItem(
            driveControlStorageKey
        );

    if (
        savedDriveControl !== null
    ) {

        driveControlEnabled =
            savedDriveControl === 'true';

    }

    updateDriveControlDisplay();

    fetch(
        `https://${GetParentResourceName()}/setDriveControl`,
        {
            method: 'POST',
            headers: {
                'Content-Type':
                    'application/json'
            },
            body: JSON.stringify({
                enabled:
                    driveControlEnabled
            })
        }
    );

    fetch(
        `https://${GetParentResourceName()}/requestVehicleState`,
        {
            method: 'POST',
            headers: {
                'Content-Type':
                    'application/json'
            },
            body: JSON.stringify({})
        }
    );

}


// ==========================================
// CLOSING
// ==========================================

function closePlayer() {

    app.classList.add(
        'hidden'
    );

    closeAddModal();

    fetch(
        `https://${GetParentResourceName()}/close`,
        {
            method: 'POST',

            headers: {
                'Content-Type':
                    'application/json'
            },

            body: JSON.stringify({})
        }
    );

}


// ==========================================
// CLOSE BUTTON
// ==========================================

closeButton.addEventListener(
    'click',
    () => {

        closePlayer();

    }
);

const closeDoorsButton =
    document.getElementById(
        'close-btn-doors'
    );

closeDoorsButton.addEventListener(
    'click',
    () => {

        closePlayer();

    }
);


// ==========================================
// BACKSPACE
// ==========================================

document.addEventListener(
    'keydown',
    (event) => {

		if (
			event.key !== 'Backspace' &&
			event.key !== 'Escape'
		) {
			return;
		}

        if (
            !addModal.classList.contains(
                'hidden'
            )
        ) {

            event.preventDefault();

            closeAddModal();

            return;

        }

        // Closing the player via Escape respects
        // Config.CloseWithEscape (Backspace always
        // stays active as a direct shortcut).
        if (
            event.key === 'Escape' &&
            !closeWithEscapeEnabled
        ) {
            return;
        }

        if (
            !app.classList.contains(
                'hidden'
            )
        ) {

            event.preventDefault();

            closePlayer();

        }

    }
);


// ==========================================
// PLAY / PAUSE
// ==========================================

playButton.addEventListener(
    'click',
    () => {

        const currentVehicle =
            window.currentVehicleId;

        const vehiclePlayer =
            currentVehicle
                ? youtubePlayers[currentVehicle]
                : null;

        if (
            !youtubeReady ||
            !isVehiclePlayerReady(vehiclePlayer)
        ) {
            return;
        }

        // ==========================================
        // PAUSE
        // ==========================================

        if (isPlaying) {

            isPlaying =
                false;

            playButton.textContent =
                '▶';

            fetch(
                `https://${GetParentResourceName()}/audioControl`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        action:
                            'pause'
                    })
                }
            );

            if (
                typeof vehiclePlayer.pauseVideo === 'function'
            ) {

                vehiclePlayer.pauseVideo();

            }

            return;
        }

        // ==========================================
        // PLAYBACK
        // ==========================================

        const currentTrack =
            playlist[currentTrackIndex];

        if (
            !currentTrack ||
            !currentTrack.videoId
        ) {
            return;
        }

        const currentVideo =
            typeof vehiclePlayer.getVideoData === 'function'
                ? safeGetVideoId(vehiclePlayer)
                : null;

        // ==========================================
        // THE RIGHT TRACK IS ALREADY LOADED
        // ==========================================

        if (
            currentVideo ===
            currentTrack.videoId
        ) {

            if (
                typeof vehiclePlayer.playVideo === 'function'
            ) {

                vehiclePlayer.playVideo();

            }

            isPlaying =
                true;

            playButton.textContent =
                '❚❚';

            fetch(
                `https://${GetParentResourceName()}/audioControl`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        action:
                            'play'
                    })
                }
            );

            return;
        }

        // ==========================================
        // THE TRACK IS NOT LOADED
        // ==========================================

        playTrack(
            currentTrackIndex
        );

    }
);


// ==========================================
// PREVIOUS
// ==========================================

previousButton.addEventListener(
    'click',
    () => {

        const currentVehicle =
            window.currentVehicleId;

        const vehiclePlayer =
            currentVehicle
                ? youtubePlayers[currentVehicle]
                : null;

        if (
            !youtubeReady ||
            !isVehiclePlayerReady(vehiclePlayer)
        ) {
            return;
        }

        if (
            playlist.length === 0
        ) {
            return;
        }

        let previousIndex =
            currentTrackIndex - 1;

        if (
            previousIndex < 0
        ) {

            previousIndex =
                playlist.length - 1;

        }

        playTrack(
            previousIndex
        );

    }
);


// ==========================================
// NEXT
// ==========================================

nextButton.addEventListener(
    'click',
    () => {

        const currentVehicle =
            window.currentVehicleId;

        const vehiclePlayer =
            currentVehicle
                ? youtubePlayers[currentVehicle]
                : null;

        if (
            !youtubeReady ||
            !isVehiclePlayerReady(vehiclePlayer)
        ) {
            return;
        }

        if (
            playlist.length === 0
        ) {
            return;
        }

        let nextIndex =
            currentTrackIndex + 1;

        if (
            nextIndex >=
            playlist.length
        ) {

            nextIndex = 0;

        }

        playTrack(
            nextIndex
        );

    }
);


// ==========================================
// SHUFFLE
// ==========================================

shuffleButton.addEventListener(
    'click',
    () => {

        shuffleEnabled =
            !shuffleEnabled;

        updateShuffleDisplay();

        vehicleState.shuffle =
            shuffleEnabled;

        fetch(
            `https://${GetParentResourceName()}/audioControl`,
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json'
                },

                body: JSON.stringify({

                    action:
                        'shuffle',

                    shuffle:
                        shuffleEnabled

                })
            }
        );

    }
);


// ==========================================
// REPEAT
// ==========================================

repeatButton.addEventListener(
    'click',
    () => {

        if (
            repeatMode === 'off'
        ) {

            repeatMode = 'all';

        }

        else if (
            repeatMode === 'all'
        ) {

            repeatMode = 'one';

        }

        else {

            repeatMode = 'off';

        }

        updateRepeatDisplay();

        vehicleState.repeatMode =
            repeatMode;

        fetch(
            `https://${GetParentResourceName()}/audioControl`,
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json'
                },

                body: JSON.stringify({

                    action:
                        'repeat',

                    repeatMode:
                        repeatMode

                })
            }
        );

    }
);


// ==========================================
// PLAY A TRACK
// ==========================================

function playTrack(index) {

    if (
        index < 0 ||
        index >= playlist.length
    ) {
        return;
    }

    const track =
        playlist[index];

    if (
        !track ||
        !track.videoId
    ) {
        return;
    }

    currentTrackIndex =
        index;

    updateCurrentTrackDisplay();
    renderPlaylist();

    // ==========================================
    // CURRENT VEHICLE PLAYER
    // ==========================================

    const vehiclePlayer =
        getCurrentVehiclePlayer();

    if (
        !youtubeReady ||
        !isVehiclePlayerReady(vehiclePlayer)
    ) {
        return;
    }

    if (
        typeof vehiclePlayer.loadVideoById === 'function'
    ) {

        vehiclePlayer.loadVideoById(
            track.videoId
        );

    }

    isPlaying =
        true;

    playButton.textContent =
        '❚❚';

    fetch(
        `https://${GetParentResourceName()}/audioControl`,
        {
            method: 'POST',

            headers: {
                'Content-Type':
                    'application/json'
            },

            body: JSON.stringify({

                action:
                    'track',

                videoId:
                    track.videoId,

                title:
                    track.title,

                artist:
                    track.artist,

                thumbnail:
                    track.thumbnail

            })

        }
    );

}


// ==========================================
// CURRENT TRACK DISPLAY
// ==========================================

function updateCurrentTrackDisplay() {

    const titleElement =
        document.getElementById(
            'track-title'
        );

    const artistElement =
        document.getElementById(
            'track-artist'
        );

    if (
        currentTrackIndex < 0 ||
        currentTrackIndex >= playlist.length
    ) {

        titleElement.textContent =
            'Aucun morceau';

        artistElement.textContent =
            'Aucun audio en lecture';

        if (coverImage) {

            coverImage.style.display =
                'none';

            coverImage.src = '';

        }

        if (coverIcon) {

            coverIcon.style.display =
                'block';

        }

        return;

    }

    const track =
        playlist[
            currentTrackIndex
        ];

    if (!track) {
        return;
    }

    titleElement.textContent =
        track.title ||
        'Morceau YouTube';

    artistElement.textContent =
        track.artist ||
        'YouTube';

    if (
        track.thumbnail &&
        coverImage
    ) {

        coverImage.src =
            track.thumbnail;

        coverImage.style.display =
            'block';

        if (coverIcon) {

            coverIcon.style.display =
                'none';

        }

    }
    else {

        if (coverImage) {

            coverImage.style.display =
                'none';

            coverImage.src = '';

        }

        if (coverIcon) {

            coverIcon.style.display =
                'block';

        }

    }

}


// ==========================================
// PROGRESS
// ==========================================

function formatTime(seconds) {

    if (
        !seconds ||
        !isFinite(seconds)
    ) {
        return '0:00';
    }

    seconds =
        Math.floor(seconds);

    const minutes =
        Math.floor(
            seconds / 60
        );

    const remainingSeconds =
        seconds % 60;

    return (
        minutes +
        ':' +
        String(
            remainingSeconds
        ).padStart(
            2,
            '0'
        )
    );

}


function updateProgress() {

    const vehiclePlayer =
        getCurrentVehiclePlayer();

    if (
        !youtubeReady ||
        !isVehiclePlayerReady(vehiclePlayer)
    ) {
        return;
    }

	if (
		typeof vehiclePlayer.getDuration !== 'function' ||
		typeof vehiclePlayer.getCurrentTime !== 'function'
	) {
		return;
	}

	const duration =
		vehiclePlayer.getDuration();

	const currentTime =
		vehiclePlayer.getCurrentTime();

    if (
        !duration ||
        !isFinite(duration)
    ) {
        return;
    }

    const percentage =
        (
            currentTime /
            duration
        ) * 100;

    const progress =
        document.getElementById(
            'progress'
        );

    const currentTimeElement =
        document.getElementById(
            'current-time'
        );

    const durationElement =
        document.getElementById(
            'duration'
        );

    if (progress) {

        progress.style.width =
            `${percentage}%`;

    }

    if (currentTimeElement) {

        currentTimeElement.textContent =
            formatTime(
                currentTime
            );

    }

    if (durationElement) {

        durationElement.textContent =
            formatTime(
                duration
            );

    }

    // ======================================
    // SYNC THE POSITION
    // ======================================

    if (isPlaying) {

        vehicleState.currentTime =
            currentTime;

        const now =
            Date.now();

        if (
            !window.lastCurrentTimeSync ||
            now -
                window.lastCurrentTimeSync >=
                1000
        ) {

            window.lastCurrentTimeSync =
                now;

            fetch(
                `https://${GetParentResourceName()}/audioControl`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({

                        action:
                            'currentTime',

                        currentTime:
                            currentTime

                    })
                }
            );

        }

    }

}


// Update every 250 ms

setInterval(
    updateProgress,
    250
);


// ==========================================
// PROGRESS BAR CLICK
// ==========================================

progressBar.addEventListener(
    'click',
    (event) => {

        const currentVehicle =
            window.currentVehicleId;

        const vehiclePlayer =
            currentVehicle
                ? youtubePlayers[currentVehicle]
                : null;

        if (
            !youtubeReady ||
            !isVehiclePlayerReady(vehiclePlayer)
        ) {
            return;
        }
		
		if (typeof vehiclePlayer.getDuration !== 'function') {
			return;
}

        const duration =
            vehiclePlayer.getDuration();

        if (
            !duration ||
            !isFinite(duration)
        ) {
            return;
        }

        const rect =
            progressBar.getBoundingClientRect();

        if (
            !rect.width
        ) {
            return;
        }

        const clickPosition =
            event.clientX -
            rect.left;

        const ratio =
            Math.min(
                1,
                Math.max(
                    0,
                    clickPosition /
                    rect.width
                )
            );

        const newTime =
            duration *
            ratio;

        if (
            typeof vehiclePlayer.seekTo === 'function'
        ) {

            vehiclePlayer.seekTo(
                newTime,
                true
            );

        }

        vehicleState.currentTime =
            newTime;

        fetch(
            `https://${GetParentResourceName()}/audioControl`,
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json'
                },

                body: JSON.stringify({

                    action:
                        'currentTime',

                    currentTime:
                        newTime

                })
            }
        );

    }
);


// ==========================================
// VOLUME
// ==========================================

let volumeSyncDebounceTimer = null;

volumeSlider.addEventListener(
    'input',
    () => {

        const volume =
            Number(
                volumeSlider.value
            );

        // ======================================
        // CURRENT VEHICLE
        // ======================================

        const currentVehicle =
            window.currentVehicleId;

        const vehiclePlayer =
            currentVehicle
                ? youtubePlayers[currentVehicle]
                : null;

        // ======================================
        // KEEP THE LOCAL VOLUME
        // ======================================

        vehicleState.volume =
            volume / 100;

        if (
            window.currentVehicleId !== null &&
            window.currentVehicleId !== undefined
        ) {

            vehicleVolumes[
                window.currentVehicleId
            ] =
                volume / 100;

        }

        // ======================================
        // APPLY TO THE RIGHT PLAYER (WITHOUT CLICK)
        // ======================================

        if (
            youtubeReady &&
            currentVehicle !== null &&
            currentVehicle !== undefined
        ) {

            setVehicleVolume(
                currentVehicle,
                vehiclePlayer,
                volume / 100
            );

        }

        // ======================================
        // SYNC THE SERVER (DEBOUNCED)
        // Avoids a network fetch on every pixel of
        // slider dragging.
        // ======================================

        if (volumeSyncDebounceTimer) {
            clearTimeout(volumeSyncDebounceTimer);
        }

        volumeSyncDebounceTimer = setTimeout(
            () => {

                fetch(
                    `https://${GetParentResourceName()}/audioControl`,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({

                            action:
                                'volume',

                            volume:
                                volume / 100

                        })
                    }
                );

            },
            150
        );

    }
);


// ==========================================
// OPEN MODAL
// ==========================================

addTrackButton.addEventListener(
    'click',
    () => {

        openAddModal();

    }
);


function openAddModal() {

    addModal.classList.remove(
        'hidden'
    );

    youtubeUrl.value = '';

    setTimeout(
        () => {

            youtubeUrl.focus();

        },
        50
    );

}


// ==========================================
// CLOSE MODAL
// ==========================================

function closeAddModal() {

    addModal.classList.add(
        'hidden'
    );

}


// ==========================================
// X MODAL
// ==========================================

modalClose.addEventListener(
    'click',
    () => {

        closeAddModal();

    }
);


// ==========================================
// CANCEL
// ==========================================

modalCancel.addEventListener(
    'click',
    () => {

        closeAddModal();

    }
);


// ==========================================
// YOUTUBE ID
// ==========================================

function getYouTubeId(url) {

    try {

        const parsedUrl =
            new URL(url);

        // youtube.com/watch?v=

        if (
            parsedUrl.hostname.includes(
                'youtube.com'
            ) &&
            parsedUrl.searchParams.get(
                'v'
            )
        ) {

            return parsedUrl
                .searchParams
                .get('v');

        }

        // youtu.be/

        if (
            parsedUrl.hostname ===
            'youtu.be'
        ) {

            return parsedUrl
                .pathname
                .substring(1);

        }

        // youtube.com/shorts/

        if (
            parsedUrl.hostname.includes(
                'youtube.com'
            ) &&
            parsedUrl.pathname.startsWith(
                '/shorts/'
            )
        ) {

            return parsedUrl
                .pathname
                .split('/')[2];

        }

    }
    catch (error) {

        return null;

    }

    return null;

}


// ==========================================
// ADD TRACK
// ==========================================

modalAdd.addEventListener(
    'click',
    () => {

        const url =
            youtubeUrl.value.trim();

        if (!url) {

            youtubeUrl.focus();

            return;

        }

        const videoId =
            getYouTubeId(url);

        if (!videoId) {

            console.log(
                'URL YouTube invalide'
            );

            youtubeUrl.focus();

            return;

        }

        const track = {

            id:
                Date.now(),

            videoId:
                videoId,

            url:
                url,

            title:
                'Chargement...',

            artist:
                'YouTube',

            thumbnail:
                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

        };

        playlist.push(
            track
        );

        if (
            currentTrackIndex === -1
        ) {

            currentTrackIndex = 0;

        }

        renderPlaylist();

        updateCurrentTrackDisplay();

        savePlaylist();

        closeAddModal();

        requestMetadata(
            videoId
        );

    }
);

// ==========================================
// AUTO ACCESS
// ==========================================

document.addEventListener(
    'DOMContentLoaded',
    () => {

        const autoAccessToggle =
            document.getElementById(
                'autoplay-toggle'
            );

        if (!autoAccessToggle) {
            return;
        }


        function updateAutoAccessButton() {

            if (autoAccessEnabled) {

                autoAccessToggle.textContent =
                    'ON';

                autoAccessToggle.classList.add(
                    'active'
                );

            } else {

                autoAccessToggle.textContent =
                    'OFF';

                autoAccessToggle.classList.remove(
                    'active'
                );

            }

        }


        autoAccessToggle.addEventListener(
            'click',
            () => {

                autoAccessEnabled =
                    !autoAccessEnabled;

                localStorage.setItem(
                    'vehicle_audio_auto_access',
                    autoAccessEnabled
                );

                updateAutoAccessButton();

            }
        );


        updateAutoAccessButton();

    }
);

// ==========================================
// URL INPUT
// ==========================================

youtubeUrl.addEventListener(
    'keydown',
    (event) => {

        if (
            event.key === 'Enter'
        ) {

            event.preventDefault();

            modalAdd.click();

        }

    }
);


// ==========================================
// REQUEST METADATA
// ==========================================

function requestMetadata(videoId) {

    metadataRequestId++;

    const requestId =
        metadataRequestId;

    fetch(
        `https://${GetParentResourceName()}/requestMetadata`,
        {

            method:
                'POST',

            headers: {
                'Content-Type':
                    'application/json'
            },

            body:
                JSON.stringify({

                    videoId:
                        videoId,

                    requestId:
                        requestId

                })

        }
    );

}


// ==========================================
// METADATA RESULT
// ==========================================

function handleMetadataResult(data) {

    if (!data) {
        return;
    }

    const videoId =
        data.videoId;

    const metadata =
        data.metadata;

    const track =
        playlist.find(
            item =>
                item.videoId ===
                videoId
        );

    if (!track) {
        return;
    }

    // ==================================
    // TITLE
    // ==================================

    if (
        metadata &&
        metadata.title
    ) {

        track.title =
            metadata.title;

    }

    // ==================================
    // ARTIST
    // ==================================

    if (
        metadata &&
        metadata.artist
    ) {

        track.artist =
            metadata.artist;

    }

    // ==================================
    // THUMBNAIL
    // ==================================

    if (
        metadata &&
        metadata.thumbnail
    ) {

        track.thumbnail =
            metadata.thumbnail;

    }

    renderPlaylist();

    if (
        currentTrackIndex >= 0 &&
        playlist[
            currentTrackIndex
        ] &&
        playlist[
            currentTrackIndex
        ].videoId === videoId
    ) {

        updateCurrentTrackDisplay();

    }

    savePlaylist();

}


// ==========================================
// SHOW PLAYLIST
// ==========================================

function renderPlaylist() {

    const playlistElement =
        document.getElementById(
            'playlist'
        );

    if (!playlistElement) {
        return;
    }

    if (
        playlist.length === 0
    ) {

        playlistElement.innerHTML = `

            <div class="empty-playlist">
                Aucun morceau dans la playlist
            </div>

        `;

        return;

    }

    playlistElement.innerHTML =
        '';

    playlist.forEach(
        (track, index) => {

            const item =
                document.createElement(
                    'div'
                );

            item.className =
                'playlist-item';

            if (
                index ===
                currentTrackIndex
            ) {

                item.classList.add(
                    'active'
                );

            }

            const thumbnail =
                track.thumbnail ||
                (
                    `https://i.ytimg.com/vi/` +
                    `${track.videoId}/hqdefault.jpg`
                );

            item.innerHTML = `

                <div class="playlist-thumb">

                    <img
                        src="${escapeHtml(thumbnail)}"
                        alt=""
                    >

                </div>

                <div class="playlist-track-info">

                    <div class="playlist-track-title">
                        ${escapeHtml(
                            track.title
                        )}
                    </div>

                    <div class="playlist-track-artist">
                        ${escapeHtml(
                            track.artist
                        )}
                    </div>

                </div>

                <button
                    class="playlist-delete"
                    data-index="${index}"
                    title="Supprimer"
                >
                    ×
                </button>

            `;

            item.addEventListener(
                'click',
                (event) => {

                    if (
                        event.target.classList.contains(
                            'playlist-delete'
                        )
                    ) {

                        return;

                    }

                    playTrack(
                        index
                    );

                }
            );

            playlistElement.appendChild(
                item
            );

        }
    );

    playlistElement
        .querySelectorAll(
            '.playlist-delete'
        )
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    (event) => {

                        event.stopPropagation();

                        const index =
                            Number(
                                button.dataset.index
                            );

                        removeTrack(
                            index
                        );

                    }
                );

            }
        );

}


// ==========================================
// DELETE
// ==========================================

function removeTrack(index) {

    if (
        index < 0 ||
        index >= playlist.length
    ) {

        return;

    }

    playlist.splice(
        index,
        1
    );

    if (
        playlist.length === 0
    ) {

        currentTrackIndex =
            -1;

        isPlaying =
            false;

        playButton.textContent =
            '▶';

        updateCurrentTrackDisplay();

    }

    else if (
        currentTrackIndex >=
        playlist.length
    ) {

        currentTrackIndex =
            playlist.length - 1;

        updateCurrentTrackDisplay();

    }

    else if (
        index <
        currentTrackIndex
    ) {

        currentTrackIndex--;

        updateCurrentTrackDisplay();

    }

    else if (
        index ===
        currentTrackIndex
    ) {

        isPlaying =
            false;

        playButton.textContent =
            '▶';

        updateCurrentTrackDisplay();

    }

    renderPlaylist();

    savePlaylist();

}


// ==========================================
// LOAD PLAYLIST
// ==========================================

function loadPlaylist(
    savedPlaylist
) {

    if (
        !Array.isArray(
            savedPlaylist
        )
    ) {

        playlist = [];

    }
    else {

        playlist =
            savedPlaylist;

    }

    // ======================================
    // RESTORE THE CURRENT TRACK
    // ======================================

    if (
        playlist.length > 0
    ) {

        let restoredIndex = -1;

        if (
            vehicleState &&
            vehicleState.videoId
        ) {

            restoredIndex =
                playlist.findIndex(
                    track =>
                        track &&
                        track.videoId ===
                        vehicleState.videoId
                );

        }

        if (
            restoredIndex !== -1
        ) {

            currentTrackIndex =
                restoredIndex;

        }

        else if (
            currentTrackIndex >= 0 &&
            currentTrackIndex <
                playlist.length
        ) {

            // Change nothing.

        }

        else {

            currentTrackIndex =
                0;

        }

    }
    else {

        currentTrackIndex =
            -1;

    }

    // ======================================
    // SYNC WITH THE VEHICLE PLAYER
    // (and not the unused global player
    // "youtubePlayer": this bug systematically
    // switched the button back to
    // "▶" on every playlist load,
    // that is, every time the interface
    // was reopened, even if the vehicle's
    // music was still playing)
    // ======================================

    const currentVehiclePlayerForSync =
        (
            window.currentVehicleId !== null &&
            window.currentVehicleId !== undefined
        )
            ? youtubePlayers[window.currentVehicleId]
            : null;

    if (
        youtubeReady &&
        isVehiclePlayerReady(currentVehiclePlayerForSync) &&
        typeof currentVehiclePlayerForSync.getPlayerState === 'function'
    ) {

        const playerState =
            safeGetPlayerState(currentVehiclePlayerForSync);

        if (
            playerState ===
            YT.PlayerState.PLAYING
        ) {

            isPlaying =
                true;

            playButton.textContent =
                '❚❚';

        }
        else {

            isPlaying =
                false;

            playButton.textContent =
                '▶';

        }

    }
    else {

        if (
            vehicleState &&
            vehicleState.videoId
        ) {

            isPlaying =
                vehicleState.playing;

        }
        else {

            isPlaying =
                false;

        }

        if (isPlaying) {

            playButton.textContent =
                '❚❚';

        }
        else {

            playButton.textContent =
                '▶';

        }

    }

    // ======================================
    // DISPLAY
    // ======================================

    renderPlaylist();

    updateCurrentTrackDisplay();

    // ======================================
    // UPDATE THE METADATA
    // ======================================

    playlist.forEach(
        track => {

            if (
                !track.title ||
                track.title ===
                    'Morceau YouTube' ||
                track.title ===
                    'Chargement...'
            ) {

                requestMetadata(
                    track.videoId
                );

            }

        }
    );

}


// ==========================================
// SAVE
// ==========================================

function savePlaylist() {

    fetch(
        `https://${GetParentResourceName()}/savePlaylist`,
        {

            method:
                'POST',

            headers: {
                'Content-Type':
                    'application/json'
            },

            body:
                JSON.stringify({

                    playlist:
                        playlist

                })

        }
    );

}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHtml(value) {

    return String(value)

        .replaceAll(
            '&',
            '&amp;'
        )

        .replaceAll(
            '<',
            '&lt;'
        )

        .replaceAll(
            '>',
            '&gt;'
        )

        .replaceAll(
            '"',
            '&quot;'
        )

        .replaceAll(
            "'",
            '&#039;'
        );

}


// ==========================================
// READY
// ==========================================

fetch(
    `https://${GetParentResourceName()}/ready`,
    {

        method:
            'POST',

        headers: {
            'Content-Type':
                'application/json'
        },

        body:
            JSON.stringify({})

    }
);

// ==========================================
// AUDIO / DOORS NAVIGATION
// ==========================================

const vehiclePanels =
    document.getElementById('vehicle-panels');

const audioNav =
    document.getElementById('audio-nav');

const doorsNav =
    document.getElementById('doors-nav');

const audioNavDoors =
    document.getElementById('audio-nav-doors');

const doorsNavDoors =
    document.getElementById('doors-nav-doors');


// ==========================================
// SHOW AUDIO
// ==========================================

function showAudioPanel() {

    if (!vehiclePanels) {
        return;
    }

    vehiclePanels.classList.remove(
        'show-doors'
    );

}


// ==========================================
// SHOW DOORS
// ==========================================

function showDoorsPanel() {

    if (!vehiclePanels) {
        return;
    }

    vehiclePanels.classList.add(
        'show-doors'
    );

}


// ==========================================
// AUDIO BUTTON
// ==========================================

if (audioNav) {

    audioNav.addEventListener(
        'click',
        () => {

            showAudioPanel();

        }
    );

}


// ==========================================
// DOORS BUTTON
// ==========================================

if (doorsNav) {

    doorsNav.addEventListener(
        'click',
        () => {

            showDoorsPanel();

        }
    );

}


// ==========================================
// AUDIO BUTTON OF THE DOORS PANEL
// ==========================================

if (audioNavDoors) {

    audioNavDoors.addEventListener(
        'click',
        () => {

            showAudioPanel();

        }
    );

}


// ==========================================
// DOORS BUTTON OF THE AUDIO PANEL
// ==========================================

if (doorsNavDoors) {

    doorsNavDoors.addEventListener(
        'click',
        () => {

            showDoorsPanel();

        }
    );

}

// ==========================================
// FRONT LEFT DOOR
// ==========================================

const doorFrontLeft =
    document.getElementById(
        'door-front-left'
    );

if (doorFrontLeft) {

    doorFrontLeft.addEventListener(
        'click',
        () => {

            fetch(
                `https://${GetParentResourceName()}/vehicleDoor`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        door:
                            'front-left'
                    })
                }
            );

        }
    );

}

// ==========================================
// FRONT RIGHT DOOR
// ==========================================

const doorFrontRight =
    document.getElementById(
        'door-front-right'
    );

if (doorFrontRight) {

    doorFrontRight.addEventListener(
        'click',
        () => {

            fetch(
                `https://${GetParentResourceName()}/vehicleDoor`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        door:
                            'front-right'
                    })
                }
            );

        }
    );

}

// ==========================================
// REAR DOORS
// ==========================================

const doorRearLeft =
    document.getElementById(
        'door-rear-left'
    );

const doorRearRight =
    document.getElementById(
        'door-rear-right'
    );

if (doorRearLeft) {

    doorRearLeft.addEventListener(
        'click',
        () => {

            fetch(
                `https://${GetParentResourceName()}/vehicleDoor`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        door:
                            'rear-left'
                    })
                }
            );

        }
    );

}

if (doorRearRight) {

    doorRearRight.addEventListener(
        'click',
        () => {

            fetch(
                `https://${GetParentResourceName()}/vehicleDoor`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        door:
                            'rear-right'
                    })
                }
            );

        }
    );

}

// ==========================================
// TRUNK + HOOD
// ==========================================

const doorTrunk =
    document.getElementById(
        'door-trunk'
    );

const doorHood =
    document.getElementById(
        'door-hood'
    );

if (doorTrunk) {

    doorTrunk.addEventListener(
        'click',
        () => {

            fetch(
                `https://${GetParentResourceName()}/vehicleDoor`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        door:
                            'trunk'
                    })
                }
            );

        }
    );

}

if (doorHood) {

    doorHood.addEventListener(
        'click',
        () => {

            fetch(
                `https://${GetParentResourceName()}/vehicleDoor`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        door:
                            'hood'
                    })
                }
            );

        }
    );

}

// ==========================================
// SEAT SWITCHING
// ==========================================

const seatDriver =
    document.getElementById(
        'seat-driver'
    );

const seatPassenger =
    document.getElementById(
        'seat-passenger'
    );

const seatRearLeft =
    document.getElementById(
        'seat-rear-left'
    );

const seatRearRight =
    document.getElementById(
        'seat-rear-right'
    );


// ==========================================
// SEAT SWITCHING FUNCTION
// ==========================================

function selectVehicleSeat(seat) {

    fetch(
        `https://${GetParentResourceName()}/vehicleSeat`,
        {
            method: 'POST',

            headers: {
                'Content-Type':
                    'application/json'
            },

            body: JSON.stringify({
                seat: seat
            })
        }
    );

}


// ==========================================
// DRIVER
// ==========================================

if (seatDriver) {

    seatDriver.addEventListener(
        'click',
        () => {

            selectVehicleSeat(
                'driver'
            );

        }
    );

}


// ==========================================
// FRONT PASSENGER
// ==========================================

if (seatPassenger) {

    seatPassenger.addEventListener(
        'click',
        () => {

            selectVehicleSeat(
                'passenger'
            );

        }
    );

}


// ==========================================
// REAR LEFT
// ==========================================

if (seatRearLeft) {

    seatRearLeft.addEventListener(
        'click',
        () => {

            selectVehicleSeat(
                'rear-left'
            );

        }
    );

}


// ==========================================
// REAR RIGHT
// ==========================================

if (seatRearRight) {

    seatRearRight.addEventListener(
        'click',
        () => {

            selectVehicleSeat(
                'rear-right'
            );

        }
    );

}

// ==========================================
// DRIVE CONTROL
// ==========================================

const driveControl =
    document.getElementById(
        'drive-control'
    );

const driveControlStorageKey =
    'vehicle_audio_drive_control_v2';

let driveControlEnabled =
    localStorage.getItem(
        driveControlStorageKey
    );


// ==========================================
// DEFAULT VALUE
// ==========================================

if (
    driveControlEnabled === null
) {

    driveControlEnabled =
        false;

    localStorage.setItem(
        driveControlStorageKey,
        'false'
    );

}
else {

    driveControlEnabled =
        driveControlEnabled === 'true';

}


// ==========================================
// DISPLAY
// ==========================================

function updateDriveControlDisplay() {

    if (!driveControl) {
        return;
    }

    driveControl.classList.toggle(
        'active',
        driveControlEnabled
    );

    const label =
        driveControl.querySelector(
            '.lock-label'
        );

    if (label) {

        label.textContent =
            driveControlEnabled
                ? 'DRIVE CONTROL ACTIVÉ'
                : 'DRIVE CONTROL DÉSACTIVÉ';

    }

}


// ==========================================
// CLICK
// ==========================================

if (driveControl) {

    driveControl.addEventListener(
        'click',
        () => {

            driveControlEnabled =
                !driveControlEnabled;

            localStorage.setItem(
                driveControlStorageKey,
                driveControlEnabled
                    ? 'true'
                    : 'false'
            );

            updateDriveControlDisplay();

            fetch(
                `https://${GetParentResourceName()}/setDriveControl`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        enabled:
                            driveControlEnabled
                    })
                }
            );

        }
    );

}

updateDriveControlDisplay();

// ==========================================
// HAZARD LIGHTS
// ==========================================

const vehicleHazards =
    document.getElementById(
        'vehicle-hazards'
    );

const hazardState =
    document.getElementById(
        'hazard-state'
    );

if (vehicleHazards) {

    vehicleHazards.addEventListener(
        'click',
        () => {

            fetch(
                `https://${GetParentResourceName()}/vehicleHazards`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({})
                }
            );

        }
    );

}


// ==========================================
// DYNAMIC I18N - VEHICLE AUDIO
// ==========================================

const vehicleAudioDynamicTranslations = {
    fr: {
        noTrack: 'Aucun morceau',
        noAudio: 'Aucun audio en lecture',
        youtubeTrack: 'Morceau YouTube',
        youtube: 'YouTube',
        playlistEmpty: 'Aucun morceau dans la playlist',
        doorOpen: 'Ouverte',
        doorClosed: 'Fermée',
        driveOn: 'DRIVE CONTROL ACTIVÉ',
        driveOff: 'DRIVE CONTROL DÉSACTIVÉ',
        hazardsOn: 'Feux de détresse ACTIVÉS',
        hazardsOff: 'Feux de détresse',
        notifyNotInVehicle: 'Tu dois être dans un véhicule',
        notifyNoAccess: "Tu n'as pas accès à l'audio de ce véhicule",
        notifySeatOccupied: 'Ce siège est occupé'
    },
    en: {
        noTrack: 'No track',
        noAudio: 'No audio playing',
        youtubeTrack: 'YouTube track',
        youtube: 'YouTube',
        playlistEmpty: 'Playlist is empty',
        doorOpen: 'Open',
        doorClosed: 'Closed',
        driveOn: 'DRIVE CONTROL ENABLED',
        driveOff: 'DRIVE CONTROL DISABLED',
        hazardsOn: 'Hazard lights ON',
        hazardsOff: 'Hazard lights',
        notifyNotInVehicle: 'You must be in a vehicle',
        notifyNoAccess: "You can't control this vehicle's audio",
        notifySeatOccupied: 'This seat is occupied'
    },
    es: {
        noTrack: 'Ninguna canción',
        noAudio: 'No hay audio reproduciéndose',
        youtubeTrack: 'Canción de YouTube',
        youtube: 'YouTube',
        playlistEmpty: 'No hay canciones en la lista',
        doorOpen: 'Abierta',
        doorClosed: 'Cerrada',
        driveOn: 'CONTROL DE CONDUCCIÓN ACTIVADO',
        driveOff: 'CONTROL DE CONDUCCIÓN DESACTIVADO',
        hazardsOn: 'Luces de emergencia ACTIVADAS',
        hazardsOff: 'Luces de emergencia',
        notifyNotInVehicle: 'Debes estar en un vehículo',
        notifyNoAccess: 'No tienes acceso al audio de este vehículo',
        notifySeatOccupied: 'Este asiento está ocupado'
    },
    de: {
        noTrack: 'Kein Titel',
        noAudio: 'Keine Wiedergabe',
        youtubeTrack: 'YouTube-Titel',
        youtube: 'YouTube',
        playlistEmpty: 'Keine Titel in der Wiedergabeliste',
        doorOpen: 'Offen',
        doorClosed: 'Geschlossen',
        driveOn: 'DRIVE CONTROL AKTIVIERT',
        driveOff: 'DRIVE CONTROL DEAKTIVIERT',
        hazardsOn: 'WARNBLINKER AKTIVIERT',
        hazardsOff: 'Warnblinkanlage',
        notifyNotInVehicle: 'Du musst in einem Fahrzeug sein',
        notifyNoAccess: 'Du hast keinen Zugriff auf das Audio dieses Fahrzeugs',
        notifySeatOccupied: 'Dieser Sitz ist besetzt'
    },
    it: {
        noTrack: 'Nessun brano',
        noAudio: 'Nessun audio in riproduzione',
        youtubeTrack: 'Brano YouTube',
        youtube: 'YouTube',
        playlistEmpty: 'Nessun brano nella playlist',
        doorOpen: 'Aperta',
        doorClosed: 'Chiusa',
        driveOn: 'DRIVE CONTROL ATTIVATO',
        driveOff: 'DRIVE CONTROL DISATTIVATO',
        hazardsOn: 'Luci di emergenza ATTIVATE',
        hazardsOff: 'Luci di emergenza',
        notifyNotInVehicle: 'Devi essere in un veicolo',
        notifyNoAccess: "Non hai accesso all'audio di questo veicolo",
        notifySeatOccupied: 'Questo posto è occupato'
    }
};

function getVehicleAudioLanguage() {
    const lang =
        localStorage.getItem('vehicle_audio_language') ||
        document.documentElement.lang ||
        'fr';

    return vehicleAudioDynamicTranslations[lang]
        ? lang
        : 'fr';
}

function getVehicleAudioText(key) {
    const lang = getVehicleAudioLanguage();
    return vehicleAudioDynamicTranslations[lang][key];
}

function refreshVehicleAudioDynamicTranslations() {

    // ======================================
    // DOOR STATE
    // ======================================

    Object.keys(vehicleDoorButtons).forEach((door) => {

        const button = vehicleDoorButtons[door];

        if (!button) {
            return;
        }

        const status =
            button.querySelector('.zone-label small');

        if (status) {
            status.textContent =
                vehicleDoorStates[door] === true
                    ? getVehicleAudioText('doorOpen')
                    : getVehicleAudioText('doorClosed');
        }
    });

    // ======================================
    // DRIVE CONTROL
    // ======================================

    const driveButton =
        document.getElementById('drive-control');

    if (driveButton) {

        const label =
            driveButton.querySelector('.lock-label');

        if (label) {
            label.textContent =
                driveControlEnabled === true
                    ? getVehicleAudioText('driveOn')
                    : getVehicleAudioText('driveOff');
        }
    }

    // ======================================
    // HAZARD LIGHTS
    // ======================================

    const hazardsButton =
        document.getElementById('vehicle-hazards');

    if (hazardsButton) {

        const label =
            hazardsButton.querySelector('.lock-label');

        if (label) {

            label.textContent =
                hazardsButton.classList.contains('active')
                    ? getVehicleAudioText('hazardsOn')
                    : getVehicleAudioText('hazardsOff');
        }
    }

    // ======================================
    // EMPTY PLAYLIST
    // ======================================

    const emptyPlaylist =
        document.querySelector('.empty-playlist');

    if (emptyPlaylist) {
        emptyPlaylist.textContent =
            getVehicleAudioText('playlistEmpty');
    }
}

// ==========================================
// REFRESH AFTER LANGUAGE CHANGE
// ==========================================

document
    .querySelectorAll('#language-select, #language-select-doors')
    .forEach((select) => {

        select.addEventListener('change', () => {

            setTimeout(() => {
                refreshVehicleAudioDynamicTranslations();
            }, 0);

        });
    });

// ==========================================
// WATCH THE STATES MODIFIED BY THE SCRIPT
// ==========================================

const vehicleAudioI18nObserver =
    new MutationObserver(() => {
        refreshVehicleAudioDynamicTranslations();
    });

const vehicleAudioI18nRoot =
    document.getElementById('vehicle-panels');

if (vehicleAudioI18nRoot) {

    vehicleAudioI18nObserver.observe(
        vehicleAudioI18nRoot,
        {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['class']
        }
    );
}

// ==========================================
// FIRST APPLICATION
// ==========================================

refreshVehicleAudioDynamicTranslations();

// ==========================================
// BUILT-IN NOTIFICATIONS (fallback without wts_notify)
// Fixed style: duration circle + W. To customize
// (letter, circle, position...), install wts_notify (free).
// ==========================================

const NOTIFY_KEY_MAP = {
    notInVehicle: 'notifyNotInVehicle',
    noAccess: 'notifyNoAccess',
    seatOccupied: 'notifySeatOccupied'
};

function getNotificationContainer(position) {
    let container = document.getElementById('wts-notify');

    if (!container) {
        container = document.createElement('div');
        container.id = 'wts-notify';
        document.body.appendChild(container);
    }

    container.className = 'wts-notify ' + (position || 'center-right');
    return container;
}

function buildNotificationRing(duration) {
    const ring = document.createElement('div');
    ring.className = 'wts-ring';

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 36 36');

    const bg = document.createElementNS(svgNS, 'circle');
    bg.setAttribute('class', 'bg');
    bg.setAttribute('cx', '18'); bg.setAttribute('cy', '18'); bg.setAttribute('r', '15.9');

    const fg = document.createElementNS(svgNS, 'circle');
    fg.setAttribute('class', 'fg');
    fg.setAttribute('cx', '18'); fg.setAttribute('cy', '18'); fg.setAttribute('r', '15.9');
    fg.style.animationDuration = duration + 'ms';

    svg.appendChild(bg);
    svg.appendChild(fg);
    ring.appendChild(svg);

    const letter = document.createElement('div');
    letter.className = 'wts-ring-letter';
    letter.textContent = 'W';
    ring.appendChild(letter);

    return ring;
}

function showVehicleAudioNotification(data) {
    if (!data) return;

    let text = data.text;

    if (!text && data.key) {
        const translationKey = NOTIFY_KEY_MAP[data.key] || data.key;
        text = getVehicleAudioText(translationKey) || data.key;
    }

    if (!text) return;

    const container = getNotificationContainer(data.position);
    const kind = ['info', 'success', 'error'].includes(data.kind)
        ? data.kind
        : 'info';

    const duration = Number(data.duration) > 0 ? Number(data.duration) : 3500;

    const toast = document.createElement('div');
    toast.className = 'wts-toast ' + kind;

    toast.appendChild(buildNotificationRing(duration));

    const body = document.createElement('div');
    body.className = 'wts-toast-body';

    const title = document.createElement('div');
    title.className = 'wts-toast-title';
    title.textContent = data.title || 'WTS Vehicle Audio';

    const message = document.createElement('div');
    message.className = 'wts-toast-text';
    message.textContent = text;

    body.appendChild(title);
    body.appendChild(message);
    toast.appendChild(body);
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
