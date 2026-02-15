import os
import sys
import json
from imentiv import ImentivClient

# Hardcoded video ID from logs
VIDEO_ID = "0e1d3989-f54e-4945-8d14-11ed7fce4e6c"

def test_options():
    api_key = os.environ.get("IMENTIV_API_KEY")
    if not api_key:
        print("❌ IMENTIV_API_KEY not found.")
        return

    client = ImentivClient(api_key=api_key)
    
    print(f"🔬 Testing analysis options for Video ID: {VIDEO_ID}")
    
    options = {
        "detect_emotions": True,
        "audio_analysis": True,
        "text_analysis": True,
        "detect_audio_emotions": True,
        "detect_text_emotions": True,
        "include_audio": True,
        "include_text": True
    }
    
    try:
        print(f"🚀 Calling analyze with options: {options}")
        response = client.video.analyze(VIDEO_ID, options=options)
        print(f"✅ Analyze response: {response}")
        
        print("⏳ Waiting for results...")
        results = client.video.get_results(VIDEO_ID, wait=True, poll_interval=2.0)
        
        print("\n📊 Analysis Results Summary:")
        emotions = results.get("emotion_analysis", {})
        print(f"Video emotions keys: {list(emotions.get('overall', {}).get('video', {}).keys())}")
        print(f"Audio emotions keys: {list(emotions.get('overall', {}).get('audio', {}).keys())}")
        print(f"Text emotions keys: {list(emotions.get('overall', {}).get('text', {}).keys())}")
        
        if emotions.get('overall', {}).get('audio'):
            print("🎉 SUCCESS: Audio emotions found!")
        else:
            print("❌ FAILURE: Audio emotions still empty.")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    test_options()
