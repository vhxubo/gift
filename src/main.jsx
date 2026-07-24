import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CalendarDays, ChartNoAxesCombined, ChevronRight, CirclePlus, Download,
  Ellipsis, FileUp, FolderPlus, Gift, HandCoins, Pencil, ReceiptText,
  Search, Settings2, Trash2, X,
} from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'gift-ledger-v1';
const methods = ['微信', '支付宝', '现金', '其他'];
const sides = ['男方', '女方'];
const currency = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 0, maximumFractionDigits: 2 });

const id = () => crypto.randomUUID();
const formatMoney = value => currency.format(Number(value) || 0);
const formatDate = value => new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(new Date(value));
const emptyData = () => ({ projects: [], records: [] });

function normalizeData(value) {
  return {
    projects: value.projects,
    records: value.records.map(record => ({
      ...record,
      nickname: typeof record.nickname === 'string' ? record.nickname : record.name,
      name: typeof record.nickname === 'string' ? (record.name || '') : '',
    })),
  };
}

function readData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved?.projects) && Array.isArray(saved?.records) ? normalizeData(saved) : emptyData();
  } catch {
    return emptyData();
  }
}

function validateBackup(value) {
  return value && Array.isArray(value.projects) && Array.isArray(value.records) &&
    value.projects.every(item => typeof item.id === 'string' && typeof item.name === 'string') &&
    value.records.every(item => typeof item.id === 'string' && typeof item.projectId === 'string' &&
      ((typeof item.nickname === 'string' && item.nickname.trim()) || (typeof item.name === 'string' && item.name.trim())) && Number.isFinite(Number(item.amount)));
}

