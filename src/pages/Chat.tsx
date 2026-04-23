import { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  Mic,
  Settings,
  Hash,
  ArrowRight,
  Bell,
  Users,
  Search,
  Menu,
  X,
  Send,
  Phone,
  Video,
  Smile,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";

interface Message {
  id: number;
  author: string;
  avatar: string;
  color: string;
  text: string;
  time: string;
}

const CHANNELS = ["общий", "новости", "знакомства", "поддержка"];
const VOICE_ROOMS = ["Общий звонок", "Личная беседа"];

const USERS = [
  { name: "Мария", status: "В сети", avatar: "М", color: "from-purple-500 to-pink-500" },
  { name: "Иван", status: "В сети", avatar: "И", color: "from-green-500 to-blue-500" },
  { name: "Алексей", status: "В сети", avatar: "А", color: "from-blue-500 to-purple-500" },
];

const INITIAL_MESSAGES: Record<string, Message[]> = {
  "общий": [
    { id: 1, author: "Мария", avatar: "М", color: "from-purple-500 to-pink-500", text: "Привет всем! 👋", time: "12:00" },
    { id: 2, author: "Иван", avatar: "И", color: "from-green-500 to-blue-500", text: "Привет! Как дела?", time: "12:01" },
    { id: 3, author: "Алексей", avatar: "А", color: "from-blue-500 to-purple-500", text: "Отличный чат! Рад здесь быть 😊", time: "12:02" },
  ],
  "новости": [
    { id: 1, author: "Voxa", avatar: "V", color: "from-[#5865f2] to-[#7c3aed]", text: "📢 Добро пожаловать в канал новостей! Здесь публикуются все обновления.", time: "10:00" },
    { id: 2, author: "Алексей", avatar: "А", color: "from-blue-500 to-purple-500", text: "Ждём новых обновлений! 🚀", time: "10:05" },
  ],
  "знакомства": [
    { id: 1, author: "Voxa", avatar: "V", color: "from-[#5865f2] to-[#7c3aed]", text: "👋 Познакомься с новыми людьми! Расскажи о себе.", time: "09:00" },
    { id: 2, author: "Мария", avatar: "М", color: "from-purple-500 to-pink-500", text: "Привет! Я Мария, люблю путешествия и фотографию 📸", time: "09:10" },
    { id: 3, author: "Иван", avatar: "И", color: "from-green-500 to-blue-500", text: "Привет всем! Я Иван, программист из Москвы 💻", time: "09:15" },
  ],
  "поддержка": [
    { id: 1, author: "Voxa", avatar: "V", color: "from-[#5865f2] to-[#7c3aed]", text: "🛠 Нужна помощь? Напиши сюда — мы всегда поможем!", time: "08:00" },
    { id: 2, author: "Алексей", avatar: "А", color: "from-blue-500 to-purple-500", text: "Как изменить аватарку?", time: "08:30" },
    { id: 3, author: "Voxa", avatar: "V", color: "from-[#5865f2] to-[#7c3aed]", text: "Зайди в настройки профиля и нажми на аватарку 👆", time: "08:31" },
  ],
};

const Chat = () => {
  const [channelMessages, setChannelMessages] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { channel } = useParams();
  const activeChannel = CHANNELS.includes(channel ?? "") ? (channel ?? "общий") : "общий";

  const messages = channelMessages[activeChannel] ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
    setChannelMessages((prev) => ({
      ...prev,
      [activeChannel]: [
        ...(prev[activeChannel] ?? []),
        { id: Date.now(), author: "Вы", avatar: "В", color: "from-[#5865f2] to-[#7c3aed]", text, time },
      ],
    }));
    setInput("");
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-[#36393f] text-white overflow-x-hidden flex flex-col">
      {/* Навигация */}
      <nav className="bg-[#2f3136] border-b border-[#202225] px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#5865f2] rounded-full flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white">Voxa</span>
        </div>
        <Button
          variant="ghost"
          className="text-[#b9bbbe] hover:text-white hover:bg-[#40444b] text-sm"
          onClick={() => navigate("/")}
        >
          ← На главную
        </Button>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Боковая панель серверов */}
        <div className="hidden lg:flex w-[72px] bg-[#202225] flex-col items-center py-3 gap-2 flex-shrink-0">
          <div className="w-12 h-12 bg-[#5865f2] rounded-2xl flex items-center justify-center cursor-pointer">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Боковая панель каналов */}
        <div className="flex w-36 sm:w-48 lg:w-60 bg-[#2f3136] flex-col flex-shrink-0">
          <div className="p-4 border-b border-[#202225] flex items-center justify-between">
            <h2 className="text-white font-semibold text-base">Voxa</h2>
            <Button
              variant="ghost"
              className="lg:hidden text-[#b9bbbe] hover:text-white hover:bg-[#40444b] p-1"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 p-2 overflow-y-auto">
            <div className="mb-4">
              <div className="flex items-center gap-1 px-2 py-1 text-[#8e9297] text-xs font-semibold uppercase tracking-wide">
                <ArrowRight className="w-3 h-3" />
                <span>Чаты</span>
              </div>
              <div className="mt-1 space-y-0.5">
                {CHANNELS.map((channel) => (
                  <div
                    key={channel}
                    onClick={() => { navigate(`/chat/${channel}`); setMobileSidebarOpen(false); }}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                      activeChannel === channel
                        ? "bg-[#393c43] text-white"
                        : "text-[#8e9297] hover:text-[#dcddde] hover:bg-[#393c43]"
                    }`}
                  >
                    <Hash className="w-4 h-4" />
                    <span className="text-sm">{channel}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 px-2 py-1 text-[#8e9297] text-xs font-semibold uppercase tracking-wide">
                <ArrowRight className="w-3 h-3" />
                <span>Голосовые комнаты</span>
              </div>
              <div className="mt-1 space-y-0.5">
                {VOICE_ROOMS.map((room) => (
                  <div
                    key={room}
                    onClick={() => navigate(`/voice/${encodeURIComponent(room)}`)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[#8e9297] hover:text-[#3ba55c] hover:bg-[#393c43] cursor-pointer transition-colors"
                  >
                    <Mic className="w-4 h-4" />
                    <span className="text-sm">{room}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Пользователь */}
          <div className="p-2 bg-[#292b2f] flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-[#5865f2] rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">В</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium">Вы</div>
              <div className="text-[#b9bbbe] text-xs">В сети</div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0 hover:bg-[#40444b]">
                <Mic className="w-4 h-4 text-[#b9bbbe]" />
              </Button>
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0 hover:bg-[#40444b]">
                <Settings className="w-4 h-4 text-[#b9bbbe]" />
              </Button>
            </div>
          </div>
        </div>

        {/* Основная область чата */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Заголовок */}
          <div className="h-12 bg-[#36393f] border-b border-[#202225] flex items-center px-4 gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              className="lg:hidden text-[#8e9297] hover:text-[#dcddde] hover:bg-[#40444b] p-1 mr-1"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <Hash className="w-5 h-5 text-[#8e9297]" />
            <span className="text-white font-semibold">{activeChannel}</span>
            <div className="ml-auto flex items-center gap-3">
              <Phone className="w-5 h-5 text-[#b9bbbe] cursor-pointer hover:text-[#dcddde]" />
              <Video className="w-5 h-5 text-[#b9bbbe] cursor-pointer hover:text-[#dcddde]" />
              <Bell className="w-5 h-5 text-[#b9bbbe] cursor-pointer hover:text-[#dcddde]" />
              <Users className="w-5 h-5 text-[#b9bbbe] cursor-pointer hover:text-[#dcddde]" />
              <Search className="w-5 h-5 text-[#b9bbbe] cursor-pointer hover:text-[#dcddde]" />
            </div>
          </div>

          {/* Список сообщений */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                <div className={`w-10 h-10 bg-gradient-to-r ${msg.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white text-sm font-medium">{msg.avatar}</span>
                </div>
                <div>
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-white font-medium text-sm">{msg.author}</span>
                    <span className="text-[#72767d] text-xs">{msg.time}</span>
                  </div>
                  <div className="text-[#dcddde] text-sm">{msg.text}</div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Поле ввода */}
          <div className="p-4 flex-shrink-0">
            <div className="bg-[#40444b] rounded-lg flex items-center gap-2 px-4 py-2">
              <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent text-[#b9bbbe] hover:text-white">
                <Paperclip className="w-5 h-5" />
              </Button>
              <input
                className="flex-1 bg-transparent text-[#dcddde] placeholder-[#72767d] text-sm outline-none"
                placeholder={`Написать в #${activeChannel}...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
              />
              <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent text-[#b9bbbe] hover:text-white">
                <Smile className="w-5 h-5" />
              </Button>
              <Button
                size="sm"
                className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-3 py-1.5 rounded"
                onClick={sendMessage}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Список участников */}
        <div className="hidden xl:flex w-60 bg-[#2f3136] flex-col p-4 flex-shrink-0">
          <h3 className="text-[#8e9297] text-xs font-semibold uppercase tracking-wide mb-3">В сети — {USERS.length}</h3>
          <div className="space-y-2">
            {USERS.map((user, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded hover:bg-[#36393f] cursor-pointer">
                <div className={`w-8 h-8 bg-gradient-to-r ${user.color} rounded-full flex items-center justify-center relative`}>
                  <span className="text-white text-sm font-medium">{user.avatar}</span>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#3ba55c] border-2 border-[#2f3136] rounded-full"></div>
                </div>
                <div>
                  <div className="text-white text-sm font-medium">{user.name}</div>
                  <div className="text-[#b9bbbe] text-xs">{user.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;