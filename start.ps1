$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot '../tools/battle-atlas/start.ps1')
Write-Output 'Battle Viewer: http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html'
Write-Output 'Open that address to inspect the authored Atlas maps. Offline battles also work by opening BATTLE-VIEWER.html directly.'
