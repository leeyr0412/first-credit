import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { checkDSRExceeded } from '../context/constants.js';
import TermBadge from './TermModal';

// ─── 금액 포맷팅 ───
function formatMoney(amount) {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

// ─── 이모지 옵션 ───
const emojiOptions = ['🧸', '🎮', '📚', '🍰', '👟', '🎨', '⚽', '🎵', '🧱', '🃏', '🎁', '🛒'];

export default function ChildView() {
  const { state, dispatch, creditLimit, currentWeeklyRepayment } = useApp();

  // ─── 로컬 UI 상태 ───
  const [showAddItem, setShowAddItem] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState('buy'); // 'buy' | 'loan'
  const [selectedItem, setSelectedItem] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', price: '', emoji: '🧸' });
  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'contracts' | 'history'
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [dsrWarning, setDsrWarning] = useState('');

  // 요청 폼 상태
  const [reqName, setReqName] = useState('');
  const [reqPrice, setReqPrice] = useState('');
  const [reqWeeks, setReqWeeks] = useState(4);
  const [reqReason, setReqReason] = useState('');

  const [showCancelConfirm, setShowCancelConfirm] = useState(null); // request id

  const pendingRequests = state.requests.filter(r => r.status === 'pending').length;
  const activeContracts = state.requests.filter(r => r.status === 'approved');
  const myRequests = state.requests.filter(r => !['completed', 'cancelled'].includes(r.status));

  // 부모 응답 알림: 최근 승인/거절/선물 중 아직 읽지 않은 것
  const notifications = state.requests.filter(r =>
    ['approved', 'rejected', 'completed'].includes(r.status) &&
    !r.notificationRead &&
    // completed는 선물(gift)로 완료된 것만 알림 (상환 완료는 제외)
    (r.status !== 'completed' || r.repaidWeeks === r.installmentWeeks)
  );

  // ─── 유틸 ───
  function showToast(msg) {
    setSuccessMessage(msg);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
  }

  // ─── 상품 등록 ───
  function handleAddItem(e) {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return;
    dispatch({
      type: 'ADD_ITEM',
      payload: { name: newItem.name, price: parseInt(newItem.price), emoji: newItem.emoji },
    });
    setNewItem({ name: '', price: '', emoji: '🧸' });
    setShowAddItem(false);
    showToast('위시리스트에 추가했어요! ✨');
  }

  // ─── 구매 시도 (잔액 충분 시 즉시 구매, 부족 시 할부 요청 모달) ───
  function handleBuy(item) {
    if (state.balance >= item.price) {
      dispatch({ type: 'PURCHASE_ITEM', payload: item.id });
      showToast(`${item.name} 구매 완료! 🎉`);
    } else {
      setSelectedItem(item);
      setRequestType('buy');
      setReqName(item.name);
      setReqPrice(String(item.price));
      setReqWeeks(4);
      setReqReason('');
      setDsrWarning('');
      setShowRequestModal(true);
    }
  }

  // ─── 대출 신청 버튼 ───
  function openLoanModal() {
    setSelectedItem(null);
    setRequestType('loan');
    setReqName('');
    setReqPrice('');
    setReqWeeks(4);
    setReqReason('');
    setDsrWarning('');
    setShowRequestModal(true);
  }

  // ─── 실시간 할부 계산 ───
  const parsedPrice = parseInt(reqPrice) || 0;
  const totalRepayment = Math.ceil(parsedPrice * 1.1);
  const weeklyPayment = reqWeeks > 0 ? Math.ceil(totalRepayment / reqWeeks) : 0;
  const interestAmount = totalRepayment - parsedPrice;

  // ─── 요청 제출 ───
  function handleSubmitRequest(e) {
    e.preventDefault();
    if (!reqName || !parsedPrice || parsedPrice <= 0 || !reqReason) return;

    // DSR 검사
    if (checkDSRExceeded(state.requests, state.weeklyAllowance, weeklyPayment)) {
      setDsrWarning('용돈의 절반 이상을 빚 갚는 데 쓸 수 없어요! (DSR 초과)');
      return;
    }

    dispatch({
      type: 'CREATE_REQUEST',
      payload: {
        type: requestType,
        targetId: selectedItem?.id || null,
        name: reqName,
        price: parsedPrice,
        installmentWeeks: reqWeeks,
        reason: reqReason,
      },
    });

    setShowRequestModal(false);
    showToast('부모님께 요청을 보냈어요! 📨');
  }

  // ─── 실시간 DSR 체크 (경고 표시용) ───
  function updateDsrCheck(price, weeks) {
    if (!price || price <= 0 || !weeks) {
      setDsrWarning('');
      return;
    }
    const tr = Math.ceil(price * 1.1);
    const wp = Math.ceil(tr / weeks);
    if (checkDSRExceeded(state.requests, state.weeklyAllowance, wp)) {
      setDsrWarning('용돈의 절반 이상을 빚 갚는 데 쓸 수 없어요! (DSR 초과)');
    } else {
      setDsrWarning('');
    }
  }

  return (
    <div className="bg-child-50 min-h-screen pb-6">
      {/* 성공 토스트 */}
      {showSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-semibold card-enter">
          {successMessage}
        </div>
      )}

      {/* ─── 잔액 카드 ─── */}
      <div className="mx-4 mt-4 !p-1">
        <div className=" bg-gradient-to-br from-child-400 to-child-500 rounded-2xl !p-2 shadow-lg shadow-child-200 overflow-hidden">
          <p className="text-white/80 text-xs font-medium mb-1">내 용돈 잔액</p>
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
                <TermBadge termKey="LIMIT" />
              </p>
              <p className="text-white text-sm font-bold">{formatMoney(creditLimit)}원</p>
            </div>
            {state.futureDeductions > 0 && (
              <div className="bg-red-500/30 rounded-xl !px-3 !py-2 overflow-hidden">
                <p className="text-white/70 text-[10px]">남은 상환액</p>
                <p className="text-white text-sm font-bold">-{formatMoney(state.futureDeductions)}원</p>
              </div>
            )}
            {currentWeeklyRepayment > 0 && (
              <div className="bg-orange-500/30 rounded-xl !px-3 !py-2 overflow-hidden">
                <p className="text-white/70 text-[10px] flex items-center">
                  매주 갚는 금액
                  <TermBadge termKey="INSTALLMENT" />
                </p>
                <p className="text-white text-sm font-bold">-{formatMoney(currentWeeklyRepayment)}원</p>
              </div>
            )}
          </div>


          {/* DSR 현황 */}
          {currentWeeklyRepayment > 0 && (
            <div className="!mt-2 bg-white/15 rounded-xl !px-3 !py-2 overflow-hidden">
              <div className="flex items-center justify-between text-[10px] text-white/70 mb-1">
                <span className="flex items-center gap-0.5">
                  DSR 현황
                  <TermBadge termKey="DSR" variant="child" />
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

          {pendingRequests > 0 && (
            <div className="!mt-2 bg-white/20 rounded-lg !px-3 !py-2 text-white text-xs overflow-hidden">
              📨 대기 중인 요청이 <span className="font-bold">{pendingRequests}건</span> 있어요
            </div>
          )}

          {/* 대출 신청 버튼 */}
          <button
            onClick={openLoanModal}
            className="!mt-3 w-full bg-white/20 hover:bg-white/30 text-white !py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            💰 용돈 미리 받기 (대출)
            <TermBadge termKey="LOAN" />
          </button>
        </div>
      </div>

      {/* ─── 탭 전환 ─── */}
      <div className="mx-4 mt-5 flex bg-child-100 rounded-xl !p-1 overflow-hidden">
        {[
          { key: 'items', label: '🛍️ 위시리스트' },
          { key: 'contracts', label: '📄 빌린 목록' },
          { key: 'history', label: '📋 내역' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.key
                ? 'bg-white text-child-600 shadow-sm'
                : 'text-child-400 hover:text-child-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════ 위시리스트 탭 ═══════ */}
      {activeTab === 'items' && (
        <div className="mx-4 mt-4 !p-1">
          <button
            onClick={() => setShowAddItem(true)}
            className="w-full border-2 border-dashed border-child-300 rounded-2xl py-4 text-child-500 font-bold text-sm hover:bg-child-100 transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-xl">+</span> 갖고 싶은 것 추가하기
          </button>

          <div className="mt-3 space-y-3">
            {state.items.length === 0 && (
              <div className="text-center py-10 text-child-400">
                <p className="text-4xl mb-2">🎁</p>
                <p className="font-semibold">아직 위시리스트가 비어있어요</p>
                <p className="text-xs !mt-1">갖고 싶은 것을 추가해보세요!</p>
              </div>
            )}
            {state.items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-child-100 card-enter overflow-hidden"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-child-100 rounded-xl flex items-center justify-center text-2xl shrink-0">
                    {item.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-sm truncate">{item.name}</h3>
                    <p className="text-child-600 font-extrabold text-lg !mt-0.5">
                      {formatMoney(item.price)}원
                    </p>
                    {state.balance < item.price && (
                      <p className="text-red-400 text-[11px] mt-1 truncate">
                        💸 {formatMoney(item.price - state.balance)}원 부족해요
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col !gap-1.5 shrink-0">
                    <button
                      onClick={() => handleBuy(item)}
                      className={`!px-4 !py-2 rounded-xl text-xs font-bold transition-all ${
                        state.balance >= item.price
                          ? 'bg-child-500 text-white hover:bg-child-600 shadow-sm shadow-child-200'
                          : 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm shadow-orange-200'
                      }`}
                    >
                      {state.balance >= item.price ? '구매하기' : '할부 신청'}
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'DELETE_ITEM', payload: item.id })}
                      className="!px-4 !py-1.5 rounded-xl text-[11px] text-gray-400 hover:text-red-400 hover:bg-red-50 transition-colors"
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

      {/* ═══════ 빌린 목록 탭 ═══════ */}
      {activeTab === 'contracts' && (
        <div className="!mx-4 !mt-4 space-y-3">
          {myRequests.length === 0 && notifications.length === 0 && (
            <div className="text-center py-10 text-child-400">
              <p className="text-4xl !mb-2">📄</p>
              <p className="font-semibold">아직 신청 내역이 없어요</p>
            </div>
          )}

          {/* ── 부모 응답 알림 배너 ── */}
          {notifications.length > 0 && (
            <div className="space-y-2">
              {notifications.map(req => {
                const isApproved = req.status === 'approved';
                const isGifted = req.status === 'completed' && req.repaidWeeks === req.installmentWeeks && req.parentMessage;
                return (
                  <div
                    key={`notif-${req.id}`}
                    className={`rounded-2xl p-4 overflow-hidden card-enter border-2 ${
                      isGifted ? 'bg-gradient-to-br from-pink-50 to-purple-50 border-pink-200'
                      : isApproved ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                      : 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl shrink-0">
                        {isGifted ? '🎁' : isApproved ? '🎉' : '📝'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-extrabold ${
                          isGifted ? 'text-pink-700'
                          : isApproved ? 'text-green-700'
                          : 'text-orange-700'
                        }`}>
                          {isGifted
                            ? `와! '${req.name}' 부모님이 선물로 사주셨어요! 💕`
                            : isApproved
                            ? `축하해요! '${req.name}' 요청이 승인되었어요! 🎉`
                            : `아쉽지만 '${req.name}' 요청이 거절되었어요. 사유를 확인해 보세요. 📝`}
                        </p>
                        {req.parentMessage && (
                          <p className="text-xs text-gray-600 mt-1 italic break-words">
                            💬 부모님: &quot;{req.parentMessage}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => dispatch({ type: 'DISMISS_NOTIFICATION', payload: req.id })}
                      className={`mt-2 w-full py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        isGifted ? 'bg-pink-100 text-pink-600 hover:bg-pink-200'
                        : isApproved ? 'bg-green-100 text-green-600 hover:bg-green-200'
                        : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                      }`}
                    >
                      확인했어요 ✓
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── 상환 중인 계약 ── */}
          {activeContracts.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-child-600 uppercase tracking-wider !mb-2 flex items-center gap-1">
                🔄 상환 중인 할부
                <TermBadge termKey="INSTALLMENT" />
              </h3>
              {activeContracts.map(req => {
                const progress = Math.round((req.repaidWeeks / req.installmentWeeks) * 100);
                return (
                  <div key={req.id} className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100 !mb-3 card-enter overflow-hidden">
                    <div className="flex items-center justify-between !mb-2 !gap-2">
                      <h4 className="font-bold text-gray-800 text-sm truncate min-w-0 flex-1">{req.name}</h4>
                      <span className="bg-blue-100 text-blue-600 text-[10px] font-bold !px-2 !py-0.5 rounded-full shrink-0 whitespace-nowrap">
                        {req.type === 'loan' ? '대출' : '할부 구매'}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-xl !p-3 space-y-1.5 text-xs overflow-hidden">
                      <div className="flex justify-between">
                        <span className="text-gray-500">원금</span>
                        <span className="font-bold">{formatMoney(req.price)}원</span>
                      </div>
                      <div className="flex justify-between items-center gap-1">
                        <span className="text-gray-500 flex items-center shrink-0">총 상환액 (이자 포함)<TermBadge termKey="INTEREST" /></span>
                        <span className="font-bold text-orange-600 shrink-0">{formatMoney(req.totalRepayment)}원</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">매주 갚는 금액</span>
                        <span className="font-bold text-red-500">-{formatMoney(req.weeklyPrice)}원</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">진행</span>
                        <span className="font-bold">{req.repaidWeeks} / {req.installmentWeeks}주</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-400 to-blue-500 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 !mr-1 !mt-1 text-right">{progress}% 상환 완료</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── 대기 중 (pending) ── */}
          {state.requests.filter(r => r.status === 'pending').length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-2">⏳ 승인 대기 중</h3>
              {state.requests.filter(r => r.status === 'pending').map(req => (
                <div key={req.id} className="bg-white rounded-2xl p-4 border-2 border-orange-100 mb-2 overflow-hidden card-enter">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-lg shrink-0">⏳</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-bold text-gray-800 truncate">{req.name}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                          req.type === 'loan' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                        }`}>{req.type === 'loan' ? '대출' : '할부'}</span>
                      </div>
                      <span className="inline-block bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1">
                        ⏳ 승인 대기 중
                      </span>
                      <p className="text-[11px] text-gray-400">
                        {formatMoney(req.price)}원 · {req.installmentWeeks}주 할부 · 주당 -{formatMoney(req.weeklyPrice)}원
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCancelConfirm(req.id)}
                    className="mt-3 w-full py-2 bg-gray-100 text-gray-500 rounded-xl text-xs font-bold hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    요청 취소하기
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── 보류 중 (hold) ── */}
          {state.requests.filter(r => r.status === 'hold').length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-yellow-600 uppercase tracking-wider mb-2">✋ 보류됨</h3>
              {state.requests.filter(r => r.status === 'hold').map(req => (
                <div key={req.id} className="bg-white rounded-2xl p-4 border-2 border-yellow-200 mb-2 overflow-hidden card-enter">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center text-lg shrink-0">✋</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-bold text-gray-800 truncate">{req.name}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                          req.type === 'loan' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                        }`}>{req.type === 'loan' ? '대출' : '할부'}</span>
                      </div>
                      <span className="inline-block bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1">
                        ✋ 보류됨 (부모님 검토 중)
                      </span>
                      <p className="text-[11px] text-gray-400">
                        {formatMoney(req.price)}원 · {req.installmentWeeks}주 할부 · 주당 -{formatMoney(req.weeklyPrice)}원
                      </p>
                      {req.parentMessage && (
                        <p className="text-[11px] text-yellow-600 mt-1 break-words">💬 &quot;{req.parentMessage}&quot;</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCancelConfirm(req.id)}
                    className="mt-3 w-full py-2 bg-gray-100 text-gray-500 rounded-xl text-xs font-bold hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    요청 취소하기
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── 거절됨 (rejected) ── */}
          {state.requests.filter(r => r.status === 'rejected' && r.notificationRead).length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">거절된 요청</h3>
              {state.requests.filter(r => r.status === 'rejected' && r.notificationRead).map(req => (
                <div key={req.id} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 border border-gray-200 mb-2 overflow-hidden">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-sm shrink-0">❌</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-500 truncate">{req.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{formatMoney(req.price)}원 · 거절됨</p>
                    {req.parentMessage && (
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">💬 &quot;{req.parentMessage}&quot;</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════ 거래 내역 탭 ═══════ */}
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
              className="bg-white rounded-xl !p-4 flex items-center gap-3 border border-child-100 overflow-hidden"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 ${
                  tx.type === 'allowance' ? 'bg-green-100 text-green-600'
                  : tx.type === 'advance' ? 'bg-blue-100 text-blue-600'
                  : tx.type === 'deduction' ? 'bg-red-100 text-red-500'
                  : tx.type === 'gift' ? 'bg-pink-100 text-pink-500'
                  : tx.type === 'info' ? 'bg-blue-50 text-blue-400'
                  : 'bg-gray-100 text-gray-500'
                }`}
              >
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

      {/* ═══════ 상품 추가 모달 ═══════ */}
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

      {/* ═══════ 할부/대출 신청 모달 ═══════ */}
      {showRequestModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center modal-overlay"
          onClick={() => setShowRequestModal(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-w-[430px] p-6 modal-content max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h2 className="text-lg font-extrabold text-gray-800 mb-1 flex items-center gap-2">
              {requestType === 'buy' ? '🛍️ 할부 구매 신청' : '💰 대출 신청'}
              <TermBadge termKey={requestType === 'buy' ? 'INSTALLMENT' : 'LOAN'} />
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              {requestType === 'buy'
                ? '물건 값을 나눠서 갚는 할부를 신청해요'
                : '미래 용돈을 미리 받는 대출을 신청해요'}
            </p>

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              {/* 이름 (대출일 때만 직접 입력) */}
              {requestType === 'loan' ? (
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">대출 사유</label>
                  <input
                    type="text"
                    value={reqName}
                    onChange={(e) => setReqName(e.target.value)}
                    placeholder="예: 친구 생일 선물 사기"
                    className="w-full px-4 py-3 rounded-xl border-2 border-child-200 focus:border-child-400 focus:outline-none text-sm bg-child-50"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="bg-child-50 rounded-xl p-3 overflow-hidden">
                  <p className="text-xs text-gray-500">상품명</p>
                  <p className="font-bold text-gray-800 break-words">{reqName}</p>
                </div>
              )}

              {/* 금액 */}
              {requestType === 'loan' ? (
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">빌리고 싶은 금액 (원)</label>
                  <input
                    type="number"
                    value={reqPrice}
                    onChange={(e) => {
                      setReqPrice(e.target.value);
                      updateDsrCheck(parseInt(e.target.value) || 0, reqWeeks);
                    }}
                    placeholder="예: 15000"
                    className="w-full px-4 py-3 rounded-xl border-2 border-child-200 focus:border-child-400 focus:outline-none text-sm bg-child-50"
                    min="0"
                  />
                </div>
              ) : (
                <div className="bg-child-50 rounded-xl p-3 flex justify-between items-center overflow-hidden">
                  <span className="text-xs text-gray-500">상품 가격</span>
                  <span className="font-bold text-gray-800">{formatMoney(parsedPrice)}원</span>
                </div>
              )}

              {/* 할부 기간 슬라이더 */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                  할부 기간 <TermBadge termKey="INSTALLMENT" />
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={reqWeeks}
                    onChange={(e) => {
                      const w = parseInt(e.target.value);
                      setReqWeeks(w);
                      updateDsrCheck(parsedPrice, w);
                    }}
                    className="flex-1 h-2 bg-child-200 rounded-lg appearance-none cursor-pointer accent-child-500"
                  />
                  <span className="text-lg font-extrabold text-child-600 w-16 text-center">{reqWeeks}주</span>
                </div>
              </div>

              {/* 실시간 미리보기 */}
              {parsedPrice > 0 && (
                <div className="bg-gradient-to-br from-orange-50 to-child-50 rounded-2xl p-4 space-y-2 border border-orange-200 overflow-hidden">
                  <h4 className="text-xs font-bold text-gray-600 flex items-center gap-1">
                    💡 예상 비용 미리보기
                  </h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">원금</span>
                    <span className="font-bold">{formatMoney(parsedPrice)}원</span>
                  </div>
                  <div className="flex justify-between text-sm items-center gap-1">
                    <span className="text-gray-500 flex items-center">
                      이자 (10%)
                      <TermBadge termKey="INTEREST" />
                    </span>
                    <span className="font-bold text-orange-500">+{formatMoney(interestAmount)}원</span>
                  </div>
                  <div className="border-t border-orange-200 pt-2 flex justify-between text-sm">
                    <span className="text-gray-600 font-bold">총 상환액</span>
                    <span className="font-extrabold text-orange-600">{formatMoney(totalRepayment)}원</span>
                  </div>
                  <div className="bg-white rounded-xl !px-3 !py-2 flex justify-between items-center overflow-hidden">
                    <span className="text-xs text-gray-500">매주 갚는 금액</span>
                    <span className="text-lg font-extrabold text-red-500">-{formatMoney(weeklyPayment)}원</span>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    매주 용돈 {formatMoney(state.weeklyAllowance)}원에서 {formatMoney(weeklyPayment)}원이 자동으로 빠져요
                  </p>
                </div>
              )}

              {/* DSR 경고 */}
              {dsrWarning && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 flex items-start gap-2 card-enter overflow-hidden">
                  <span className="text-xl shrink-0">🚨</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-red-600 break-words">{dsrWarning}</p>
                    <p className="text-[11px] text-red-400 mt-0.5 flex items-center gap-1">
                      더 적은 금액이나 더 긴 기간으로 바꿔보세요!
                      <TermBadge termKey="DSR" />
                    </p>
                  </div>
                </div>
              )}

              {/* 사유 입력 */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">
                  왜 필요한지 부모님께 말해보세요 ✍️
                </label>
                <textarea
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  placeholder="예: 친구 생일 파티에 선물로 주고 싶어요. 열심히 갚을게요!"
                  className="w-full px-4 py-3 rounded-xl border-2 border-child-200 focus:border-child-400 focus:outline-none text-sm bg-child-50 resize-none h-20"
                />
              </div>

              <button
                type="submit"
                disabled={!reqName || parsedPrice <= 0 || !reqReason || !!dsrWarning}
                className="w-full py-3.5 bg-gradient-to-r from-orange-400 to-child-500 text-white rounded-2xl font-bold text-sm hover:from-orange-500 hover:to-child-600 disabled:bg-gray-200 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 transition-all shadow-lg"
              >
                부모님께 요청 보내기 📨
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══════ 요청 취소 확인 모달 ═══════ */}
      {showCancelConfirm && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6 modal-overlay"
          onClick={() => setShowCancelConfirm(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-[340px] p-6 text-center modal-content overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl mb-3">🤔</div>
            <h2 className="text-lg font-extrabold text-gray-800 mb-2">요청을 취소할까요?</h2>
            <p className="text-sm text-gray-500 mb-5">
              취소하면 이 요청은 되돌릴 수 없어요.<br />정말 취소하시겠어요?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-colors"
              >
                아니요
              </button>
              <button
                onClick={() => {
                  dispatch({ type: 'CANCEL_REQUEST', payload: showCancelConfirm });
                  setShowCancelConfirm(null);
                  showToast('요청을 취소했어요');
                }}
                className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-bold text-sm hover:bg-red-600 transition-colors shadow-lg shadow-red-200"
              >
                취소하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
