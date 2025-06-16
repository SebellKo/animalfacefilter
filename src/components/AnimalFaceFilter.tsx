import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera } from '@mediapipe/camera_utils';
import { FaceMesh } from '@mediapipe/face_mesh';
import Assets from '../assets.json';

interface AnimalAsset {
  id: string;
  name: string;
  url: string;
  description: string;
  animal: string;
  clothing?: string;
}

const AnimalFaceFilter: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedAnimal, setSelectedAnimal] = useState<string>('cat_formal_transparent');
  const [faceData, setFaceData] = useState<{
    position: { x: number; y: number };
    size: number;
    width: number;
    height: number;
    detected: boolean;
  }>({
    position: { x: 0, y: 0 },
    size: 1,
    width: 1,
    height: 1,
    detected: false
  });
  
  const cameraRef = useRef<Camera | null>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const animationRef = useRef<number>();
  const animalImageRef = useRef<HTMLImageElement | null>(null);

  // Get available animal assets
  const getAnimalAssets = (): AnimalAsset[] => {
    return Object.entries(Assets.images)
      .filter(([key, asset]) => asset.metadata?.type === 'passport_photo' && asset.metadata?.animal)
      .map(([key, asset]) => ({
        id: key,
        name: `${asset.metadata?.animal?.charAt(0).toUpperCase() + asset.metadata?.animal?.slice(1)}${asset.metadata?.clothing ? ` (${asset.metadata.clothing})` : ''}`,
        url: asset.url,
        description: asset.description,
        animal: asset.metadata?.animal || 'unknown',
        clothing: asset.metadata?.clothing
      }));
  };

  // Load selected animal image
  useEffect(() => {
    if (selectedAnimal) {
      const asset = Assets.images[selectedAnimal as keyof typeof Assets.images];
      if (asset) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          animalImageRef.current = img;
        };
        img.src = asset.url;
      }
    }
  }, [selectedAnimal]);

  // Draw animal filter - displays full image without face hole
  const drawAnimalFilter = useCallback((ctx: CanvasRenderingContext2D, faceX: number, faceY: number, faceWidth: number, faceHeight: number) => {
    if (!animalImageRef.current) return;

    const img = animalImageRef.current;
    
    // Calculate animal image size based on face size - scale factor 3.3 for larger size
    const animalScale = Math.max(faceWidth, faceHeight) * 3.3;
    const animalWidth = animalScale;
    const animalHeight = animalScale;
    
    // Position animal image centered on face
    const animalX = faceX - animalWidth / 2;
    const animalY = faceY - animalHeight / 2;
    
    // Draw the full animal image without any modifications
    ctx.drawImage(img, animalX, animalY, animalWidth, animalHeight);
  }, []);

  const onResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video || !overlayCanvas) return;

    const ctx = canvas.getContext('2d');
    const overlayCtx = overlayCanvas.getContext('2d');
    if (!ctx || !overlayCtx) return;

    // Set canvas sizes to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    overlayCanvas.width = video.videoWidth;
    overlayCanvas.height = video.videoHeight;

    // Clear canvases
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      
      // Calculate face bounding box more precisely
      let minX = 1, maxX = 0, minY = 1, maxY = 0;
      landmarks.forEach((landmark: any) => {
        minX = Math.min(minX, landmark.x);
        maxX = Math.max(maxX, landmark.x);
        minY = Math.min(minY, landmark.y);
        maxY = Math.max(maxY, landmark.y);
      });
      
      const centerX = ((minX + maxX) / 2) * canvas.width;
      const centerY = ((minY + maxY) / 2) * canvas.height;
      const faceWidth = (maxX - minX) * canvas.width;
      const faceHeight = (maxY - minY) * canvas.height;
      const faceSize = Math.max(faceWidth, faceHeight);
      
      // Mirror the X coordinate for the overlay
      const mirroredX = canvas.width - centerX;
      
      setFaceData({
        position: { x: mirroredX, y: centerY },
        size: faceSize,
        width: faceWidth,
        height: faceHeight,
        detected: true
      });

      // Draw animal filter on overlay canvas with dynamic face fitting
      overlayCtx.save();
      drawAnimalFilter(overlayCtx, mirroredX, centerY, faceWidth, faceHeight);
      overlayCtx.restore();
    } else {
      setFaceData(prev => ({ ...prev, detected: false }));
    }
  }, [drawAnimalFilter]);

  const startCamera = async () => {
    try {
      setError('');
      
      if (!videoRef.current) return;

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
            await faceMeshRef.current.send({ image: videoRef.current });
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
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    
    if (faceMeshRef.current) {
      faceMeshRef.current.close();
      faceMeshRef.current = null;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    setIsActive(false);
    setFaceData(prev => ({ ...prev, detected: false }));
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const animalAssets = getAnimalAssets();

  return (
    <div className="animal-face-filter-container">
      <div className="controls">
        {!isActive ? (
          <button onClick={startCamera} className="start-button">
            🐾 동물 필터 시작
          </button>
        ) : (
          <button onClick={stopCamera} className="stop-button">
            필터 정지
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="filter-container">
        {/* Video Element */}
        <video
          ref={videoRef}
          className="video-element"
          autoPlay
          playsInline
          muted
          style={{ transform: 'scaleX(-1)' }}
        />
        
        {/* Hidden canvas for face detection */}
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />
        
        {/* Filter Overlay Canvas */}
        <canvas
          ref={overlayCanvasRef}
          className="canvas-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
          }}
        />
      </div>
      
      <div className="filter-info">
        <p>얼굴을 카메라에 맞추면 동물 필터가 적용됩니다! 🐾✨</p>
        {faceData.detected && (
          <div>
            <p className="face-detected">✅ 얼굴 감지됨 - 동물 필터 활성화!</p>
            <p className="face-size">얼굴 크기: {Math.round(faceData.width)} x {Math.round(faceData.height)}px</p>
          </div>
        )}
      </div>

      {/* Animal Filter Selection Interface */}
      <div className="filter-selection-container">
        <h3>🐾 동물 선택하기</h3>
        
        {/* Animal Selection Grid */}
        <div className="assets-grid">
          {animalAssets.map((animal) => (
            <div 
              key={animal.id}
              className={`asset-card ${selectedAnimal === animal.id ? 'selected' : ''}`}
              onClick={() => setSelectedAnimal(animal.id)}
            >
              <img 
                src={animal.url} 
                alt={animal.name}
                className="asset-image"
              />
              <div className="asset-info">
                <h4>{animal.name}</h4>
                <p>{animal.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Current Animal Selection Info */}
        <div className="current-selection">
          <p>
            <strong>현재 선택:</strong> {' '}
            {animalAssets.find(a => a.id === selectedAnimal)?.name || '선택된 동물 없음'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnimalFaceFilter;
