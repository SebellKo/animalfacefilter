import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera } from '@mediapipe/camera_utils';
import { FaceMesh } from '@mediapipe/face_mesh';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { FACEMESH_TESSELATION, FACEMESH_RIGHT_EYE, FACEMESH_LEFT_EYE, FACEMESH_FACE_OVAL, FACEMESH_LIPS } from '@mediapipe/face_mesh';

const FaceRecognition: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string>('');
  const cameraRef = useRef<Camera | null>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);

  const onResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save the current context state
    ctx.save();

    // Apply horizontal flip transformation
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);

    if (results.multiFaceLandmarks) {
      for (const landmarks of results.multiFaceLandmarks) {
        // Draw face tesselation
        drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });
        
        // Draw face oval
        drawConnectors(ctx, landmarks, FACEMESH_FACE_OVAL, { color: '#E0E0E0', lineWidth: 2 });
        
        // Draw eyes
        drawConnectors(ctx, landmarks, FACEMESH_LEFT_EYE, { color: '#FF3030', lineWidth: 2 });
        drawConnectors(ctx, landmarks, FACEMESH_RIGHT_EYE, { color: '#FF3030', lineWidth: 2 });
        
        // Draw lips
        drawConnectors(ctx, landmarks, FACEMESH_LIPS, { color: '#E0E0E0', lineWidth: 2 });
        
        // Draw landmarks
        drawLandmarks(ctx, landmarks, { color: '#FF3030', radius: 1 });
      }
    }

    // Restore the context state
    ctx.restore();
  }, []);

  const startCamera = async () => {
    try {
      setError('');
      
      if (!videoRef.current) return;

      // 카메라 권한 요청 및 스트림 설정
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      });
      
      videoRef.current.srcObject = stream;
      
      // 비디오 메타데이터 로드 대기
      await new Promise((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = resolve;
        }
      });

      // Initialize FaceMesh
      const faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      faceMesh.onResults(onResults);
      faceMeshRef.current = faceMesh;

      // Initialize Camera
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (faceMeshRef.current && videoRef.current) {
            try {
              await faceMeshRef.current.send({ image: videoRef.current });
            } catch (error) {
              console.error('Face mesh processing error:', error);
            }
          }
        },
        width: 640,
        height: 480
      });

      cameraRef.current = camera;
      await camera.start();
      setIsActive(true);

    } catch (err) {
      console.error('Error starting camera:', err);
      setError('카메라를 시작할 수 없습니다. 카메라 권한을 확인해주세요.');
    }
  };

  const stopCamera = () => {
    if (cameraRef.current) {
      try {
        cameraRef.current.stop();
      } catch (error) {
        console.error('Camera stop error:', error);
      }
      cameraRef.current = null;
    }
    
    if (faceMeshRef.current) {
      try {
        faceMeshRef.current.close();
      } catch (error) {
        console.error('FaceMesh close error:', error);
      }
      faceMeshRef.current = null;
    }

    // 비디오 스트림 정리
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="face-recognition-container">
      <div className="controls">
        {!isActive ? (
          <button onClick={startCamera} className="start-button">
            카메라 시작
          </button>
        ) : (
          <button onClick={stopCamera} className="stop-button">
            카메라 정지
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="video-container">
        <video
          ref={videoRef}
          className="video-element"
          autoPlay
          playsInline
          muted
          style={{ transform: 'scaleX(-1)' }}
        />
        <canvas
          ref={canvasRef}
          className="canvas-overlay"
        />
      </div>
    </div>
  );
};

export default FaceRecognition;
