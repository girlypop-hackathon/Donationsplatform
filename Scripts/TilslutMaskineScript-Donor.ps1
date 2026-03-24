<#
/*
Oprettet: 18-03-2026
Af: Jonas og GitHub Copilot (GPT-5.3-codex)
Beskrivelse: Connect and open required ports on the donation platform VM
*/
#>

$resourceGroupName = "donationsplatform-rg"
$location = "norwayeast"
$vmName = "donationsplatform-vm"
$adminUsername = "azureuser"
$sshPublicKeyPath = "$HOME\.ssh\id_rsa.pub"

# ==============================
# Login på Azure
# ==============================

Write-Host "Logger ind i Azure..."
az login

#Start VM
az vm start --resource-group $resourceGroupName --name $vmName

$publicIp = az vm show `
    --resource-group $resourceGroupName `
    --name $vmName `
    --show-details `
    --query publicIps `
    -o tsv

Write-Host "VM Public IP: $publicIp"

# ==============================
# OPEN PORTS
# ==============================

Write-Host "Åbner porte..."

az vm open-port --resource-group $resourceGroupName --name $vmName --port 22 --priority 301
az vm open-port --resource-group $resourceGroupName --name $vmName --port 80 --priority 302
az vm open-port --resource-group $resourceGroupName --name $vmName --port 443 --priority 303

# ==============================
# #SSH til VM
# ==============================
ssh $adminUsername@$publicIp 
