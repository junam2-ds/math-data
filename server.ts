import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface PeerCommentRecord {
  id: string;
  author: string;
  criterion: '정규분포 적합성' | '기준값 설정 타당성' | '그래프 왜곡 여부' | '생활 개선 방안';
  comment: string;
  createdAt: string;
}

interface PublishedReportRecord {
  id: string;
  title: string;
  author: string;
  groupName: string;
  datasetTitle: string;
  datasetSource: string;
  inquiryQuestion: string;
  statConcept: 'normal' | 'binomial' | 'sampling';
  adoptedChart: string;
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
    bins: unknown[];
    groups: unknown[];
  };
  improvementProposal: string;
  reflectionNote: string;
  aiUsageDisclosure: string;
  publishedAt: string;
  isRevised: boolean;
  comments: PeerCommentRecord[];
}

const peerReportsStore: PublishedReportRecord[] = [
  {
    id: 'peer-1',
    title: '봄철 권역별 초미세먼지 나쁨(35㎍/㎥ 이상) 발생 확률과 통학 안전 제안',
    author: '김서연',
    groupName: '2학년 3반 1모둠',
    datasetTitle: '수도권·주요도시 일평균 초미세먼지(PM2.5) 측정 자료',
    datasetSource: '한국환경공단(에어코리아)',
    inquiryQuestion:
      '우리 학교 주변 수도권과 타 권역의 초미세먼지 분포는 정규분포로 근사할 수 있으며, 나쁨 기준 초과 확률은 얼마나 될까?',
    statConcept: 'normal',
    adoptedChart: 'histogram_normal',
    keyStats: {
      n: 28,
      mean: 29.18,
      stdDev: 9.04,
      median: 28.5,
      thresholdValue: 35,
      thresholdProb: 0.26,
      empiricalRate: 0.25,
    },
    chartPreviewData: { bins: [], groups: [] },
    improvementProposal:
      '수도권 초미세먼지 극단값(79㎍/㎥)을 제외하면 정규분포 N(29.2, 9.0²)에 가깝게 분포하며, 나쁨 기준(35㎍/㎥) 초과 확률이 약 26%로 나타났습니다. 풍속이 1.5m/s 이하인 날 체육 수업을 실내로 전환하고, 학교 보건실에 미세먼지 경보 알림판을 설치할 것을 제안합니다.',
    reflectionNote:
      '처음에는 모든 날짜의 미세먼지가 비슷하게 높을 거라 예상했지만, 이상치를 분리하고 나니 25~35구간에 밀집된 종 모양 분포를 확인했습니다.',
    aiUsageDisclosure:
      'Gemini AI로 기술통계 요약 및 히스토그램·상자그림 추천을 받고, 이상치 제외 기준과 Y축 0 기준선을 직접 교차 검증함.',
    publishedAt: '2026-11-12',
    isRevised: true,
    comments: [
      {
        id: 'c-1',
        author: '이도현 (2모둠)',
        criterion: '정규분포 적합성',
        comment:
          '이상치(79㎍/㎥)를 무조건 버리지 않고 왜 발생했는지(풍속 0.9m/s) 설명한 점이 설득력 있습니다.',
        createdAt: '2026-11-12',
      },
      {
        id: 'c-2',
        author: '박지민 (4모둠)',
        criterion: '기준값 설정 타당성',
        comment:
          '환경부 나쁨 기준 35㎍/㎥을 근거로 확률을 계산해 생활 제안과 잘 연결되었습니다.',
        createdAt: '2026-11-13',
      },
    ],
  },
  {
    id: 'peer-2',
    title: '고등학생 평일 수면 부족 확률과 야간 스마트폰 사용 제한 캠페인',
    author: '정우진',
    groupName: '2학년 5반 3모둠',
    datasetTitle: '고등학교 2학년 학생 수면시간·스마트폰 사용 표본 조사',
    datasetSource: '교육부 학생건강검사 재구성 표본',
    inquiryQuestion:
      '권장 수면시간(7시간 이상)을 지키는 학생 비율을 이항분포 B(n, p)로 모델링했을 때, 학급 30명 중 10명 이상이 7시간 이상 잘 확률은?',
    statConcept: 'binomial',
    adoptedChart: 'binomial_pmf',
    keyStats: {
      n: 29,
      mean: 6.46,
      stdDev: 0.72,
      median: 6.5,
      thresholdValue: 7.0,
      thresholdProb: 0.227,
      empiricalRate: 0.241,
    },
    chartPreviewData: { bins: [], groups: [] },
    improvementProposal:
      '표본에서 7시간 이상 수면 비율 p가 약 0.24로 나타나 n=30일 때 np=7.2≥5이므로 정규근사도 가능함을 확인했습니다. 야간 스마트폰 사용시간과 수면시간의 강한 음의 상관관계를 바탕으로 23시 이후 스마트폰 방 밖 충전 챌린지를 제안합니다.',
    reflectionNote:
      '막연히 학생 절반은 7시간을 잘 것이라 예상했으나 실제 비율이 24%대에 불과해 데이터 기반 근거의 중요성을 체감했습니다.',
    aiUsageDisclosure:
      'Gemini AI를 통해 산점도와 이항분포 막대그래프를 추천받았고, np≥5 조건은 교과서 공식으로 직접 검산했습니다.',
    publishedAt: '2026-11-13',
    isRevised: false,
    comments: [
      {
        id: 'c-3',
        author: '최유나 (1모둠)',
        criterion: '그래프 왜곡 여부',
        comment:
          '수면시간 막대그래프 Y축이 0에서 시작하도록 맞춰서 과장 없이 깔끔하게 비교되었습니다.',
        createdAt: '2026-11-13',
      },
    ],
  },
];

function extractGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('API_KEY_INVALID') || raw.includes('400')) {
    return {
      status: 400,
      message: 'Gemini API 키 설정을 확인해주세요. Settings > Secrets 패널에서 GEMINI_API_KEY를 확인할 수 있습니다.',
    };
  }
  if (raw.includes('PERMISSION_DENIED') || raw.includes('403')) {
    return {
      status: 403,
      message: 'Gemini API 권한 오류가 발생했습니다. Settings > Secrets 패널의 API 키를 확인해주세요.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message: '요청 한도가 잠시 초과되었습니다. 잠시 후 다시 시도해주세요.',
    };
  }
  return {
    status: 500,
    message: `AI 분석 중 오류가 발생했습니다: ${raw}`,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/analyze', async (req, res) => {
    try {
      const {
        datasetTitle,
        datasetSource,
        inquiryQuestion,
        selectedConcept,
        targetColumn,
        groupColumn,
        secondaryColumn,
        thresholdValue,
        thresholdDirection,
        missingStrategy,
        outlierStrategy,
        preHypothesisShape,
        preHypothesisMeanEstimate,
        stats,
        normalProbability,
        empiricalProportion,
        groupSummaries,
        correlationR,
        columnProfiles,
      } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: '서버에 GEMINI_API_KEY가 설정되어 있지 않습니다. Settings > Secrets에서 확인해주세요.',
        });
      }

      const conceptLabel =
        selectedConcept === 'binomial'
          ? '이항분포 B(n, p) 및 정규근사 [12확통03-03, 03-04]'
          : selectedConcept === 'sampling'
          ? '모집단과 표본추출·모평균 추정 [12확통03-05]'
          : '정규분포 N(m, σ²)와 표준화 확률 예측 [12확통03-04]';

      const prompt = `
당신은 한국 고등학교 2학년 '확률과 통계' 프로젝트 수업을 돕는 데이터 분석·시각화 멘토 AI입니다.
학생이 [H-A-H: 인간→AI→인간] 탐구 절차에 따라 먼저 질문을 세우고 데이터를 점검한 뒤, 당신([A] AI)에게 통계 해석과 최적 그래프 추천을 요청했습니다.
아래의 **실제 계산된 정확한 통계량**(절대 임의로 바꾸지 말 것)을 바탕으로 학생의 비판적 사고를 돕는 구조화된 분석 결과를 작성하세요.

[프로젝트 정보]
- 데이터 제목: ${datasetTitle} (출처: ${datasetSource})
- 학생의 탐구 질문: ${inquiryQuestion || '미입력 (데이터 특성에 맞춰 탐구 방향 제안)'}
- 연결 통계 개념: ${conceptLabel}
- 핵심 분석 변수: ${targetColumn}
- 집단 비교 변수: ${groupColumn || '없음'}
- 보조 수치 변수(상관관계용): ${secondaryColumn || '없음'} (상관계수 r = ${correlationR ?? '계산 안 됨'})
- 기준값 설정: ${thresholdValue} (${thresholdDirection === 'gte' ? '이상' : '이하'})
- 학생의 전처리 선택: 결측치=${missingStrategy}, 이상치=${outlierStrategy}
- 학생의 사전 예상: 분포 형태="${preHypothesisShape || '미입력'}", 대푯값 예상="${preHypothesisMeanEstimate || '미입력'}"

[실제 산출 기술통계량]
- 유효 표본크기 n = ${stats?.n} (원본 ${stats?.rawN}행 중 결측 ${stats?.missingCount}개, 처리로 제외된 행 ${stats?.removedCount}개)
- 평균 = ${stats?.mean?.toFixed?.(3)}, 중앙값 = ${stats?.median?.toFixed?.(3)}, 표준편차 = ${stats?.stdDev?.toFixed?.(3)}
- 최솟값 = ${stats?.min?.toFixed?.(3)}, Q1 = ${stats?.q1?.toFixed?.(3)}, Q3 = ${stats?.q3?.toFixed?.(3)}, 최댓값 = ${stats?.max?.toFixed?.(3)}
- 왜도(Skewness) = ${stats?.skewness?.toFixed?.(3)}
- IQR 기준 이상치 개수 = ${stats?.outlierValues?.length ?? 0}개 (${(stats?.outlierValues || []).join(', ') || '없음'})
- 정규분포 모형 확률 P(X ${thresholdDirection === 'gte' ? '>=' : '<='} ${thresholdValue}) = ${(Number(normalProbability) * 100).toFixed(1)}%
- 실제 데이터 내 기준 충족 비율 = ${(Number(empiricalProportion) * 100).toFixed(1)}%

[집단별 요약(상위)]
${JSON.stringify(groupSummaries || [], null, 2)}

[열 정보]
${JSON.stringify(columnProfiles || [], null, 2)}

지시사항:
1. recommendedCharts에는 아래 6가지 차트 키 중에서 이 데이터와 탐구 질문에 가장 알맞은 3가지를 우선순위(1, 2, 3)대로 추천하세요:
   - "histogram_normal" (히스토그램 + 정규분포 곡선: 연속형 분포 모양과 정규분포 적합성 확인)
   - "binomial_pmf" (이항분포 B(n, p) 확률분포 막대그래프: 기준 충족 여부 성공확률 p 기반 횟수 분포 및 np>=5 정규근사)
   - "boxplot" (상자그림: 중앙값, 사분위수 범위 IQR, 이상치 탐색)
   - "bar_group" (집단별 비교 막대그래프: 범주별 평균 및 기준 초과율 비교)
   - "line_trend" (순서/시간 추세선: 행 순서 또는 날짜 흐름에 따른 변화)
   - "scatter" (산점도: 두 수치 변수 간 상관관계 탐색)
2. 학생이 직접 교차 검증할 수 있도록 그래프 왜곡 위험(예: Y축 0 미시작 절단, 계급 구간 수 편향, 소수 극단값에 의한 평균 쏠림)을 구체적으로 짚어주세요.
3. 고등학생이 이해하기 쉬운 명료하고 친절한 한국어로 작성하세요.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            '당신은 고등학교 확률과 통계 교사와 함께 학생의 H-A-H(인간→AI→인간) 탐구를 지원하는 교육용 데이터 시각화 전문가입니다. AI의 분석을 학생이 맹신하지 않고 스스로 검증하도록 유도해야 합니다.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: '데이터의 전체 특징과 탐구 질문에 대한 2~3문장 핵심 요약',
              },
              descriptiveInterpretation: {
                type: Type.STRING,
                description: '평균·중앙값·표준편차·왜도의 관계를 학생의 사전 예상과 연결해 해석',
              },
              distributionFit: {
                type: Type.OBJECT,
                properties: {
                  isNormalSuitable: { type: Type.BOOLEAN },
                  fitLevel: { type: Type.STRING, enum: ['적합', '부분 적합', '부적합'] },
                  explanation: {
                    type: Type.STRING,
                    description: '평균과 중앙값 차이, 왜도, 이상치 유무에 따른 정규분포 적합성 근거',
                  },
                  binomialConnection: {
                    type: Type.STRING,
                    description: '기준값 충족 여부를 이항분포 B(n, p) 및 np>=5 정규근사와 연결한 설명',
                  },
                },
                required: ['isNormalSuitable', 'fitLevel', 'explanation', 'binomialConnection'],
              },
              thresholdPrediction: {
                type: Type.OBJECT,
                properties: {
                  normalProbability: { type: Type.NUMBER },
                  empiricalProportion: { type: Type.NUMBER },
                  interpretation: {
                    type: Type.STRING,
                    description: '정규분포 예측 확률과 실제 데이터 비율의 비교 해석',
                  },
                  reliabilityNote: {
                    type: Type.STRING,
                    description: '표본 크기 n, 이상치, 표본 대표성 관점에서의 예측 신뢰도 검증 조언',
                  },
                },
                required: [
                  'normalProbability',
                  'empiricalProportion',
                  'interpretation',
                  'reliabilityNote',
                ],
              },
              recommendedCharts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    chartType: {
                      type: Type.STRING,
                      enum: [
                        'histogram_normal',
                        'binomial_pmf',
                        'boxplot',
                        'bar_group',
                        'line_trend',
                        'scatter',
                      ],
                    },
                    title: { type: Type.STRING },
                    priority: { type: Type.INTEGER },
                    reason: { type: Type.STRING },
                    recommendedXAxis: { type: Type.STRING },
                    recommendedYAxis: { type: Type.STRING },
                    distortionWatchout: { type: Type.STRING },
                  },
                  required: [
                    'chartType',
                    'title',
                    'priority',
                    'reason',
                    'recommendedXAxis',
                    'recommendedYAxis',
                    'distortionWatchout',
                  ],
                },
              },
              distortionWarnings: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '그래프 해석 및 통계량 산출 시 주의할 왜곡 요소 2~3가지',
              },
              criticalQuestionsForStudent: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '[H] 학생이 AI 결과를 검증하기 위해 스스로 점검해야 할 질문 3가지',
              },
            },
            required: [
              'summary',
              'descriptiveInterpretation',
              'distributionFit',
              'thresholdPrediction',
              'recommendedCharts',
              'distortionWarnings',
              'criticalQuestionsForStudent',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      // Enforce exact numerical grounding for probabilities
      if (parsed.thresholdPrediction) {
        parsed.thresholdPrediction.normalProbability = Number(normalProbability);
        parsed.thresholdPrediction.empiricalProportion = Number(empiricalProportion);
      }
      res.json(parsed);
    } catch (err) {
      const { status, message } = extractGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const { question, context } = req.body;
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: '서버에 GEMINI_API_KEY가 설정되어 있지 않습니다.',
        });
      }

      const prompt = `
