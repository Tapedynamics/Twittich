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
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const peersRef = useRef<Map<string, SimplePeer.Instance>>(new Map());
  const micTrackRef = useRef<MediaStreamTrack | null>(null);
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      const interval = setupViewerListeners();
      retryIntervalRef.current = interval;
    } else {
      setupBroadcasterListeners();
    }

    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
      }
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
    socketService.offBroadcasterReady();
    socketService.offBroadcasterStopped();
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
            { urls: 'stun:stun2.l.google.com:19302' },
            {
              urls: 'turn:openrelay.metered.ca:80',
              username: 'openrelayproject',
              credential: 'openrelayproject',
            },
            {
              urls: 'turn:openrelay.metered.ca:443',
              username: 'openrelayproject',
              credential: 'openrelayproject',
            },
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
            { urls: 'stun:stun2.l.google.com:19302' },
            {
              urls: 'turn:openrelay.metered.ca:80',
              username: 'openrelayproject',
              credential: 'openrelayproject',
            },
            {
              urls: 'turn:openrelay.metered.ca:443',
              username: 'openrelayproject',
              credential: 'openrelayproject',
            },
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

    // Listen for broadcaster ready event
    socketService.onBroadcasterReady(() => {
      console.log('Broadcaster is now ready, requesting stream');
      socketService.requestStream(sessionId);
    });

    // Listen for broadcaster stopped event
    socketService.onBroadcasterStopped(() => {
      console.log('Broadcaster stopped streaming');
      setIsReceivingStream(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    });

    // Retry requesting stream every 3 seconds until we receive it
    console.log('Viewer requesting stream from broadcaster');
    socketService.requestStream(sessionId);

    const retryInterval = setInterval(() => {
      if (!isReceivingStream) {
        console.log('Retrying stream request...');
        socketService.requestStream(sessionId);
      } else {
        clearInterval(retryInterval);
      }
    }, 3000);

    // Store interval ref for cleanup
    return retryInterval;
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
        const micTrack = micStream.getAudioTracks()[0];
        if (micTrack) {
          micTrackRef.current = micTrack;
          combinedStream.addTrack(micTrack);
          console.log('Added microphone track:', micTrack.label, micTrack.enabled);
        }
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
    // Notify backend that broadcaster stopped streaming
    if (isAdmin) {
      socketService.broadcasterStopped(sessionId);
    }

    cleanup();
    setIsSharing(false);
    setIsReceivingStream(false);
  };

  const toggleMicMute = () => {
    if (micTrackRef.current) {
      micTrackRef.current.enabled = !micTrackRef.current.enabled;
      setIsMicMuted(!micTrackRef.current.enabled);
      console.log('Microphone muted:', !micTrackRef.current.enabled);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
        console.log('Entered fullscreen');
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        console.log('Exited fullscreen');
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
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

      {/* Fullscreen button for everyone */}
      {(isSharing || isReceivingStream) && (
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white p-3 rounded-lg font-semibold transition-colors z-20 border-2 border-[var(--cyan-neon)]"
          title={isFullscreen ? 'Esci da schermo intero' : 'Schermo intero'}
        >
          {isFullscreen ? '🗙 Exit' : '⛶ Fullscreen'}
        </button>
      )}

      {/* Control buttons for broadcaster */}
      {isSharing && isAdmin && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-3">
          <button
            onClick={toggleMicMute}
            className={`${
              isMicMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            } text-white px-6 py-2 rounded-lg font-semibold transition-colors`}
          >
            {isMicMuted ? '🎤 Unmute Mic' : '🔇 Mute Mic'}
          </button>
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
