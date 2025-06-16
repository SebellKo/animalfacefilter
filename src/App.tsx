import { useState } from "react";
import "./App.css";
import FaceRecognition from "./components/FaceRecognition";
import AnimalFaceFilter from "./components/AnimalFaceFilter";

function App() {
  const [currentMode, setCurrentMode] = useState<'mesh' | 'animal'>('animal');

  return (
    <div className="app">
      <header className="app-header">
        <h1>Face Recognition with Animal Filters</h1>
        <p>Real-time face detection with mesh overlay and animal filter</p>
        
        <div className="mode-selector">
          <button 
            onClick={() => setCurrentMode('mesh')}
            className={`mode-button ${currentMode === 'mesh' ? 'active' : ''}`}
          >
            Face Mesh
          </button>
          <button 
            onClick={() => setCurrentMode('animal')}
            className={`mode-button ${currentMode === 'animal' ? 'active' : ''}`}
          >
            🐾 Animal Filter
          </button>
        </div>
      </header>
      
      <main className="app-main">
        {currentMode === 'mesh' ? (
          <FaceRecognition />
        ) : (
          <AnimalFaceFilter />
        )}
      </main>
      
      <footer className="app-footer">
        <p>Powered by MediaPipe Face Mesh & React</p>
      </footer>
    </div>
  );
}

export default App;
