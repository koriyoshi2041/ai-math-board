// components-course.jsx — Khan 风长文课程(取代 slide deck)

const { useState: useStateS, useEffect: useEffectS, useMemo: useMemoS, useRef: useRefS } = React;

// === ErrorBoundary: 任何 section 渲染崩溃都被截住,不会拖垮整页 ===
class SectionErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error){ return { error }; }
  componentDidCatch(error, info){
    console.error('[LessonSection 渲染失败]', error, '\n位置:', info?.componentStack || '(unknown)');
  }
  render(){
    if (this.state.error) {
      return (
        <div style={{
          padding:'10px 14px', margin:'8px 0',
          background:'rgba(207,111,108,.08)', border:'1.4px dashed #cf6f6c',
          borderRadius:6, fontSize:13, color:'#8a3a37', whiteSpace:'pre-wrap'
        }}>
          ⚠️ 此段渲染出错(已跳过,不影响其他内容)。
          {' '}<span style={{opacity:.6}}>{String(this.state.error?.message||this.state.error)}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------- 把现有数据适配成"lessons[]" ----------
// 优先级:
//  (a) chapter.lessons 非空 → 直接用
//  (b) chapter.course 非空 → 用 course slides 包装
//  (c) 都空 → 从 articles + flashcards + quiz 合成兜底 lessons (例如 ch4 lessons 为空时)
function buildLessons(chapter){
  if (!chapter) return [];
  if (Array.isArray(chapter.lessons) && chapter.lessons.length) return chapter.lessons;
  const slides = chapter.course || [];
  const cards = chapter.flashcards || [];
  const quizzes = (chapter.quiz || []).map(normalizeQuizC).filter(Boolean);

  // -------- 兜底 (c): 从 articles 合成 --------
  if (!slides.length && chapter.articles) {
    const arts = chapter.articles;
    const lessonsFromArticles = [];
    if (chapter.overview) {
      lessonsFromArticles.push({
        id:'L0', title:'本章导论 · 它在解决什么问题', sub: chapter.overview.one_liner || '',
        sections: [
          { kind:'intro', title:'为什么这章重要', body:[
            chapter.overview.why ? ['p', chapter.overview.why] : null,
            chapter.overview.big_ideas?.length ? ['h3','核心思想'] : null,
            chapter.overview.big_ideas?.length ? ['ul', chapter.overview.big_ideas] : null,
            chapter.overview.prereq?.length ? ['h3','前置'] : null,
            chapter.overview.prereq?.length ? ['ul', chapter.overview.prereq] : null,
          ].filter(Boolean) }
        ]
      });
    }
    const addArtLesson = (art, idx, kind, label) => {
      if (!art) return;
      const sections = [
        { kind, title: art.title, body: art.body || [] }
      ];
      // 每篇穿插 2-3 张闪卡 + 1-2 道 quiz 做 retrieval
      const c1 = cards[(idx*3) % Math.max(1,cards.length)];
      const c2 = cards[(idx*3+1) % Math.max(1,cards.length)];
      const q1 = quizzes[(idx*2) % Math.max(1,quizzes.length)];
      if (c1) sections.push({kind:'flashcard', card:c1});
      if (q1) sections.push({kind:'mini_quiz', quiz:q1});
      if (c2) sections.push({kind:'flashcard', card:c2});
      lessonsFromArticles.push({
        id:'L'+(lessonsFromArticles.length),
        title: label + ' · ' + (art.title || ''),
        sections
      });
    };
    if (arts.intro) addArtLesson(arts.intro, 0, 'intro', '引入');
    (arts.deep || []).forEach((a, i) => addArtLesson(a, i+1, 'concept', `深入 ${i+1}`));
    if (arts.methods) addArtLesson(arts.methods, 100, 'worked_example', '解题方法');
    if (arts.recap) {
      lessonsFromArticles.push({
        id:'L'+lessonsFromArticles.length,
        title:'本章回顾 · ' + (arts.recap.title || ''),
        sections: [{ kind:'recap', title:'关键收束', body: arts.recap.body || [] }]
      });
    }
    if (lessonsFromArticles.length) return lessonsFromArticles;
  }

  // -------- (b) course 风路径 --------
  let coverIdx = slides.findIndex(s => s.kind === 'cover');
  let recapIdx = slides.findIndex(s => s.kind === 'recap');
  if (coverIdx < 0) coverIdx = -1;
  if (recapIdx < 0) recapIdx = slides.length;
  const middle = slides.slice(coverIdx+1, recapIdx);

  const lessons = [];

  if (slides[coverIdx]) {
    lessons.push({
      id: 'L0',
      title: slides[coverIdx].title || '本章导论',
      sub: slides[coverIdx].sub || '',
      tagline: slides[coverIdx].tagline || '',
      sections: [
        { kind:'intro',
          title: '本章是关于什么',
          body: [
            ['p', slides[coverIdx].sub || '本章的中心问题与学习目标。'],
            chapter.overview?.why ? ['quote', chapter.overview.why] : null,
            chapter.overview?.big_ideas?.length ? ['h3', '本章核心思想'] : null,
            chapter.overview?.big_ideas?.length ? ['ul', chapter.overview.big_ideas] : null,
            chapter.overview?.prereq?.length ? ['h3', '前置知识'] : null,
            chapter.overview?.prereq?.length ? ['ul', chapter.overview.prereq] : null,
          ].filter(Boolean)
        }
      ]
    });
  }

  middle.forEach((s, i) => {
    const sections = [];
    sections.push({
      kind: 'concept',
      title: s.title,
      body: [
        s.intuition ? ['quote', s.intuition] : null,
        ['h3', '要点'],
        ['ul', s.bullets || []],
        s.formula ? ['formula', s.formula] : null,
      ].filter(Boolean)
    });
    const card = cards[i % Math.max(1, cards.length)];
    if (card) sections.push({ kind:'flashcard', card });
    const qz = quizzes[i % Math.max(1, quizzes.length)];
    if (qz) sections.push({ kind:'mini_quiz', quiz: qz });
    lessons.push({ id:'L'+(i+1), title: s.title, sections });
  });

  if (slides[recapIdx]) {
    lessons.push({
      id: 'L'+lessons.length,
      title: slides[recapIdx].title || '本章回顾',
      sections: [
        { kind:'recap',
          title:'关键收束',
          body:[
            ['ul', slides[recapIdx].bullets || []]
          ]
        }
      ]
    });
  }

  return lessons;
}

// ---------- LessonReader ----------
function LessonReader({ chapter, accent='#3779a8', track }){
  const lessons = useMemoS(() => buildLessons(chapter), [chapter]);
  const [idx, setIdx] = useStateS(0);
  const safeIdx = Math.min(idx, Math.max(0, lessons.length - 1));
  const lesson = lessons[safeIdx];

  const scrollRef = useRefS(null);
  useEffectS(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [safeIdx, chapter]);
  useEffectS(() => { setIdx(0); }, [chapter]);
  // KaTeX 渲染
  useEffectS(() => {
    const tryR = (n=10) => {
      if (window.renderMathInElement && window.renderMathIn) window.renderMathIn(scrollRef.current);
      else if (n>0) setTimeout(() => tryR(n-1), 100);
    };
    tryR();
  }, [safeIdx, chapter]);

  if (!lessons.length) {
    return <div className="cm-faint" style={{padding:60, textAlign:'center'}}>(本章暂无课程)</div>;
  }

  // 估算总 progress
  const pctRead = ((safeIdx+1) / lessons.length) * 100;

  return (
    <div className="lesson-wrap">
      {/* 左 TOC */}
      <div className="lesson-toc">
        <div className="cm-sidebar-title">课程目录</div>
        <div className="lesson-toc-meta">
          {lessons.length} 节 · {pctRead.toFixed(0)}% 已读
        </div>
        <div className="lesson-toc-bar">
          <div style={{width: pctRead+'%', background: accent}}/>
        </div>
        <div className="col" style={{gap:2, marginTop:10}}>
          {lessons.map((l, i) => {
            const isActive = i === safeIdx;
            const done = i < safeIdx;
            return (
              <div key={l.id}
                   className={"lesson-toc-item " + (isActive ? 'active' : (done ? 'done' : ''))}
                   onClick={() => setIdx(i)}
                   style={{borderLeftColor: isActive ? accent : 'transparent'}}>
                <span className="lesson-toc-no" style={{color: isActive ? accent : 'rgba(0,0,0,.4)'}}>
                  {done ? '✓' : String(i).padStart(2,'0')}
                </span>
                <span className="lesson-toc-title">{l.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 主体 */}
      <div className="lesson-main" ref={scrollRef}>
        {/* 顶栏 */}
        <div className="lesson-header">
          <div className="row" style={{alignItems:'baseline', justifyContent:'space-between'}}>
            <div className="lesson-header-no" style={{color:accent}}>
              第 {safeIdx} / {lessons.length-1} 课
            </div>
            <div className="row gap-8">
              <button className="cm-btn"
                onClick={() => setIdx(Math.max(0, safeIdx-1))}
                disabled={safeIdx===0}>← 上一课</button>
              <button className="cm-btn primary"
                style={{borderColor:accent, background: accent, color:'#fff'}}
                onClick={() => {
                  if (track) track('lesson_done_'+chapter?.overview?.one_liner+'_'+safeIdx);
                  setIdx(Math.min(lessons.length-1, safeIdx+1));
                }}
                disabled={safeIdx===lessons.length-1}>下一课 →</button>
            </div>
          </div>
          <h1 className="lesson-title" style={{borderBottomColor:accent}}>{lesson.title}</h1>
          {lesson.sub && <div className="lesson-sub">{lesson.sub}</div>}
          {lesson.tagline && <div className="lesson-tagline">{lesson.tagline}</div>}
          {lesson.kicker && <div className="cm-faint t-12" style={{marginTop:6}}>{lesson.kicker}{lesson.est_min ? ' · 预计 '+lesson.est_min+' 分钟' : ''}</div>}
          {lesson.goal && (
            <div className="lesson-callout" style={{borderColor:accent, marginTop:14}}>
              <strong>本节目标:</strong> {lesson.goal}
            </div>
          )}
          {lesson.pretest?.length > 0 && (
            <div style={{
              marginTop:14, padding:'12px 16px',
              background:'rgba(244,213,110,.25)',
              border:'1.4px solid rgba(244,213,110,.7)',
              borderRadius:8
            }}>
              <div className="cm-faint t-12 uppercase" style={{marginBottom:6, color:'#7a5a14'}}>
                ☐ 先猜一下(pretest)
              </div>
              <ul style={{margin:0, paddingLeft:'1.4em', fontSize:14, lineHeight:1.65}}>
                {lesson.pretest.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* sections — 每个 section 包在 ErrorBoundary 里, 一个段崩了不影响其他 */}
        <div className="lesson-sections">
          {(lesson.sections || []).map((sec, i) => (
            <SectionErrorBoundary key={safeIdx + ':' + i}>
              <LessonSection section={sec} accent={accent} chapter={chapter} track={track}/>
            </SectionErrorBoundary>
          ))}
        </div>

        {/* 底栏 */}
        <div className="lesson-footer">
          <button className="cm-btn"
            onClick={() => setIdx(Math.max(0, safeIdx-1))}
            disabled={safeIdx===0}>← 上一课</button>
          <div className="cm-faint t-12">{lesson.title}</div>
          <button className="cm-btn primary"
            style={{borderColor:accent, background: accent, color:'#fff'}}
            onClick={() => setIdx(Math.min(lessons.length-1, safeIdx+1))}
            disabled={safeIdx===lessons.length-1}>下一课 →</button>
        </div>
      </div>
    </div>
  );
}

// ---------- 各种 section 渲染 ----------
function LessonSection({ section, accent, chapter, track }){
  if (!section) return null;

  // 兼容 ch4 / ch7 风: section 直接是 body block tuple [type, payload]
  if (Array.isArray(section)) {
    return <SectionBlock blk={section} accent={accent}/>;
  }

  // 兼容 string section
  if (typeof section === 'string') {
    return <p className="lesson-p">{section}</p>;
  }

  const k = section.kind;

  if (k === 'intro' || k === 'concept' || k === 'recap' || k === 'big_picture' || k === 'application' || !k) {
    return (
      <section className="lesson-section">
        {section.title && <h2 className="lesson-section-title" style={{color:accent}}>{section.title}</h2>}
        {section.subtitle && <div className="lesson-sub" style={{marginBottom:8}}>{section.subtitle}</div>}
        {(section.body||[]).map((blk, i) => <SectionBlock key={i} blk={blk} accent={accent}/>)}
      </section>
    );
  }

  if (k === 'worked_example' || k === 'example') {
    return (
      <section className="lesson-section worked">
        <div className="lesson-tag" style={{background:accent}}>WORKED EXAMPLE</div>
        {section.title && <h2 className="lesson-section-title">{section.title}</h2>}
        {section.problem && <div className="we-problem"><strong>题:</strong> {section.problem}</div>}
        {section.key_idea && <div className="we-idea" style={{borderColor:accent}}>
          <strong>关键 idea:</strong> {section.key_idea}
        </div>}
        {section.steps && (
          <ol className="we-steps">
            {section.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        )}
        {(section.body||[]).map((blk, i) => <SectionBlock key={i} blk={blk} accent={accent}/>)}
      </section>
    );
  }

  if (k === 'mini_quiz' || k === 'quiz') {
    return <MiniQuiz quiz={section.quiz || section} accent={accent} track={track}/>;
  }

  if (k === 'flashcard' || k === 'card') {
    return <InlineFlashcard card={section.card || section} accent={accent} track={track}/>;
  }

  // 兜底:有 body 就渲染 body
  if (section.body) {
    return (
      <section className="lesson-section">
        {section.title && <h2 className="lesson-section-title" style={{color:accent}}>{section.title}</h2>}
        {section.body.map((blk, i) => <SectionBlock key={i} blk={blk} accent={accent}/>)}
      </section>
    );
  }
  return null;
}

// 自动包装 formula 内容为 display math
function wrapFormulaL(s){
  if (!s) return '';
  const str = String(s).trim();
  if (str.startsWith('$$') || str.startsWith('\\[')) return str;
  if (str.includes('$')) return str;
  return '$$' + str + '$$';
}

function SectionBlock({ blk, accent }){
  if (!blk) return null;
  const t = blk[0], v = blk[1];
  if (t === 'p') return <p className="lesson-p">{v}</p>;
  if (t === 'h2') return <h2 className="lesson-h2" style={{color:accent}}>{v}</h2>;
  if (t === 'h3') return <h3 className="lesson-h3">{v}</h3>;
  if (t === 'callout') return <div className="lesson-callout" style={{borderColor:accent}}>{v}</div>;
  if (t === 'quote') return <div className="lesson-quote">✦ {v}</div>;
  if (t === 'ul') return <ul className="lesson-ul">{(Array.isArray(v)?v:[v]).map((x,i)=><li key={i}>{x}</li>)}</ul>;
  if (t === 'ol') return <ol className="lesson-ol">{(Array.isArray(v)?v:[v]).map((x,i)=><li key={i}>{x}</li>)}</ol>;
  if (t === 'formula') return <div className="lesson-formula">{wrapFormulaL(v)}</div>;
  if (t === 'example') return <div className="lesson-example"><div className="lesson-example-label">▸ 例</div>{v}</div>;
  return <p className="lesson-p">{String(v)}</p>;
}

// 兼容 quiz 字段两套命名
function normalizeQuizC(q){
  if (!q) return null;
  const choices = q.choices || q.options || q.distractors || [];
  let answer = (typeof q.answer === 'number') ? q.answer
             : (typeof q.correct === 'number') ? q.correct
             : (typeof q.answer_idx === 'number') ? q.answer_idx
             : 0;
  return { ...q, choices, answer };
}

// ---------- 课内 mini quiz ----------
function MiniQuiz({ quiz: rawQuiz, accent, track }){
  const [picked, setPicked] = useStateS(null);
  const quiz = useMemoS(() => normalizeQuizC(rawQuiz), [rawQuiz]);
  if (!quiz || !quiz.choices?.length) return null;
  const correct = picked !== null && picked === quiz.answer;
  return (
    <section className="lesson-section mini-quiz">
      <div className="lesson-tag" style={{background:'#5a9550'}}>MINI QUIZ · 检验理解</div>
      <div className="mq-q">{quiz.q}</div>
      <div className="col gap-6" style={{marginTop:8}}>
        {quiz.choices.map((c, i) => {
          const state = picked === null ? 'idle'
                      : i === quiz.answer ? 'right'
                      : i === picked ? 'wrong' : 'dim';
          const bg = state==='right' ? '#d6ecc8'
                    : state==='wrong' ? '#f5cdc8'
                    : state==='dim' ? 'rgba(0,0,0,.04)' : '#fff';
          return (
            <button key={i} className="mq-choice"
              onClick={() => {
                if (picked === null) {
                  setPicked(i);
                  if (track) track('miniquiz_'+(i===quiz.answer?'right':'wrong'));
                }
              }}
              style={{background:bg, opacity: state==='dim'?.55:1}}>
              <span className="mq-letter">{'ABCD'[i]}</span> {c}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="mq-explain" style={{borderColor: correct ? '#5a9550' : '#cf6f6c'}}>
          <strong>{correct ? '✓ 答对了 ' : '✗ 看一下解释 '}</strong>{quiz.intuition}
        </div>
      )}
    </section>
  );
}

// ---------- 课内 inline flashcard ----------
function InlineFlashcard({ card: rawCard, accent, track }){
  const [flipped, setFlipped] = useStateS(false);
  const card = useMemoS(() => {
    if (!rawCard) return null;
    if (window.normalizeCard) return window.normalizeCard(rawCard);
    // 兼容兜底
    const front = rawCard.front || rawCard.q || rawCard.question || '';
    const back  = rawCard.back  || rawCard.a || rawCard.answer   || '';
    return front && back ? { ...rawCard, front, back } : null;
  }, [rawCard]);
  if (!card) return null;
  return (
    <section className="lesson-section inline-card">
      <div className="lesson-tag" style={{background:'#3779a8'}}>FLASHCARD · 主动检索</div>
      <div className="ic-card" onClick={() => {
        setFlipped(!flipped);
        if (!flipped && track) track('inlinecard_flip');
      }}>
        {!flipped ? (
          <>
            <div className="ic-side-label">题面 — 点击翻面</div>
            <div className="ic-front">{card.front}</div>
          </>
        ) : (
          <>
            <div className="ic-side-label">答案 — 点击翻回</div>
            <div className="ic-back">{card.back}</div>
            {card.intuition && <div className="ic-int">✦ {card.intuition}</div>}
          </>
        )}
      </div>
    </section>
  );
}

window.LessonReader = LessonReader;
window.CourseSlides = LessonReader; // alias for back-compat
