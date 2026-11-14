import { useEffect, useMemo, useState } from 'react';
import { INITIAL_PUBLISHED_REPORTS, SAMPLE_DATASETS } from './data/sampleDatasets';
import {
  AIAnalysisResult,
  ChartType,
  ChatMessage,
  Dataset,
  PeerComment,
  ProjectStage,
  PublishedReport,
  StudentPlan,
  StudentReport,
  StudentVerification,
} from './types/project';
import {
  buildHistogramBins,
  computeDescriptiveStats,
  computeGroupSummaries,
  computePearsonCorrelation,
  extractCleanedNumericSeries,
  normalProbability,
  profileColumns,
  scanForPii,
} from './utils/statistics';
import { TopNav } from './components/TopNav';
import { Stage1Observe } from './components/Stage1Observe';
import { Stage2Plan } from './components/Stage2Plan';
import { Stage3Analyze } from './components/Stage3Analyze';
import { Stage4Report } from './components/Stage4Report';

const STORAGE_KEY = 'public_data_stat_project_v1';

function createInitialPlan(dataset: Dataset): StudentPlan {
  return {
    studentName: '',
    groupName: '',
    observationTimeChange: '',
    observationGroupDiff: '',
    observationOutlierShape: '',
    observationRealLifeLink: '',
    inquiryQuestion: '',
    questionType: '근거 제시',
    selectedConcept: 'normal',
    targetColumn: dataset.defaultTargetCol,
    groupColumn: dataset.defaultGroupCol || '',
    secondaryColumn: dataset.defaultSecondaryCol || '',
    thresholdValue: dataset.defaultThreshold ?? 30,
    thresholdDirection: 'gte',
    missingStrategy: 'drop',
    outlierStrategy: 'keep',
    preHypothesisShape: '',
    preHypothesisMeanEstimate: '',
    preSelectedCharts: ['histogram_normal'],
    ethicsSourceChecked: false,
    ethicsNoPiiChecked: false,
    ethicsVerifyAiChecked: false,
  };
}

const INITIAL_VERIFICATION: StudentVerification = {
  adoptedChart: 'histogram_normal',
  secondaryChart: null,
  expectationComparison: '',
  normalFitJudgment: '',
  distortionCheckNote: '',
  checkNormalFit: false,
  checkThresholdValid: false,
  checkNoDistortion: false,
};

const INITIAL_REPORT: StudentReport = {
  title: '',
  improvementProposal: '',
  targetAudience: '',
  expectedEffect: '',
  aiUsageDisclosure:
    'Gemini AI로 기술통계 요약 및 그래프 추천을 받고, 정규분포 적합성과 그래프 축 왜곡 여부를 학생이 직접 교차 검증함.',
  selfEvalConcept: '',
  selfEvalAiAnalysis: '',
  selfEvalReport: '',
  reflectionDifference: '',
  revisedAfterFeedback: '',
};

