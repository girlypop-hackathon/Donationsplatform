#!/bin/bash

set -e

GHCR_IMAGE="${GHCR_IMAGE:-ghcr.io/girlypop-hackathon/donationsplatform:latest}"
GHCR_USERNAME="${GHCR_USERNAME:-girlypop-hackathon}"

echo "Updating system..."
sudo apt update && sudo apt upgrade -y

echo "Installing dependencies..."
sudo apt install -y curl wget git ca-certificates gnupg

echo "Setting up Docker repo..."
sudo install -m 0755 -d /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu \
$(lsb_release -cs) stable" | \
sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "Installing Docker..."
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "Adding user to docker group..."
sudo usermod -aG docker $USER

echo "Cleaning up..."
sudo apt autoremove -y

echo "Docker installed successfully!"

echo "Checking for GHCR credentials..."

if [ -n "${GHCR_READ_TOKEN:-}" ]; then
	echo "Logging in to GHCR as ${GHCR_USERNAME}..."
	echo "$GHCR_READ_TOKEN" | sudo docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin

	echo "Pulling latest image: ${GHCR_IMAGE}"
	sudo docker pull "$GHCR_IMAGE"
	echo "Latest Docker image pulled successfully."
else
	echo "GHCR_READ_TOKEN not set. Skipping docker login and image pull."
	echo "Set GHCR_READ_TOKEN and rerun this script to auto-pull the newest image."
fi
