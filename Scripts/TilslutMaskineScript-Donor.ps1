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

az vm open-port --resource-group $resourceGroupName --name $vmName --port 22
az vm open-port --resource-group $resourceGroupName --name $vmName --port 80
az vm open-port --resource-group $resourceGroupName --name $vmName --port 443

# ==============================
# #SSH til VM
# ==============================
ssh azureuser@$publicIp "
