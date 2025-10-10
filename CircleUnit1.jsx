// src/CircleUnit.jsx
import React, { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { FiSearch } from "react-icons/fi";
import "./CircleUnit.css";
import { formatTrigValue } from "./trigFormatter";


export default function CircleUnit() {
  const [deg, setDeg] = useState("45"); // เก็บค่าจากอินพุต (string) เพื่อควบคุม "0 นำหน้า" ฯลฯ
  const [dragging, setDragging] = useState(false);

  const [focus, setFocus] = useState("none");
  const EDGE = "#000"; // สีดำปกติของสามเหลี่ยม
  const HYP = "#2b2b2b"; // ไฮโปเทนิวส์เดิม
  const SIN_ACTIVE = "#e2536b"; // สีแดงเวลาเน้น sin
  const COS_ACTIVE = "#00a2ffff"; // สีน้ำเงินเวลาเน้น cos

  const sinStroke = focus === "sin" ? SIN_ACTIVE : EDGE;
  const cosStroke = focus === "cos" ? COS_ACTIVE : EDGE;
  const sinWidth = focus === "sin" ? 6 : 4;
  const cosWidth = focus === "cos" ? 6 : 4;
  const smooth = {
    transition:
      "stroke 180ms ease, stroke-width 180ms ease, transform .25s ease",
  };

  // ---- sanitize / derive number ----
  const clamp = (n) => Math.max(-360, Math.min(360, n));
  const normalize = (v) => {
    if (v === "" || v === "-") return v; // ให้พิมพ์ระหว่างทางได้
    const n = Number(v);
    if (!Number.isFinite(n)) return "";
    return String(clamp(n));
  };

  const d = useMemo(() => {
    const n = Number(deg);
    return Number.isFinite(n) ? clamp(n) : 0;
  }, [deg]);

  // ใช้ d (ตัวเลข) ในการคำนวณทั้งหมด
  const rad = useMemo(() => (d * Math.PI) / 180, [d]);
  const s = useMemo(() => Math.sin(rad), [rad]);
  const c = useMemo(() => Math.cos(rad), [rad]);

  // ---- Canvas params (ทำ responsive ผ่าน CSS; viewBox = size) ----
  const size = 560; // พื้นที่คงที่ของ viewBox (พิกัดภายใน SVG)
  const r = 190; // รัศมีวงกลมหน่วย (ในพิกัด viewBox)
  //const triangleSize = r * 0.7;
  const triangleSize = r / Math.SQRT2;
  const TRI = triangleSize * 1;
  const cx = size / 2;
  const cy = size / 2;

  const px = cx + triangleSize; // ปลายแกน x (ฐาน)
  const py = cy - triangleSize; // ปลายแกน y (สูง)

  // มุมมาตรฐาน (0° ขวา, ทวนเข็มบวก) → มุมสำหรับ polar()/SVG ปัจจุบัน (0° บน, ตามเข็มบวก)
  const toSvg = (theta) => 90 - theta;

  // ---- helpers ----
  const polar = (R, deg) => {
    const t = ((deg - 90) * Math.PI) / 180; // 0° = ขึ้น, เดินตามเข็ม = บวก (polar style)
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
      <g
        style={{ transition: "transform .25s ease" }}
        transform={`translate(${p.x},${p.y})`}
      >
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          className="deg-label"
        >
          {text ?? `${d}°`}
        </text>
      </g>
    );
  };

  const QuadrantLabel = ({ d, text, R = r + 120 }) => {
    const p = polar(R, d); // ใช้มุมแบบ polar helper ของคุณ
    return (
      <text
        x={p.x}
        y={p.y}
        className="quad"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {text}
      </text>
    );
  };

  // ===== Drag the red point (รองรับ responsive ด้วยการแปลงพิกัดจอ -> viewBox) =====
  const svgRef = useRef(null);

  const getAngleFromPointer = useCallback(
    (e) => {
      const svg = svgRef.current;
      if (!svg) return d;
      const rect = svg.getBoundingClientRect();

      // สเกลจากพิกัดจอ -> viewBox
      const scaleX = size / rect.width;
      const scaleY = size / rect.height;

      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      const dx = mx - cx;
      const dy = cy - my; // แกน y ของ SVG คว่ำ

      let ang = (Math.atan2(dy, dx) * 180) / Math.PI; // [-180, 180]
      if (ang < 0) ang += 360; // [0, 360)
      return Math.round(ang);
    },
    [cx, cy, size, d]
  );

  const handlePointerDown = (e) => {
    e.preventDefault();
    setDragging(true);
    // ไม่ต้อง setDeg ที่นี่ ปล่อยไว้เฉย ๆ
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    e.preventDefault();
    setDeg(String(getAngleFromPointer(e))); // ✅ อัปเดตตอนลากเท่านั้น
  };
  const handlePointerUp = (e) => {
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      console.log(e);
    }
  };

  // sync ความสูงจริงของหน้าต่าง → CSS var (--appH)
