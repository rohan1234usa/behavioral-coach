import os
import sys
import json
import requests
from app.clients.imentiv import get_imentiv_client

VIDEO_ID = "0e1d3989-f54e-4945-8d14-11ed7fce4e6c"

def test_raw_text():
    client = get_imentiv_client()
    print(f"Imentiv Client initialized.")
    
    # Get video results first to get TEXT_ID
    try:
        video_results = client.video.get_results(VIDEO_ID, wait=False)
        text_id = video_results.get("text_id")
    except Exception as e:
        print(f"❌ Failed to get video results: {e}")
        return

    if not text_id:
        print("❌ No text_id found.")
        return

    print(f"✅ Found Text ID: {text_id}")
    
    session = client._base_client.session
    base_url = client.config.base_url 
    
    endpoints = [
        f"v2/texts/{text_id}",
        f"v1/texts/{text_id}",
        f"v2/texts/{text_id}/analysis",
        f"v2/texts/{text_id}/emotions",
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
    test_raw_text()
