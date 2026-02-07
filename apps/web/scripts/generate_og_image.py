from PIL import Image
import os

def create_social_preview():
    # Configuration
    INPUT_PATH = r"c:\Users\rohan\Downloads\behavioral-interview-coach\apps\web\public\bic-logo.jpg"
    OUTPUT_PATH = r"c:\Users\rohan\Downloads\behavioral-interview-coach\apps\web\public\social-preview.jpg"
    CANVAS_SIZE = (1200, 630)
    BACKGROUND_COLOR = (255, 255, 255)  # White

    # Check if input file exists
    if not os.path.exists(INPUT_PATH):
        print(f"Error: Input file not found at {INPUT_PATH}")
        return

    try:
        # Open the logo image
        img = Image.open(INPUT_PATH)
        img = img.convert("RGBA")  # Ensure RGBA for transparency handling if any

        # Calculate resize dimensions maintaining aspect ratio
        img_ratio = img.width / img.height
        canvas_ratio = CANVAS_SIZE[0] / CANVAS_SIZE[1]

        if img_ratio > canvas_ratio:
            # Image is wider than canvas
            new_width = CANVAS_SIZE[0]
            new_height = int(new_width / img_ratio)
        else:
            # Image is taller than canvas
            new_height = CANVAS_SIZE[1]
            new_width = int(new_height * img_ratio)

        # Resize the logo
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Create the canvas
        canvas = Image.new("RGB", CANVAS_SIZE, BACKGROUND_COLOR)

        # Calculate position to center the image
        x = (CANVAS_SIZE[0] - new_width) // 2
        y = (CANVAS_SIZE[1] - new_height) // 2

        # Paste the logo onto the canvas
        # If the logo has transparency, use it as a mask
        if img.mode == 'RGBA':
            canvas.paste(img, (x, y), img)
        else:
            canvas.paste(img, (x, y))

        # Save the result
        canvas.save(OUTPUT_PATH, quality=95)
        print(f"Success: Social preview saved to {OUTPUT_PATH}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    create_social_preview()
