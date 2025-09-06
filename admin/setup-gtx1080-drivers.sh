#!/bin/bash
# GTX 1080 Driver Setup Script
# Quickly restore proper NVIDIA drivers after system upgrades

set -e

echo "🔧 Setting up GTX 1080 (470.x) driver repository and installation..."

# Add legacy driver repository if not already present
if ! grep -q "nvidia-legacy-470" /etc/apt/sources.list.d/* 2>/dev/null; then
    echo "📦 Adding legacy NVIDIA driver repository..."
    echo "deb http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware" > /etc/apt/sources.list.d/nvidia-legacy.list
fi

# Update package list
echo "🔄 Updating package list..."
apt update

# Remove incompatible current drivers
echo "🗑️ Removing incompatible NVIDIA drivers..."
apt remove --purge -y nvidia-* libnvidia-* || true
apt autoremove -y

# Install GTX 1080 compatible drivers
echo "⚡ Installing GTX 1080 compatible drivers (470.x series)..."
apt install -y nvidia-legacy-470xx-driver nvidia-legacy-470xx-utils nvidia-legacy-470xx-kernel-dkms

# Blacklist nouveau driver
echo "🚫 Configuring nouveau blacklist..."
echo "blacklist nouveau" > /etc/modprobe.d/blacklist-nouveau.conf
echo "options nouveau modeset=0" >> /etc/modprobe.d/blacklist-nouveau.conf

# Update initramfs
echo "🔧 Updating initramfs..."
update-initramfs -u

echo "✅ GTX 1080 driver setup complete!"
echo "⚠️  REBOOT REQUIRED: Run 'reboot' to activate the new drivers"
echo "📋 After reboot, verify with: nvidia-smi"