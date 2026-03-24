<#
/*
Oprettet: 24-03-2026
Af: Jonas og GitHub Copilot (GPT-5.3-codex)
Beskrivelse: Connect-only script for the donation platform VM
*/
#>

# ==============================
# CONFIG
# ==============================

$ErrorActionPreference = "Stop"

$resourceGroupName = "donationsplatform-rg"
$vmName = "donationsplatform-vm"
$adminUsername = "azureuser"
$sshPublicKeyPath = "$HOME\.ssh\id_rsa.pub"
$sshPrivateKeyPath = $sshPublicKeyPath -replace "\.pub$", ""
$sshMaxAttempts = 12
$sshDelaySeconds = 5
$sshConnectTimeoutSeconds = 5
$sshCommonOptions = @(
    "-i", $sshPrivateKeyPath,
    "-o", "StrictHostKeyChecking=no",
    "-o", "UserKnownHostsFile=/dev/null",
    "-o", "LogLevel=ERROR"
)

if (-not (Test-Path $sshPublicKeyPath)) {
    throw "SSH public key blev ikke fundet: $sshPublicKeyPath"
}

if (-not (Test-Path $sshPrivateKeyPath)) {
    throw "SSH private key blev ikke fundet: $sshPrivateKeyPath"
}

function Wait-ForSshAvailability {
    # Waits until the VM accepts SSH connections or fails after max attempts.
    param(
        [Parameter(Mandatory = $true)]
        [string]$PublicIp,

        [Parameter(Mandatory = $true)]
        [string]$Username,

        [Parameter(Mandatory = $true)]
        [string[]]$SshBaseOptions,

        [int]$MaxAttempts = 12,
        [int]$DelaySeconds = 5,
        [int]$ConnectTimeoutSeconds = 5
    )

    for ($attemptNumber = 1; $attemptNumber -le $MaxAttempts; $attemptNumber++) {
        Write-Host "Tjekker SSH forbindelse (forsøg $attemptNumber/$MaxAttempts)..."

        & ssh @SshBaseOptions -o BatchMode=yes -o ConnectTimeout=$ConnectTimeoutSeconds "$Username@$PublicIp" "echo SSH klar" *> $null

        if ($LASTEXITCODE -eq 0) {
            Write-Host "SSH er klar."
            return
        }

        Start-Sleep -Seconds $DelaySeconds
    }

    throw "VM blev ikke klar til SSH inden for timeout."
}

# ==============================
# LOGIN + START VM
# ==============================

Write-Host "Logger ind i Azure..."
az login

Write-Host "Starter VM..."
az vm start `
    --resource-group $resourceGroupName `
    --name $vmName `
    --output none

# ==============================
# FIND PUBLIC IP
# ==============================

$publicIp = az vm show `
    --resource-group $resourceGroupName `
    --name $vmName `
    --show-details `
    --query publicIps `
    -o tsv

if ([string]::IsNullOrWhiteSpace($publicIp)) {
    throw "Kunne ikke hente public IP for VM: $vmName"
}

Write-Host "VM Public IP: $publicIp"

# ==============================
# CONNECT TO VM
# ==============================

Write-Host "Venter på at VM'en bliver klar til SSH..."
Wait-ForSshAvailability `
    -PublicIp $publicIp `
    -Username $adminUsername `
    -SshBaseOptions $sshCommonOptions `
    -MaxAttempts $sshMaxAttempts `
    -DelaySeconds $sshDelaySeconds `
    -ConnectTimeoutSeconds $sshConnectTimeoutSeconds

Write-Host "Forbinder til VM via SSH..."
& ssh @sshCommonOptions "$adminUsername@$publicIp"
