CREATE TABLE IF NOT EXISTS voice_participants (
    room TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL DEFAULT 'Аноним',
    joined_at DOUBLE PRECISION NOT NULL,
    PRIMARY KEY (room, user_id)
);

CREATE TABLE IF NOT EXISTS voice_signals (
    id SERIAL PRIMARY KEY,
    room TEXT NOT NULL,
    from_id TEXT NOT NULL,
    to_id TEXT NOT NULL,
    signal TEXT NOT NULL,
    created_at DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_voice_signals_room_to ON voice_signals(room, to_id);
