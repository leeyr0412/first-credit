import { useApp } from '../context/AppContext';

export default function Header() {
  const { state, dispatch } = useApp();
  const isChild = state.mode === 'child';

  return (
    <header
      className={`sticky top-0 z-50 theme-transition ${
        isChild
          ? 'bg-gradient-to-r from-child-400 to-child-500'
          : 'bg-gradient-to-r from-parent-500 to-parent-600'
      }`}
    >
      <div className="px-4 py-3 flex items-center justify-between">
        {/* 로고 영역 */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">{isChild ? '🌟' : '🏦'}</span>
          <div>
            <h1 className="text-white text-base font-bold leading-tight tracking-tight">
              퍼스트 크레딧
            </h1>
            <p className="text-white/70 text-[10px] font-medium tracking-wider uppercase">
              First Credit
            </p>
          </div>
        </div>

        {/* 모드 토글 */}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_MODE' })}
          className="relative flex items-center rounded-full p-1 w-[140px] h-[38px] transition-all duration-300 bg-white/20 hover:bg-white/30"
        >
          <div
            className={`absolute h-[30px] w-[66px] rounded-full bg-white shadow-md transition-all duration-300 ease-in-out ${
              isChild ? 'left-1' : 'left-[70px]'
            }`}
          />
          <span
            className={`relative z-10 flex-1 text-center text-xs font-bold transition-colors duration-300 ${
              isChild ? 'text-child-600' : 'text-white/80'
            }`}
          >
            👦 자녀
          </span>
          <span
            className={`relative z-10 flex-1 text-center text-xs font-bold transition-colors duration-300 ${
              !isChild ? 'text-parent-600' : 'text-white/80'
            }`}
          >
            👨‍👩‍👧 부모
          </span>
        </button>
      </div>

      {/* 하단 정보 바 */}
      <div
        className={`flex items-center justify-between px-4 py-1.5 text-[11px] font-semibold theme-transition ${
          isChild
            ? 'bg-child-600/30 text-white'
            : 'bg-parent-700/30 text-white'
        }`}
      >
        <span>
          {isChild ? '🎒 자녀 모드로 보고 있어요' : '📋 부모 모드로 관리 중이에요'}
        </span>
        <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
          📅 {state.currentWeek}주차
        </span>
      </div>
    </header>
  );
}
