import { useState } from 'react';
import { useApp } from '../context/AppContext';

// 금액 포맷팅
function formatMoney(amount) {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

export default function ParentView() {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'overview' | 'history'
  const [showAllowanceModal, setShowAllowanceModal] = useState(false);
  const [allowanceAmount, setAllowanceAmount] = useState('');
  const [showConfirm, setShowConfirm] = useState(null); // { type: 'approve'|'reject', requestId }
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const pendingRequests = state.requests.filter(r => r.status === 'pending');
  const processedRequests = state.requests.filter(r => r.status !== 'pending');

  function toast(msg) {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }

  // 승인 처리
  function handleApprove(requestId) {
    dispatch({ type: 'APPROVE_REQUEST', payload: requestId });
    setShowConfirm(null);
    toast('가불 요청을 승인했습니다 ✅');
  }

  // 거절 처리
  function handleReject(requestId) {
    dispatch({ type: 'REJECT_REQUEST', payload: requestId });
    setShowConfirm(null);
    toast('가불 요청을 거절했습니다');
  }

  // 용돈 입금
  function handleAddAllowance(e) {
    e.preventDefault();
    if (!allowanceAmount) return;
    dispatch({ type: 'ADD_ALLOWANCE', payload: parseInt(allowanceAmount) });
    setAllowanceAmount('');
    setShowAllowanceModal(false);
    toast('용돈을 입금했습니다 💰');
  }

  return (
    <div className="bg-parent-50 min-h-screen pb-6">
      {/* 토스트 */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-parent-600 text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-semibold card-enter">
          {toastMsg}
        </div>
      )}

      {/* 대시보드 카드 */}
      <div className="mx-4 mt-4">
        <div className="bg-gradient-to-br from-parent-500 to-parent-600 rounded-2xl p-5 shadow-lg shadow-parent-200">
          <p className="text-white/70 text-xs font-medium mb-1">자녀 잔액 현황</p>
          <p className="text-white text-3xl font-extrabold tracking-tight">
            {formatMoney(state.balance)}
            <span className="text-lg font-bold ml-0.5">원</span>
          </p>
          <div className="mt-3 flex gap-3">
            <div className="bg-white/20 rounded-xl px-3 py-2 flex-1">
              <p className="text-white/70 text-[10px]">주간 용돈</p>
              <p className="text-white text-sm font-bold">{formatMoney(state.weeklyAllowance)}원</p>
            </div>
            <div
              className={`rounded-xl px-3 py-2 flex-1 ${
                state.futureDeductions > 0 ? 'bg-red-500/30' : 'bg-white/20'
              }`}
            >
              <p className="text-white/70 text-[10px]">가불 차감 예정</p>
              <p className="text-white text-sm font-bold">
                {state.futureDeductions > 0 ? '-' : ''}
                {formatMoney(state.futureDeductions)}원
              </p>
            </div>
          </div>
          {/* 용돈 입금 버튼 */}
          <button
            onClick={() => setShowAllowanceModal(true)}
            className="mt-3 w-full bg-white/20 hover:bg-white/30 text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            💸 용돈 입금하기
          </button>
        </div>
      </div>

      {/* 알림 배지 */}
      {pendingRequests.length > 0 && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 card-enter">
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
            {pendingRequests.length}
          </div>
          <div>
            <p className="text-sm font-bold text-red-700">새로운 가불 요청</p>
            <p className="text-[11px] text-red-500">자녀의 요청을 확인해주세요</p>
          </div>
        </div>
      )}

      {/* 탭 전환 */}
      <div className="mx-4 mt-4 flex bg-parent-100 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all relative ${
            activeTab === 'requests'
              ? 'bg-white text-parent-600 shadow-sm'
              : 'text-parent-400 hover:text-parent-500'
          }`}
        >
          📬 요청 관리
          {pendingRequests.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {pendingRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-white text-parent-600 shadow-sm'
              : 'text-parent-400 hover:text-parent-500'
          }`}
        >
          📋 전체 내역
        </button>
      </div>

      {/* 요청 관리 탭 */}
      {activeTab === 'requests' && (
        <div className="mx-4 mt-4 space-y-4">
          {/* 대기 중인 요청 */}
          {pendingRequests.length === 0 && processedRequests.length === 0 && (
            <div className="text-center py-12 text-parent-400">
              <p className="text-4xl mb-2">✅</p>
              <p className="font-semibold">처리할 요청이 없습니다</p>
              <p className="text-xs mt-1">자녀의 가불 요청이 여기에 표시됩니다</p>
            </div>
          )}

          {pendingRequests.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-parent-500 uppercase tracking-wider mb-2">
                ⏳ 대기 중
              </h3>
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white rounded-2xl p-4 shadow-sm border-2 border-orange-200 card-enter"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-gray-800">{req.itemName}</h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {new Date(req.createdAt).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span className="bg-orange-100 text-orange-600 text-[11px] font-bold px-2.5 py-1 rounded-full">
                        대기 중
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">상품 가격</span>
                        <span className="font-bold">{formatMoney(req.itemPrice)}원</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">요청 금액 (가불)</span>
                        <span className="font-extrabold text-red-500">{formatMoney(req.shortfall)}원</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-3">
                      💡 승인 시 미래 용돈에서 {formatMoney(req.shortfall)}원이 차감됩니다
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowConfirm({ type: 'reject', requestId: req.id })}
                        className="flex-1 py-2.5 bg-gray-100 text-gray-500 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
                      >
                        거절
                      </button>
                      <button
                        onClick={() => setShowConfirm({ type: 'approve', requestId: req.id })}
                        className="flex-1 py-2.5 bg-parent-500 text-white rounded-xl text-sm font-bold hover:bg-parent-600 transition-colors shadow-sm shadow-parent-200"
                      >
                        승인하기 ✅
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 처리 완료 요청 */}
          {processedRequests.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6">
                처리 완료
              </h3>
              <div className="space-y-2">
                {processedRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white/70 rounded-xl px-4 py-3 flex items-center gap-3 border border-gray-100"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        req.status === 'approved'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-500'
                      }`}
                    >
                      {req.status === 'approved' ? '✅' : '❌'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-600 truncate">{req.itemName}</p>
                      <p className="text-[11px] text-gray-400">
                        {formatMoney(req.shortfall)}원 •{' '}
                        {req.status === 'approved' ? '승인됨' : '거절됨'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 전체 내역 탭 */}
      {activeTab === 'history' && (
        <div className="mx-4 mt-4 space-y-2">
          {state.transactions.length === 0 && (
            <div className="text-center py-10 text-parent-400">
              <p className="text-4xl mb-2">📝</p>
              <p className="font-semibold">거래 내역이 없습니다</p>
            </div>
          )}
          {state.transactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 border border-parent-100"
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
                {tx.type === 'allowance'
                  ? '💰'
                  : tx.type === 'advance'
                  ? '🤝'
                  : tx.type === 'deduction'
                  ? '📉'
                  : '🛒'}
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

      {/* 승인/거절 확인 모달 */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6 modal-overlay"
          onClick={() => setShowConfirm(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-[380px] p-6 text-center modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl mb-3">
              {showConfirm.type === 'approve' ? '✅' : '🚫'}
            </div>
            <h2 className="text-xl font-extrabold text-gray-800 mb-2">
              {showConfirm.type === 'approve' ? '가불을 승인할까요?' : '가불을 거절할까요?'}
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              {showConfirm.type === 'approve'
                ? '승인하면 자녀의 잔액이 증가하고, 미래 용돈에서 차감됩니다.'
                : '거절하면 자녀에게 알림이 전달됩니다.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() =>
                  showConfirm.type === 'approve'
                    ? handleApprove(showConfirm.requestId)
                    : handleReject(showConfirm.requestId)
                }
                className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-colors shadow-lg ${
                  showConfirm.type === 'approve'
                    ? 'bg-parent-500 text-white hover:bg-parent-600 shadow-parent-200'
                    : 'bg-red-500 text-white hover:bg-red-600 shadow-red-200'
                }`}
              >
                {showConfirm.type === 'approve' ? '승인' : '거절'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 용돈 입금 모달 */}
      {showAllowanceModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center modal-overlay"
          onClick={() => setShowAllowanceModal(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-w-[430px] p-6 modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h2 className="text-lg font-extrabold text-gray-800 mb-4">💸 용돈 입금</h2>
            <form onSubmit={handleAddAllowance} className="space-y-4">
              {/* 빠른 선택 */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block">빠른 선택</label>
                <div className="grid grid-cols-3 gap-2">
                  {[5000, 10000, 20000, 30000, 50000, 100000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAllowanceAmount(String(amt))}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                        allowanceAmount === String(amt)
                          ? 'bg-parent-500 text-white shadow-md'
                          : 'bg-parent-50 text-parent-600 hover:bg-parent-100 border border-parent-200'
                      }`}
                    >
                      {formatMoney(amt)}원
                    </button>
                  ))}
                </div>
              </div>
              {/* 직접 입력 */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">직접 입력 (원)</label>
                <input
                  type="number"
                  value={allowanceAmount}
                  onChange={(e) => setAllowanceAmount(e.target.value)}
                  placeholder="금액을 입력하세요"
                  className="w-full px-4 py-3 rounded-xl border-2 border-parent-200 focus:border-parent-400 focus:outline-none text-sm bg-parent-50"
                  min="0"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!allowanceAmount || parseInt(allowanceAmount) <= 0}
                className="w-full py-3.5 bg-parent-500 text-white rounded-2xl font-bold text-sm hover:bg-parent-600 disabled:bg-gray-200 disabled:text-gray-400 transition-colors shadow-lg shadow-parent-200"
              >
                입금하기 💰
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
