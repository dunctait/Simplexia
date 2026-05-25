param()

$ErrorActionPreference = "Stop"

Write-Host "[predeploy] Checking required files..."
$requiredFiles = @(
    "index.html",
    ".nojekyll",
    "AGENTS.md",
    "CLAUDE.md",
    "src/simplex-noise.js",
    "src/generator.js",
    "src/storage.js",
    "src/renderer.js",
    "src/ui.js",
    "src/style.css"
)

foreach ($file in $requiredFiles) {
    if (!(Test-Path $file)) {
        throw "Missing required file: $file"
    }
}

Write-Host "[predeploy] Running JS syntax checks..."
foreach ($file in $requiredFiles | Where-Object { $_.EndsWith(".js") }) {
    node --check $file
}
node --check "scripts/playwright-smoke.js"
node --check "scripts/playwright-layout-check.js"

Write-Host "[predeploy] Verifying agent convention..."
$claude = Get-Content "CLAUDE.md" -Raw
if ($claude.Trim() -ne "@AGENTS.md") {
    throw "CLAUDE.md must contain only @AGENTS.md"
}

Write-Host "[predeploy] Checking for tracked symlinks..."
$gitLinks = git ls-files -s | Select-String "120000"
if ($gitLinks) {
    throw "Tracked symlink(s) detected in repo."
}

Write-Host "[predeploy] Verifying script load order..."
$html = Get-Content "index.html" -Raw
$expectedScripts = @(
    "src/simplex-noise.js",
    "src/generator.js",
    "src/storage.js",
    "src/renderer.js",
    "src/ui.js"
)
$lastIndex = -1
foreach ($script in $expectedScripts) {
    $idx = $html.IndexOf($script)
    if ($idx -lt 0) { throw "Script reference missing in index.html: $script" }
    if ($idx -lt $lastIndex) { throw "Script load order invalid around: $script" }
    $lastIndex = $idx
}

Write-Host "[predeploy] OK"
