import base64
import os
from fastapi import FastAPI, UploadFile, Form, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import httpx
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/convert-docx")
async def convert_docx(
    file: UploadFile,
    geminiApiKey: str = Form(...),
    systemPrompt: str = Form(None)
):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    file_bytes = await file.read()
    base64_pdf = base64.b64encode(file_bytes).decode('utf-8')
    
    model = 'gemini-3.1-pro-preview'
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={geminiApiKey}"
    
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "inlineData": {
                            "mimeType": "application/pdf",
                            "data": base64_pdf
                        }
                    },
                    { "text": "Hãy phân tích đề thi trong file PDF này." }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 65536
        }
    }
    
    if systemPrompt:
        payload["systemInstruction"] = {
            "role": "system",
            "parts": [{"text": systemPrompt}]
        }
        
    async def stream_generator():
        async with httpx.AsyncClient() as client:
            async with client.stream('POST', url, json=payload, timeout=httpx.Timeout(300.0)) as response:
                if response.status_code != 200:
                    error_data = await response.aread()
                    error_text = error_data.decode('utf-8', errors='replace')
                    # Strip control characters that break JSON
                    error_text = error_text.replace('\n', ' ').replace('\r', ' ')
                    error_msg = f"API Error {response.status_code}: {error_text}"
                    error_json = json.dumps({"error": {"message": error_msg}})
                    yield f"data: {error_json}\n\n"
                    return
                
                async for chunk in response.aiter_bytes():
                    yield chunk

    return StreamingResponse(stream_generator(), media_type="text/event-stream")

# Mount frontend directory for static files
# Lấy thư mục hiện tại chứa file main.py
current_dir = os.path.dirname(os.path.abspath(__file__))
app.mount("/", StaticFiles(directory=current_dir, html=True), name="frontend")
