#!/bin/bash
# This is the public-facing version.
set -ex

# Use uv to run Python commands
export LD_LIBRARY_PATH=$(uv run python -c 'import sysconfig; print(sysconfig.get_config_var("LIBDIR"))')

uvx --from 'huggingface_hub[cli]' huggingface-cli login --token $HUGGING_FACE_HUB_TOKEN

# Set Python path for Rust compilation  
export PYO3_PYTHON=$(uv run python -c 'import sys; print(sys.executable)')

CARGO_TARGET_DIR=/app/target cargo install --features cuda moshi-server@0.6.3

# Configure Python environment for runtime
# Don't set PYTHONHOME or PYTHONPATH to avoid overriding default Python setup
# Instead, just ensure the Python binary is available in PATH
export PATH="/app/.venv/bin:$PATH"
export LC_ALL=C.UTF-8
export LANG=C.UTF-8

# Subtle detail here: We use the full path to `moshi-server` because there is a `moshi-server` binary
# from the `moshi` Python package. We'll fix this conflict soon.
/root/.cargo/bin/moshi-server $@