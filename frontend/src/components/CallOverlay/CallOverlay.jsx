import React, { useEffect, useRef } from 'react';
import { Phone, Video, PhoneOff, X } from 'lucide-react';
import { useCall } from '../../contexts/CallContext';
import './CallOverlay.css';

const CallOverlay = () => {
  const {
    incomingCall,
    activeCall,
    callStatus,
    localStream,
    remoteStream,
    groupStreams,
    acceptCall,
    rejectCall,
    endCall,
    acceptGroupCall,
    rejectGroupCall,
    leaveGroupCall,
    endGroupCall
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!incomingCall && !activeCall) return null;

  // Render Incoming Call
  if (incomingCall && !activeCall) {
    const isVideo = incomingCall.callType === 'video';
    const callerName = incomingCall.isGroup ? incomingCall.groupName || 'Group' : (incomingCall.callerId || 'Someone');
    
    return (
      <div className="call-overlay">
        <div className="call-modal incoming">
          <div className="call-avatar animate-pulse">
            {callerName[0]?.toUpperCase()}
          </div>
          <h3>Incoming {incomingCall.isGroup ? 'Group ' : ''}{isVideo ? 'Video' : 'Voice'} Call</h3>
          <p>{callerName}</p>
          
          <div className="call-actions">
            <button className="btn-reject" onClick={incomingCall.isGroup ? rejectGroupCall : rejectCall}>
              <PhoneOff size={24} />
            </button>
            <button className="btn-accept" onClick={incomingCall.isGroup ? acceptGroupCall : acceptCall}>
              {isVideo ? <Video size={24} /> : <Phone size={24} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Active / Ringing Call
  const isVideo = activeCall?.callType === 'video';
  
  return (
    <div className="call-overlay full">
      <div className="call-header">
        <div className="call-info">
          <h3>{activeCall.isGroup ? `Group Call` : `Call in Progress`}</h3>
          <span>{callStatus}</span>
        </div>
        {!activeCall.isGroup && (
          <button className="header-close" onClick={endCall}><X size={20} /></button>
        )}
      </div>

      <div className={`video-container ${activeCall.isGroup ? 'group-grid' : ''}`}>
        {!activeCall.isGroup ? (
          <>
            {isVideo && (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`remote-video ${!remoteStream ? 'hidden' : ''}`}
              />
            )}
            {!isVideo && (
               <div className="audio-avatar">
                   <Phone size={48} className="animate-pulse" />
               </div>
            )}
            {(localStream && isVideo) && (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="local-video"
              />
            )}
            {/* Play audio in background even if it's voice call */}
            {(!isVideo && remoteStream) && (
              <audio ref={remoteVideoRef} autoPlay playsInline />
            )}
          </>
        ) : (
          <>
            {(localStream && isVideo) && (
              <div className="group-video-wrapper">
                <video ref={localVideoRef} autoPlay muted playsInline />
                <span>You</span>
              </div>
            )}
            {(!isVideo && localStream) && (
               <div className="group-video-wrapper audio-only">
                  <div className="audio-avatar-small"><Phone size={24} /></div>
                  <span>You</span>
               </div>
            )}

            {Object.entries(groupStreams).map(([userId, stream]) => (
              <div key={userId} className="group-video-wrapper">
                {isVideo ? (
                  <video
                    autoPlay
                    playsInline
                    ref={el => { if (el) el.srcObject = stream; }}
                  />
                ) : (
                   <div className="audio-avatar-small"><Phone size={24} /></div>
                )}
                <span>{userId}</span>
                {/* Audio must be played */}
                {!isVideo && <audio autoPlay playsInline ref={el => { if(el) el.srcObject = stream; }} />}
              </div>
            ))}
          </>
        )}
      </div>

      <div className="call-controls">
        {activeCall.isGroup ? (
          <>
            <button className="btn-end main-end" onClick={leaveGroupCall}>
              <PhoneOff size={24} /> <span>Leave</span>
            </button>
            {activeCall.isInitiator && (
              <button className="btn-end main-end" onClick={endGroupCall}>
                <span>End for All</span>
              </button>
            )}
          </>
        ) : (
          <button className="btn-end main-end" onClick={endCall}>
            <PhoneOff size={24} />
          </button>
        )}
      </div>
    </div>
  );
};

export default CallOverlay;
