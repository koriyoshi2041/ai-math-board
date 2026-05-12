// components-decor.jsx — pizza menu, coffee stains, eraser shavings, paperclips

const { useState: useStateD, useEffect: useEffectD } = React;

// ---------- Pizza menu (acts as a quick-action / page nav) ----------
function PizzaMenu(){
  const [open, setOpen] = useStateD(false);
  const slices = [
    { label:'AI 数学', topping:'pepperoni', accent:'#cf6f6c' },
    { label:'笔记导出', topping:'mushroom', accent:'#7a5a3a' },
    { label:'每日复习', topping:'olive', accent:'#3a4a2a' },
    { label:'探索话题', topping:'pepper', accent:'#5a8a4a' },
    { label:'设置', topping:'cheese', accent:'#c9a020' },
    { label:'打印讲义', topping:'pepperoni', accent:'#cf6f6c' },
  ];

  return (
    <>
      <div className="pizza-tab" onClick={() => setOpen(!open)}
           title="菜单 (pizza menu)"
           style={{cursor:'default'}}>
        <svg viewBox="0 0 64 64" width="64" height="64">
          {/* pepperoni dots */}
          <circle cx="22" cy="22" r="4" fill="#b1382a" />
          <circle cx="44" cy="20" r="3.5" fill="#b1382a" />
          <circle cx="34" cy="40" r="4" fill="#b1382a" />
          <circle cx="46" cy="42" r="3" fill="#5a8a4a" />
          <circle cx="20" cy="44" r="3" fill="#5a8a4a" />
          {/* basil */}
          <ellipse cx="30" cy="28" rx="2.5" ry="1.4" fill="#3a6a2a" transform="rotate(30 30 28)"/>
        </svg>
        <div className="hand bold" style={{
          position:'absolute', bottom:-18, left:'50%', transform:'translateX(-50%)',
          fontSize:13, color:'#fff8d8', textShadow:'0 1px 2px rgba(0,0,0,.7)',
          whiteSpace:'nowrap'
        }}>menu</div>
      </div>

      {open && (
        <div onClick={() => setOpen(false)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:120,
          display:'flex', alignItems:'center', justifyContent:'center'
        }}>
          <div onClick={e=>e.stopPropagation()} className="pop-in" style={{
            position:'relative', width:480, height:480, borderRadius:'50%',
            background:'radial-gradient(circle at 50% 40%,#f4cf9c,#dba059 70%,#9c6a2c)',
            boxShadow:'0 30px 60px rgba(0,0,0,.6), inset 0 -8px 0 rgba(0,0,0,.18)'
          }}>
            {/* crust ring */}
            <div style={{position:'absolute', inset:14, borderRadius:'50%',
              background:'radial-gradient(circle at 50% 40%,#f7d6a4,#e6b67a)'}} />
            {/* tomato sauce */}
            <div style={{position:'absolute', inset:30, borderRadius:'50%',
              background:'radial-gradient(circle at 50% 50%,#d4513e,#a0301e)',
              opacity:.86}} />
            {/* slices */}
            {slices.map((s, i) => {
              const angle = (i / slices.length) * 360;
              const labelAng = angle + 360 / slices.length / 2;
              const rad = (labelAng - 90) * Math.PI/180;
              const lx = 240 + Math.cos(rad) * 130;
              const ly = 240 + Math.sin(rad) * 130;
              return (
                <React.Fragment key={i}>
                  <div style={{position:'absolute', left:240, top:240,
                    width:1, height:200, background:'rgba(0,0,0,.15)',
                    transformOrigin:'top left',
                    transform:`rotate(${angle}deg)`}}/>
                  <div className="hand bold" style={{
                    position:'absolute', left:lx, top:ly,
                    transform:'translate(-50%,-50%)',
                    background:'#fff8d8', padding:'5px 11px',
                    borderRadius:14, border:'1.5px solid #2b2418',
                    fontSize:14, color:'#2b2418',
                    boxShadow:'0 2px 4px rgba(0,0,0,.3)',
                    whiteSpace:'nowrap', cursor:'default'
                  }}>{s.label}</div>
                </React.Fragment>
              );
            })}
            {/* center close */}
            <div onClick={()=>setOpen(false)} style={{
              position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
              width:80, height:80, borderRadius:'50%',
              background:'#2b2418', color:'#f4cf9c',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'Caveat, cursive', fontSize:28, cursor:'default',
              boxShadow:'0 4px 10px rgba(0,0,0,.4)'
            }}>close</div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------- Random eraser shavings cluster ----------
function ShavingsCluster({ x, y, n=8 }){
  const items = [];
  for (let i = 0; i < n; i++){
    const dx = (Math.random() * 50 - 25);
    const dy = (Math.random() * 30 - 15);
    const r  = (Math.random() * 60 - 30);
    const w  = 4 + Math.random() * 6;
    items.push(
      <div key={i} className="shaving" style={{
        left:x+dx, top:y+dy, width:w, height:2,
        transform:`rotate(${r}deg)`,
        background:`rgba(255,180,140,${.5 + Math.random()*.4})`
      }}/>
    );
  }
  return <>{items}</>;
}

window.PizzaMenu = PizzaMenu;
window.ShavingsCluster = ShavingsCluster;