function App() {
  const [data, setData] = useState(readData);
  const [projectId, setProjectId] = useState(() => readData().projects[0]?.id || '');
  const [view, setView] = useState('records');
  const [query, setQuery] = useState('');
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState('');
  const importRef = useRef();

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(data)), [data]);
  useEffect(() => {
    if (!data.projects.some(project => project.id === projectId)) setProjectId(data.projects[0]?.id || '');
  }, [data.projects, projectId]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const currentProject = data.projects.find(project => project.id === projectId);
  const records = useMemo(() => data.records.filter(record => record.projectId === projectId), [data.records, projectId]);
  const visibleRecords = useMemo(() => records
    .filter(record => `${record.nickname} ${record.name}`.includes(query.trim()))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [records, query]);
  const total = records.reduce((sum, record) => sum + Number(record.amount), 0);

  const addProject = values => {
    const project = { id: id(), name: values.name.trim(), date: values.date || '', createdAt: new Date().toISOString() };
    setData(current => ({ ...current, projects: [...current.projects, project] }));
    setProjectId(project.id);
    setSheet(null);
    setToast('项目已创建');
  };

  const saveProject = values => {
    setData(current => ({ ...current, projects: current.projects.map(project => project.id === projectId ? { ...project, name: values.name.trim(), date: values.date || '' } : project) }));
    setSheet(null);
    setToast('项目已更新');
  };

  const deleteProject = () => {
    if (!window.confirm(`删除“${currentProject.name}”及其 ${records.length} 条礼金记录？此操作无法撤销。`)) return;
    setData(current => ({ projects: current.projects.filter(project => project.id !== projectId), records: current.records.filter(record => record.projectId !== projectId) }));
    setSheet(null);
    setToast('项目已删除');
  };

  const saveRecord = (values, recordId) => {
    const record = {
      id: recordId || id(), projectId, nickname: values.nickname.trim(), name: values.name.trim(),
      amount: Number(values.amount), method: values.method, side: values.side, note: values.note.trim(),
      createdAt: recordId ? data.records.find(item => item.id === recordId)?.createdAt : new Date().toISOString(),
    };
    setData(current => ({ ...current, records: recordId ? current.records.map(item => item.id === recordId ? record : item) : [...current.records, record] }));
    setSheet(null);
    setToast(recordId ? '记录已更新' : '礼金已记入');
  };

  const deleteRecord = record => {
    if (!window.confirm(`删除 ${record.nickname} 的 ${formatMoney(record.amount)} 记录？`)) return;
    setData(current => ({ ...current, records: current.records.filter(item => item.id !== record.id) }));
    setSheet(null);
    setToast('记录已删除');
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `礼簿备份-${new Date().toISOString().slice(0, 10)}.json` });
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
    setToast('备份已导出');
  };

  const importData = event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const backup = JSON.parse(reader.result);
        if (!validateBackup(backup)) throw new Error();
        if (!window.confirm(`导入将全量替换本机数据：${backup.projects.length} 个项目，${backup.records.length} 条记录。是否继续？`)) return;
        const normalized = normalizeData(backup);
        setData(normalized);
        setProjectId(normalized.projects[0]?.id || '');
        setView('records');
        setToast('备份已全量更新');
      } catch {
        window.alert('不是有效的礼簿备份文件。');
      }
    };
    reader.readAsText(file);
  };

  return <main className="app-shell" id="main-content">
    <header className="app-header">
      <div className="brand-lockup" aria-label="礼簿">
        <div className="brand-mark" aria-hidden="true">礼</div>
        <div><p>人情往来</p><h1>礼簿</h1></div>
      </div>
      <IconButton label="项目与备份" onClick={() => setSheet({ type: 'project-menu' })}><Ellipsis /></IconButton>
    </header>

    <section className="project-switcher" aria-label="项目选择">
      <p className="section-label">当前项目</p>
      <div className="project-strip">
        {data.projects.map(project => <button key={project.id} type="button" className={`project-chip ${project.id === projectId ? 'selected' : ''}`} onClick={() => setProjectId(project.id)}>{project.name}</button>)}
        <IconButton className="project-add" label="新增项目" onClick={() => setSheet({ type: 'project', mode: 'new' })}><FolderPlus /></IconButton>
      </div>
    </section>

    {!currentProject ? <Empty onCreate={() => setSheet({ type: 'project', mode: 'new' })} /> : <>
      <section className="project-overview" aria-labelledby="project-name">
        <div>
          <p><CalendarDays size={14} aria-hidden="true" />{currentProject.date ? formatDate(currentProject.date) : '未设日期'}</p>
          <h2 id="project-name">{currentProject.name}</h2>
        </div>
        <button className="quiet-button" type="button" onClick={() => setSheet({ type: 'project', mode: 'edit' })}><Settings2 size={16} aria-hidden="true" />管理</button>
      </section>
      {view === 'records'
        ? <Records records={visibleRecords} count={records.length} total={total} query={query} setQuery={setQuery} onAdd={() => setSheet({ type: 'record' })} onEdit={record => setSheet({ type: 'record', record })} />
        : <Stats records={records} data={data} />}
    </>}

    <nav className="bottom-nav" aria-label="主导航">
      <button type="button" className={view === 'records' ? 'active' : ''} onClick={() => setView('records')}><ReceiptText size={20} aria-hidden="true" /><span>礼金</span></button>
      <button type="button" className="add-button" onClick={() => currentProject && setSheet({ type: 'record' })} disabled={!currentProject} aria-label="新增礼金" title="新增礼金"><CirclePlus size={27} aria-hidden="true" /></button>
      <button type="button" className={view === 'stats' ? 'active' : ''} onClick={() => setView('stats')}><ChartNoAxesCombined size={20} aria-hidden="true" /><span>统计</span></button>
    </nav>

    {sheet?.type === 'project' && <ProjectSheet project={sheet.mode === 'edit' ? currentProject : null} onClose={() => setSheet(null)} onSave={sheet.mode === 'edit' ? saveProject : addProject} onDelete={sheet.mode === 'edit' ? deleteProject : null} />}
    {sheet?.type === 'record' && <RecordSheet record={sheet.record} existing={records} onClose={() => setSheet(null)} onSave={saveRecord} onDelete={deleteRecord} />}
    {sheet?.type === 'project-menu' && <MenuSheet onClose={() => setSheet(null)} onExport={exportData} onImport={() => importRef.current.click()} />}
    <input ref={importRef} className="visually-hidden" type="file" accept="application/json" onChange={importData} />
    {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
  </main>;
}

function IconButton({ label, className = '', onClick, children }) {
  return <button className={`icon-button ${className}`} type="button" onClick={onClick} aria-label={label} title={label}>{children}</button>;
}

