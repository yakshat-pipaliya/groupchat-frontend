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

  const createDummyStream = (isVideo) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const dest = ctx.createMediaStreamDestination();
      const osc = ctx.createOscillator();
      osc.connect(dest);
      const audioTrack = dest.stream.getAudioTracks()[0];

      if (!isVideo) {
        return new MediaStream([audioTrack]);
      }

      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const canvasCtx = canvas.getContext('2d');
      canvasCtx.fillStyle = '#111';
      canvasCtx.fillRect(0, 0, 640, 480);
      canvasCtx.fillStyle = '#fff';
      canvasCtx.font = '30px Arial';
      canvasCtx.textAlign = 'center';
      canvasCtx.fillText('No Camera / HTTP Blocked', 320, 240);
      
      const videoStream = canvas.captureStream(10);
      const videoTrack = videoStream.getVideoTracks()[0];

      return new MediaStream([audioTrack, videoTrack]);
    } catch (e) {
      console.warn("Dummy stream failed", e);
      return new MediaStream();
    }
  };

  const getMedia = async (isVideo) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('mediaDevices API is not supported in this environment');
        toast.error('Media devices blocked. Generating a dummy feed.');
        return createDummyStream(isVideo);
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (e) {
      console.error('Media error', e);
      toast.error('Could not access microphone/camera');
      const dummyStream = createDummyStream(isVideo);
      setLocalStream(dummyStream);
      localStreamRef.current = dummyStream;
      return dummyStream;
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
    // Prevent recreating peer connection if one already exists
    if (peerConnRef.current) {
      console.log('[CallContext] Peer connection already exists, skipping setup');
      return;
    }
    
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peerConnRef.current = pc;
    console.log('[CallContext] Peer connection created, isRecv:', isRecv);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
      console.log('[CallContext] Added local tracks:', localStreamRef.current.getTracks().length);
    }

    pc.ontrack = (e) => {
      console.log('[CallContext] ontrack fired, streams:', e.streams.length, 'tracks:', e.streams[0]?.getTracks().length);
      setRemoteStream(e.streams[0]);
      setCallStatus('active');
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('webrtc_ice_candidate', { roomId, candidate: e.candidate, targetUserId: targetId });
    };

    pc.onconnectionstatechange = () => {
      console.log('[CallContext] Connection state:', pc.connectionState);
    };

    if (!isRecv) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc_offer', { roomId, offer, targetUserId: targetId });
      console.log('[CallContext] Offer sent to:', targetId);
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
      console.log('[CallContext] Call accepted by:', d.receiverId);
      setCallStatus('connecting');
      updateActiveCall(prev => ({ ...prev, roomId: d.roomId, targetId: d.receiverId }));
      await setupPeer(d.roomId, d.receiverId, false, socket);
    });

    socket.on('call_connected', (d) => {
      setCallStatus('connecting');
      // Receiver: update activeCall with roomId and callerId (as targetId)
      updateActiveCall(prev => ({ ...prev, roomId: d.roomId, targetId: d.callerId }));
    });

    socket.on('call_rejected', () => resetCallStates());
    socket.on('call_ended', () => resetCallStates());

    socket.on('webrtc_offer', async (d) => {
      try {
        console.log('[CallContext] Received webrtc_offer from:', d.senderId);
        // Only create peer if it doesn't exist
        if (!peerConnRef.current) {
          await setupPeer(d.roomId, d.senderId, true, socket);
        }
        const pc = peerConnRef.current;
        if (!pc) return;
        
        await pc.setRemoteDescription(new RTCSessionDescription(d.offer));
        console.log('[CallContext] Set remote description (offer)');
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', { roomId: d.roomId, answer, targetUserId: d.senderId });
        console.log('[CallContext] Answer sent to:', d.senderId);
      } catch (err) {
        console.error('[CallContext] Error handling webrtc_offer:', err);
      }
    });

    socket.on('webrtc_answer', async (d) => {
      try {
        const pc = peerConnRef.current;
        if (pc) {
          console.log('[CallContext] Received webrtc_answer, setting remote description');
          await pc.setRemoteDescription(new RTCSessionDescription(d.answer));
          console.log('[CallContext] Remote description (answer) set successfully');
          if (pc.candidateQueue) {
            pc.candidateQueue.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.warn));
            pc.candidateQueue = [];
          }
        }
      } catch (err) {
        console.error('[CallContext] Error setting remote answer:', err);
      }
    });

    socket.on('webrtc_ice_candidate', async (d) => {
      const pc = peerConnRef.current;
      if (pc) {
        try {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(d.candidate));
          } else {
            if (!pc.candidateQueue) pc.candidateQueue = [];
            pc.candidateQueue.push(d.candidate);
          }
        } catch (err) {
          console.warn('ICE Candidate skipped or queued', err);
        }
      }
    });

    // ----- GROUP CALL EVENTS -----
    socket.on('group_call_ringing', (d) => {
      updateActiveCall({ ...d, isGroup: true, isInitiator: true });
      setCallStatus('ringing');
    });

    socket.on('incoming_group_call', (d) => {
      setIncomingCall({ ...d, isGroup: true });
    });

    socket.on('group_call_started', async (d) => {
      setCallStatus('active');
    });

    socket.on('active_group_call', (d) => {
      setIncomingCall({ ...d, isGroup: true });
    });

    socket.on('group_call_joined', (d) => {
      setIncomingCall(null);
      updateActiveCall({ ...d, isGroup: true });
      setCallStatus('active');
      if (d.participants) {
        d.participants.forEach(pid => setupGroupPeer(d.roomId, pid, false, socket));
      }
    });

    socket.on('participant_joined_group_call', (d) => {
      setActiveCall(prev => prev ? { ...prev, participants: d.participants } : prev);
      // New member will initiate WebRTC offer, wait for group_call_webrtc_offer
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
      try {
        if (!groupConnsRef.current[d.senderId]) await setupGroupPeer(d.roomId, d.senderId, true, socket);
        const pc = groupConnsRef.current[d.senderId];
        await pc.setRemoteDescription(new RTCSessionDescription(d.offer));
        
        if (pc.candidateQueue) {
          pc.candidateQueue.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.warn));
          pc.candidateQueue = [];
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('group_call_webrtc_answer', { roomId: d.roomId, answer, targetUserId: d.senderId });
      } catch (err) {
        console.error('Error handling webrtc offer:', err);
      }
    });

    socket.on('group_call_webrtc_answer', async (d) => {
      try {
        const pc = groupConnsRef.current[d.senderId];
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(d.answer));
          if (pc.candidateQueue) {
            pc.candidateQueue.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.warn));
            pc.candidateQueue = [];
          }
        }
      } catch (err) {
        console.error('Error handling group webrtc answer:', err);
      }
    });

    socket.on('group_call_webrtc_ice_candidate', async (d) => {
      const pc = groupConnsRef.current[d.senderId];
      if (pc) {
        try {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(d.candidate));
          } else {
            if (!pc.candidateQueue) pc.candidateQueue = [];
            pc.candidateQueue.push(d.candidate);
          }
        } catch (err) {
          console.warn('Group ICE Candidate queued natively', err);
        }
      }
    });

    return () => {
      resetCallStates();
      socket.disconnect();
    };
  }, []);

  // Actions
  const startCall = async (receiverId, callType) => {
    if (!socketRef.current || !socketRef.current.connected) {
      toast.error("Call server disconnected. Please try again.");
      return;
    }
    try {
      const stream = await getMedia(callType === 'video');
      if (!stream) {
        toast.error("Stream generation failed entirely.");
        return;
      }
      updateActiveCall({ targetId: receiverId, callType, isGroup: false });
      setCallStatus('ringing');
      socketRef.current.emit('initiate_call', { receiverId, callType });
    } catch (err) {
      console.error("Failed to start call", err);
      toast.error("Error initiating call");
    }
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
  const startGroupCall = async (groupId, callType) => {
    if (!socketRef.current || !socketRef.current.connected) {
      toast.error("Call server disconnected. Please try again.");
      return;
    }
    toast.info("Starting group call...");
    try {
      const stream = await getMedia(callType === 'video');
      if (!stream) {
        toast.error("Stream generation failed entirely.");
        return;
      }
      socketRef.current.emit('initiate_group_call', { groupId, callType });
    } catch (err) {
      console.error("Failed to start group call", err);
      toast.error("Error initiating group call");
    }
  };

  const acceptGroupCall = async () => {
    if (!socketRef.current || !incomingCall) return;
    const stream = await getMedia(incomingCall.callType === 'video');
    if (!stream) return;
    socketRef.current.emit('accept_group_call', { roomId: incomingCall.roomId });
    // Will transition once group_call_joined is received
  };

  const rejectGroupCall = () => {
    if (!socketRef.current || !incomingCall) return;
    socketRef.current.emit('reject_group_call', { roomId: incomingCall.roomId });
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
