import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
} from 'lucide-react';
import {
  AIAnalysisResult,
  ChartType,
  ChatMessage,
  ColumnProfile,
  Dataset,
  DescriptiveStats,
  GroupSummary,
  HistogramBin,
  StudentPlan,
  StudentVerification,
} from '../types/project';
import { formatNum, normalProbability } from '../utils/statistics';
import { CHART_LABELS, StatisticalCharts } from './StatisticalCharts';

interface Stage3AnalyzeProps {
  dataset: Dataset;
  columnProfiles: ColumnProfile[];
  plan: StudentPlan;
  values: number[];
  stats: DescriptiveStats;
  bins: HistogramBin[];
  binCount: number;
  onChangeBinCount: (n: number) => void;
  groups: GroupSummary[];
  scatterPoints: { x: number; y: number; label: string }[];
  correlationR: number | null;
  trendSeries: { label: string; value: number }[];
  aiAnalysis: AIAnalysisResult | null;
  aiLoading: boolean;
  aiError: string | null;
  onRunAiAnalysis: () => void;
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  onSendChat: (question: string) => void;
  activeChart: ChartType;
  onSelectChart: (chart: ChartType) => void;
  verification: StudentVerification;
  onUpdatePlan: (patch: Partial<StudentPlan>) => void;
  onUpdateVerification: (patch: Partial<StudentVerification>) => void;
  onPrevStage: () => void;
  onNextStage: () => void;
}