function Empty({ onCreate }) {
  return <section className="empty-state"><div className="empty-icon"><Gift size={32} aria-hidden="true" /></div><h2>从第一份心意开始</h2><p>建立项目后，礼金记录与统计都会独立保存。</p><button className="primary-button" type="button" onClick={onCreate}><FolderPlus size={18} aria-hidden="true" />新建项目</button></section>;
}

function Records({ records, count, total, query, setQuery, onAdd, onEdit }) {
  return <section className="content" aria-label="礼金记录">
    <section className="ledger-summary">
      <div className="summary-main"><span className="summary-icon"><HandCoins size={20} aria-hidden="true" /></span><p>本项目礼金</p><strong>{formatMoney(total)}</strong></div>
      <div className="summary-count"><b>{count}</b><span>人次</span></div>
    </section>
    <div className="list-heading"><div><h3>最近记录</h3><p>{query ? `找到 ${records.length} 条结果` : '按录入时间排序'}</p></div><button className="text-button" type="button" onClick={onAdd}><CirclePlus size={17} aria-hidden="true" />新增</button></div>
    <label className="search-field"><Search size={18} aria-hidden="true" /><span className="visually-hidden">按昵称或真实姓名搜索</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索昵称或真实姓名" /></label>
    {records.length ? <div className="record-list">{records.map(record => <button key={record.id} className="record-row" type="button" onClick={() => onEdit(record)} aria-label={`编辑 ${record.nickname} 的礼金记录`}>
      <div className="avatar">{record.nickname.slice(0, 1)}</div>
      <div className="record-person"><strong>{record.nickname}</strong><span>{record.name ? `${record.name} · ` : ''}{record.side} · {record.method}{record.note ? ` · ${record.note}` : ''}</span></div>
      <div className="record-amount"><b>{formatMoney(record.amount)}</b><small>{formatDate(record.createdAt)}</small></div><ChevronRight className="row-chevron" size={17} aria-hidden="true" />
    </button>)}</div> : <div className="empty-list"><ReceiptText size={26} aria-hidden="true" /><p>{query ? '没有匹配的记录' : '还没有礼金记录'}</p>{!query && <button className="primary-button" type="button" onClick={onAdd}><CirclePlus size={18} aria-hidden="true" />记第一笔礼金</button>}</div>}
  </section>;
}

function Stats({ records, data }) {
  const total = records.reduce((sum, record) => sum + Number(record.amount), 0);
  const stats = (items, label) => items.map(name => ({ name, value: records.filter(record => record[label] === name).reduce((sum, record) => sum + Number(record.amount), 0), count: records.filter(record => record[label] === name).length }));
  const projectStats = data.projects.map(project => ({ name: project.name, value: data.records.filter(record => record.projectId === project.id).reduce((sum, record) => sum + Number(record.amount), 0) })).sort((a, b) => b.value - a.value);
  const ranked = [...records].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5);
  return <section className="content stats" aria-label="项目统计">
    <div className="metric-grid"><Metric label="总金额" value={formatMoney(total)} /><Metric label="总人数" value={`${records.length} 人`} /><Metric label="平均礼金" value={records.length ? formatMoney(total / records.length) : '—'} /></div>
    <StatList title="归属分布" items={stats(sides, 'side')} total={total} />
    <StatList title="收款方式" items={stats(methods, 'method')} total={total} />
    <section className="stat-section"><div className="section-title"><h3>礼金排行</h3><span>前 5 名</span></div>{ranked.length ? ranked.map((record, index) => <div className="rank-row" key={record.id}><span>{String(index + 1).padStart(2, '0')}</span><strong>{record.nickname}</strong><em>{formatMoney(record.amount)}</em></div>) : <p className="muted">暂无记录</p>}</section>
    <StatList title="项目总额对比" items={projectStats} total={Math.max(...projectStats.map(item => item.value), 0)} />
  </section>;
}

