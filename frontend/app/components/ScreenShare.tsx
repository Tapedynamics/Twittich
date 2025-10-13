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
  const [videoElementReady, setVideoElementReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const peersRef = useRef<Map<string, SimplePeer.Instance>>(new Map());
  const micTrackRef = useRef<MediaStreamTrack | null>(null);
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      const interval = setupViewerListeners();
      retryIntervalRef.current = interval;
    }
    // NOTE: Broadcaster listeners are setup in startScreenShare() when stream is ready

    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
      }
      cleanup();
    };
  }, [sessionId, isAdmin]);

  // Assign pending stream when video element becomes ready
  useEffect(() => {
    if (videoElementReady && pendingStreamRef.current && videoRef.current) {
      logger.log('✅ Video element ready, assigning pending stream');
      const stream = pendingStreamRef.current;
      pendingStreamRef.current = null;

      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        logger.log('Video metadata loaded');
        if (videoRef.current) {
          videoRef.current.play()
            .then(() => {
              logger.log('✅ Video playing successfully');
              setError('');
            })
            .catch(err => {
              logger.error('Play error:', err);
              setError('Click on video to start playback');
            });
        }
      };

      // Try to play immediately as fallback
      videoRef.current.play().catch(err => {
        logger.warn('Immediate play failed, waiting for metadata:', err);
      });
    }
  }, [videoElementReady, pendingStreamRef.current]);

  // Assign stream to video when sharing starts (broadcaster)
  useEffect(() => {
    if (isSharing && streamRef.current && isAdmin) {
      logger.log('Broadcaster starting stream');

      if (videoRef.current && videoElementReady) {
        logger.log('✅ Video element ready, assigning broadcaster stream immediately');
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
      } else {
        logger.log('⏱️ Video element not ready, storing as pending');
        pendingStreamRef.current = streamRef.current;
      }
    }
  }, [isSharing, isAdmin, videoElementReady]);

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
    console.log('📡 Setting up broadcaster listeners');
    logger.log('📡 Setting up broadcaster listeners');

    // CRITICAL: Remove ALL old listeners first to prevent duplicate peer connections
    console.log('🧹 Removing old listeners');
    socketService.offViewerJoined();
    socketService.offWebRTCAnswer();
    console.log('✅ Old listeners removed');

    // Broadcaster receives viewer join request
    console.log('🎧 Setting up viewer-joined listener');
    socketService.onViewerJoined(({ viewerId }) => {
      console.log('✅ Viewer joined event received:', viewerId);
      logger.log('✅ Viewer joined, creating peer connection:', viewerId);

      if (!streamRef.current) {
        console.error('❌ Stream not ready yet, ignoring viewer join');
        logger.error('❌ Stream not ready yet, ignoring viewer join');
        return;
      }

      // CRITICAL: Check if peer already exists for this viewer - DON'T create duplicate!
      const existingPeer = peersRef.current.get(viewerId);
      if (existingPeer) {
        console.log('⚠️ Peer already exists for viewer, IGNORING duplicate request:', viewerId);
        logger.log('⚠️ Peer already exists for viewer, IGNORING duplicate request:', viewerId);
        return; // DON'T destroy and recreate - just ignore
      }

      console.log('🆕 Creating NEW peer for viewer:', viewerId);

      logger.log('Stream details:', {
        id: streamRef.current.id,
        active: streamRef.current.active,
        tracks: streamRef.current.getTracks().map(t => ({
          kind: t.kind,
          label: t.label,
          enabled: t.enabled,
          readyState: t.readyState,
          muted: t.muted
        }))
      });

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

      logger.log('✅ Peer instance created for viewer (initiator: true)');
      peersRef.current.set(viewerId, peer);

      peer.on('signal', (signal) => {
        logger.log('✅ Broadcaster sending offer to viewer:', viewerId);
        logger.log('Offer type:', signal.type);
        socketService.sendWebRTCOffer(sessionId, signal, viewerId);
      });

      peer.on('connect', () => {
        logger.log('✅✅✅ Broadcaster peer connected to viewer:', viewerId);
      });

      peer.on('error', (err) => {
        logger.error('❌ Broadcaster peer error for viewer', viewerId, err);
        peersRef.current.delete(viewerId);
      });

      peer.on('close', () => {
        logger.log('❌ Peer connection closed for viewer:', viewerId);
        peersRef.current.delete(viewerId);
      });

      // Debug broadcaster peer events
      peer.on('iceStateChange', (iceConnectionState, iceGatheringState) => {
        logger.log(`Broadcaster ICE State for ${viewerId}:`, { iceConnectionState, iceGatheringState });
      });

      peer.on('signalingStateChange', (state) => {
        logger.log(`Broadcaster Signaling State for ${viewerId}:`, state);
      });
    });

    // Broadcaster receives answers from viewers
    console.log('🎧 Setting up webrtc-answer listener');
    socketService.onWebRTCAnswer(({ answer, senderId }) => {
      console.log('✅ Broadcaster received answer from viewer:', senderId);
      console.log('Answer type:', answer.type);
      logger.log('✅ Broadcaster received answer from viewer:', senderId);
      logger.log('Answer type:', answer.type);
      const peer = peersRef.current.get(senderId);
      if (peer) {
        try {
          peer.signal(answer);
          logger.log('✅ Answer signaled to peer successfully');
        } catch (err) {
          logger.error('❌ Error signaling answer:', err);
        }
      } else {
        logger.error('❌ No peer found for viewer:', senderId);
      }
    });
  };

  const setupViewerListeners = () => {
    logger.log('Setting up viewer listeners');
    setConnectionStatus('connecting');

    // CRITICAL: Remove ALL old listeners first to prevent duplicate peer connections
    socketService.offWebRTCOffer();
    socketService.offBroadcasterReady();
    socketService.offBroadcasterStopped();

    // Viewer receives offer from broadcaster
    socketService.onWebRTCOffer(({ offer, senderId }) => {
      logger.log('✅ Viewer received offer from broadcaster:', senderId);
      logger.log('Offer details:', offer);

      // Destroy old peer if exists
      if (peerRef.current) {
        logger.log('Destroying old peer connection');
        peerRef.current.destroy();
        peerRef.current = null;
      }

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

      logger.log('✅ Peer instance created (initiator: false)');
      peerRef.current = peer;

      peer.on('signal', (signal) => {
        logger.log('✅ Viewer generating signal (answer)');
        logger.log('Answer details:', signal);
        socketService.sendWebRTCAnswer(sessionId, signal, senderId);
      });

      peer.on('connect', () => {
        logger.log('✅✅✅ Viewer peer connected! Data channel open');
        setConnectionStatus('connected');
        setError('');
      });

      peer.on('stream', (remoteStream) => {
        logger.log('✅✅✅ VIEWER RECEIVED STREAM!', remoteStream);
        logger.log('Stream tracks:', remoteStream.getTracks().map(t => ({
          kind: t.kind,
          label: t.label,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState
        })));

        setIsReceivingStream(true);
        setConnectionStatus('connected');

        // Check if video element is ready
        if (videoRef.current && videoElementReady) {
          logger.log('✅ Video element ready, assigning stream immediately');
          videoRef.current.srcObject = remoteStream;

          videoRef.current.onloadedmetadata = () => {
            logger.log('Video metadata loaded for viewer');
            if (videoRef.current) {
              videoRef.current.play()
                .then(() => {
                  logger.log('✅ Video playing successfully');
                  setError('');
                })
                .catch(err => {
                  logger.error('Play error:', err);
                  setError('Click on video to start playback');
                });
            }
          };

          // Try to play immediately
          videoRef.current.play().catch(err => {
            logger.warn('Immediate play failed, waiting for metadata:', err);
          });
        } else {
          logger.log('⏱️ Video element not ready yet, storing stream as pending');
          pendingStreamRef.current = remoteStream;
        }
      });

      peer.on('error', (err) => {
        logger.error('❌ Viewer peer error:', err);
        setError(`Errore connessione: ${err.message || 'Unknown'}`);
        setConnectionStatus('failed');

        // Auto-retry after 3 seconds
        setTimeout(() => {
          logger.log('⏱️ Retrying after error...');
          if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
          }
          setConnectionStatus('connecting');
          socketService.requestStream(sessionId);
        }, 3000);
      });

      peer.on('close', () => {
        logger.log('❌ Viewer peer connection closed');
        setConnectionStatus('idle');
        setIsReceivingStream(false);
      });

      // Debug all peer events
      peer.on('data', (data) => {
        logger.log('Received data:', data);
      });

      peer.on('iceStateChange', (iceConnectionState, iceGatheringState) => {
        logger.log('ICE State Change:', { iceConnectionState, iceGatheringState });
      });

      peer.on('signalingStateChange', (state) => {
        logger.log('Signaling State Change:', state);
      });

      // Signal the peer with the offer
      logger.log('✅ Signaling peer with offer...');
      try {
        peer.signal(offer);
        logger.log('✅ Peer signaled successfully');
      } catch (err) {
        logger.error('❌ Error signaling peer:', err);
        setError('Errore nel processare l\'offer');
      }
    });

    // Listen for broadcaster ready event
    socketService.onBroadcasterReady(() => {
      logger.log('✅ Broadcaster is now ready, requesting stream');
      socketService.requestStream(sessionId);
    });

    // Listen for broadcaster stopped event
    socketService.onBroadcasterStopped(() => {
      logger.log('❌ Broadcaster stopped streaming');
      setIsReceivingStream(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    });

    // Initial request
    logger.log('📡 Viewer requesting stream from broadcaster');
    socketService.requestStream(sessionId);

    // Retry requesting stream every 3 seconds until we receive it
    const retryInterval = setInterval(() => {
      if (!isReceivingStream) {
        logger.log('⏱️ Retrying stream request...');
        socketService.requestStream(sessionId);
      } else {
        logger.log('✅ Stream received, stopping retry interval');
        clearInterval(retryInterval);
      }
    }, 3000);

    // Store interval ref for cleanup
    return retryInterval;
  };

  const startScreenShare = async () => {
    try {
      console.log('🎬 Broadcaster: Starting screen share...');
      console.log('🔍 DEBUG: startScreenShare called');

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

      // Setup broadcaster listeners NOW that stream is ready
      console.log('✅ Stream ready, setting up broadcaster listeners');
      logger.log('Stream ready, setting up broadcaster listeners');
      setupBroadcasterListeners();

      // Notify backend that stream is ready
      console.log('📡 Notifying backend broadcaster is ready');
      logger.log('Notifying backend broadcaster is ready');
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

  // Callback ref to track when video element is mounted
  const setVideoRef = (element: HTMLVideoElement | null) => {
    videoRef.current = element;
    if (element) {
      logger.log('✅ Video element mounted and ready');
      setVideoElementReady(true);
    } else {
      logger.log('❌ Video element unmounted');
      setVideoElementReady(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      {(isSharing || isReceivingStream) ? (
        <video
          ref={setVideoRef}
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
