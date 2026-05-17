import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter
} from 'recharts';

const COLORS = ['#6D28D9', '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const tooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid hsl(var(--border))',
  borderRadius: '12px',
  color: '#18181b',
};

const WordCloud = ({ data, title }: { data: any[]; title: string }) => {
  const maxVal = Math.max(...data.map((d: any) => d.value));
  return (
    <div className="my-12 p-8 bg-primary/[0.03] border border-primary/10 rounded-[2rem] shadow-2xl">
      <h4 className="text-sm font-heading font-bold text-primary mb-8 text-center uppercase tracking-widest">{title}</h4>
      <div className="flex flex-wrap items-center justify-center gap-3 min-h-[200px]">
        {data.map((d: any, i: number) => {
          const size = Math.max(14, Math.round((d.value / maxVal) * 48));
          return (
            <span
              key={i}
              style={{ fontSize: `${size}px`, color: COLORS[i % COLORS.length], fontWeight: size > 28 ? 700 : 500 }}
              className="inline-block px-1 leading-tight"
              title={`${d.name}: ${d.value}`}
            >
              {d.name}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export const ChartRenderer = ({ content }: { content: string }) => {
  try {
    const data = JSON.parse(content);
    const { type, title, data: chartData, xAxis, yAxis } = data;

    if (type === 'wordcloud') {
      return <WordCloud data={chartData} title={title} />;
    }

    return (
      <div className="my-12 p-8 bg-primary/[0.03] border border-primary/10 rounded-[2rem] shadow-2xl">
        <h4 className="text-sm font-heading font-bold text-primary mb-8 text-center uppercase tracking-widest">{title}</h4>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {type === 'bar' ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#18181b', fontSize: '12px' }} />
                <Bar dataKey="value" fill="#6D28D9" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : type === 'line' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={2} dot={{ r: 4, fill: '#4F46E5' }} activeDot={{ r: 6 }} />
              </LineChart>
            ) : type === 'pie' ? (
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {chartData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
              </PieChart>
            ) : (
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis type="number" dataKey="x" name={xAxis} stroke="#71717a" fontSize={10} />
                <YAxis type="number" dataKey="y" name={yAxis} stroke="#71717a" fontSize={10} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={tooltipStyle} />
                <Scatter name={title} data={chartData} fill="#6D28D9" />
              </ScatterChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    );
  } catch {
    return <pre className="p-4 bg-destructive/10 text-destructive rounded-xl text-xs">Chart rendering failed: {content}</pre>;
  }
};
