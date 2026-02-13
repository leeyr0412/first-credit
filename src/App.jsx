import { useApp } from './context/AppContext';
import Header from './components/Header';
import ChildView from './components/ChildView';
import ParentView from './components/ParentView';

function App() {
  const { state } = useApp();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {state.mode === 'child' ? <ChildView /> : <ParentView />}
    </div>
  );
}

export default App;
