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

  useEffect(() => {
    if (!isAdmin) {
      setupViewerListeners();
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
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

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
    console.log('Setting up viewer listeners');

    // Viewer receives signal (offer) from broadcaster
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
        console.log('Viewer sending answer');
        socketService.sendWebRTCAnswer(sessionId, signal, senderId);
      });

      peer.on('stream', (remoteStream) => {
        console.log('Viewer received stream:', remoteStream);
        console.log('Video ref current:', videoRef.current);

        // Set state first to trigger re-render and create video element
        setIsReceivingStream(true);

        // Then assign stream after a short delay to ensure video element exists
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
        console.error('Peer error:', err);
        setError('Errore nella connessione peer');
      });

      // Signal the peer with the offer
      peer.signal(offer);
    });

    // Viewer receives answer from broadcaster (ICE candidates)
    socketService.onWebRTCAnswer(({ answer }) => {
      console.log('Viewer received answer');
      if (peerRef.current) {
        peerRef.current.signal(answer);
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

      // Create peer as initiator
      const peer = new SimplePeer({
        initiator: true,
        trickle: true,
        stream: stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      });

      peerRef.current = peer;

      peer.on('signal', (signal) => {
        console.log('Broadcaster sending offer');
        socketService.sendWebRTCOffer(sessionId, signal);
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
        setError('Errore nella connessione peer');
      });

      // Listen for answers from viewers
      socketService.onWebRTCAnswer(({ answer }) => {
        console.log('Broadcaster received answer from viewer');
        if (peerRef.current) {
          peerRef.current.signal(answer);
        }
      });

      stream.getVideoTracks()[0].addEventListener('ended', () => {
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
