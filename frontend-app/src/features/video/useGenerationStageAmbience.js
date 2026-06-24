import { useEffect, useRef } from "react";

/**
 * Canvas ambience + orbit node motion from Facemini generation-stage HTML.
 * @param {React.RefObject<HTMLElement | null>} stageRef
 * @param {React.RefObject<SVGGElement | null>[]} orbitNodeRefs
 */
export function useGenerationStageAmbience(stageRef, orbitNodeRefs) {
  const ambientRef = useRef(/** @type {HTMLCanvasElement | null} */ (null));
  const waveRef = useRef(/** @type {HTMLCanvasElement | null} */ (null));
  const rafRef = useRef(0);
  const timeRef = useRef(0);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const particlesRef = useRef([]);
  const starsRef = useRef([]);

  useEffect(() => {
    const stage = stageRef.current;
    const ambientCanvas = ambientRef.current;
    const waveCanvas = waveRef.current;
    if (!stage || !ambientCanvas || !waveCanvas) return undefined;

    const ambientCtx = ambientCanvas.getContext("2d");
    const waveCtx = waveCanvas.getContext("2d");
    if (!ambientCtx || !waveCtx) return undefined;

    function setCanvasSize(canvas, ctx) {
      const rect = stage.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      sizeRef.current = { width, height, dpr };
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function createAmbientObjects() {
      const { width, height } = sizeRef.current;
      const count = Math.max(58, Math.floor(width / 22));

      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height * 0.84,
        r: Math.random() * 2.1 + 0.35,
        alpha: Math.random() * 0.24 + 0.05,
        vx: (Math.random() - 0.5) * 0.075,
        vy: -(Math.random() * 0.075 + 0.018),
        phase: Math.random() * Math.PI * 2,
        glow: Math.random() > 0.82,
      }));

      starsRef.current = Array.from({ length: 15 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height * 0.62,
        size: Math.random() * 1.8 + 0.7,
        alpha: Math.random() * 0.36 + 0.12,
        phase: Math.random() * Math.PI * 2,
      }));
    }

    function resize() {
      setCanvasSize(ambientCanvas, ambientCtx);
      setCanvasSize(waveCanvas, waveCtx);
      createAmbientObjects();
    }

    function drawAmbient() {
      const { width, height } = sizeRef.current;
      ambientCtx.clearRect(0, 0, width, height);

      const glow = ambientCtx.createRadialGradient(
        width * 0.53,
        height * 0.39,
        10,
        width * 0.53,
        height * 0.39,
        Math.min(width, height) * 0.5,
      );
      glow.addColorStop(0, "rgba(135,116,255,0.075)");
      glow.addColorStop(0.46, "rgba(151,137,255,0.038)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ambientCtx.fillStyle = glow;
      ambientCtx.fillRect(0, 0, width, height);

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.phase += 0.012;

        if (p.y < -12) {
          p.y = height * 0.76 + Math.random() * height * 0.16;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const alpha = p.alpha * (0.74 + Math.sin(p.phase) * 0.26);
        ambientCtx.beginPath();
        ambientCtx.fillStyle = `rgba(124,104,255,${alpha})`;
        ambientCtx.shadowBlur = p.glow ? 13 : 0;
        ambientCtx.shadowColor = "rgba(121,99,255,.4)";
        ambientCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ambientCtx.fill();
      }

      ambientCtx.shadowBlur = 0;

      for (const s of starsRef.current) {
        s.phase += 0.016;
        const alpha = s.alpha * (0.48 + 0.52 * Math.sin(s.phase) ** 2);
        ambientCtx.save();
        ambientCtx.translate(s.x, s.y);
        ambientCtx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ambientCtx.lineWidth = 1;
        ambientCtx.beginPath();
        ambientCtx.moveTo(-s.size * 2.4, 0);
        ambientCtx.lineTo(s.size * 2.4, 0);
        ambientCtx.moveTo(0, -s.size * 2.4);
        ambientCtx.lineTo(0, s.size * 2.4);
        ambientCtx.stroke();
        ambientCtx.restore();
      }
    }

    function waveY(x, layer, phase) {
      const { width, height } = sizeRef.current;
      const p = x / width;
      const depth = layer / 8;
      const base = height * (0.79 + depth * 0.028);
      const longWave =
        Math.sin(p * Math.PI * (1.55 + depth * 0.46) + phase) *
        (16 + depth * 18);
      const mediumWave =
        Math.sin(p * Math.PI * (4.1 - depth * 0.58) - phase * 0.72) *
        (6 + depth * 9);
      const shortWave =
        Math.sin(p * Math.PI * 8.2 + phase * 0.34 + layer) *
        (1.5 + depth * 3);
      const edgeLift =
        Math.pow(Math.abs(p - 0.5), 1.45) * (18 + depth * 24);
      return base + longWave + mediumWave + shortWave + edgeLift;
    }

    function drawWaveLayer(layer, phase) {
      const { width, height } = sizeRef.current;
      const columns = Math.max(80, Math.floor(width / 10));
      const depth = layer / 8;
      const points = [];

      for (let i = 0; i <= columns; i += 1) {
        const x = (i / columns) * width;
        points.push({ x, y: waveY(x, layer, phase) });
      }

      const fill = waveCtx.createLinearGradient(0, height * 0.63, 0, height);
      fill.addColorStop(0, `rgba(125,104,255,${0.003 + depth * 0.008})`);
      fill.addColorStop(0.52, `rgba(130,108,255,${0.012 + depth * 0.018})`);
      fill.addColorStop(1, `rgba(137,114,255,${0.028 + depth * 0.038})`);

      waveCtx.beginPath();
      waveCtx.moveTo(points[0].x, height + 30);
      waveCtx.lineTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length; i += 1) {
        const previous = points[i - 1];
        const current = points[i];
        const controlX = (previous.x + current.x) / 2;
        waveCtx.quadraticCurveTo(
          previous.x,
          previous.y,
          controlX,
          (previous.y + current.y) / 2,
        );
      }

      const last = points[points.length - 1];
      waveCtx.lineTo(last.x, last.y);
      waveCtx.lineTo(last.x, height + 30);
      waveCtx.closePath();
      waveCtx.fillStyle = fill;
      waveCtx.fill();

      waveCtx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) waveCtx.moveTo(point.x, point.y);
        else waveCtx.lineTo(point.x, point.y);
      });
      waveCtx.strokeStyle = `rgba(132,111,255,${0.035 + depth * 0.025})`;
      waveCtx.lineWidth = 0.65 + depth * 0.35;
      waveCtx.stroke();

      for (let offset = 1; offset <= 4; offset += 1) {
        waveCtx.beginPath();
        points.forEach((point, index) => {
          const y = point.y + offset * (6 + depth * 5);
          if (index === 0) waveCtx.moveTo(point.x, y);
          else waveCtx.lineTo(point.x, y);
        });
        waveCtx.strokeStyle = `rgba(139,118,255,${0.01 + depth * 0.008})`;
        waveCtx.lineWidth = 0.55;
        waveCtx.stroke();
      }

      for (let i = 0; i < points.length; i += 2) {
        const point = points[i];
        const bottom = Math.min(height + 4, point.y + 24 + depth * 65);
        waveCtx.beginPath();
        waveCtx.moveTo(point.x, point.y);
        waveCtx.lineTo(point.x, bottom);
        waveCtx.strokeStyle = `rgba(143,121,255,${0.006 + depth * 0.01})`;
        waveCtx.lineWidth = 0.45;
        waveCtx.stroke();

        const randomSeed = Math.sin(i * 12.9898 + layer * 78.233) * 43758.5453;
        const random = randomSeed - Math.floor(randomSeed);
        const size = random > 0.94 ? 1.7 + depth : 0.55 + depth * 0.65;
        const alpha = 0.028 + depth * 0.05 + random * 0.025;

        waveCtx.beginPath();
        waveCtx.fillStyle = `rgba(150,127,255,${alpha})`;
        waveCtx.shadowBlur = random > 0.96 ? 12 : 0;
        waveCtx.shadowColor = "rgba(136,112,255,.55)";
        waveCtx.arc(point.x, point.y, size, 0, Math.PI * 2);
        waveCtx.fill();
      }

      waveCtx.shadowBlur = 0;
    }

    function drawWave() {
      const { width, height } = sizeRef.current;
      waveCtx.clearRect(0, 0, width, height);

      const floorGlow = waveCtx.createLinearGradient(0, height * 0.69, 0, height);
      floorGlow.addColorStop(0, "rgba(126,105,255,0)");
      floorGlow.addColorStop(0.58, "rgba(126,105,255,0.015)");
      floorGlow.addColorStop(1, "rgba(126,105,255,0.09)");
      waveCtx.fillStyle = floorGlow;
      waveCtx.fillRect(0, height * 0.67, width, height * 0.33);

      for (let layer = 0; layer < 7; layer += 1) {
        const depth = layer / 6;
        const speed = 0.04 + depth * 0.06;
        const direction = layer % 2 === 0 ? 1 : -1;
        const phase = timeRef.current * speed * direction + layer * 0.68;
        drawWaveLayer(layer, phase);
      }

      const count = Math.floor(width / 3.2);
      for (let i = 0; i < count; i += 1) {
        const speed = 2.1 + (i % 11) * 0.11;
        const x = (i * 19.37 + timeRef.current * speed * 10) % width;
        const normalized = (i % 103) / 103;
        const yBase = height * 0.79 + normalized * height * 0.22;
        const y = yBase + Math.sin(i * 0.73 + timeRef.current * 0.42) * 6;
        const alpha =
          Math.max(0, (y - height * 0.76) / (height * 0.24)) * 0.12;
        const size = i % 23 === 0 ? 1.45 : i % 9 === 0 ? 0.9 : 0.45;

        waveCtx.beginPath();
        waveCtx.fillStyle = `rgba(154,131,255,${alpha})`;
        waveCtx.shadowBlur = i % 23 === 0 ? 14 : 0;
        waveCtx.shadowColor = "rgba(139,115,255,.7)";
        waveCtx.arc(x, y, size, 0, Math.PI * 2);
        waveCtx.fill();
      }

      waveCtx.shadowBlur = 0;
    }

    function updateOrbitNodes() {
      const nodes = [
        { el: orbitNodeRefs[0]?.current, rx: 405, ry: 125, angle: timeRef.current * 0.33 + 0.5 },
        { el: orbitNodeRefs[1]?.current, rx: 395, ry: 92, angle: -timeRef.current * 0.24 + 2.8 },
        { el: orbitNodeRefs[2]?.current, rx: 330, ry: 142, angle: timeRef.current * 0.19 + 4.2 },
        { el: orbitNodeRefs[3]?.current, rx: 405, ry: 125, angle: -timeRef.current * 0.16 + 5.3 },
      ];

      nodes.forEach((node) => {
        if (!node.el) return;
        const x = 470 + Math.cos(node.angle) * node.rx;
        const y = 175 + Math.sin(node.angle) * node.ry;
        node.el.setAttribute("transform", `translate(${x} ${y})`);
      });
    }

    function animate() {
      timeRef.current += 0.016;
      drawAmbient();
      drawWave();
      updateOrbitNodes();
      rafRef.current = requestAnimationFrame(animate);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    resize();
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
    // orbitNodeRefs are stable ref objects; read .current inside animate
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageRef]);

  return { ambientRef, waveRef };
}
