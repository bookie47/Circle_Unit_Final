// src/trigFormatter.js
export function formatTrigValue(value) {
  if (value == null || isNaN(value)) return "";

  const sqrt2 = Math.sqrt(2);
  const sqrt3 = Math.sqrt(3);

  // ตารางค่าพิเศษ sin/cos ที่ใช้กันบ่อย
  const known = [
    { val: 0, text: "0" },
    { val: 0.5, text: "1/2" },
    { val: Math.sqrt(3) / 2, text: "√3/2" },
    { val: Math.sqrt(2) / 2, text: "√2/2" },
    { val: 1 / Math.sqrt(2), text: "1/√2" },
    { val: 1, text: "1" },
    // เวอร์ชันติดลบ
    { val: -0.5, text: "-1/2" },
    { val: -Math.sqrt(3) / 2, text: "-√3/2" },
    { val: -Math.sqrt(2) / 2, text: "-√2/2" },
    { val: -1 / Math.sqrt(2), text: "-1/√2" },
    { val: -1, text: "-1" },
  ];

  const rounded = parseFloat(Number(value).toFixed(4));
  for (const item of known) {
    if (Math.abs(item.val - rounded) < 0.01) return item.text;
  }

  // ถ้าไม่ตรงกับค่าพิเศษ ให้แสดงทศนิยม 2 หลัก
  return Number(value).toFixed(2);
}
