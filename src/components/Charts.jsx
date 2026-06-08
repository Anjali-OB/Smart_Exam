import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4']

export function ScoreBarChart({ data, xKey='name', yKey='score', color='#6366f1' }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top:5, right:10, left:-10, bottom:5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey={xKey} tick={{ fontSize:11 }} />
        <YAxis tick={{ fontSize:11 }} domain={[0,100]} />
        <Tooltip contentStyle={{ borderRadius:12, border:'1px solid #e2e8f0', fontSize:12 }} />
        <Bar dataKey={yKey} fill={color} radius={[6,6,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ScoreLineChart({ data, xKey='test', lines=[{key:'score',color:'#6366f1',name:'Score'}] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top:5, right:10, left:-10, bottom:5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey={xKey} tick={{ fontSize:11 }} />
        <YAxis tick={{ fontSize:11 }} domain={[0,100]} />
        <Tooltip contentStyle={{ borderRadius:12, border:'1px solid #e2e8f0', fontSize:12 }} />
        <Legend wrapperStyle={{ fontSize:12 }} />
        {lines.map(l => <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color} strokeWidth={2.5} dot={{ r:4 }} name={l.name} />)}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function GradePieChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ borderRadius:12, fontSize:12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function DifficultyRadar({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data} margin={{ top:5, right:20, left:20, bottom:5 }}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="topic" tick={{ fontSize:11 }} />
        <Radar name="Avg Score" dataKey="avg" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
        <Tooltip contentStyle={{ borderRadius:12, fontSize:12 }} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

export function QuestionDifficultyBar({ data }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 28)}>
      <BarChart data={data} layout="vertical" margin={{ top:5, right:30, left:10, bottom:5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis type="number" domain={[0,100]} tick={{ fontSize:10 }} tickFormatter={v=>`${v}%`} />
        <YAxis type="category" dataKey="name" tick={{ fontSize:10 }} width={50} />
        <Tooltip contentStyle={{ borderRadius:12, fontSize:12 }} formatter={v=>`${v}% correct`} />
        <Bar dataKey="pct" radius={[0,6,6,0]}>
          {data.map((d,i) => <Cell key={i} fill={d.pct>=70?'#10b981':d.pct>=40?'#f59e0b':'#ef4444'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
