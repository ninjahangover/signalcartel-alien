#!/bin/bash

# TensorFlow CUDA Symbolic Links Creation Script
# Creates the missing library links that TensorFlow needs

echo "🔗 Creating TensorFlow CUDA symbolic links..."

# Create the symbolic links from CUDA 12.3 to TensorFlow expected versions
sudo ln -sf /usr/local/cuda-12.3/targets/x86_64-linux/lib/libcudart.so.12.3.101 /usr/lib/x86_64-linux-gnu/libcudart.so.11.0
sudo ln -sf /usr/local/cuda-12.3/targets/x86_64-linux/lib/libcublas.so.12.3.4.1 /usr/lib/x86_64-linux-gnu/libcublas.so.11
sudo ln -sf /usr/local/cuda-12.3/targets/x86_64-linux/lib/libcublas.so.12.3.4.1 /usr/lib/x86_64-linux-gnu/libcublasLt.so.11
sudo ln -sf /usr/local/cuda-12.3/targets/x86_64-linux/lib/libcufft.so.11.0.12.1 /usr/lib/x86_64-linux-gnu/libcufft.so.10

# Find and link cusparse (already partially linked)
if [ -f "/usr/local/cuda-12.3/targets/x86_64-linux/lib/libcusparse.so.12" ]; then
    sudo ln -sf /usr/local/cuda-12.3/targets/x86_64-linux/lib/libcusparse.so.12 /usr/lib/x86_64-linux-gnu/libcusparse.so.11
fi

# Update library cache
sudo ldconfig

echo "✅ TensorFlow CUDA symbolic links created!"
echo "🔍 Verifying links..."
ls -la /usr/lib/x86_64-linux-gnu/libcudart.so.11.0 2>/dev/null && echo "✅ libcudart.so.11.0"
ls -la /usr/lib/x86_64-linux-gnu/libcublas.so.11 2>/dev/null && echo "✅ libcublas.so.11" 
ls -la /usr/lib/x86_64-linux-gnu/libcublasLt.so.11 2>/dev/null && echo "✅ libcublasLt.so.11"
ls -la /usr/lib/x86_64-linux-gnu/libcufft.so.10 2>/dev/null && echo "✅ libcufft.so.10"

echo "🚀 Ready to test TensorFlow GPU acceleration!"