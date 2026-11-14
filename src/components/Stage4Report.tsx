import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  MessageSquarePlus,
  Printer,
  Send,
  Share2,
} from 'lucide-react';
import {
  Dataset,
  DescriptiveStats,
  GroupSummary,
  HistogramBin,
  PeerComment,
  PublishedReport,
  StudentPlan,
  StudentReport,
  StudentVerification,
} from '../types/project';
import { formatNum, normalProbability } from '../utils/statistics';
import { CHART_LABELS, StatisticalCharts } from './StatisticalCharts';

interface Stage4ReportProps {
  dataset: Dataset;
  plan: StudentPlan;
  verification: StudentVerification;
  report: StudentReport;
  values: number[];
  stats: DescriptiveStats;
  bins: HistogramBin[];
  groups: GroupSummary[];
  scatterPoints: { x: number; y: number; label: string }[];
  correlationR: number | null;
  trendSeries: { label: string; value: number }[];
  publishedPosts: PublishedReport[];
  myPublishedId: string | null;
  onUpdateReport: (patch: Partial<StudentReport>) => void;
  onPublishReport: () => Promise<void>;
  onAddPeerComment: (
    postId: string,
    author: string,
    criterion: PeerComment['criterion'],
    comment: string
  ) => Promise<void>;
  onPrevStage: () => void;
}

const EVAL_LEVELS: ('잘함' | '보통' | '노력')[] = ['잘함', '보통', '노력'];
const FEEDBACK_CRITERIA: PeerComment['criterion'][] = [
  '정규분포 적합성',
  '기준값 설정 타당성',
  '그래프 왜곡 여부',
  '생활 개선 방안',
];

