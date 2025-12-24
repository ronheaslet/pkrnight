import { useState } from 'react'

export default function MessagesTab() {
  const [activeSubTab, setActiveSubTab] = useState('chat')
  const [message, setMessage] = useState('')

  const inboxMessages = [
    { id: 1, type: 'result', title: 'Game Results - Dec 21', preview: 'Jake T. wins! You finished 3rd ($40)', time: '2d ago', unread: false },
    { id: 2, type: 'rsvp', title: 'RSVP Confirmed', preview: "You're confirmed for Saturday Night Showdown", time: '3d ago', unread: false },
    { id: 3, type: 'announcement', title: 'Holiday Schedule', preview: 'No game on Christmas - see you Dec 28!', time: '5d ago', unread: false },
  ]

  const chatMessages = [
    { id: 1, sender: 'Mike D.', initials: 'MD', color: 'bg-chip-blue', message: "Who's bringing the beer this week?", time: '2:34 PM', isMe: false },
    { id: 2, sender: 'Jake T.', initials: 'JT', color: 'bg-chip-red', message: "I got it covered 🍺", time: '2:35 PM', isMe: false },
    { id: 3, sender: 'You', initials: 'RH', color: 'bg-gold text-felt-dark', message: "Nice! I'll bring some snacks", time: '2:38 PM', isMe: true },
    { id: 4, sender: 'Tommy C.', initials: 'TC', color: 'bg-green-600', message: "Can't wait to take all your chips 😈", time: '2:40 PM', isMe: false },
  ]

  const handleSend = () => {
    if (message.trim()) {
      // TODO: Send message
      setMessage('')
    }
  }

  return (
    <div className="px-4 py-4 flex flex-col h-[calc(100vh-140px)]">
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveSubTab('inbox')}
          className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium ${
            activeSubTab === 'inbox' ? 'bg-gold text-felt-dark' : 'bg-white/10 text-white/70'
          }`}
        >
          Inbox
        </button>
        <button
          onClick={() => setActiveSubTab('chat')}
          className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium ${
            activeSubTab === 'chat' ? 'bg-gold text-felt-dark' : 'bg-white/10 text-white/70'
          }`}
        >
          Group Chat
        </button>
      </div>

      {/* Inbox */}
      {activeSubTab === 'inbox' && (
        <div className="space-y-2">
          {inboxMessages.map(msg => (
            <div key={msg.id} className="card">
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-sm">{msg.title}</span>
                <span className="text-xs text-white/40">{msg.time}</span>
              </div>
              <p className="text-sm text-white/60">{msg.preview}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chat */}
      {activeSubTab === 'chat' && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            {chatMessages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.isMe ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full ${msg.color} flex-shrink-0 flex items-center justify-center text-xs font-semibold`}>
                  {msg.initials}
                </div>
                <div className={`max-w-[75%] ${msg.isMe ? 'text-right' : ''}`}>
                  <div className="text-xs text-white/40 mb-1">
                    {msg.sender} • {msg.time}
                  </div>
                  <div className={`inline-block px-4 py-2 rounded-2xl text-sm ${
                    msg.isMe
                      ? 'bg-gold text-felt-dark rounded-tr-sm'
                      : 'bg-white/10 text-white rounded-tl-sm'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="input flex-1"
            />
            <button onClick={handleSend} className="btn btn-primary px-4">
              ➤
            </button>
          </div>
        </>
      )}
    </div>
  )
}