export const Stage3Analyze: React.FC<Stage3AnalyzeProps> = ({
  dataset,
  plan,
  values,
  stats,
  bins,
  binCount,
  onChangeBinCount,
  groups,
  scatterPoints,
  correlationR,
  trendSeries,
  aiAnalysis,
  aiLoading,
  aiError,
  onRunAiAnalysis,
  chatMessages,
  chatLoading,
  onSendChat,
  activeChart,
  onSelectChart,
  verification,
  onUpdatePlan,
  onUpdateVerification,
  onPrevStage,
  onNextStage,
}) => {
  const [showNormalOverlay, setShowNormalOverlay] = useState(true);
  const [truncateYAxis, setTruncateYAxis] = useState(false);
  const [binomialN, setBinomialN] = useState(30);
  const [chatInput, setChatInput] = useState('');
  const [deckTab, setDeckTab] = useState<'ai' | 'chat' | 'judge'>('ai');

  const empiricalProportion = useMemo(() => {
    if (values.length === 0) return 0;
    const matchCount = values.filter((v) =>
      plan.thresholdDirection === 'gte' ? v >= plan.thresholdValue : v <= plan.thresholdValue
    ).length;
    return matchCount / values.length;
  }, [values, plan.thresholdValue, plan.thresholdDirection]);

  const normalProb = useMemo(
    () => normalProbability(plan.thresholdValue, stats.mean, stats.stdDev, plan.thresholdDirection),
    [plan.thresholdValue, stats.mean, stats.stdDev, plan.thresholdDirection]
  );

  const zScore = useMemo(() => {
    if (stats.stdDev <= 0) return 0;
    return (plan.thresholdValue - stats.mean) / stats.stdDev;
  }, [plan.thresholdValue, stats.mean, stats.stdDev]);

  const binomialSuccessP = Math.max(0.01, Math.min(0.99, empiricalProportion || 0.25));
  const binomialMean = binomialN * binomialSuccessP;
  const binomialStd = Math.sqrt(binomialN * binomialSuccessP * (1 - binomialSuccessP));
  const canNormalApprox = binomialMean >= 5 && binomialN * (1 - binomialSuccessP) >= 5;

  const sliderMin = Number.isFinite(stats.min) ? Math.floor(stats.min * 10) / 10 : 0;
  const sliderMax = Number.isFinite(stats.max) && stats.max > stats.min ? Math.ceil(stats.max * 10) / 10 : sliderMin + 10;
  const sliderStep = (sliderMax - sliderMin) / 100 || 0.1;

  const recommendedMap = useMemo(() => {
    const map = new Map<ChartType, number>();
    if (aiAnalysis?.recommendedCharts) {
      for (const rec of aiAnalysis.recommendedCharts) {
        map.set(rec.chartType, rec.priority);
      }
    }
    return map;
  }, [aiAnalysis]);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) return;
    onSendChat(trimmed);
    setChatInput('');
  };

  return (
    <div className="space-y-6">
      {/* Stage Header */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>3단계 · 3~4차시</span>
              <span aria-hidden="true">·</span>
              <span>읽걷쓰(걷기)</span>
              <span aria-hidden="true">·</span>
              <span>H-A-H AI 탐구 및 교차 검증</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Gemini AI 통계·시각화 추천과 정규분포 교차 검증
            </h1>
            <p className="text-sm text-slate-600">
              탐구 질문: <span className="font-medium text-slate-900">{plan.inquiryQuestion || `${dataset.title} (${plan.targetColumn}) 분석`}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onRunAiAnalysis}
              disabled={aiLoading || values.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gemini AI 분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {aiAnalysis ? 'Gemini AI 다시 분석하기' : 'Gemini AI 분석·그래프 추천'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Exact Descriptive Stats Strip */}
        <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          <div>
            <div className="text-[11px] text-slate-500">유효 표본크기 (n)</div>
            <div className="mt-0.5 text-base font-semibold text-slate-900 font-mono tabular-nums">
              {stats.n}개
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">평균 (x̄)</div>
            <div className="mt-0.5 text-base font-semibold text-slate-900 font-mono tabular-nums">
              {formatNum(stats.mean, 2)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">중앙값 (M)</div>
            <div className="mt-0.5 text-base font-semibold text-slate-900 font-mono tabular-nums">
              {formatNum(stats.median, 2)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">표준편차 (s)</div>
            <div className="mt-0.5 text-base font-semibold text-slate-900 font-mono tabular-nums">
              {formatNum(stats.stdDev, 2)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">사분위수 (Q1 ~ Q3)</div>
            <div className="mt-0.5 text-base font-semibold text-slate-900 font-mono tabular-nums">
              {formatNum(stats.q1, 1)} ~ {formatNum(stats.q3, 1)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">왜도 (치우침)</div>
            <div className="mt-0.5 text-base font-semibold text-slate-900 font-mono tabular-nums">
              {formatNum(stats.skewness, 2)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">IQR 이상치</div>
            <div className="mt-0.5 text-base font-semibold text-slate-900 font-mono tabular-nums">
              {stats.outlierValues.length}개
            </div>
          </div>
        </div>
      </section>

      {/* Main Two-Zone Interactive Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT ZONE (65% -> 8 cols): Interactive Visualization & Probability Lab */}
        <div className="lg:col-span-8 space-y-6">
          {/* Chart Selector & Canvas */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                시각화 그래프 선택 및 왜곡 교차 검증
              </h2>
              <span className="text-xs text-slate-500">
                현재 변수: {plan.targetColumn} · 전처리: 결측({plan.missingStrategy}) / 이상치({plan.outlierStrategy === 'iqr_trim' ? '제외' : '포함'})
              </span>
            </div>

            {/* Chart Type Segmented Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(CHART_LABELS) as ChartType[]).map((ct) => {
                const isActive = activeChart === ct;
                const aiRank = recommendedMap.get(ct);
                const isPreSelected = plan.preSelectedCharts.includes(ct);
                return (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => onSelectChart(ct)}
                    className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                      isActive
                        ? 'border-sky-600 bg-sky-50 text-sky-950'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-semibold truncate">{CHART_LABELS[ct]}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500 truncate">
                      {aiRank ? `AI 추천 ${aiRank}순위` : isPreSelected ? '학생 사전선택' : '선택 가능'}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Interactive Chart Controls (Distortion Check & Binning) */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {(activeChart === 'histogram_normal' || activeChart === 'binomial_pmf') && (
                  <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      checked={showNormalOverlay}
                      onChange={(e) => setShowNormalOverlay(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600"
                    />
                    정규분포 곡선 겹쳐보기
                  </label>
                )}

                {activeChart === 'histogram_normal' && (
                  <div className="inline-flex items-center gap-2 text-slate-700">
                    <span className="font-medium">계급 구간 수:</span>
                    <input
                      type="range"
                      min={4}
                      max={14}
                      value={binCount}
                      onChange={(e) => onChangeBinCount(Number(e.target.value))}
                      className="w-24 accent-sky-600"
                    />
                    <span className="font-mono tabular-nums w-6">{binCount}</span>
                  </div>
                )}

                {activeChart === 'binomial_pmf' && (
                  <div className="inline-flex items-center gap-2 text-slate-700">
                    <span className="font-medium">시행 횟수 n:</span>
                    <input
                      type="range"
                      min={10}
                      max={50}
                      value={binomialN}
                      onChange={(e) => setBinomialN(Number(e.target.value))}
                      className="w-24 accent-sky-600"
                    />
                    <span className="font-mono tabular-nums w-7">{binomialN}</span>
                  </div>
                )}

                {(activeChart === 'bar_group' || activeChart === 'line_trend') && (
                  <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      checked={truncateYAxis}
                      onChange={(e) => setTruncateYAxis(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-amber-600"
                    />
                    Y축 절단 왜곡 체험하기 (0에서 시작 안 함)
                  </label>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePlan({
                      outlierStrategy: plan.outlierStrategy === 'keep' ? 'iqr_trim' : 'keep',
                    })
                  }
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
                >
                  이상치: {plan.outlierStrategy === 'iqr_trim' ? '제외 중 (포함하기)' : '포함 중 (제외해보기)'}
                </button>
              </div>
            </div>

            {/* SVG Chart Canvas */}
            <div className="pt-1">
              <StatisticalCharts
                chartType={activeChart}
                values={values}
                stats={stats}
                bins={bins}
                groups={groups}
                scatterPoints={scatterPoints}
                correlationR={correlationR}
                trendSeries={trendSeries}
                targetColumn={plan.targetColumn}
                groupColumn={plan.groupColumn}
                secondaryColumn={plan.secondaryColumn}
                thresholdValue={plan.thresholdValue}
                thresholdDirection={plan.thresholdDirection}
                showNormalOverlay={showNormalOverlay}
                truncateYAxis={truncateYAxis}
                binomialN={binomialN}
                binomialP={binomialSuccessP}
              />
            </div>
          </section>

          {/* Interactive Normal & Binomial Probability Simulator */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  정규분포 · 이항분포 확률 예측 및 신뢰도 검증 실험실
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  기준값(k)을 움직여 표준화(Z) 확률과 실제 데이터의 경험적 비율을 직접 비교해보세요.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateVerification({
                    adoptedChart: activeChart,
                  })
                }
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                  verification.adoptedChart === activeChart
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Check className="h-3.5 w-3.5" />
                {verification.adoptedChart === activeChart
                  ? '대표 그래프로 채택됨'
                  : '현재 그래프를 보고서 대표 그래프로 채택'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="md:col-span-6 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span>기준값 k ({plan.targetColumn})</span>
                  <span className="font-mono tabular-nums text-sky-700">
                    {formatNum(plan.thresholdValue, 2)} {dataset.unitHint} ({plan.thresholdDirection === 'gte' ? '이상' : '이하'})
                  </span>
                </div>
                <input
                  type="range"
                  min={sliderMin}
                  max={sliderMax}
                  step={sliderStep}
                  value={plan.thresholdValue}
                  onChange={(e) => onUpdatePlan({ thresholdValue: Number(e.target.value) })}
                  className="w-full accent-sky-600"
                />
                <div className="flex justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                  <span>최소 {formatNum(sliderMin, 1)}</span>
                  <span>평균 {formatNum(stats.mean, 1)}</span>
                  <span>최대 {formatNum(sliderMax, 1)}</span>
                </div>
              </div>

              <div className="md:col-span-6 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <div className="text-[11px] text-slate-500">표준화 값 Z</div>
                  <div className="mt-1 text-sm font-bold text-slate-900 font-mono tabular-nums">
                    {zScore >= 0 ? `+${zScore.toFixed(2)}` : zScore.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <div className="text-[11px] text-slate-500">정규분포 예측 확률</div>
                  <div className="mt-1 text-sm font-bold text-sky-700 font-mono tabular-nums">
                    {(normalProb * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <div className="text-[11px] text-slate-500">실제 데이터 비율</div>
                  <div className="mt-1 text-sm font-bold text-emerald-700 font-mono tabular-nums">
                    {(empiricalProportion * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="rounded-lg border border-slate-200 p-3.5 space-y-1">
                <div className="font-semibold text-slate-900">정규분포 표준화 계산 과정</div>
                <div className="font-mono tabular-nums text-slate-700">
                  Z = ({formatNum(plan.thresholdValue, 2)} - {formatNum(stats.mean, 2)}) / {formatNum(stats.stdDev, 2)} = {zScore.toFixed(2)}
                </div>
                <p className="text-slate-600 leading-relaxed pt-1">
                  예측 확률({(normalProb * 100).toFixed(1)}%)과 실제 관측 비율({(empiricalProportion * 100).toFixed(1)}%)의 차이는{' '}
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {Math.abs((normalProb - empiricalProportion) * 100).toFixed(1)}%p
                  </span>
                  입니다. 차이가 크다면 왜도나 이상치 때문에 정규분포 적합성이 낮을 수 있습니다.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-3.5 space-y-1">
                <div className="font-semibold text-slate-900">이항분포 B(n, p) 및 정규근사 점검</div>
                <div className="font-mono tabular-nums text-slate-700">
                  B({binomialN}, {binomialSuccessP.toFixed(2)}) · np = {formatNum(binomialMean, 2)} · √npq = {formatNum(binomialStd, 2)}
                </div>
                <p className="text-slate-600 leading-relaxed pt-1">
                  {canNormalApprox
                    ? 'np ≥ 5 이고 n(1-p) ≥ 5 를 만족하므로, 이항분포를 정규분포로 근사하여 확률을 예측할 수 있습니다.'
                    : 'np < 5 또는 n(1-p) < 5 이므로 정규근사 오차가 커질 수 있어 이항분포 확률 계산을 직접 사용해야 합니다.'}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT ZONE (35% -> 4 cols): Gemini AI Deck, Chat & Student [H] Judgment */}
        <aside className="lg:col-span-4 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex border-b border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setDeckTab('ai')}
              className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                deckTab === 'ai' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              [A] AI 분석·추천
            </button>
            <button
              type="button"
              onClick={() => setDeckTab('chat')}
              className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                deckTab === 'chat' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              AI 질문하기
            </button>
            <button
              type="button"
              onClick={() => setDeckTab('judge')}
              className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                deckTab === 'judge' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              [H] 학생 검증
            </button>
          </div>

          <div className="p-5 space-y-5 max-h-[820px] overflow-y-auto">
            {deckTab === 'ai' && (
              <>
                {aiError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 space-y-1">
                    <div className="font-semibold">AI 분석 요청 오류</div>
                    <p>{aiError}</p>
                  </div>
                )}

                {!aiAnalysis && !aiLoading && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-center space-y-3">
                    <Sparkles className="mx-auto h-6 w-6 text-sky-600" />
                    <div className="text-sm font-semibold text-slate-900">
                      Gemini AI 그래프 추천 및 통계 해석 대기 중
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      상단의 <strong>Gemini AI 분석·그래프 추천</strong> 버튼을 누르면 현재 데이터의 통계량과 탐구 질문에 맞춰 최적 그래프 3종과 정규분포 적합성, 왜곡 주의점을 제안합니다.
                    </p>
                    <button
                      type="button"
                      onClick={onRunAiAnalysis}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-medium text-white hover:bg-sky-700"
                    >
                      지금 Gemini AI 실행
                    </button>
                  </div>
                )}

                {aiLoading && (
                  <div className="py-12 text-center space-y-3">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-600" />
                    <p className="text-xs text-slate-600">
                      Gemini가 기술통계량과 분포 형태를 분석하고 그래프를 추천하고 있습니다...
                    </p>
                  </div>
                )}

                {aiAnalysis && !aiLoading && (
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-slate-900">핵심 통계 요약</div>
                      <p className="text-xs text-slate-700 leading-relaxed">{aiAnalysis.summary}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-900">
                        Gemini 추천 시각화 그래프 (클릭하여 바로 보기)
                      </div>
                      <div className="space-y-2.5">
                        {aiAnalysis.recommendedCharts.map((rec) => {
                          const isCurrent = activeChart === rec.chartType;
                          return (
                            <div
                              key={`${rec.priority}-${rec.chartType}`}
                              className={`rounded-lg border p-3 space-y-1.5 ${
                                isCurrent ? 'border-sky-600 bg-sky-50/40' : 'border-slate-200 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-900">
                                  {rec.priority}순위 · {rec.title}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onSelectChart(rec.chartType)}
                                  className="rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                                >
                                  {isCurrent ? '표시 중' : '그래프 적용'}
                                </button>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">{rec.reason}</p>
                              <div className="text-[11px] text-amber-800 bg-amber-50/70 rounded px-2 py-1">
                                주의점: {rec.distortionWatchout}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5 border-t border-slate-100 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900">정규분포 · 이항분포 적합성</span>
                        <span
                          className={`text-xs font-semibold ${
                            aiAnalysis.distributionFit.fitLevel === '적합'
                              ? 'text-emerald-700'
                              : aiAnalysis.distributionFit.fitLevel === '부분 적합'
                              ? 'text-amber-700'
                              : 'text-red-700'
                          }`}
                        >
                          판정: {aiAnalysis.distributionFit.fitLevel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {aiAnalysis.distributionFit.explanation}
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {aiAnalysis.distributionFit.binomialConnection}
                      </p>
                    </div>

                    <div className="space-y-1.5 border-t border-slate-100 pt-4">
                      <div className="text-xs font-semibold text-slate-900">기준값 확률 해석 및 신뢰도</div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {aiAnalysis.thresholdPrediction.interpretation}
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {aiAnalysis.thresholdPrediction.reliabilityNote}
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        그래프 왜곡 및 비판적 점검 포인트
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
                        {aiAnalysis.distortionWarnings.map((w, i) => (
                          <li key={i} className="leading-relaxed">
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      <div className="text-xs font-semibold text-slate-900">
                        [H] 학생 스스로 답해볼 검증 질문
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-700 list-decimal pl-4">
                        {aiAnalysis.criticalQuestionsForStudent.map((q, i) => (
                          <li key={i} className="leading-relaxed">
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </>
            )}

            {deckTab === 'chat' && (
              <div className="space-y-4">
                <div className="text-xs text-slate-600 leading-relaxed">
                  그래프 선택 이유, 이상치 제외 영향, 이항분포·정규분포 계산에 대해 Gemini에게 질문해보세요.
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    '히스토그램과 막대그래프 중 왜 이 그래프가 더 나은가요?',
                    '이상치를 빼면 평균과 표준편차가 어떻게 달라지나요?',
                    '이 데이터를 정규분포로 예측할 때 한계점은 무엇인가요?',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onSendChat(preset)}
                      disabled={chatLoading}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-left text-[11px] text-slate-700 hover:bg-slate-100"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {chatMessages.length === 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                      <MessageSquare className="mx-auto h-5 w-5 text-slate-400 mb-1.5" />
                      아직 대화 기록이 없습니다. 위 예시 질문을 누르거나 아래에 질문을 입력하세요.
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`rounded-lg p-3 text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-sky-600 text-white ml-6'
                            : 'bg-slate-100 text-slate-800 mr-4'
                        }`}
                      >
                        <div className="font-semibold mb-1 text-[11px] opacity-80">
                          {msg.role === 'user' ? '학생 질문' : 'Gemini 통계 멘토'}
                        </div>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    ))
                  )}
                  {chatLoading && (
                    <div className="rounded-lg bg-slate-100 p-3 text-xs text-slate-600 flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      답변을 작성하고 있습니다...
                    </div>
                  )}
                </div>

                <form onSubmit={handleChatSubmit} className="flex gap-2 pt-2 border-t border-slate-100">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="통계·시각화에 대해 질문하세요..."
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-white hover:bg-slate-800 disabled:opacity-40"
                    aria-label="질문 전송"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            )}

            {deckTab === 'judge' && (
              <div className="space-y-4">
                <div className="text-xs text-slate-600 leading-relaxed">
                  <strong>[H] 인간이 최종 판단하기</strong>: AI의 계산과 추천 그래프가 나의 사전 예상과 일치했는지 비교하고, 최종 채택 근거를 기록하세요.
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    최종 채택할 대표 그래프
                  </label>
                  <select
                    value={verification.adoptedChart}
                    onChange={(e) => {
                      const next = e.target.value as ChartType;
                      onUpdateVerification({ adoptedChart: next });
                      onSelectChart(next);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
                  >
                    {(Object.keys(CHART_LABELS) as ChartType[]).map((ct) => (
                      <option key={ct} value={ct}>
                        {CHART_LABELS[ct]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    사전 예상 vs AI 산출 결과 비교
                  </label>
                  <textarea
                    rows={3}
                    value={verification.expectationComparison}
                    onChange={(e) =>
                      onUpdateVerification({ expectationComparison: e.target.value })
                    }
                    placeholder="예: 처음에는 평균이 30 이하일 줄 알았는데 이상치(79) 때문에 평균이 올라갔고, 중앙값(28.5)과 차이가 났음"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    정규분포 적합성 및 확률 예측 신뢰도 판단
                  </label>
                  <textarea
                    rows={3}
                    value={verification.normalFitJudgment}
                    onChange={(e) =>
                      onUpdateVerification({ normalFitJudgment: e.target.value })
                    }
                    placeholder="예: 왜도가 크지 않고 정규곡선 예측(26%)과 실제 비율(25%)이 비슷해 정규분포 근사가 타당하다고 판단함"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    그래프 왜곡 여부 점검 메모
                  </label>
                  <textarea
                    rows={2}
                    value={verification.distortionCheckNote}
                    onChange={(e) =>
                      onUpdateVerification({ distortionCheckNote: e.target.value })
                    }
                    placeholder="예: 막대그래프 Y축을 0부터 시작하게 고정하고, 히스토그램 구간 수를 8개로 맞춰 왜곡을 방지함"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={verification.checkNormalFit}
                      onChange={(e) =>
                        onUpdateVerification({ checkNormalFit: e.target.checked })
                      }
                      className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600"
                    />
                    정규분포·이항분포 적합성 교차 검증 완료
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={verification.checkThresholdValid}
                      onChange={(e) =>
                        onUpdateVerification({ checkThresholdValid: e.target.checked })
                      }
                      className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600"
                    />
                    기준값(k) 설정의 현실적·통계적 타당성 확인
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={verification.checkNoDistortion}
                      onChange={(e) =>
                        onUpdateVerification({ checkNoDistortion: e.target.checked })
                      }
                      className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600"
                    />
                    축 절단·계급 왜곡 없음 확인 완료
                  </label>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Footer Nav */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onPrevStage}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          2단계로 돌아가기
        </button>
        <button
          type="button"
          onClick={onNextStage}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700"
        >
          4단계: 분석 보고서 작성·공유
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
