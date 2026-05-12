// app.jsx — 全屏多页面 shell:左侧栏 + 顶部 tab + 主内容区

const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;

const TABS = [
  { id:'overview', label:'概览',   icon:'⌂' },
  { id:'mindmap',  label:'导图',   icon:'⌬' },
  { id:'lessons',  label:'课程',   icon:'▤' },
  { id:'articles', label:'文章',   icon:'✎' },
  { id:'cards',    label:'闪卡',   icon:'❒' },
  { id:'quiz',     label:'测验',   icon:'?' },
  { id:'mistakes', label:'错题',   icon:'✗' },
];

function App(){
  const chapters = window.CHAPTERS;
  const [chapter, setChapter] = useStateA(window.DEFAULT_CHAPTER || chapters[0].id);
  const [tab, setTab] = useStateA('overview');
  const [sidebarOpen, setSidebarOpen] = useStateA(() => {
    try { return localStorage.getItem('aimath:sidebarOpen') !== '0'; } catch(e){ return true; }
  });
  useEffectA(() => {
    try { localStorage.setItem('aimath:sidebarOpen', sidebarOpen ? '1' : '0'); } catch(e){}
  }, [sidebarOpen]);
  const data = window.CONTENT[chapter];
  const ch = chapters.find(c => c.id === chapter);

  // 计算每章进度,供侧栏显示
  const progressFn = useMemoA(() => (chId) => {
    try {
      const raw = localStorage.getItem('aimath:progress:' + chId);
      if (!raw) return { cards:0, quiz:0 };
      const p = JSON.parse(raw);
      const d = window.CONTENT[chId] || {};
      const totC = (d.flashcards||[]).length;
      const totQ = (d.quiz||[]).length;
      const seenC = Object.keys(p.cards||{}).length;
      const ansQ = Object.keys(p.quiz||{}).length;
      return {
        cards: totC ? Math.round(seenC/totC*100) : 0,
        quiz: totQ ? Math.round(ansQ/totQ*100) : 0
      };
    } catch(e) { return { cards:0, quiz:0 }; }
  }, [tab]); // tab 变时重新计算(简单刷新)

  // 切章重置 tab 为 overview(避免在新章看到错位状态)
  useEffectA(() => { /* 不强制切 tab,允许跨章保持 */ }, [chapter]);

  return (
    <div className={"app-root " + (sidebarOpen ? "sidebar-open" : "sidebar-collapsed")}>
      {/* 左侧栏 */}
      <aside className="app-sidebar">
        {sidebarOpen ? (
          <>
            <div className="app-brand">
              <div className="row" style={{justifyContent:'space-between', alignItems:'flex-start'}}>
                <div>
                  <div className="app-brand-1">人工智能</div>
                  <div className="app-brand-2">数学基础</div>
                  <div className="app-brand-meta">2026 · 我的复习板</div>
                </div>
                <button className="sidebar-toggle"
                  onClick={() => setSidebarOpen(false)} title="收起侧栏">
                  ←
                </button>
              </div>
            </div>
            <ChapterSidebar chapters={chapters} active={chapter}
              onPick={setChapter} progressFn={progressFn}/>
          </>
        ) : (
          <div className="sidebar-collapsed-rail">
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(true)} title="展开侧栏">
              →
            </button>
            <div className="col gap-4" style={{marginTop:14}}>
              {chapters.map(c => (
                <button key={c.id}
                  className={"cm-ch-mini " + (c.id === chapter ? "active" : "")}
                  onClick={() => setChapter(c.id)}
                  title={c.title}
                  style={{borderLeftColor: c.id === chapter ? c.accent : 'transparent'}}>
                  <span style={{color:c.accent}}>{c.no}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* 主区 */}
      <main className="app-main">
        {/* 顶栏 */}
        <header className="app-topbar" style={{borderBottomColor: ch.accent}}>
          <div className="app-topbar-title">
            <span className="app-topbar-no" style={{color:ch.accent}}>CH {ch.no}</span>
            <span className="app-topbar-name">{ch.title}</span>
            <span className="app-topbar-sub">{ch.sub}</span>
          </div>
          <nav className="app-tabs">
            {TABS.map(t => (
              <button key={t.id}
                className={"app-tab " + (tab===t.id ? 'active' : '')}
                style={tab===t.id ? {borderBottomColor: ch.accent, color: ch.accent} : {}}
                onClick={() => setTab(t.id)}>
                <span className="app-tab-icon">{t.icon}</span>
                <span className="app-tab-label">{t.label}</span>
              </button>
            ))}
          </nav>
        </header>

        {/* 主内容(全屏滚动) */}
        <section className="app-content">
          <ContentArea tab={tab} data={data} chId={chapter} ch={ch} setTab={setTab}/>
        </section>
      </main>
    </div>
  );
}

function ContentArea({ tab, data, chId, ch, setTab }){
  if (!data) return <div className="cm-faint" style={{padding:60}}>加载中…</div>;
  if (tab === 'overview') {
    return <ChapterOverview data={data} chId={chId} ch={ch} accent={ch.accent}
      onPickTab={(t) => setTab(t === 'lessons' ? 'lessons' : t)} />;
  }
  if (tab === 'mindmap')  return <TreeMindmap data={data.mindmap} accent={ch.accent}/>;
  if (tab === 'lessons')  return <LessonReader chapter={data} accent={ch.accent}/>;
  if (tab === 'articles') return <FullscreenArticles articles={data.articles} accent={ch.accent}/>;
  if (tab === 'cards')    return <FullscreenFlashcards data={data} chId={chId} accent={ch.accent}/>;
  if (tab === 'quiz')     return <FullscreenQuiz data={data} chId={chId} accent={ch.accent}/>;
  if (tab === 'mistakes') return <FullscreenMistakes data={data} chId={chId} accent={ch.accent}/>;
  return <div className="cm-faint">未知 tab</div>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
