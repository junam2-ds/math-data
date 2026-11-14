import React, { useMemo, useRef, useState } from 'react';
import { ArrowRight, ExternalLink, Search, Upload } from 'lucide-react';
import { ColumnProfile, Dataset, StudentPlan } from '../types/project';
import {
  decodeCsvFile,
  isMissingValue,
  parseCsvText,
  parseNumericValue,
  quantile,
} from '../utils/statistics';

interface Stage1ObserveProps {
  datasets: Dataset[];
  activeDataset: Dataset;
  columnProfiles: ColumnProfile[];
  plan: StudentPlan;
  onSelectDataset: (dataset: Dataset) => void;
  onUpdatePlan: (patch: Partial<StudentPlan>) => void;
  onNextStage: () => void;
}

export const Stage1Observe: React.FC<Stage1ObserveProps> = ({
  datasets,
  activeDataset,
  columnProfiles,
  plan,
  onSelectDataset,
  onUpdatePlan,
  onNextStage,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightAnomalies, setHighlightAnomalies] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showAllRows, setShowAllRows] = useState(false);

  const numericFences = useMemo(() => {
    const map = new Map<string, { lower: number; upper: number }>();
    for (const col of columnProfiles) {
      if (col.type !== 'numeric') continue;
      const vals = activeDataset.rows
        .map((r) => parseNumericValue(r[col.name]))
        .filter((v): v is number => v !== null)
        .sort((a, b) => a - b);
      if (vals.length >= 4) {
        const q1 = quantile(vals, 0.25);
        const q3 = quantile(vals, 0.75);
        const iqr = q3 - q1;
        map.set(col.name, { lower: q1 - 1.5 * iqr, upper: q3 + 1.5 * iqr });
      }
    }
    return map;
  }, [activeDataset, columnProfiles]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeDataset.rows;
    return activeDataset.rows.filter((row) =>
      activeDataset.headers.some((h) => String(row[h] ?? '').toLowerCase().includes(q))
    );
  }, [activeDataset, searchQuery]);

  const visibleRows = showAllRows ? filteredRows : filteredRows.slice(0, 14);

  const totalMissing = useMemo(
    () => columnProfiles.reduce((acc, c) => acc + c.missingCount, 0),
    [columnProfiles]
  );

  const totalOutliers = useMemo(
    () => columnProfiles.reduce((acc, c) => acc + c.outlierCount, 0),
    [columnProfiles]
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await decodeCsvFile(file);
      const parsed = parseCsvText(text, file.name);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setUploadError('CSV 파일에서 유효한 열 또는 데이터 행을 읽지 못했습니다. 쉼표로 구분된 CSV 파일인지 확인해주세요.');
        return;
      }
      onSelectDataset(parsed);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '파일을 읽는 중 오류가 발생했습니다.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-8">
      {/* Stage Hero / Lesson Context */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>1단계 · 1차시</span>
              <span aria-hidden="true">·</span>
              <span>읽걷쓰(읽기)</span>
              <span aria-hidden="true">·</span>
              <span>현상 관찰하기</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 text-balance">
              관심 주제의 공공데이터를 직접 훑어보며 삶의 문제 발견하기
            </h1>
            <p className="text-sm md:text-base leading-relaxed text-slate-600 max-w-3xl">
              AI에게 분석을 맡기기 전에, 학생이 먼저 공공데이터 표의 열과 수치를 스프레드시트로 살펴봅니다.
              시간에 따른 변화, 집단 간 차이, 튀는 값(이상치)과 결측치가 실제 우리 주변 일상에서 어떤 모습으로 나타나는지 관찰해 보세요.
            </p>
          </div>

          <div className="lg:col-span-4 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">공공데이터 CSV 불러오기</span>
              <a
                href="https://www.data.go.kr"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:underline"
              >
                공공데이터 포털
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              공공데이터 포털(data.go.kr)에서 내려받은 CSV 파일(UTF-8 및 EUC-KR 한글 인코딩 자동 인식)을 업로드하거나 아래 표본 자료를 선택하세요.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100"
            >
              <Upload className="h-4 w-4 text-sky-600" />
              내 CSV 파일 업로드
            </button>
            {uploadError && (
              <p className="text-xs text-red-700 font-medium">{uploadError}</p>
            )}
          </div>
        </div>
      </section>

      {/* Dataset Selector Tabs */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">01. 공공데이터 표본 선택</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              교과 성취기준(이항분포·정규분포·표본추출) 탐구에 맞춰 구성된 생활 공공데이터입니다.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            현재 선택: {activeDataset.rows.length}행 · {activeDataset.headers.length}열 · 결측 {totalMissing}개 · 이상치 의심 {totalOutliers}개
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {datasets.map((ds) => {
            const isSelected = ds.id === activeDataset.id;
            return (
              <button
                key={ds.id}
                type="button"
                onClick={() => onSelectDataset(ds)}
                className={`text-left rounded-xl border p-4 transition-colors ${
                  isSelected
                    ? 'border-sky-600 bg-sky-50/40'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1.5">
                  <span>{ds.category}</span>
                  <span className="font-mono tabular-nums">{ds.rows.length}행</span>
                </div>
                <div className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
                  {ds.title}
                </div>
                <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {ds.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Spreadsheet Inspection + Column Profiles */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">
              02. 스프레드시트 원자료 탐색 ({activeDataset.title})
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>출처: {activeDataset.source}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">총 {activeDataset.rows.length}행</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="행 내용 검색..."
                className="w-48 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setHighlightAnomalies((v) => !v)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                highlightAnomalies
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              결측·튀는 값 강조: {highlightAnomalies ? '켜짐' : '꺼짐'}
            </button>
          </div>
        </div>

        {/* Column Structure Strip */}
        <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-3 overflow-x-auto">
          <div className="flex items-stretch gap-3 min-w-max">
            {columnProfiles.map((col) => (
              <div
                key={col.name}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 min-w-[160px]"
              >
                <div className="text-xs font-semibold text-slate-900 truncate max-w-[180px]">
                  {col.name}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 font-mono tabular-nums">
                  <span>
                    {col.type === 'numeric'
                      ? '수치형'
                      : col.type === 'temporal'
                      ? '시간형'
                      : '범주형'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>고유 {col.uniqueCount}</span>
                  {col.missingCount > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-amber-700 font-medium">결측 {col.missingCount}</span>
                    </>
                  )}
                  {col.outlierCount > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-red-700 font-medium">이상치 {col.outlierCount}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                <th className="py-2.5 px-4 w-12 text-center font-mono tabular-nums text-slate-400">#</th>
                {activeDataset.headers.map((h) => {
                  const prof = columnProfiles.find((c) => c.name === h);
                  return (
                    <th
                      key={h}
                      className={`py-2.5 px-4 whitespace-nowrap ${
                        prof?.type === 'numeric' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {visibleRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 text-center font-mono tabular-nums text-slate-400">
                    {rIdx + 1}
                  </td>
                  {activeDataset.headers.map((h) => {
                    const raw = row[h];
                    const missing = isMissingValue(raw);
                    const prof = columnProfiles.find((c) => c.name === h);
                    const num = prof?.type === 'numeric' ? parseNumericValue(raw) : null;
                    const fence = numericFences.get(h);
                    const isOutlier =
                      num !== null && fence ? num < fence.lower || num > fence.upper : false;

                    let cellClass = 'text-slate-700';
                    if (highlightAnomalies && missing) {
                      cellClass = 'bg-amber-50 text-amber-800 font-medium';
                    } else if (highlightAnomalies && isOutlier) {
                      cellClass = 'bg-red-50 text-red-700 font-semibold';
                    }

                    return (
                      <td
                        key={h}
                        className={`py-2.5 px-4 whitespace-nowrap ${
                          prof?.type === 'numeric' ? 'text-right font-mono tabular-nums' : ''
                        } ${cellClass}`}
                      >
                        {missing ? '결측(빈값)' : raw}
                        {highlightAnomalies && isOutlier && ' (튀는값)'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRows.length > 14 && (
          <div className="border-t border-slate-200 px-5 py-3 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {visibleRows.length} / {filteredRows.length}행 표시 중
            </span>
            <button
              type="button"
              onClick={() => setShowAllRows((v) => !v)}
              className="text-xs font-medium text-sky-700 hover:underline"
            >
              {showAllRows ? '접기 (14행만 보기)' : `전체 ${filteredRows.length}행 모두 보기`}
            </button>
          </div>
        )}
      </section>

      {/* Stage 1 Observation Notes */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">03. 현상 관찰 기록지 (모둠 나눔)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              수치를 직접 훑어보며 발견한 데이터의 변화·차이·특이점과 실제 일상 장면을 기록하세요.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800">
              시간에 따른 변화 (또는 행 순서의 흐름)
            </label>
            <textarea
              rows={3}
              value={plan.observationTimeChange}
              onChange={(e) => onUpdatePlan({ observationTimeChange: e.target.value })}
              placeholder="예: 3월 7일~8일 사이에 미세먼지 수치가 급격히 높아졌다가 풍속이 강해지며 다시 낮아짐"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800">
              집단 간 차이 (지역·노선·요일 등 범주별 특징)
            </label>
            <textarea
              rows={3}
              value={plan.observationGroupDiff}
              onChange={(e) => onUpdatePlan({ observationGroupDiff: e.target.value })}
              placeholder="예: 수도권과 충청권은 30㎍/㎥ 안팎으로 높고 영남권은 상대적으로 낮게 분포함"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800">
              튀는 값(이상치)·결측치 및 분포 모양 특징
            </label>
            <textarea
              rows={3}
              value={plan.observationOutlierShape}
              onChange={(e) => onUpdatePlan({ observationOutlierShape: e.target.value })}
              placeholder="예: 충청권 3월 4일에 결측치 1건이 있고, 수도권 3월 8일 79㎍/㎥는 다른 값보다 유독 큼"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800">
              실제 학교·지역사회 일상과 연관지어 보기
            </label>
            <textarea
              rows={3}
              value={plan.observationRealLifeLink}
              onChange={(e) => onUpdatePlan({ observationRealLifeLink: e.target.value })}
              placeholder="예: 미세먼지 35㎍/㎥ 이상인 날 야외 체육 수업을 하면 호흡기 불편을 호소하는 친구가 많음"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onNextStage}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-700"
          >
            2단계: 탐구 질문 및 통계 계획 수립
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
