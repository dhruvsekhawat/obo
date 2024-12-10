#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to the script directory
cd "$SCRIPT_DIR"

# Set the Python path to include the current directory
export PYTHONPATH=$SCRIPT_DIR:$PYTHONPATH

# Set Django settings
export DJANGO_SETTINGS_MODULE=backend.settings

# Run Daphne
daphne -b 127.0.0.1 -p 8001 backend.asgi:application 