export const Stage4Report: React.FC<Stage4ReportProps> = ({
  dataset,
  plan,
  verification,
  report,
  values,
  stats,
  bins,
  groups,
  scatterPoints,
  correlationR,
  trendSeries,
  publishedPosts,
  myPublishedId,
  onUpdateReport,
  onPublishReport,
  onAddPeerComment,
  onPrevStage,
}) => {
  const [subTab, setSubTab] = useState<'report' | 'gallery' | 'reflect'>('report');
  const [publishing, setPublishing] = useState(false);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);

  const [commentForms, setCommentForms] = useState<
    Record<string, { author: string; criterion: PeerComment['criterion']; comment: string }>
  >({});

  const empiricalRate = useMemo(() => {
    if (values.length === 0) return 0;
    const count = values.filter((v) =>
      plan.thresholdDirection === 'gte' ? v >= plan.thresholdValue : v <= plan.thresholdValue
    ).length;
    return count / values.length;
  }, [values, plan.thresholdValue, plan.thresholdDirection]);

  const normalProb = useMemo(
    () => normalProbability(plan.thresholdValue, stats.mean, stats.stdDev, plan.thresholdDirection),
    [plan.thresholdValue, stats.mean, stats.stdDev, plan.thresholdDirection]
  );

  const handlePublish = async () => {
    setPublishing(true);
    setPublishNotice(null);
    try {
      await onPublishReport();
      setPublishNotice(
        myPublishedId
          ? '피드백을 반영한 수정본이 학급 공유 갤러리에 재게시되었습니다.'
          : '분석 보고서가 학급 공유 갤러리에 게시되었습니다.'
      );
      setSubTab('gallery');
    } catch (err) {
      setPublishNotice(err instanceof Error ? err.message : '게시에 실패했습니다.');
    } finally {
      setPublishing(false);
    }
  };

  const handleCommentSubmit = async (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    const form = commentForms[postId] || {
      author: plan.studentName || '',
      criterion: '정규분포 적합성',
      comment: '',
    };
    if (!form.author.trim() || !form.comment.trim()) return;
    await onAddPeerComment(postId, form.author.trim(), form.criterion, form.comment.trim());
    setCommentForms((prev) => ({
      ...prev,
      [postId]: { ...form, comment: '' },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Stage Header & Sub-tab Switcher */}
      <section className="no-print rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>4단계 · 5~6차시</span>
              <span aria-hidden="true">·</span>
              <span>읽걷쓰(쓰기)</span>
              <span aria-hidden="true">·</span>
              <span>보고서 작성·동료 피드백·성찰</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              공공데이터 분석 보고서 및 생활 개선 방안 공유
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setSubTab('report')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  subTab === 'report' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                내 보고서·발표 자료
              </button>
              <button
                type="button"
                onClick={() => setSubTab('gallery')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  subTab === 'gallery' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                학급 공유·동료 피드백 ({publishedPosts.length})
              </button>
              <button
                type="button"
                onClick={() => setSubTab('reflect')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  subTab === 'reflect' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                자기평가·성찰 기록
              </button>
            </div>
          </div>
        </div>

        {publishNotice && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{publishNotice}</span>
          </div>
        )}
      </section>

      {/* SUB-TAB 1: REPORT BUILDER & PRINTABLE PRESENTATION */}
      {subTab === 'report' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Editing Controls (No Print) */}
          <div className="no-print lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="text-base font-semibold text-slate-900">보고서 핵심 내용 작성</h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                보고서 및 발표 제목
              </label>
              <input
                type="text"
                value={report.title}
                onChange={(e) => onUpdateReport({ title: e.target.value })}
                placeholder={`${dataset.title} 통계 분석과 생활 개선 제안`}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                통계적 근거 기반 생활 개선 방안
              </label>
              <textarea
                rows={4}
                value={report.improvementProposal}
                onChange={(e) => onUpdateReport({ improvementProposal: e.target.value })}
                placeholder="산출된 평균·표준편차·확률 예측 결과를 근거로 학교나 지역사회에서 실천할 수 있는 구체적 개선 방안을 작성하세요."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  제안 대상 (누구에게)
                </label>
                <input
                  type="text"
                  value={report.targetAudience}
                  onChange={(e) => onUpdateReport({ targetAudience: e.target.value })}
                  placeholder="예: 우리 학교 학생회 및 보건실"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  기대 효과
                </label>
                <input
                  type="text"
                  value={report.expectedEffect}
                  onChange={(e) => onUpdateReport({ expectedEffect: e.target.value })}
                  placeholder="예: 고농도일 야외활동 피해 예방"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                AI 활용 여부 및 검증 내용 명시 (디지털 윤리)
              </label>
              <textarea
                rows={2}
                value={report.aiUsageDisclosure}
                onChange={(e) => onUpdateReport({ aiUsageDisclosure: e.target.value })}
                placeholder="예: Gemini AI로 기술통계 요약 및 히스토그램 추천을 받았으며, 정규분포 확률과 이상치 제외 여부는 학생이 직접 교차 검증함"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
              />
            </div>

            {myPublishedId && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  동료 피드백을 반영해 수정한 내용
                </label>
                <textarea
                  rows={2}
                  value={report.revisedAfterFeedback}
                  onChange={(e) => onUpdateReport({ revisedAfterFeedback: e.target.value })}
                  placeholder="동료의 피드백 중 어떤 점을 선별해 보고서와 그래프를 수정했는지 기록하세요."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
                />
              </div>
            )}

            <div className="pt-2 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50 whitespace-nowrap"
              >
                <Share2 className="h-4 w-4" />
                {publishing
                  ? '게시 중...'
                  : myPublishedId
                  ? '피드백 반영 수정본 재게시'
                  : '학급 공유 보드에 게시하기'}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap"
              >
                <Printer className="h-4 w-4" />
                인쇄 / PDF 저장
              </button>
            </div>
          </div>

          {/* Right Printable Report Preview */}
          <article className="print-container lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 md:p-8 space-y-6">
            <div className="border-b border-slate-200 pb-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>공공데이터 통계 분석 보고서</span>
                <span aria-hidden="true">·</span>
                <span>{plan.groupName || '고등학교 2학년 확률과 통계'}</span>
                <span aria-hidden="true">·</span>
                <span>작성자: {plan.studentName || '미입력'}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 leading-snug">
                {report.title || `${dataset.title} 통계 분석과 생활 개선 제안`}
              </h2>
              <div className="text-xs text-slate-500">
                활용 공공데이터: {dataset.title} (출처: {dataset.source})
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-900">1. 탐구 질문 및 통계적 접근</h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                {plan.inquiryQuestion || '관심 공공데이터의 분포를 정규분포와 이항분포로 분석하여 생활 개선 방안을 탐색함.'}
              </p>
              <div className="text-xs text-slate-500 pt-1">
                핵심 변수: <strong className="text-slate-800">{plan.targetColumn}</strong> · 연결 개념:{' '}
                <strong className="text-slate-800">
                  {plan.selectedConcept === 'binomial'
                    ? '이항분포 B(n, p)'
                    : plan.selectedConcept === 'sampling'
                    ? '모집단과 표본추출'
                    : '정규분포 N(m, σ²)'}
                </strong>
              </div>
            </div>

            {/* Key Statistics Table */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">2. 산출 통계량 및 확률 예측</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs">
                <div>
                  <div className="text-slate-500">유효 표본크기</div>
                  <div className="mt-0.5 font-semibold text-slate-900 font-mono tabular-nums">{stats.n}개</div>
                </div>
                <div>
                  <div className="text-slate-500">평균 / 중앙값</div>
                  <div className="mt-0.5 font-semibold text-slate-900 font-mono tabular-nums">
                    {formatNum(stats.mean, 2)} / {formatNum(stats.median, 2)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">표준편차 (s)</div>
                  <div className="mt-0.5 font-semibold text-slate-900 font-mono tabular-nums">
                    {formatNum(stats.stdDev, 2)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">기준값 예측 / 실제</div>
                  <div className="mt-0.5 font-semibold text-sky-700 font-mono tabular-nums">
                    {(normalProb * 100).toFixed(1)}% / {(empiricalRate * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Adopted Chart Snapshot */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">
                3. 최종 채택 시각화 자료 ({CHART_LABELS[verification.adoptedChart]})
              </h3>
              <div className="rounded-lg border border-slate-200 p-3">
                <StatisticalCharts
                  chartType={verification.adoptedChart}
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
                  showNormalOverlay={true}
                  truncateYAxis={false}
                  binomialN={30}
                  binomialP={Math.max(0.01, Math.min(0.99, empiricalRate || 0.25))}
                  compact
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-900">4. H-A-H 교차 검증 결과</h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                {verification.normalFitJudgment ||
                  verification.expectationComparison ||
                  '3단계 학생 검증 탭에서 기록한 정규분포 적합성 및 왜곡 점검 내용이 여기에 반영됩니다.'}
              </p>
              {verification.distortionCheckNote && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  그래프 왜곡 점검: {verification.distortionCheckNote}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-900">5. 생활 개선 방안 및 실천 제안</h3>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {report.improvementProposal || '왼쪽 입력란에 통계적 근거를 바탕으로 한 생활 개선 방안을 작성하세요.'}
              </p>
              {(report.targetAudience || report.expectedEffect) && (
                <div className="text-xs text-slate-500 pt-1">
                  제안 대상: {report.targetAudience || '-'} · 기대 효과: {report.expectedEffect || '-'}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-3 text-[11px] text-slate-500 space-y-1">
              <div>
                AI 활용 및 검증 명시: {report.aiUsageDisclosure || 'Gemini AI를 활용하여 기술통계 해석 및 그래프 추천을 받고 학생이 수치와 축 왜곡 여부를 직접 교차 검증함.'}
              </div>
              {report.revisedAfterFeedback && (
                <div>피드백 반영 수정: {report.revisedAfterFeedback}</div>
              )}
            </div>
          </article>
        </div>
      )}

      {/* SUB-TAB 2: CLASSROOM PEER GALLERY & RUBRIC FEEDBACK */}
      {subTab === 'gallery' && (
        <section className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">학급 온라인 공유 보드</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                동료의 발표 자료를 <strong>정규분포 적합성 · 기준값 설정 타당성 · 그래프 왜곡 여부</strong> 관점에서 검토하고 피드백을 주고받으세요.
              </p>
            </div>
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-medium text-white hover:bg-sky-700 whitespace-nowrap shrink-0"
            >
              {myPublishedId ? '내 수정본 다시 올리기' : '내 보고서 지금 게시하기'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {publishedPosts.map((post) => {
              const form = commentForms[post.id] || {
                author: plan.studentName || '',
                criterion: '정규분포 적합성' as PeerComment['criterion'],
                comment: '',
              };
              return (
                <article
                  key={post.id}
                  className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{post.groupName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{post.author}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{post.publishedAt}</span>
                      {post.isRevised && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-emerald-700">피드백 반영 수정본</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{post.title}</h3>
                    <div className="text-xs text-slate-500">
                      {post.datasetTitle} ({post.datasetSource})
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">{post.inquiryQuestion}</p>

                  <div className="grid grid-cols-4 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-mono tabular-nums">
                    <div>
                      <div className="text-[10px] text-slate-500">표본 n</div>
                      <div className="font-semibold text-slate-900">{post.keyStats.n}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">평균 / σ</div>
                      <div className="font-semibold text-slate-900">
                        {formatNum(post.keyStats.mean, 1)} / {formatNum(post.keyStats.stdDev, 1)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">기준값</div>
                      <div className="font-semibold text-slate-900">
                        {formatNum(post.keyStats.thresholdValue, 1)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">예측 확률</div>
                      <div className="font-semibold text-sky-700">
                        {(post.keyStats.thresholdProb * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-900">생활 개선 제안</div>
                    <p className="text-xs text-slate-700 leading-relaxed">{post.improvementProposal}</p>
                  </div>

                  <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
                    채택 그래프: {CHART_LABELS[post.adoptedChart] || post.adoptedChart} · {post.aiUsageDisclosure}
                  </div>

                  {/* Comments List */}
                  <div className="border-t border-slate-200 pt-4 space-y-2.5">
                    <div className="text-xs font-semibold text-slate-800">
                      동료 피드백 ({post.comments.length}건)
                    </div>
                    {post.comments.map((c) => (
                      <div key={c.id} className="rounded-lg bg-slate-50 p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-800">{c.author}</span>
                          <span>관점: {c.criterion} · {c.createdAt}</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">{c.comment}</p>
                      </div>
                    ))}

                    <form
                      onSubmit={(e) => handleCommentSubmit(post.id, e)}
                      className="pt-2 space-y-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={form.author}
                          onChange={(e) =>
                            setCommentForms((prev) => ({
                              ...prev,
                              [post.id]: { ...form, author: e.target.value },
                            }))
                          }
                          placeholder="작성자 (예: 김철수 2모둠)"
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
                        />
                        <select
                          value={form.criterion}
                          onChange={(e) =>
                            setCommentForms((prev) => ({
                              ...prev,
                              [post.id]: {
                                ...form,
                                criterion: e.target.value as PeerComment['criterion'],
                              },
                            }))
                          }
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
                        >
                          {FEEDBACK_CRITERIA.map((cr) => (
                            <option key={cr} value={cr}>
                              관점: {cr}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={form.comment}
                          onChange={(e) =>
                            setCommentForms((prev) => ({
                              ...prev,
                              [post.id]: { ...form, comment: e.target.value },
                            }))
                          }
                          placeholder="정규분포 적합성, 기준값 타당성, 그래프 왜곡 여부에 대한 의견을 남기세요"
                          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                        >
                          <MessageSquarePlus className="h-3.5 w-3.5" />
                          남기기
                        </button>
                      </div>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* SUB-TAB 3: STUDENT SELF-ASSESSMENT & REFLECTION */}
      {subTab === 'reflect' && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">학생 자기평가 (잘함 · 보통 · 노력)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              6차시 프로젝트 평가 기준에 따라 스스로의 탐구 과정을 점검해 보세요.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                key: 'selfEvalConcept' as const,
                q: '① 실생활 공공데이터의 분포와 특성을 통계적 개념(이항분포, 정규분포 등)과 연결하여 설명할 수 있는가?',
              },
              {
                key: 'selfEvalAiAnalysis' as const,
                q: '② 인공지능 도구를 활용하여 공공데이터의 통계량을 처리하고 시각화하여 필요한 정보를 분석할 수 있는가?',
              },
              {
                key: 'selfEvalReport' as const,
                q: '③ 데이터 분석 결과를 바탕으로 생활 개선 방향을 담은 보고서를 작성하고 타당한 근거로 발표·공유할 수 있는가?',
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border border-slate-200 p-4"
              >
                <p className="text-sm font-medium text-slate-800">{item.q}</p>
                <div className="inline-flex rounded-lg bg-slate-100 p-1 shrink-0">
                  {EVAL_LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => onUpdateReport({ [item.key]: lvl })}
                      className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        report[item.key] === lvl
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-200">
            <label className="block text-sm font-semibold text-slate-900">
              성찰 질문: 데이터를 분석하고 개선 방안을 도출하는 과정에서 처음 나의 예상과 통계적 결과가 어떻게 달랐으며, 그 차이를 설명하기 위해 어떤 노력을 기울였는가?
            </label>
            <textarea
              rows={5}
              value={report.reflectionDifference}
              onChange={(e) => onUpdateReport({ reflectionDifference: e.target.value })}
              placeholder="사전 예상과 AI 산출 결과의 차이, 이상치·정규분포 적합성·그래프 축 왜곡을 검증하며 배운 점을 성찰 기록으로 남기세요."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700"
            >
              <Send className="h-4 w-4" />
              성찰 포함 보고서 공유 보드에 저장·게시
            </button>
          </div>
        </section>
      )}

      {/* Bottom Back Nav */}
      <div className="no-print flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onPrevStage}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          3단계 AI 탐구·시각화로 돌아가기
        </button>
      </div>
    </div>
  );
};
