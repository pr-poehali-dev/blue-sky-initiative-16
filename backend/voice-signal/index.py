"""
Сигнальный сервер для WebRTC голосовых комнат.
Хранит список участников и передаёт SDP/ICE сигналы между пользователями.
"""
import json
import os
import time
import psycopg2

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod")
    params = event.get("queryStringParameters") or {}

    # GET — получить участников или сигналы
    if method == "GET":
        action = params.get("action")
        room = params.get("room", "")
        user_id = params.get("user_id", "")

        if action == "participants":
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM voice_participants WHERE joined_at < %s", (time.time() - 30,))
                    cur.execute("SELECT user_id, username FROM voice_participants WHERE room = %s", (room,))
                    rows = cur.fetchall()
            participants = [{"user_id": r[0], "username": r[1]} for r in rows]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"participants": participants})}

        if action == "signals":
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id, from_id, signal FROM voice_signals
                        WHERE room = %s AND to_id = %s ORDER BY created_at ASC
                    """, (room, user_id))
                    rows = cur.fetchall()
                    if rows:
                        ids = [r[0] for r in rows]
                        cur.execute("DELETE FROM voice_signals WHERE id = ANY(%s)", (ids,))
            signals = [{"from_id": r[1], "signal": json.loads(r[2])} for r in rows]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"signals": signals})}

        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "unknown action"})}

    # POST — действия
    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        action = body.get("action")
        room = body.get("room", "")
        user_id = body.get("user_id", "")

        if action == "join":
            username = body.get("username", "Аноним")
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO voice_participants (room, user_id, username, joined_at)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (room, user_id) DO UPDATE SET joined_at = %s, username = %s
                    """, (room, user_id, username, time.time(), time.time(), username))
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        if action == "leave":
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM voice_participants WHERE room = %s AND user_id = %s", (room, user_id))
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        if action == "heartbeat":
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("UPDATE voice_participants SET joined_at = %s WHERE room = %s AND user_id = %s",
                                (time.time(), room, user_id))
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        if action == "signal":
            to_id = body.get("to_id", "")
            signal = body.get("signal")
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO voice_signals (room, from_id, to_id, signal, created_at)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (room, user_id, to_id, json.dumps(signal), time.time()))
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "unknown action"})}

    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not found"})}
