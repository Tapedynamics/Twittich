'use client';

import { useState, useRef, useEffect } from 'react';
import SimplePeer from 'simple-peer';
import { socketService } from '../lib/socket';
import { logger } from '../lib/logger';

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
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
  const [videoPaused, setVideoPaused] = useState(false);
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
      logger.log('Assigning broadcaster stream to video element');
      logger.log('Broadcaster stream tracks:', streamRef.current.getTracks().map(t => ({
        kind: t.kind,
        label: t.label,
        enabled: t.enabled,
        readyState: t.readyState
      })));

      videoRef.current.srcObject = streamRef.current;

      videoRef.current.onloadedmetadata = async () => {
        logger.log('Broadcaster video metadata loaded');
        try {
          await videoRef.current?.play();
          logger.log('Broadcaster video playing successfully');
          setError('');
        } catch (err) {
          logger.error('Error playing broadcaster video:', err);
          setError('Error starting video preview');
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
    logger.log('Setting up broadcaster listeners');

    // Broadcaster receives viewer join request
    socketService.onViewerJoined(({ viewerId }) => {
      logger.log('Viewer joined, creating peer connection:', viewerId);

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
        logger.log('Broadcaster sending offer to viewer:', viewerId);
        socketService.sendWebRTCOffer(sessionId, signal, viewerId);
      });

      peer.on('error', (err) => {
        logger.error('Broadcaster peer error for viewer', viewerId, err);
        peersRef.current.delete(viewerId);
      });

      peer.on('close', () => {
        logger.log('Peer connection closed for viewer:', viewerId);
        peersRef.current.delete(viewerId);
      });
    });

    // Broadcaster receives answers from viewers
    socketService.onWebRTCAnswer(({ answer, senderId }) => {
      logger.log('Broadcaster received answer from viewer:', senderId);
      const peer = peersRef.current.get(senderId);
      if (peer) {
        peer.signal(answer);
      } else {
        console.warn('No peer found for viewer:', senderId);
      }
    });
  };

  const setupViewerListeners = () => {
    logger.log('Setting up viewer listeners');
    setConnectionStatus('connecting');

    // Viewer receives offer from broadcaster
    socketService.onWebRTCOffer(({ offer, senderId }) => {
      logger.log('Viewer received offer from broadcaster:', senderId);

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
        logger.log('Viewer sending answer to broadcaster');
        socketService.sendWebRTCAnswer(sessionId, signal, senderId);
      });

      peer.on('connect', () => {
        logger.log('Viewer peer connected!');
        setConnectionStatus('connected');
        setError('');
      });

      peer.on('stream', (remoteStream) => {
        logger.log('Viewer received stream:', remoteStream);
        logger.log('Stream tracks:', remoteStream.getTracks().map(t => ({
          kind: t.kind,
          label: t.label,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState
        })));

        setIsReceivingStream(true);
        setConnectionStatus('connected');

        // Wait for video element to be ready
        const assignStream = () => {
          if (videoRef.current) {
            logger.log('Assigning stream to video element');
            videoRef.current.srcObject = remoteStream;

            // Handle video loaded metadata
            videoRef.current.onloadedmetadata = () => {
              logger.log('Video metadata loaded for viewer');
              if (videoRef.current) {
                videoRef.current.play()
                  .then(() => {
                    logger.log('Video playing successfully');
                    setError('');
                  })
                  .catch(err => {
                    logger.error('Play error:', err);
                    setError('Click on video to start playback');
                  });
              }
            };

            // Fallback: try to play immediately
            videoRef.current.play().catch(err => {
              logger.warn('Immediate play failed, waiting for metadata:', err);
            });
          } else {
            logger.error('Video ref still null!');
            setError('Video element not ready');
          }
        };

        // Try immediately and with delay as fallback
        assignStream();
        setTimeout(assignStream, 100);
      });

      peer.on('error', (err) => {
        logger.error('Viewer peer error:', err);
        setError('Impossibile connettersi allo streaming. Riprova...');
        setConnectionStatus('failed');

        // Auto-retry after 3 seconds
        setTimeout(() => {
          if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
          }
          setConnectionStatus('connecting');
          socketService.requestStream(sessionId);
        }, 3000);
      });

      peer.on('close', () => {
        logger.log('Viewer peer connection closed');
        setConnectionStatus('idle');
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

  // Monitor video play/pause state
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handlePause = () => {
      logger.log('Video paused');
      setVideoPaused(true);
    };

    const handlePlay = () => {
      logger.log('Video playing');
      setVideoPaused(false);
    };

    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('play', handlePlay);

    return () => {
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('play', handlePlay);
    };
  }, [isReceivingStream, isSharing]);

  return (
    <div ref={containerRef} className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      {(isSharing || isReceivingStream) ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isAdmin} // Broadcaster sees own video muted, viewers hear audio
          controls={false}
          className="w-full h-full object-contain"
          onClick={() => {
            // Allow manual play on click if autoplay failed
            if (videoRef.current && videoRef.current.paused) {
              videoRef.current.play().catch(err => console.error('Manual play error:', err));
            }
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-black via-[#0a0e1a] to-black">
          <div className="text-center max-w-md px-4">
            {isAdmin ? (
              <>
                <div className="text-6xl mb-4 pulse-glow">🎥</div>
                <p className="text-[var(--bull-green)] text-xl mb-4 neon-green">
                  Pronto per lo streaming
                </p>
                {error && (
                  <p className="text-[var(--bear-red)] text-sm mb-4 neon-red">{error}</p>
                )}
                <button
                  onClick={startScreenShare}
                  className="btn-bear px-8 py-4 rounded-lg font-bold text-lg uppercase tracking-wider pulse-glow shadow-lg shadow-[var(--bear-red)]/50"
                >
                  📺 Condividi Schermo
                </button>
              </>
            ) : (
              <>
                {connectionStatus === 'idle' && (
                  <>
                    <div className="text-6xl mb-4">⏳</div>
                    <p className="text-[var(--cyan-neon)] text-xl mb-2">In attesa dello streaming</p>
                    <p className="text-[var(--bull-green)] text-sm opacity-70">Il broadcaster non ha ancora iniziato...</p>
                  </>
                )}
                {connectionStatus === 'connecting' && (
                  <>
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-[var(--bull-green)] border-t-transparent mx-auto mb-4"></div>
                    <p className="text-[var(--bull-green)] text-xl mb-2 neon-green">Connessione in corso...</p>
                    <p className="text-[var(--cyan-neon)] text-sm opacity-70">Stabilendo la connessione peer-to-peer</p>
                  </>
                )}
                {connectionStatus === 'failed' && (
                  <>
                    <div className="text-6xl mb-4 pulse-glow">⚠️</div>
                    <p className="text-[var(--bear-red)] text-xl mb-2 neon-red">Connessione fallita</p>
                    <p className="text-[var(--gold)] text-sm opacity-70">Nuovo tentativo tra 3 secondi...</p>
                  </>
                )}
                {error && (
                  <p className="text-[var(--bear-red)] text-sm mt-4 neon-red">{error}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Video paused overlay - only for viewers */}
      {videoPaused && !isAdmin && (isSharing || isReceivingStream) && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 cursor-pointer"
          onClick={() => {
            if (videoRef.current) {
              videoRef.current.play().catch(err => console.error('Play error:', err));
            }
          }}
        >
          <div className="text-center">
            <div className="text-6xl mb-4">▶️</div>
            <p className="text-white text-xl font-bold">Click per avviare il video</p>
            <p className="text-[var(--gold)] text-sm mt-2">Il browser richiede interazione utente</p>
          </div>
        </div>
      )}

      {/* Fullscreen button for everyone */}
      {(isSharing || isReceivingStream) && (
        <button
          onClick={toggleFullscreen}
          className="absolute bottom-4 right-4 bg-black/70 hover:bg-black/90 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors z-20 border border-[var(--cyan-neon)]"
          title={isFullscreen ? 'Esci da schermo intero' : 'Schermo intero'}
        >
          {isFullscreen ? '🗙' : '⛶'}
        </button>
      )}

      {/* Control buttons for broadcaster */}
      {isSharing && isAdmin && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          <button
            onClick={toggleMicMute}
            className={`${
              isMicMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            } text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors`}
          >
            {isMicMuted ? '🎤' : '🔇'}
          </button>
          <button
            onClick={stopScreenShare}
            className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 text-sm font-semibold"
          >
            ⏹️
          </button>
        </div>
      )}
    </div>
  );
}
