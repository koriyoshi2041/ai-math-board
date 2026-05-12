// components-mindmap.jsx — Workflowy 风层级树 + 章节侧栏(全新)

const { useState: useStateM, useEffect: useEffectM, useMemo: useMemoM, useRef: useRefM } = React;

// ---------- 章节侧栏 ----------
function ChapterSidebar({ chapters, active, onPick, progressFn }){
  return (
    <div className="cm-sidebar">
      <div className="cm-sidebar-title">章节</div>
      <div className="col" style={{gap:6}}>
        {chapters.map(c => {
          const isActive = c.id === active;
          const p = progressFn ? progressFn(c.id) : null;
          return (
            <div key={c.id}
                 onClick={() => onPick(c.id)}
                 className={"cm-ch " + (isActive ? "active" : "")}
                 style={{borderLeftColor: isActive ? c.accent : 'transparent'}}>
              <div className="row" style={{justifyContent:'space-between', alignItems:'baseline'}}>
                <span className="cm-ch-no" style={{color:c.accent}}>CH {c.no}</span>
                {p && (p.cards>0 || p.quiz>0) && (
                  <span className="cm-ch-pct">{Math.round((p.cards+p.quiz)/2)}%</span>
                )}
              </div>
              <div className="cm-ch-title">{c.title}</div>
              <div className="cm-ch-sub">{c.sub}</div>
              {p && (
                <div className="cm-ch-bars">
                  <div className="cm-ch-bar"><div style={{width:p.cards+'%', background:c.accent}}/></div>
                  <div className="cm-ch-bar"><div style={{width:p.quiz+'%', background:c.accent, opacity:.55}}/></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="cm-sidebar-footer">
        <div className="cm-faint t-12">闪卡 / 测验 进度</div>
      </div>
    </div>
  );
}

// ---------- flat → tree 自动转换 ----------
function flatToTree(mm){
  if (!mm) return null;
  if (mm.tree) return mm.tree;
  if (mm.children) return mm;
  const center = mm.center;
  const nodes = mm.nodes || [];
  if (!center) {
    return { label:'(空)', detail:'', children: nodes.map(n => ({label:n.label, detail:n.motivation||'', children:[]})) };
  }
  return {
    label: center.label,
    detail: '本章中心。逐层展开下面的子主题。',
    children: nodes.map(n => ({
      label: n.label,
      detail: n.motivation || '',
      children: []
    }))
  };
}

// ---------- TreeMindmap ----------
function TreeMindmap({ data, accent='#3779a8' }){
  const tree = useMemoM(() => flatToTree(data), [data]);

  const initialExpanded = useMemoM(() => {
    const set = new Set();
    if (!tree) return set;
    set.add('root');
    (tree.children || []).forEach((_, i) => set.add('root/'+i));
    return set;
  }, [tree]);

  const [expanded, setExpanded] = useStateM(initialExpanded);
  const [focused, setFocused] = useStateM(null);

  useEffectM(() => { setExpanded(initialExpanded); setFocused(null); }, [tree]);

  const toggle = (path) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };

  const allPaths = useMemoM(() => {
    const out = ['root'];
    const walk = (n, p) => {
      (n.children || []).forEach((c, i) => {
        const cp = p+'/'+i;
        out.push(cp);
        if (c.children?.length) walk(c, cp);
      });
    };
    if (tree) walk(tree, 'root');
    return out;
  }, [tree]);

  const expandAll  = () => setExpanded(new Set(allPaths));
  const collapseAll= () => setExpanded(new Set(['root']));

  const focusedNode = useMemoM(() => {
    if (!focused || !tree) return null;
    const parts = focused.split('/').slice(1).map(Number);
    let cur = tree;
    for (const i of parts) cur = cur?.children?.[i];
    return cur;
  }, [focused, tree]);

  // KaTeX 渲染:节点切换时刷新详情面板和树两侧
  const treeRef = useRefM(null);
  const detailRef = useRefM(null);
  useEffectM(() => {
    const tryR = (n=10) => {
      if (window.renderMathInElement && window.renderMathIn) {
        window.renderMathIn(treeRef.current);
        window.renderMathIn(detailRef.current);
      } else if (n>0) setTimeout(() => tryR(n-1), 100);
    };
    tryR();
  }, [tree, focused, expanded]);

  if (!tree) return <div className="cm-faint" style={{padding:40}}>(空导图)</div>;

  return (
    <div className="cm-tree-wrap">
      <div className="cm-toolbar row" style={{justifyContent:'space-between', alignItems:'center'}}>
        <div className="row gap-8">
          <button className="cm-btn" onClick={expandAll}>全部展开</button>
          <button className="cm-btn" onClick={collapseAll}>全部折叠</button>
        </div>
        <div className="cm-faint t-12">点击节点查看动机/直觉</div>
      </div>

      <div className="row gap-20" style={{alignItems:'flex-start', flex:'1 1 0', minHeight:0}}>
        <div className="cm-tree-scroll" style={{flex:'1 1 60%'}} ref={treeRef}>
          <TreeNode
            node={tree} path="root" depth={0} accent={accent}
            expanded={expanded} toggle={toggle}
            focused={focused} setFocused={setFocused}
          />
        </div>

        <div className="cm-detail" style={{flex:'1 1 40%'}} ref={detailRef}>
          {focusedNode ? (
            <>
              <div className="cm-detail-label" style={{borderColor:accent, color:accent}}>
                {focusedNode.label}
              </div>
              <div className="cm-detail-text">{focusedNode.detail || '(暂无详细描述)'}</div>
              {focusedNode.children?.length > 0 && (
                <div style={{marginTop:18}}>
                  <div className="cm-faint t-12 uppercase" style={{marginBottom:6}}>
                    子节点 · {focusedNode.children.length}
                  </div>
                  <div className="col gap-4">
                    {focusedNode.children.map((c, i) => (
                      <div key={i} className="cm-detail-child">{c.label}</div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="cm-faint" style={{padding:'60px 24px', textAlign:'center', fontSize:14}}>
              ← 点击左侧任意节点查看动机和子主题
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TreeNode({ node, path, depth, accent, expanded, toggle, focused, setFocused }){
  const hasKids = node.children && node.children.length > 0;
  const isOpen  = expanded.has(path);
  const isFoc   = focused === path;

  return (
    <div>
      <div className={"cm-node " + (isFoc ? 'focused' : '') + (depth === 0 ? ' root' : '')}
           onClick={() => setFocused(path)}
           style={{
             paddingLeft: 8 + depth*22,
             borderLeftColor: isFoc ? accent : 'transparent'
           }}>
        <span className="cm-bullet"
              onClick={(e) => { e.stopPropagation(); if (hasKids) toggle(path); }}
              style={{
                color: hasKids ? accent : 'rgba(0,0,0,.3)',
                cursor: hasKids ? 'pointer' : 'default'
              }}>
          {hasKids ? (isOpen ? '▾' : '▸') : '·'}
        </span>
        <span className="cm-node-label" style={{
          fontWeight: depth === 0 ? 700 : (depth === 1 ? 600 : 500),
          fontSize: depth === 0 ? 17 : (depth === 1 ? 15 : 14)
        }}>{node.label}</span>
        {hasKids && (
          <span className="cm-node-count" style={{color:'rgba(0,0,0,.35)'}}>
            ({node.children.length})
          </span>
        )}
      </div>
      {hasKids && isOpen && (
        <div>
          {node.children.map((c, i) => (
            <TreeNode key={i}
                      node={c} path={path+'/'+i} depth={depth+1}
                      accent={accent}
                      expanded={expanded} toggle={toggle}
                      focused={focused} setFocused={setFocused} />
          ))}
        </div>
      )}
    </div>
  );
}

// 暴露(同时 alias 旧名,避免老代码引用炸)
window.ChapterSidebar = ChapterSidebar;
window.ChapterList    = ChapterSidebar;
window.TreeMindmap    = TreeMindmap;
window.MindMap        = TreeMindmap;
