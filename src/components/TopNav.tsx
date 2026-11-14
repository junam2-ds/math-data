import React from 'react';
import { ProjectStage } from '../types/project';

interface TopNavProps {
  currentStage: ProjectStage;
  onSelectStage: (stage: ProjectStage) => void;
  onResetOrJumpUpload: () => void;
}

const NAV_ITEMS: { stage: ProjectStage; label: string }[] = [
  { stage: 1, label: '1. 현상 관찰' },
  { stage: 2, label: '2. 탐구 설계' },
  { stage: 3, label: '3. AI 탐구·시각화' },
  { stage: 4, label: '4. 보고서·공유' },
];

export const TopNav: React.FC<TopNavProps> = ({
  currentStage,
  onSelectStage,
  onResetOrJumpUpload,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-3.5">
        <button
          type="button"
          onClick={() => onSelectStage(1)}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          통계로 세상 읽기
        </button>

        <nav className="hidden md:flex items-center gap-6" aria-label="프로젝트 차시 단계">
          {NAV_ITEMS.map((item) => {
            const active = currentStage === item.stage;
            return (
              <button
                key={item.stage}
                type="button"
                onClick={() => onSelectStage(item.stage)}
                className={`py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  active
                    ? 'border-sky-600 text-slate-900'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onResetOrJumpUpload}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            {currentStage === 4 ? '보고서 인쇄' : '공공데이터 선택'}
          </button>
        </div>
      </div>

      {/* Mobile Stage Switcher */}
      <div className="flex md:hidden items-center justify-between gap-2 border-t border-slate-100 px-4 py-2 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const active = currentStage === item.stage;
          return (
            <button
              key={item.stage}
              type="button"
              onClick={() => onSelectStage(item.stage)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
