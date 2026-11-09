#Requires -Version 5.1
<#
.SYNOPSIS
    Checks Node 24 and Git, optionally installs Windows Terminal with winget after confirmation,
    verifies coding-agent CLIs on PATH, and launches the Picard LCARS terminal companion from this repository.

.DESCRIPTION
    ASCII-only bootstrap for the Picard LCARS companion. Resolves the repository root from this script
    location, requires Node.js 24 or later, and runs tools/picard-tui/main.mjs. Does not install Cursor,
    Codex, or Claude Code or silently create cloud accounts.

.NOTES
    Author: Bill Ulrich
#>

$ErrorActionPreference = 'Stop'
$ScriptVersion = '0.2.4'

function Write-Banner {
    Write-Host "Picard LCARS companion bootstrap v$ScriptVersion"
}

function Test-Command {
    param([string]$Name)
    $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Require-Node24 {
    if (-not (Test-Command 'node')) {
        Write-Host 'ERROR: node is not on PATH. Install Node.js 24 or later.'
        exit 2
    }
    $ver = & node -p "process.versions.node" 2>$null
    if (-not $ver) {
        Write-Host 'ERROR: could not read Node version.'
        exit 2
    }
    $major = [int]($ver.Split('.')[0])
    if ($major -lt 24) {
        Write-Host "ERROR: Node 24+ required; found $ver"
        exit 2
    }
    Write-Host "Node $ver OK"
}

function Require-Git {
    if (-not (Test-Command 'git')) {
        Write-Host 'ERROR: git is not on PATH.'
        exit 2
    }
    Write-Host 'git OK'
}

function Ensure-WindowsTerminal {
    if ($env:WT_SESSION) {
        Write-Host 'Running inside Windows Terminal (WT_SESSION set).'
        return
    }
    if (Test-Command 'wt') {
        Write-Host 'wt.exe found; not launched from WT (WT_SESSION unset). Colors are plain.'
        return
    }
    if (-not (Test-Command 'winget')) {
        Write-Host 'Windows Terminal not found and winget unavailable. Install Windows Terminal for LCARS colors.'
        return
    }
    $r = Read-Host 'Install Microsoft.WindowsTerminal via winget? [y/N]'
    if ($r -notmatch '^[yY]([eE][sS])?$') {
        Write-Host 'Skipping Windows Terminal install.'
        return
    }
    & winget install --id Microsoft.WindowsTerminal -e --source winget
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'winget install failed; continue without Windows Terminal.'
    }
}

Write-Banner
Require-Node24
Require-Git
Ensure-WindowsTerminal

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$main = Join-Path $repoRoot 'tools\picard-tui\main.mjs'
if (-not (Test-Path -LiteralPath $main)) {
    Write-Host "ERROR: missing $main"
    exit 2
}

$agents = @()
if (Test-Command 'agent') { $agents += 'agent (Cursor CLI)' }
if (Test-Command 'codex') { $agents += 'codex' }
if (Test-Command 'claude') { $agents += 'claude' }
if ($agents.Count -eq 0) {
    Write-Host 'WARNING: no coding agent on PATH (agent, codex, claude). The TUI will exit until one is installed.'
} else {
    Write-Host ('Detected: ' + ($agents -join ', '))
}

Write-Host "Starting: node `"$main`""
Set-Location -LiteralPath $repoRoot
& node $main
exit $LASTEXITCODE
