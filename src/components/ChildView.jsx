import { useState } from 'react';
import { useApp } from '../context/AppContext';

// 금액 포맷팅
function formatMoney(amount) {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

// 이모지 선택 옵션
const emojiOptions = ['🧸', '🎮', '📚', '🍰', '👟', '🎨', '⚽', '🎵', '🧱', '🃏', '🎁', '🛒'];

export default function ChildView() {
  const { state, dispatch } = useApp();
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', price: '', emoji: '🧸' });
  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'history'
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const pendingRequests = state.requests.filter(r => r.status === 'pending').length;

  // 성공 토스트
  function showToast(msg) {
    setSuccessMessage(msg);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  }

  // 상품 등록
  function handleAddItem(e) {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return;
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        name: newItem.name,
        price: parseInt(newItem.price),
        emoji: newItem.emoji,
      },
    });
    setNewItem({ name: '', price: '', emoji: '🧸' });
    setShowAddItem(false);
    showToast('위시리스트에 추가했어요! ✨');
  }

  // 구매 시도
  function handleBuy(item) {
    if (state.balance >= item.price) {
      dispatch({ type: 'PURCHASE_ITEM', payload: item.id });
      showToast(`${item.name} 구매 완료! 🎉`);
    } else {
      setSelectedItem(item);
      setShowAdvanceModal(true);
    }
  }

  // 가불 요청
  function handleAdvanceRequest() {
    if (!selectedItem) return;
    const shortfall = selectedItem.price - state.balance;
    dispatch({
      type: 'REQUEST_ADVANCE',
      payload: {
        itemName: selectedItem.name,
        itemPrice: selectedItem.price,
        shortfall,
      },
    });
    setShowAdvanceModal(false);
    setSelectedItem(null);
    showToast('부모님께 요청을 보냈어요! 📨');
  }

  return (
    <div className="bg-child-50 min-h-screen pb-6">
      {/* 성공 토스트 */}
      {showSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-semibold card-enter">
          {successMessage}
        </div>
      )}

      {/* 잔액 카드 */}
      <div className="mx-4 mt-4">
        <div className="bg-gradient-to-br from-child-400 to-child-500 rounded-2xl p-5 shadow-lg shadow-child-200">
          <p className="text-white/80 text-xs font-medium mb-1">내 용돈 잔액</p>
          <p className="text-white text-3xl font-extrabold tracking-tight">
            {formatMoney(state.balance)}
            <span className="text-lg font-bold ml-0.5">원</span>
          </p>
          <div className="mt-3 flex gap-3">
            <div className="bg-white/20 rounded-xl px-3 py-2 flex-1">
              <p className="text-white/70 text-[10px]">주간 용돈</p>
              <p className="text-white text-sm font-bold">{formatMoney(state.weeklyAllowance)}원</p>
            </div>
            {state.futureDeductions > 0 && (
              <div className="bg-red-500/30 rounded-xl px-3 py-2 flex-1">
                <p className="text-white/70 text-[10px]">가불 차감 예정</p>
                <p className="text-white text-sm font-bold">-{formatMoney(state.futureDeductions)}원</p>
              </div>
            )}
          </div>
          {pendingRequests > 0 && (
            <div className="mt-3 bg-white/20 rounded-lg px-3 py-2 text-white text-xs">
              📨 대기 중인 요청이 <span className="font-bold">{pendingRequests}건</span> 있어요
            </div>
          )}
        </div>
      </div>

      {/* 탭 전환 */}
      <div className="mx-4 mt-5 flex bg-child-100 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('items')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'items'
              ? 'bg-white text-child-600 shadow-sm'
              : 'text-child-400 hover:text-child-500'
          }`}
        >
          🛍️ 위시리스트
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-white text-child-600 shadow-sm'
              : 'text-child-400 hover:text-child-500'
          }`}
        >
          📋 거래 내역
        </button>
      </div>

      {/* 위시리스트 탭 */}
      {activeTab === 'items' && (
        <div className="mx-4 mt-4">
          {/* 상품 추가 버튼 */}
          <button
            onClick={() => setShowAddItem(true)}
            className="w-full border-2 border-dashed border-child-300 rounded-2xl py-4 text-child-500 font-bold text-sm hover:bg-child-100 transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-xl">+</span> 갖고 싶은 것 추가하기
          </button>

          {/* 상품 리스트 */}
          <div className="mt-3 space-y-3">
            {state.items.length === 0 && (
              <div className="text-center py-10 text-child-400">
                <p className="text-4xl mb-2">🎁</p>
                <p className="font-semibold">아직 위시리스트가 비어있어요</p>
                <p className="text-xs mt-1">갖고 싶은 것을 추가해보세요!</p>
              </div>
            )}
            {state.items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-child-100 card-enter"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-child-100 rounded-xl flex items-center justify-center text-2xl shrink-0">
                    {item.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-sm truncate">{item.name}</h3>
                    <p className="text-child-600 font-extrabold text-lg mt-0.5">
                      {formatMoney(item.price)}원
                    </p>
                    {state.balance < item.price && (
                      <p className="text-red-400 text-[11px] mt-1">
                        💸 {formatMoney(item.price - state.balance)}원 부족해요
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => handleBuy(item)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        state.balance >= item.price
                          ? 'bg-child-500 text-white hover:bg-child-600 shadow-sm shadow-child-200'
                          : 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm shadow-orange-200'
                      }`}
                    >
                      {state.balance >= item.price ? '구매하기' : '부모님 찬스'}
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'DELETE_ITEM', payload: item.id })}
                      className="px-4 py-1.5 rounded-xl text-[11px] text-gray-400 hover:text-red-400 hover:bg-red-50 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 거래 내역 탭 */}
      {activeTab === 'history' && (
        <div className="mx-4 mt-4 space-y-2">
          {state.transactions.length === 0 && (
            <div className="text-center py-10 text-child-400">
              <p className="text-4xl mb-2">📝</p>
              <p className="font-semibold">아직 거래 내역이 없어요</p>
            </div>
          )}
          {state.transactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 border border-child-100"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${
                  tx.type === 'allowance'
                    ? 'bg-green-100 text-green-600'
                    : tx.type === 'advance'
                    ? 'bg-blue-100 text-blue-600'
                    : tx.type === 'deduction'
                    ? 'bg-red-100 text-red-500'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {tx.type === 'allowance' ? '💰' : tx.type === 'advance' ? '🤝' : tx.type === 'deduction' ? '📉' : '🛒'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{tx.description}</p>
                <p className="text-[11px] text-gray-400">
                  {new Date(tx.date).toLocaleDateString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <p
                className={`text-sm font-extrabold ${
                  tx.amount >= 0 ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {tx.amount >= 0 ? '+' : ''}
                {formatMoney(tx.amount)}원
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 상품 추가 모달 */}
      {showAddItem && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center modal-overlay"
          onClick={() => setShowAddItem(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-w-[430px] p-6 modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h2 className="text-lg font-extrabold text-gray-800 mb-4">🎁 갖고 싶은 것 추가</h2>
            <form onSubmit={handleAddItem} className="space-y-4">
              {/* 이모지 선택 */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block">아이콘 선택</label>
                <div className="flex flex-wrap gap-2">
                  {emojiOptions.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewItem({ ...newItem, emoji })}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                        newItem.emoji === emoji
                          ? 'bg-child-400 scale-110 shadow-md'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              {/* 상품명 */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">상품 이름</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="예: 레고 닌자고 세트"
                  className="w-full px-4 py-3 rounded-xl border-2 border-child-200 focus:border-child-400 focus:outline-none text-sm bg-child-50"
                  autoFocus
                />
              </div>
              {/* 가격 */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">가격 (원)</label>
                <input
                  type="number"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  placeholder="예: 45000"
                  className="w-full px-4 py-3 rounded-xl border-2 border-child-200 focus:border-child-400 focus:outline-none text-sm bg-child-50"
                  min="0"
                />
              </div>
              <button
                type="submit"
                disabled={!newItem.name || !newItem.price}
                className="w-full py-3.5 bg-child-500 text-white rounded-2xl font-bold text-sm hover:bg-child-600 disabled:bg-gray-200 disabled:text-gray-400 transition-colors shadow-lg shadow-child-200"
              >
                위시리스트에 추가하기 ✨
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 가불 요청 모달 (부모님 찬스) */}
      {showAdvanceModal && selectedItem && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6 modal-overlay"
          onClick={() => setShowAdvanceModal(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-[380px] p-6 text-center modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-6xl mb-3">🪄</div>
            <h2 className="text-xl font-extrabold text-gray-800 mb-2">부모님 찬스!</h2>
            <p className="text-sm text-gray-500 mb-5">
              잔액이 부족해요. 부모님께 가불을 요청할까요?
            </p>

            <div className="bg-orange-50 rounded-2xl p-4 mb-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">상품</span>
                <span className="font-bold text-gray-800">{selectedItem.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">가격</span>
                <span className="font-bold text-gray-800">{formatMoney(selectedItem.price)}원</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">내 잔액</span>
                <span className="font-bold text-child-600">{formatMoney(state.balance)}원</span>
              </div>
              <div className="border-t border-orange-200 pt-2 flex justify-between text-sm">
                <span className="text-gray-500 font-bold">부족한 금액</span>
                <span className="font-extrabold text-red-500">
                  {formatMoney(selectedItem.price - state.balance)}원
                </span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 mb-4">
              승인되면 미래 용돈에서 자동으로 차감돼요 📆
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAdvanceModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAdvanceRequest}
                className="flex-1 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-2xl font-bold text-sm hover:from-orange-500 hover:to-orange-600 transition-colors shadow-lg shadow-orange-200"
              >
                요청 보내기 📨
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
