import { createContext, useContext, useReducer, useEffect } from 'react';

const AppContext = createContext();

// localStorage 키
const STORAGE_KEY = 'first-credit-data';

// 초기 데이터
const defaultState = {
  mode: 'child', // 'child' | 'parent'
  balance: 50000, // 자녀 현재 잔액
  weeklyAllowance: 10000, // 주간 용돈
  futureDeductions: 0, // 미래 용돈에서 차감될 총액
  items: [ // 자녀가 등록한 상품 (기본 샘플)
    { id: '1', name: '레고 닌자고 세트', price: 45000, emoji: '🧱', createdAt: Date.now() - 86400000 },
    { id: '2', name: '포켓몬 카드팩', price: 8000, emoji: '🃏', createdAt: Date.now() - 43200000 },
    { id: '3', name: '아이스크림 케이크', price: 25000, emoji: '🍰', createdAt: Date.now() },
  ],
  requests: [], // 가불 요청 목록
  transactions: [ // 거래 내역
    { id: 't1', type: 'allowance', description: '주간 용돈 입금', amount: 10000, date: Date.now() - 604800000 },
    { id: 't2', type: 'purchase', description: '문구 세트 구매', amount: -5000, date: Date.now() - 259200000 },
    { id: 't3', type: 'allowance', description: '주간 용돈 입금', amount: 10000, date: Date.now() - 86400000 },
  ],
};

// localStorage에서 데이터 로드
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('localStorage 로드 실패:', e);
  }
  return defaultState;
}

// localStorage에 데이터 저장
function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('localStorage 저장 실패:', e);
  }
}

// 리듀서
function appReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_MODE':
      return { ...state, mode: state.mode === 'child' ? 'parent' : 'child' };

    case 'SET_MODE':
      return { ...state, mode: action.payload };

    case 'ADD_ITEM': {
      const newItem = {
        id: `item-${Date.now()}`,
        name: action.payload.name,
        price: action.payload.price,
        emoji: action.payload.emoji || '🛒',
        createdAt: Date.now(),
      };
      return { ...state, items: [newItem, ...state.items] };
    }

    case 'DELETE_ITEM':
      return { ...state, items: state.items.filter(item => item.id !== action.payload) };

    case 'PURCHASE_ITEM': {
      const item = state.items.find(i => i.id === action.payload);
      if (!item || state.balance < item.price) return state;
      const tx = {
        id: `t-${Date.now()}`,
        type: 'purchase',
        description: `${item.name} 구매`,
        amount: -item.price,
        date: Date.now(),
      };
      return {
        ...state,
        balance: state.balance - item.price,
        items: state.items.filter(i => i.id !== action.payload),
        transactions: [tx, ...state.transactions],
      };
    }

    case 'REQUEST_ADVANCE': {
      const newRequest = {
        id: `req-${Date.now()}`,
        itemName: action.payload.itemName,
        itemPrice: action.payload.itemPrice,
        shortfall: action.payload.shortfall,
        status: 'pending',
        createdAt: Date.now(),
      };
      return { ...state, requests: [newRequest, ...state.requests] };
    }

    case 'APPROVE_REQUEST': {
      const request = state.requests.find(r => r.id === action.payload);
      if (!request || request.status !== 'pending') return state;
      const tx = {
        id: `t-${Date.now()}`,
        type: 'advance',
        description: `[가불 승인] ${request.itemName}`,
        amount: request.shortfall,
        date: Date.now(),
      };
      const deductionTx = {
        id: `t-${Date.now()}-d`,
        type: 'deduction',
        description: `[미래 용돈 차감 예정] ${request.itemName}`,
        amount: -request.shortfall,
        date: Date.now(),
      };
      return {
        ...state,
        balance: state.balance + request.shortfall,
        futureDeductions: state.futureDeductions + request.shortfall,
        requests: state.requests.map(r =>
          r.id === action.payload ? { ...r, status: 'approved' } : r
        ),
        transactions: [deductionTx, tx, ...state.transactions],
      };
    }

    case 'REJECT_REQUEST':
      return {
        ...state,
        requests: state.requests.map(r =>
          r.id === action.payload ? { ...r, status: 'rejected' } : r
        ),
      };

    case 'ADD_ALLOWANCE': {
      const tx = {
        id: `t-${Date.now()}`,
        type: 'allowance',
        description: '용돈 입금',
        amount: action.payload,
        date: Date.now(),
      };
      return {
        ...state,
        balance: state.balance + action.payload,
        transactions: [tx, ...state.transactions],
      };
    }

    case 'RESET_DATA':
      return { ...defaultState };

    default:
      return state;
  }
}

// Provider 컴포넌트
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, null, loadState);

  // 상태가 변경될 때마다 localStorage에 자동 저장
  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// 커스텀 훅
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
