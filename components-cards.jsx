// components-cards.jsx — 全屏闪卡 / 测验 / 错题 / 文章 / 概览 + useProgress + KaTeX

const { useState: useStateC, useEffect: useEffectC, useMemo: useMemoC, useRef: useRefC } = React;

// ============================================================
// KaTeX helper —— 自动渲染容器内所有 $...$ / $$...$$
// ============================================================
function renderMathIn(el){
  if (!el || !window.renderMathInElement) return;
  try {
    window.renderMathInElement(el, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$',  right: '$',  display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true }
      ],
      throwOnError: false,
      ignoredTags: ['script','style','textarea','noscript','pre','code']
    });
  } catch(e) { /* ignore */ }
}

// React hook: 在 ref 元素上每次渲染后自动跑 KaTeX
function useKatex(deps){
  const ref = useRefC(null);
  useEffectC(() => {
    // 等 KaTeX 加载完(defer 脚本可能稍晚)
    const tryRender = (retries = 10) => {
      if (window.renderMathInElement) {
        renderMathIn(ref.current);
      } else if (retries > 0) {
        setTimeout(() => tryRender(retries - 1), 100);
      }
    };
    tryRender();
  }, deps);
  return ref;
}

// 暴露给其他组件文件
window.renderMathIn = renderMathIn;
window.useKatex = useKatex;

// ============================================================
// useProgress — localStorage-backed real progress tracking
// ============================================================
const PROG_KEY = (chId) => 'aimath:progress:' + chId;

function loadProgress(chId){
  try {
    const raw = localStorage.getItem(PROG_KEY(chId));
    if (!raw) return { cards:{}, quiz:{}, mistakes:{}, markedCards:{}, markedQuiz:{}, lastAt: null };
    const o = JSON.parse(raw);
    return {
      cards: o.cards||{},
      quiz: o.quiz||{},
      mistakes: o.mistakes||{},
      markedCards: o.markedCards||{},
      markedQuiz: o.markedQuiz||{},
      lastAt: o.lastAt||null
    };
  } catch(e) { return { cards:{}, quiz:{}, mistakes:{}, markedCards:{}, markedQuiz:{}, lastAt: null }; }
}
function saveProgress(chId, p){
  try { localStorage.setItem(PROG_KEY(chId), JSON.stringify(p)); } catch(e){}
}

// 全局共享: useProgress(chId) 返回 [state, api]
function useProgress(chId){
  const [state, setState] = useStateC(() => loadProgress(chId));
  useEffectC(() => { setState(loadProgress(chId)); }, [chId]);

  const persist = (next) => {
    const merged = { ...state, ...next, lastAt: Date.now() };
    setState(merged);
    saveProgress(chId, merged);
  };

  const api = {
    rateCard(idx, rating /* 'again'|'hard'|'good'|'easy' */){
      const c = { ...state.cards, [idx]: { rating, at: Date.now() } };
      // again → 自动加错题闪卡
      let mc = state.markedCards;
      if (rating === 'again' && !mc[idx]) {
        mc = { ...mc, [idx]: { addedAt: Date.now(), status:'open', auto:true } };
      }
      persist({ cards: c, markedCards: mc });
    },
    answerQuiz(idx, picked, correct){
      const q = { ...state.quiz, [idx]: { picked, correct, at: Date.now() } };
      // 答错 → 自动加错题
      let mq = state.markedQuiz;
      if (!correct && !mq[idx]) {
        mq = { ...mq, [idx]: { addedAt: Date.now(), status:'open', auto:true } };
      }
      persist({ quiz: q, markedQuiz: mq });
    },
    toggleMistake(idx){
      const cur = state.mistakes[idx] || 'open';
      const m = { ...state.mistakes, [idx]: cur === 'open' ? 'resolved' : 'open' };
      persist({ mistakes: m });
    },
    markCard(idx){
      const cur = state.markedCards[idx];
      let mc;
      if (cur) {
        // toggle status
        mc = { ...state.markedCards, [idx]: { ...cur, status: cur.status === 'open' ? 'resolved' : 'open' } };
      } else {
        mc = { ...state.markedCards, [idx]: { addedAt: Date.now(), status:'open', auto:false } };
      }
      persist({ markedCards: mc });
    },
    removeMarkedCard(idx){
      const mc = { ...state.markedCards };
      delete mc[idx];
      persist({ markedCards: mc });
    },
    markQuiz(idx){
      const cur = state.markedQuiz[idx];
      let mq;
      if (cur) {
        mq = { ...state.markedQuiz, [idx]: { ...cur, status: cur.status === 'open' ? 'resolved' : 'open' } };
      } else {
        mq = { ...state.markedQuiz, [idx]: { addedAt: Date.now(), status:'open', auto:false } };
      }
      persist({ markedQuiz: mq });
    },
    removeMarkedQuiz(idx){
      const mq = { ...state.markedQuiz };
      delete mq[idx];
      persist({ markedQuiz: mq });
    },
    track(_event){ /* breadcrumb hook */ }
  };

  return [state, api];
}

