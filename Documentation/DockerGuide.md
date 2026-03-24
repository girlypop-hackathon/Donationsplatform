# Docker Guide - Start VM and run website

This guide shows how to:

1. Start the Azure VM
2. Connect with SSH
3. Pull and run the latest Docker image from GHCR
4. Verify the website is live

## 1) Start VM from your local machine (Windows PowerShell)

Use the existing script:

```powershell
cd Scripts
.\TilslutMaskineScript-Donor.ps1
```

What this script does:

- Logs in to Azure
- Starts VM `donationsplatform-vm`
- Opens ports `22`, `80`, `443`
- Connects with SSH to `azureuser@<public-ip>`

## 2) Install Docker on VM (first time only)

When you are connected to the VM with SSH, run:

```bash
cd ~/Donationsplatform/Scripts
chmod +x setup.sh
./setup.sh
exit
```

Then SSH in again so Docker group permissions are applied.

## 3) Login to GHCR and run latest image

After SSHing into the VM again:

```bash
# Optional cleanup from older runs
docker stop app || true
docker rm app || true

# Login to GitHub Container Registry
# Use a GitHub PAT with scope: read:packages
echo "<YOUR_GHCR_PAT>" | docker login ghcr.io -u girlypop-hackathon --password-stdin

# Pull and run
docker pull ghcr.io/girlypop-hackathon/donationsplatform:latest
docker run -d -p 80:3000 --name app ghcr.io/girlypop-hackathon/donationsplatform:latest
```

## 4) Verify container and website

Inside VM:

```bash
docker ps
docker logs --tail 50 app
curl -I http://localhost
curl -s http://localhost/api/providers
```

From your local browser:

- Website: `http://<VM_PUBLIC_IP>/`
- API test: `http://<VM_PUBLIC_IP>/api/providers`

## 5) Useful maintenance commands

```bash
# Restart container
docker restart app

# View live logs
docker logs -f app

# Stop and remove container
docker stop app
docker rm app

# Remove old images
docker image prune -f
```

## Troubleshooting

### Port 80 is not reachable

- Confirm NSG/VM ports are open (script opens 22/80/443).
- Verify container is running: `docker ps`

### GHCR login fails

- Confirm token has `read:packages`.
- Confirm username is correct (`girlypop-hackathon`).

### Container exits immediately

- Check logs: `docker logs app`
- Re-run with latest image:
  - `docker pull ghcr.io/girlypop-hackathon/donationsplatform:latest`
  - `docker stop app || true && docker rm app || true`
  - `docker run -d -p 80:3000 --name app ghcr.io/girlypop-hackathon/donationsplatform:latest`
