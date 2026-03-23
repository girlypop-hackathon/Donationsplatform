<#
/*
Oprettet: 18-03-2026
Af: Jonas og GitHub Copilot (GPT-5.3-codex)
Beskrivelse: Setup GitHub repository secrets and GHCR settings for the donation platform
*/
#>

$ErrorActionPreference = "Stop"

$repositoryName = "girlypop-hackathon/Donationsplatform"
$resourceGroupName = "donationsplatform-rg"
$virtualMachineName = "donationsplatform-vm"
$adminUsername = "azureuser"
$sshPrivateKeyPath = "$HOME\.ssh\id_rsa"
$ghcrReadTokenEnvironmentVariable = "GHCR_READ_TOKEN"
$ghExecutablePath = $null

function Assert-CommandAvailable {
    # Verifies that a required CLI command is available on PATH.
    param(
        [Parameter(Mandatory = $true)]
        [string]$CommandName
    )

    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $CommandName"
    }
}

function Assert-GhAuthenticated {
    # Verifies that GitHub CLI is authenticated before managing repository secrets.
    & $ghExecutablePath auth status *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "GitHub CLI is not authenticated. Run 'gh auth login' and try again."
    }
}

function Set-GitHubSecretValue {
    # Creates or updates one GitHub repository secret.
    param(
        [Parameter(Mandatory = $true)]
        [string]$Repository,

        [Parameter(Mandatory = $true)]
        [string]$SecretName,

        [Parameter(Mandatory = $true)]
        [string]$SecretValue
    )

    & $ghExecutablePath secret set $SecretName --repo $Repository --body $SecretValue
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to set secret $SecretName"
    }

    Write-Host "Secret updated: $SecretName"
}

Assert-CommandAvailable -CommandName "az"

$ghCommand = Get-Command gh -ErrorAction SilentlyContinue
if ($ghCommand) {
    $ghExecutablePath = $ghCommand.Source
}
else {
    $defaultGhExecutablePath = "C:\Program Files\GitHub CLI\gh.exe"
    if (Test-Path $defaultGhExecutablePath) {
        $ghExecutablePath = $defaultGhExecutablePath
    }
    else {
        throw "Required command not found: gh"
    }
}

Assert-GhAuthenticated

if (-not (Test-Path $sshPrivateKeyPath)) {
    throw "SSH private key not found: $sshPrivateKeyPath"
}

$vmPublicIp = az vm show `
    --resource-group $resourceGroupName `
    --name $virtualMachineName `
    --show-details `
    --query publicIps `
    -o tsv

if ([string]::IsNullOrWhiteSpace($vmPublicIp)) {
    throw "Unable to resolve VM public IP from Azure."
}

$sshPrivateKeyContent = Get-Content $sshPrivateKeyPath -Raw
if ([string]::IsNullOrWhiteSpace($sshPrivateKeyContent)) {
    throw "SSH private key file is empty: $sshPrivateKeyPath"
}

Set-GitHubSecretValue -Repository $repositoryName -SecretName "IP" -SecretValue $vmPublicIp
Set-GitHubSecretValue -Repository $repositoryName -SecretName "SSH_HOST" -SecretValue $vmPublicIp
Set-GitHubSecretValue -Repository $repositoryName -SecretName "ADMIN_USERNAME" -SecretValue $adminUsername
Set-GitHubSecretValue -Repository $repositoryName -SecretName "SSH_PRIVATE_KEY" -SecretValue $sshPrivateKeyContent

$ghcrReadToken = [Environment]::GetEnvironmentVariable($ghcrReadTokenEnvironmentVariable, "Process")
if ([string]::IsNullOrWhiteSpace($ghcrReadToken)) {
    $ghcrReadToken = [Environment]::GetEnvironmentVariable($ghcrReadTokenEnvironmentVariable, "User")
}
if ([string]::IsNullOrWhiteSpace($ghcrReadToken)) {
    $ghcrReadToken = [Environment]::GetEnvironmentVariable($ghcrReadTokenEnvironmentVariable, "Machine")
}

if ([string]::IsNullOrWhiteSpace($ghcrReadToken)) {
    Write-Host "GHCR read token was not found in environment variable GHCR_READ_TOKEN."
    Write-Host "Create a GitHub PAT with read:packages and set GHCR_READ_TOKEN, then rerun this script to store GHCR_READ_TOKEN as a secret."
}
else {
    Set-GitHubSecretValue -Repository $repositoryName -SecretName "GHCR_READ_TOKEN" -SecretValue $ghcrReadToken
}

Write-Host "GitHub secrets setup completed for $repositoryName"
Write-Host "Configured secrets: IP, SSH_HOST, ADMIN_USERNAME, SSH_PRIVATE_KEY, GHCR_READ_TOKEN (if provided)."
