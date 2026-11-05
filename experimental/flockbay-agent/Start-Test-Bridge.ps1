$ErrorActionPreference = 'Stop'
$root = $env:PICARD_FLOCKBAY_STATE_ROOT
if ([string]::IsNullOrWhiteSpace($root)) { throw 'Set PICARD_FLOCKBAY_STATE_ROOT to a private state directory outside this repository.' }
$state = Join-Path $root 'flockbay-agent-test'
if (!(Test-Path -LiteralPath $state)) { throw 'Picard bridge state directory does not exist.' }
$pidFile = Join-Path $state 'worker.pid'
if (Test-Path $pidFile) {
 $old = Get-CimInstance Win32_Process -Filter ('ProcessId=' + [int](Get-Content $pidFile)) -ErrorAction SilentlyContinue
 if ($old -and $old.CommandLine -like '*flockbay-agent*worker.mjs*') { Write-Host 'Live Picard bridge is already running.'; exit 0 }
}
$worker = Join-Path $PSScriptRoot 'worker.mjs'
$config = Join-Path $state 'worker.json'
$process = Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList @('--disable-warning=ExperimentalWarning', ('"' + $worker + '"'), ('"' + $config + '"')) -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $state 'worker.log') -RedirectStandardError (Join-Path $state 'worker-error.log')
Set-Content -LiteralPath $pidFile -Value $process.Id
Start-Sleep -Seconds 2
if ($process.HasExited) { throw 'Bridge exited; inspect worker-error.log locally.' }
Write-Host ('Live Picard bridge started. PID ' + $process.Id)
