from fastapi import APIRouter
from database import agency_collection

router = APIRouter()

INITIAL_AGENCIES = [
    {
        "name": "층간소음 이웃사이센터",
        "phone": "1661-2642",
        "url": "https://floor.noiseinfo.or.kr",
        "category": "상담/신고"
    }
]

@router.on_event("startup")
async def init_agencies():
    count = await agency_collection.count_documents({})
    if count == 0:
        await agency_collection.insert_many(INITIAL_AGENCIES)

@router.get("/")
async def get_agencies():
    agencies = []
    async for agency in agency_collection.find({}, {"_id": 0}):
        agencies.append(agency)
    return {"agencies": agencies}