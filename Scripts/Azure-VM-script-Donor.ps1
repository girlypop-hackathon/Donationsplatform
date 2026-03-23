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
        [string]$PrivateKeyPath,

        [int]$MaxAttempts = 30,
        [int]$DelaySeconds = 10
    )

    for ($attemptNumber = 1; $attemptNumber -le $MaxAttempts; $attemptNumber++) {
        Write-Host "Tjekker SSH forbindelse (forsøg $attemptNumber/$MaxAttempts)..."

        ssh `
            -i $PrivateKeyPath `
            -o BatchMode=yes `
            -o StrictHostKeyChecking=no `
            -o ConnectTimeout=10 `
            "$Username@$PublicIp" "echo SSH klar" 2>$null | Out-Null

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

if ($rgExists -eq "true") {
    Write-Host "Resource group findes allerede."
}
else {
    Write-Host "Resource group findes ikke. Opretter den..."
    az group create `
        --name $resourceGroupName `
        --location $location
}

# ==============================
# PUBLIC IP (STATIC)
# ==============================

Write-Host "Opretter statisk IP..."

az network public-ip create `
    --resource-group $resourceGroupName `
    --name "$vmName-ip" `
    --sku Standard `
    --allocation-method static

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
        --yes

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
    --public-ip-address "${vmName}-ip"

Write-Host "VM oprettet!"

# ==============================
# OPEN PORTS
# ==============================

Write-Host "Åbner porte..."

az vm open-port `
    --resource-group $resourceGroupName `
    --name $vmName `
    --port 22 `
    --priority 301

az vm open-port `
    --resource-group $resourceGroupName `
    --name $vmName `
    --port 80 `
    --priority 302

az vm open-port `
    --resource-group $resourceGroupName `
    --name $vmName `
    --port 443 `
    --priority 303


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
    -PrivateKeyPath $sshPrivateKeyPath

# Upload setup script til VM
Write-Host "Uploader setup script til VM..."
scp `
    -i $sshPrivateKeyPath `
    -o StrictHostKeyChecking=no `
    $localSetupScriptPath `
    "$adminUsername@${publicIp}:/home/$adminUsername/setup.sh"

# Kør setup script på VM
Write-Host "Kører setup script på VM..."
ssh `
    -i $sshPrivateKeyPath `
    -o StrictHostKeyChecking=no `
    "$adminUsername@${publicIp}" "chmod +x setup.sh ; ./setup.sh"

Write-Host "Setup script er fuldført, VM er klar!"


