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
  console.log('🎬 ScreenShare component mounted - isAdmin:', isAdmin, 'sessionId:', sessionId);

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
  const listenersSetupRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isAdmin && !listenersSetupRef.current) {
      const setup = () => {
        if (socketService.isConnected()) {
          listenersSetupRef.current = true;
          const interval = setupViewerListeners();
          retryIntervalRef.current = interval;
        } else {
          const onConnect = () => {
            listenersSetupRef.current = true;
            const interval = setupViewerListeners();
            retryIntervalRef.current = interval;
            socketService.offConnect();
          };
          socketService.onConnect(onConnect);
        }
      };
      setup();
    }
    // NOTE: Broadcaster listeners are setup in startScreenShare() when stream is ready

    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
      }
      cleanup();
      socketService.offConnect();
      listenersSetupRef.current = false;
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

      const streamDetails = {
        id: streamRef.current.id,
        active: streamRef.current.active,
        tracks: streamRef.current.getTracks().map(t => ({
          kind: t.kind,
          label: t.label,
          enabled: t.enabled,
          readyState: t.readyState,
          muted: t.muted
        }))
      };
      console.log('Stream details:', streamDetails);
      logger.log('Stream details:', streamDetails);

      // Create a new peer for this viewer
      console.log('🔧 Creating SimplePeer instance...');
      const peer = new SimplePeer({
        initiator: true,
        trickle: true,
        stream: streamRef.current,
        config: {
          iceServers: [
            // STUN servers (for discovering public IP)
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            // TURN servers (relay for restricted networks/mobile)
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
            {
              urls: 'turn:openrelay.metered.ca:443?transport=tcp',
              username: 'openrelayproject',
              credential: 'openrelayproject',
            },
            // Additional TURN servers for mobile reliability
            {
              urls: 'turn:numb.viagenie.ca',
              username: 'webrtc@live.com',
              credential: 'muazkh',
            },
            {
              urls: 'turn:numb.viagenie.ca:3478?transport=tcp',
              username: 'webrtc@live.com',
              credential: 'muazkh',
            },
            // YOUR DEDICATED TURN SERVER (Hetzner VPS) - Priority!
            {
              urls: [
                'turn:46.62.246.152:3478?transport=tcp',
                'turn:46.62.246.152:3478?transport=udp'
              ],
              username: 'twittich',
              credential: 'a475955cb7355cbf27f1302258c76861'
            },
          ],
          iceTransportPolicy: 'all', // Try all connection types
          iceCandidatePoolSize: 10, // Gather more ICE candidates
          bundlePolicy: 'max-bundle', // Optimize for mobile
          rtcpMuxPolicy: 'require', // Reduce port usage
        },
        // SimplePeer options
        offerOptions: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        },
      });

      console.log('✅ SimplePeer instance created successfully');
      logger.log('✅ Peer instance created for viewer (initiator: true)');
      console.log('💾 Storing peer in peersRef.current');
      peersRef.current.set(viewerId, peer);
      console.log('✅ Peer stored, current peer count:', peersRef.current.size);

      console.log('🎧 Setting up peer.on(signal) listener');
      peer.on('signal', (signal) => {
        console.log('📤 Broadcaster emitting signal to viewer:', viewerId);
        console.log('📦 Signal structure:', JSON.stringify(signal, null, 2));
        console.log('Signal type:', signal.type);
        console.log('Has candidate?:', 'candidate' in signal);
        console.log('Has sdp?:', 'sdp' in signal);
        logger.log('✅ Broadcaster sending signal to viewer:', viewerId);
        logger.log('Signal details:', signal);
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
        console.log(`🧊 Broadcaster ICE State for ${viewerId}:`, iceConnectionState, '/', iceGatheringState);
        logger.log(`Broadcaster ICE State for ${viewerId}:`, { iceConnectionState, iceGatheringState });
      });

      peer.on('signalingStateChange', (state) => {
        console.log(`📡 Broadcaster Signaling State for ${viewerId}:`, state);
        logger.log(`Broadcaster Signaling State for ${viewerId}:`, state);
      });
    });

    // Broadcaster receives answers from viewers
    console.log('🎧 Setting up webrtc-answer listener');
    socketService.onWebRTCAnswer(({ answer, senderId }) => {
      console.log('✅ Broadcaster received signal from viewer:', senderId);
      console.log('Signal type:', answer.type);
      logger.log('✅ Broadcaster received signal from viewer:', senderId);
      logger.log('Signal details:', answer);

      const peer = peersRef.current.get(senderId);
      if (peer) {
        try {
          peer.signal(answer);
          logger.log('✅ Signal forwarded to peer successfully');
        } catch (err) {
          logger.error('❌ Error signaling to peer:', err);
        }
      } else {
        logger.error('❌ No peer found for viewer:', senderId);
      }
    });
  };

  const setupViewerListeners = () => {
    console.log('👁️ setupViewerListeners called');
    logger.log('Setting up viewer listeners');
    setConnectionStatus('connecting');

    // CRITICAL: Remove ALL old listeners first to prevent duplicate peer connections
    socketService.offWebRTCOffer();
    socketService.offBroadcasterReady();
    socketService.offBroadcasterStopped();

    // Viewer receives offer from broadcaster
    console.log('🎧 Setting up webrtc-offer listener');
    socketService.onWebRTCOffer(({ offer, senderId }) => {
      console.log('✅ Viewer received signal from broadcaster:', senderId);
      console.log('📦 Signal structure:', JSON.stringify(offer, null, 2));
      console.log('Signal type:', offer.type);
      console.log('Has candidate?:', 'candidate' in offer);
      console.log('Has sdp?:', 'sdp' in offer);
      logger.log('✅ Viewer received signal from broadcaster:', senderId);
      logger.log('Signal details:', offer);

      // Check if this is an offer (first signal) or ICE candidate (subsequent signals)
      const isInitialOffer = offer.type === 'offer';

      if (isInitialOffer && !peerRef.current) {
        // This is the initial offer - create new peer
        logger.log('📝 Received initial offer, creating peer');

        // Create peer as receiver (initiator: false)
        const peer = new SimplePeer({
          initiator: false,
          trickle: true,
          config: {
            iceServers: [
              // STUN servers (for discovering public IP)
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' },
              { urls: 'stun:stun4.l.google.com:19302' },
              // TURN servers (relay for restricted networks/mobile)
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
              {
                urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                username: 'openrelayproject',
                credential: 'openrelayproject',
              },
              // Additional TURN servers for mobile reliability
              {
                urls: 'turn:numb.viagenie.ca',
                username: 'webrtc@live.com',
                credential: 'muazkh',
              },
              {
                urls: 'turn:numb.viagenie.ca:3478?transport=tcp',
                username: 'webrtc@live.com',
                credential: 'muazkh',
              },
              // YOUR DEDICATED TURN SERVER (Hetzner VPS) - Priority!
              {
                urls: [
                  'turn:46.62.246.152:3478?transport=tcp',
                  'turn:46.62.246.152:3478?transport=udp'
                ],
                username: 'twittich',
                credential: 'a475955cb7355cbf27f1302258c76861'
              },
            ],
            iceTransportPolicy: 'all', // Try all connection types
            iceCandidatePoolSize: 10, // Gather more ICE candidates
            bundlePolicy: 'max-bundle', // Optimize for mobile
            rtcpMuxPolicy: 'require', // Reduce port usage
          },
          // SimplePeer options
          answerOptions: {
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
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
          console.log('✅✅✅ VIEWER RECEIVED STREAM!', remoteStream);
          logger.log('✅✅✅ VIEWER RECEIVED STREAM!', remoteStream);

          const tracks = remoteStream.getTracks().map(t => ({
            kind: t.kind,
            label: t.label,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState
          }));
          console.log('Stream tracks:', tracks);
          logger.log('Stream tracks:', tracks);

          setIsReceivingStream(true);
          setConnectionStatus('connected');

          // Check if video element is ready
          if (videoRef.current && videoElementReady) {
            console.log('✅ Video element ready, assigning stream');
            logger.log('✅ Video element ready, assigning stream immediately');
            videoRef.current.srcObject = remoteStream;

            videoRef.current.onloadedmetadata = () => {
              console.log('📹 Video metadata loaded');
              logger.log('Video metadata loaded for viewer');

              if (videoRef.current) {
                console.log('🎬 Attempting autoplay...');
                videoRef.current.play()
                  .then(() => {
                    console.log('✅ Video autoplay SUCCESS!');
                    logger.log('✅ Video playing successfully');
                    setError('');
                  })
                  .catch(err => {
                    console.error('❌ Autoplay FAILED:', err);
                    console.log('💡 User interaction required - show tap overlay');
                    logger.error('Play error:', err);
                    setError('Tap video to start playback');
                  });
              }
            };

            // Try to play immediately
            console.log('⚡ Trying immediate play...');
            videoRef.current.play().catch(err => {
              console.warn('⏱️ Immediate play failed (normal), waiting for metadata:', err.message);
              logger.warn('Immediate play failed, waiting for metadata:', err);
            });
          } else {
            console.log('⏱️ Video element NOT ready, storing as pending');
            logger.log('⏱️ Video element not ready yet, storing stream as pending');
            pendingStreamRef.current = remoteStream;
          }
        });

        peer.on('error', (err) => {
          console.error('❌ Viewer peer error:', err);
          logger.error('❌ Viewer peer error:', err);

          // Check if it's a connection timeout (common on mobile)
          const isConnectionTimeout = err.message && err.message.includes('Connection failed');

          if (isConnectionTimeout) {
            setError('Mobile connection timeout - please refresh and try again');
            console.warn('⚠️ Connection timeout on mobile - TURN servers may be slow or blocked');
          } else {
            setError(`Errore connessione: ${err.message || 'Unknown'}`);
          }

          setConnectionStatus('failed');

          // Don't auto-retry - let user manually retry by refreshing
          // Auto-retry can interfere with slow mobile ICE gathering (20-30s on TURN)
          console.log('💡 TIP: On mobile, connection can take 20-30 seconds. Refresh page to try again.');
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
          console.log(`🧊 Viewer ICE State:`, iceConnectionState, '/', iceGatheringState);
          logger.log('Viewer ICE State Change:', { iceConnectionState, iceGatheringState });

          // Log specific states for debugging
          if (iceConnectionState === 'connected') {
            console.log('✅ ICE connection established!');
          } else if (iceConnectionState === 'failed') {
            console.error('❌ ICE connection failed - this usually means TURN server needed but not working');
          } else if (iceConnectionState === 'disconnected') {
            console.warn('⚠️ ICE connection disconnected');
          }
        });

        peer.on('signalingStateChange', (state) => {
          console.log(`📡 Viewer Signaling State:`, state);
          logger.log('Viewer Signaling State Change:', state);
        });

        // Signal the peer with the initial offer
        logger.log('✅ Signaling peer with initial offer...');
        try {
          peer.signal(offer);
          logger.log('✅ Initial offer signaled successfully');
        } catch (err) {
          logger.error('❌ Error signaling initial offer:', err);
          setError('Errore nel processare l\'offer');
        }
      } else if (peerRef.current) {
        // This is a subsequent signal (likely ICE candidate) - signal to existing peer
        logger.log('📡 Received subsequent signal (ICE candidate), signaling to existing peer');
        try {
          peerRef.current.signal(offer);
          logger.log('✅ Signal forwarded to peer successfully');
        } catch (err) {
          logger.error('❌ Error signaling to peer:', err);
        }
      } else {
        logger.warn('⚠️ Received signal but no peer exists and not initial offer');
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

    // Retry requesting stream every 5 seconds until peer connection is established
    // Slower interval to avoid flooding on mobile networks
    let requestCount = 0;
    const MAX_REQUESTS = 6; // Stop after 30 seconds (6 * 5s)

    const retryInterval = setInterval(() => {
      requestCount++;

      if (peerRef.current || requestCount >= MAX_REQUESTS) {
        // Stop polling once peer is created or after max attempts
        logger.log('✅ Stopping stream requests - peer created or max attempts reached');
        clearInterval(retryInterval);
        return;
      }

      if (!isReceivingStream) {
        logger.log(`⏱️ Retrying stream request (${requestCount}/${MAX_REQUESTS})...`);
        socketService.requestStream(sessionId);
      } else {
        logger.log('✅ Stream received, stopping retry interval');
        clearInterval(retryInterval);
      }
    }, 5000); // Increased from 3s to 5s for mobile

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
          muted={true} // ALWAYS muted for autoplay to work on mobile!
          controls={false}
          className="w-full h-full object-contain"
          onClick={() => {
            // Unmute and play on click
            if (videoRef.current) {
              console.log('📱 User tapped video - unmuting');
              videoRef.current.muted = false;
              if (videoRef.current.paused) {
                videoRef.current.play().catch(err => console.error('Manual play error:', err));
              }
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
                    <p className="text-[var(--cyan-neon)] text-sm opacity-70 mb-2">Stabilendo la connessione peer-to-peer</p>
                    <p className="text-[var(--gold)] text-xs opacity-60">📱 Su mobile può richiedere 20-30 secondi</p>
                  </>
                )}
                {connectionStatus === 'failed' && (
                  <>
                    <div className="text-6xl mb-4 pulse-glow">⚠️</div>
                    <p className="text-[var(--bear-red)] text-xl mb-2 neon-red">Connessione fallita</p>
                    <p className="text-[var(--gold)] text-sm opacity-70 mb-2">Ricarica la pagina per riprovare</p>
                    <p className="text-[var(--cyan-neon)] text-xs opacity-60">💡 Suggerimento: Usa il desktop per connessioni più stabili</p>
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

      {/* Audio indicator - tap to unmute */}
      {!isAdmin && isReceivingStream && videoRef.current?.muted && (
        <div
          className="absolute top-4 left-4 z-20 bg-black/80 px-4 py-2 rounded-lg border-2 border-[var(--gold)] cursor-pointer hover:bg-black/90 transition-colors animate-pulse"
          onClick={() => {
            if (videoRef.current) {
              console.log('🔊 Unmuting video on user request');
              videoRef.current.muted = false;
            }
          }}
        >
          <p className="text-[var(--gold)] text-sm font-bold">🔇 Tap to enable audio</p>
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
