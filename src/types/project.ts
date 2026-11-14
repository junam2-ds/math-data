export type ProjectStage = 1 | 2 | 3 | 4;

export type ColumnType = 'numeric' | 'categorical' | 'temporal';

export type MissingStrategy = 'drop' | 'mean' | 'median' | 'keep';
export type OutlierStrategy = 'keep' | 'iqr_trim';

export type StatConcept = 'normal' | 'binomial' | 'sampling';

export type ChartType =
  | 'histogram_normal'
  | 'binomial_pmf'
  | 'boxplot'
  | 'bar_group'
  | 'line_trend'
  | 'scatter';

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  totalCount: number;
  missingCount: number;
  uniqueCount: number;
  sampleValues: string[];
  outlierCount: number;
}

export interface Dataset {
  id: string;
  title: string;
  source: string;
  category: string;
  description: string;
  unitHint: string;
  defaultTargetCol: string;
  defaultGroupCol?: string;
  defaultSecondaryCol?: string;
  defaultThreshold?: number;
  headers: string[];
  rows: Record<string, string>[];
}

export interface DescriptiveStats {
  n: number;
  rawN: number;
  missingCount: number;
  removedCount: number;
  mean: number;
  median: number;
  mode: number | null;
  variance: number;
  stdDev: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  iqr: number;
  skewness: number;
  lowerFence: number;
  upperFence: number;
  outlierValues: number[];
}

export interface HistogramBin {
  start: number;
  end: number;
  mid: number;
  count: number;
  density: number;
  normalPdf: number;
}

export interface GroupSummary {
  group: string;
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  exceedRate: number;
}

export interface ChartRecommendation {
  chartType: ChartType;
  title: string;
  priority: number;
  reason: string;
  recommendedXAxis: string;
  recommendedYAxis: string;
  distortionWatchout: string;
}

export interface AIAnalysisResult {
  summary: string;
  descriptiveInterpretation: string;
  distributionFit: {
    isNormalSuitable: boolean;
    fitLevel: '적합' | '부분 적합' | '부적합';
    explanation: string;
    binomialConnection: string;
  };
  thresholdPrediction: {
    normalProbability: number;
    empiricalProportion: number;
    interpretation: string;
    reliabilityNote: string;
  };
  recommendedCharts: ChartRecommendation[];
  distortionWarnings: string[];
  criticalQuestionsForStudent: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface StudentPlan {
  studentName: string;
  groupName: string;
  observationTimeChange: string;
  observationGroupDiff: string;
  observationOutlierShape: string;
  observationRealLifeLink: string;
  inquiryQuestion: string;
  questionType: '근거 제시' | '차이·공통점 비교' | '해결 방안 탐색';
  selectedConcept: StatConcept;
  targetColumn: string;
  groupColumn: string;
  secondaryColumn: string;
  thresholdValue: number;
  thresholdDirection: 'gte' | 'lte';
  missingStrategy: MissingStrategy;
  outlierStrategy: OutlierStrategy;
  preHypothesisShape: string;
  preHypothesisMeanEstimate: string;
  preSelectedCharts: ChartType[];
  ethicsSourceChecked: boolean;
  ethicsNoPiiChecked: boolean;
  ethicsVerifyAiChecked: boolean;
}

export interface StudentVerification {
  adoptedChart: ChartType;
  secondaryChart: ChartType | null;
  expectationComparison: string;
  normalFitJudgment: string;
  distortionCheckNote: string;
  checkNormalFit: boolean;
  checkThresholdValid: boolean;
  checkNoDistortion: boolean;
}

export interface StudentReport {
  title: string;
  improvementProposal: string;
  targetAudience: string;
  expectedEffect: string;
  aiUsageDisclosure: string;
  selfEvalConcept: '잘함' | '보통' | '노력' | '';
  selfEvalAiAnalysis: '잘함' | '보통' | '노력' | '';
  selfEvalReport: '잘함' | '보통' | '노력' | '';
  reflectionDifference: string;
  revisedAfterFeedback: string;
}

export interface PeerComment {
  id: string;
  author: string;
  criterion: '정규분포 적합성' | '기준값 설정 타당성' | '그래프 왜곡 여부' | '생활 개선 방안';
  comment: string;
  createdAt: string;
}

export interface PublishedReport {
  id: string;
  title: string;
  author: string;
  groupName: string;
  datasetTitle: string;
  datasetSource: string;
  inquiryQuestion: string;
  statConcept: StatConcept;
  adoptedChart: ChartType;
  keyStats: {
    n: number;
    mean: number;
    stdDev: number;
    median: number;
    thresholdValue: number;
    thresholdProb: number;
    empiricalRate: number;
  };
  chartPreviewData: {
    bins: HistogramBin[];
    groups: GroupSummary[];
  };
  improvementProposal: string;
  reflectionNote: string;
  aiUsageDisclosure: string;
  publishedAt: string;
  isRevised: boolean;
  comments: PeerComment[];
}

export interface PiiWarning {
  column: string;
  type: string;
  sampleCount: number;
}
