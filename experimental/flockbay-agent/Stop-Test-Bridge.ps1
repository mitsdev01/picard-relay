$ErrorActionPreference = 'Stop'
$root = $env:PICARD_FLOCKBAY_STATE_ROOT
if ([string]::IsNullOrWhiteSpace($root)) { throw 'Set PICARD_FLOCKBAY_STATE_ROOT to a private state directory outside this repository.' }
$pidFile = Join-Path (Join-Path $root 'flockbay-agent-test') 'worker.pid'
if (!(Test-Path $pidFile)) { Write-Host 'No owned bridge PID.'; exit 0 }
$workerId = [int](Get-Content $pidFile)
$process = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $workerId) -ErrorAction SilentlyContinue
if ($process -and $process.CommandLine -like '*flockbay-agent*worker.mjs*') {
 & taskkill.exe /PID $workerId /T /F | Out-Null
 Write-Host 'Bridge stopped. Existing game edits remain; an in-flight tool may finish.'
} else { Write-Host 'Owned bridge is not running.' }
