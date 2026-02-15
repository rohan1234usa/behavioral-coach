import os
import sys
import json
import requests
from app.clients.imentiv import get_imentiv_client

VIDEO_ID = "0e1d3989-f54e-4945-8d14-11ed7fce4e6c"

def test_raw_audio():
    client = get_imentiv_client()
    print(f"Imentiv Client initialized.")
    
    # Get video results first to get AUDIO_ID
    try:
        video_results = client.video.get_results(VIDEO_ID, wait=False)
        audio_id = video_results.get("audio_id")
        text_id = video_results.get("text_id")
    except Exception as e:
        print(f"❌ Failed to get video results: {e}")
        return

    if not audio_id:
        print("❌ No audio_id found.")
        return

    print(f"✅ Found Audio ID: {audio_id}")
    
    # Use the session from base_client to get auth headers
    session = client._base_client.session
    base_url = client.config.base_url # e.g. https://api.imentiv.ai/
    
    endpoints = [
        f"v2/audios/{audio_id}/multimodal-analytics",
        f"v1/audios/{audio_id}/multimodal-analytics",
        f"v2/audios/{audio_id}",
        f"v1/audios/{audio_id}",
    ]
    
    for ep in endpoints:
        url = f"{base_url.rstrip('/')}/{ep}"
        print(f"\n🚀 GET {url} ...")
        try:
            resp = session.get(url)
            print(f"Status: {resp.status_code}")
            if resp.status_code == 200:
                print(f"✅ Success! JSON Sample: {resp.text[:200]}")
            else:
                print(f"❌ Failed: {resp.text}")
        except Exception as e:
            print(f"❌ Exception: {e}")

if __name__ == "__main__":
    test_raw_audio()
