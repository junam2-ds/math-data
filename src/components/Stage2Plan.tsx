import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  ChartType,
  ColumnProfile,
  Dataset,
  MissingStrategy,
  OutlierStrategy,
  PiiWarning,
  StatConcept,
  StudentPlan,
} from '../types/project';
import { CHART_LABELS } from './StatisticalCharts';

interface Stage2PlanProps {
  dataset: Dataset;
  columnProfiles: ColumnProfile[];
  piiWarnings: PiiWarning[];
  plan: StudentPlan;
  onUpdatePlan: (patch: Partial<StudentPlan>) => void;
  onPrevStage: () => void;
  onNextStage: () => void;
}

const CONCEPT_OPTIONS: {
  id: StatConcept;
  code: string;
  title: string;
  desc: string;
}[] = [
  {
    id: 'normal',
    code: '[12확통03-04]',
    title: '정규분포 N(m, σ²)와 확률 예측',
    desc: '연속형 공공데이터의 평균과 표준편차를 구하고 표준화(Z)를 통해 특정 기준을 넘을 확률을 예측합니다.',
  },
  {
    id: 'binomial',
    code: '[12확통03-03]',
    title: '이항분포 B(n, p)와 정규근사',
    desc: '기준 충족 여부(성공/실패) 비율 p를 구해 n회 시행 시 성공 횟수 분포를 모델링하고 np≥5 조건을 검증합니다.',
  },
  {
    id: 'sampling',
    code: '[12확통03-05]',
    title: '모집단과 표본 · 모평균 추정',
    desc: '수집한 자료를 표본으로 보고 표본추출의 대표성과 표본평균의 분포를 바탕으로 전체 집단을 추론합니다.',
  },
];

const QUESTION_TYPES: StudentPlan['questionType'][] = [
  '근거 제시',
  '차이·공통점 비교',
  '해결 방안 탐색',
];

