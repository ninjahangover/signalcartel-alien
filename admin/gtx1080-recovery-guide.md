# GTX 1080 Driver Recovery Guide

## Quick Recovery After System Upgrades

When system upgrades break your GTX 1080 GPU (like the recent 580.x driver issue), use this simple recovery process:

### 1. Run the Setup Script (as root)
```bash
sudo /home/telgkb9/depot/current/admin/setup-gtx1080-drivers.sh
```

### 2. Reboot System
```bash
sudo reboot
```

### 3. Verify GPU Works
```bash
nvidia-smi
```

## Manual Setup (if script fails)

```bash
# Add legacy repository
echo "deb http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware" > /etc/apt/sources.list.d/nvidia-legacy.list
apt update

# Remove incompatible drivers
apt remove --purge nvidia-* libnvidia-*
apt autoremove

# Install GTX 1080 compatible drivers
apt install nvidia-legacy-470xx-driver nvidia-legacy-470xx-utils nvidia-legacy-470xx-kernel-dkms

# Blacklist nouveau
echo "blacklist nouveau" > /etc/modprobe.d/blacklist-nouveau.conf
echo "options nouveau modeset=0" >> /etc/modprobe.d/blacklist-nouveau.conf

# Update and reboot
update-initramfs -u
reboot
```

## Prevention Strategy

1. **Hold packages** to prevent future upgrades:
```bash
apt-mark hold nvidia-legacy-470xx-driver nvidia-legacy-470xx-utils nvidia-legacy-470xx-kernel-dkms
```

2. **Before major system upgrades**, backup current working state:
```bash
dpkg -l | grep nvidia > ~/nvidia-working-packages.txt
```

## Testing SignalCartel GPU Integration

After GPU restoration, test in SignalCartel:
```bash
# Test GPU acceleration
ENABLE_GPU_STRATEGIES=true npx tsx -e "console.log('GPU test')"

# Monitor for GPU usage in logs
tail -f /tmp/signalcartel-logs/production-trading.log | grep -i gpu
```