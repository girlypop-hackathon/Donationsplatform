<#
/*
Oprettet: 18-03-2026
Af: Jonas og GitHub Copilot (GPT-5.3-codex)
Beskrivelse: Azure VM provisioning og setup deployment for donationsplatform
*/
#>

# ==============================
# CONFIG
# ==============================

$ErrorActionPreference = "Stop"

$resourceGroupName = "donationsplatform-rg"
$location = "norwayeast"
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
$portsToOpen = @(
    @{ Port = 22; Priority = 301 },
    @{ Port = 80; Priority = 302 },
    @{ Port = 443; Priority = 303 }
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
# LOGIN
# ==============================

Write-Host "Logger ind i Azure..."
az login

# ==============================
# RESOURCE GROUP
# ==============================

Write-host "Tjekker resource group..."

$rgExists = az group exists --name $resourceGroupName

if ($rgExists -ne "true") {
    Write-Host "Resource group findes ikke. Opretter den..."
    az group create `
        --name $resourceGroupName `
        --location $location `
        --output none
}
else {
    Write-Host "Resource group findes allerede."
}

# ==============================
# PUBLIC IP (STATIC)
# ==============================

Write-Host "Opretter statisk IP..."

az network public-ip create `
    --resource-group $resourceGroupName `
    --name "$vmName-ip" `
    --sku Standard `
    --allocation-method static `
    --output none

# ==============================
# DELETE EXISTING VM
# ==============================

Write-Host "Tjekker om VM findes..."

$vmList = az vm list --resource-group $resourceGroupName --query "[?name=='$vmName'].name" -o tsv

if ($vmList) {
    Write-Host "VM findes allerede. Sletter den..."

    az vm delete `
        --resource-group $resourceGroupName `
        --name $vmName `
        --yes `
        --output none

    Write-Host "VM slettet."
}
else {
    Write-Host "Ingen eksisterende VM fundet. Fortsætter..."
}

# ==============================
# CREATE VM
# ==============================

Write-Host "Opretter VM..."

az vm create `
    --resource-group $resourceGroupName `
    --name $vmName `
    --image Ubuntu2204 `
    --size Standard_B2ats_v2 `
    --admin-username $adminUsername `
    --ssh-key-values $sshPublicKeyPath `
    --public-ip-sku Standard `
    --public-ip-address "${vmName}-ip" `
    --output none

Write-Host "VM oprettet!"

# ==============================
# OPEN PORTS
# ==============================

Write-Host "Åbner porte..."

foreach ($portRule in $portsToOpen) {
    az vm open-port `
        --resource-group $resourceGroupName `
        --name $vmName `
        --port $portRule.Port `
        --priority $portRule.Priority `
        --output none
}


# ==============================
# SHOW IP
# ==============================

$publicIp = az vm show `
    --resource-group $resourceGroupName `
    --name $vmName `
    --show-details `
    --query publicIps `
    -o tsv

Write-Host "=============================="
Write-Host "VM Public IP: $publicIp"
Write-Host "=============================="

# ==============================
# COPY + RUN SETUP SCRIPT (FIX)
# ==============================

# Definer den absolutte sti til setup scriptet ved siden af denne .ps1 fil
$localSetupScriptPath = Join-Path $PSScriptRoot "setup.sh"

if (-not (Test-Path $localSetupScriptPath)) {
    throw "Setup script blev ikke fundet: $localSetupScriptPath"
}

Write-Host "Venter på at VM'en bliver klar til SSH..."
Wait-ForSshAvailability `
    -PublicIp $publicIp `
    -Username $adminUsername `
    -SshBaseOptions $sshCommonOptions `
    -MaxAttempts $sshMaxAttempts `
    -DelaySeconds $sshDelaySeconds `
    -ConnectTimeoutSeconds $sshConnectTimeoutSeconds

# Upload setup script til VM
Write-Host "Uploader setup script til VM..."
& scp @sshCommonOptions $localSetupScriptPath "$adminUsername@${publicIp}:/home/$adminUsername/setup.sh"

if ($LASTEXITCODE -ne 0) {
    throw "Upload af setup script fejlede med exit code $LASTEXITCODE"
}

# Kør setup script på VM
Write-Host "Kører setup script på VM..."
& ssh @sshCommonOptions "$adminUsername@${publicIp}" "sed -i 's/\r$//' setup.sh ; chmod +x setup.sh ; ./setup.sh"

if ($LASTEXITCODE -ne 0) {
    throw "Kørsel af setup script fejlede med exit code $LASTEXITCODE"
}

Write-Host "Setup script er fuldført, VM er klar!"


