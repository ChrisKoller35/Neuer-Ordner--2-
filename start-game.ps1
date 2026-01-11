param(
    [string]$NodeInstall = "C:\Users\Christoph.Koller\Work Folders\Documents\Game Starten\node-v24.12.0-win-x64\node-v24.12.0-win-x64",
    [int]$Port = 3001,
    [switch]$SkipInstall
)

$nodeVars = Join-Path $NodeInstall "nodevars.bat"
if (-not (Test-Path $nodeVars)) {
    Write-Error "nodevars.bat wurde unter '$NodeInstall' nicht gefunden. Passe den Parameter -NodeInstall an."
    exit 1
}


$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$serveCommand = "cd `"$projectRoot`" && "
if (-not $SkipInstall) {
    $serveCommand += "npm install && "
}
$serveCommand += "npx live-server --port=$Port --open=index.html"

$fullCommand = "`"$nodeVars`" && " + $serveCommand

Write-Host "Starte Spielserver über Node @ $NodeInstall auf Port $Port ..." -ForegroundColor Cyan
Write-Host "Wenn du die Installation überspringen willst: .\\start-game.ps1 -SkipInstall" -ForegroundColor DarkGray

cmd /c $fullCommand
