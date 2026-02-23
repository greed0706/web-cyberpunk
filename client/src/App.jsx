import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3003');

const getColor = (name) => {
    const colors = ['#00fff7', '#ff00ff', '#7fff00', '#ff6b00', '#00bfff', '#ff1493'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return colors[Math.abs(h) % colors.length];
};
const initials = (n) => n.slice(0, 2).toUpperCase();

function App() {
    const [username, setUsername] = useState('');
    const [joined, setJoined] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUser, setTypingUser] = useState(null);
    const [glitch, setGlitch] = useState(false);
    const endRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    useEffect(() => {
        socket.on('new_message', (msg) => {
            setMessages((p) => [...p, msg]);
            setGlitch(true);
            setTimeout(() => setGlitch(false), 200);
        });
        socket.on('user_joined', (d) => {
            setOnlineUsers(d.users);
            setMessages((p) => [...p, { id: Date.now(), type: 'system', text: `⚡ ${d.username} đã kết nối` }]);
        });
        socket.on('user_left', (d) => {
            setOnlineUsers(d.users);
            if (d.username) setMessages((p) => [...p, { id: Date.now(), type: 'system', text: `💀 ${d.username} đã ngắt kết nối` }]);
        });
        socket.on('user_typing', ({ username: u, isTyping }) => setTypingUser(isTyping ? u : null));
        return () => { socket.off('new_message'); socket.off('user_joined'); socket.off('user_left'); socket.off('user_typing'); };
    }, []);

    const handleLogin = (e) => {
        e.preventDefault();
        if (username.trim()) { socket.emit('join', username.trim()); setJoined(true); }
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (input.trim()) { socket.emit('send_message', { text: input.trim() }); setInput(''); socket.emit('typing', false); }
    };

    const handleTyping = (e) => {
        setInput(e.target.value);
        socket.emit('typing', true);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => socket.emit('typing', false), 1000);
    };

    const fmt = (ts) => new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    if (!joined) {
        return (
            <div className="login-screen">
                <div className="scan-lines" />
                <div className="login-box">
                    <div className="cyber-logo">
                        <span className="logo-text">CYBER</span>
                        <span className="logo-text accent">CHAT</span>
                    </div>
                    <div className="cyber-line" />
                    <p className="login-tagline">&gt; INITIALIZE CONNECTION_</p>
                    <form onSubmit={handleLogin}>
                        <div className="input-group">
                            <span className="input-prefix">&gt;_</span>
                            <input
                                className="login-input"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="ENTER CODENAME..."
                                autoFocus
                            />
                        </div>
                        <button type="submit" className="login-btn">
                            <span>[ CONNECT ]</span>
                        </button>
                    </form>
                    <p className="login-warning">⚠ SECURE CHANNEL ACTIVE</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`app ${glitch ? 'glitch' : ''}`}>
            <div className="scan-lines" />

            {/* Header */}
            <header className="top-bar">
                <div className="top-bar-left">
                    <span className="top-logo">CYBER<span className="accent">CHAT</span></span>
                    <div className="status-indicator">
                        <span className="status-dot" />
                        <span>CONNECTED</span>
                    </div>
                </div>
                <div className="top-bar-center">
                    <span className="channel-name">▸ #GENERAL_COMMS</span>
                </div>
                <div className="top-bar-right">
                    <span className="user-chip" style={{ borderColor: getColor(username) }}>
                        <span style={{ color: getColor(username) }}>{username.toUpperCase()}</span>
                    </span>
                    <span className="online-count">👥 {onlineUsers.length} ONLINE</span>
                </div>
            </header>

            <div className="main">
                {/* Users Panel */}
                <aside className="users-panel">
                    <div className="panel-title">// USERS_ONLINE</div>
                    {onlineUsers.map((u, i) => (
                        <div key={i} className="user-entry">
                            <div className="user-entry-dot" style={{ background: getColor(u) }} />
                            <div className="user-entry-avatar" style={{ color: getColor(u), borderColor: getColor(u) }}>
                                {initials(u)}
                            </div>
                            <div className="user-entry-name" style={{ color: getColor(u) }}>
                                {u === username ? `${u} [YOU]` : u}
                            </div>
                        </div>
                    ))}
                </aside>

                {/* Messages */}
                <div className="messages-area">
                    <div className="messages">
                        {messages.map(msg => {
                            if (msg.type === 'system') return (
                                <div key={msg.id} className="sys-msg">{msg.text}</div>
                            );
                            const isOwn = msg.username === username;
                            const color = getColor(msg.username);
                            return (
                                <div key={msg.id} className={`msg ${isOwn ? 'own' : 'other'}`}>
                                    <div className="msg-header">
                                        <span className="msg-sender" style={{ color }}>&gt; {msg.username.toUpperCase()}</span>
                                        <span className="msg-time">[{fmt(msg.timestamp)}]</span>
                                    </div>
                                    <div className="msg-bubble" style={{ borderLeftColor: color }}>
                                        {msg.text}
                                    </div>
                                </div>
                            );
                        })}

                        {typingUser && typingUser !== username && (
                            <div className="typing">
                                <div className="typing-dots"><span /><span /><span /></div>
                                <span style={{ color: getColor(typingUser) }}>&gt; {typingUser}: COMPOSING_</span>
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>

                    <form className="input-bar" onSubmit={handleSend}>
                        <span className="input-prefix">&gt;_</span>
                        <input
                            className="input-field"
                            value={input}
                            onChange={handleTyping}
                            placeholder="TYPE YOUR MESSAGE..."
                        />
                        <button type="submit" className="send-btn" disabled={!input.trim()}>
                            [ SEND ]
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default App;