export const Stage2Plan: React.FC<Stage2PlanProps> = ({
  dataset,
  columnProfiles,
  piiWarnings,
  plan,
  onUpdatePlan,
  onPrevStage,
  onNextStage,
}) => {
  const numericCols = columnProfiles.filter((c) => c.type === 'numeric');
  const groupCols = columnProfiles.filter((c) => c.type !== 'numeric');

  const togglePreChart = (chart: ChartType) => {
    const exists = plan.preSelectedCharts.includes(chart);
    const next = exists
      ? plan.preSelectedCharts.filter((c) => c !== chart)
      : [...plan.preSelectedCharts, chart];
    onUpdatePlan({ preSelectedCharts: next });
  };

  const applySuggestedQuestion = () => {
    const dirText = plan.thresholdDirection === 'gte' ? '이상' : '이하';
    const sample = `${dataset.title}에서 '${plan.targetColumn}' 분포는 정규분포로 설명할 수 있으며, 기준값 ${plan.thresholdValue}${dataset.unitHint} ${dirText}이 발생할 확률과 이를 개선할 수 있는 생활 방안은 무엇일까?`;
    onUpdatePlan({ inquiryQuestion: sample });
  };

  return (
    <div className="space-y-8">
      {/* Guiding Question Banner */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
          <span>2단계 · 2차시</span>
          <span aria-hidden="true">·</span>
          <span>H-A-H: 학생(H)이 먼저 설계하기</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 text-balance">
          통계적 탐구 질문 구체화 및 분석 계획 수립
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-3xl">
          관통 질문: <span className="font-semibold text-slate-900">“내가 궁금해한 우리 주변의 문제를, 공공데이터와 통계로 다른 사람이 납득할 만큼 설명하려면 무엇이 필요할까?”</span>
          <br />
          AI가 계산하기 전에, 분석할 변수와 통계 개념, 데이터 정제 기준, 그리고 대푯값·분포 모양 예상을 먼저 정립합니다.
        </p>

        {/* Student / Group Identity */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              학생 이름
            </label>
            <input
              type="text"
              value={plan.studentName}
              onChange={(e) => onUpdatePlan({ studentName: e.target.value })}
              placeholder="예: 홍길동"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              학년 반 · 모둠명
            </label>
            <input
              type="text"
              value={plan.groupName}
              onChange={(e) => onUpdatePlan({ groupName: e.target.value })}
              placeholder="예: 2학년 3반 2모둠"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Step 1: Inquiry Question & Stat Concept */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">01. 통계적 탐구 질문과 성취기준 연결</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              1단계에서 관찰한 특이점을 바탕으로 모둠의 탐구 질문과 통계 개념을 연결하세요.
            </p>
          </div>
          <button
            type="button"
            onClick={applySuggestedQuestion}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
          >
            선택 변수로 탐구 질문 초안 채우기
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 mr-1">질문 유형:</span>
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              {QUESTION_TYPES.map((qt) => (
                <button
                  key={qt}
                  type="button"
                  onClick={() => onUpdatePlan({ questionType: qt })}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    plan.questionType === qt
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {qt}
                </button>
              ))}
            </div>
          </div>

          <textarea
            rows={3}
            value={plan.inquiryQuestion}
            onChange={(e) => onUpdatePlan({ inquiryQuestion: e.target.value })}
            placeholder="예: 수도권의 봄철 초미세먼지 농도는 정규분포로 볼 수 있으며, 환경부 나쁨 기준(35㎍/㎥)을 넘을 확률은 얼마나 될까?"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CONCEPT_OPTIONS.map((opt) => {
            const active = plan.selectedConcept === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdatePlan({ selectedConcept: opt.id })}
                className={`text-left rounded-xl border p-4 transition-colors ${
                  active
                    ? 'border-sky-600 bg-sky-50/40'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-mono text-sky-700 font-medium">{opt.code}</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{opt.title}</div>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 2: Variable Mapping & Pre-processing Policy */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">02. 변수 정의 및 결측치·이상치 사전 처리 기준</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            AI에게 데이터를 넘기기 전, 분석할 열과 확률 예측 기준값, 그리고 이상치·결측치를 어떻게 다룰지 먼저 결정합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              핵심 분석 변수 (수치형)
            </label>
            <select
              value={plan.targetColumn}
              onChange={(e) => onUpdatePlan({ targetColumn: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
            >
              {numericCols.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              집단 비교 변수 (범주형)
            </label>
            <select
              value={plan.groupColumn}
              onChange={(e) => onUpdatePlan({ groupColumn: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
            >
              <option value="">선택 안 함</option>
              {groupCols.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              보조 비교 변수 (산점도용)
            </label>
            <select
              value={plan.secondaryColumn}
              onChange={(e) => onUpdatePlan({ secondaryColumn: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
            >
              <option value="">선택 안 함</option>
              {numericCols
                .filter((c) => c.name !== plan.targetColumn)
                .map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              확률 예측 기준값 (k)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="any"
                value={plan.thresholdValue}
                onChange={(e) =>
                  onUpdatePlan({ thresholdValue: Number(e.target.value) || 0 })
                }
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
              />
              <select
                value={plan.thresholdDirection}
                onChange={(e) =>
                  onUpdatePlan({ thresholdDirection: e.target.value as 'gte' | 'lte' })
                }
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-800 focus:border-sky-600 focus:bg-white focus:outline-none shrink-0"
              >
                <option value="gte">이상 (≥)</option>
                <option value="lte">이하 (≤)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-800">결측치(빈값) 처리 기준</div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'drop', label: '결측 행 제외' },
                  { id: 'mean', label: '전체 평균으로 대체' },
                  { id: 'median', label: '중앙값으로 대체' },
                  { id: 'keep', label: '제외(빈값 무시)' },
                ] as { id: MissingStrategy; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdatePlan({ missingStrategy: opt.id })}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium text-left transition-colors ${
                    plan.missingStrategy === opt.id
                      ? 'border-sky-600 bg-sky-50 text-sky-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-800">이상치(튀는 값) 처리 기준</div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'keep', label: '모두 포함하여 분석' },
                  { id: 'iqr_trim', label: 'IQR 1.5배 밖 이상치 제외' },
                ] as { id: OutlierStrategy; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdatePlan({ outlierStrategy: opt.id })}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium text-left transition-colors ${
                    plan.outlierStrategy === opt.id
                      ? 'border-sky-600 bg-sky-50 text-sky-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Step 3: Student Pre-Prediction & Graph Candidates */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">03. 대푯값·분포 형태 사전 예상 및 그래프 후보 선정</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            3단계에서 AI가 내놓는 결과와 비교할 나의 사전 가설을 기록합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              예상하는 분포 형태 (대칭성·쏠림·정규분포 유사성)
            </label>
            <input
              type="text"
              value={plan.preHypothesisShape}
              onChange={(e) => onUpdatePlan({ preHypothesisShape: e.target.value })}
              placeholder="예: 중앙에 데이터가 몰린 종 모양이지만 고농도 날 때문에 오른쪽으로 약간 치우칠 것 같음"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              예상 대푯값(평균·중앙값) 및 기준 초과 비율
            </label>
            <input
              type="text"
              value={plan.preHypothesisMeanEstimate}
              onChange={(e) => onUpdatePlan({ preHypothesisMeanEstimate: e.target.value })}
              placeholder="예: 평균은 약 30 안팎이고 기준 초과 비율은 20~30% 정도일 것으로 예상"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-700 mb-2">
            학생이 먼저 골라보는 적합 그래프 유형 (복수 선택 가능)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {(Object.keys(CHART_LABELS) as ChartType[]).map((ct) => {
              const checked = plan.preSelectedCharts.includes(ct);
              return (
                <button
                  key={ct}
                  type="button"
                  onClick={() => togglePreChart(ct)}
                  className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-xs font-medium transition-colors ${
                    checked
                      ? 'border-sky-600 bg-sky-50 text-sky-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{CHART_LABELS[ct]}</span>
                  {checked && <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Step 4: AI Digital Safety & Ethics Pledge */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">04. AI·디지털 윤리 및 안전 약속 점검</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              공공데이터 분석과 생성형 AI 활용 전 개인 식별 정보 포함 여부와 검증 책임을 확인합니다.
            </p>
          </div>
          {piiWarnings.length === 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              개인 식별 정보(PII) 미검출
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
              <ShieldAlert className="h-4 w-4" />
              주의: 개인정보 의심 열 {piiWarnings.length}건 감지됨
            </span>
          )}
        </div>

        {piiWarnings.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 space-y-1">
            {piiWarnings.map((w, i) => (
              <div key={i}>
                열 <strong>{w.column}</strong>에서 {w.type}({w.sampleCount}건)이 감지되었습니다. AI 분석 전 해당 열을 삭제하거나 비식별화하세요.
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={plan.ethicsSourceChecked}
              onChange={(e) => onUpdatePlan({ ethicsSourceChecked: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600"
            />
            <span className="text-slate-700 leading-relaxed">
              공공데이터의 출처와 기준 시점을 보고서에 정확히 표기하겠습니다.
            </span>
          </label>

          <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={plan.ethicsNoPiiChecked}
              onChange={(e) => onUpdatePlan({ ethicsNoPiiChecked: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600"
            />
            <span className="text-slate-700 leading-relaxed">
              이름·전화번호 등 개인 식별 가능 정보가 AI에 입력되지 않도록 점검했습니다.
            </span>
          </label>

          <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={plan.ethicsVerifyAiChecked}
              onChange={(e) => onUpdatePlan({ ethicsVerifyAiChecked: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600"
            />
            <span className="text-slate-700 leading-relaxed">
              AI가 추천한 그래프와 해석을 맹신하지 않고 통계량과 축 왜곡을 직접 검증하겠습니다.
            </span>
          </label>
        </div>

        <div className="pt-2 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onPrevStage}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            1단계로 돌아가기
          </button>
          <button
            type="button"
            onClick={onNextStage}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700"
          >
            3단계: Gemini AI 데이터 탐구·시각화
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
