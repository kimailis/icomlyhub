'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, LabelList, Cell } from 'recharts';
import { CelebProfile } from '@/lib/types';

interface TopCelebsChartProps {
  celebs: CelebProfile[];
  onSelect: (id: string) => void;
}

export const TopCelebsChart: React.FC<TopCelebsChartProps> = ({ celebs, onSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateDimensions();

    const observer = new ResizeObserver((entries) => {
      window.requestAnimationFrame(() => {
        if (!Array.isArray(entries) || !entries.length) return;
        updateDimensions();
      });
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // Sort by noise rating desc and take top 10
  const data = [...celebs]
    .sort((a, b) => b.noiseRating - a.noiseRating)
    .slice(0, 10);

  // Custom Tick Component to ensure clickability on Y-Axis
  const CustomYAxisTick = ({ x, y, payload }: any) => {
    const celebId = data.find(c => c.name === payload.value)?.id;
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={4}
          textAnchor="end"
          fill="#d4d4d8"
          fontSize={11}
          fontWeight={500}
          cursor="pointer"
          onClick={() => celebId && onSelect(celebId)}
          className="hover:fill-white transition-colors"
        >
          {payload.value}
        </text>
      </g>
    );
  };

  if (data.length === 0) {
    return (
      <div className="w-full bg-surface/30 rounded-xl border border-white/5 p-6 mb-8 h-[250px] animate-pulse flex items-center justify-center">
        <span className="text-gray-500 font-mono text-sm">CALCULATING CLOUT...</span>
      </div>
    );
  }

  const shouldRender = dimensions.width > 0 && dimensions.height > 0;

  return (
    <div className="w-full bg-surface/30 rounded-xl border border-white/5 p-6 mb-8 relative overflow-hidden animate-fade-in outline-none">
      <style>{`
        .recharts-wrapper { outline: none !important; }
        .recharts-surface { outline: none !important; }
        .recharts-wrapper * { outline: none !important; }
        .recharts-cartesian-axis-tick-value { outline: none !important; }
        .recharts-bar-rectangle { outline: none !important; }
        path:focus, g:focus, text:focus { outline: none !important; }
      `}</style>
      <h3 className="text-sm font-mono text-gray-400 mb-6 uppercase tracking-wider flex items-center gap-2">
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        Biggest Buzz (Live)
      </h3>

      {/* Explicit height container */}
      <div
        ref={containerRef}
        style={{ width: '100%', height: '260px' }}
        className="min-w-0 relative"
      >
        {shouldRender ? (
          <BarChart
            width={dimensions.width}
            height={dimensions.height}
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
            barCategoryGap={6}
            onClick={(state) => {
              if (state && state.activePayload && state.activePayload[0]) {
                onSelect(state.activePayload[0].payload.id);
              }
            }}
          >
            <defs>
              <linearGradient id="barGradientTop" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#d946ef" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
              <linearGradient id="barGradientMid" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
              <linearGradient id="barGradientDefault" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <XAxis type="number" hide domain={[0, 100]} />
            <YAxis
              dataKey="name"
              type="category"
              width={100}
              interval={0}
              axisLine={false}
              tickLine={false}
              tick={<CustomYAxisTick />}
            />
            <Bar
              dataKey="noiseRating"
              radius={[10, 10, 10, 10]}
              barSize={16}
              cursor="pointer"
              onClick={(entry) => {
                if (entry && entry.id) onSelect(entry.id);
              }}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="noiseRating"
                position="insideRight"
                fill="white"
                fontSize={11}
                fontWeight="bold"
                offset={8}
              />
              {data.map((entry, index) => {
                let fillUrl = 'url(#barGradientDefault)';
                if (index < 3) fillUrl = 'url(#barGradientTop)';
                else if (index < 6) fillUrl = 'url(#barGradientMid)';

                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={fillUrl}
                    className="transition-opacity hover:opacity-80 focus:outline-none"
                  />
                );
              })}
            </Bar>
          </BarChart>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-full h-full bg-white/5 animate-pulse rounded" />
          </div>
        )}
      </div>
    </div>
  );
};