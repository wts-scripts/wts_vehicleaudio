fx_version 'cerulean'
game 'gta5'

author 'WTS Scripts'
description 'WTS Vehicle Audio - standalone in-vehicle YouTube player (free, GPL-3.0)'
license 'GPL-3.0-or-later'
repository 'https://github.com/Wts-scripts/wts_vehicleaudio'
version '1.0.0'

lua54 'yes'

ui_page 'web/index.html'

files {
    'web/index.html',
    'web/style.css',
    'web/app.js',
    'web/sports_car.png'
}

client_scripts {
    'config.lua',
    'client/client.lua'
}

server_scripts {
    'config.lua',
    'server/server.lua'
}