// 计算章节进度 stats
function chapterStats(prog, data){
  const totC = (data.flashcards||[]).length;
  const totQ = (data.quiz||[]).length;
  const totM = (data.reflections?.mistakes||[]).length;

  const cardEntries = Object.entries(prog.cards);
  const seenC = cardEntries.length;
  const masteredC = cardEntries.filter(([,v]) => v.rating==='good' || v.rating==='easy').length;

  const quizEntries = Object.entries(prog.quiz);
  const ansQ = quizEntries.length;
  const corQ = quizEntries.filter(([,v]) => v.correct).length;

  const mEntries = Object.entries(prog.mistakes);
  const resM = mEntries.filter(([,v]) => v==='resolved').length;
  const openM = totM - resM;

  // 用户标记的错题闪卡 / 测验
  const mcEntries = Object.entries(prog.markedCards||{});
  const mqEntries = Object.entries(prog.markedQuiz||{});
  const markedCardsOpen = mcEntries.filter(([,v]) => v.status==='open').length;
  const markedCardsResolved = mcEntries.filter(([,v]) => v.status==='resolved').length;
  const markedQuizOpen = mqEntries.filter(([,v]) => v.status==='open').length;
  const markedQuizResolved = mqEntries.filter(([,v]) => v.status==='resolved').length;

  return {
    cards: totC ? Math.round(seenC/totC*100) : 0,
    cardsMastered: masteredC,
    cardsTotal: totC,
    cardsSeen: seenC,
    quiz: totQ ? Math.round(ansQ/totQ*100) : 0,
    quizCorrect: corQ,
    quizAnswered: ansQ,
    quizTotal: totQ,
    mistakesOpen: openM,
    mistakesResolved: resM,
    mistakesTotal: totM,
    markedCardsOpen, markedCardsResolved,
    markedQuizOpen, markedQuizResolved,
    streak: 0
  };
}

