import { useEffect, useState } from 'react';
import { SetupScreen } from './components/SetupScreen';
import { MapScreen } from './components/MapScreen';
import { GamePlayScreen } from './components/GamePlayScreen';
import { AlbumScreen } from './components/AlbumScreen';
import { BlitzScreen } from './components/BlitzScreen';
import { NumberChartScreen } from './components/NumberChartScreen';
import { PackOpenModal } from './components/PackOpenModal';
import { useCurrentUser, useLanguage } from './store/useGameStore';

type Screen = 'setup' | 'map' | 'game' | 'album' | 'chart' | 'blitz';

function App() {
  const [screen, setScreen] = useState<Screen>('setup');
  const [skillId, setSkillId] = useState<string | null>(null);
  const [packOpen, setPackOpen] = useState(false);
  const user = useCurrentUser();
  const language = useLanguage();

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Without a current user only the setup screen makes sense.
  const current: Screen = !user ? 'setup' : screen === 'game' && !skillId ? 'map' : screen;

  return (
    <div className="App">
      {current === 'setup' && <SetupScreen onStart={() => setScreen('map')} />}
      {current === 'map' && (
        <MapScreen
          onBack={() => setScreen('setup')}
          onAlbum={() => setScreen('album')}
          onChart={() => setScreen('chart')}
          onBlitz={() => setScreen('blitz')}
          onOpenPack={() => setPackOpen(true)}
          onSelect={(id) => {
            setSkillId(id);
            setScreen('game');
          }}
        />
      )}
      {current === 'game' && skillId && (
        <GamePlayScreen
          key={skillId}
          skillId={skillId}
          onBack={() => setScreen('map')}
          onNext={setSkillId}
          onOpenPack={() => setPackOpen(true)}
        />
      )}
      {current === 'chart' && <NumberChartScreen onBack={() => setScreen('map')} />}
      {current === 'blitz' && <BlitzScreen onBack={() => setScreen('map')} />}
      {current === 'album' && <AlbumScreen onBack={() => setScreen('map')} />}
      {packOpen && user && <PackOpenModal onClose={() => setPackOpen(false)} />}
    </div>
  );
}

export default App;