[학생의 현재 데이터 분석 맥락]
- 데이터: ${context?.datasetTitle}
- 탐구 질문: ${context?.inquiryQuestion}
- 분석 변수: ${context?.targetColumn} (n=${context?.n}, 평균=${context?.mean}, 중앙값=${context?.median}, 표준편차=${context?.stdDev})
- 현재 선택한 그래프: ${context?.activeChart}
- 기준값: ${context?.thresholdValue}

[학생의 질문]
${question}

고등학교 2학년 '확률과 통계' 수준에 맞춰 간결하고 명확하게 답변하되(3~5문장), 학생이 스스로 통계 수치나 그래프 축을 다시 확인해 볼 수 있는 팁을 한 가지 포함하세요.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            '당신은 고등학교 수학 확률과 통계 탐구 도우미 Gemini입니다. 친절하지만 비판적 통계 검증 태도를 길러주는 답변을 작성하세요.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      res.json({ reply: response.text ?? '답변을 생성하지 못했습니다.' });
    } catch (err) {
      const { status, message } = extractGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.get('/api/posts', (_req, res) => {
    res.json({ posts: peerReportsStore });
  });

  app.post('/api/posts', (req, res) => {
    const body = req.body as Partial<PublishedReportRecord>;
    if (!body.title || !body.author) {
      return res.status(400).json({ error: '보고서 제목과 작성자 이름을 입력해주세요.' });
    }

    const existingIdx = body.id ? peerReportsStore.findIndex((p) => p.id === body.id) : -1;
    if (existingIdx >= 0) {
      const updated: PublishedReportRecord = {
        ...peerReportsStore[existingIdx],
        ...body,
        isRevised: true,
        publishedAt: new Date().toISOString().slice(0, 10),
        comments: peerReportsStore[existingIdx].comments,
      } as PublishedReportRecord;
      peerReportsStore[existingIdx] = updated;
      return res.json({ post: updated });
    }

    const created: PublishedReportRecord = {
      id: `peer-${Date.now()}`,
      title: body.title,
      author: body.author,
      groupName: body.groupName || '개인 탐구',
      datasetTitle: body.datasetTitle || '공공데이터 분석',
      datasetSource: body.datasetSource || '공공데이터포털',
      inquiryQuestion: body.inquiryQuestion || '',
      statConcept: body.statConcept || 'normal',
      adoptedChart: body.adoptedChart || 'histogram_normal',
      keyStats: body.keyStats || {
        n: 0,
        mean: 0,
        stdDev: 0,
        median: 0,
        thresholdValue: 0,
        thresholdProb: 0,
        empiricalRate: 0,
      },
      chartPreviewData: body.chartPreviewData || { bins: [], groups: [] },
      improvementProposal: body.improvementProposal || '',
      reflectionNote: body.reflectionNote || '',
      aiUsageDisclosure: body.aiUsageDisclosure || '',
      publishedAt: new Date().toISOString().slice(0, 10),
      isRevised: false,
      comments: [],
    };
    peerReportsStore.unshift(created);
    res.status(201).json({ post: created });
  });

  app.post('/api/posts/:id/comments', (req, res) => {
    const { id } = req.params;
    const { author, criterion, comment } = req.body;
    const target = peerReportsStore.find((p) => p.id === id);
    if (!target) {
      return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    }
    if (!author || !comment) {
      return res.status(400).json({ error: '작성자와 피드백 내용을 입력해주세요.' });
    }
    const newComment: PeerCommentRecord = {
      id: `c-${Date.now()}`,
      author,
      criterion: criterion || '정규분포 적합성',
      comment,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    target.comments.push(newComment);
    res.status(201).json({ comment: newComment, post: target });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
