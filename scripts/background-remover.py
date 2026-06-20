#!/usr/bin/env python3
"""
Background Remover — JPEG → Transparent PNG
Reads every JPEG from the source folder, removes the background,
and saves each as a transparent PNG into a new sibling folder.

Usage:
    python3 remove_bg.py
"""

import os
import sys
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
SOURCE_FOLDER = Path("/Users/otherworld/Downloads/orbs2rm")
OUTPUT_FOLDER = SOURCE_FOLDER.parent / "new-orbs-bgremoved"
JPEG_EXTENSIONS = {".jpg", ".jpeg", ".JPG", ".JPEG"}
# ──────────────────────────────────────────────────────────────────────────────


def main():
    # 1. Validate source folder
    if not SOURCE_FOLDER.exists():
        print(f"❌  Source folder not found: {SOURCE_FOLDER}")
        sys.exit(1)

    # 2. Create output folder (safe if it already exists)
    OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)
    print(f"📂  Output folder: {OUTPUT_FOLDER}\n")

    # 3. Collect all JPEG files (non-recursive)
    jpeg_files = [
        f for f in SOURCE_FOLDER.iterdir()
        if f.is_file() and f.suffix in JPEG_EXTENSIONS
    ]

    if not jpeg_files:
        print("⚠️  No JPEG files found in source folder. Nothing to do.")
        sys.exit(0)

    print(f"🔍  Found {len(jpeg_files)} JPEG file(s) to process.\n")

    # 4. Lazy-import rembg (gives a clear error if not installed)
    try:
        from rembg import remove
        from PIL import Image
        import io
    except ImportError as e:
        print(f"❌  Missing dependency: {e}")
        print("    Install with:  pip3 install rembg onnxruntime pillow")
        sys.exit(1)

    # 5. Process each file
    errors = []
    for idx, jpeg_path in enumerate(sorted(jpeg_files), start=1):
        stem = jpeg_path.stem
        output_path = OUTPUT_FOLDER / f"{stem}.png"

        print(f"[{idx}/{len(jpeg_files)}] {jpeg_path.name}  →  {output_path.name}", end="  ", flush=True)

        try:
            # Read original (leaves source untouched — we never write back)
            with open(jpeg_path, "rb") as f:
                input_bytes = f.read()

            # Remove background — returns RGBA PNG bytes
            output_bytes = remove(input_bytes)

            # Write transparent PNG
            with open(output_path, "wb") as f:
                f.write(output_bytes)

            print("✅")

        except Exception as e:
            print(f"❌  ERROR: {e}")
            errors.append((jpeg_path.name, str(e)))

    # 6. Summary
    success_count = len(jpeg_files) - len(errors)
    print(f"\n{'─'*50}")
    print(f"✅  Done!  {success_count}/{len(jpeg_files)} images processed successfully.")
    print(f"📁  Transparent PNGs saved to: {OUTPUT_FOLDER}")

    if errors:
        print(f"\n⚠️  {len(errors)} file(s) failed:")
        for name, err in errors:
            print(f"    • {name}: {err}")


if __name__ == "__main__":
    main()