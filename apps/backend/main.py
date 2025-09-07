from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="AI Calendar Backend (dev)")


class EchoIn(BaseModel):
    message: str


class EchoOut(BaseModel):
    echoed: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/echo", response_model=EchoOut)
def echo(body: EchoIn):
    return {"echoed": body.message}
