$ErrorActionPreference = 'Stop'
$pidFile = 'C:\src2\Picard-v2\state\flockbay-agent\worker.pid'
if (!(Test-Path $pidFile)) { Write-Host 'No owned bridge PID.'; exit 0 }
$workerId = [int](Get-Content $pidFile)
$process = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $workerId) -ErrorAction SilentlyContinue
if ($process -and $process.CommandLine -like '*flockbay-agent*worker.mjs*') {
 & taskkill.exe /PID $workerId /T /F | Out-Null
 Write-Host 'Bridge stopped. Existing game edits remain; an in-flight tool may finish.'
} else { Write-Host 'Owned bridge is not running.' }
