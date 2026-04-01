import React, { useRef, useState } from 'react';
import { Image, File, X, Film, FileText, Music, Paperclip } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import './MessageInput.css';

const MessageInput = ({ chatId }) => {
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage } = useChat();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() && !selectedFile) return;
    
    sendMessage(chatId, text, selectedFile);
    setText('');
    setSelectedFile(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return <Image size={20} />;
    if (type.startsWith('video/')) return <Film size={20} />;
    if (type.startsWith('audio/')) return <Music size={20} />;
    return <FileText size={20} />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="message-input-container">
      {selectedFile && (
        <div className="file-preview-bar">
          <div className="file-preview-info">
            {getFileIcon(selectedFile.type)}
            <span className="file-name">{selectedFile.name}</span>
            <span className="file-size">({formatFileSize(selectedFile.size)})</span>
          </div>
          <button className="btn-icon" onClick={clearFile}>
            <X size={18} />
          </button>
        </div>
      )}

      <form className="message-input-form" onSubmit={handleSubmit}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        />

        <button
          type="button"
          className="btn-icon attach-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={24} />
        </button>

        <div className="input-wrapper">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message here .."
            className="message-input"
          />
        </div>

        <button
          type="submit"
          className="send-btn"
          disabled={!text.trim() && !selectedFile}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
