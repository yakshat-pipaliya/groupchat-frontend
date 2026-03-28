import {
  Download,
  Trash2,
  FileText,
  MoreVertical,
} from "lucide-react";
import { useChat } from "../../contexts/ChatContext";
import "./Message.css";
import React, { useState, useRef, useEffect } from "react";

const Message = ({ message, isCurrentUser, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const { getUser, formatTime } = useChat();
  const menuRef = useRef(null);

  // ✅ Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () =>
      document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleDelete = (deleteForAll = false) => {
    onDelete(message.id, deleteForAll);
    setShowMenu(false);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024)
      return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const renderFile = () => {
    if (!message.file) return null;

    // Handle images
    if (message.file.type.startsWith('image/')) {
      return (
        <div className="image-preview">
          <img 
            src={message.file.url} 
            alt={message.file.name}
            onClick={() => window.open(message.file.url, '_blank')}
          />
        </div>
      );
    }

    // Handle videos
    if (message.file.type.startsWith('video/')) {
      return (
        <div className="video-preview">
          <video controls>
            <source src={message.file.url} type={message.file.type} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // Handle documents (fallback)
    return (
      <div className="file-preview document-preview">
        <FileText size={24} />
        <div>
          <div>{message.file.name}</div>
          <small>{formatFileSize(message.file.size)}</small>
        </div>
        <a href={message.file.url} download>
          <Download size={16} />
        </a>
      </div>
    );
  };

  const sender = getUser(message.sender);

  return (
    <div className={`message ${isCurrentUser ? "sent" : "received"}`}>
      {/* Avatar */}
      {!isCurrentUser && (
        <div className="message-avatar">
          {sender?.avatar ? (
            <img src={sender.avatar} alt="" />
          ) : (
            <div className="avatar-placeholder">
              {sender?.name?.[0]}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="message-content">
        {!isCurrentUser && (
          <span className="sender-name">{sender?.name}</span>
        )}

        <div className="message-bubble">
          {message.type === "file" && renderFile()}
          {message.text && <p>{message.text}</p>}

          <div className="message-meta">
            <span>{new Date(message.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {isCurrentUser && (
        <div className="message-actions" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            <MoreVertical size={16} />
          </button>

          {showMenu && (
            <div className="message-menu">
              <button onClick={() => handleDelete(false)}>
                <Trash2 size={14} /> Delete for me
              </button>
              <button onClick={() => handleDelete(true)}>
                <Trash2 size={14} /> Delete for all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Message;