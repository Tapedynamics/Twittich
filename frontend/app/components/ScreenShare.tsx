'use client';

import { useState, useRef, useEffect } from 'react';
import { socketService } from '../lib/socket';

interface ScreenShareProps {
  isAdmin: boolean;
  sessionId: string;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function ScreenShare({ isAdmin, sessionId }: ScreenShareProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState('');
  const [isReceivingStream, setIsReceivingStream] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  useEffect(() => {
    if (!isAdmin) {
      setupViewerListeners();
    }

    return () => {
      cleanup();
    };
  }, [sessionId, isAdmin]);

  // Assign stream to video element when sharing starts
  useEffect(() => {
    if (isSharing && streamRef.current && videoRef.current && isAdmin) {
      console.log('Assigning broadcaster stream to video element');
      videoRef.current.srcObject = streamRef.current;

      videoRef.current.onloadedmetadata = async () => {
        console.log('Video metadata loaded');
        try {
          await videoRef.current?.play();
          console.log('Video playing successfully');
        } catch (err) {
          console.error('Error playing video:', err);
        }
      };
    }
  }, [isSharing, isAdmin]);

  const cleanup = () => {
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    socketService.offWebRTCOffer();
    socketService.offWebRTCAnswer();
    socketService.offICECandidate();
  };

  const setupViewerListeners = () => {
    // Viewer receives offer from broadcaster
    socketService.onWebRTCOffer(async ({ offer, senderId }) => {
      console.log('Viewer received offer from broadcaster:', senderId);

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current.set(senderId, pc);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.sendICECandidate(sessionId, event.candidate, senderId);
        }
      };

      pc.ontrack = (event) => {
        console.log('Viewer received track:', event.streams[0]);
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setIsReceivingStream(true);
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketService.sendWebRTCAnswer(sessionId, answer, senderId);
    });

    // Viewer receives ICE candidates
    socketService.onICECandidate(async ({ candidate, senderId }) => {
      const pc = peerConnectionsRef.current.get(senderId);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
  };

  const startScreenShare = async () => {
    try {
      console.log('Broadcaster: Starting screen share...');

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
        } as any,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      console.log('Stream acquired:', stream);
      console.log('Video tracks:', stream.getVideoTracks());
      console.log('Audio tracks:', stream.getAudioTracks());

      streamRef.current = stream;
      setIsSharing(true);
      setError('');

      // Setup WebRTC for all viewers
      setupBroadcasterConnection();

      stream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('Screen share ended by user');
        stopScreenShare();
      });
    } catch (err: any) {
      console.error('Error starting screen share:', err);
      setError(err.message || 'Impossibile condividere lo schermo');
    }
  };

  const setupBroadcasterConnection = async () => {
    if (!streamRef.current) return;

    // Listen for answers from viewers
    socketService.onWebRTCAnswer(async ({ answer, senderId }) => {
      console.log('Broadcaster received answer from viewer:', senderId);
      const pc = peerConnectionsRef.current.get(senderId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    // Listen for ICE candidates from viewers
    socketService.onICECandidate(async ({ candidate, senderId }) => {
      const pc = peerConnectionsRef.current.get(senderId);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // Create offer for new viewers (broadcast to all in room)
    await createOfferForViewers();
  };

  const createOfferForViewers = async () => {
    if (!streamRef.current) return;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    const tempId = 'broadcast-' + Date.now();
    peerConnectionsRef.current.set(tempId, pc);

    streamRef.current.getTracks().forEach((track) => {
      pc.addTrack(track, streamRef.current!);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.sendICECandidate(sessionId, event.candidate);
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    console.log('Broadcaster sending offer to all viewers');
    socketService.sendWebRTCOffer(sessionId, offer);
  };

  const stopScreenShare = () => {
    cleanup();
    setIsSharing(false);
    setIsReceivingStream(false);
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      {(isSharing || isReceivingStream) ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isAdmin}
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-white text-xl mb-4">
              {isAdmin ? '🎥 Pronto per condividere lo schermo' : '⏳ In attesa dello streaming'}
            </p>
            {error && (
              <p className="text-red-400 text-sm mb-4">{error}</p>
            )}
            {isAdmin && !isSharing && (
              <button
                onClick={startScreenShare}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
              >
                📺 Condividi Schermo
              </button>
            )}
          </div>
        </div>
      )}

      {isSharing && isAdmin && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <button
            onClick={stopScreenShare}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 font-semibold"
          >
            ⏹️ Ferma Condivisione
          </button>
        </div>
      )}
    </div>
  );
}
