// src/CircleUnit.jsx
import React, { useMemo, useState, useRef, useCallback } from "react";
import { FiSearch } from "react-icons/fi";
import "./CircleUnit.css";
import { formatTrigValue } from "./trigFormatter";

export default function CircleUnit() {
  const [deg, setDeg] = useState("45");
  const [dragging, setDragging] = useState(false);

  const [focus, setFocus] = useState("none");
  const EDGE = "#000";
  const SIN_ACTIVE = "#e2536b";
  const COS_ACTIVE = "#00a2ffff";

  const sinStroke = focus === "sin" ? SIN_ACTIVE : EDGE;
  const cosStroke = focus === "cos" ? COS_ACTIVE : EDGE;

  const smooth = {
    transition: "stroke 180ms ease, stroke-width 180ms ease, transform .25s ease",
  };

  // ---- sanitize / derive number ----
  const clamp = (n) => Math.max(-360, Math.min(360, n));
  const normalize = (v) => {
    if (v === "" || v === "-") return v;
    const n = Number(v);
    if (!Number.isFinite(n)) return "";
    return String(clamp(n));
  };

  const d = useMemo(() => {
    const n = Number(deg);
    return Number.isFinite(n) ? clamp(n) : 0;
  }, [deg]);

  // ใช้ d คำนวณมุม/ตรีโกณ
  const rad = useMemo(() => (d * Math.PI) / 180, [d]);
  const s = useMemo(() => Math.sin(rad), [rad]);
  const c = useMemo(() => Math.cos(rad), [rad]);

  // ---- Canvas params ----
  const size = 560;
  const r = 190;
  const cx = size / 2;
  const cy = size / 2;

  const toSvg = (theta) => 90 - theta;

  // ---- helpers ----
  const polar = (R, deg) => {
    const t = ((deg - 90) * Math.PI) / 180; // 0° = ขึ้น, เดินตามเข็ม = บวก
    return { x: cx + R * Math.cos(t), y: cy + R * Math.sin(t) };
  };
  const ticks30 = Array.from({ length: 12 }, (_, i) => i * 30);
  const ticks45 = [45, 135, 225, 315];

  const Tick = ({ d, len = 12, stroke = "#7aa7ff", width = 3 }) => {
    const p1 = polar(r + 2, d);
    const p2 = polar(r - len, d);
    return (
      <line
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
      />
    );
  };

  const AngleLabel = ({ d, text }) => {
    const p = polar(r + 36, d);
    return (
      <g style={{ transition: "transform .25s ease" }} transform={`translate(${p.x},${p.y})`}>
        <text textAnchor="middle" dominantBaseline="middle" className="deg-label">
          {text ?? `${d}°`}
        </text>
      </g>
    );
  };

  const QuadrantLabel = ({ d, text, R = r + 120 }) => {
    const p = polar(R, d);
    return (
      <text x={p.x} y={p.y} className="quad" textAnchor="middle" dominantBaseline="middle">
        {text}
      </text>
    );
  };

  // ===== Drag handlers =====
  const svgRef = useRef(null);

  const getAngleFromPointer = useCallback(
    (e) => {
      const svg = svgRef.current;
      if (!svg) return d;
      const rect = svg.getBoundingClientRect();

      const scaleX = size / rect.width;
      const scaleY = size / rect.height;

      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      const dx = mx - cx;
      const dy = cy - my; // y ของ SVG คว่ำ

      let ang = (Math.atan2(dy, dx) * 180) / Math.PI; // [-180, 180]
      if (ang < 0) ang += 360; // [0, 360)
      return Math.round(ang);
    },
    [cx, cy, size, d]
  );

  const handlePointerDown = (e) => {
    e.preventDefault();
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const handlePointerMove = (e) => {
    if (!dragging) return;
    e.preventDefault();
    setDeg(String(getAngleFromPointer(e)));
  };
  const handlePointerUp = (e) => {
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore errors from releasePointerCapture for older browsers */
    }
  };

  // ===== วาดสามเหลี่ยมตามมุมที่ระบุ =====
  // ===== วาดสามเหลี่ยมตามมุมที่ระบุ (รองรับสี+ความจางต่อเส้น) =====
const TriangleArm = ({
  angle,
  showArc = false,
  // สีของแต่ละเส้น
  colorBase = "#000",     // เส้นฐาน (cos)
  colorHeight = "#000",   // เส้นสูง (sin)
  colorHyp = "#F5AD18",   // ไฮโปเทนิวส์
  arcColor = "#0BA6DF",
  // ความหนา
  widthBase = 4,
  widthHeight = 4,
  widthHyp = 4,
  // ความจาง (0–1)
  opacityBase = 1,
  opacityHeight = 1,
  opacityHyp = 1,
  arcOpacity = 1,
  // hypotenuse dashed?
  hypDashed = true,
  // right-angle marker
  showRightAngle = false,
  rightAngleSize = 14,
  rightAngleColor = "#254f91",
  // leg labels (cos / sin)
  showLegLabels = false,
  legLabelOffset = 12,
  labelFontSize = 14,
}) => {
  const radA = (angle * Math.PI) / 180;
  const sA = Math.sin(radA);
  const cA = Math.cos(radA);

  const ux = cx + r * cA;   // ปลายบนวงกลม
  const uy = cy - r * sA;

  return (
    <g filter="url(#softShadow)" style={{ pointerEvents: "none" }}>
      {/* ฐาน (cos) */}
      <line
        x1={cx} y1={cy} x2={ux} y2={cy}
        stroke={colorBase} strokeWidth={widthBase} opacity={opacityBase}
        style={smooth}
      />
      {/* สูง (sin) */}
      <line
        x1={ux} y1={cy} x2={ux} y2={uy}
        stroke={colorHeight} strokeWidth={widthHeight} opacity={opacityHeight}
        style={smooth}
      />
      {/* ไฮโปเทนิวส์ */}
      <line
        x1={cx} y1={cy} x2={ux} y2={uy}
        stroke={colorHyp} strokeWidth={widthHyp} opacity={opacityHyp}
        {...(hypDashed ? { strokeDasharray: "6 6" } : {})}
      />
      {hypDashed && (
        <line
          x1={cx} y1={cy} x2={ux} y2={uy}
          stroke={colorHyp} strokeWidth={widthHyp} opacity={opacityHyp}
          strokeDasharray="6 6"
        />
      )}

      {/* right-angle square at the corner between base & height */}
      {showRightAngle && (() => {
        const s = rightAngleSize;
        // corner at (ux, cy)
        // draw the square pointing "inwards" towards the triangle interior
        const dirX = ux > cx ? -1 : 1; // inward along x toward center
        const dirY = uy < cy ? -1 : 1; // inward along y toward the triangle interior
        const p1x = ux;
        const p1y = cy;
        const p2x = ux + dirX * s;
        const p2y = cy;
        const p3x = ux + dirX * s;
        const p3y = cy + dirY * s;
        const p4x = ux;
        const p4y = cy + dirY * s;
        const d = `M ${p1x} ${p1y} L ${p2x} ${p2y} L ${p3x} ${p3y} L ${p4x} ${p4y} Z`;
        return <path d={d} fill="none" stroke={rightAngleColor} strokeWidth={3} opacity={0.95} />;
      })()}

      {/* leg labels for cos & sin */}
      {showLegLabels && (() => {
        const offset = legLabelOffset;
        const midBaseX = (cx + ux) / 1.8;
        const baseLabelY = cy + offset + 10; // below the base
        const midHeightY = (cy + uy) / 2;
        const heightLabelX = ux + (ux > cx ? offset + 8 : -(offset + 22)); // to the right for Q1
        return (
          <g style={{ pointerEvents: "none" }}>
            {/* cos label below base */}
            <text x={midBaseX} y={baseLabelY} textAnchor="middle" fill={colorBase} fontSize={labelFontSize}>
              Cos θ
            </text>

            {/* sin label beside height */}
            <text x={heightLabelX} y={midHeightY} fill={colorHeight} fontSize={labelFontSize} dominantBaseline="middle">
              Sin θ
            </text>
          </g>
        );
      })()}

      {/* มุม θ (ถ้าต้องการแสดง) */}
      {showArc && (() => {
        const startDeg = 90;          // toSvg(0)
        const endDeg   = 90 - angle;  // toSvg(angle)
        const path = describeArcSweep(cx, cy, 40, startDeg, endDeg, angle <= 0);
        return <path d={path} stroke={arcColor} strokeWidth={4} opacity={arcOpacity} fill="none" />;
      })()}
    </g>
  );
};

  return (
    <div className="wrap">
      <div className="card">
        <div className="title-wrap">
          <div className="title">Magic Unit Circle</div>
        </div>

        <div className="stage">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${size} ${size}`}
            width="100%"
            height="100%"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {/* defs */}
            <defs>
              <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#d5fff3" />
                <stop offset="100%" stopColor="#a9e4db" />
              </linearGradient>

              {/* เงานุ่มสำหรับเส้น */}
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity=".25" />
              </filter>
            </defs>

            {/* outer ring & main circle */}
            <circle cx={cx} cy={cy} r={r + 34} fill="url(#ring)" />
            <circle cx={cx} cy={cy} r={r} fill="#fff" stroke="#254f91" strokeWidth={7} />

            {/* axes */}
            <line x1={cx - r - 18} y1={cy} x2={cx + r + 18} y2={cy} stroke="#254f91" strokeWidth={6} strokeLinecap="round" />
            <line x1={cx} y1={cy - r - 18} x2={cx} y2={cy + r + 18} stroke="#254f91" strokeWidth={6} strokeLinecap="round" />

            {/* quadrant tints */}
            <path d={`M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Z`} fill="#fff4d6" opacity=".7" />
            <path d={`M ${cx} ${cy} L ${cx + r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${cy + r} Z`} fill="#f4e6ff" opacity=".6" />
            <path d={`M ${cx} ${cy} L ${cx} ${cy + r} A ${r} ${r} 0 0 1 ${cx - r} ${cy} Z`} fill="#e7fbe2" opacity=".7" />
            <path d={`M ${cx} ${cy} L ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${cy - r} Z`} fill="#e9f5ff" opacity=".7" />

            {/* quadrant labels */}
            <QuadrantLabel d={toSvg(45)} text="Q1(+,+)" />
            <QuadrantLabel d={toSvg(135)} text="Q2(-,+)" />
            <QuadrantLabel d={toSvg(225)} text="Q3(-,-)" />
            <QuadrantLabel d={toSvg(315)} text="Q4(+,-)" />

            {/* ticks + labels */}
            {ticks30.map((d0) => <Tick key={`t-${d0}`} d={toSvg(d0)} />)}
            {ticks45.map((d0) => (
              <Tick key={`t45-${d0}`} d={toSvg(d0)} len={18} stroke="#b38bff" width={3.5} />
            ))}
            {ticks30.map((d0) => {
              if (d0 === 0) {
                const p = polar(r + 36, toSvg(d0));
                return (
                  <text key={`a-${d0}`} x={p.x} y={p.y - 14} textAnchor="middle" dominantBaseline="middle" className="deg-label">0°</text>
                );
              }
              return <AngleLabel key={`a-${d0}`} d={toSvg(d0)} text={`${d0}°`} />;
            })}
            {/* 360° แยกจาก 0° */}
            {(() => {
              const p = polar(r + 36, toSvg(0));
              return (
                <text x={p.x} y={p.y + 20} textAnchor="middle" dominantBaseline="middle" className="deg-label">360°</text>
              );
            })()}
            {ticks45.map((d0) => <AngleLabel key={`a45-${d0}`} d={toSvg(d0)} text={`${d0}°`} />)}

            {/* ===== 4 แขน: แขนหลัก + แขนสะท้อน (ตั้งความจางต่างกัน) ===== */}
<TriangleArm
  angle={d}
  showArc
  colorBase="#2196F3"     // สีฟ้าสำหรับ Cos
  colorHeight="#E91E63"   // สีชมพูสำหรับ Sin
  colorHyp="#ff9900"
  widthBase={focus === "cos" ? 6 : 4}
  widthHeight={focus === "sin" ? 6 : 4}
  widthHyp={4}
  opacityBase={1.0}
  opacityHeight={1.0}
  opacityHyp={0.9}
  arcColor="#0BA6DF"
  arcOpacity={0.9}
  hypDashed={false}
  showRightAngle={true}
  rightAngleSize={14}
  rightAngleColor="#254f91"
  showLegLabels={true}
  legLabelOffset={14}
  labelFontSize={14}
/>

<TriangleArm
  angle={180 - d}
  colorBase="#009688"
  colorHeight="#8bc34a"
  colorHyp="#cddc39"
  opacityBase={0.7}
  opacityHeight={0.7}
  opacityHyp={0.6}
/>

<TriangleArm
  angle={180 + d}
  colorBase="#9c27b0"
  colorHeight="#7800afff"
  colorHyp="#673ab7"
  opacityBase={0.35}
  opacityHeight={0.35}
  opacityHyp={0.3}
/>

<TriangleArm
  angle={360 - d}
  colorBase="#03a9f4"
  colorHeight="#fca400ff"
  colorHyp="#d8a706ff"
  opacityBase={0.55}
  opacityHeight={0.55}
  opacityHyp={0.5}
/>

{/* วงกลมแดงไว้ท้ายสุดเพื่อให้อยู่บนสุด */}
{(() => {
  const p = polar(r, toSvg(d));
  return (
    <circle
      cx={p.x}
      cy={p.y}
      r={12}
      fill="white"
      stroke="#e2536b"
      strokeWidth={4}
      style={{ cursor: "pointer" }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
    />
  );
})()}


            {/* วงกลมแดงไว้ท้ายสุดเพื่อให้อยู่บนสุด */}
            {(() => {
              const p = polar(r, toSvg(d));
              return (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={12}
                  fill="white"
                  stroke="#e2536b"
                  strokeWidth={4}
                  style={{ cursor: "pointer" }}
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  onPointerMove={handlePointerMove}
                />
              );
            })()}
          </svg>
        </div>

        {/* controls */}
        <div className="actions">
          <button
            className={`btn pink ${focus === "sin" ? "active" : ""}`}
            onClick={() => setFocus(focus === "sin" ? "none" : "sin")}
          >
            Find Sin
          </button>

          <button
            className={`btn blue ${focus === "cos" ? "active" : ""}`}
            onClick={() => setFocus(focus === "cos" ? "none" : "cos")}
          >
            Find Cos
          </button>

          <div className="input_Container">
            <label className="Angle">
              <FiSearch className="searchIcon" /> Angle :
            </label>
            <input
              className="inputAngle"
              type="number"
              value={deg}
              min={-360}
              max={360}
              onChange={(e) => setDeg(normalize(e.target.value))}
              onBlur={() => setDeg((prev) => normalize(prev))}
            />
            <span className="unit">°</span>
          </div>
        </div>

        <input
          className="range"
          type="range"
          min="-360"
          max="360"
          value={d}
          onChange={(e) => setDeg(String(clamp(Number(e.target.value))))}
        />

        <div className="readouts">
          <div className="pill violet">
            <p className="Header1">Angle</p>
            <p className="textInfo">{d}°</p>
          </div>
          <div className="pill orange">
            <p className="Header1">Sin(θ)</p>
            <p className="textInfo">{formatTrigValue(s)}</p>
          </div>
          <div className="pill green">
            <p className="Header1">Cos(θ)</p>
            <p className="textInfo">{formatTrigValue(c)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== helpers (geometry) ===== */
function polarToCartesian(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180; // 0° = ขึ้น, เดินตามเข็ม = บวก
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function describeArcSweep(cx, cy, r, startDeg, endDeg, sweepCW = true) {
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = sweepCW ? 1 : 0; // 1 = clockwise
  return ["M", start.x, start.y, "A", r, r, 0, large, sweep, end.x, end.y].join(" ");
}
