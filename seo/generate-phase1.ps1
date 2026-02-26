$ErrorActionPreference = "Stop"

# Paths
$repoRoot = Split-Path -Parent $PSScriptRoot
$dataPath = Join-Path $PSScriptRoot "phase1.json"

if (!(Test-Path $dataPath)) {
  throw "Missing data file: $dataPath"
}

# Load JSON
$data = Get-Content $dataPath -Raw | ConvertFrom-Json

$baseUrl = $data.baseUrl.TrimEnd("/")
$brand = $data.brand
$phone = $data.phone
$phoneDisplay = $data.phoneDisplay

# Use existing approved template page as source HTML
$templatePath = Join-Path $repoRoot "handyman\palm-springs\index.html"
if (!(Test-Path $templatePath)) {
  throw "Template not found: $templatePath"
}

$templateHtml = Get-Content $templatePath -Raw

function Ensure-Folder($path) {
  if (!(Test-Path $path)) {
    New-Item -ItemType Directory -Force -Path $path | Out-Null
  }
}

function Write-Page($serviceSlug, $serviceName, $serviceType, $citySlug, $cityName, $state) {
  $cityFull = "$cityName, $state"
  $urlPath = "/$serviceSlug/$citySlug/"
  $canonical = "$baseUrl$urlPath"

  $html = $templateHtml

  # Replace city (all occurrences of "Palm Springs, CA" and "Palm Springs")
  $html = $html -replace "Palm Springs, CA", $cityFull
  $html = $html -replace "Palm Springs", $cityName

  # Replace URL path (all occurrences of /handyman/palm-springs/)
  $html = $html -replace "handyman/palm-springs/", ("$serviceSlug/$citySlug/")

  # Replace sidebar line (make it generic but city-specific)
  $html = $html -replace "and nearby communities\.", "and nearby communities."
  $html = $html -replace "and nearby communities in the Coachella Valley\.", "and nearby communities."

  # Replace footer sentence (matches both Palm Springs + Twentynine Palms versions)
  $html = $html -replace "across [A-Za-z ]+ and surrounding areas", ("across $cityName and surrounding areas")

  # Replace page hero small label if needed (Handyman Services -> {Service} Services)
  $html = $html -replace ">Handyman Services<", (">$serviceName Services<")

  # Replace H2 intro header "Reliable handyman work in ..." to match service
  $html = $html -replace "Reliable handyman work", ("Reliable $serviceName work")

  # Replace schema serviceType (keeps LocalBusiness but aligns serviceType)
  $html = $html -replace '"serviceType":\s*"Handyman"', ('"serviceType": "' + $serviceType + '"')

  # Replace title prefix "Handyman in ..." -> "{Service} in ..."
  $html = $html -replace "Handyman in ", ("$serviceName in ")

  # Replace description text "handyman services" -> "{serviceName} services" (case-safe enough)
  $html = $html -replace "handyman services", ($serviceName.ToLower() + " services")

  # Replace any remaining '/handyman/twentynine-palms/' self-link in footer
  $html = $html -replace "/handyman/[^""]+/", ("/$serviceSlug/$citySlug/")

  # Output path
  $outDir = Join-Path $repoRoot (Join-Path $serviceSlug $citySlug)
  Ensure-Folder $outDir

  $outFile = Join-Path $outDir "index.html"
  Set-Content -Path $outFile -Value $html -NoNewline
}

# Generate pages
foreach ($svc in $data.services) {
  foreach ($ct in $data.cities) {
    Write-Page -serviceSlug $svc.slug -serviceName $svc.name -serviceType $svc.serviceType -citySlug $ct.slug -cityName $ct.name -state $ct.state
  }
}

Write-Host "Generated Phase 1 pages: $($data.services.Count) services x $($data.cities.Count) cities"