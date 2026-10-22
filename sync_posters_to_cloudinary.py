#!/usr/bin/env python3
"""
Root entrypoint for SportBid VFN poster synchronization script.
Delegates directly to backend.sync_posters_to_cloudinary.
"""
import sys
from pathlib import Path

# Ensure backend package is accessible
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.sync_posters_to_cloudinary import main

if __name__ == "__main__":
    main()
