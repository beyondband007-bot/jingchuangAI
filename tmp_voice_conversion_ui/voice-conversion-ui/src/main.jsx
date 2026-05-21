import React from 'react';
import { createRoot } from 'react-dom/client';
import { Mic2, Upload, Play, Wand2, Crown, History, Star, Settings, ShieldCheck, SlidersHorizontal, FileAudio, Sparkles } from 'lucide-react';
import './styles.css';

const presets = [
  { name: '清澈女声', desc: '明亮自然，适合旁白与短视频', active: true },
  { name: '磁性男声', desc: '低沉稳定，适合解说与课程' },
  { name: '少年音色', desc: '清爽活泼，适合角色配音' },
  { name: '主播音色', desc: '标准咬字，适合直播与口播' }
];

function UploadBox({ icon: Icon, title, note }) {
  return (
    <div className="uploadBox">
      <div className="uploadGlow" />
      <Icon size={34} />
      <strong>{title}</strong>
      <span>{note}</span>
      <button className="ghostBtn"><Upload size={16} /> 选择文件</button>
    </div>
  );
}

function Slider({ label, value }) {
  return (
    <div className="sliderItem">
      <div className="sliderTop"><span>{label}</span><b>{value}</b></div>
      <div className="track"><i style={{ width: value === '0' ? '52%' : value === '1.0' ? '68%' : '34%' }} /></div>
    </div>
  );
}

function App() {
  return (
    <main className="page">
      <div className="bgOrb orbA" />
      <div className="bgOrb orbB" />
      <header className="nav">
        <div className="brand"><span className="logo"><Mic2 size={22}/></span><b>数字人平台</b></div>
        <nav>
          <a className="active">首页</a><a><History size={15}/> 最近生成</a><a><Star size={15}/> 收藏</a>
        </nav>
        <div className="actions"><button className="pill dark">登录</button><button className="pill primary">注册</button></div>
      </header>

      <section className="hero">
        <div className="heroIcon"><Mic2 size={36}/></div>
        <h1>音色<span>转换</span></h1>
        <p>上传目标音色和源音频，自动提取演唱/说话内容并转换成目标声音</p>
      </section>

      <section className="shell">
        <div className="workspace">
          <div className="cardTitle"><Wand2 size={18}/> 音色转换工作台</div>
          <div className="uploadGrid">
            <UploadBox icon={Mic2} title="目标音色" note="参考音频 10s–5min，mp3 / wav / m4a" />
            <UploadBox icon={FileAudio} title="源音频" note="待转换音频 6s–6min，支持人声与歌曲" />
          </div>

          <div className="sectionBlock">
            <label><span className="num">1</span> 转换说明</label>
            <textarea placeholder="可填写音色特征、转换目标或保留要求，例如：保留原节奏，声音更清亮自然..." />
          </div>

          <div className="controlPanel">
            <Slider label="语速" value="1.00x" />
            <Slider label="音量" value="1.0" />
            <Slider label="音调" value="0" />
          </div>

          <div className="bottomBar">
            <span>目标音色支持 mp3、m4a、wav；源音频支持 mp3、wav、flac、webm</span>
            <button className="generate"><Play size={18}/> 开始转换</button>
          </div>
        </div>

        <aside className="sidebar">
          <div className="sideCard">
            <div className="sideHead"><b>预设音色</b><a>更多音色</a></div>
            {presets.map((p) => <div className={`preset ${p.active ? 'active' : ''}`} key={p.name}><div className="avatar"><Mic2 size={18}/></div><div><b>{p.name}</b><span>{p.desc}</span></div><button><Play size={14}/></button></div>)}
          </div>
          <div className="sideCard">
            <div className="sideHead"><b><SlidersHorizontal size={16}/> 高级设置</b></div>
            {['转换模型：Voice Clone Pro','降噪强度：中等','保留情绪：开启','输出格式：MP3'].map((item)=><div className="select" key={item}>{item}<span>⌄</span></div>)}
          </div>
          <div className="privacy"><ShieldCheck size={20}/><div><b>隐私与安全</b><p>上传音频仅用于本次转换处理，不会公开展示。</p></div></div>
        </aside>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
