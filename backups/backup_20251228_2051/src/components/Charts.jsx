import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, ComposedChart, Cell
} from 'recharts';
import { Activity, BarChart2, Layers } from 'lucide-react';

// Helper to get gradient offset
const getGradientOffset = (data, dataKey) => {
  const dataMax = Math.max(...data.map((i) => i[dataKey]), 0);
  const dataMin = Math.min(...data.map((i) => i[dataKey]), 0);

  if (dataMax <= 0) return 0;
  if (dataMin >= 0) return 1;

  return dataMax / (dataMax - dataMin);
};

// Custom Tooltip for Profit/Loss Logic
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <p style={{ color: '#e2e8f0', fontSize: '0.875rem', marginBottom: '8px', fontWeight: 600 }}>{label}</p>
        {payload.map((entry, index) => {
          const isProfit = entry.dataKey === 'Profit';
          const isNegative = entry.value < 0;

          let labelName = entry.name;
          let valueColor = entry.color;

          if (isProfit) {
            if (isNegative) {
              labelName = 'Loss';
              valueColor = '#ef4444';
            } else {
              valueColor = '#10b981';
            }
          }

          return (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: valueColor }}></div>
              <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>{labelName}:</span>
              <span style={{ color: valueColor, fontSize: '0.875rem', fontWeight: 600, marginLeft: 'auto' }}>
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(entry.value)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

// Reusable Chart Component with Type Switching
const CustomizableChart = ({ title, data, defaultType = 'area', series, yAxisPrefix = '₹' }) => {
  const [type, setType] = useState(defaultType); // 'area', 'bar', 'line'

  const renderChart = () => {
    const commonProps = {
      data: data,
      margin: { top: 10, right: 10, left: 0, bottom: 0 }
    };

    const renderSeries = () => series.map((s, idx) => {
      // Calculate offset for this series key
      const off = getGradientOffset(data, s.key);
      const gradientId = `splitColor-${s.key}`;

      if (type === 'area') {
        return (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={`url(#${gradientId})`}
            fill={`url(#${gradientId})`}
            fillOpacity={0.3}
            strokeWidth={2}
          />
        );
      } else if (type === 'bar') {
        return (
          <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry[s.key] < 0 ? '#ef4444' : s.color}
              />
            ))}
          </Bar>
        );
      } else {
        return (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={`url(#${gradientId})`}
            strokeWidth={2}
            dot={false}
          />
        );
      }
    });

    const ChartComponent = type === 'bar' ? BarChart : (type === 'line' ? LineChart : AreaChart);

    // Constraint: User wants to see approx 10 days of data at a time.
    // Assuming a typical chart width of ~700px, roughly 70px per data point.
    const pointWidth = 70;
    const minWidth = Math.max(data.length * pointWidth, 600);
    const chartHeight = 300;

    return (
      <div style={{ flex: 1, width: '100%', maxWidth: '100%', minHeight: 0, overflowX: 'auto', overflowY: 'hidden' }}>
        <div style={{ minWidth: `${minWidth}px`, height: '100%' }}>
          <ChartComponent
            {...commonProps}
            width={minWidth}
            height={chartHeight}
          >
            <defs>
              {series.map(s => {
                const off = getGradientOffset(data, s.key);
                const gradientId = `splitColor-${s.key}`;
                return (
                  <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset={off} stopColor={s.color} stopOpacity={1} />
                    <stop offset={off} stopColor="#ef4444" stopOpacity={1} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${yAxisPrefix}${val}`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            {renderSeries()}
          </ChartComponent>
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', height: '400px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '0.5rem', gap: '0.25rem' }}>
          <button
            onClick={() => setType('area')}
            title="Area Chart"
            style={{
              background: type === 'area' ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: 'none', color: type === 'area' ? 'white' : 'var(--text-secondary)',
              padding: '0.25rem', borderRadius: '0.25rem', cursor: 'pointer', display: 'flex'
            }}
          >
            <Layers size={16} />
          </button>
          <button
            onClick={() => setType('bar')}
            title="Bar Chart"
            style={{
              background: type === 'bar' ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: 'none', color: type === 'bar' ? 'white' : 'var(--text-secondary)',
              padding: '0.25rem', borderRadius: '0.25rem', cursor: 'pointer', display: 'flex'
            }}
          >
            <BarChart2 size={16} />
          </button>
          <button
            onClick={() => setType('line')}
            title="Line Chart"
            style={{
              background: type === 'line' ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: 'none', color: type === 'line' ? 'white' : 'var(--text-secondary)',
              padding: '0.25rem', borderRadius: '0.25rem', cursor: 'pointer', display: 'flex'
            }}
          >
            <Activity size={16} />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {renderChart()}
      </div>
    </div>
  );
};

const Charts = ({ transactions, data: propData, selectedMonth }) => {
  // Allow passing either 'transactions' or 'data' prop
  const data = propData || transactions || [];
  const chartData = useMemo(() => {
    const grouped = {};

    data.forEach((item, index) => {
      const dateKey = item.parsedDate || `Entry ${index + 1}`;

      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          name: dateKey,
          Sales: 0,
          Expenses: 0,
          Profit: 0,
          _dateStr: dateKey
        };
      }

      const type = String(item.parsedType || item.Type || '').toLowerCase();
      const amt = parseFloat(item.parsedAmount || item.Amount || 0);

      if (type.includes('sale') || type.includes('income') || type.includes('revenue')) {
        grouped[dateKey].Sales += amt;
      } else if (type.includes('expense') || type.includes('cost')) {
        grouped[dateKey].Expenses += amt;
      } else if (!type) {
        grouped[dateKey].Sales += amt;
      }
    });

    // Calculate Net Profit and Margin
    Object.values(grouped).forEach(day => {
      day.Profit = day.Sales - day.Expenses;
      // Margin calculation
      day.Margin = day.Sales !== 0 ? parseFloat(((day.Profit / day.Sales) * 100).toFixed(2)) : 0;
    });

    // Sort Chronologically
    const result = Object.values(grouped);
    result.sort((a, b) => {
      const parseDate = (dateStr) => {
        // Handle "YYYY-MM-DD"
        if (dateStr.includes('-')) {
          return new Date(dateStr);
        }
        // Handle "DD MMM YYYY"
        return new Date(dateStr);
      };
      const dateA = parseDate(a._dateStr);
      const dateB = parseDate(b._dateStr);
      return dateA - dateB;
    });

    return result;
  }, [data]);

  // Calculate Monthly Aggregation for Profit Margin Trend
  const monthlyChartData = useMemo(() => {
    const grouped = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    data.forEach((item) => {
      let monthYear = '';
      if (item.parsedDate) {
        if (item.parsedDate.includes('-')) {
          // 2025-09-01
          const parts = item.parsedDate.split('-');
          if (parts.length === 3) {
            const year = parts[0];
            const monthIndex = parseInt(parts[1], 10) - 1;
            if (monthNames[monthIndex]) monthYear = `${monthNames[monthIndex]} ${year}`;
          }
        } else if (item.parsedDate.includes(' ')) {
          // 15 Nov 2024
          const parts = item.parsedDate.split(' ');
          if (parts.length >= 3) {
            monthYear = `${parts[1]} ${parts[2]}`;
          }
        }
      }

      if (!monthYear) monthYear = 'Unknown';

      if (!grouped[monthYear]) {
        grouped[monthYear] = {
          name: monthYear,
          Sales: 0,
          Expenses: 0,
          Profit: 0,
          Margin: 0
        };
      }

      const type = String(item.parsedType || item.Type || '').toLowerCase();
      const amt = parseFloat(item.parsedAmount || item.Amount || 0);

      if (type.includes('sale') || type.includes('income') || type.includes('revenue')) {
        grouped[monthYear].Sales += amt;
      } else if (type.includes('expense') || type.includes('cost')) {
        grouped[monthYear].Expenses += amt;
      } else if (!type) {
        grouped[monthYear].Sales += amt;
      }
    });

    // Calculate Margin for months
    Object.values(grouped).forEach(m => {
      m.Profit = m.Sales - m.Expenses;
      m.Margin = m.Sales !== 0 ? parseFloat(((m.Profit / m.Sales) * 100).toFixed(2)) : 0;
    });

    const result = Object.values(grouped).filter(item => item.name !== 'Unknown');

    // Sort Month-Year Chronologically
    const monthOrder = { "Jan": 0, "Feb": 1, "Mar": 2, "Apr": 3, "May": 4, "Jun": 5, "Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11 };
    result.sort((a, b) => {
      const [mA, yA] = a.name.split(' ');
      const [mB, yB] = b.name.split(' ');
      if (yA !== yB) return yA - yB;
      return monthOrder[mA] - monthOrder[mB];
    });

    return result;
  }, [data]);

  // Determine which data to use based on view
  const displayData = selectedMonth === 'Overall' ? monthlyChartData : chartData;

  return (
    <div className="grid-cols-2" style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>

      <CustomizableChart
        title="Revenue Overview"
        data={displayData}
        defaultType="area"
        series={[{ key: 'Sales', color: '#3b82f6' }]}
      />

      <CustomizableChart
        title="Expenses vs Sales"
        data={displayData}
        defaultType="bar"
        series={[
          { key: 'Sales', color: '#3b82f6' },
          { key: 'Expenses', color: '#f59e0b' }
        ]}
      />

      <CustomizableChart
        title="Net Profit Trend"
        data={displayData}
        defaultType="line"
        series={[{ key: 'Profit', color: '#10b981' }]}
      />

      <CustomizableChart
        title="Profitability Overview"
        data={displayData}
        defaultType="area"
        series={[
          { key: 'Sales', color: '#3b82f6' },
          { key: 'Profit', color: '#10b981' }
        ]}
      />

      {selectedMonth === 'Overall' && (
        <CustomizableChart
          title="Profit Margin Trend (Monthly)"
          data={monthlyChartData} // Margin trend always interesting as monthly
          defaultType="bar"
          yAxisPrefix=""
          series={[{ key: 'Margin', color: '#8b5cf6' }]}
        />
      )}

    </div>
  );
};

export default Charts;
