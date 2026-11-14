import React, { useState } from 'react';
import {
  ChartType,
  DescriptiveStats,
  GroupSummary,
  HistogramBin,
} from '../types/project';
import { binomialPmf, formatNum, normalPdf } from '../utils/statistics';

interface StatisticalChartsProps {
  chartType: ChartType;
  values: number[];
  stats: DescriptiveStats;
  bins: HistogramBin[];
  groups: GroupSummary[];
  scatterPoints: { x: number; y: number; label: string }[];
  correlationR: number | null;
  trendSeries: { label: string; value: number }[];
  targetColumn: string;
  groupColumn: string;
  secondaryColumn: string;
  thresholdValue: number;
  thresholdDirection: 'gte' | 'lte';
  showNormalOverlay: boolean;
  truncateYAxis: boolean;
  binomialN: number;
  binomialP: number;
  compact?: boolean;
}

export const CHART_LABELS: Record<ChartType, string> = {
  histogram_normal: '히스토그램 + 정규분포 곡선',
  binomial_pmf: '이항분포 B(n, p) 확률 막대그래프',
  boxplot: '상자그림 (사분위수·이상치)',
  bar_group: '집단별 평균 비교 막대그래프',
  line_trend: '순서·시간 흐름 추세선 그래프',
  scatter: '두 변수 상관관계 산점도',
};

