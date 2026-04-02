import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Phone, Video, Info, ArrowLeft, Lock, X, Users } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { getGroupDetails, getUserProfile } from '../../services/apiService.js';
import Message from '../Message/Message.jsx';
import MessageInput from '../MessageInput/MessageInput.jsx';
import './ChatWindow.css';
import { useCall } from '../../contexts/CallContext';

const ChatWindow = ({ onBackToChatList }) => {
  const { activeChat, getChatMessages, getUser, markAsRead, deleteMessage } = useChat();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const messages = activeChat ? getChatMessages(activeChat.id) : [];
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [groupDetails, setGroupDetails] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const { startCall, startGroupCall } = useCall();
  const [groupDetailsLoading, setGroupDetailsLoading] = useState(false);
  const [groupDetailsError, setGroupDetailsError] = useState('');
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [userDetailsError, setUserDetailsError] = useState('');

  const getDisplayName = useCallback((member) => {
    if (!member) return 'Unknown Member';

    const fullName = `${member.firstname || ''} ${member.lastname || ''}`.trim();
    return member.username || fullName || member.email || 'Unknown Member';
  }, []);

  useEffect(() => {
    if (activeChat) {
      markAsRead(activeChat.id);
    }
  }, [activeChat, markAsRead]);

  useEffect(() => {
    setIsInfoPanelOpen(false);
    setGroupDetails(null);
    setUserDetails(null);
    setGroupDetailsError('');
    setUserDetailsError('');
  }, [activeChat?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getAvatarInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getOnlineStatus = () => {
    if (activeChat.type === 'group') return `${activeChat.memberCount} members`;
    const user = getUser(activeChat.participants[0]);
    return user?.status === 'online' ? 'online' : 'offline';
  };

  const loadGroupDetails = useCallback(async (groupId) => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken || !groupId) return;

    try {
      setGroupDetailsLoading(true);
      setGroupDetailsError('');
      const response = await getGroupDetails(groupId, authToken);
      setGroupDetails(response?.data?.group || null);
    } catch (error) {
      setGroupDetailsError('Unable to load team members right now.');
    } finally {
      setGroupDetailsLoading(false);
    }
  }, []);

  const loadUserDetails = useCallback(async (userId) => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken || !userId) return;

    try {
      setUserDetailsLoading(true);
      setUserDetailsError('');
      const response = await getUserProfile(userId, authToken);
      setUserDetails(response?.data || response || null);
    } catch (error) {
      setUserDetailsError('Unable to load user details right now.');
    } finally {
      setUserDetailsLoading(false);
    }
  }, []);

  const handleToggleInfoPanel = useCallback(() => {
    if (!activeChat) return;

    const nextOpenState = !isInfoPanelOpen;
    setIsInfoPanelOpen(nextOpenState);

    if (!nextOpenState) return;

    if (activeChat.type === 'group') {
      if (!groupDetails || groupDetails._id !== activeChat.id) {
        loadGroupDetails(activeChat.id);
      }
      return;
    }

    const privateUserId = activeChat.participants?.[0];
    if (privateUserId && (!userDetails || userDetails._id !== privateUserId)) {
      loadUserDetails(privateUserId);
    }
  }, [
    activeChat,
    groupDetails,
    isInfoPanelOpen,
    loadGroupDetails,
    loadUserDetails,
    userDetails
  ]);

  const handleDeleteMessage = (messageId, deleteForAll = false) => {
    deleteMessage(activeChat.id, messageId, deleteForAll);
  };

  const handleBackClick = () => {
    if (onBackToChatList) {
      onBackToChatList();
    }
  };

  const closeInfoPanel = () => setIsInfoPanelOpen(false);
  const groupMembers = groupDetails?.members || [];
  const groupCreator = groupDetails?.createdBy || null;
  const groupMemberCount = groupDetails?.members?.length || activeChat?.memberCount || 0;
  const privateUserName = userDetails?.username || activeChat?.name || 'Unknown User';
  const privateUserInitial = (userDetails?.email?.[0] || activeChat?.name?.[0] || '?').toUpperCase();

  if (!activeChat) {
    return (
      <div className="chat-window empty">
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          <h3>WhatsApp Web</h3>
          <p>Send and receive messages without keeping your phone online.<br />Use WhatsApp on up to 4 linked devices and 1 phone at the same time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <button className="mobile-back-btn" onClick={handleBackClick}>
            <ArrowLeft size={24} />
          </button>

          <div
            className="chat-header-main is-clickable"
            onClick={handleToggleInfoPanel}
          >
            <div className="chat-header-avatar">
              {activeChat.avatar ? (
                <img src={activeChat.avatar} alt={activeChat.name} />
              ) : (
                <div className="avatar-placeholder">
                  {getAvatarInitials(activeChat.name)}
                </div>
              )}
              {activeChat.type === 'private' && (
                <span className={`header-status-dot ${getUser(activeChat.participants[0])?.status}`} />
              )}
            </div>

            <div className="chat-header-details">
              <h3 className="chat-title">{activeChat.name}</h3>
              <span className="chat-status">{getOnlineStatus()}</span>
            </div>
          </div>
        </div>

        <div className="chat-header-actions">
          <button className="btn-icon" title="Voice call" onClick={() => {
            if (activeChat.type === 'group') {
              startGroupCall(activeChat.id, 'audio');
            } else {
              startCall(activeChat.participants[0], 'audio');
            }
          }}>
            <Phone size={20} />
          </button>
          <button className="btn-icon" title="Video call" onClick={() => {
            if (activeChat.type === 'group') {
              startGroupCall(activeChat.id, 'video');
            } else {
              startCall(activeChat.participants[0], 'video');
            }
          }}>
            <Video size={20} />
          </button>
          <button className="btn-icon" title="Info" onClick={handleToggleInfoPanel}>
            <Info size={20} />
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {/* Date Separator - Today */}
            <div className="date-separator">
              <span>TODAY</span>
            </div>
            {messages.map((message, index) => (
              <Message
                key={message.id}
                message={message}
                isCurrentUser={message.sender === user?._id || message.sender === 'current'}
                onDelete={handleDeleteMessage}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <MessageInput chatId={activeChat.id} />

      {isInfoPanelOpen && (
        <>
          <div className="group-panel-backdrop" onClick={closeInfoPanel} />
          <aside className="group-members-panel">
            <div className="group-panel-header">
              <div>
                <p className="group-panel-eyebrow">
                  {activeChat.type === 'group' ? 'Group details' : 'User details'}
                </p>
                <h3>
                  {activeChat.type === 'group'
                    ? (groupDetails?.name || activeChat.name)
                    : privateUserName}
                </h3>
              </div>
              <button
                type="button"
                className="group-panel-close"
                onClick={closeInfoPanel}
              >
                <X size={18} />
              </button>
            </div>

            {activeChat.type === 'group' ? (
              <>
                <div className="group-panel-summary">
                  <div className="group-summary-badge">
                    <Users size={18} />
                  </div>
                  <div>
                    <strong>{groupMemberCount} Members</strong>
                    <p>Clean team list for this group.</p>
                  </div>
                </div>

                {/* {groupCreator && (
                  <section className="group-panel-section">
                    <div className="group-panel-section-title">Created by</div>
                    <div className="group-admin-card">
                      <div className="group-member-avatar">
                        {groupCreator.profileImage ? (
                          <img src={groupCreator.profileImage} alt={getDisplayName(groupCreator)} />
                        ) : (
                          <span>{getAvatarInitials(getDisplayName(groupCreator))}</span>
                        )}
                      </div>
                      <div className="group-member-text">
                        <strong>{getDisplayName(groupCreator)}</strong>
                      </div>
                      <span className="group-role-pill">Admin</span>
                    </div>
                  </section>
                )} */}

                <section className="group-panel-section group-panel-section-fill">
                  <div className="group-panel-section-title">Team members</div>

                  {groupDetailsLoading && <p className="group-panel-state">Loading members...</p>}
                  {!groupDetailsLoading && groupDetailsError && (
                    <p className="group-panel-state error">{groupDetailsError}</p>
                  )}

                  {!groupDetailsLoading && !groupDetailsError && (
                    <div className="group-member-list">
                      {groupMembers.map((member) => (
                        <div className="group-member-row" key={member._id}>
                          <div className="group-member-avatar">
                            {member.profileImage ? (
                              <img src={member.profileImage} alt={getDisplayName(member)} />
                            ) : (
                              <span>{getAvatarInitials(getDisplayName(member))}</span>
                            )}
                          </div>

                          <div className="group-member-text">
                            <strong>{getDisplayName(member)}</strong>
                          </div>

                          {groupCreator?._id === member._id && (
                            <span className="group-role-pill">Creator</span>
                          )}
                        </div>
                      ))}

                      {!groupMembers.length && (
                        <p className="group-panel-state">No members found for this group.</p>
                      )}
                    </div>
                  )}
                </section>
              </>
            ) : (
              <section className="group-panel-section group-panel-section-fill user-panel">
                {userDetailsLoading && <p className="group-panel-state">Loading user info...</p>}
                {!userDetailsLoading && userDetailsError && (
                  <p className="group-panel-state error">{userDetailsError}</p>
                )}

                {!userDetailsLoading && !userDetailsError && (
                  <div className="user-profile-card">
                    <div className="user-profile-avatar">
                      {userDetails?.profileImage ? (
                        <img src={userDetails.profileImage} alt={privateUserName} />
                      ) : (
                        <span>{privateUserInitial}</span>
                      )}
                    </div>
                    <p className="group-panel-section-title">Username</p>
                    <h4>{privateUserName}</h4>
                  </div>
                )}
              </section>
            )}
          </aside>
        </>
      )}
    </div>
  );
};

export default ChatWindow;
