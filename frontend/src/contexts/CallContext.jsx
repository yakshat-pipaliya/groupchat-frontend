import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

const CallContext = createContext();

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within CallProvider');
  return context;
};

export const CallProvider = ({ children }) => {
  const [callSocket, setCallSocket] = useState(null);
  
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [callStatus, setCallStatus] = useState('idle');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [groupStreams, setGroupStreams] = useState({});

  const peerConnRef = useRef(null);
  const groupConnsRef = useRef({});
  const localStreamRef = useRef(null);
  const activeCallRef = useRef(null);
  const socketRef = useRef(null);

  // Sync state and ref for activeCall
  const updateActiveCall = (callInfo) => {
    setActiveCall(callInfo);
    activeCallRef.current = callInfo;
  };

  const getMedia = async (isVideo) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (e) {
      console.error('Media error', e);
      toast.error('Could not access microphone/camera');
      return null;
    }
  };

  const resetCallStates = () => {
    if (peerConnRef.current) {
      peerConnRef.current.close();
      peerConnRef.current = null;
    }
    Object.values(groupConnsRef.current).forEach(c => c.close());
    groupConnsRef.current = {};
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setGroupStreams({});
    setIncomingCall(null);
    setCallStatus('idle');
    updateActiveCall(null);
  };

  const setupPeer = async (roomId, targetId, isRecv, socket) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peerConnRef.current = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
    }

    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
      setCallStatus('active');
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('webrtc_ice_candidate', { roomId, candidate: e.candidate, targetUserId: targetId });
    };

    if (!isRecv) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc_offer', { roomId, offer, targetUserId: targetId });
    }
  };

  const setupGroupPeer = async (roomId, targetId, isRecv, socket) => {
    if (groupConnsRef.current[targetId]) return;

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    groupConnsRef.current[targetId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
    }

    pc.ontrack = (e) => {
      setGroupStreams(prev => ({ ...prev, [targetId]: e.streams[0] }));
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('group_call_webrtc_ice_candidate', { roomId, candidate: e.candidate, targetUserId: targetId });
    };

    if (!isRecv) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('group_call_webrtc_offer', { roomId, offer, targetUserId: targetId });
    }
  };

  useEffect(() => {
    // We get auth token.
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const API_BASE_URL = import.meta.env.VITE_SOCKET_URL 
      ? import.meta.env.VITE_SOCKET_URL.replace('/one-one-chat', '')
      : 'https://gh802w59-3000.inc1.devtunnels.ms';

    const socket = io(`${API_BASE_URL}/call`, {
      auth: { token },
      transports: ['polling', 'websocket']
    });

    socketRef.current = socket;
    setCallSocket(socket);

    // ----- INDIVIDUAL CALL EVENTS -----
    socket.on('call_initiated', (d) => {
      updateActiveCall({ roomId: d.roomId, targetId: d.receiverId, callType: d.callType, isGroup: false });
      setCallStatus('ringing');
    });

    socket.on('incoming_call', (d) => {
      setIncomingCall({ ...d, isGroup: false });
    });

    socket.on('call_accepted', async (d) => {
      setCallStatus('connecting');
      await setupPeer(d.roomId, d.receiverId, false, socket);
    });

    socket.on('call_connected', () => {
      setCallStatus('active');
    });

    socket.on('call_rejected', () => resetCallStates());
    socket.on('call_ended', () => resetCallStates());

    socket.on('webrtc_offer', async (d) => {
      if (!peerConnRef.current) await setupPeer(d.roomId, d.senderId, true, socket);
      await peerConnRef.current.setRemoteDescription(new RTCSessionDescription(d.offer));
      const answer = await peerConnRef.current.createAnswer();
      await peerConnRef.current.setLocalDescription(answer);
      socket.emit('webrtc_answer', { roomId: d.roomId, answer, targetUserId: d.senderId });
    });

    socket.on('webrtc_answer', (d) => {
      peerConnRef.current?.setRemoteDescription(new RTCSessionDescription(d.answer));
    });

    socket.on('webrtc_ice_candidate', (d) => {
      peerConnRef.current?.addIceCandidate(new RTCIceCandidate(d.candidate));
    });

    // ----- GROUP CALL EVENTS -----
    socket.on('group_call_live', async (d) => {
      updateActiveCall({ ...d, isGroup: true, isInitiator: true });
      setCallStatus('active');
      await getMedia(d.callType === 'video');
    });

    socket.on('active_group_call', (d) => {
      setIncomingCall({ ...d, isGroup: true });
    });

    socket.on('group_call_joined', (d) => {
      setIncomingCall(null);
      updateActiveCall({ ...d, isGroup: true });
      setCallStatus('connecting');
      if (d.participants) {
        d.participants.forEach(pid => setupGroupPeer(d.roomId, pid, false, socket));
      }
    });

    socket.on('participant_joined_group_call', (d) => {
      setActiveCall(prev => prev ? { ...prev, participants: d.participants } : prev);
      if (activeCallRef.current?.isInitiator && localStreamRef.current) {
        setupGroupPeer(d.roomId, d.userId, true, socket);
      }
    });

    socket.on('participant_left_group_call', (d) => {
      setActiveCall(prev => prev ? { ...prev, participants: d.participants } : prev);
      if (groupConnsRef.current[d.userId]) {
        groupConnsRef.current[d.userId].close();
        delete groupConnsRef.current[d.userId];
      }
      setGroupStreams(prev => {
        const next = { ...prev };
        delete next[d.userId];
        return next;
      });
    });

    socket.on('group_call_ended', () => resetCallStates());
    socket.on('call_error', (d) => {
      toast.error(d.message);
      resetCallStates();
    });

    socket.on('group_call_webrtc_offer', async (d) => {
      if (!groupConnsRef.current[d.senderId]) await setupGroupPeer(d.roomId, d.senderId, true, socket);
      await groupConnsRef.current[d.senderId].setRemoteDescription(new RTCSessionDescription(d.offer));
      const answer = await groupConnsRef.current[d.senderId].createAnswer();
      await groupConnsRef.current[d.senderId].setLocalDescription(answer);
      socket.emit('group_call_webrtc_answer', { roomId: d.roomId, answer, targetUserId: d.senderId });
    });

    socket.on('group_call_webrtc_answer', (d) => {
      if (groupConnsRef.current[d.senderId]) {
        groupConnsRef.current[d.senderId].setRemoteDescription(new RTCSessionDescription(d.answer));
      }
    });

    socket.on('group_call_webrtc_ice_candidate', (d) => {
      if (groupConnsRef.current[d.senderId]) {
        groupConnsRef.current[d.senderId].addIceCandidate(new RTCIceCandidate(d.candidate));
      }
    });

    return () => {
      resetCallStates();
      socket.disconnect();
    };
  }, []);

  // Actions
  const startCall = async (receiverId, callType) => {
    if (!socketRef.current) return;
    const stream = await getMedia(callType === 'video');
    if (!stream) return;
    updateActiveCall({ targetId: receiverId, callType, isGroup: false });
    setCallStatus('ringing');
    socketRef.current.emit('initiate_call', { receiverId, callType });
  };

  const acceptCall = async () => {
    if (!socketRef.current || !incomingCall) return;
    const stream = await getMedia(incomingCall.callType === 'video');
    if (!stream) return;
    socketRef.current.emit('accept_call', { roomId: incomingCall.roomId });
    updateActiveCall({ ...incomingCall, isGroup: false });
    setIncomingCall(null);
  };

  const rejectCall = () => {
    if (!socketRef.current || !incomingCall) return;
    socketRef.current.emit('reject_call', { roomId: incomingCall.roomId });
    setIncomingCall(null);
  };

  const endCall = () => {
    if (!socketRef.current || !activeCallRef.current) return;
    socketRef.current.emit('end_call', { roomId: activeCallRef.current.roomId });
    resetCallStates();
  };

  // Group Call Actions
  const startGroupCall = (groupId, callType) => {
    if (!socketRef.current) return;
    // For group call, it becomes live immediately from backend
    socketRef.current.emit('initiate_group_call', { groupId, callType });
  };

  const acceptGroupCall = async () => {
    if (!socketRef.current || !incomingCall) return;
    const stream = await getMedia(incomingCall.callType === 'video');
    if (!stream) return;
    socketRef.current.emit('join_group_call', { roomId: incomingCall.roomId });
  };

  const rejectGroupCall = () => {
    setIncomingCall(null);
  };

  const leaveGroupCall = () => {
    if (!socketRef.current || !activeCallRef.current) return;
    socketRef.current.emit('leave_group_call', { roomId: activeCallRef.current.roomId });
    resetCallStates();
  };

  const endGroupCall = () => {
    if (!socketRef.current || !activeCallRef.current) return;
    socketRef.current.emit('end_group_call', { roomId: activeCallRef.current.roomId });
    resetCallStates();
  };

  const value = {
    incomingCall,
    activeCall,
    callStatus,
    localStream,
    remoteStream,
    groupStreams,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    startGroupCall,
    acceptGroupCall,
    rejectGroupCall,
    leaveGroupCall,
    endGroupCall
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
};
