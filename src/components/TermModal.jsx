import { useState } from 'react';
import { FINANCIAL_TERMS } from '../context/constants.js';
import mascotImg from '../assets/mascot.png';

/**
 * 금융 용어 설명 버튼 + 중앙 모달
 * 
 * 사용법: <TermBadge termKey="CREDIT" />
 * 또는:  <TermBadge termKey="INSTALLMENT" variant="parent" />
 */
export default function TermBadge({ termKey, variant = 'child' }) {
  const [show, setShow] = useState(false);
  const term = FINANCIAL_TERMS[termKey];
  if (!term) return null;

  const isParent = variant === 'parent';

  return (
    <>
      {/* 물음표 버튼 */}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShow(true); }}
        className={`inline-flex items-center justify-center w-5 h-5 text-[11px] rounded-full transition-colors ml-1 cursor-pointer shrink-0 ${
          isParent
            ? 'bg-parent-200 text-parent-600 hover:bg-parent-300'
            : 'bg-child-200 text-child-600 hover:bg-child-300'
        }`}
        aria-label={`${term.title} 설명 보기`}
      >
        ?
      </button>

      {/* 중앙 모달 */}
      {show && (
        <div
          className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center px-6 modal-overlay"
          onClick={() => setShow(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-[340px] overflow-hidden modal-content shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 마스코트 헤더 */}
            <div className={`flex items-center justify-center pt-5 pb-3 ${
              isParent
                ? 'bg-gradient-to-b from-parent-50 to-white'
                : 'bg-gradient-to-b from-child-50 to-white'
            }`}>
              <img
                src={mascotImg}
                alt="퍼스트 크레딧 마스코트"
                className="w-24 h-24 object-contain drop-shadow-md"
              />
            </div>

            {/* 콘텐츠 */}
            <div className="px-5 pb-5">
              <h3 className={`text-base font-extrabold text-center mb-3 ${
                isParent ? 'text-parent-600' : 'text-child-600'
              }`}>
                {term.title}
              </h3>
              <p className="text-[13px] text-gray-600 leading-relaxed break-words">
                {term.desc}
              </p>

              {/* 닫기 버튼 */}
              <button
                onClick={() => setShow(false)}
                className={`mt-4 w-full py-2.5 rounded-2xl font-bold text-sm transition-colors ${
                  isParent
                    ? 'bg-parent-500 text-white hover:bg-parent-600'
                    : 'bg-child-500 text-white hover:bg-child-600'
                }`}
              >
                알겠어요! 👍
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
