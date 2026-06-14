from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os, base64
from dotenv import load_dotenv
from agent.graph import run_agent, run_weekly_agent, run_vision_agent
from api.expenses import router as expenses_router
from api.meals import router as meals_router
from api.preferences import router as preferences_router

load_dotenv()

app = FastAPI(title="Sous Chef API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(expenses_router, prefix="/api/expenses")
app.include_router(meals_router, prefix="/api/meals")
app.include_router(preferences_router, prefix="/api/preferences")

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    voice: Optional[bool] = False

class ChatResponse(BaseModel):
    response: str
    shopping_list: Optional[list] = None
    meal_plan: Optional[dict] = None
    bill_amount: Optional[float] = None
    bill_platform: Optional[str] = None

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        result = await run_agent([m.dict() for m in request.messages])
        return ChatResponse(
            response=result["response"],
            shopping_list=result.get("shopping_list"),
            meal_plan=result.get("meal_plan"),
        )
    except Exception as e:
        import traceback
        print("CHAT ERROR:", str(e))
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scan-bill", response_model=ChatResponse)
async def scan_bill(images: List[UploadFile] = File(...)):
    try:
        results = []
        for image in images:
            contents = await image.read()
            image_b64 = base64.b64encode(contents).decode()
            image_type = image.content_type or "image/jpeg"
            result = await run_vision_agent(image_b64, image_type)
            results.append(result)

        total = sum(r.get("bill_amount", 0) or 0 for r in results)
        failed = sum(1 for r in results if not r.get("bill_amount"))
        platform = next((r["bill_platform"] for r in results if r.get("bill_platform")), "")
        n = len(images)

        if n == 1:
            return ChatResponse(**results[0])

        if failed == n:
            msg = "Couldn't read any of those photos — try clearer, well-lit shots!"
        else:
            scanned = n - failed
            note = f" ({failed} photo{'s' if failed > 1 else ''} unreadable)" if failed else ""
            msg = f"Scanned {scanned}/{n} photos — logged ₹{total:,.0f} total{note}. Added to this month's spend ✅"

        return ChatResponse(response=msg, bill_amount=total, bill_platform=platform)
    except Exception as e:
        import traceback
        print("SCAN BILL ERROR:", str(e))
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/weekly-plan")
async def weekly_plan():
    """
    Called every Friday by Railway cron job.
    LLM plans next week and sends email to Supriya + Vivek.
    """
    try:
        result = await run_weekly_agent()
        return result
    except Exception as e:
        import traceback
        print("WEEKLY PLAN ERROR:", str(e))
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok", "agent": "Sous Chef v2", "build": "rings-2"}