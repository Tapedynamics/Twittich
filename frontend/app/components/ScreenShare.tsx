'use client';

import { useState, useRef, useEffect } from 'react';
import SimplePeer from 'simple-peer';
import { socketService } from '../lib/socket';

interface ScreenShareProps {
  isAdmin: boolean;
  sessionId: string;
}

export default function ScreenShare({ isAdmin, sessionId }: ScreenShareProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState('');
  const [isReceivingStream, setIsReceivingStream] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const peersRef = useRef<Map<string, SimplePeer.Instance>>(new Map());

  useEffect(() => {
    if (!isAdmin) {
      setupViewerListeners();
    } else {
      setupBroadcasterListeners();
    }

    return () => {
      cleanup();
    };
  }, [sessionId, isAdmin]);

  // Assign stream to video when sharing starts
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
    // Clean up viewer peer
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    // Clean up all broadcaster peers
    peersRef.current.forEach((peer) => {
      peer.destroy();
    });
    peersRef.current.clear();

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
    socketService.offViewerJoined();
  };

  const setupBroadcasterListeners = () => {
    console.log('Setting up broadcaster listeners');

    // Broadcaster receives viewer join request
    socketService.onViewerJoined(({ viewerId }) => {
      console.log('Viewer joined, creating peer connection:', viewerId);

      if (!streamRef.current) {
        console.warn('Stream not ready yet, ignoring viewer join');
        return;
      }

      // Create a new peer for this viewer
      const peer = new SimplePeer({
        initiator: true,
        trickle: true,
        stream: streamRef.current,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      });

      peersRef.current.set(viewerId, peer);

      peer.on('signal', (signal) => {
        console.log('Broadcaster sending offer to viewer:', viewerId);
        socketService.sendWebRTCOffer(sessionId, signal, viewerId);
      });

      peer.on('error', (err) => {
        console.error('Broadcaster peer error for viewer', viewerId, err);
        peersRef.current.delete(viewerId);
      });

      peer.on('close', () => {
        console.log('Peer connection closed for viewer:', viewerId);
        peersRef.current.delete(viewerId);
      });
    });

    // Broadcaster receives answers from viewers
    socketService.onWebRTCAnswer(({ answer, senderId }) => {
      console.log('Broadcaster received answer from viewer:', senderId);
      const peer = peersRef.current.get(senderId);
      if (peer) {
        peer.signal(answer);
      } else {
        console.warn('No peer found for viewer:', senderId);
      }
    });
  };

  const setupViewerListeners = () => {
    console.log('Setting up viewer listeners');

    // Viewer receives offer from broadcaster
    socketService.onWebRTCOffer(({ offer, senderId }) => {
      console.log('Viewer received offer from broadcaster:', senderId);

      // Create peer as receiver (initiator: false)
      const peer = new SimplePeer({
        initiator: false,
        trickle: true,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      });

      peerRef.current = peer;

      peer.on('signal', (signal) => {
        console.log('Viewer sending answer to broadcaster');
        socketService.sendWebRTCAnswer(sessionId, signal, senderId);
      });

      peer.on('stream', (remoteStream) => {
        console.log('Viewer received stream:', remoteStream);
        setIsReceivingStream(true);

        setTimeout(() => {
          if (videoRef.current) {
            console.log('Assigning stream to video element');
            videoRef.current.srcObject = remoteStream;
            videoRef.current.play().catch(err => console.error('Play error:', err));
          } else {
            console.error('Video ref still null after timeout!');
          }
        }, 100);
      });

      peer.on('error', (err) => {
        console.error('Viewer peer error:', err);
        setError('Errore nella connessione peer');
      });

      // Signal the peer with the offer
      peer.signal(offer);
    });

    // Request stream from broadcaster when component mounts
    console.log('Viewer requesting stream from broadcaster');
    socketService.requestStream(sessionId);
  };

  const startScreenShare = async () => {
    try {
      console.log('Broadcaster: Starting screen share...');

      // First, get display media with audio
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
        } as any,
        audio: true, // Simplified to just request audio
      });

      console.log('Display stream acquired:', displayStream);
      console.log('Video tracks:', displayStream.getVideoTracks());
      console.log('Audio tracks (display):', displayStream.getAudioTracks());

      // Create a combined stream
      const combinedStream = new MediaStream();

      // Add video track from display
      displayStream.getVideoTracks().forEach(track => {
        combinedStream.addTrack(track);
        console.log('Added video track:', track.label);
      });

      // Add audio track from display if available
      displayStream.getAudioTracks().forEach(track => {
        combinedStream.addTrack(track);
        console.log('Added display audio track:', track.label, track.enabled);
      });

      // Try to get microphone audio as well (optional)
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
        micStream.getAudioTracks().forEach(track => {
          combinedStream.addTrack(track);
          console.log('Added microphone track:', track.label, track.enabled);
        });
      } catch (micErr) {
        console.warn('Could not get microphone audio:', micErr);
        // Continue without microphone
      }

      console.log('Combined stream tracks:', combinedStream.getTracks().map(t => ({
        kind: t.kind,
        label: t.label,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState
      })));

      streamRef.current = combinedStream;
      setIsSharing(true);
      setError('');

      // Notify backend that stream is ready
      socketService.broadcasterReady(sessionId);

      displayStream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('Screen share ended by user');
        stopScreenShare();
      });
    } catch (err: any) {
      console.error('Error starting screen share:', err);
      setError(err.message || 'Impossibile condividere lo schermo');
    }
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
          muted={false}
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
