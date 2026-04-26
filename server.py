#!/usr/bin/env python3
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from curl_cffi import requests

app = FastAPI()

# Enable CORS for the chrome extension and chord-player app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
@app.post("/")
async def proxy_chordify(request: Request):
    if request.method == "GET":
        url = request.query_params.get("url")
    else:
        # The extension sends the URL as a plain string in the body
        body = await request.body()
        url = body.decode("utf-8")

    if not url:
        return {"error": "Missing URL"}

    print(f"Proxying request for: {url}")

    try:
        # Use curl_cffi with Chrome impersonation to bypass Cloudflare
        response = requests.get(
            url,
            timeout=30,
            impersonate="chrome120"
        )

        if response.status_code == 200:
            data = response.json()
            print(f"Success: {data.get('title', 'No title')}")
            return data
        else:
            print(f"Chordify returned {response.status_code}")
            return {"error": f"Chordify returned {response.status_code}"}

    except Exception as e:
        print(f"Error: {e}")
        return {"error": str(e)}

@app.post("/save")
async def save_song(request: Request):
    body = await request.body()
    url = body.decode("utf-8")
    print(f"Received song to save: {url}")

    with open("saved_songs.txt", "a") as f:
        f.write(url + "\n")

    return {"status": "saved"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5050)
