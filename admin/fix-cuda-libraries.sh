#!/bin/bash

# CUDA Libraries Fix Script for TensorFlow Deep Learning
# This script installs the missing CUDA libraries for GTX 1080 TensorFlow support

echo "🔧 FIXING CUDA LIBRARIES FOR TENSORFLOW DEEP LEARNING"
echo "======================================================"

# Check current GPU status
echo "📊 Current GPU Status:"
nvidia-smi

# Add NVIDIA repository for CUDA 11.8 (compatible with TensorFlow)
echo "📦 Adding NVIDIA CUDA repository..."
wget -q https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.0-1_all.deb
sudo dpkg -i cuda-keyring_1.0-1_all.deb
sudo apt update

# Install CUDA Toolkit 11.8 (compatible with TensorFlow 2.x)
echo "⚡ Installing CUDA Toolkit 11.8..."
sudo apt install -y cuda-toolkit-11-8

# Install cuDNN 8 for deep learning
echo "🧠 Installing cuDNN 8..."
sudo apt install -y libcudnn8 libcudnn8-dev

# Install additional libraries TensorFlow needs
echo "📚 Installing TensorFlow GPU dependencies..."
sudo apt install -y \
    libcudart11.0 \
    libcublas11 \
    libcurand10 \
    libcusolver11 \
    libcusparse11 \
    libcufft10 \
    libnvrtc11.2 \
    libnvjpeg11

# Set up environment variables
echo "🌍 Setting up CUDA environment..."
echo 'export PATH=/usr/local/cuda-11.8/bin:$PATH' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH=/usr/local/cuda-11.8/lib64:$LD_LIBRARY_PATH' >> ~/.bashrc

# Create symbolic links for missing libraries
echo "🔗 Creating symbolic links..."
sudo ln -sf /usr/local/cuda-11.8/lib64/libcudart.so.11.0 /usr/lib/x86_64-linux-gnu/libcudart.so.11.0
sudo ln -sf /usr/local/cuda-11.8/lib64/libcublas.so.11 /usr/lib/x86_64-linux-gnu/libcublas.so.11
sudo ln -sf /usr/local/cuda-11.8/lib64/libcublasLt.so.11 /usr/lib/x86_64-linux-gnu/libcublasLt.so.11
sudo ln -sf /usr/local/cuda-11.8/lib64/libcufft.so.10 /usr/lib/x86_64-linux-gnu/libcufft.so.10
sudo ln -sf /usr/local/cuda-11.8/lib64/libcusparse.so.11 /usr/lib/x86_64-linux-gnu/libcusparse.so.11

# Update library cache
sudo ldconfig

echo "✅ CUDA installation complete!"
echo "🔄 Please restart the trading system to enable TensorFlow GPU acceleration"
echo "🚀 Run: source ~/.bashrc to update environment"

# Test CUDA installation
echo "🧪 Testing CUDA installation..."
nvcc --version || echo "⚠️ CUDA compiler not found in PATH"

# Verify libraries
echo "🔍 Verifying CUDA libraries..."
ls -la /usr/lib/x86_64-linux-gnu/libcudart* || echo "⚠️ libcudart not found"
ls -la /usr/lib/x86_64-linux-gnu/libcublas* || echo "⚠️ libcublas not found" 
ls -la /usr/lib/x86_64-linux-gnu/libcudnn* || echo "⚠️ libcudnn not found"

echo ""
echo "🎯 NEXT STEPS:"
echo "1. Run: source ~/.bashrc"
echo "2. Restart trading system processes"
echo "3. Verify TensorFlow GPU with: python3 -c 'import tensorflow as tf; print(tf.config.list_physical_devices(\"GPU\"))'"