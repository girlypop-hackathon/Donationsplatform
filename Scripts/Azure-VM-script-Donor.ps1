# ==============================
# CONFIG
# ==============================

$ErrorActionPreference = "Stop"

$resourceGroupName = "donationsplatform-rg"
$location = "norwayeast"
$vmName = "donationsplatform-vm"
$adminUsername = "azureuser"
$sshPublicKeyPath = "$HOME\.ssh\id_rsa.pub"

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

$vmExists = az vm show `
    --resource-group $resourceGroupName `
    --name $vmName `
    --query "name" `
    -o tsv 2>$null

if ($vmExists) {
    Write-Host "VM findes - Sletter..."

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

az vm open-port --resource-group $resourceGroupName --name $vmName --port 22
az vm open-port --resource-group $resourceGroupName --name $vmName --port 80
az vm open-port --resource-group $resourceGroupName --name $vmName --port 443


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
# COPY + RUN SETUP SCRIPT
# ==============================

Write-Host "Uploader setup script..."

scp ./setup.sh "$adminUsername@${publicIp}:/home/$adminUsername/"

Write-Host "Kører setup script..."

ssh $adminUsername@$publicIp "
chmod +x setup.sh
./setup.sh
"

Write-Host "VM er klar!"


