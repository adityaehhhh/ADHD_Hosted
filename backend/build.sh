#!/bin/bash

# Install Python + pip (optional, Render usually has it pre-installed)
# sudo apt-get update && sudo apt-get install -y python3 python3-pip

echo "📦 Installing Python dependencies..."
pip install -r requirements.txt
echo "✅ Python setup complete"
