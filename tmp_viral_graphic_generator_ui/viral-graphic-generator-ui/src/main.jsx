import React from 'react';
import { createRoot } from 'react-dom/client';
import { ImagePlus, Sparkles, Folder, Gem, HelpCircle, Crown, ChevronRight, Zap, Trash2, Settings2, X, Palette, LayoutGrid } from 'lucide-react';
import './styles.css';

const contentTypes = ['小红书封面', '知识卡片', '金句海报', '步骤教程图', '产品卖点图', '对比分析图', '日签语录', '开箱测评'];
const visualStyles = ['清新', '可爱', '极简', '大图', '手绘笔记', '复古', 'Notion 风', '深色风'];
const layouts = ['封面', '图文', '竖版', '列表', '对比', '流程', '时间轴', '左右结构'];
const colors = ['自动配色', '马卡龙', '暖色', '莫兰迪', '蓝绿色', '渐变', '高级灰', '自定义'];
const templates = [
  ['那时的梦，如今成了谁的衣裳', '怀旧情感类长图模板，适合成长、回忆、人生感悟类主题'],
  ['暗恋与错过 深夜的秘密与遗憾', '情感故事类模板，适合情感、故事、治愈类主题'],
  ['武汉漫步半日路线', '适合周末出行｜小红书用户专属'],
  ['3个提升效率的习惯', '干货分类类模板，适合职场、学习、成长类主题'],
  ['NO! 慎重选择 / YES! 推荐选择', '设计配色类模板，适合设计、审美提升类主题']
];

function App() {
  return <div className="app">
    <Header />
    <main className="shell">
      <section className="workspace">
        <div className="hero-card">
          <div className="stepper">
            {['选择主题或输入内容', 'AI 智能生成', '编辑与导出'].map((t, i) => <React.Fragment key={t}>
              <div className="step"><span>{i + 1}</span><div><b>{t}</b><p>{i === 0 ? '告诉 AI 你想创作什么内容' : i === 1 ? 'AI 为你生成图文内容' : '调整样式并导出成品'}</p></div></div>
              {i < 2 && <div className="line"><ChevronRight size={22}/></div>}
            </React.Fragment>)}
          </div>
          <label>请输入主题或描述你想要的内容</label>
          <div className="prompt-box">
            <textarea defaultValue="给新手做一份 AI 绘画入门指南，图文结合，适合小红书风格..." />
            <button><Sparkles size={16}/> 智能扩写</button><span>0 / 500</span>
          </div>
          <OptionGroup title="内容类型" items={contentTypes} icon="doc" />
          <OptionGroup title="视觉风格" items={visualStyles} />
          <OptionGroup title="布局方式" items={layouts} />
          <ColorGroup />
          <div className="select-row">
            <Field label="模型" value="Nano Banana Pro" />
            <Field label="画幅" value="1:1（正方形）" />
            <Field label="清晰度" value="2K 高清" />
          </div>
          <button className="audience">＋ 目标受众（可选）</button>
          <div className="tip"><Sparkles size={15}/><div><b>智能推荐</b><p>根据您的内容智能推荐合适的布局、风格和配色方案，让内容更容易被目标人群喜欢。</p></div></div>
          <div className="footer-bar"><span>预计消耗：<b>2 积分</b></span><span>当前积分：<b>63 积分</b></span><div className="spacer"/><button className="ghost"><Trash2 size={16}/> 清空内容</button><button><Settings2 size={16}/> 应用设置</button><button className="primary"><Sparkles size={16}/> 生成图文</button></div>
        </div>
      </section>
      <Aside />
    </main>
  </div>
}

function Header(){return <header><div className="brand"><ImagePlus/><b>爆款图文生成工具</b></div><nav><a className="active"><Sparkles size={16}/>创作</a><a><Folder size={16}/>我的作品</a><a><Gem size={16}/>灵感库</a><a><HelpCircle size={16}/>帮助中心</a></nav><div className="actions"><button className="member"><Crown size={15}/>会员中心</button><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face"/></div></header>}
function OptionGroup({title, items}){return <div className="group"><h3>{title}</h3><div className="grid-options">{items.map((item,i)=><button className={i===0?'selected':''} key={item}><span className="mini-icon"><LayoutGrid size={18}/></span>{item}</button>)}</div></div>}
function ColorGroup(){return <div className="group"><h3>配色方案</h3><div className="grid-options color-options">{colors.map((c,i)=><button className={i===0?'selected':''} key={c}><span className={'dot d'+i}></span>{c}</button>)}</div></div>}
function Field({label,value}){return <div className="field"><label>{label}</label><select defaultValue={value}><option>{value}</option></select></div>}
function Aside(){return <aside><div className="aside-head"><h2>爆款模板</h2><a>更多模板 ›</a></div>{templates.map((t,i)=><div className="template" key={t[0]}><div className={'thumb thumb'+i}>{i===2 ? '武汉漫步半日路线' : i===4 ? 'NO! YES!' : ''}</div><div><h4>{t[0]}</h4><p>{t[1]}</p><button>使用模板</button></div></div>)}<div className="custom"><div><Palette/><b>自定义尺寸</b><X size={15}/></div><p>自定义画布尺寸，满足个性创作需求</p><button>设置自定义尺寸</button></div></aside>}

createRoot(document.getElementById('root')).render(<App />);
