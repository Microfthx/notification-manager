#!/usr/bin/env python3
import argparse
import json
import os
import shutil
import subprocess
import tempfile
import urllib.request
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


FACE_API_URL = (
    "https://api.weibo.com/2/emotions.json"
    "?source=1362404091&type=face&language=cnname"
)
PWA_MANIFEST_URL = "https://h5.sinaimg.cn/m/emoticon/all.json"
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
USER_AGENT = "Mozilla/5.0 NotificationManager/1.0"


def fetch_bytes(url):
    encoded_url = quote(url, safe=":/?&=%#")
    request = urllib.request.Request(encoded_url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def fetch_json(url):
    return json.loads(fetch_bytes(url).decode("utf-8"))


def normalize_name(value):
    name = str(value or "").strip()
    if name.startswith("[") and name.endswith("]"):
        name = name[1:-1]
    if not name or any(character in name for character in ("/", "\\", "\0")):
        return None
    return name


def load_official_sources():
    sources = {}

    pwa_manifest = fetch_json(PWA_MANIFEST_URL)
    for name, item in pwa_manifest.items():
        normalized_name = normalize_name(name)
        source = item.get("source") if isinstance(item, dict) else None
        if normalized_name and source:
            sources[normalized_name] = f"https:{source}" if source.startswith("//") else source

    # The Open API is newer, so entries from it take precedence over the PWA manifest.
    for item in fetch_json(FACE_API_URL):
        normalized_name = normalize_name(item.get("phrase") or item.get("value"))
        source = item.get("icon") or item.get("url")
        if normalized_name and source:
            sources[normalized_name] = source

    return sources


def convert_to_png_36(source_path, destination_path):
    subprocess.run(
        [
            "convert",
            f"{source_path}[0]",
            "-resize",
            "36x36!",
            "-strip",
            f"PNG32:{destination_path}",
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    if destination_path.read_bytes()[:8] != PNG_SIGNATURE:
        raise ValueError(f"converted file is not PNG: {destination_path}")


def download_and_convert(item, temporary_directory):
    name, url = item
    downloaded_path = temporary_directory / f"{name}.download"
    converted_path = temporary_directory / f"{name}.png"
    downloaded_path.write_bytes(fetch_bytes(url))
    if downloaded_path.read_bytes()[:8] != PNG_SIGNATURE:
        raise ValueError(f"official source is not PNG: {name} ({url})")
    convert_to_png_36(downloaded_path, converted_path)
    return name, converted_path


def normalize_existing_files(icon_directory):
    for image_path in sorted(icon_directory.glob("*.png")):
        if image_path.read_bytes()[:8] != PNG_SIGNATURE:
            raise ValueError(f"non-PNG file remains: {image_path.name}")
        temporary_path = image_path.with_suffix(".normalized.png")
        convert_to_png_36(image_path, temporary_path)
        os.replace(temporary_path, image_path)


def main():
    parser = argparse.ArgumentParser(description="Sync official Weibo emoji PNG files.")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "assets" / "icon",
    )
    parser.add_argument("--workers", type=int, default=12)
    args = parser.parse_args()

    if shutil.which("convert") is None:
        raise RuntimeError("ImageMagick 'convert' is required")

    icon_directory = args.output.resolve()
    icon_directory.mkdir(parents=True, exist_ok=True)
    sources = load_official_sources()

    with tempfile.TemporaryDirectory(
        prefix=".weibo-emoji-",
        dir=icon_directory.parent,
    ) as temporary_name:
        temporary_directory = Path(temporary_name)
        completed = []
        with ThreadPoolExecutor(max_workers=max(args.workers, 1)) as executor:
            futures = {
                executor.submit(download_and_convert, item, temporary_directory): item[0]
                for item in sources.items()
            }
            for future in as_completed(futures):
                completed.append(future.result())

        for name, converted_path in completed:
            os.replace(converted_path, icon_directory / f"{name}.png")

    normalize_existing_files(icon_directory)
    print(f"Synced {len(sources)} official emoji; {len(list(icon_directory.glob('*.png')))} total PNG files.")


if __name__ == "__main__":
    main()
