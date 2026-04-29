"""
VoiceAI Python Agent — Production
Runs on the SIP VM (34.180.63.117)
Handles inbound calls via LiveKit SIP, connects to ElevenLabs Conversational AI

Flow:
  Inbound call → LiveKit SIP → room created → agent joins → ElevenLabs handles conversation
  Agent fetches config from backend API, starts/ends call lifecycle via internal API
"""

import asyncio
import logging
import os
import signal
import sys
from typing import Optional

import httpx
from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
    llm,
)
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import elevenlabs, silero

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("voiceai-agent")

API_BASE = os.getenv("API_BASE", "https://api.sterlingaiacademy.com")
INTERNAL_SECRET = os.getenv("INTERNAL_API_SECRET", "")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
LIVEKIT_URL = os.getenv("LIVEKIT_URL", "")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")

# ── Internal API helpers ────────────────────────────────────────────────────────

async def api_get(path: str) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            f"{API_BASE}{path}",
            headers={"x-internal-secret": INTERNAL_SECRET},
        )
        r.raise_for_status()
        return r.json()


async def api_post(path: str, data: dict = {}) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(
            f"{API_BASE}{path}",
            json=data,
            headers={"x-internal-secret": INTERNAL_SECRET},
        )
        r.raise_for_status()
        return r.json()


# ── Agent entrypoint ────────────────────────────────────────────────────────────

async def entrypoint(ctx: JobContext):
    """Called for each new inbound call room."""
    room_name = ctx.room.name
    logger.info(f"[{room_name}] Agent started")

    # Extract phone number from room name: "call-919876543210-<uuid>"
    parts = room_name.split("-")
    phone_number = f"+{parts[1]}" if len(parts) >= 2 else None

    if not phone_number:
        logger.error(f"[{room_name}] Cannot extract phone number from room name")
        return

    # Fetch agent config from backend
    try:
        config = await api_get(f"/api/internal/agent-config?phone={phone_number}")
        logger.info(f"[{room_name}] Loaded config for {config.get('business_name')}")
    except Exception as e:
        logger.error(f"[{room_name}] Failed to fetch agent config: {e}")
        return

    if config.get("client_status") != "active":
        logger.warning(f"[{room_name}] Client inactive, hanging up")
        return

    # Register call start in backend
    call_id: Optional[str] = None
    try:
        result = await api_post("/api/internal/calls/start", {
            "phone_number": phone_number,
            "caller_number": "unknown",  # LiveKit SIP metadata available via room metadata
            "room_name": room_name,
        })
        call_id = result.get("call_id")
        logger.info(f"[{room_name}] Call registered: {call_id}")
    except Exception as e:
        logger.error(f"[{room_name}] Failed to register call: {e}")

    # Connect to room
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Build ElevenLabs TTS
    tts = elevenlabs.TTS(
        api_key=ELEVENLABS_API_KEY,
        voice_id=config.get("voice_id", "21m00Tcm4TlvDq8ikWAM"),
        model="eleven_turbo_v2_5",
    )

    # Build VAD
    vad = silero.VAD.load()

    # Build system context
    system_prompt = config.get("system_prompt") or (
        f"You are a helpful AI assistant for {config.get('business_name', 'our business')}. "
        "Be polite, concise, and helpful. Answer in the language the caller uses."
    )
    first_message = config.get("first_message") or "Hello! How can I help you today?"

    initial_ctx = llm.ChatContext().append(
        role="system",
        text=system_prompt,
    )

    # Create and start voice pipeline
    agent = VoicePipelineAgent(
        vad=vad,
        stt=elevenlabs.STT(api_key=ELEVENLABS_API_KEY),
        llm=llm.LLM(),
        tts=tts,
        chat_ctx=initial_ctx,
    )

    agent.start(ctx.room)

    # Greet caller
    await agent.say(first_message, allow_interruptions=True)

    # Track conversation
    transcript_log = []

    @agent.on("user_speech_committed")
    def on_user_speech(msg):
        transcript_log.append({"role": "user", "text": msg.text})
        logger.debug(f"[{room_name}] User: {msg.text}")

    @agent.on("agent_speech_committed")
    def on_agent_speech(msg):
        transcript_log.append({"role": "agent", "text": msg.text})
        logger.debug(f"[{room_name}] Agent: {msg.text}")

    # Wait for room to close (call end)
    duration_seconds = 0
    try:
        start_time = asyncio.get_event_loop().time()
        await ctx.room.run_until_disconnected()
        duration_seconds = int(asyncio.get_event_loop().time() - start_time)
    except Exception as e:
        logger.error(f"[{room_name}] Room error: {e}")

    # Register call end in backend
    if call_id:
        try:
            await api_post(f"/api/internal/calls/{call_id}/end", {
                "duration_seconds": duration_seconds,
                "transcript": transcript_log,
            })
            logger.info(f"[{room_name}] Call ended: {duration_seconds}s, {len(transcript_log)} turns")
        except Exception as e:
            logger.error(f"[{room_name}] Failed to end call: {e}")


# ── Worker process ─────────────────────────────────────────────────────────────

def prewarm(proc: JobProcess):
    """Preload VAD model in worker process."""
    proc.userdata["vad"] = silero.VAD.load()


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            worker_type="room",
        ),
    )
