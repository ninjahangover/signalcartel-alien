#!/bin/bash

# SignalCartel System Guardian Service Installation Script
# This script installs the System Guardian as a systemd service for auto-start on boot

echo "🛡️ Installing SignalCartel System Guardian Service..."

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  Please run with sudo: sudo ./install-guardian-service.sh"
    exit 1
fi

# Copy service file to systemd directory
echo "📋 Copying service file to systemd..."
cp /home/telgkb9/depot/current/signalcartel-guardian.service /etc/systemd/system/

# Reload systemd daemon
echo "🔄 Reloading systemd daemon..."
systemctl daemon-reload

# Enable service to start on boot
echo "✅ Enabling service to start on boot..."
systemctl enable signalcartel-guardian.service

# Start the service immediately
echo "🚀 Starting System Guardian service..."
systemctl start signalcartel-guardian.service

# Check service status
echo "📊 Checking service status..."
systemctl status signalcartel-guardian.service --no-pager

echo ""
echo "✅ System Guardian service installed successfully!"
echo ""
echo "📋 Useful commands:"
echo "  • Check status:  sudo systemctl status signalcartel-guardian"
echo "  • View logs:     sudo journalctl -u signalcartel-guardian -f"
echo "  • Restart:       sudo systemctl restart signalcartel-guardian"
echo "  • Stop:          sudo systemctl stop signalcartel-guardian"
echo "  • Disable:       sudo systemctl disable signalcartel-guardian"
echo ""
echo "🛡️ The System Guardian will now:"
echo "  • Start automatically on system boot"
echo "  • Restart automatically if it crashes"
echo "  • Monitor and restart your trading processes"
echo "  • Send ntfy alerts for any issues"