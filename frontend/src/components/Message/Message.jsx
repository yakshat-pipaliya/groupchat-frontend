import {
  Download,
  Trash2,
  FileText,
  MoreVertical,
  CheckCheck,
} from "lucide-react";
import { useChat } from "../../contexts/ChatContext";
import "./Message.css";
import React, { useState, useRef, useEffect } from "react";

const Message = ({ message, isCurrentUser, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const { getUser, formatTime } = useChat();
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    // Use mousedown instead of click for better responsiveness
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
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

  const getAttachmentType = () => {
    const fileType = message.file?.type || "";

    if (fileType.startsWith("image/") || fileType === "image" || message.type === "image") {
      return "image";
    }

    if (fileType.startsWith("video/") || fileType === "video" || message.type === "video") {
      return "video";
    }

    if (fileType.startsWith("audio/") || fileType === "audio" || message.type === "audio") {
      return "audio";
    }

    return "file";
  };

  const getMediaSourceType = () => {
    const fileType = message.file?.type || "";
    const fileUrl = (message.file?.url || "").split("?")[0].toLowerCase();

    if (fileType.includes("/")) {
      return fileType;
    }

    if (fileUrl.endsWith(".webm")) return "video/webm";
    if (fileUrl.endsWith(".mp4")) return "video/mp4";
    if (fileUrl.endsWith(".mov")) return "video/quicktime";
    if (fileUrl.endsWith(".ogg")) return "audio/ogg";
    if (fileUrl.endsWith(".mp3")) return "audio/mpeg";
    if (fileUrl.endsWith(".wav")) return "audio/wav";
    if (fileUrl.endsWith(".m4a")) return "audio/mp4";

    return "";
  };

  const renderFile = () => {
    if (!message.file) return null;
    const attachmentType = getAttachmentType();

    if (attachmentType === "image") {
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

    if (attachmentType === "video") {
      const sourceType = getMediaSourceType();
      return (
        <div className="video-preview">
          <video controls>
            <source src={message.file.url} type={sourceType || undefined} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if (attachmentType === "audio") {
      const sourceType = getMediaSourceType();
      return (
        <div className="audio-preview">
          <audio controls>
            <source src={message.file.url} type={sourceType || undefined} />
            Your browser does not support the audio element.
          </audio>
        </div>
      );
    }

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
  
  // Format time like WhatsApp (e.g., "08:58", "13:20")
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  return (
    <div className={`message ${isCurrentUser ? "sent" : "received"}`}>
      {/* Avatar for received messages */}
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
          {message.file && renderFile()}
          {message.text && <p>{message.text}</p>}

          <div className="message-meta">
            <span>{formatMessageTime(message.timestamp)}</span>
            {isCurrentUser && (
              <span className={`read-status-ticks ${message.isRead ? 'read' : ''}`}>
                <CheckCheck size={14} />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions for sent messages */}
      {isCurrentUser && (
        <div className="message-actions-container" ref={menuRef}>
          <button
            className="message-actions-btn"
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