useEffect(() => {
  const setH = () => {
    document.documentElement.style.setProperty("--appH", `${window.innerHeight}px`);
  };
  setH();
  window.addEventListener("resize", setH);
  return () => window.removeEventListener("resize", setH);
}, []);

useEffect(() => {
  const setVH = () => {
    const h = window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${h}px`);
  };
  setVH();
  window.addEventListener('resize', setVH);
  return () => window.removeEventListener('resize', setVH);
}, []);



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
              <linearGradient id="sinFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffc9b9" />
                <stop offset="100%" stopColor="#ffb49b" />
              </linearGradient>
              <linearGradient id="cosFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d7f8c7" />
                <stop offset="100%" stopColor="#bff2a4" />
                <defs>
                  {/* เงานุ่มสำหรับเส้น */}
                  <filter
                    id="softShadow"
                    x="-20%"
                    y="-20%"
                    width="140%"
                    height="140%"
                  >
                    <feDropShadow
                      dx="0"
                      dy="2"
                      stdDeviation="2"
                      flood-opacity=".25"
                    />
                  </filter>

                  {/* สโตรกวงกลมแบบกราเดียนต์ */}
                  <linearGradient id="ringStroke" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#6fa8ff" />
                    <stop offset="100%" stopColor="#39d6b6" />
                  </linearGradient>
                </defs>
              </linearGradient>
            </defs>
            {/* outer ring & main circle */}
            <circle cx={cx} cy={cy} r={r + 34} fill="url(#ring)" />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="#fff"
              stroke="#254f91"
              strokeWidth={7}
            />
            {/* axes */}
            <line
              x1={cx - r - 18}
              y1={cy}
              x2={cx + r + 18}
              y2={cy}
              stroke="#254f91"
              strokeWidth={6}
              strokeLinecap="round"
            />
            <line
              x1={cx}
              y1={cy - r - 18}
              x2={cx}
              y2={cy + r + 18}
              stroke="#254f91"
              strokeWidth={6}
              strokeLinecap="round"
            />
            {/* quadrant tints */}
            <path
              d={`M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${
                cx + r
              } ${cy} Z`}
              fill="#fff4d6"
              opacity=".7"
            />
            <path
              d={`M ${cx} ${cy} L ${cx + r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${
                cy + r
              } Z`}
              fill="#f4e6ff"
              opacity=".6"
            />
            <path
              d={`M ${cx} ${cy} L ${cx} ${cy + r} A ${r} ${r} 0 0 1 ${
                cx - r
              } ${cy} Z`}
              fill="#e7fbe2"
              opacity=".7"
            />
            <path
              d={`M ${cx} ${cy} L ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${
                cy - r
              } Z`}
              fill="#e9f5ff"
              opacity=".7"
            />
            {/* quadrant labels */}
            <QuadrantLabel d={toSvg(45)} text="Q1(+,+)" />
            <QuadrantLabel d={toSvg(135)} text="Q2(-,+)" />
            <QuadrantLabel d={toSvg(225)} text="Q3(-,-)" />
            <QuadrantLabel d={toSvg(315)} text="Q4(+,-)" />
            {/* ticks + labels */}
            {ticks30.map((d0) => (
              <Tick key={`t-${d0}`} d={toSvg(d0)} />
            ))}
            {ticks45.map((d0) => (
              <Tick
                key={`t45-${d0}`}
                d={toSvg(d0)}
                len={18}
                stroke="#b38bff"
                width={3.5}
              />
            ))}
            {ticks30.map((d0) => {
              // ถ้าเป็น 0° ให้ขยับขึ้น
              if (d0 === 0) {
                const p = polar(r + 36, toSvg(d0));
                return (
                  <text
                    key={`a-${d0}`}
                    x={p.x}
                    y={p.y - 14} // ขยับขึ้น 14px
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="deg-label"
                  >
                    0°
                  </text>
                );
              }
              return (
                <AngleLabel key={`a-${d0}`} d={toSvg(d0)} text={`${d0}°`} />
              );
            })}
            /* เพิ่ม 360° แยกออกจาก 0° */
            {(() => {
              const p = polar(r + 36, toSvg(0)); // จุดเดียวกับ 0°
              return (
                <text
                  x={p.x}
                  y={p.y + 20} // ขยับลงมานิดเพื่อไม่ชน "0°"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="deg-label"
                >
                  360°
                </text>
              );
            })()}
            {ticks45.map((d0) => (
              <AngleLabel key={`a45-${d0}`} d={toSvg(d0)} text={`${d0}°`} />
            ))}
            {/* special points */}
            <text x={cx + r + 55} y={cy + 3} className="pt">
              (1,0)
            </text>
            <text x={cx - r - 85} y={cy + 3} className="pt">
              (-1,0)
            </text>
            <text x={cx - 14} y={cy - r - 55} className="pt">
              (0,1)
            </text>
            <text x={cx - 14} y={cy + r + 57} className="pt">
              (0,-1)
            </text>
          
            {/* ===== รวมสี่สามเหลี่ยมใน group เดียว แล้วหมุนด้วย d ===== */}
            <g
              transform={`rotate(${45 - d} ${cx} ${cy})`}
              filter="url(#softShadow)"
            >
              {/* Q1 (+,+) */}
              <line
                x1={cx}
                y1={cy}
                x2={cx + triangleSize}
                y2={cy}
                stroke={cosStroke}
                strokeWidth={4}
                style={smooth}
              />
              <line
                x1={cx + triangleSize}
                y1={cy}
                x2={cx + triangleSize}
                y2={cy - triangleSize}
                stroke={sinStroke}
                strokeWidth={4}
                style={smooth}
              />
              <line
                x1={cx}
                y1={cy}
                x2={cx + triangleSize}
                y2={cy - triangleSize}
                stroke="#F5AD18"
                strokeWidth={4}
                strokeDasharray="6 6"
              />

              {(() => {
                const arcRadius = 40;
                const angleDeg = 45; // ปรับตรงนี้ = ขนาดมุมที่ต้องการ เช่น 30°, 60°, 90°
                const angleRad = (angleDeg * Math.PI) / 180;

                // จุดเริ่มต้นอยู่ที่มุม 0°
                const start = {
                  x: cx + arcRadius,
                  y: cy,
                };

                // จุดสิ้นสุดตามมุมที่ต้องการ (ใช้ sin/cos)
                const end = {
                  x: cx + arcRadius * Math.cos(angleRad),
                  y: cy - arcRadius * Math.sin(angleRad),
                };

                return (
                  <path
                    d={`M ${start.x} ${start.y} A ${arcRadius} ${arcRadius} 0 ${
                      angleDeg > 180 ? 1 : 0
                    } 0 ${end.x} ${end.y}`}
                    stroke="#0BA6DF"
                    strokeWidth={4}
                    fill="none"
                  />
                );
              })()}

              {/* Q2 (-,+) */}
              <line
                x1={cx}
                y1={cy}
                x2={cx - triangleSize}
                y2={cy}
                stroke={cosStroke}
                strokeWidth={4}
                style={smooth}
              />
              <line
                x1={cx - triangleSize}
                y1={cy}
                x2={cx - triangleSize}
                y2={cy - triangleSize}
                stroke={sinStroke}
                strokeWidth={4}
                style={smooth}
              />
              <line
                x1={cx}
                y1={cy}
                x2={cx - triangleSize}
                y2={cy - triangleSize}
                stroke={HYP}
                strokeWidth={4}
                strokeDasharray="6 6"
              />
              {/* Q3 (-,-) */}
              <line
                x1={cx}
                y1={cy}
                x2={cx - triangleSize}
                y2={cy}
                stroke={cosStroke}
                strokeWidth={4}
                style={smooth}
              />
              <line
                x1={cx - triangleSize}
                y1={cy}
                x2={cx - triangleSize}
                y2={cy + triangleSize}
                stroke={sinStroke}
                strokeWidth={4}
                style={smooth}
              />
              <line
                x1={cx}
                y1={cy}
                x2={cx - triangleSize}
                y2={cy + triangleSize}
                stroke={HYP}
                strokeWidth={4}
                strokeDasharray="6 6"
              />
              {/* Q4 (+,-) */}
              <line
                x1={cx}
                y1={cy}
                x2={cx + triangleSize}
                y2={cy}
                stroke={cosStroke}
                strokeWidth={4}
                style={smooth}
              />
              <line
                x1={cx + triangleSize}
                y1={cy}
                x2={cx + triangleSize}
                y2={cy + triangleSize}
                stroke={sinStroke}
                strokeWidth={4}
                style={smooth}
              />
              <line
                x1={cx}
                y1={cy}
                x2={cx + triangleSize}
                y2={cy + triangleSize}
                stroke={HYP}
                strokeWidth={4}
                strokeDasharray="6 6"
              />

              {(() => {
                const arcRadius = 40;
                const angleDeg = 45; // ปรับมุมได้
                const angleRad = (angleDeg * Math.PI) / 180;

                // จุดเริ่มต้นที่ด้านขวา (แนว 0°)
                const start = {
                  x: cx + arcRadius,
                  y: cy,
                };

                // จุดสิ้นสุดหมุนตามมุมแบบสะท้อน (ลงล่าง)
                const end = {
                  x: cx + arcRadius * Math.cos(angleRad),
                  y: cy + arcRadius * Math.sin(angleRad),
                };

                return (
                  <path
                    d={`M ${start.x} ${start.y} A ${arcRadius} ${arcRadius} 0 ${
                      angleDeg > 180 ? 1 : 0
                    } 1 ${end.x} ${end.y}`}
                    stroke="#DC143C"
                    strokeWidth={4}
                    fill="none"
                  />
                );
              })()}

              {/*สีเหลี่ยมุมฉาก */}
              {/* Q1 */}
              <rect
                x={cx + triangleSize - 10}
                y={cy - 10}
                width={10}
                height={10}
                fill="none"
                stroke="black"
                strokeWidth={3}
              />
              {/* Q2 */}
              <rect
                x={cx - triangleSize}
                y={cy - 10}
                width={10}
                height={10}
                fill="none"
                stroke="black"
                strokeWidth={3}
              />
              {/* Q3 */}
              <rect
                x={cx - triangleSize}
                y={cy}
                width={10}
                height={10}
                fill="none"
                stroke="black"
                strokeWidth={3}
              />
              {/* Q4 */}
              <rect
                x={cx + triangleSize - 10}
                y={cy}
                width={10}
                height={10}
                fill="none"
                stroke="black"
                strokeWidth={3}
              />
            </g>
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
            strokeWidth={sinWidth}
          >
            Find Sin
          </button>

          <button
            className={`btn blue ${focus === "cos" ? "active" : ""}`}
            onClick={() => setFocus(focus === "cos" ? "none" : "cos")}
            strokeWidth={cosWidth}
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
  return ["M", start.x, start.y, "A", r, r, 0, large, sweep, end.x, end.y].join(
    " "
  );
}
