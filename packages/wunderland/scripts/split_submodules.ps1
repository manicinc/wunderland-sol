Param(
    [switch]$DryRun,
    [switch]$NoTemplates,
    [switch]$NoMessageRewrite,
    [switch]$NoSubmodules,
    [string]$Branch = "main",
    [switch]$FallbackSnapshot
)

$scriptPath = Join-Path $PSScriptRoot "split_submodules.sh"
if (!(Test-Path $scriptPath)) {
    Write-Error "split_submodules.sh not found at $scriptPath"
    exit 1
}

# Find bash
$bash = Get-Command bash -ErrorAction SilentlyContinue
if (-not $bash) {
    # Try Git for Windows bash
    $gitBashPath = "C:\Program Files\Git\bin\bash.exe"
    if (Test-Path $gitBashPath) {
        $bash = $gitBashPath
    } else {
        Write-Error "bash not found. Install Git for Windows or WSL."
        exit 1
    }
}

$argsList = @()
if ($DryRun) { $argsList += "--dry-run" }
if ($NoTemplates) { $argsList += "--no-templates" }
if ($NoMessageRewrite) { $argsList += "--no-message-rewrite" }
if ($NoSubmodules) { $argsList += "--no-submodules" }
if ($Branch) { $argsList += @("--branch", $Branch) }
if ($FallbackSnapshot) { $argsList += "--fallback-snapshot" }

& $bash $scriptPath @argsList
exit $LASTEXITCODE


