# Start the full DIH stack on Windows (PowerShell) or macOS/Linux with pwsh.
# Usage: .\run\start.ps1
# Stop:  Ctrl+C (terminates all child jobs)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
if (-not $RootDir) { $RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path) }
Set-Location $RootDir

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  DIH — Digital Twin Full Stack Launcher"     -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[run] Root: $RootDir"
Write-Host ""

$jobs = @()

Write-Host "[run] Starting MQTT broker..." -ForegroundColor Green
$jobs += Start-Job -Name "DIH-Broker" -ScriptBlock {
    Set-Location $using:RootDir
    python -m integration.broker
}
Start-Sleep -Seconds 2

Write-Host "[run] Starting simulation publisher..." -ForegroundColor Green
$jobs += Start-Job -Name "DIH-Publisher" -ScriptBlock {
    Set-Location $using:RootDir
    python integration/sim_publisher.py --speed 10
}
Start-Sleep -Seconds 1

Write-Host "[run] Starting ML subscriber..." -ForegroundColor Green
$jobs += Start-Job -Name "DIH-MLSub" -ScriptBlock {
    Set-Location $using:RootDir
    python -m integration.ml_subscriber
}
Start-Sleep -Seconds 1

Write-Host "[run] Starting FastAPI backend on :8000..." -ForegroundColor Green
$jobs += Start-Job -Name "DIH-Backend" -ScriptBlock {
    Set-Location $using:RootDir
    python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
}
Start-Sleep -Seconds 1

Write-Host "[run] Starting frontend dev server..." -ForegroundColor Green
$jobs += Start-Job -Name "DIH-Frontend" -ScriptBlock {
    Set-Location (Join-Path $using:RootDir "frontend")
    npm run dev
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  All services running. Press Ctrl+C to stop." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

try {
    while ($true) {
        foreach ($j in $jobs) {
            if ($j.State -eq "Failed") {
                Write-Host "[run] Job $($j.Name) failed:" -ForegroundColor Red
                Receive-Job $j
            }
        }
        Start-Sleep -Seconds 2
    }
} finally {
    Write-Host ""
    Write-Host "[run] Shutting down all services..." -ForegroundColor Yellow
    $jobs | Stop-Job -PassThru | Remove-Job -Force
    Write-Host "[run] All services stopped." -ForegroundColor Yellow
}
