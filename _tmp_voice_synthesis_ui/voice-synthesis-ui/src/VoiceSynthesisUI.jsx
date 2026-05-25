import React from 'react';
import { Upload, FolderOpen, Wand2, Star, HelpCircle, ShieldCheck, Mic2, Volume2, Play, ChevronDown, Trash2, Clipboard, SmilePlus } from 'lucide-react';

const voices = [
  ['自然女声', '温柔自然，适合多种场景', true],
  ['温暖男声', '成熟稳重，磁性有力', false],
  ['活力女声', '活泼明亮，富有感染力', false],
  ['沉稳男声', '低沉稳重，适合解说', false],
];

function NavItem({ children, active, icon }) {
  return <button className={`nav-item ${active ? 'active' : ''}`}>{icon}{children}</button>;
}

function SelectRow({ label, value }) {
  return <div className="select-row"><span>{label}</span><button>{value}<ChevronDown size={16}/></button></div>;
}

function Slider({ label, value, width='55%' }) {
  return <div className="slider-block"><div className="slider-label"><span>{label}</span><HelpCircle size={15}/></div><div className="slider-line"><i style={{width}}/><b style={{left: width}}/></div><strong>{value}</strong></div>;
}

export default function VoiceSynthesisUI() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-icon"><Volume2 size={24}/></div><strong>数字人平台</strong></div>
        <nav className="nav"><NavItem active>主页</NavItem><NavItem>最近生成</NavItem><NavItem icon={<Star size={15} fill="currentColor"/>}>收藏</NavItem></nav>
        <div className="actions"><button className="ghost">登录</button><button className="primary small">注册</button></div>
      </header>

      <section className="workspace">
        <div className="hero-title"><div className="mask">🎭</div><h1>语音<span>合成</span></h1><p>上传目标音色并输入文本，一键生成高质量语音</p></div>

        <div className="layout">
          <section className="main-col">
            <div className="panel upload-panel">
              <div className="step"><b>1</b><h2>选择目标音色 <HelpCircle size={16}/></h2></div>
              <div className="upload-grid">
                <div className="dropzone"><Mic2 size={46}/><h3>点击或拖拽音频文件到此处上传</h3><p>支持 mp3、m4a、wav 格式，文件时长 10s-5min</p><button><FolderOpen size={16}/> 浏览本地文件</button></div>
                <div className="requirements"><h3>音色要求</h3><p>✓ 人声清晰，无杂音</p><p>✓ 时长建议 10s-5min</p><p>✓ 语速适中，情感自然</p><p>✓ 背景安静，音质清晰</p><small>上传后将用于模型训练，生成更相似的语音效果。</small></div>
              </div>
            </div>

            <div className="panel text-panel">
              <div className="step"><b>2</b><h2>输入文本 <HelpCircle size={16}/></h2></div>
              <textarea placeholder="请输入或粘贴需要合成的文本..." maxLength={2000}></textarea>
              <div className="text-tools"><button><Trash2 size={15}/>清空文本</button><button><Clipboard size={15}/>粘贴文本</button><button><SmilePlus size={15}/>插入停顿</button><span>0 / 2000</span></div>
            </div>

            <div className="panel settings-panel">
              <div className="step"><b>3</b><h2>生成设置</h2></div>
              <div className="sliders"><Slider label="语速" value="1.00x"/><Slider label="音量" value="1.0" width="62%"/><Slider label="音调" value="0" width="50%"/></div>
            </div>

            <div className="bottom-bar"><span>目标音色支持格式：mp3、m4a、wav</span><i/> <span>建议时长：10 秒到 5 分钟</span><button className="primary"><Wand2 size={18}/>生成语音</button></div>
          </section>

          <aside className="side-col">
            <div className="panel voice-card"><div className="side-head"><h2>预设音色 <HelpCircle size={16}/></h2><a>更多音色</a></div>{voices.map(([name, desc, active]) => <div className={`voice ${active?'selected':''}`} key={name}><div className="avatar"><Mic2 size={18}/></div><div><strong>{name}</strong><p>{desc}</p></div><button><Play size={16}/></button></div>)}</div>
            <div className="panel advanced"><div className="side-head"><h2>高级设置</h2><ChevronDown size={16}/></div><SelectRow label="采样率" value="44.1kHz"/><SelectRow label="比特率" value="192kbps"/><SelectRow label="输出格式" value="MP3"/></div>
            <div className="panel safe"><ShieldCheck size={22}/><div><strong>隐私与安全</strong><p>您的音色数据仅用于生成语音，不会被保存或用于其他用途。</p></div></div>
          </aside>
        </div>
      </section>
    </main>
  );
}
