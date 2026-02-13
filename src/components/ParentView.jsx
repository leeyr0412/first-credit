import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { calcFutureDeductions, checkDSRExceeded } from '../context/constants.js';
import TermBadge from './TermModal';

// ─── 금액 포맷팅 ───
function formatMoney(amount) {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

export default function ParentView() {
  const { state, dispatch, creditLimit, currentWeeklyRepayment } = useApp();
  const futureDeductions = calcFutureDeductions(state.requests);

  // ─── 로컬 UI 상태 ───
  const [activeTab, setActiveTab] = useState('requests');
  const [showAllowanceModal, setShowAllowanceModal] = useState(false);
  const [allowanceAmount, setAllowanceAmount] = useState('');
  const [showDecisionModal, setShowDecisionModal] = useState(null); // request object
  const [parentMessage, setParentMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showWeekConfirm, setShowWeekConfirm] = useState(false);
  const [showWeeklySettings, setShowWeeklySettings] = useState(false);
  const [newWeeklyAmount, setNewWeeklyAmount] = useState('');
  const [showDsrAlert, setShowDsrAlert] = useState(false);

  const pendingRequests = state.requests.filter(r => r.status === 'pending');
  const holdRequests = state.requests.filter(r => r.status === 'hold');
  const activeContracts = state.requests.filter(r => r.status === 'approved');
  const completedContracts = state.requests.filter(r => ['completed', 'rejected'].includes(r.status));

  function toast(msg) {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  }

  // ─── 의사결정 핸들러 ───
  function handleApprove() {
    // DSR 재검증: 승인 시점에서 한도 초과 여부 체크
    if (showDecisionModal && checkDSRExceeded(state.requests, state.weeklyAllowance, showDecisionModal.weeklyPrice)) {
      setShowDsrAlert(true);
      return;
    }
    dispatch({ type: 'APPROVE_REQUEST', payload: { requestId: showDecisionModal.id, message: parentMessage } });
    setShowDecisionModal(null);
    setParentMessage('');
    toast('할부 계약을 승인했습니다 ✅');
  }
  function handleReject() {
    dispatch({ type: 'REJECT_REQUEST', payload: { requestId: showDecisionModal.id, message: parentMessage } });
    setShowDecisionModal(null);
    setParentMessage('');
    toast('요청을 거절했습니다');
  }
  function handleHold() {
    dispatch({ type: 'HOLD_REQUEST', payload: { requestId: showDecisionModal.id, message: parentMessage } });
    setShowDecisionModal(null);
    setParentMessage('');
    toast('요청을 보류했습니다 🤔');
  }
  function handleGift() {
    dispatch({ type: 'GIFT_REQUEST', payload: { requestId: showDecisionModal.id, message: parentMessage || '사랑하는 우리 아이에게 선물!' } });
    setShowDecisionModal(null);
    setParentMessage('');
    toast('선물로 사주셨어요! 🎁💕');
  }

  // ─── 1주일 지나기 ───
  function handleAdvanceWeek() {
    dispatch({ type: 'ADVANCE_WEEK' });
    setShowWeekConfirm(false);
    toast(`${state.currentWeek + 1}주차가 되었어요! 📅`);
  }

  // ─── 용돈 입금 ───
  function handleAddAllowance(e) {
    e.preventDefault();
    if (!allowanceAmount) return;
    dispatch({ type: 'ADD_ALLOWANCE', payload: parseInt(allowanceAmount) });
    setAllowanceAmount('');
    setShowAllowanceModal(false);
    toast('용돈을 입금했습니다 💰');
  }

  // ─── 주간 용돈 설정 ───
  function handleSetWeekly(e) {
    e.preventDefault();
    if (!newWeeklyAmount) return;
    dispatch({ type: 'SET_WEEKLY_ALLOWANCE', payload: parseInt(newWeeklyAmount) });
    setShowWeeklySettings(false);
    setNewWeeklyAmount('');
    toast('주간 용돈이 변경되었습니다');
  }

  return (
    <div className="bg-parent-50 min-h-screen pb-6">
      {/* 토스트 */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-parent-600 text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-semibold card-enter">
          {toastMsg}
        </div>
      )}

      {/* ═══════ 대시보드 카드 ═══════ */}
      <div className="mx-4 mt-4 !p-1">
        <div className="bg-gradient-to-br from-parent-500 to-parent-600 rounded-xl p-5 shadow-lg shadow-parent-200 overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <p className="text-white/70 text-xs font-medium ml-1">자녀 잔액 현황</p>
            <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              📅 {state.currentWeek}주차
            </span>
          </div>
          <p className="text-white text-3xl font-extrabold tracking-tight">
            {formatMoney(state.balance)}
            <span className="text-lg font-bold ml-0.5">원</span>
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="bg-white/20 rounded-xl !px-3 !py-2 overflow-hidden">
              <p className="text-white/70 text-[10px]">주간 용돈</p>
              <p className="text-white text-sm font-bold">{formatMoney(state.weeklyAllowance)}원</p>
            </div>
            <div className="bg-white/20 rounded-xl !px-3 !py-2 overflow-hidden">
              <p className="text-white/70 text-[10px] flex items-center">
                신용 한도
                {/*<TermBadge termKey="LIMIT" variant="parent" />*/}
              </p>
              <p className="text-white text-sm font-bold">{formatMoney(creditLimit)}원</p>
            </div>
            <div className={`rounded-xl !px-3 !py-2 overflow-hidden ${futureDeductions > 0 ? 'bg-red-500/30' : 'bg-white/20'}`}>
              <p className="text-white/70 text-[10px]">남은 총 상환액</p>
              <p className="text-white text-sm font-bold">
                {futureDeductions > 0 ? '-' : ''}{formatMoney(futureDeductions)}원
              </p>
            </div>
            <div className={`rounded-xl !px-3 !py-2 overflow-hidden ${currentWeeklyRepayment > 0 ? 'bg-orange-500/30' : 'bg-white/20'}`}>
              <p className="text-white/70 text-[10px] flex items-center">
                매주 할부 차감
                {/*<TermBadge termKey="INSTALLMENT" variant="parent" />*/}
              </p>
              <p className="text-white text-sm font-bold">
                {currentWeeklyRepayment > 0 ? '-' : ''}{formatMoney(currentWeeklyRepayment)}원
              </p>
            </div>
          </div>

          {/* DSR 현황 */}
          {currentWeeklyRepayment > 0 && (
            <div className="!mt-3 bg-white/15 rounded-xl !px-3 !py-2 overflow-hidden">
              <div className="flex items-center justify-between text-[10px] text-white/70 mb-1">
                <span className="flex items-center gap-0.5">
                  DSR 현황
                  {/*<TermBadge termKey="DSR" variant="parent" />*/}
                </span>
                <span>{Math.round((currentWeeklyRepayment / state.weeklyAllowance) * 100)}% / 50%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    (currentWeeklyRepayment / state.weeklyAllowance) > 0.4 ? 'bg-red-400' : 'bg-green-400'
                  }`}
                  style={{ width: `${Math.min(100, (currentWeeklyRepayment *2 / state.weeklyAllowance) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* 버튼 그룹 */}
          <div className="!mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowWeekConfirm(true)}
              className="bg-white/30 hover:bg-white/40 text-white py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
            >
              ⏩ 1주일 지나기
            </button>
            <button
              onClick={() => setShowAllowanceModal(true)}
              className="bg-white/20 hover:bg-white/30 text-white py-2.5 rounded-xl text-xs font-bold transition-colors"
            >
              💸 용돈 입금
            </button>
          </div>
          <button
            onClick={() => { setNewWeeklyAmount(String(state.weeklyAllowance)); setShowWeeklySettings(true); }}
            className="!mt-2 w-full bg-white/10 hover:bg-white/20 text-white/70 py-2 rounded-xl text-[11px] font-medium transition-colors"
          >
            ⚙️ 주간 용돈 금액 설정
          </button>
        </div>
      </div>

      {/* 알림 배지 */}
      {pendingRequests.length > 0 && (
        <div className="!mx-4 !mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 card-enter overflow-hidden">
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
            {pendingRequests.length}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-red-700">새로운 요청이 도착했어요!</p>
            <p className="text-[11px] text-red-500">자녀의 할부/대출 요청을 확인해주세요</p>
          </div>
        </div>
      )}

      {/* ─── 탭 전환 ─── */}
      <div className="!mx-4 !mt-4 flex bg-parent-100 rounded-xl p-1 overflow-hidden">
        {[
          { key: 'requests', label: '📬 요청 관리', badge: pendingRequests.length + holdRequests.length },
          { key: 'contracts', label: '📄 요청/대출 현황' },
          { key: 'history', label: '📋 거래 내역' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all relative ${
              activeTab === tab.key
                ? 'bg-white text-parent-600 shadow-sm'
                : 'text-parent-400 hover:text-parent-500'
            }`}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════ 요청 관리 탭 ═══════ */}
      {activeTab === 'requests' && (
        <div className="!mx-4 !mt-4 space-y-4">
          {pendingRequests.length === 0 && holdRequests.length === 0 && (
            <div className="text-center py-12 text-parent-400">
              <p className="text-4xl mb-2">✅</p>
              <p className="font-semibold">처리할 요청이 없습니다</p>
              <p className="text-xs !mt-1">자녀의 할부/대출 요청이 여기에 표시됩니다</p>
            </div>
          )}

          {/* 대기 중 */}
          {pendingRequests.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-parent-500 uppercase tracking-wider !mb-2">⏳ 대기 중</h3>
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <RequestCard key={req.id} req={req} onDecide={() => { setShowDecisionModal(req); setParentMessage(''); }} />
                ))}
              </div>
            </div>
          )}

          {/* 보류 */}
          {holdRequests.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-yellow-600 uppercase tracking-wider !mb-2 !mt-4">🤔 보류 중</h3>
              <div className="space-y-3">
                {holdRequests.map((req) => (
                  <RequestCard key={req.id} req={req} onDecide={() => { setShowDecisionModal(req); setParentMessage(''); }} isHold />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ 요청/대출 탭 ═══════ */}
      {activeTab === 'contracts' && (
        <div className="!mx-4 !mt-4 space-y-3">
          {activeContracts.length === 0 && completedContracts.length === 0 && (
            <div className="text-center !py-12 text-parent-400">
              <p className="text-4xl !mb-2">📄</p>
              <p className="font-semibold">계약 내역이 없습니다</p>
            </div>
          )}

          {activeContracts.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-parent-500 uppercase tracking-wider mb-2">🔄 상환 진행 중</h3>
              {activeContracts.map(req => {
                const progress = Math.round((req.repaidWeeks / req.installmentWeeks) * 100);
                const remaining = (req.installmentWeeks - req.repaidWeeks) * req.weeklyPrice;
                return (
                  <div key={req.id} className="bg-white rounded-2xl !p-4 shadow-sm border border-parent-100 mb-3 card-enter overflow-hidden">
                    <div className="flex items-center justify-between !mb-2 gap-2">
                      <h4 className="font-bold text-gray-800 text-sm truncate min-w-0 flex-1">{req.name}</h4>
                      <span className={`text-[10px] font-bold !px-2 !py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                        req.type === 'loan' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {req.type === 'loan' ? '대출' : '할부 구매'}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-xs overflow-hidden">
                      <div className="flex justify-between"><span className="text-gray-500">원금</span><span className="font-bold">{formatMoney(req.price)}원</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">총 상환 (이자 포함)</span><span className="font-bold text-orange-600">{formatMoney(req.totalRepayment)}원</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">매주 차감</span><span className="font-bold text-red-500">-{formatMoney(req.weeklyPrice)}원</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">남은 금액</span><span className="font-bold">{formatMoney(remaining)}원</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">진행</span><span className="font-bold">{req.repaidWeeks} / {req.installmentWeeks}주</span></div>
                    </div>
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-parent-400 to-parent-500 h-2.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 text-right">{progress}% 상환</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {completedContracts.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider !mb-2 !mt-4">처리 완료</h3>
              {completedContracts.map(req => (
                <div key={req.id} className="bg-white/70 rounded-xl p-4 flex items-center gap-3 border border-gray-100 mb-2 overflow-hidden">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
                    req.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
                  }`}>
                    {req.status === 'completed' ? '✅' : '❌'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-600 truncate">{req.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {formatMoney(req.price)}원 · {req.status === 'completed' ? '상환 완료' : '거절됨'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════ 전체 내역 탭 ═══════ */}
      {activeTab === 'history' && (
        <div className="!mx-4 !mt-4 space-y-2">
          {state.transactions.length === 0 && (
            <div className="text-center py-10 text-parent-400">
              <p className="text-4xl !mb-2">📝</p>
              <p className="font-semibold">거래 내역이 없습니다</p>
            </div>
          )}
          {state.transactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-white rounded-xl !p-4 flex items-center gap-3 border border-parent-100 overflow-hidden"
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 ${
                tx.type === 'allowance' ? 'bg-green-100 text-green-600'
                : tx.type === 'advance' ? 'bg-blue-100 text-blue-600'
                : tx.type === 'deduction' ? 'bg-red-100 text-red-500'
                : tx.type === 'gift' ? 'bg-pink-100 text-pink-500'
                : tx.type === 'info' ? 'bg-blue-50 text-blue-400'
                : 'bg-gray-100 text-gray-500'
              }`}>
                {tx.type === 'allowance' ? '💰'
                  : tx.type === 'advance' ? '🤝'
                  : tx.type === 'deduction' ? '📉'
                  : tx.type === 'gift' ? '🎁'
                  : tx.type === 'info' ? 'ℹ️'
                  : '🛒'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{tx.description}</p>
                <p className="text-[11px] text-gray-400">
                  {new Date(tx.date).toLocaleDateString('ko-KR', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <p className={`text-sm font-extrabold shrink-0 ${
                tx.amount > 0 ? 'text-green-500' : tx.amount < 0 ? 'text-red-500' : 'text-gray-400'
              }`}>
                {tx.amount > 0 ? '+' : ''}{formatMoney(tx.amount)}원
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ═══════ 의사결정 모달 (4가지 옵션) ═══════ */}
      {showDecisionModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center modal-overlay"
          onClick={() => setShowDecisionModal(null)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-w-[430px] p-6 modal-content max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

            {/* 요청 요약 */}
            <div className="text-center mb-4">
              <span className="text-4xl">{showDecisionModal.type === 'loan' ? '💰' : '🛍️'}</span>
              <h2 className="text-lg font-extrabold text-gray-800 mt-2 break-words px-2">{showDecisionModal.name}</h2>
              <p className="text-xs text-gray-400">
                {showDecisionModal.type === 'loan' ? '대출 요청' : '할부 구매 요청'}
              </p>
            </div>

            {/* 자녀가 작성한 사유 — 눈에 띄게 */}
            {showDecisionModal.reason && (
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-4 mb-4 overflow-hidden">
                <p className="text-[11px] font-bold text-yellow-700 mb-1">💌 자녀가 이렇게 말했어요:</p>
                <p className="text-sm text-gray-700 leading-relaxed italic break-words">
                  &quot;{showDecisionModal.reason}&quot;
                </p>
              </div>
            )}

            {/* 계약 상세 */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-2 text-sm overflow-hidden">
              <div className="flex justify-between">
                <span className="text-gray-500">원금</span>
                <span className="font-bold">{formatMoney(showDecisionModal.price)}원</span>
              </div>
              <div className="flex justify-between items-center gap-1">
                <span className="text-gray-500 flex items-center">이자 (10%)<TermBadge termKey="INTEREST" variant="parent" /></span>
                <span className="font-bold text-orange-500">+{formatMoney(showDecisionModal.totalRepayment - showDecisionModal.price)}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">총 상환액</span>
                <span className="font-extrabold text-orange-600">{formatMoney(showDecisionModal.totalRepayment)}원</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between items-center gap-1">
                <span className="text-gray-500 flex items-center">할부 기간<TermBadge termKey="INSTALLMENT" variant="parent" /></span>
                <span className="font-bold">{showDecisionModal.installmentWeeks}주</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">매주 차감</span>
                <span className="font-extrabold text-red-500">-{formatMoney(showDecisionModal.weeklyPrice)}원</span>
              </div>
            </div>

            {/* 메시지 입력 */}
            <div className="mb-4">
              <label className="text-xs font-bold text-gray-500 mb-1 block">아이에게 전할 메시지 (선택)</label>
              <textarea
                value={parentMessage}
                onChange={(e) => setParentMessage(e.target.value)}
                placeholder="예: 잘 생각했구나! 약속 잘 지키자."
                className="w-full px-4 py-3 rounded-xl border-2 border-parent-200 focus:border-parent-400 focus:outline-none text-sm bg-parent-50 resize-none h-16"
              />
            </div>

            {/* 4가지 버튼 */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleApprove}
                className="py-3 bg-parent-500 text-white rounded-2xl font-bold text-sm hover:bg-parent-600 transition-colors shadow-md flex flex-col items-center gap-0.5"
              >
                <span className="text-lg">✅</span>
                <span>승인</span>
              </button>
              <button
                onClick={handleGift}
                className="py-3 bg-gradient-to-br from-pink-400 to-pink-500 text-white rounded-2xl font-bold text-sm hover:from-pink-500 hover:to-pink-600 transition-all shadow-md flex flex-col items-center gap-0.5"
              >
                <span className="text-lg">🎁</span>
                <span>선물로 사주기</span>
              </button>
              <button
                onClick={handleHold}
                className="py-3 bg-yellow-100 text-yellow-700 rounded-2xl font-bold text-sm hover:bg-yellow-200 transition-colors flex flex-col items-center gap-0.5"
              >
                <span className="text-lg">🤔</span>
                <span>보류</span>
              </button>
              <button
                onClick={handleReject}
                className="py-3 bg-gray-100 text-gray-500 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-colors flex flex-col items-center gap-0.5"
              >
                <span className="text-lg">🚫</span>
                <span>거절</span>
              </button>
            </div>

            <p className="text-[10px] text-gray-400 text-center mt-3">
              ✅ 승인: 할부 시작 · 🎁 선물: 부모 부담 · 🤔 보류: 나중에 결정 · 🚫 거절: 신청 취소
            </p>
          </div>
        </div>
      )}

      {/* ═══════ DSR 한도 초과 경고 모달 ═══════ */}
      {showDsrAlert && (
        <div
          className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center px-6 modal-overlay"
          onClick={() => setShowDsrAlert(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-[340px] p-6 text-center modal-content overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl mb-3">🚨</div>
            <h2 className="text-lg font-extrabold text-red-600 mb-2">승인 불가</h2>
            <p className="text-sm text-gray-600 mb-2 leading-relaxed">
              자녀의 주간 상환 한도를 초과하여 승인할 수 없습니다.
            </p>
            <div className="bg-red-50 rounded-xl p-3 mb-4 text-xs text-left space-y-1 overflow-hidden">
              <div className="flex justify-between">
                <span className="text-gray-500">현재 주당 상환액</span>
                <span className="font-bold text-red-500">{formatMoney(currentWeeklyRepayment)}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">이 건 추가 시</span>
                <span className="font-bold text-red-500">+{formatMoney(showDecisionModal?.weeklyPrice || 0)}원</span>
              </div>
              <div className="border-t border-red-200 pt-1 flex justify-between">
                <span className="text-gray-600 font-bold">DSR 한도 (50%)</span>
                <span className="font-bold text-parent-600">{formatMoney(Math.floor(state.weeklyAllowance * 0.5))}원</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mb-4">
              기존 상환 건이 완료된 후 다시 시도하거나, 거절/보류를 선택하세요.
            </p>
            <button
              onClick={() => setShowDsrAlert(false)}
              className="w-full py-3 bg-parent-500 text-white rounded-2xl font-bold text-sm hover:bg-parent-600 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* ═══════ 1주일 지나기 확인 모달 ═══════ */}
      {showWeekConfirm && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6 modal-overlay"
          onClick={() => setShowWeekConfirm(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-[380px] p-6 text-center modal-content overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl mb-3">📅</div>
            <h2 className="text-xl font-extrabold text-gray-800 mb-2">
              {state.currentWeek}주차 → {state.currentWeek + 1}주차
            </h2>
            <p className="text-sm text-gray-500 mb-4">1주일을 보내고 용돈을 지급할까요?</p>

            <div className="bg-parent-50 rounded-2xl p-4 mb-4 space-y-2 text-sm text-left overflow-hidden">
              <div className="flex justify-between">
                <span className="text-gray-500">주간 용돈</span>
                <span className="font-bold text-green-600">+{formatMoney(state.weeklyAllowance)}원</span>
              </div>
              {currentWeeklyRepayment > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">할부금 자동 차감</span>
                  <span className="font-bold text-red-500">-{formatMoney(currentWeeklyRepayment)}원</span>
                </div>
              )}
              <div className="border-t border-parent-200 pt-2 flex justify-between">
                <span className="text-gray-600 font-bold">실제 입금액</span>
                <span className="font-extrabold text-parent-600">
                  +{formatMoney(Math.max(0, state.weeklyAllowance - currentWeeklyRepayment))}원
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowWeekConfirm(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAdvanceWeek}
                className="flex-1 py-3 bg-parent-500 text-white rounded-2xl font-bold text-sm hover:bg-parent-600 transition-colors shadow-lg shadow-parent-200"
              >
                1주일 지나기 ⏩
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ 용돈 입금 모달 ═══════ */}
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

      {/* ═══════ 주간 용돈 설정 모달 ═══════ */}
      {showWeeklySettings && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6 modal-overlay"
          onClick={() => setShowWeeklySettings(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-[380px] p-6 modal-content overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-extrabold text-gray-800 mb-4">⚙️ 주간 용돈 설정</h2>
            <form onSubmit={handleSetWeekly} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block">빠른 선택</label>
                <div className="grid grid-cols-3 gap-2">
                  {[5000, 10000, 15000, 20000, 30000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setNewWeeklyAmount(String(amt))}
                      className={`py-2 rounded-xl text-sm font-bold transition-all ${
                        newWeeklyAmount === String(amt)
                          ? 'bg-parent-500 text-white shadow-md'
                          : 'bg-parent-50 text-parent-600 hover:bg-parent-100 border border-parent-200'
                      }`}
                    >
                      {formatMoney(amt)}원
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">직접 입력 (원)</label>
                <input
                  type="number"
                  value={newWeeklyAmount}
                  onChange={(e) => setNewWeeklyAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-parent-200 focus:border-parent-400 focus:outline-none text-sm bg-parent-50"
                  min="0"
                />
              </div>
              {newWeeklyAmount && (
                <p className="text-xs text-gray-400">
                  신용 한도가 <span className="font-bold text-parent-600">{formatMoney(parseInt(newWeeklyAmount) * 4)}원</span>으로 변경됩니다
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowWeeklySettings(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-2xl font-bold text-sm"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!newWeeklyAmount || parseInt(newWeeklyAmount) <= 0}
                  className="flex-1 py-3 bg-parent-500 text-white rounded-2xl font-bold text-sm disabled:bg-gray-200 disabled:text-gray-400 shadow-lg shadow-parent-200"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 요청 카드 컴포넌트 ───
function RequestCard({ req, onDecide, isHold }) {
  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm card-enter overflow-hidden ${
      isHold ? 'border-2 border-yellow-200' : 'border-2 border-orange-200'
    }`}>
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-gray-800 truncate">{req.name}</h4>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
              req.type === 'loan' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {req.type === 'loan' ? '대출' : '할부 구매'}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {new Date(req.createdAt).toLocaleDateString('ko-KR', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap ${
          isHold ? 'bg-yellow-100 text-yellow-600' : 'bg-orange-100 text-orange-600'
        }`}>
          {isHold ? '보류 중' : '대기 중'}
        </span>
      </div>

      {/* 자녀 사유 — 눈에 띄게 */}
      {req.reason && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl !px-3 !py-2 mb-3 overflow-hidden">
          <p className="text-[10px] font-bold text-yellow-700 mb-0.5">💌 자녀의 이유:</p>
          <p className="text-xs text-gray-700 italic break-words">&quot;{req.reason}&quot;</p>
        </div>
      )}

      <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-1.5 overflow-hidden">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">원금</span>
          <span className="font-bold">{formatMoney(req.price)}원</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">총 상환 (이자 10%)</span>
          <span className="font-bold text-orange-600">{formatMoney(req.totalRepayment)}원</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{req.installmentWeeks}주 할부 · 주당</span>
          <span className="font-extrabold text-red-500">-{formatMoney(req.weeklyPrice)}원</span>
        </div>
      </div>

      <button
        onClick={onDecide}
        className="w-full py-2.5 bg-parent-500 text-white rounded-xl text-sm font-bold hover:bg-parent-600 transition-colors shadow-sm shadow-parent-200"
      >
        결정하기 📋
      </button>
    </div>
  );
}
