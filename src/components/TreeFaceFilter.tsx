import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera } from '@mediapipe/camera_utils';
import { FaceMesh } from '@mediapipe/face_mesh';
import Assets from '../assets.json';

interface TreeAsset {
  id: string;
  name: string;
  url: string;
  description: string;
  type: string;
}

interface AnimalAsset {
  id: string;
  name: string;
  url: string;
  description: string;
  animal: string;
  clothing?: string;
}

const TreeFaceFilter: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedFilterType, setSelectedFilterType] = useState<'tree' | 'animal'>('tree');
  const [selectedTreeType, setSelectedTreeType] = useState<'procedural' | 'asset'>('procedural');
  const [selectedAsset, setSelectedAsset] = useState<string>('oak_tree');
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
  const treeImageRef = useRef<HTMLImageElement | null>(null);
  const animalImageRef = useRef<HTMLImageElement | null>(null);

  // Get available tree assets
  const getTreeAssets = (): TreeAsset[] => {
    return Object.entries(Assets.images)
      .filter(([key]) => key.includes('tree'))
      .map(([key, asset]) => ({
        id: key,
        name: asset.metadata?.type ? 
          `${asset.metadata.type.charAt(0).toUpperCase() + asset.metadata.type.slice(1)} Tree` : 
          key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        url: asset.url,
        description: asset.description,
        type: asset.metadata?.type || 'unknown'
      }));
  };

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

  // Load selected tree image
  useEffect(() => {
    if (selectedFilterType === 'tree' && selectedTreeType === 'asset' && selectedAsset) {
      const asset = Assets.images[selectedAsset as keyof typeof Assets.images];
      if (asset) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          treeImageRef.current = img;
        };
        img.src = asset.url;
      }
    }
  }, [selectedAsset, selectedTreeType, selectedFilterType]);

  // Load selected animal image
  useEffect(() => {
    if (selectedFilterType === 'animal' && selectedAnimal) {
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
  }, [selectedAnimal, selectedFilterType]);

  // Draw animal filter - now displays full image without face hole
  const drawAnimalFilter = useCallback((ctx: CanvasRenderingContext2D, faceX: number, faceY: number, faceWidth: number, faceHeight: number) => {
    if (!animalImageRef.current) return;

    const img = animalImageRef.current;
    
    // Calculate animal image size based on face size - increased scale from 2.8 to 3.3 for larger size
    const animalScale = Math.max(faceWidth, faceHeight) * 3.3;
    const animalWidth = animalScale;
    const animalHeight = animalScale;
    
    // Position animal image centered on face
    const animalX = faceX - animalWidth / 2;
    const animalY = faceY - animalHeight / 2;
    
    // Draw the full animal image without any modifications
    ctx.drawImage(img, animalX, animalY, animalWidth, animalHeight);
  }, []);

  // Draw asset-based tree filter
  const drawAssetTreeFilter = useCallback((ctx: CanvasRenderingContext2D, faceX: number, faceY: number, faceWidth: number, faceHeight: number) => {
    if (!treeImageRef.current) return;

    const img = treeImageRef.current;
    const treeScale = Math.max(faceWidth, faceHeight) * 3;
    const treeWidth = treeScale;
    const treeHeight = treeScale;
    
    // Position tree so face hole is in the center
    const treeX = faceX - treeWidth / 2;
    const treeY = faceY - treeHeight / 2;
    
    // Draw the tree image
    ctx.drawImage(img, treeX, treeY, treeWidth, treeHeight);
    
    // Create face hole
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    const holeWidth = faceWidth * 1.1;
    const holeHeight = faceHeight * 1.1;
    ctx.ellipse(faceX, faceY, holeWidth / 2, holeHeight / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Add inner shadow to the hole for depth
    const shadowGradient = ctx.createRadialGradient(
      faceX, faceY, Math.min(holeWidth, holeHeight) * 0.3,
      faceX, faceY, Math.min(holeWidth, holeHeight) * 0.55
    );
    shadowGradient.addColorStop(0, 'rgba(0,0,0,0)');
    shadowGradient.addColorStop(1, 'rgba(0,0,0,0.4)');
    
    ctx.fillStyle = shadowGradient;
    ctx.beginPath();
    ctx.ellipse(faceX, faceY, holeWidth * 0.55 / 2, holeHeight * 0.55 / 2, 0, 0, Math.PI * 2);
    ctx.ellipse(faceX, faceY, holeWidth * 0.35 / 2, holeHeight * 0.35 / 2, 0, 0, Math.PI * 2, true);
    ctx.fill();
  }, []);

  // Draw detailed procedural tree filter
  const drawProceduralTreeFilter = useCallback((ctx: CanvasRenderingContext2D, faceX: number, faceY: number, faceWidth: number, faceHeight: number) => {
    const centerX = faceX;
    const centerY = faceY;
    
    // Calculate tree dimensions based on face size
    const treeScale = Math.max(faceWidth, faceHeight) * 2.8;
    const trunkWidth = treeScale * 0.28;
    const trunkHeight = treeScale * 0.65;
    const crownRadius = treeScale * 0.5;
    
    // Position trunk so face hole is in the middle of the trunk
    const trunkX = centerX - trunkWidth / 2;
    const trunkY = centerY - trunkHeight * 0.3;
    
    // Draw detailed trunk with realistic bark texture
    const trunkGradient = ctx.createLinearGradient(trunkX, 0, trunkX + trunkWidth, 0);
    trunkGradient.addColorStop(0, '#5D4037');
    trunkGradient.addColorStop(0.2, '#6D4C41');
    trunkGradient.addColorStop(0.4, '#8D6E63');
    trunkGradient.addColorStop(0.6, '#A1887F');
    trunkGradient.addColorStop(0.8, '#6D4C41');
    trunkGradient.addColorStop(1, '#5D4037');
    
    ctx.fillStyle = trunkGradient;
    ctx.beginPath();
    // Draw trunk with natural taper and slight curves
    ctx.moveTo(trunkX + trunkWidth * 0.15, trunkY);
    ctx.quadraticCurveTo(trunkX + trunkWidth * 0.5, trunkY + trunkHeight * 0.1, trunkX + trunkWidth * 0.85, trunkY);
    ctx.quadraticCurveTo(trunkX + trunkWidth * 0.95, trunkY + trunkHeight * 0.5, trunkX + trunkWidth, trunkY + trunkHeight);
    ctx.lineTo(trunkX, trunkY + trunkHeight);
    ctx.quadraticCurveTo(trunkX + trunkWidth * 0.05, trunkY + trunkHeight * 0.5, trunkX + trunkWidth * 0.15, trunkY);
    ctx.closePath();
    ctx.fill();

    // Add detailed bark texture with vertical lines and knots
    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 1.5;
    
    // Vertical bark lines
    for (let i = 0; i < 8; i++) {
      const lineX = trunkX + (trunkWidth / 8) * (i + 1);
      const variation = Math.sin(i * 0.5) * 3;
      
      ctx.beginPath();
      ctx.moveTo(lineX + variation, trunkY + 10);
      ctx.quadraticCurveTo(lineX + variation * 2, trunkY + trunkHeight * 0.3, lineX - variation, trunkY + trunkHeight * 0.6);
      ctx.quadraticCurveTo(lineX + variation, trunkY + trunkHeight * 0.8, lineX - variation * 0.5, trunkY + trunkHeight - 5);
      ctx.stroke();
    }
    
    // Horizontal bark texture
    for (let i = 1; i < 12; i++) {
      const lineY = trunkY + (trunkHeight / 12) * i;
      const lineWidth = trunkWidth * (0.9 - i * 0.015);
      const lineX = centerX - lineWidth / 2;
      const curve = Math.sin(i * 0.3) * 2;
      
      ctx.beginPath();
      ctx.moveTo(lineX, lineY);
      ctx.quadraticCurveTo(centerX, lineY + curve, lineX + lineWidth, lineY);
      ctx.stroke();
    }

    // Add bark knots and details
    const knotPositions = [
      { x: 0.3, y: 0.25 },
      { x: 0.7, y: 0.45 },
      { x: 0.2, y: 0.65 },
      { x: 0.8, y: 0.8 }
    ];
    
    knotPositions.forEach(knot => {
      const knotX = trunkX + trunkWidth * knot.x;
      const knotY = trunkY + trunkHeight * knot.y;
      
      // Draw knot
      ctx.fillStyle = '#4E342E';
      ctx.beginPath();
      ctx.ellipse(knotX, knotY, 4, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Add knot highlight
      ctx.fillStyle = '#8D6E63';
      ctx.beginPath();
      ctx.ellipse(knotX - 1, knotY - 1, 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw detailed crown (foliage) with multiple layers and realistic leaf clusters
    const crownY = trunkY - crownRadius * 0.25;
    
    // Base shadow layer
    ctx.fillStyle = 'rgba(0, 50, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(centerX + 3, crownY + 3, crownRadius * 1.1, 0, Math.PI * 2);
    ctx.fill();
    
    // Main crown layers with varied green tones
    const leafLayers = [
      { color: '#1B5E20', radius: 1.0, offset: { x: 0, y: 0 } },
      { color: '#2E7D32', radius: 0.9, offset: { x: -0.3, y: -0.1 } },
      { color: '#388E3C', radius: 0.9, offset: { x: 0.3, y: -0.1 } },
      { color: '#43A047', radius: 0.8, offset: { x: 0, y: -0.3 } },
      { color: '#4CAF50', radius: 0.75, offset: { x: -0.25, y: -0.25 } },
      { color: '#66BB6A', radius: 0.75, offset: { x: 0.25, y: -0.25 } },
      { color: '#81C784', radius: 0.7, offset: { x: 0, y: -0.4 } },
      { color: '#A5D6A7', radius: 0.6, offset: { x: -0.15, y: -0.35 } },
      { color: '#C8E6C9', radius: 0.6, offset: { x: 0.15, y: -0.35 } }
    ];
    
    leafLayers.forEach(layer => {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.arc(
        centerX + crownRadius * layer.offset.x,
        crownY + crownRadius * layer.offset.y,
        crownRadius * layer.radius,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

    // Add individual leaf clusters for more detail
    const leafClusters = [
      { x: -0.6, y: -0.2, size: 0.15, color: '#4CAF50' },
      { x: 0.6, y: -0.2, size: 0.15, color: '#4CAF50' },
      { x: -0.4, y: 0.3, size: 0.12, color: '#66BB6A' },
      { x: 0.4, y: 0.3, size: 0.12, color: '#66BB6A' },
      { x: 0, y: -0.6, size: 0.18, color: '#81C784' },
      { x: -0.3, y: -0.5, size: 0.1, color: '#A5D6A7' },
      { x: 0.3, y: -0.5, size: 0.1, color: '#A5D6A7' },
      { x: -0.5, y: 0.1, size: 0.08, color: '#C8E6C9' },
      { x: 0.5, y: 0.1, size: 0.08, color: '#C8E6C9' }
    ];
    
    leafClusters.forEach(cluster => {
      ctx.fillStyle = cluster.color;
      ctx.beginPath();
      ctx.arc(
        centerX + crownRadius * cluster.x,
        crownY + crownRadius * cluster.y,
        crownRadius * cluster.size,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

    // Add small branch details extending from trunk into crown
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 2;
    
    const branches = [
      { angle: -0.3, length: 0.3 },
      { angle: 0.3, length: 0.25 },
      { angle: -0.1, length: 0.2 },
      { angle: 0.1, length: 0.2 }
    ];
    
    branches.forEach(branch => {
      const startX = centerX + Math.sin(branch.angle) * trunkWidth * 0.4;
      const startY = trunkY + 10;
      const endX = startX + Math.sin(branch.angle) * crownRadius * branch.length;
      const endY = startY - Math.cos(branch.angle) * crownRadius * branch.length;
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    });

    // Add subtle leaf texture with small dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const distance = Math.random() * crownRadius * 0.8;
      const leafX = centerX + Math.cos(angle) * distance;
      const leafY = crownY + Math.sin(angle) * distance * 0.6;
      
      ctx.beginPath();
      ctx.arc(leafX, leafY, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Create dynamic face hole that fits the user's face perfectly
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    // Make hole slightly larger than face for comfortable fit
    const holeWidth = faceWidth * 1.1;
    const holeHeight = faceHeight * 1.1;
    
    // Create elliptical hole to match face shape better
    ctx.ellipse(centerX, centerY, holeWidth / 2, holeHeight / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Add inner shadow to the hole for depth
    const shadowGradient = ctx.createRadialGradient(
      centerX, centerY, Math.min(holeWidth, holeHeight) * 0.3,
      centerX, centerY, Math.min(holeWidth, holeHeight) * 0.55
    );
    shadowGradient.addColorStop(0, 'rgba(0,0,0,0)');
    shadowGradient.addColorStop(1, 'rgba(0,0,0,0.5)');
    
    ctx.fillStyle = shadowGradient;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, holeWidth * 0.55 / 2, holeHeight * 0.55 / 2, 0, 0, Math.PI * 2);
    ctx.ellipse(centerX, centerY, holeWidth * 0.35 / 2, holeHeight * 0.35 / 2, 0, 0, Math.PI * 2, true);
    ctx.fill();

    // Add wood grain effect inside the hole edge
    ctx.strokeStyle = 'rgba(101, 67, 33, 0.6)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const innerRadius = Math.min(holeWidth, holeHeight) * 0.35;
      const outerRadius = Math.min(holeWidth, holeHeight) * 0.45;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius + (outerRadius - innerRadius) * (i % 2), angle, angle + 0.1);
      ctx.stroke();
    }
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

      // Draw filter on overlay canvas with dynamic face fitting
      overlayCtx.save();
      if (selectedFilterType === 'tree') {
        if (selectedTreeType === 'procedural') {
          drawProceduralTreeFilter(overlayCtx, mirroredX, centerY, faceWidth, faceHeight);
        } else {
          drawAssetTreeFilter(overlayCtx, mirroredX, centerY, faceWidth, faceHeight);
        }
      } else {
        drawAnimalFilter(overlayCtx, mirroredX, centerY, faceWidth, faceHeight);
      }
      overlayCtx.restore();
    } else {
      setFaceData(prev => ({ ...prev, detected: false }));
    }
  }, [drawProceduralTreeFilter, drawAssetTreeFilter, drawAnimalFilter, selectedFilterType, selectedTreeType]);

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

  const treeAssets = getTreeAssets();
  const animalAssets = getAnimalAssets();

  return (
    <div className="tree-face-filter-container">
      <div className="controls">
        {!isActive ? (
          <button onClick={startCamera} className="start-button">
            🎭 필터 시작
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
        <p>얼굴을 카메라에 맞추면 {selectedFilterType === 'tree' ? '나무' : '동물'} 필터가 적용됩니다! {selectedFilterType === 'tree' ? '🌳' : '🐾'}✨</p>
        {faceData.detected && (
          <div>
            <p className="face-detected">✅ 얼굴 감지됨 - {selectedFilterType === 'tree' ? '나무' : '동물'} 필터 활성화!</p>
            <p className="face-size">얼굴 크기: {Math.round(faceData.width)} x {Math.round(faceData.height)}px</p>
          </div>
        )}
      </div>

      {/* Filter Selection Interface */}
      <div className="filter-selection-container">
        <h3>🎭 필터 선택하기</h3>
        
        {/* Filter Type Selector */}
        <div className="filter-type-selector">
          <button 
            onClick={() => setSelectedFilterType('tree')}
            className={`filter-type-button ${selectedFilterType === 'tree' ? 'active' : ''}`}
          >
            🌳 나무 필터
          </button>
          <button 
            onClick={() => setSelectedFilterType('animal')}
            className={`filter-type-button ${selectedFilterType === 'animal' ? 'active' : ''}`}
          >
            🐾 동물 필터
          </button>
        </div>

        {/* Tree Filter Options */}
        {selectedFilterType === 'tree' && (
          <div className="tree-selection-container">
            <h4>🌳 나무 선택하기</h4>
            
            {/* Tree Type Selector */}
            <div className="tree-type-selector">
              <button 
                onClick={() => setSelectedTreeType('procedural')}
                className={`tree-type-button ${selectedTreeType === 'procedural' ? 'active' : ''}`}
              >
                🎨 프로시저럴 나무
              </button>
              <button 
                onClick={() => setSelectedTreeType('asset')}
                className={`tree-type-button ${selectedTreeType === 'asset' ? 'active' : ''}`}
              >
                🖼️ 에셋 나무
              </button>
            </div>

            {/* Asset Tree Selection */}
            {selectedTreeType === 'asset' && (
              <div className="assets-grid">
                {treeAssets.map((tree) => (
                  <div 
                    key={tree.id}
                    className={`asset-card ${selectedAsset === tree.id ? 'selected' : ''}`}
                    onClick={() => setSelectedAsset(tree.id)}
                  >
                    <img 
                      src={tree.url} 
                      alt={tree.name}
                      className="asset-image"
                    />
                    <div className="asset-info">
                      <h4>{tree.name}</h4>
                      <p>{tree.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Current Tree Selection Info */}
            <div className="current-selection">
              <p>
                <strong>현재 선택:</strong> {' '}
                {selectedTreeType === 'procedural' 
                  ? '프로시저럴 디테일 나무 (코드로 생성)'
                  : treeAssets.find(t => t.id === selectedAsset)?.name || '선택된 나무 없음'
                }
              </p>
            </div>
          </div>
        )}

        {/* Animal Filter Options */}
        {selectedFilterType === 'animal' && (
          <div className="animal-selection-container">
            <h4>🐾 동물 선택하기</h4>
            
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
        )}
      </div>
    </div>
  );
};

export default TreeFaceFilter;
