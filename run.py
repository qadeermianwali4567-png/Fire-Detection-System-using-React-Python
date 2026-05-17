import uvicorn
import os
import sys

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


if __name__ == "__main__":
    print("=" * 50)
    print("   Fire Detection System Starting...")
    print("=" * 50)
    print("URL: http://localhost:8000")
    print("Press CTRL+C to stop.")
    print("=" * 50)

    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )