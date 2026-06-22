import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Send, MessageSquare, Mail, Smartphone, Bot } from 'lucide-react';
import { showToast } from '../components/Toast';

const TONE_TEMPLATES: Record<string, (name: string) => string> = {
  Professional: (name) => `Dear ${name}, thank you for reaching out. We will review your request and respond shortly. Best regards, Crewline.`,
  Friendly: (name) => `Hey ${name}! Thanks for getting in touch. We're on it and will get back to you soon! 😊`,
  Casual: (name) => `Hi ${name}, got your message! We'll follow up soon.`,
};

export default function Messages() {
  const { messages, customers, addMessage, setMessages } = useApp();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>('c7');
  const [newMessage, setNewMessage] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'sms' | 'email' | 'app'>('all');
  const [search, setSearch] = useState('');
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [sendChannel, setSendChannel] = useState<'sms' | 'email' | 'app'>('sms');
  const [aiActive, setAiActive] = useState(true);

  const conversationCustomers = [...new Set(messages.map(m => m.customerId))];
  const customerList = conversationCustomers
    .map(cid => {
      const customer = customers.find(c => c.id === cid);
      const custMessages = messages.filter(m => m.customerId === cid);
      const lastMsg = custMessages[custMessages.length - 1];
      const unread = custMessages.filter(m => !m.read && m.direction === 'inbound').length;
      return { customer, lastMsg, unread };
    })
    .filter(c => c.customer)
    .filter(c => !search || `${c.customer!.firstName} ${c.customer!.lastName}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.lastMsg.timestamp).getTime() - new Date(a.lastMsg.timestamp).getTime());

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const conversation = messages
    .filter(m => m.customerId === selectedCustomerId)
    .filter(m => channelFilter === 'all' || m.channel === channelFilter)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const handleSelectConversation = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setMessages(prev => prev.map(m => m.customerId === customerId && m.direction === 'inbound' && !m.read ? { ...m, read: true } : m));
  };

  const handleSend = () => {
    if (!newMessage.trim() || !selectedCustomerId) return;
    addMessage({ id: `m${Date.now()}`, customerId: selectedCustomerId, direction: 'outbound', channel: sendChannel, content: newMessage, timestamp: new Date().toISOString(), read: true });
    setNewMessage('');
    setSelectedTone(null);
    showToast('success', `Message sent via ${sendChannel.toUpperCase()}`);
  };

  const handleToneClick = (tone: string) => {
    if (!selectedCustomer) return;
    if (selectedTone === tone) {
      setSelectedTone(null);
      setNewMessage('');
    } else {
      setSelectedTone(tone);
      setNewMessage(TONE_TEMPLATES[tone](selectedCustomer.firstName));
    }
  };

  const channelIcon = (channel: string) => {
    if (channel === 'sms') return <Smartphone size={12} />;
    if (channel === 'email') return <Mail size={12} />;
    return <MessageSquare size={12} />;
  };

  return (
    <div className="messages-page">
      <div className="page-header">
        <h1>Messages</h1>
        <div className="header-actions">
          <div className={`ai-receptionist-badge ${aiActive ? '' : 'inactive'}`} onClick={() => { setAiActive(!aiActive); showToast('info', aiActive ? 'AI Receptionist paused' : 'AI Receptionist activated'); }} style={{ cursor: 'pointer' }}>
            <Bot size={16} />
            <span>AI Receptionist: {aiActive ? 'Active' : 'Paused'}</span>
          </div>
        </div>
      </div>

      <div className="messages-layout">
        <div className="conversation-list-panel">
          <div className="search-box"><Search size={16} /><input placeholder="Search conversations..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="conversation-list">
            {customerList.map(({ customer, lastMsg, unread }) => (
              <div key={customer!.id} className={`conversation-item ${selectedCustomerId === customer!.id ? 'selected' : ''} ${unread > 0 ? 'unread' : ''}`} onClick={() => handleSelectConversation(customer!.id)}>
                <div className="conv-avatar" style={{ backgroundColor: `hsl(${customer!.firstName.charCodeAt(0) * 15}, 60%, 50%)` }}>{customer!.firstName[0]}{customer!.lastName[0]}</div>
                <div className="conv-info">
                  <div className="conv-header-row"><strong>{customer!.firstName} {customer!.lastName}</strong><span className="conv-time">{new Date(lastMsg.timestamp).toLocaleDateString()}</span></div>
                  <div className="conv-preview">{channelIcon(lastMsg.channel)}<span>{lastMsg.content.slice(0, 60)}{lastMsg.content.length > 60 ? '...' : ''}</span></div>
                </div>
                {unread > 0 && <span className="unread-badge">{unread}</span>}
              </div>
            ))}
            {customerList.length === 0 && <p className="empty-text">No conversations found.</p>}
          </div>
        </div>

        <div className="chat-panel">
          {selectedCustomer ? (
            <>
              <div className="chat-header">
                <div className="chat-customer-info">
                  <div className="conv-avatar" style={{ backgroundColor: `hsl(${selectedCustomer.firstName.charCodeAt(0) * 15}, 60%, 50%)` }}>{selectedCustomer.firstName[0]}{selectedCustomer.lastName[0]}</div>
                  <div><strong>{selectedCustomer.firstName} {selectedCustomer.lastName}</strong><span>{selectedCustomer.phone}</span></div>
                </div>
                <div className="channel-filter">
                  {(['all', 'sms', 'email', 'app'] as const).map(ch => (
                    <button key={ch} className={`filter-chip sm ${channelFilter === ch ? 'active' : ''}`} onClick={() => setChannelFilter(ch)}>{ch === 'all' ? 'All' : ch.toUpperCase()}</button>
                  ))}
                </div>
              </div>

              <div className="chat-messages">
                {conversation.map(msg => (
                  <div key={msg.id} className={`chat-bubble ${msg.direction}`}>
                    <div className="bubble-content">
                      <p>{msg.content}</p>
                      <span className="bubble-meta">{channelIcon(msg.channel)} {new Date(msg.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                {conversation.length === 0 && <div className="chat-empty"><MessageSquare size={32} /><p>No messages in this channel</p></div>}
              </div>

              <div className="chat-input">
                <div className="tone-selector">
                  <span className="tone-label">Tone:</span>
                  {Object.keys(TONE_TEMPLATES).map(tone => (
                    <button key={tone} className={`tone-chip ${selectedTone === tone ? 'active' : ''}`} onClick={() => handleToneClick(tone)}>{tone}</button>
                  ))}
                  <span className="tone-label" style={{ marginLeft: 12 }}>Via:</span>
                  {(['sms', 'email', 'app'] as const).map(ch => (
                    <button key={ch} className={`tone-chip ${sendChannel === ch ? 'active' : ''}`} onClick={() => setSendChannel(ch)}>{ch.toUpperCase()}</button>
                  ))}
                </div>
                <div className="input-row">
                  <input value={newMessage} onChange={e => { setNewMessage(e.target.value); setSelectedTone(null); }} placeholder="Type a message..." onKeyDown={e => e.key === 'Enter' && handleSend()} />
                  <button className="btn btn-primary send-btn" onClick={handleSend} disabled={!newMessage.trim()}><Send size={16} /></button>
                </div>
              </div>
            </>
          ) : (
            <div className="chat-empty"><MessageSquare size={48} /><p>Select a conversation to start messaging</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
