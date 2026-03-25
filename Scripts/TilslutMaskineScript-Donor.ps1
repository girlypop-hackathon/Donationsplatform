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
$ghcrUsername = "girlypop-hackathon"
$dockerImage = "ghcr.io/girlypop-hackathon/donationsplatform:latest"

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

Write-Host "Rydder gammel SSH host key for $publicIp (hvis den findes)..."
if (Get-Command ssh-keygen -ErrorAction SilentlyContinue) {
    & ssh-keygen -R $publicIp *> $null
}

# Optional: Pull newest Docker image automatically if GHCR_READ_TOKEN is available.
$ghcrReadToken = [Environment]::GetEnvironmentVariable("GHCR_READ_TOKEN", "Process")
if ([string]::IsNullOrWhiteSpace($ghcrReadToken)) {
    $ghcrReadToken = [Environment]::GetEnvironmentVariable("GHCR_READ_TOKEN", "User")
}
if ([string]::IsNullOrWhiteSpace($ghcrReadToken)) {
    $ghcrReadToken = [Environment]::GetEnvironmentVariable("GHCR_READ_TOKEN", "Machine")
}

if ([string]::IsNullOrWhiteSpace($ghcrReadToken)) {
    Write-Host "GHCR_READ_TOKEN blev ikke fundet. Springer docker pull over i dette script."
    Write-Host "Sæt GHCR_READ_TOKEN som env var for automatisk pull af nyeste image."
}
else {
    Write-Host "Logger ind i GHCR på VM og henter nyeste image..."
    $remotePullCommand = "sudo docker login ghcr.io -u $ghcrUsername --password-stdin && sudo docker pull $dockerImage"
    $ghcrReadToken | & ssh -o StrictHostKeyChecking=accept-new "$adminUsername@$publicIp" $remotePullCommand

    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Automatisk docker pull fejlede. Du kan stadig logge ind manuelt og køre docker pull selv."
    }
    else {
        Write-Host "Nyeste Docker image er hentet på VM."
    }
}

Write-Host "Forbinder til VM via SSH..."
& ssh -o StrictHostKeyChecking=accept-new "$adminUsername@$publicIp"
