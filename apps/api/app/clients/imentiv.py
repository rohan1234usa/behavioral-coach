import requests
import time
import os
import logging
from typing import Dict, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ImentivClient")

class ImentivClient:
    """
    A modular Python client for the Imentiv Emotion AI API.
    Mapped to v1 endpoints for Videos, Images, Texts, and Audios.
    """
    
    BASE_URL = "https://api.imentiv.ai/v1" 

    def __init__(self, api_key: str):
        """
        Initialize the client with your X-API-Key and Referer.
        """
        self.api_key = api_key
        self.headers = {
            "X-API-Key": self.api_key,
            "Referer": "https://localhost:3000", # Required by Imentiv
            "User-Agent": "BehavioralCoach/1.0"
        }

    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """
        Internal helper to handle HTTP requests and standardized error handling.
        """
        url = f"{self.BASE_URL}/{endpoint}"
        
        try:
            # Merge headers if specific ones are passed in kwargs
            req_headers = self.headers.copy()
            if "headers" in kwargs:
                req_headers.update(kwargs.pop("headers"))

            response = requests.request(method, url, headers=req_headers, **kwargs)
            
            # 1. Raise HTTPError for bad responses (4xx or 5xx)
            response.raise_for_status()
            
            # 2. Return JSON response
            return response.json()

        except requests.exceptions.HTTPError as http_err:
            logger.error(f"HTTP Error: {http_err} - Response: {response.text}")
            raise
        except requests.exceptions.ConnectionError as conn_err:
            logger.error(f"Connection Error: {conn_err}")
            raise
        except requests.exceptions.Timeout as timeout_err:
            logger.error(f"Timeout Error: {timeout_err}")
            raise
        except Exception as err:
            logger.error(f"An unexpected error occurred: {err}")
            raise

    # ---------------------------------------------------------
    # Synchronous Endpoints (Text)
    # ---------------------------------------------------------

    def analyze_text(self, text: str) -> Dict[str, Any]:
        """
        Analyzes raw text for emotion.
        Endpoint: POST /v1/texts
        Content-Type: application/x-www-form-urlencoded
        """
        endpoint = "texts"
        payload = {"text": text}
        
        logger.info("Sending text for analysis...")
        return self._request("POST", endpoint, data=payload)

    # ---------------------------------------------------------
    # File Upload Endpoints (Image, Audio)
    # ---------------------------------------------------------

    def analyze_image(self, image_path: str) -> Dict[str, Any]:
        """
        Uploads and analyzes an image file.
        Endpoint: POST /v1/images
        Response Key: 'image_id'
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found at {image_path}")

        endpoint = "images"
        
        with open(image_path, "rb") as img_file:
            files = {"file": img_file}
            logger.info(f"Uploading image: {image_path}...")
            return self._request("POST", endpoint, files=files)

    def analyze_audio(self, audio_path: str) -> Dict[str, Any]:
        """
        Uploads and analyzes an audio file.
        Endpoint: POST /v1/audios
        Response Key: 'id'
        """
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio not found at {audio_path}")

        endpoint = "audios"
        
        with open(audio_path, "rb") as audio_file:
            files = {"file": audio_file}
            logger.info(f"Uploading audio: {audio_path}...")
            return self._request("POST", endpoint, files=files)

    # ---------------------------------------------------------
    # Asynchronous Endpoint (Video)
    # ---------------------------------------------------------

    def analyze_video(self, video_path: str, poll_interval: int = 5) -> Dict[str, Any]:
        """
        1. Upload Video (POST /v1/videos)
        2. Poll Status (GET /v1/videos/{id})
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video not found at {video_path}")

        endpoint = "videos"
        logger.info(f"Step 1: Uploading video {video_path}...")

        with open(video_path, "rb") as vid_file:
            files = {"video_file": vid_file} 
            
            payload = {
                "title": f"Session {os.path.basename(video_path)}",
                "description": "Behavioral Coach Analysis Session",
                # FIX: Add this flag to the upload metadata
                "annotated_video_mp4": "false" 
            }

            try:
                response = self._request("POST", endpoint, files=files, data=payload)
                logger.info(f"✅ Upload Response: {response}")
            except Exception as e:
                logger.error(f"❌ Upload Failed! Error: {e}")
                raise

        job_id = response.get("id")
        if not job_id:
            raise ValueError(f"Failed to retrieve 'id' from upload response: {response}")
        
        logger.info(f"Video uploaded successfully. Job ID: {job_id}")

        # Step 2: Poll for Completion
        return self._poll_video_result(job_id, interval=poll_interval)

    def _poll_video_result(self, job_id: str, interval: int) -> Dict[str, Any]:
        """
        WORKAROUND: Polling via the List endpoint (GET /v1/videos).
        This bypasses the 422 error on the specific video GET endpoint.
        """
        # The List endpoint does not require the 'annotated_video_mp4' field
        list_endpoint = "videos" 
        
        while True:
            logger.info(f"Step 2: Polling library list to find Job {job_id}...")
            
            try:
                # We fetch the latest 50 videos from your account
                response = self._request("GET", list_endpoint, params={"page_size": 50})
                
                # Based on your docs, the list is in 'documents'
                videos = response.get("documents", [])
                if not videos:
                    # Fallback if the key is different in the real response
                    videos = response.get("data", []) if isinstance(response.get("data"), list) else []

                # Find our specific video in the list
                target_video = next((v for v in videos if v.get("id") == job_id), None)
                
                if not target_video:
                    logger.warning(f"Video {job_id} not visible in library list yet. Waiting...")
                else:
                    status = target_video.get("status", "").upper()
                    logger.info(f"Current Job Status in Library: {status}")

                    if status in ["COMPLETED", "SUCCESS"]:
                        # SUCCESS! This object contains the same emotion data
                        logger.info(f"✅ Analysis complete via List Workaround!")
                        logger.info(f"✅ Raw Results: {target_video}")
                        return target_video 
                    
                    elif status in ["FAILED", "ERROR"]:
                        raise RuntimeError(f"Video analysis failed in Imentiv: {target_video}")

                # If not finished or not found, wait and try again
                logger.info(f"Waiting {interval} seconds for AI processing...")
                time.sleep(interval)

            except Exception as e:
                logger.error(f"Polling workaround failed: {e}")
                raise