// ============================================================
// FullscreenFlashcards
// ============================================================
function FullscreenFlashcards({ data, chId, accent }){
  const [prog, api] = useProgress(chId);
  const rawCards = data.flashcards || [];
  const cards = useMemoC(() => rawCards.map(normalizeCard).filter(Boolean), [rawCards]);
  const [idx, setIdx] = useStateC(0);
  const [flipped, setFlipped] = useStateC(false);
  const [filterTag, setFilterTag] = useStateC('all');
  const wrapRef = useRefC(null);

  const filtered = useMemoC(() => {
    if (filterTag === 'all') return cards.map((c,i)=>({c,i}));
    return cards.map((c,i)=>({c,i})).filter(x => x.c.tag === filterTag);
  }, [cards, filterTag]);
  const tags = useMemoC(() => Array.from(new Set(cards.map(c => c.tag).filter(Boolean))), [cards]);

  const safe = Math.min(idx, Math.max(0, filtered.length - 1));
  const cur = filtered[safe];
  if (!cur) return <div className="cm-faint" style={{padding:60}}>(本筛选下没有卡片)</div>;
  const card = cur.c;
  const realIdx = cur.i;
  const stats = chapterStats(prog, data);
  const myRating = prog.cards[realIdx]?.rating;

  const next = () => { setFlipped(false); setTimeout(() => setIdx((safe+1) % filtered.length), 120); };
  const prev = () => { setFlipped(false); setTimeout(() => setIdx((safe-1+filtered.length) % filtered.length), 120); };
  const random = () => { setFlipped(false); setTimeout(() => setIdx(Math.floor(Math.random()*filtered.length)), 120); };
  const rate = (r) => { api.rateCard(realIdx, r); next(); };

  // 键盘快捷键
  useEffectC(() => {
    const h = (e) => {
      if (e.target.closest('input,textarea,button')) return;
      if (e.key === ' ') { e.preventDefault(); setFlipped(f=>!f); }
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
      if (flipped) {
        if (e.key === '1') rate('again');
        if (e.key === '2') rate('hard');
        if (e.key === '3') rate('good');
        if (e.key === '4') rate('easy');
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [safe, flipped, filtered]);

  // KaTeX 渲染:每次切卡或翻面后重渲染
  useEffectC(() => {
    const tryR = (n=10) => {
      if (window.renderMathInElement) renderMathIn(wrapRef.current);
      else if (n>0) setTimeout(() => tryR(n-1), 100);
    };
    tryR();
  }, [safe, flipped, filtered.length]);

  return (
    <div className="fc-wrap" ref={wrapRef}>
      {/* 顶部 stats + 筛选 */}
      <div className="fc-stats">
        <div className="row gap-16" style={{alignItems:'center', flexWrap:'wrap'}}>
          <div className="fc-stat">
            <div className="fc-stat-label">已见</div>
            <div className="fc-stat-val">{stats.cardsSeen} / {stats.cardsTotal}</div>
          </div>
          <div className="fc-stat">
            <div className="fc-stat-label">已掌握</div>
            <div className="fc-stat-val" style={{color:'#5a9550'}}>{stats.cardsMastered}</div>
          </div>
          <div className="fc-stat">
            <div className="fc-stat-label">本张</div>
            <div className="fc-stat-val" style={{color:accent}}>{safe+1} / {filtered.length}</div>
          </div>
          <div className="fc-bar" style={{flex:'1 1 200px'}}>
            <div style={{width: stats.cards+'%', background: accent}}/>
          </div>
        </div>
        {tags.length > 1 && (
          <div className="row gap-6" style={{flexWrap:'wrap', marginTop:8}}>
            <button className={"cm-btn " + (filterTag==='all'?'primary':'')}
              style={filterTag==='all' ? {background:accent, borderColor:accent, color:'#fff'} : {}}
              onClick={() => { setFilterTag('all'); setIdx(0); setFlipped(false); }}>全部</button>
            {tags.map(t => (
              <button key={t} className={"cm-btn " + (filterTag===t?'primary':'')}
                style={filterTag===t ? {background:accent, borderColor:accent, color:'#fff'} : {}}
                onClick={() => { setFilterTag(t); setIdx(0); setFlipped(false); }}>{t}</button>
            ))}
          </div>
        )}
      </div>

      {/* 卡片本体 */}
      <div className="fc-card-area">
        <div className={"fc-card " + (flipped ? 'flipped' : '')}
             onClick={() => setFlipped(!flipped)}>
          {!flipped ? (
            <div className="fc-side fc-front">
              <div className="fc-side-label">题面 · 点击翻面 (空格)</div>
              <div className="fc-front-text">{card.front}</div>
              {card.tag && <div className="fc-tag">{card.tag}</div>}
            </div>
          ) : (
            <div className="fc-side fc-back" style={{background:'#fff5cc'}}>
              <div className="fc-side-label">答案</div>
              <div className="fc-back-text">{card.back}</div>
              {card.intuition && (
                <div className="fc-int">
                  <div className="fc-int-label">✦ 直觉 / 动机 / 类比</div>
                  <div className="fc-int-text">{card.intuition}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 评分 + 导航 */}
      <div className="fc-controls">
        {flipped ? (
          <>
            <div className="row gap-8" style={{justifyContent:'center', flexWrap:'wrap'}}>
              <button className="fc-rate" style={{background:'#cf6f6c'}} onClick={() => rate('again')}>1 · 完全忘了</button>
              <button className="fc-rate" style={{background:'#d99a4a'}} onClick={() => rate('hard')}>2 · 困难</button>
              <button className="fc-rate" style={{background:'#5a9550'}} onClick={() => rate('good')}>3 · 记得</button>
              <button className="fc-rate" style={{background:'#3779a8'}} onClick={() => rate('easy')}>4 · 简单</button>
            </div>
            <div className="row" style={{justifyContent:'center', marginTop:8}}>
              {(() => {
                const marked = prog.markedCards?.[realIdx];
                const isMarked = marked && marked.status === 'open';
                return (
                  <button className="cm-btn"
                    style={isMarked ? {background:'#cf6f6c', color:'#fff', borderColor:'#cf6f6c'} : {}}
                    onClick={() => api.markCard(realIdx)}>
                    {isMarked ? '★ 已加入错题(再点取消)' : '☆ 加入错题'}
                  </button>
                );
              })()}
            </div>
          </>
        ) : (
          <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
            <button className="cm-btn" onClick={prev}>← 上一张</button>
            <button className="cm-btn" onClick={random}>↻ 随机</button>
            <button className="cm-btn primary"
              style={{background:accent, borderColor:accent, color:'#fff'}}
              onClick={() => setFlipped(true)}>翻面 (空格)</button>
            <button className="cm-btn" onClick={next}>下一张 →</button>
          </div>
        )}
        {myRating && <div className="cm-faint t-12" style={{textAlign:'center', marginTop:6}}>上次评分: {myRating} {prog.markedCards?.[realIdx]?.auto && '· 已自动加入错题(因 again)'}</div>}
      </div>
    </div>
  );
}

// ============================================================
// FullscreenQuiz
// ============================================================
// 规范化 quiz 对象 — 容忍多套字段名
function normalizeQuiz(raw){
  if (!raw) return null;
  const q = raw.q || raw.question || raw.stem || raw.prompt || '';
  const choices = raw.choices || raw.options || raw.distractors || raw.answers || [];
  let answer = (typeof raw.answer === 'number') ? raw.answer
             : (typeof raw.correct === 'number') ? raw.correct
             : (typeof raw.answer_idx === 'number') ? raw.answer_idx
             : (typeof raw.correct_index === 'number') ? raw.correct_index
             : 0;
  if (!q || !Array.isArray(choices) || choices.length < 2) return null;
  // option_explanations 容忍多种命名
  const optExp = raw.option_explanations || raw.option_notes || raw.distractor_analysis || raw.choice_notes || null;
  return { ...raw, q, choices, answer, option_explanations: Array.isArray(optExp) ? optExp : null };
}

// 规范化 flashcard 对象 — 容忍多套字段名
//   front: front | q | question | prompt
//   back:  back  | a | answer   | response
function normalizeCard(raw){
  if (!raw) return null;
  const front = raw.front || raw.q || raw.question || raw.prompt || '';
  const back  = raw.back  || raw.a || raw.answer   || raw.response || '';
  if (!front || !back) return null;
  return { ...raw, front, back };
}

// 规范化 mistake / 易错点 — 5 种 schema 兼容
function normalizeMistake(m){
  if (!m) return null;
  if (typeof m === 'string') return { tag:'反思', text:m };
  // 1) {tag, text} - ch1/ch2/ch6
  if (m.text) {
    return { ...m, tag: m.tag || '反思', text: m.text };
  }
  // 2) {tag, wrong, right, why} - ch7
  if (m.wrong && m.right) {
    const text = `❌ ${m.wrong}\n\n✓ ${m.right}` + (m.why ? `\n\n💡 ${m.why}` : '');
    return { ...m, tag: m.tag || '陷阱', text };
  }
  // 3) {claim, why_wrong, fix} - ch5
  if (m.claim) {
    const text = (m.title ? `【${m.title}】\n\n` : '')
               + `❌ ${m.claim}`
               + (m.why_wrong ? `\n\n为什么错: ${m.why_wrong}` : '')
               + (m.fix ? `\n\n✓ 修正: ${m.fix}` : '');
    return { ...m, tag: m.tag || '易错', text };
  }
  // 4) {title, detail, fix} - ch3/ch4
  if (m.title || m.detail) {
    const text = (m.title ? `【${m.title}】\n\n` : '')
               + (m.detail || '')
               + (m.fix ? `\n\n✓ 修正: ${m.fix}` : '');
    return { ...m, tag: m.tag || m.category || '易错', text };
  }
  // 5) {topic, description, details} - ch0
  if (m.description || m.topic) {
    const text = (m.topic ? `【${m.topic}】\n\n` : '')
               + (m.description || '')
               + (m.details ? `\n\n${m.details}` : '');
    return { ...m, tag: m.tag || m.topic || '易错', text };
  }
  // 兜底:把所有非 id 字段塞进 text
  const text = Object.entries(m)
    .filter(([k,v]) => !['id','tag','status'].includes(k) && typeof v === 'string')
    .map(([k,v]) => `${k}: ${v}`).join('\n');
  return { ...m, tag: m.tag || '反思', text: text || JSON.stringify(m) };
}

// 规范化 summary 项 — 兼容字符串 / {label, key_points:[]} / {text}
function normalizeSummary(s){
  if (!s) return '';
  if (typeof s === 'string') return s;
  if (s.text) return s.text;
  if (s.key_points && Array.isArray(s.key_points)) {
    return (s.label ? `【${s.label}】 ` : '') + s.key_points.join(' · ');
  }
  if (s.label) return s.label;
  return JSON.stringify(s);
}

function FullscreenQuiz({ data, chId, accent }){
  const [prog, api] = useProgress(chId);
  const rawQuizzes = data.quiz || [];
  const quizzes = useMemoC(() => rawQuizzes.map(normalizeQuiz).filter(Boolean), [rawQuizzes]);
  const [idx, setIdx] = useStateC(0);
  const [picked, setPicked] = useStateC(null);
  const [showOnly, setShowOnly] = useStateC('all'); // 'all' | 'unanswered' | 'wrong'
  const wrapRef = useRefC(null);

  const filtered = useMemoC(() => {
    return quizzes.map((q,i)=>({q,i})).filter(x => {
      const a = prog.quiz[x.i];
      if (showOnly === 'unanswered') return !a;
      if (showOnly === 'wrong') return a && !a.correct;
      return true;
    });
  }, [quizzes, prog.quiz, showOnly]);

  const safe = Math.min(idx, Math.max(0, filtered.length - 1));
  const cur = filtered[safe];

  useEffectC(() => { setPicked(null); }, [safe, filtered.length, chId]);
  // 切到一张已答的题时,自动展示之前的选择
  useEffectC(() => {
    if (cur) {
      const ans = prog.quiz[cur.i];
      if (ans) setPicked(ans.picked);
    }
  }, [cur?.i]);

  if (!cur) return (
    <div className="cm-faint" style={{padding:60, textAlign:'center'}}>
      {showOnly === 'unanswered' ? '🎉 全部答完!' : (showOnly === 'wrong' ? '没有错题' : '(本章暂无测验)')}
      <div style={{marginTop:14}}>
        <button className="cm-btn" onClick={() => { setShowOnly('all'); setIdx(0); }}>显示全部</button>
      </div>
    </div>
  );

  const quiz = cur.q;
  const stats = chapterStats(prog, data);
  const correct = picked !== null && picked === quiz.answer;

  const choose = (i) => {
    if (picked !== null) return;
    setPicked(i);
    api.answerQuiz(cur.i, i, i === quiz.answer);
  };

  const next = () => { setIdx((safe+1) % filtered.length); setPicked(null); };
  const prev = () => { setIdx((safe-1+filtered.length) % filtered.length); setPicked(null); };

  // KaTeX 渲染
  useEffectC(() => {
    const tryR = (n=10) => {
      if (window.renderMathInElement) renderMathIn(wrapRef.current);
      else if (n>0) setTimeout(() => tryR(n-1), 100);
    };
    tryR();
  }, [safe, picked, filtered.length]);

  return (
    <div className="qz-wrap" ref={wrapRef}>
      <div className="fc-stats">
        <div className="row gap-16" style={{alignItems:'center', flexWrap:'wrap'}}>
          <div className="fc-stat">
            <div className="fc-stat-label">已答</div>
            <div className="fc-stat-val">{stats.quizAnswered} / {stats.quizTotal}</div>
          </div>
          <div className="fc-stat">
            <div className="fc-stat-label">答对</div>
            <div className="fc-stat-val" style={{color:'#5a9550'}}>{stats.quizCorrect}</div>
          </div>
          <div className="fc-stat">
            <div className="fc-stat-label">本题</div>
            <div className="fc-stat-val" style={{color:accent}}>{safe+1} / {filtered.length}</div>
          </div>
          <div className="fc-bar" style={{flex:'1 1 200px'}}>
            <div style={{width: stats.quiz+'%', background: accent}}/>
          </div>
        </div>
        <div className="row gap-6" style={{flexWrap:'wrap', marginTop:8}}>
          {[['all','全部'], ['unanswered','未答'], ['wrong','错题']].map(([k, label]) => (
            <button key={k}
              className={"cm-btn " + (showOnly===k?'primary':'')}
              style={showOnly===k ? {background:accent, borderColor:accent, color:'#fff'} : {}}
              onClick={() => { setShowOnly(k); setIdx(0); setPicked(null); }}>{label}</button>
          ))}
        </div>
      </div>

      <div className="qz-card">
        <div className="qz-num" style={{color:accent}}>第 {cur.i+1} 题</div>
        <div className="qz-q">{quiz.q}</div>
        <div className="col gap-8" style={{marginTop:14}}>
          {quiz.choices.map((c, i) => {
            const state = picked === null ? 'idle'
                        : i === quiz.answer ? 'right'
                        : i === picked ? 'wrong' : 'dim';
            const bg = state==='right' ? '#d6ecc8'
                      : state==='wrong' ? '#f5cdc8'
                      : state==='dim' ? 'rgba(0,0,0,.04)' : '#fff';
            const expl = (picked !== null && quiz.option_explanations) ? quiz.option_explanations[i] : null;
            return (
              <div key={i}>
                <button className="qz-choice"
                  onClick={() => choose(i)}
                  style={{
                    width:'100%',
                    background:bg, opacity: state==='dim'?.55:1,
                    borderColor: state==='right' ? '#5a9550' : (state==='wrong' ? '#cf6f6c' : '#2b2418')
                  }}>
                  <span className="qz-letter">{'ABCD'[i]}</span> {c}
                </button>
                {expl && (
                  <div className="qz-opt-expl" style={{
                    borderColor: state==='right' ? '#5a9550' : (state==='wrong' ? '#cf6f6c' : 'rgba(0,0,0,.2)'),
                    background: state==='right' ? 'rgba(90,149,80,.08)' : (state==='wrong' ? 'rgba(207,111,108,.08)' : 'rgba(0,0,0,.03)')
                  }}>
                    {state==='right' ? '✓ ' : (state==='wrong' ? '✗ ' : '· ')}{expl}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {picked !== null && quiz.intuition && (
          <div className="qz-int" style={{borderColor: correct ? '#5a9550' : '#cf6f6c'}}>
            <div className="qz-int-label">{correct ? '✓ 答对了 — 直觉理解' : '✗ 看一下直觉解释'}</div>
            <div className="qz-int-text">{quiz.intuition}</div>
          </div>
        )}
        {picked !== null && (() => {
          const marked = prog.markedQuiz?.[cur.i];
          const isMarked = marked && marked.status === 'open';
          return (
            <div className="row" style={{justifyContent:'flex-end', marginTop:10}}>
              <button className="cm-btn"
                style={isMarked ? {background:'#cf6f6c', color:'#fff', borderColor:'#cf6f6c'} : {}}
                onClick={() => api.markQuiz(cur.i)}>
                {isMarked ? '★ 已加入错题(再点取消)' : '☆ 加入错题'}
                {marked?.auto && ' · 答错时自动加入'}
              </button>
            </div>
          );
        })()}
      </div>

      <div className="row" style={{justifyContent:'space-between', marginTop:14}}>
        <button className="cm-btn" onClick={prev}>← 上一题</button>
        <button className="cm-btn primary"
          style={{background:accent, borderColor:accent, color:'#fff'}}
          onClick={next}>下一题 →</button>
      </div>
    </div>
  );
}

// ============================================================
// FullscreenMistakes (反思 + 总结)
// ============================================================
function FullscreenMistakes({ data, chId, accent }){
  const [prog, api] = useProgress(chId);
  const rawRef = data.reflections || { mistakes:[], summary:[] };
  const ref = useMemoC(() => ({
    mistakes: (rawRef.mistakes || []).map(normalizeMistake).filter(Boolean),
    summary:  (rawRef.summary  || []).map(normalizeSummary).filter(Boolean),
  }), [rawRef]);
  const stats = chapterStats(prog, data);
  const wrapRef = useRefC(null);
  useEffectC(() => {
    const tryR = (n=10) => {
      if (window.renderMathInElement) renderMathIn(wrapRef.current);
      else if (n>0) setTimeout(() => tryR(n-1), 100);
    };
    tryR();
  }, [data, chId, prog]);

  // 用户标记的错题闪卡 / 测验,带原始内容
  const markedCardItems = useMemoC(() => {
    return Object.entries(prog.markedCards||{}).map(([k, v]) => {
      const i = Number(k);
      const raw = data.flashcards?.[i];
      return { i, marker: v, card: raw ? normalizeCard(raw) : null };
    }).filter(x => x.card).sort((a,b) => (b.marker.addedAt||0) - (a.marker.addedAt||0));
  }, [prog.markedCards, data.flashcards]);

  const markedQuizItems = useMemoC(() => {
    return Object.entries(prog.markedQuiz||{}).map(([k, v]) => {
      const i = Number(k);
      const raw = data.quiz?.[i];
      return { i, marker: v, quiz: raw ? normalizeQuiz(raw) : null };
    }).filter(x => x.quiz).sort((a,b) => (b.marker.addedAt||0) - (a.marker.addedAt||0));
  }, [prog.markedQuiz, data.quiz]);

  return (
    <div className="ms-wrap" ref={wrapRef}>
      <div className="fc-stats">
        <div className="row gap-16" style={{alignItems:'center', flexWrap:'wrap'}}>
          <div className="fc-stat">
            <div className="fc-stat-label">预定义易错</div>
            <div className="fc-stat-val" style={{color: stats.mistakesOpen ? '#cf6f6c' : '#5a9550'}}>{stats.mistakesOpen} / {stats.mistakesTotal}</div>
          </div>
          <div className="fc-stat">
            <div className="fc-stat-label">我标的错题闪卡</div>
            <div className="fc-stat-val" style={{color:'#cf6f6c'}}>{stats.markedCardsOpen}</div>
          </div>
          <div className="fc-stat">
            <div className="fc-stat-label">我标的错题测验</div>
            <div className="fc-stat-val" style={{color:'#cf6f6c'}}>{stats.markedQuizOpen}</div>
          </div>
          <div className="fc-stat">
            <div className="fc-stat-label">已消化</div>
            <div className="fc-stat-val" style={{color:'#5a9550'}}>{stats.mistakesResolved + stats.markedCardsResolved + stats.markedQuizResolved}</div>
          </div>
        </div>
      </div>

      {/* 三段式 */}
      <div className="ms-section">
        <h3 className="ms-h3" style={{borderColor:accent}}>
          ✗ 预定义易错 · 反思 · 陷阱 <span className="cm-faint t-12">({stats.mistakesTotal})</span>
        </h3>
        {ref.mistakes.length === 0 ? (
          <div className="cm-faint" style={{padding:14}}>(本章未定义易错点)</div>
        ) : (
          <div className="col gap-8">
            {ref.mistakes.map((m, i) => {
              const resolved = prog.mistakes[i] === 'resolved';
              return (
                <div key={i} className={"ms-item " + (resolved ? 'resolved' : '')}>
                  <span className={"ms-tag tag-" + (m.tag === '易错' ? 'red' : (m.tag === '陷阱' ? 'orange' : 'blue'))}>
                    {m.tag}
                  </span>
                  <div className="ms-text">{m.text}</div>
                  <button className={"ms-resolve " + (resolved ? 'done' : '')}
                    onClick={() => api.toggleMistake(i)}>
                    {resolved ? '✓ 已消化' : '标记消化'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="ms-section">
        <h3 className="ms-h3" style={{borderColor:accent}}>
          ★ 我标的错题闪卡 <span className="cm-faint t-12">({markedCardItems.length})</span>
        </h3>
        {markedCardItems.length === 0 ? (
          <div className="cm-faint" style={{padding:14}}>(还没标记错题闪卡。在闪卡页打"again"或点☆加入错题)</div>
        ) : (
          <div className="col gap-8">
            {markedCardItems.map(({i, marker, card}) => {
              const resolved = marker.status === 'resolved';
              return (
                <div key={i} className={"ms-item-card " + (resolved ? 'resolved' : '')}>
                  <div className="ms-item-card-meta">
                    <span className="ms-tag tag-red">闪卡 #{i+1}</span>
                    {marker.auto && <span className="cm-faint t-12">· 自动(again)</span>}
                  </div>
                  <div className="ms-item-card-front">{card.front}</div>
                  <div className="ms-item-card-back">{card.back}</div>
                  {card.intuition && <div className="ms-item-card-int">✦ {card.intuition}</div>}
                  <div className="row gap-6" style={{marginTop:8}}>
                    <button className={"cm-btn " + (resolved ? 'primary' : '')}
                      style={resolved ? {background:'#5a9550', borderColor:'#5a9550', color:'#fff'} : {}}
                      onClick={() => api.markCard(i)}>
                      {resolved ? '✓ 已消化' : '标记消化'}
                    </button>
                    <button className="cm-btn" onClick={() => api.removeMarkedCard(i)}>移除</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="ms-section">
        <h3 className="ms-h3" style={{borderColor:accent}}>
          ★ 我标的错题测验 <span className="cm-faint t-12">({markedQuizItems.length})</span>
        </h3>
        {markedQuizItems.length === 0 ? (
          <div className="cm-faint" style={{padding:14}}>(还没标记错题测验。答错会自动加,也可手动☆加入)</div>
        ) : (
          <div className="col gap-8">
            {markedQuizItems.map(({i, marker, quiz}) => {
              const resolved = marker.status === 'resolved';
              return (
                <div key={i} className={"ms-item-card " + (resolved ? 'resolved' : '')}>
                  <div className="ms-item-card-meta">
                    <span className="ms-tag tag-orange">测验 #{i+1}</span>
                    {marker.auto && <span className="cm-faint t-12">· 自动(答错)</span>}
                  </div>
                  <div className="ms-item-card-front">{quiz.q}</div>
                  <ul style={{margin:'6px 0', paddingLeft:'1.4em', fontSize:14}}>
                    {quiz.choices.map((c, j) => (
                      <li key={j} style={{
                        color: j === quiz.answer ? '#3f6837' : 'inherit',
                        fontWeight: j === quiz.answer ? 600 : 400
                      }}>
                        {'ABCD'[j]}. {c} {j === quiz.answer && '✓'}
                      </li>
                    ))}
                  </ul>
                  {quiz.intuition && <div className="ms-item-card-int">✦ {quiz.intuition}</div>}
                  <div className="row gap-6" style={{marginTop:8}}>
                    <button className={"cm-btn " + (resolved ? 'primary' : '')}
                      style={resolved ? {background:'#5a9550', borderColor:'#5a9550', color:'#fff'} : {}}
                      onClick={() => api.markQuiz(i)}>
                      {resolved ? '✓ 已消化' : '标记消化'}
                    </button>
                    <button className="cm-btn" onClick={() => api.removeMarkedQuiz(i)}>移除</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="ms-section">
        <h3 className="ms-h3" style={{borderColor:accent}}>★ 关键总结</h3>
        {ref.summary.length === 0 ? (
          <div className="cm-faint" style={{padding:14}}>(本章未给关键总结)</div>
        ) : (
          <ol className="ms-summary">
            {ref.summary.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        )}
      </div>
    </div>
  );
}

// ============================================================
// FullscreenArticles (改良 ArticlePane,全屏)
// ============================================================
function FullscreenArticles({ articles, accent }){
  const tabs = useMemoC(() => {
    const list = [];
    if (articles.tour)    list.push({ key:'tour',    label:'★ 纵览', art:articles.tour });
    if (articles.intro)   list.push({ key:'intro',   label:'引入',  art:articles.intro });
    (articles.deep || []).forEach((art, i) => list.push({ key:'deep'+i, label:`深入 ${i+1}`, art }));
    if (articles.methods) list.push({ key:'methods', label:'方法 / 解题', art:articles.methods });
    if (articles.recap)   list.push({ key:'recap',   label:'回顾',  art:articles.recap });
    return list;
  }, [articles]);

  const [idx, setIdx] = useStateC(0);
  const safe = Math.min(idx, Math.max(0, tabs.length - 1));
  const a = tabs[safe]?.art;
  const scrollRef = useRefC(null);

  useEffectC(() => { setIdx(0); }, [articles]);
  useEffectC(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [safe, articles]);
  // KaTeX 渲染:每次切 tab / 切章节都重渲染容器内的数学
  useEffectC(() => {
    const tryR = (n=10) => {
      if (window.renderMathInElement) renderMathIn(scrollRef.current);
      else if (n>0) setTimeout(() => tryR(n-1), 100);
    };
    tryR();
  }, [safe, articles]);

  if (!a) return <div className="cm-faint" style={{padding:60, textAlign:'center'}}>(本章暂无文章)</div>;

  return (
    <div className="art-wrap">
      <div className="art-tabs">
        {tabs.map((t, i) => (
          <button key={t.key} onClick={() => setIdx(i)}
            className={"art-tab " + (i===safe ? 'active' : '')}
            style={i===safe ? {background:accent, borderColor:accent, color:'#fff'} : {}}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="art-paper" ref={scrollRef}>
        <div className="art-kicker">{a.kicker}</div>
        <h1 className="art-title" style={{borderBottomColor:accent}}>{a.title}</h1>
        {(a.body||[]).map((blk, i) => <ArtBlock key={i} blk={blk} accent={accent}/>)}
        <div className="art-footer">
          {safe > 0 && <button className="cm-btn" onClick={() => setIdx(safe-1)}>← {tabs[safe-1].label}</button>}
          <span style={{flex:1}}/>
          {safe < tabs.length-1 && (
            <button className="cm-btn primary"
              style={{background:accent, borderColor:accent, color:'#fff'}}
              onClick={() => setIdx(safe+1)}>{tabs[safe+1].label} →</button>
          )}
        </div>
      </div>
    </div>
  );
}

// 把 formula 块的内容自动包成 display 数学(若未带 $)
function wrapFormula(s){
  if (!s) return '';
  const str = String(s).trim();
  if (str.startsWith('$$') || str.startsWith('\\[')) return str;
  if (str.includes('$')) return str; // 已有 inline math,信任作者
  return '$$' + str + '$$';
}

function ArtBlock({ blk, accent }){
  if (!blk) return null;
  const t = blk[0], v = blk[1];
  if (t === 'p') return <p className="art-p">{v}</p>;
  if (t === 'h2') return <h2 className="art-h2" style={{color:accent}}>{v}</h2>;
  if (t === 'h3') return <h3 className="art-h3">{v}</h3>;
  if (t === 'callout') return <div className="art-callout" style={{borderColor:accent}}>{v}</div>;
  if (t === 'quote') return <div className="art-quote">✦ {v}</div>;
  if (t === 'ul') return <ul className="art-ul">{(Array.isArray(v)?v:[v]).map((x,i)=><li key={i}>{x}</li>)}</ul>;
  if (t === 'ol') return <ol className="art-ol">{(Array.isArray(v)?v:[v]).map((x,i)=><li key={i}>{x}</li>)}</ol>;
  if (t === 'formula') return <div className="art-formula">{wrapFormula(v)}</div>;
  if (t === 'example') return <div className="art-example"><div className="art-example-label">▸ 例</div>{v}</div>;
  if (t === 'pretest') {
    // v 形如 { q:'问题', a:'答案揭示' } —— 先盖住答案,鼓励先猜
    const q = (v && v.q) || (Array.isArray(v) ? v[0] : String(v));
    const a = (v && v.a) || (Array.isArray(v) ? v[1] : '');
    return <PretestBlock q={q} a={a} accent={accent}/>;
  }
  if (t === 'flashcard_inline') {
    // v 形如 { front:'问题', back:'答案', intuition:'(可选)直觉' }
    return <InlineCardBlock card={v} accent={accent}/>;
  }
  return <p className="art-p">{String(v)}</p>;
}

function PretestBlock({ q, a, accent }){
  const [shown, setShown] = useStateC(false);
  return (
    <div style={{
      margin:'14px 0', padding:'14px 18px',
      background:'rgba(244,213,110,.20)',
      border:'1.4px solid rgba(244,213,110,.7)',
      borderRadius:8
    }}>
      <div className="cm-faint t-12 uppercase" style={{marginBottom:6, color:'#7a5a14', letterSpacing:'.1em'}}>
        ☐ 先猜一下
      </div>
      <div className="hand" style={{fontSize:16, lineHeight:1.6, color:'#2b2418', whiteSpace:'pre-wrap'}}>
        {q}
      </div>
      {!shown ? (
        <button onClick={() => setShown(true)}
          style={{marginTop:10, padding:'4px 12px', background:'#fff',
            border:'1.4px solid #2b2418', borderRadius:6, cursor:'pointer',
            fontFamily:'Patrick Hand,cursive', fontSize:13}}>
          看答案 →
        </button>
      ) : (
        <div style={{
          marginTop:10, padding:'10px 14px',
          background:'#fff', borderLeft:'3px solid '+accent, borderRadius:'0 6px 6px 0',
          fontSize:14, lineHeight:1.65, whiteSpace:'pre-wrap'
        }}>
          ✓ {a}
        </div>
      )}
    </div>
  );
}

function InlineCardBlock({ card, accent }){
  const [flipped, setFlipped] = useStateC(false);
  if (!card) return null;
  return (
    <div style={{
      margin:'14px 0', padding:'14px 18px',
      background:'rgba(167,204,228,.20)',
      border:'1.4px solid rgba(55,121,168,.5)',
      borderRadius:8
    }} onClick={() => setFlipped(!flipped)}>
      <div className="cm-faint t-12 uppercase" style={{marginBottom:6, color:'#2a4a6a', letterSpacing:'.1em'}}>
        ❒ 闪卡 · 点击翻面
      </div>
      {!flipped ? (
        <div className="hand bold" style={{fontSize:17, lineHeight:1.5, color:'#2b2418', whiteSpace:'pre-wrap'}}>
          {card.front}
        </div>
      ) : (
        <>
          <div style={{padding:'10px 14px', background:'#fff5cc',
            borderRadius:6, fontSize:15, lineHeight:1.6, whiteSpace:'pre-wrap'}}>
            {card.back}
          </div>
          {card.intuition && (
            <div style={{marginTop:8, padding:'8px 12px',
              background:'rgba(244,213,110,.4)', borderRadius:6,
              fontSize:13, lineHeight:1.55, whiteSpace:'pre-wrap'}}>
              ✦ {card.intuition}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// ChapterOverview (概览 tab)
// ============================================================
function ChapterOverview({ data, chId, ch, accent, onPickTab }){
  const [prog] = useProgress(chId);
  const stats = chapterStats(prog, data);
  const ov = data.overview || {};
  const wrapRef = useRefC(null);
  useEffectC(() => {
    const tryR = (n=10) => {
      if (window.renderMathInElement) renderMathIn(wrapRef.current);
      else if (n>0) setTimeout(() => tryR(n-1), 100);
    };
    tryR();
  }, [data, chId]);

  return (
    <div className="ov-wrap" ref={wrapRef}>
      <div className="ov-header" style={{borderBottomColor:accent}}>
        <div className="ov-no" style={{color:accent}}>第 {ch.no} 章</div>
        <h1 className="ov-title">{ch.title}</h1>
        <div className="ov-sub">{ch.sub}</div>
      </div>

      {/* 大进度 */}
      <div className="ov-stats-grid">
        <div className="ov-stat-card" onClick={() => onPickTab('cards')} style={{cursor:'pointer'}}>
          <div className="ov-stat-num">{stats.cardsSeen} <span className="ov-stat-tot">/ {stats.cardsTotal}</span></div>
          <div className="ov-stat-label">闪卡 已见</div>
          <div className="ov-stat-bar"><div style={{width: stats.cards+'%', background:accent}}/></div>
          <div className="ov-stat-mini">已掌握 {stats.cardsMastered}</div>
        </div>
        <div className="ov-stat-card" onClick={() => onPickTab('quiz')} style={{cursor:'pointer'}}>
          <div className="ov-stat-num">{stats.quizAnswered} <span className="ov-stat-tot">/ {stats.quizTotal}</span></div>
          <div className="ov-stat-label">测验 已答</div>
          <div className="ov-stat-bar"><div style={{width: stats.quiz+'%', background:accent}}/></div>
          <div className="ov-stat-mini">答对 {stats.quizCorrect}</div>
        </div>
        <div className="ov-stat-card" onClick={() => onPickTab('mistakes')} style={{cursor:'pointer'}}>
          <div className="ov-stat-num" style={{color: stats.mistakesOpen ? '#cf6f6c' : '#5a9550'}}>
            {stats.mistakesOpen}
          </div>
          <div className="ov-stat-label">易错 · 未消化</div>
          <div className="ov-stat-mini">已消化 {stats.mistakesResolved} / 总 {stats.mistakesTotal}</div>
        </div>
      </div>

      {/* 一句话 + why */}
      {ov.one_liner && (
        <div className="ov-block">
          <div className="ov-block-label">一句话</div>
          <div className="ov-one-liner">{ov.one_liner}</div>
        </div>
      )}
      {ov.why && (
        <div className="ov-block">
          <div className="ov-block-label">为什么要学</div>
          <div className="ov-why">{ov.why}</div>
        </div>
      )}
      {ov.prereq?.length > 0 && (
        <div className="ov-block">
          <div className="ov-block-label">前置知识</div>
          <ul className="ov-list">{ov.prereq.map((x,i) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}
      {ov.big_ideas?.length > 0 && (
        <div className="ov-block">
          <div className="ov-block-label">本章核心思想</div>
          <ol className="ov-list">{ov.big_ideas.map((x,i) => <li key={i}>{x}</li>)}</ol>
        </div>
      )}

      {/* 推荐学习路径 */}
      <div className="ov-block">
        <div className="ov-block-label">建议学习顺序</div>
        <div className="ov-path">
          {[
            ['mindmap', '1. 看导图', '建立全局结构'],
            ['articles', '2. 读引入文章', '建立动机直觉'],
            ['lessons', '3. 跟课程', '逐节学透 worked example'],
            ['cards', '4. 刷闪卡', '强化检索'],
            ['quiz', '5. 做测验', '验证理解'],
            ['mistakes', '6. 整理反思', '消化错点'],
          ].map(([key, label, sub]) => (
            <div key={key} className="ov-path-step" onClick={() => onPickTab(key)}>
              <div className="ov-path-label">{label}</div>
              <div className="ov-path-sub">{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 暴露
window.normalizeQuiz = normalizeQuiz;
window.normalizeCard = normalizeCard;
window.useProgress = useProgress;
window.chapterStats = chapterStats;
window.FullscreenFlashcards = FullscreenFlashcards;
window.FullscreenQuiz = FullscreenQuiz;
window.FullscreenMistakes = FullscreenMistakes;
window.FullscreenArticles = FullscreenArticles;
window.ChapterOverview = ChapterOverview;

// 旧 alias(避免老代码引用炸)
window.FlashcardQuizBox = FullscreenFlashcards;
window.ArticlePane = FullscreenArticles;
window.ReflectionsBox = FullscreenMistakes;
