import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useGameStore } from "../store/gameStore";
import api from "../lib/api";

interface ChatMessage {
  id: string;
  clubId: string;
  senderId: string;
  senderName: string;
  content: string;
  isAnnouncement: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

// Mock data
const MOCK_USER_ID = "mock-person-001";

const MOCK_MESSAGES: ChatMessage[] = [
  { id: "m1", clubId: "mock-club-001", senderId: "mock-person-002", senderName: "Mike T.", content: "Who's coming Friday?", isAnnouncement: false, isPinned: false, createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
  { id: "m2", clubId: "mock-club-001", senderId: MOCK_USER_ID, senderName: "Ron H.", content: "I'm in! Bringing extra chips too.", isAnnouncement: false, isPinned: false, createdAt: new Date(Date.now() - 2.9 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 2.9 * 60 * 60 * 1000).toISOString() },
  { id: "m3", clubId: "mock-club-001", senderId: "mock-person-003", senderName: "Sarah K.", content: "Count me in. Can we start at 7 instead of 8?", isAnnouncement: false, isPinned: false, createdAt: new Date(Date.now() - 2.8 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 2.8 * 60 * 60 * 1000).toISOString() },
  { id: "m4", clubId: "mock-club-001", senderId: "mock-person-002", senderName: "Mike T.", content: "7 works for me", isAnnouncement: false, isPinned: false, createdAt: new Date(Date.now() - 2.7 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 2.7 * 60 * 60 * 1000).toISOString() },
  { id: "m5", clubId: "mock-club-001", senderId: "mock-person-004", senderName: "Admin", content: "Reminder: New blind structure starts this week. Check the event details for the updated levels.", isAnnouncement: true, isPinned: true, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: "m6", clubId: "mock-club-001", senderId: MOCK_USER_ID, senderName: "Ron H.", content: "Sounds good. The new structure should speed things up.", isAnnouncement: false, isPinned: false, createdAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString() },
  { id: "m7", clubId: "mock-club-001", senderId: "mock-person-005", senderName: "Dave R.", content: "Can someone bring an extra deck? Mine got water damaged last week.", isAnnouncement: false, isPinned: false, createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
  { id: "m8", clubId: "mock-club-001", senderId: "mock-person-003", senderName: "Sarah K.", content: "I have extras, I'll bring two", isAnnouncement: false, isPinned: false, createdAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 55 * 60 * 1000).toISOString() },
  { id: "m9", clubId: "mock-club-001", senderId: "mock-person-004", senderName: "Admin", content: "Buy-in for Friday is $50 with one optional $25 rebuy. No add-ons this time.", isAnnouncement: true, isPinned: true, createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
  { id: "m10", clubId: "mock-club-001", senderId: "mock-person-002", senderName: "Mike T.", content: "Perfect. See everyone Friday!", isAnnouncement: false, isPinned: false, createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString() },
  { id: "m11", clubId: "mock-club-001", senderId: MOCK_USER_ID, senderName: "Ron H.", content: "Let's goooo \uD83D\uDE80", isAnnouncement: false, isPinned: false, createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
  { id: "m12", clubId: "mock-club-001", senderId: "mock-person-005", senderName: "Dave R.", content: "Anyone want to carpool from the north side?", isAnnouncement: false, isPinned: false, createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
];

function getAvatarColor(name: string): string {
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function shouldShowTimestamp(current: string, previous: string | null): boolean {
  if (!previous) return true;
  const diff = new Date(current).getTime() - new Date(previous).getTime();
  return diff > 15 * 60 * 1000; // 15 minutes
}

export default function Chat() {
  const { clubId } = useParams<{ clubId: string }>();
  const currentUser = useGameStore((s) => s.currentUser);
  const currentClub = useGameStore((s) => s.currentClub);
  const primaryColor = currentClub?.primaryColor || "#22c55e";

  const isOwnerOrAdmin =
    currentUser?.isSuperAdmin ||
    currentUser?.roles.includes("OWNER") ||
    currentUser?.roles.includes("ADMIN");

  const userId = currentUser?.userId || MOCK_USER_ID;

  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const [showAnnouncementOption, setShowAnnouncementOption] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pinnedMessages = messages.filter((m) => m.isPinned);

  // Scroll to bottom on mount and new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Polling for new messages
  useEffect(() => {
    if (!clubId) return;
    let visible = true;

    const handleVisibility = () => {
      visible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const interval = setInterval(async () => {
      if (!visible) return;
      try {
        const newest = messages[messages.length - 1]?.createdAt;
        const res = await api.get(`/clubs/${clubId}/chat?after=${encodeURIComponent(newest || "")}&limit=50`);
        if (res.data && res.data.length > 0) {
          setMessages((prev) => [...prev, ...res.data]);
        }
      } catch {
        // keep existing messages on poll failure
      }
    }, 5_000);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [clubId, messages]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (data: { content: string; isAnnouncement: boolean }) =>
      api.post(`/clubs/${clubId}/chat`, data),
  });

  // Edit message mutation
  const editMutation = useMutation({
    mutationFn: (data: { messageId: string; content: string }) =>
      api.patch(`/clubs/${clubId}/chat/${data.messageId}`, { content: data.content }),
  });

  // Delete message mutation
  const deleteMutation = useMutation({
    mutationFn: (messageId: string) => api.delete(`/clubs/${clubId}/chat/${messageId}`),
  });

  // Pin message mutation
  const pinMutation = useMutation({
    mutationFn: (data: { messageId: string; isPinned: boolean }) =>
      api.patch(`/clubs/${clubId}/chat/${data.messageId}`, { isPinned: data.isPinned }),
  });

  const handleSend = (asAnnouncement = false) => {
    if (!inputText.trim()) return;

    const newMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      clubId: clubId || "",
      senderId: userId,
      senderName: "You",
      content: inputText.trim(),
      isAnnouncement: asAnnouncement,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText("");
    setShowAnnouncementOption(false);
    sendMutation.mutate({ content: newMessage.content, isAnnouncement: asAnnouncement });
    setTimeout(scrollToBottom, 50);
  };

  const handleEdit = (messageId: string) => {
    if (!editText.trim()) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, content: editText.trim(), updatedAt: new Date().toISOString() } : m
      )
    );
    setEditingId(null);
    editMutation.mutate({ messageId, content: editText.trim() });
  };

  const handleDelete = (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setContextMenuId(null);
    deleteMutation.mutate(messageId);
  };

  const handlePin = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isPinned: !m.isPinned } : m))
    );
    setContextMenuId(null);
    const msg = messages.find((m) => m.id === messageId);
    pinMutation.mutate({ messageId, isPinned: !(msg?.isPinned) });
  };

  const handleMakeAnnouncement = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isAnnouncement: true } : m))
    );
    setContextMenuId(null);
    editMutation.mutate({ messageId, content: messages.find((m) => m.id === messageId)?.content || "" });
  };

  const scrollToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedId(messageId);
      setTimeout(() => setHighlightedId(null), 2000);
    }
  };

  // Long press handlers for messages
  const handleMessageLongPressStart = (messageId: string) => {
    longPressTimer.current = setTimeout(() => {
      setContextMenuId(messageId);
    }, 500);
  };

  const handleMessageLongPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  // Long press handler for send button
  const handleSendLongPressStart = () => {
    sendLongPressTimer.current = setTimeout(() => {
      setShowAnnouncementOption(true);
    }, 500);
  };

  const handleSendLongPressEnd = () => {
    if (sendLongPressTimer.current) clearTimeout(sendLongPressTimer.current);
  };

  return (
    <div className="h-screen bg-[#0f0f0f] text-white flex flex-col">
      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex-shrink-0">
        <h1 className="text-xl font-bold">
          {currentClub?.name || "Club"} Chat
        </h1>
      </div>

      {/* Pinned Messages Strip */}
      {pinnedMessages.length > 0 && (
        <div className="flex-shrink-0 px-5 pb-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {pinnedMessages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => scrollToMessage(msg.id)}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-[#2a2a1a] border border-yellow-600/30 rounded-full text-xs max-w-[280px]"
              >
                <span>{"\uD83D\uDCCC"}</span>
                <span className="truncate text-[#e5e5e5]">
                  {msg.content.slice(0, 50)}
                </span>
                <span className="text-[#6b7280] flex-shrink-0">
                  — {msg.senderName}
                </span>
                {isOwnerOrAdmin && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePin(msg.id);
                    }}
                    className="text-[#6b7280] hover:text-white ml-1 flex-shrink-0"
                  >
                    {"\u2715"}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message List */}
      <div
        ref={messageListRef}
        className="flex-1 overflow-y-auto px-5 pb-4 space-y-1"
      >
        {messages.map((msg, i) => {
          const isOwnMessage = msg.senderId === userId;
          const prevMsg = i > 0 ? messages[i - 1] : null;
          const showTime = shouldShowTimestamp(msg.createdAt, prevMsg?.createdAt ?? null);
          const isHighlighted = highlightedId === msg.id;

          return (
            <div key={msg.id} id={`msg-${msg.id}`}>
              {/* Timestamp separator */}
              {showTime && (
                <div className="text-center my-3">
                  <span className="text-[10px] text-[#6b7280] bg-[#1a1a1a] px-3 py-1 rounded-full">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              )}

              {/* Announcement message */}
              {msg.isAnnouncement ? (
                <div
                  className={`w-full px-4 py-3 rounded-xl my-2 transition-colors ${
                    isHighlighted ? "ring-2 ring-yellow-500" : ""
                  }`}
                  style={{ backgroundColor: "#1a3a1a" }}
                  onTouchStart={() => handleMessageLongPressStart(msg.id)}
                  onTouchEnd={handleMessageLongPressEnd}
                  onMouseDown={() => handleMessageLongPressStart(msg.id)}
                  onMouseUp={handleMessageLongPressEnd}
                  onMouseLeave={handleMessageLongPressEnd}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sm flex-shrink-0">{"\uD83D\uDCE2"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-green-400 font-medium mb-1">
                        {msg.senderName}
                      </p>
                      <p className="text-sm italic text-[#d1d5db]">{msg.content}</p>
                    </div>
                  </div>
                </div>
              ) : isOwnMessage ? (
                /* Own message — right aligned */
                <div
                  className={`flex justify-end my-1 ${isHighlighted ? "ring-2 ring-yellow-500 rounded-xl" : ""}`}
                  onTouchStart={() => handleMessageLongPressStart(msg.id)}
                  onTouchEnd={handleMessageLongPressEnd}
                  onMouseDown={() => handleMessageLongPressStart(msg.id)}
                  onMouseUp={handleMessageLongPressEnd}
                  onMouseLeave={handleMessageLongPressEnd}
                >
                  {editingId === msg.id ? (
                    <div className="max-w-[75%] w-full">
                      <input
                        className="w-full px-3 py-2 bg-[#1a1a1a] rounded-xl text-sm border border-[#374151] focus:border-green-500 focus:outline-none"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEdit(msg.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2 mt-1 justify-end">
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-[#6b7280] px-2 py-1"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleEdit(msg.id)}
                          className="text-xs text-white px-2 py-1 rounded"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="max-w-[75%] px-3 py-2 rounded-2xl rounded-br-sm text-sm"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {msg.content}
                    </div>
                  )}
                </div>
              ) : (
                /* Other person's message — left aligned */
                <div
                  className={`flex items-start gap-2 my-1 ${isHighlighted ? "ring-2 ring-yellow-500 rounded-xl" : ""}`}
                  onTouchStart={() => handleMessageLongPressStart(msg.id)}
                  onTouchEnd={handleMessageLongPressEnd}
                  onMouseDown={() => handleMessageLongPressStart(msg.id)}
                  onMouseUp={handleMessageLongPressEnd}
                  onMouseLeave={handleMessageLongPressEnd}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: getAvatarColor(msg.senderName) }}
                  >
                    {msg.senderName.charAt(0).toUpperCase()}
                  </div>
                  <div className="max-w-[75%]">
                    <p className="text-[10px] text-[#9ca3af] mb-0.5 ml-1">
                      {msg.senderName}
                    </p>
                    <div className="px-3 py-2 bg-[#1a1a1a] rounded-2xl rounded-bl-sm text-sm">
                      {msg.content}
                    </div>
                  </div>
                </div>
              )}

              {/* Context Menu */}
              {contextMenuId === msg.id && (
                <div className="fixed inset-0 z-50" onClick={() => setContextMenuId(null)}>
                  <div className="fixed inset-0 bg-black/40" />
                  <div className="absolute bottom-0 left-0 right-0 bg-[#1a1a1a] rounded-t-2xl p-4 space-y-1">
                    <div className="flex justify-center pb-2">
                      <div className="w-10 h-1 bg-white/30 rounded-full" />
                    </div>
                    {isOwnMessage ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(msg.id);
                            setEditText(msg.content);
                            setContextMenuId(null);
                          }}
                          className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/10 text-sm"
                        >
                          {"\u270F\uFE0F"} Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(msg.id);
                          }}
                          className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/10 text-sm text-red-400"
                        >
                          {"\uD83D\uDDD1\uFE0F"} Delete
                        </button>
                      </>
                    ) : isOwnerOrAdmin ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePin(msg.id);
                          }}
                          className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/10 text-sm"
                        >
                          {"\uD83D\uDCCC"} {msg.isPinned ? "Unpin" : "Pin"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMakeAnnouncement(msg.id);
                          }}
                          className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/10 text-sm"
                        >
                          {"\uD83D\uDCE2"} Make Announcement
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(msg.id);
                          }}
                          className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/10 text-sm text-red-400"
                        >
                          {"\uD83D\uDDD1\uFE0F"} Delete
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Announcement option popup */}
      {showAnnouncementOption && (
        <div className="px-5 pb-2 flex-shrink-0">
          <button
            onClick={() => handleSend(true)}
            className="w-full px-4 py-2.5 bg-[#1a3a1a] border border-green-600/40 rounded-xl text-sm text-green-400 font-medium hover:bg-green-900/50 transition-colors"
          >
            {"\uD83D\uDCE2"} Send as Announcement
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div
        className="flex-shrink-0 px-5 pb-4 pt-2 bg-[#0f0f0f] border-t border-[#2a2a2a]"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-2 pb-16">
          <input
            type="text"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setShowAnnouncementOption(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(false);
              }
            }}
            placeholder="Message..."
            className="flex-1 px-4 py-2.5 bg-[#1a1a1a] rounded-full text-sm border border-[#374151] focus:border-green-500 focus:outline-none placeholder-[#6b7280]"
          />
          <button
            onClick={() => handleSend(false)}
            onTouchStart={handleSendLongPressStart}
            onTouchEnd={() => {
              handleSendLongPressEnd();
              if (!showAnnouncementOption) handleSend(false);
            }}
            onMouseDown={handleSendLongPressStart}
            onMouseUp={handleSendLongPressEnd}
            disabled={!inputText.trim()}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-30"
            style={{ backgroundColor: inputText.trim() ? primaryColor : "#374151" }}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
