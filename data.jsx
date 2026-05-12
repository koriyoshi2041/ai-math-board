// data.jsx — 7 章人工智能数学基础内容装配
// 内容由 chapters/ch{N}_*.js 提供 (window.CONTENT_CH1..CH7),
// 由独立后台 agent 产出。本文件只负责: (a) 章节列表 (b) 装配 (c) fallback。

const CHAPTERS = [
  { id:'ch0', no:'00', title:'数学基础',       sub:'高数 · 线代 · 概率 · 复数 · 不等式',
    color:'sticky-mint',   accent:'#7a9c66', pin:'pin-green' },
  { id:'ch1', no:'01', title:'绪论',           sub:'建模 · 卷积 · 相位相关性',
    color:'sticky-yellow', accent:'#e6c14b', pin:'pin' },
  { id:'ch2', no:'02', title:'方程求解与矩阵', sub:'范数 · 子空间 · AX=b',
    color:'sticky-pink',   accent:'#cf6f6c', pin:'pin-blue' },
  { id:'ch3', no:'03', title:'矩阵的稀疏表达', sub:'SVD · PCA · L1/L0 · OMP',
    color:'sticky-mint',   accent:'#5a9550', pin:'pin-green' },
  { id:'ch4', no:'04', title:'不确定度量与熵', sub:'熵 · KL · 交叉熵 · 互信息',
    color:'sticky-orange', accent:'#b07530', pin:'pin' },
  { id:'ch5', no:'05', title:'贝叶斯与检测',   sub:'MLE · MAP · 朴素贝叶斯',
    color:'sticky-blue',   accent:'#3779a8', pin:'pin-yellow' },
  { id:'ch6', no:'06', title:'凸优化',         sub:'凸集/函数 · KKT · 对偶 · GD/Newton',
    color:'sticky-yellow', accent:'#a08030', pin:'pin' },
  { id:'ch7', no:'07', title:'非凸 & 启发式',  sub:'SGD · 模拟退火 · 遗传 · PSO',
    color:'sticky-pink',   accent:'#8c5d72', pin:'pin-blue' },
];

// fallback stub —— agent 还没跑完时,该章用这个占位,页面不会崩
function makeStub(ch){
  const center = ch.title;
  const kids = ['核心概念 1','核心概念 2','核心概念 3','核心概念 4','核心概念 5'];
  return {
    overview: {
      one_liner: `${ch.title} —— 内容生成中`,
      why: `这一章的内容正在由后台 agent 产出。请稍候,或先查看其他已就绪的章节。`,
      prereq: ['(等待生成)'],
      big_ideas: ['(等待生成)']
    },
    mindmap: {
      center: { id:'c', label:center, x:300, y:215 },
      nodes: kids.map((label, i) => {
        const angle = (i / kids.length) * Math.PI * 2 - Math.PI/2;
        return {
          id:'n'+i, label,
          x: 300 + Math.cos(angle) * 190,
          y: 215 + Math.sin(angle) * 145,
          motivation: `「${label}」的内容正在生成,稍后回来查看。`
        };
      })
    },
    articles: {
      intro: {
        title: '内容生成中',
        kicker: 'PENDING · STUB',
        body: [
          ['p', `「${ch.title}」一章的完整内容(50-60 张闪卡 / 50-60 道测验 / 5+ 篇文章 / 完整课程)正在由后台 agent 产出。`],
          ['callout', '请稍候 1-3 分钟后刷新页面;或先切换到其他已就绪章节。'],
          ['p', '产出按认知科学约束:动机 → 直觉 → 类比 → 应用 → 真实例题 → 反思,完整覆盖原始 markdown 不遗漏。']
        ]
      },
      deep: [],
      methods: null,
      recap: null
    },
    flashcards: [
      { front:'内容生成中…', back:'稍后回来再看。', intuition:'后台 agent 正在按 50-60 张完整覆盖产出。', tag:'pending' }
    ],
    quiz: [
      { q:'内容生成中…',
        choices:['等待 agent 完成','再等一会儿','刷新一下页面','先看其他章节'],
        answer:3, intuition:'后台 agent 仍在工作。可以先去其他章节学习。' }
    ],
    course: [
      { kind:'cover', title: ch.title, sub:'内容生成中', tagline:'pending · 后台产出中' }
    ],
    reflections: {
      mistakes: [{ tag:'反思', text:'本章内容仍在产出,请稍候。' }],
      summary: ['内容生成完成后会自动出现在这里。']
    },
    dashboard: { cards:{due:0,learned:0,mastery:0,streak:0}, reflect:{open:0,resolved:0,lastReview:'未开始'} }
  };
}

// 装配 CONTENT —— 从 window.CONTENT_CH0..CH7 拉取,缺失则用 stub
const CONTENT = {};
[0,1,2,3,4,5,6,7].forEach(n => {
  const id = 'ch' + n;
  const ch = CHAPTERS.find(c => c.id === id);
  const data = window['CONTENT_CH' + n];
  CONTENT[id] = data || makeStub(ch);
});

// 暴露给 app.jsx
window.CHAPTERS = CHAPTERS;
window.CONTENT  = CONTENT;
// 默认开第 3 章(稀疏表达,期末高频考点);若不存在则首张
window.DEFAULT_CHAPTER = CONTENT.ch3 && !CONTENT.ch3.articles?.intro?.kicker?.includes('PENDING')
  ? 'ch3'
  : CHAPTERS[0].id;
