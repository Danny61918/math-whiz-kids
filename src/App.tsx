import { useState } from 'react';
import { SetupScreen } from './components/SetupScreen';
import { GamePlayScreen } from './components/GamePlayScreen';
import { ShopScreen } from './components/ShopScreen';
import { SpaceScreen } from './components/SpaceScreen';
import { useGameStore } from './store/useGameStore';
import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState<'setup' | 'game' | 'shop' | 'space'>('setup');
  const { currentUserId } = useGameStore();

  const handleStartGame = () => {
    if (currentUserId) {
      setCurrentScreen('game');
    } else {
      alert('請先選擇或建立一個使用者！');
    }
  };

  const handleGoToShop = () => {
    if (currentUserId) {
      setCurrentScreen('shop');
    } else {
      alert('請先選擇或建立一個使用者！');
    }
  };

  const handleGoToSpace = () => {
    if (currentUserId) {
      setCurrentScreen('space');
    } else {
      alert('請先選擇或建立一個使用者！');
    }
  };

  const handleBackToSetup = () => {
    setCurrentScreen('setup');
  };

  return (
    <div className="App">
      {currentScreen === 'setup' && (
        <SetupScreen onStart={handleStartGame} onShop={handleGoToShop} onSpace={handleGoToSpace} />
      )}
      {currentScreen === 'game' && (
        <GamePlayScreen onBack={handleBackToSetup} />
      )}
      {currentScreen === 'shop' && (
        <ShopScreen onBack={handleBackToSetup} />
      )}
      {currentScreen === 'space' && (
        <SpaceScreen onBack={handleBackToSetup} />
      )}
    </div>
  );
}

export default App;
