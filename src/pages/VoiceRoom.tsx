import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, ArrowLeft, Users } from "lucide-react";

const SIGNAL_URL = "https://functions.poehali.dev/a421f016-770f-4911-8f49-bd333353573f";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

interface Participant {
  user_id: string;
  username: string;
}

const getUserId = () => {
  let id = localStorage.getItem("voxa_user_id");
  if (!id) {
    id = Math.random().toString(36).slice(2);
    localStorage.setItem("voxa_user_id", id);
  }
  return id;
};

const getUsername = () => {
  return localStorage.getItem("voxa_username") || "Пользователь";
};

const VoiceRoom = () => {
  const { room } = useParams<{ room: string }>();
  const navigate = useNavigate();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  const userId = useRef(getUserId());
  const username = useRef(getUsername());
  const localStream = useRef<MediaStream | null>(null);
  const peers = useRef<Record<string, RTCPeerConnection>>({});
  const audioElements = useRef<Record<string, HTMLAudioElement>>({});
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const api = useCallback(async (method: string, body?: object, query?: string) => {
    const url = query ? `${SIGNAL_URL}?${query}` : SIGNAL_URL;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }, []);

  const createPeer = useCallback((peerId: string, initiator: boolean, stream: MediaStream) => {
    if (peers.current[peerId]) return peers.current[peerId];

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peers.current[peerId] = pc;

    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        api("POST", {
          action: "signal",
          room,
          user_id: userId.current,
          to_id: peerId,
          signal: { type: "candidate", candidate: e.candidate },
        });
      }
    };

    pc.ontrack = (e) => {
      if (!audioElements.current[peerId]) {
        const audio = new Audio();
        audio.autoplay = true;
        audioElements.current[peerId] = audio;
      }
      audioElements.current[peerId].srcObject = e.streams[0];
    };

    if (initiator) {
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
        api("POST", {
          action: "signal",
          room,
          user_id: userId.current,
          to_id: peerId,
          signal: { type: "offer", sdp: offer },
        });
      });
    }

    return pc;
  }, [api, room]);

  const handleSignal = useCallback(async (fromId: string, signal: Record<string, unknown>, stream: MediaStream) => {
    if (signal.type === "offer") {
      const pc = createPeer(fromId, false, stream);
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      api("POST", {
        action: "signal",
        room,
        user_id: userId.current,
        to_id: fromId,
        signal: { type: "answer", sdp: answer },
      });
    } else if (signal.type === "answer") {
      const pc = peers.current[fromId];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    } else if (signal.type === "candidate") {
      const pc = peers.current[fromId];
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }
  }, [api, createPeer, room]);

  const join = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStream.current = stream;

      await api("POST", { action: "join", room, user_id: userId.current, username: username.current });
      setConnected(true);

      // Получаем текущих участников и создаём соединения
      const data = await api("GET", undefined, `action=participants&room=${room}`);
      setParticipants(data.participants || []);
      data.participants?.forEach((p: Participant) => {
        if (p.user_id !== userId.current) {
          createPeer(p.user_id, true, stream);
        }
      });

      // Опрос сигналов
      pollInterval.current = setInterval(async () => {
        const sigs = await api("GET", undefined, `action=signals&room=${room}&user_id=${userId.current}`);
        for (const s of sigs.signals || []) {
          if (localStream.current) await handleSignal(s.from_id, s.signal, localStream.current);
        }
        // Обновляем список участников
        const pd = await api("GET", undefined, `action=participants&room=${room}`);
        setParticipants(pd.participants || []);
        // Создаём соединения с новыми участниками
        pd.participants?.forEach((p: Participant) => {
          if (p.user_id !== userId.current && !peers.current[p.user_id] && localStream.current) {
            createPeer(p.user_id, true, localStream.current);
          }
        });
      }, 2000);

      // Heartbeat
      heartbeatInterval.current = setInterval(() => {
        api("POST", { action: "heartbeat", room, user_id: userId.current });
      }, 10000);

    } catch {
      setError("Нет доступа к микрофону. Разрешите доступ в настройках браузера.");
    }
  }, [api, room, createPeer, handleSignal]);

  const leave = useCallback(async () => {
    if (pollInterval.current) clearInterval(pollInterval.current);
    if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
    Object.values(peers.current).forEach((pc) => pc.close());
    peers.current = {};
    Object.values(audioElements.current).forEach((a) => { a.srcObject = null; });
    audioElements.current = {};
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    await api("POST", { action: "leave", room, user_id: userId.current });
    navigate(-1);
  }, [api, room, navigate]);

  useEffect(() => {
    join();
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
      Object.values(peers.current).forEach((pc) => pc.close());
      localStream.current?.getTracks().forEach((t) => t.stop());
      api("POST", { action: "leave", room, user_id: userId.current });
    };
  }, []);

  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((t) => (t.enabled = muted));
      setMuted(!muted);
    }
  };

  const toggleDeafen = () => {
    Object.values(audioElements.current).forEach((a) => (a.muted = !deafened));
    setDeafened(!deafened);
  };

  return (
    <div className="min-h-screen bg-[#36393f] text-white flex flex-col">
      {/* Шапка */}
      <nav className="bg-[#2f3136] border-b border-[#202225] px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" className="text-[#b9bbbe] hover:text-white p-2" onClick={leave}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-8 h-8 bg-[#3ba55c] rounded-full flex items-center justify-center">
          <Mic className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-white font-semibold">{room}</div>
          <div className="text-[#b9bbbe] text-xs">Голосовая комната · Voxa</div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-[#b9bbbe] text-sm">
          <Users className="w-4 h-4" />
          <span>{participants.length}</span>
        </div>
      </nav>

      {/* Основное */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {error ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-[#ed4245] rounded-full flex items-center justify-center mx-auto mb-4">
              <MicOff className="w-8 h-8 text-white" />
            </div>
            <p className="text-[#ed4245] font-semibold mb-2">Ошибка доступа</p>
            <p className="text-[#b9bbbe] text-sm max-w-xs text-center">{error}</p>
            <Button onClick={() => navigate(-1)} className="mt-4 bg-[#4f545c] hover:bg-[#5d6269] text-white">
              Вернуться назад
            </Button>
          </div>
        ) : (
          <>
            {/* Участники */}
            <div className="w-full max-w-lg mb-8">
              <h2 className="text-[#8e9297] text-xs font-semibold uppercase tracking-wide mb-4 text-center">
                Участники — {participants.length}
              </h2>
              <div className="flex flex-wrap gap-4 justify-center">
                {/* Текущий пользователь */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`relative w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-[#5865f2] to-[#7c3aed] ${!muted ? "ring-2 ring-[#3ba55c]" : ""}`}>
                    <span className="text-white text-xl font-bold">
                      {username.current.charAt(0).toUpperCase()}
                    </span>
                    {muted && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#ed4245] rounded-full flex items-center justify-center border-2 border-[#36393f]">
                        <MicOff className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <span className="text-white text-sm font-medium">Вы</span>
                </div>

                {/* Другие участники */}
                {participants
                  .filter((p) => p.user_id !== userId.current)
                  .map((p, i) => {
                    const colors = [
                      "from-purple-500 to-pink-500",
                      "from-green-500 to-blue-500",
                      "from-orange-500 to-red-500",
                      "from-cyan-500 to-blue-500",
                    ];
                    return (
                      <div key={p.user_id} className="flex flex-col items-center gap-2">
                        <div className={`relative w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br ${colors[i % colors.length]} ring-2 ring-[#3ba55c]`}>
                          <span className="text-white text-xl font-bold">
                            {p.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-white text-sm font-medium truncate max-w-[80px] text-center">{p.username}</span>
                      </div>
                    );
                  })}

                {participants.filter((p) => p.user_id !== userId.current).length === 0 && connected && (
                  <p className="text-[#72767d] text-sm mt-2">Пока никого нет. Пригласи друзей!</p>
                )}
              </div>
            </div>

            {/* Статус подключения */}
            <div className="mb-6 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? "bg-[#3ba55c] animate-pulse" : "bg-[#faa61a] animate-pulse"}`} />
              <span className="text-[#b9bbbe] text-sm">{connected ? "Подключено" : "Подключение..."}</span>
            </div>

            {/* Кнопки управления */}
            <div className="flex items-center gap-4">
              <button
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  muted ? "bg-[#ed4245] hover:bg-[#c03537]" : "bg-[#4f545c] hover:bg-[#5d6269]"
                }`}
                title={muted ? "Включить микрофон" : "Выключить микрофон"}
              >
                {muted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
              </button>

              <button
                onClick={leave}
                className="w-14 h-14 rounded-full bg-[#ed4245] hover:bg-[#c03537] flex items-center justify-center transition-colors"
                title="Покинуть комнату"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>

              <button
                onClick={toggleDeafen}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  deafened ? "bg-[#ed4245] hover:bg-[#c03537]" : "bg-[#4f545c] hover:bg-[#5d6269]"
                }`}
                title={deafened ? "Включить звук" : "Выключить звук"}
              >
                {deafened ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
              </button>
            </div>

            <p className="text-[#72767d] text-xs mt-4">
              {muted ? "Микрофон выключен" : "Микрофон включён"} · {deafened ? "Звук выключен" : "Звук включён"}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default VoiceRoom;