import { io, Socket } from 'socket.io-client';
import SimplePeer from 'simple-peer';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;

  connect(token?: string) {
    if (this.socket?.connected) return this.socket;

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // Live streaming events
  joinLiveSession(sessionId: string) {
    this.socket?.emit('join-live', sessionId);
  }

  leaveLiveSession(sessionId: string) {
    this.socket?.emit('leave-live', sessionId);
  }

  sendChatMessage(sessionId: string, message: string, userId: string, username: string) {
    this.socket?.emit('live-chat-message', { sessionId, message, userId, username });
  }

  onLiveChatMessage(callback: (data: any) => void) {
    this.socket?.on('live-chat-message', callback);
  }

  offLiveChatMessage(callback?: (data: any) => void) {
    if (callback) {
      this.socket?.off('live-chat-message', callback);
    } else {
      this.socket?.off('live-chat-message');
    }
  }

  onViewersCountUpdate(callback: (count: number) => void) {
    this.socket?.on('viewers-count', callback);
  }

  offViewersCountUpdate(callback?: (count: number) => void) {
    if (callback) {
      this.socket?.off('viewers-count', callback);
    } else {
      this.socket?.off('viewers-count');
    }
  }

  onLiveStarted(callback: (data: any) => void) {
    this.socket?.on('live-started', callback);
  }

  offLiveStarted(callback?: (data: any) => void) {
    if (callback) {
      this.socket?.off('live-started', callback);
    } else {
      this.socket?.off('live-started');
    }
  }

  onLiveEnded(callback: () => void) {
    this.socket?.on('live-ended', callback);
  }

  offLiveEnded(callback?: () => void) {
    if (callback) {
      this.socket?.off('live-ended', callback);
    } else {
      this.socket?.off('live-ended');
    }
  }

  // WebRTC Signaling
  broadcasterReady(sessionId: string) {
    this.socket?.emit('broadcaster-ready', { sessionId });
  }

  requestStream(sessionId: string) {
    this.socket?.emit('request-stream', { sessionId });
  }

  sendWebRTCOffer(sessionId: string, offer: SimplePeer.SignalData, targetId: string) {
    this.socket?.emit('webrtc-offer', { sessionId, offer, targetId });
  }

  sendWebRTCAnswer(sessionId: string, answer: SimplePeer.SignalData, targetId: string) {
    this.socket?.emit('webrtc-answer', { sessionId, answer, targetId });
  }

  sendICECandidate(sessionId: string, candidate: SimplePeer.SignalData, targetId?: string) {
    this.socket?.emit('webrtc-ice-candidate', { sessionId, candidate, targetId });
  }

  onViewerJoined(callback: (data: { viewerId: string }) => void) {
    this.socket?.on('viewer-joined', callback);
  }

  onWebRTCOffer(callback: (data: { offer: SimplePeer.SignalData; senderId: string }) => void) {
    this.socket?.on('webrtc-offer', callback);
  }

  onWebRTCAnswer(callback: (data: { answer: SimplePeer.SignalData; senderId: string }) => void) {
    this.socket?.on('webrtc-answer', callback);
  }

  onICECandidate(callback: (data: { candidate: SimplePeer.SignalData; senderId: string }) => void) {
    this.socket?.on('webrtc-ice-candidate', callback);
  }

  offViewerJoined() {
    this.socket?.off('viewer-joined');
  }

  offWebRTCOffer() {
    this.socket?.off('webrtc-offer');
  }

  offWebRTCAnswer() {
    this.socket?.off('webrtc-answer');
  }

  offICECandidate() {
    this.socket?.off('webrtc-ice-candidate');
  }
}

export const socketService = new SocketService();