function Metric({ label, value }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div>; }
function StatList({ title, items, total }) { return <section className="stat-section"><div className="section-title"><h3>{title}</h3></div>{items.map(item => <div className="bar-row" key={item.name}><div><span>{item.name}</span><b>{formatMoney(item.value)} <small>{item.count !== undefined && `${item.count} 人`}</small></b></div><i><em style={{ transform: `scaleX(${total ? item.value / total : 0})` }} /></i></div>)}</section>; }

function ProjectSheet({ project, onClose, onSave, onDelete }) {
  return <Sheet title={project ? '管理项目' : '新建项目'} onClose={onClose}><form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); const name = String(form.get('name')).trim(); if (name) onSave({ name, date: form.get('date') }); }}><label className="field">项目名称<input name="name" required maxLength="30" defaultValue={project?.name} placeholder="例如：张李婚礼" autoFocus /></label><label className="field">日期 <span>可选</span><input name="date" type="date" defaultValue={project?.date} /></label><button className="primary-button full" type="submit"><Pencil size={17} aria-hidden="true" />保存项目</button></form>{onDelete && <button className="danger-button" type="button" onClick={onDelete}><Trash2 size={17} aria-hidden="true" />删除项目</button>}</Sheet>;
}

function RecordSheet({ record, existing, onClose, onSave, onDelete }) {
  return <Sheet title={record ? '编辑礼金' : '新增礼金'} onClose={onClose}><form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); const nickname = String(form.get('nickname')).trim(); const amount = Number(form.get('amount')); if (!nickname || !(amount > 0)) return; if (!record && existing.some(item => item.nickname === nickname) && !window.confirm(`已有“${nickname}”的记录，仍要新增吗？`)) return; onSave({ nickname, name: form.get('name'), amount, method: form.get('method'), side: form.get('side'), note: form.get('note') }, record?.id); }}><div className="form-grid"><label className="field">昵称 <b>*</b><input name="nickname" required maxLength="30" defaultValue={record?.nickname} placeholder="例如：表哥、王姐" autoFocus /></label><label className="field">金额 <b>*</b><input name="amount" required inputMode="decimal" type="number" min="0.01" step="0.01" defaultValue={record?.amount} placeholder="0.00" /></label></div><label className="field">真实姓名 <span>可选</span><input name="name" maxLength="30" defaultValue={record?.name} placeholder="知道时再补充" /></label><ChoiceGroup legend="收款方式" name="method" options={methods} selected={record?.method || methods[0]} /><ChoiceGroup legend="归属" name="side" options={sides} selected={record?.side || sides[0]} /><label className="field">备注 <span>可选</span><input name="note" maxLength="60" defaultValue={record?.note} placeholder="关系、家庭或特别说明" /></label><button className="primary-button full" type="submit"><HandCoins size={17} aria-hidden="true" />{record ? '保存修改' : '记入礼金'}</button></form>{record && <button className="danger-button" type="button" onClick={() => onDelete(record)}><Trash2 size={17} aria-hidden="true" />删除记录</button>}</Sheet>;
}

function ChoiceGroup({ legend, name, options, selected }) { return <fieldset><legend>{legend}</legend><div className="choice-row">{options.map(option => <label key={option}><input type="radio" name={name} value={option} defaultChecked={selected === option} /><span>{option}</span></label>)}</div></fieldset>; }
function MenuSheet({ onClose, onExport, onImport }) { return <Sheet title="项目与备份" onClose={onClose}><button className="menu-item" type="button" onClick={onExport}><Download size={20} aria-hidden="true" /><span>导出全部数据<small>生成 JSON 备份文件</small></span><ChevronRight size={18} aria-hidden="true" /></button><button className="menu-item" type="button" onClick={onImport}><FileUp size={20} aria-hidden="true" /><span>全量导入备份<small>会覆盖本机所有项目和记录</small></span><ChevronRight size={18} aria-hidden="true" /></button></Sheet>; }
function Sheet({ title, onClose, children }) { return <div className="sheet-backdrop" role="presentation" onPointerDown={onClose}><section className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onPointerDown={event => event.stopPropagation()}><div className="sheet-handle" /><header><h2 id="sheet-title">{title}</h2><IconButton label="关闭" onClick={onClose}><X /></IconButton></header>{children}</section></div>; }

createRoot(document.getElementById('root')).render(<App />);