export const StatisticalCharts: React.FC<StatisticalChartsProps> = ({
  chartType,
  values,
  stats,
  bins,
  groups,
  scatterPoints,
  correlationR,
  trendSeries,
  targetColumn,
  groupColumn,
  secondaryColumn,
  thresholdValue,
  thresholdDirection,
  showNormalOverlay,
  truncateYAxis,
  binomialN,
  binomialP,
  compact = false,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const width = 760;
  const height = compact ? 290 : 380;
  const pad = { top: 28, right: 28, bottom: 52, left: 62 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  if (values.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500">
        선택한 변수에서 분석 가능한 수치 데이터를 찾지 못했습니다. 다른 수치형 열을 선택해주세요.
      </div>
    );
  }

  // 1. HISTOGRAM + NORMAL CURVE
  if (chartType === 'histogram_normal') {
    const minX = bins[0]?.start ?? stats.min;
    const maxX = bins[bins.length - 1]?.end ?? stats.max;
    const spanX = maxX - minX || 1;
    const binWidth = bins[0] ? bins[0].end - bins[0].start : 1;

    // Use density scale if normal overlay is on, or scaled count
    const maxDensity = Math.max(
      ...bins.map((b) => b.density),
      showNormalOverlay && stats.stdDev > 0
        ? normalPdf(stats.mean, stats.mean, stats.stdDev)
        : 0,
      0.0001
    );
    const maxY = maxDensity * 1.15;

    const toX = (val: number) => pad.left + ((val - minX) / spanX) * plotW;
    const toY = (d: number) => pad.top + plotH - (d / maxY) * plotH;

    // Generate smooth Normal curve points
    const curveSteps = 90;
    const curvePoints: { x: number; px: number; py: number }[] = [];
    for (let i = 0; i <= curveSteps; i++) {
      const xv = minX + (spanX * i) / curveSteps;
      const pdf = stats.stdDev > 0 ? normalPdf(xv, stats.mean, stats.stdDev) : 0;
      curvePoints.push({ x: xv, px: toX(xv), py: toY(pdf) });
    }
    const curvePath = curvePoints
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.px.toFixed(1)} ${pt.py.toFixed(1)}`)
      .join(' ');

    // Shaded area for P(X >= k) or P(X <= k)
    const shadedPoints = curvePoints.filter((pt) =>
      thresholdDirection === 'gte' ? pt.x >= thresholdValue : pt.x <= thresholdValue
    );
    let shadedPath = '';
    if (showNormalOverlay && shadedPoints.length >= 2) {
      const baseLineY = toY(0);
      shadedPath =
        `M ${shadedPoints[0].px.toFixed(1)} ${baseLineY.toFixed(1)} ` +
        shadedPoints.map((pt) => `L ${pt.px.toFixed(1)} ${pt.py.toFixed(1)}`).join(' ') +
        ` L ${shadedPoints[shadedPoints.length - 1].px.toFixed(1)} ${baseLineY.toFixed(1)} Z`;
    }

    const clampedThresholdPx = Math.max(pad.left, Math.min(pad.left + plotW, toX(thresholdValue)));
    const meanPx = Math.max(pad.left, Math.min(pad.left + plotW, toX(stats.mean)));

    return (
      <div className="relative w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
          {/* Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const yPos = pad.top + plotH * (1 - t);
            const approxCount = Math.round(t * maxY * values.length * binWidth);
            return (
              <g key={t}>
                <line
                  x1={pad.left}
                  y1={yPos}
                  x2={pad.left + plotW}
                  y2={yPos}
                  stroke="#e2e8f0"
                  strokeDasharray={t === 0 ? undefined : '3 3'}
                />
                <text
                  x={pad.left - 10}
                  y={yPos + 4}
                  textAnchor="end"
                  className="fill-slate-500 text-[11px] font-mono tabular-nums"
                >
                  {approxCount}
                </text>
              </g>
            );
          })}

          {/* Shaded tail under Normal curve */}
          {shadedPath && <path d={shadedPath} fill="rgba(2, 132, 199, 0.16)" />}

          {/* Histogram Bars */}
          {bins.map((b, i) => {
            const x1 = toX(b.start) + 1.5;
            const x2 = toX(b.end) - 1.5;
            const barW = Math.max(2, x2 - x1);
            const barY = toY(b.density);
            const barH = Math.max(0, pad.top + plotH - barY);
            const isActive = hoveredIdx === i;
            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                <rect
                  x={x1}
                  y={barY}
                  width={barW}
                  height={barH}
                  rx={2}
                  fill={isActive ? '#0369a1' : '#cbd5e1'}
                  stroke="#94a3b8"
                  strokeWidth={0.75}
                />
                <text
                  x={(x1 + x2) / 2}
                  y={pad.top + plotH + 16}
                  textAnchor="middle"
                  className="fill-slate-600 text-[10px] font-mono tabular-nums"
                >
                  {formatNum(b.start, 1)}
                </text>
              </g>
            );
          })}

          {/* Final tick */}
          <text
            x={pad.left + plotW}
            y={pad.top + plotH + 16}
            textAnchor="middle"
            className="fill-slate-600 text-[10px] font-mono tabular-nums"
          >
            {formatNum(maxX, 1)}
          </text>

          {/* Normal PDF Overlay */}
          {showNormalOverlay && stats.stdDev > 0 && (
            <path d={curvePath} fill="none" stroke="#0284c7" strokeWidth={2.5} />
          )}

          {/* Mean Marker */}
          <line
            x1={meanPx}
            y1={pad.top}
            x2={meanPx}
            y2={pad.top + plotH}
            stroke="#0f172a"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <text
            x={meanPx}
            y={pad.top - 8}
            textAnchor="middle"
            className="fill-slate-900 text-[11px] font-semibold font-mono tabular-nums"
          >
            평균 {formatNum(stats.mean, 2)}
          </text>

          {/* Threshold Marker */}
          <line
            x1={clampedThresholdPx}
            y1={pad.top + 8}
            x2={clampedThresholdPx}
            y2={pad.top + plotH}
            stroke="#d97706"
            strokeWidth={2}
          />
          <text
            x={clampedThresholdPx}
            y={pad.top + 20}
            dx={clampedThresholdPx > width - 110 ? -6 : 6}
            textAnchor={clampedThresholdPx > width - 110 ? 'end' : 'start'}
            className="fill-amber-700 text-[11px] font-semibold font-mono tabular-nums"
          >
            기준 {formatNum(thresholdValue, 1)}
          </text>

          {/* Axis Labels */}
          <text
            x={pad.left + plotW / 2}
            y={height - 10}
            textAnchor="middle"
            className="fill-slate-600 text-xs font-medium"
          >
            {targetColumn} 구간
          </text>
          <text
            x={16}
            y={pad.top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 16 ${pad.top + plotH / 2})`}
            className="fill-slate-600 text-xs font-medium"
          >
            도수(빈도)
          </text>
        </svg>

        {hoveredIdx !== null && bins[hoveredIdx] && (
          <div className="mt-1 flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 font-mono tabular-nums">
            <span>
              구간: {formatNum(bins[hoveredIdx].start, 2)} ~ {formatNum(bins[hoveredIdx].end, 2)}
            </span>
            <span>
              관측 빈도: {bins[hoveredIdx].count}개 ({((bins[hoveredIdx].count / values.length) * 100).toFixed(1)}%)
            </span>
          </div>
        )}
      </div>
    );
  }

  // 2. BINOMIAL B(n, p) PMF + NORMAL APPROXIMATION
  if (chartType === 'binomial_pmf') {
    const nTrials = Math.max(5, Math.min(60, Math.round(binomialN)));
    const pSuccess = Math.max(0.01, Math.min(0.99, binomialP));
    const bMean = nTrials * pSuccess;
    const bStd = Math.sqrt(nTrials * pSuccess * (1 - pSuccess));
    const canApproxNormal = bMean >= 5 && nTrials * (1 - pSuccess) >= 5;

    const pmfBars = Array.from({ length: nTrials + 1 }, (_, k) => ({
      k,
      prob: binomialPmf(k, nTrials, pSuccess),
      normalApprox: bStd > 0 ? normalPdf(k, bMean, bStd) : 0,
    }));

    const maxP = Math.max(...pmfBars.map((d) => Math.max(d.prob, d.normalApprox)), 0.05) * 1.15;
    const stepW = plotW / (nTrials + 1);
    const toY = (p: number) => pad.top + plotH - (p / maxYOr(maxP)) * plotH;

    function maxYOr(v: number) {
      return v > 0 ? v : 1;
    }

    const normalCurvePath = pmfBars
      .map((d, i) => {
        const px = pad.left + (d.k + 0.5) * stepW;
        const py = toY(d.normalApprox);
        return `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
      })
      .join(' ');

    return (
      <div className="w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const yPos = pad.top + plotH * (1 - t);
            return (
              <g key={t}>
                <line
                  x1={pad.left}
                  y1={yPos}
                  x2={pad.left + plotW}
                  y2={yPos}
                  stroke="#e2e8f0"
                  strokeDasharray={t === 0 ? undefined : '3 3'}
                />
                <text
                  x={pad.left - 8}
                  y={yPos + 4}
                  textAnchor="end"
                  className="fill-slate-500 text-[11px] font-mono tabular-nums"
                >
                  {(t * maxP * 100).toFixed(1)}%
                </text>
              </g>
            );
          })}

          {pmfBars.map((d, idx) => {
            const barW = Math.max(3, stepW * 0.72);
            const xPos = pad.left + idx * stepW + (stepW - barW) / 2;
            const yPos = toY(d.prob);
            const barH = Math.max(0, pad.top + plotH - yPos);
            const isHover = hoveredIdx === idx;
            const showTick = nTrials <= 20 || idx % Math.ceil(nTrials / 12) === 0;
            return (
              <g
                key={d.k}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                <rect
                  x={xPos}
                  y={yPos}
                  width={barW}
                  height={barH}
                  rx={1.5}
                  fill={isHover ? '#0369a1' : '#38bdf8'}
                  opacity={isHover ? 1 : 0.8}
                />
                {showTick && (
                  <text
                    x={xPos + barW / 2}
                    y={pad.top + plotH + 16}
                    textAnchor="middle"
                    className="fill-slate-600 text-[10px] font-mono tabular-nums"
                  >
                    {d.k}
                  </text>
                )}
              </g>
            );
          })}

          {showNormalOverlay && canApproxNormal && (
            <path d={normalCurvePath} fill="none" stroke="#0f172a" strokeWidth={2} strokeDasharray="5 3" />
          )}

          <text
            x={pad.left + plotW / 2}
            y={pad.top - 8}
            textAnchor="middle"
            className="fill-slate-800 text-xs font-mono tabular-nums"
          >
            B({nTrials}, {pSuccess.toFixed(2)}) · 평균 np={formatNum(bMean, 2)} · 표준편차 √npq={formatNum(bStd, 2)} · 정규근사 {canApproxNormal ? '가능 (np≥5, nq≥5)' : '주의 (표본수 부족)'}
          </text>

          <text
            x={pad.left + plotW / 2}
            y={height - 10}
            textAnchor="middle"
            className="fill-slate-600 text-xs font-medium"
          >
            기준 충족 성공 횟수 X (회)
          </text>
        </svg>

        {hoveredIdx !== null && pmfBars[hoveredIdx] && (
          <div className="mt-1 flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 font-mono tabular-nums">
            <span>성공 횟수 X = {pmfBars[hoveredIdx].k}회</span>
            <span>이항확률 P(X={pmfBars[hoveredIdx].k}) = {(pmfBars[hoveredIdx].prob * 100).toFixed(2)}%</span>
          </div>
        )}
      </div>
    );
  }

  // 3. BOX PLOT
  if (chartType === 'boxplot') {
    const minDomain = Math.min(stats.min, stats.lowerFence);
    const maxDomain = Math.max(stats.max, stats.upperFence);
    const span = maxDomain - minDomain || 1;
    const toX = (v: number) => pad.left + ((v - minDomain) / span) * plotW;
    const centerY = pad.top + plotH / 2;
    const boxH = 74;

    const whiskerMin = Math.max(stats.min, stats.lowerFence);
    const whiskerMax = Math.min(stats.max, stats.upperFence);

    return (
      <div className="w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const val = minDomain + span * t;
            const px = toX(val);
            return (
              <g key={t}>
                <line x1={px} y1={pad.top} x2={px} y2={pad.top + plotH} stroke="#e2e8f0" strokeDasharray="3 3" />
                <text
                  x={px}
                  y={pad.top + plotH + 18}
                  textAnchor="middle"
                  className="fill-slate-600 text-[11px] font-mono tabular-nums"
                >
                  {formatNum(val, 1)}
                </text>
              </g>
            );
          })}

          {/* Whiskers */}
          <line x1={toX(whiskerMin)} y1={centerY} x2={toX(stats.q1)} y2={centerY} stroke="#475569" strokeWidth={2} />
          <line x1={toX(stats.q3)} y1={centerY} x2={toX(whiskerMax)} y2={centerY} stroke="#475569" strokeWidth={2} />
          <line x1={toX(whiskerMin)} y1={centerY - 18} x2={toX(whiskerMin)} y2={centerY + 18} stroke="#475569" strokeWidth={2} />
          <line x1={toX(whiskerMax)} y1={centerY - 18} x2={toX(whiskerMax)} y2={centerY + 18} stroke="#475569" strokeWidth={2} />

          {/* IQR Box */}
          <rect
            x={toX(stats.q1)}
            y={centerY - boxH / 2}
            width={Math.max(4, toX(stats.q3) - toX(stats.q1))}
            height={boxH}
            fill="#e0f2fe"
            stroke="#0284c7"
            strokeWidth={2}
            rx={3}
          />

          {/* Median Line */}
          <line
            x1={toX(stats.median)}
            y1={centerY - boxH / 2}
            x2={toX(stats.median)}
            y2={centerY + boxH / 2}
            stroke="#0f172a"
            strokeWidth={3}
          />

          {/* Mean Marker */}
          <circle cx={toX(stats.mean)} cy={centerY} r={5} fill="#d97706" stroke="#ffffff" strokeWidth={1.5} />

          {/* Outlier Points */}
          {stats.outlierValues.map((ov, i) => (
            <g key={i}>
              <circle cx={toX(ov)} cy={centerY} r={5.5} fill="#dc2626" opacity={0.85} />
              <text
                x={toX(ov)}
                y={centerY - 12}
                textAnchor="middle"
                className="fill-red-700 text-[10px] font-mono tabular-nums"
              >
                {formatNum(ov, 1)}
              </text>
            </g>
          ))}

          {/* Labels */}
          <text x={toX(stats.q1)} y={centerY - boxH / 2 - 8} textAnchor="middle" className="fill-slate-600 text-[11px] font-mono tabular-nums">
            Q1 {formatNum(stats.q1, 1)}
          </text>
          <text x={toX(stats.median)} y={centerY + boxH / 2 + 16} textAnchor="middle" className="fill-slate-900 text-[11px] font-semibold font-mono tabular-nums">
            중앙값 {formatNum(stats.median, 1)}
          </text>
          <text x={toX(stats.q3)} y={centerY - boxH / 2 - 8} textAnchor="middle" className="fill-slate-600 text-[11px] font-mono tabular-nums">
            Q3 {formatNum(stats.q3, 1)}
          </text>

          <text x={pad.left + plotW / 2} y={height - 10} textAnchor="middle" className="fill-slate-600 text-xs font-medium">
            {targetColumn} (주황 점 = 평균 {formatNum(stats.mean, 2)} · 빨간 점 = IQR 기준 이상치 {stats.outlierValues.length}개)
          </text>
        </svg>
      </div>
    );
  }

  // 4. GROUP COMPARISON BAR CHART (with Y-axis truncation distortion toggle!)
  if (chartType === 'bar_group') {
    if (groups.length === 0) {
      return (
        <div className="flex h-72 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500">
          집단 비교를 위해 2단계 또는 설정에서 범주형 집단 열을 선택해주세요.
        </div>
      );
    }

    const gMin = Math.min(...groups.map((g) => g.mean));
    const gMax = Math.max(...groups.map((g) => g.mean), thresholdValue);
    const yStart = truncateYAxis ? Math.max(0, gMin * 0.85) : 0;
    const yEnd = gMax * 1.12 || 1;
    const ySpan = yEnd - yStart || 1;

    const toY = (v: number) => pad.top + plotH - ((v - yStart) / ySpan) * plotH;
    const slotW = plotW / groups.length;

    return (
      <div className="w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const val = yStart + ySpan * t;
            const yPos = toY(val);
            return (
              <g key={t}>
                <line x1={pad.left} y1={yPos} x2={pad.left + plotW} y2={yPos} stroke="#e2e8f0" strokeDasharray={t === 0 ? undefined : '3 3'} />
                <text x={pad.left - 8} y={yPos + 4} textAnchor="end" className="fill-slate-500 text-[11px] font-mono tabular-nums">
                  {formatNum(val, 1)}
                </text>
              </g>
            );
          })}

          {groups.map((g, idx) => {
            const barW = Math.min(54, slotW * 0.6);
            const xPos = pad.left + idx * slotW + (slotW - barW) / 2;
            const yPos = toY(g.mean);
            const barH = Math.max(2, pad.top + plotH - yPos);
            const isHover = hoveredIdx === idx;
            return (
              <g
                key={g.group}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                <rect
                  x={xPos}
                  y={yPos}
                  width={barW}
                  height={barH}
                  rx={3}
                  fill={isHover ? '#0369a1' : '#0284c7'}
                  opacity={isHover ? 1 : 0.85}
                />
                <text
                  x={xPos + barW / 2}
                  y={yPos - 6}
                  textAnchor="middle"
                  className="fill-slate-800 text-[11px] font-semibold font-mono tabular-nums"
                >
                  {formatNum(g.mean, 1)}
                </text>
                <text
                  x={xPos + barW / 2}
                  y={pad.top + plotH + 17}
                  textAnchor="middle"
                  className="fill-slate-700 text-[11px] font-medium"
                >
                  {g.group.length > 8 ? `${g.group.slice(0, 7)}…` : g.group}
                </text>
              </g>
            );
          })}

          {/* Threshold reference line if within range */}
          {thresholdValue >= yStart && thresholdValue <= yEnd && (
            <g>
              <line
                x1={pad.left}
                y1={toY(thresholdValue)}
                x2={pad.left + plotW}
                y2={toY(thresholdValue)}
                stroke="#d97706"
                strokeWidth={1.8}
                strokeDasharray="5 3"
              />
              <text
                x={pad.left + plotW - 4}
                y={toY(thresholdValue) - 6}
                textAnchor="end"
                className="fill-amber-700 text-[11px] font-semibold font-mono tabular-nums"
              >
                기준값 {formatNum(thresholdValue, 1)}
              </text>
            </g>
          )}

          {truncateYAxis && (
            <text x={pad.left + 8} y={pad.top + 14} className="fill-amber-700 text-[11px] font-semibold">
              주의: Y축이 0이 아닌 {formatNum(yStart, 1)}에서 시작해 차이가 과장되어 보입니다(그래프 왜곡 검증 모드)
            </text>
          )}

          <text x={pad.left + plotW / 2} y={height - 10} textAnchor="middle" className="fill-slate-600 text-xs font-medium">
            {groupColumn}별 {targetColumn} 평균 비교
          </text>
        </svg>

        {hoveredIdx !== null && groups[hoveredIdx] && (
          <div className="mt-1 flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 font-mono tabular-nums">
            <span>
              집단: {groups[hoveredIdx].group} (n={groups[hoveredIdx].count})
            </span>
            <span>
              평균 {formatNum(groups[hoveredIdx].mean, 2)} · 중앙값 {formatNum(groups[hoveredIdx].median, 2)} · 기준 충족률 {(groups[hoveredIdx].exceedRate * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    );
  }

  // 5. LINE TREND CHART
  if (chartType === 'line_trend') {
    const tVals = trendSeries.map((d) => d.value);
    const tMin = Math.min(...tVals);
    const tMax = Math.max(...tVals, thresholdValue);
    const yStart = truncateYAxis ? Math.max(0, tMin * 0.85) : 0;
    const yEnd = tMax * 1.1 || 1;
    const ySpan = yEnd - yStart || 1;

    const toX = (i: number) =>
      pad.left + (trendSeries.length > 1 ? (i / (trendSeries.length - 1)) * plotW : plotW / 2);
    const toY = (v: number) => pad.top + plotH - ((v - yStart) / ySpan) * plotH;

    const linePath = trendSeries
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(d.value).toFixed(1)}`)
      .join(' ');

    return (
      <div className="w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const val = yStart + ySpan * t;
            const yPos = toY(val);
            return (
              <g key={t}>
                <line x1={pad.left} y1={yPos} x2={pad.left + plotW} y2={yPos} stroke="#e2e8f0" strokeDasharray={t === 0 ? undefined : '3 3'} />
                <text x={pad.left - 8} y={yPos + 4} textAnchor="end" className="fill-slate-500 text-[11px] font-mono tabular-nums">
                  {formatNum(val, 1)}
                </text>
              </g>
            );
          })}

          {thresholdValue >= yStart && thresholdValue <= yEnd && (
            <line
              x1={pad.left}
              y1={toY(thresholdValue)}
              x2={pad.left + plotW}
              y2={toY(thresholdValue)}
              stroke="#d97706"
              strokeWidth={1.6}
              strokeDasharray="5 3"
            />
          )}

          <path d={linePath} fill="none" stroke="#0284c7" strokeWidth={2.2} />

          {trendSeries.map((d, i) => {
            const showTick = trendSeries.length <= 12 || i % Math.ceil(trendSeries.length / 8) === 0;
            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={toX(i)}
                  cy={toY(d.value)}
                  r={hoveredIdx === i ? 5.5 : 3.5}
                  fill={hoveredIdx === i ? '#0f172a' : '#0284c7'}
                  stroke="#ffffff"
                  strokeWidth={1}
                />
                {showTick && (
                  <text
                    x={toX(i)}
                    y={pad.top + plotH + 16}
                    textAnchor="middle"
                    className="fill-slate-600 text-[10px] font-mono tabular-nums"
                  >
                    {d.label.length > 10 ? d.label.slice(5) : d.label}
                  </text>
                )}
              </g>
            );
          })}

          {truncateYAxis && (
            <text x={pad.left + 8} y={pad.top + 14} className="fill-amber-700 text-[11px] font-semibold">
              주의: Y축 절단 적용 중(변동 폭이 크게 보이므로 Y축 시작값 확인 필요)
            </text>
          )}

          <text x={pad.left + plotW / 2} y={height - 10} textAnchor="middle" className="fill-slate-600 text-xs font-medium">
            자료 순서 / 시간 흐름에 따른 {targetColumn} 변화
          </text>
        </svg>

        {hoveredIdx !== null && trendSeries[hoveredIdx] && (
          <div className="mt-1 flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 font-mono tabular-nums">
            <span>항목: {trendSeries[hoveredIdx].label}</span>
            <span>{targetColumn}: {formatNum(trendSeries[hoveredIdx].value, 2)}</span>
          </div>
        )}
      </div>
    );
  }

  // 6. SCATTER PLOT
  if (scatterPoints.length < 2) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500">
        산점도를 그리려면 보조 수치형 변수를 1개 이상 선택해야 합니다.
      </div>
    );
  }

  const xs = scatterPoints.map((p) => p.x);
  const ys = scatterPoints.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const toX = (x: number) => pad.left + ((x - minX) / spanX) * plotW;
  const toY = (y: number) => pad.top + plotH - ((y - minY) / spanY) * plotH;

  // Regression line
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  for (const p of scatterPoints) {
    num += (p.x - meanX) * (p.y - meanY);
    den += (p.x - meanX) ** 2;
  }
  const slope = den > 0 ? num / den : 0;
  const intercept = meanY - slope * meanX;
  const regY1 = slope * minX + intercept;
  const regY2 = slope * maxX + intercept;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const yVal = minY + spanY * t;
          const xVal = minX + spanX * t;
          return (
            <g key={t}>
              <line x1={pad.left} y1={toY(yVal)} x2={pad.left + plotW} y2={toY(yVal)} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text x={pad.left - 8} y={toY(yVal) + 4} textAnchor="end" className="fill-slate-500 text-[11px] font-mono tabular-nums">
                {formatNum(yVal, 1)}
              </text>
              <text x={toX(xVal)} y={pad.top + plotH + 16} textAnchor="middle" className="fill-slate-500 text-[10px] font-mono tabular-nums">
                {formatNum(xVal, 1)}
              </text>
            </g>
          );
        })}

        <line
          x1={toX(minX)}
          y1={Math.max(pad.top, Math.min(pad.top + plotH, toY(regY1)))}
          x2={toX(maxX)}
          y2={Math.max(pad.top, Math.min(pad.top + plotH, toY(regY2)))}
          stroke="#0f172a"
          strokeWidth={1.6}
          strokeDasharray="5 3"
        />

        {scatterPoints.map((p, i) => (
          <circle
            key={i}
            cx={toX(p.x)}
            cy={toY(p.y)}
            r={hoveredIdx === i ? 6 : 4.5}
            fill={hoveredIdx === i ? '#d97706' : '#0284c7'}
            opacity={0.8}
            stroke="#ffffff"
            strokeWidth={1}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            className="cursor-pointer"
          />
        ))}

        <text x={pad.left + plotW / 2} y={pad.top - 8} textAnchor="middle" className="fill-slate-800 text-xs font-mono tabular-nums">
          상관계수 r = {correlationR !== null ? correlationR.toFixed(3) : '-'}
        </text>
        <text x={pad.left + plotW / 2} y={height - 10} textAnchor="middle" className="fill-slate-600 text-xs font-medium">
          {targetColumn} (가로축) vs {secondaryColumn} (세로축)
        </text>
      </svg>

      {hoveredIdx !== null && scatterPoints[hoveredIdx] && (
        <div className="mt-1 flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 font-mono tabular-nums">
          <span>{scatterPoints[hoveredIdx].label}</span>
          <span>
            {targetColumn}: {formatNum(scatterPoints[hoveredIdx].x, 2)} · {secondaryColumn}: {formatNum(scatterPoints[hoveredIdx].y, 2)}
          </span>
        </div>
      )}
    </div>
  );
};
