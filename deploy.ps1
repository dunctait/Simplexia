param(
    [string]$CommitMessage = "Deploy Simplexia",
    [string]$Remote = "simplexia",
    [string]$TargetBranch = "master"
)

$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

function Invoke-Step {
    param(
        [string]$Label,
        [scriptblock]$Action
    )

    Write-Host "[deploy] $Label"
    & $Action
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE"
    }
}

Invoke-Step "Building globe bundle" { npm run build:globe }
Invoke-Step "Running unit and E2E checks" { npm run check }
Invoke-Step "Running predeploy validation" { npm run predeploy }

Write-Host "[deploy] Staging repository changes"
git add -A
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "[deploy] No changes to commit"
    exit 0
}

Write-Host "[deploy] Committing changes"
git commit -m $CommitMessage
if ($LASTEXITCODE -ne 0) {
    throw "git commit failed with exit code $LASTEXITCODE"
}

Write-Host "[deploy] Pushing to $Remote/$TargetBranch"
git push $Remote "HEAD:$TargetBranch"
if ($LASTEXITCODE -ne 0) {
    throw "git push failed with exit code $LASTEXITCODE"
}

Write-Host "[deploy] Done"