export default function App() {
  const [stage, setStage] = useState<ProjectStage>(1);
  const [customDatasets, setCustomDatasets] = useState<Dataset[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string>(SAMPLE_DATASETS[0].id);

  const allDatasets = useMemo(
    () => [...customDatasets, ...SAMPLE_DATASETS],
    [customDatasets]
  );

  const activeDataset = useMemo(
    () => allDatasets.find((d) => d.id === activeDatasetId) || SAMPLE_DATASETS[0],
    [allDatasets, activeDatasetId]
  );

  const [plan, setPlan] = useState<StudentPlan>(() => createInitialPlan(SAMPLE_DATASETS[0]));
  const [verification, setVerification] = useState<StudentVerification>(INITIAL_VERIFICATION);
  const [report, setReport] = useState<StudentReport>(INITIAL_REPORT);
  const [activeChart, setActiveChart] = useState<ChartType>('histogram_normal');
  const [binCount, setBinCount] = useState<number>(8);

  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);

  const [publishedPosts, setPublishedPosts] = useState<PublishedReport[]>(
    INITIAL_PUBLISHED_REPORTS
  );
  const [myPublishedId, setMyPublishedId] = useState<string | null>(null);

  // Restore saved workspace state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.customDatasets)) {
          setCustomDatasets(parsed.customDatasets);
        }
        if (parsed.activeDatasetId) setActiveDatasetId(parsed.activeDatasetId);
        if (parsed.plan) setPlan(parsed.plan);
        if (parsed.verification) setVerification(parsed.verification);
        if (parsed.report) setReport(parsed.report);
        if (parsed.activeChart) setActiveChart(parsed.activeChart);
        if (parsed.myPublishedId) setMyPublishedId(parsed.myPublishedId);
      }
    } catch {
      // Ignore invalid localStorage state
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          customDatasets,
          activeDatasetId,
          plan,
          verification,
          report,
          activeChart,
          myPublishedId,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [customDatasets, activeDatasetId, plan, verification, report, activeChart, myPublishedId]);

  // Fetch classroom peer-sharing posts
  useEffect(() => {
    fetch('/api/posts')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.posts && Array.isArray(data.posts)) {
          setPublishedPosts(data.posts);
        }
      })
      .catch(() => {
        // Fallback already initialized
      });
  }, []);

  const columnProfiles = useMemo(
    () => profileColumns(activeDataset.headers, activeDataset.rows),
    [activeDataset]
  );

  const piiWarnings = useMemo(
    () => scanForPii(activeDataset.headers, activeDataset.rows),
    [activeDataset]
  );

  const cleanedSeries = useMemo(
    () =>
      extractCleanedNumericSeries(
        activeDataset.rows,
        plan.targetColumn,
        plan.missingStrategy,
        plan.outlierStrategy
      ),
    [activeDataset.rows, plan.targetColumn, plan.missingStrategy, plan.outlierStrategy]
  );

  const stats = useMemo(
    () =>
      computeDescriptiveStats(
        cleanedSeries.values,
        cleanedSeries.rawN,
        cleanedSeries.missingCount,
        cleanedSeries.removedCount
      ),
    [cleanedSeries]
  );

  const bins = useMemo(
    () => buildHistogramBins(cleanedSeries.values, stats.mean, stats.stdDev, binCount),
    [cleanedSeries.values, stats.mean, stats.stdDev, binCount]
  );

  const groups = useMemo(
    () =>
      computeGroupSummaries(
        cleanedSeries.rowPairs,
        plan.groupColumn,
        plan.thresholdValue,
        plan.thresholdDirection
      ),
    [cleanedSeries.rowPairs, plan.groupColumn, plan.thresholdValue, plan.thresholdDirection]
  );

  const correlationData = useMemo(() => {
    if (!plan.secondaryColumn) return { points: [], r: null };
    return computePearsonCorrelation(
      activeDataset.rows,
      plan.targetColumn,
      plan.secondaryColumn
    );
  }, [activeDataset.rows, plan.targetColumn, plan.secondaryColumn]);

  const trendSeries = useMemo(() => {
    const labelCol = activeDataset.headers[0] || '';
    return cleanedSeries.rowPairs.map((p, idx) => ({
      label: labelCol ? String(p.row[labelCol] || `#${idx + 1}`) : `#${idx + 1}`,
      value: p.value,
    }));
  }, [cleanedSeries.rowPairs, activeDataset.headers]);

  const handleSelectDataset = (dataset: Dataset) => {
    if (dataset.id.startsWith('csv_') && !customDatasets.some((d) => d.id === dataset.id)) {
      setCustomDatasets((prev) => [dataset, ...prev]);
    }
    setActiveDatasetId(dataset.id);
    const profiles = profileColumns(dataset.headers, dataset.rows);
    const firstNumeric = profiles.find((c) => c.type === 'numeric')?.name || dataset.headers[0] || '';
    const tempSeries = extractCleanedNumericSeries(dataset.rows, firstNumeric, 'drop', 'keep');
    const tempStats = computeDescriptiveStats(
      tempSeries.values,
      tempSeries.rawN,
      tempSeries.missingCount,
      tempSeries.removedCount
    );
    const nextThreshold =
      dataset.defaultThreshold ?? (tempStats.n > 0 ? Number(tempStats.mean.toFixed(1)) : 0);

    setPlan((prev) => ({
      ...createInitialPlan(dataset),
      studentName: prev.studentName,
      groupName: prev.groupName,
      targetColumn: dataset.defaultTargetCol || firstNumeric,
      thresholdValue: nextThreshold,
    }));
    setAiAnalysis(null);
    setAiError(null);
    setChatMessages([]);
    setActiveChart('histogram_normal');
    setVerification(INITIAL_VERIFICATION);
  };

  const handleUpdatePlan = (patch: Partial<StudentPlan>) => {
    setPlan((prev) => ({ ...prev, ...patch }));
  };

  const handleUpdateVerification = (patch: Partial<StudentVerification>) => {
    setVerification((prev) => ({ ...prev, ...patch }));
  };

  const handleUpdateReport = (patch: Partial<StudentReport>) => {
    setReport((prev) => ({ ...prev, ...patch }));
  };

  const handleRunAiAnalysis = async () => {
    setAiLoading(true);
    setAiError(null);

    const empiricalCount = cleanedSeries.values.filter((v) =>
      plan.thresholdDirection === 'gte' ? v >= plan.thresholdValue : v <= plan.thresholdValue
    ).length;
    const empiricalProportion =
      cleanedSeries.values.length > 0 ? empiricalCount / cleanedSeries.values.length : 0;
    const normalProb = normalProbability(
      plan.thresholdValue,
      stats.mean,
      stats.stdDev,
      plan.thresholdDirection
    );

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetTitle: activeDataset.title,
          datasetSource: activeDataset.source,
          inquiryQuestion: plan.inquiryQuestion,
          selectedConcept: plan.selectedConcept,
          targetColumn: plan.targetColumn,
          groupColumn: plan.groupColumn,
          secondaryColumn: plan.secondaryColumn,
          thresholdValue: plan.thresholdValue,
          thresholdDirection: plan.thresholdDirection,
          missingStrategy: plan.missingStrategy,
          outlierStrategy: plan.outlierStrategy,
          preHypothesisShape: plan.preHypothesisShape,
          preHypothesisMeanEstimate: plan.preHypothesisMeanEstimate,
          stats,
          normalProbability: normalProb,
          empiricalProportion,
          groupSummaries: groups,
          correlationR: correlationData.r,
          columnProfiles,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'AI 분석에 실패했습니다.');
      }
      setAiAnalysis(data as AIAnalysisResult);
      if (data.recommendedCharts?.[0]?.chartType) {
        const topChart = data.recommendedCharts[0].chartType as ChartType;
        setActiveChart(topChart);
        setVerification((prev) => ({ ...prev, adoptedChart: topChart }));
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendChat = async (question: string) => {
    const userMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          context: {
            datasetTitle: activeDataset.title,
            inquiryQuestion: plan.inquiryQuestion,
            targetColumn: plan.targetColumn,
            n: stats.n,
            mean: stats.mean.toFixed(2),
            median: stats.median.toFixed(2),
            stdDev: stats.stdDev.toFixed(2),
            activeChart,
            thresholdValue: plan.thresholdValue,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '답변 생성에 실패했습니다.');
      }
      const aiMsg: ChatMessage = {
        id: `m-${Date.now() + 1}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errMsg: ChatMessage = {
        id: `m-${Date.now() + 1}`,
        role: 'assistant',
        content: err instanceof Error ? err.message : '질문 처리 중 오류가 발생했습니다.',
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const handlePublishReport = async () => {
    const empiricalCount = cleanedSeries.values.filter((v) =>
      plan.thresholdDirection === 'gte' ? v >= plan.thresholdValue : v <= plan.thresholdValue
    ).length;
    const empiricalRate =
      cleanedSeries.values.length > 0 ? empiricalCount / cleanedSeries.values.length : 0;
    const normalProb = normalProbability(
      plan.thresholdValue,
      stats.mean,
      stats.stdDev,
      plan.thresholdDirection
    );

    const payload = {
      id: myPublishedId || undefined,
      title: report.title.trim() || `${activeDataset.title} 통계 분석과 생활 개선 제안`,
      author: plan.studentName.trim() || '익명 학생',
      groupName: plan.groupName.trim() || '고등학교 2학년',
      datasetTitle: activeDataset.title,
      datasetSource: activeDataset.source,
      inquiryQuestion: plan.inquiryQuestion || `${plan.targetColumn} 분포 및 확률 탐구`,
      statConcept: plan.selectedConcept,
      adoptedChart: verification.adoptedChart,
      keyStats: {
        n: stats.n,
        mean: stats.mean,
        stdDev: stats.stdDev,
        median: stats.median,
        thresholdValue: plan.thresholdValue,
        thresholdProb: normalProb,
        empiricalRate,
      },
      chartPreviewData: { bins, groups },
      improvementProposal:
        report.improvementProposal.trim() || '데이터 분석 결과를 바탕으로 한 생활 개선 방안',
      reflectionNote: report.reflectionDifference.trim(),
      aiUsageDisclosure: report.aiUsageDisclosure.trim(),
    };

    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || '게시 중 오류가 발생했습니다.');
    }
    const savedPost = data.post as PublishedReport;
    setMyPublishedId(savedPost.id);
    setPublishedPosts((prev) => {
      const idx = prev.findIndex((p) => p.id === savedPost.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedPost;
        return next;
      }
      return [savedPost, ...prev];
    });
  };

  const handleAddPeerComment = async (
    postId: string,
    author: string,
    criterion: PeerComment['criterion'],
    comment: string
  ) => {
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, criterion, comment }),
    });
    const data = await res.json();
    if (!res.ok) return;
    const updatedPost = data.post as PublishedReport;
    setPublishedPosts((prev) => prev.map((p) => (p.id === postId ? updatedPost : p)));
  };

  const handleTopAction = () => {
    if (stage === 4) {
      window.print();
    } else {
      setStage(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleResetProject = () => {
    localStorage.removeItem(STORAGE_KEY);
    setActiveDatasetId(SAMPLE_DATASETS[0].id);
    setPlan(createInitialPlan(SAMPLE_DATASETS[0]));
    setVerification(INITIAL_VERIFICATION);
    setReport(INITIAL_REPORT);
    setAiAnalysis(null);
    setAiError(null);
    setChatMessages([]);
    setMyPublishedId(null);
    setStage(1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopNav
        currentStage={stage}
        onSelectStage={(s) => {
          setStage(s);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onResetOrJumpUpload={handleTopAction}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-8">
        {stage === 1 && (
          <Stage1Observe
            datasets={allDatasets}
            activeDataset={activeDataset}
            columnProfiles={columnProfiles}
            plan={plan}
            onSelectDataset={handleSelectDataset}
            onUpdatePlan={handleUpdatePlan}
            onNextStage={() => {
              setStage(2);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {stage === 2 && (
          <Stage2Plan
            dataset={activeDataset}
            columnProfiles={columnProfiles}
            piiWarnings={piiWarnings}
            plan={plan}
            onUpdatePlan={handleUpdatePlan}
            onPrevStage={() => setStage(1)}
            onNextStage={() => {
              setStage(3);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {stage === 3 && (
          <Stage3Analyze
            dataset={activeDataset}
            columnProfiles={columnProfiles}
            plan={plan}
            values={cleanedSeries.values}
            stats={stats}
            bins={bins}
            binCount={binCount}
            onChangeBinCount={setBinCount}
            groups={groups}
            scatterPoints={correlationData.points}
            correlationR={correlationData.r}
            trendSeries={trendSeries}
            aiAnalysis={aiAnalysis}
            aiLoading={aiLoading}
            aiError={aiError}
            onRunAiAnalysis={handleRunAiAnalysis}
            chatMessages={chatMessages}
            chatLoading={chatLoading}
            onSendChat={handleSendChat}
            activeChart={activeChart}
            onSelectChart={setActiveChart}
            verification={verification}
            onUpdatePlan={handleUpdatePlan}
            onUpdateVerification={handleUpdateVerification}
            onPrevStage={() => setStage(2)}
            onNextStage={() => {
              setStage(4);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {stage === 4 && (
          <Stage4Report
            dataset={activeDataset}
            plan={plan}
            verification={verification}
            report={report}
            values={cleanedSeries.values}
            stats={stats}
            bins={bins}
            groups={groups}
            scatterPoints={correlationData.points}
            correlationR={correlationData.r}
            trendSeries={trendSeries}
            publishedPosts={publishedPosts}
            myPublishedId={myPublishedId}
            onUpdateReport={handleUpdateReport}
            onPublishReport={handlePublishReport}
            onAddPeerComment={handleAddPeerComment}
            onPrevStage={() => setStage(3)}
          />
        )}
      </main>

      <footer className="no-print border-t border-slate-200 bg-white py-5 px-6">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            읽걷쓰AI 프로젝트 · 고등학교 2학년 확률과 통계 (이항분포·정규분포·표본추출) · H-A-H 탐구 스튜디오
          </div>
          <button
            type="button"
            onClick={handleResetProject}
            className="text-slate-600 hover:text-slate-900 hover:underline"
          >
            내 탐구 기록 초기화
          </button>
        </div>
      </footer>
    </div>
  );
}
