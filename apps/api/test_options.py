import os
import sys
import json
import time
from app.clients.imentiv import get_imentiv_client

VIDEO_ID = "0e1d3989-f54e-4945-8d14-11ed7fce4e6c"

def test_probe_endpoints():
    client = get_imentiv_client()
    print(f"Imentiv Client initialized.")
    
    options = {
        "video_id": VIDEO_ID,
        "detect_emotions": True,
        "audio_analysis": True,
        "text_analysis": True
    }
    
    endpoints = [
        "v2/videos/analyze",
        "v1/videos/analyze",
        f"v2/videos/{VIDEO_ID}/analyze",
        f"v1/videos/{VIDEO_ID}/analyze",
    ]
    
    for ep in endpoints:
        print(f"\n🚀 Probing POST {ep} ...")
        try:
            # client._base_client is the BaseClient instance which has post method
            resp = client._base_client.post(ep, json=options)
            print(f"✅ Success: {resp}")
        except Exception as e:
            print(f"❌ Failed: {e}")

if __name__ == "__main__":
    test_probe_endpoints()
