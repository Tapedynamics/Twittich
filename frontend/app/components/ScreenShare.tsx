'use client';

import { useState, useRef, useEffect } from 'react';

interface ScreenShareProps {
  isAdmin: boolean;
  sessionId: string;
}

export default function ScreenShare({ isAdmin, sessionId }: ScreenShareProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startScreenShare = async () => {
    try {
      console.log('Requesting screen share...');

      // Request screen sharing permission with audio
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

      console.log('Screen share granted:', stream);
      console.log('Video tracks:', stream.getVideoTracks());
      console.log('Audio tracks:', stream.getAudioTracks());

      streamRef.current = stream;
      setIsSharing(true);
      setError('');

      // Handle when user stops sharing via browser UI
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsSharing(false);
  };

  useEffect(() => {
    return () => {
      stopScreenShare();
    };
  }, []);

  // Assign stream to video when sharing starts
  useEffect(() => {
    if (isSharing && streamRef.current && videoRef.current) {
      console.log('Assigning stream to video element');
      videoRef.current.srcObject = streamRef.current;

      videoRef.current.onloadedmetadata = async () => {
        console.log('Video metadata loaded in useEffect');
        try {
          await videoRef.current?.play();
          console.log('Video playing successfully in useEffect');
        } catch (err) {
          console.error('Error playing video in useEffect:', err);
        }
      };
    }
  }, [isSharing]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      {isSharing ? (
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
