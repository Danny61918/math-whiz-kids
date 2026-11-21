import { useState } from 'react';
import { SetupScreen } from './components/SetupScreen';
import { SkillSelectScreen } from './components/SkillSelectScreen';
import { GamePlayScreen } from './components/GamePlayScreen';
import { useCurrentUser } from './store/useGameStore';
import './App.css';

type Screen = 'setup' | 'skills' | 'game';

function App() {
  const [screen, setScreen] = useState<Screen>('setup');
  const [skillId, setSkillId] = useState<string | null>(null);
  const user = useCurrentUser();

  // Without a current user only the setup screen makes sense.
  const current: Screen = !user ? 'setup' : screen === 'game' && !skillId ? 'skills' : screen;

  return (
    <div className="App">
      {current === 'setup' && <SetupScreen onStart={() => setScreen('skills')} />}
      {current === 'skills' && (
        <SkillSelectScreen
          onBack={() => setScreen('setup')}
          onSelect={(id) => {
            setSkillId(id);
            setScreen('game');
          }}
        />
      )}
      {current === 'game' && skillId && (
        <GamePlayScreen key={skillId} skillId={skillId} onBack={() => setScreen('skills')} />
      )}
    </div>
  );
}

export default App;
