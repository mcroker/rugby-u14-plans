// Source for the 5-man Rhino lineout diagrams in claude/playbook.md.
//
// Convention: touchline along the top, attack left -> right, the backline
// spreading infield (down the page) as it goes. Forwards are club blue,
// backs near-black; a solid cyan arrow is a run with the ball, dashed cyan a
// run without it, dotted cyan a fold into position, black dashed a pass.
//
// Regenerate (writes an .svg and an .html wrapper per phase, then screenshot
// the wrappers and drop the PNGs into claude/images/ + claude/images/web/):
//
//   node tools/lineout_diagrams.mjs <out-dir>
//   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
//     --force-device-scale-factor=2 --window-size=1100,420 \
//     --screenshot=<phase>.png file://<out-dir>/<phase>.html
//   sips -Z 1100 claude/images/<phase>.png --out claude/images/web/<phase>.png
import fs from "node:fs";
import path from "node:path";

const W = 1100, H = 420;

const GRASS_A = "#4d7d40", GRASS_B = "#547f47";
const LINE = "rgba(255,255,255,0.80)";
const FWD = "#1d3f72";            // forwards - club blue
const BCK = "#14181f";            // backs - near black
const RUN = "#3fb2ea";            // running / carry lines
const RUCK = "#3fb2ea";
const PASS = "#0d0f13";           // pass lines

function defs() {
  return `
  <defs>
    <marker id="run" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M0,1 L9,5 L0,9 z" fill="${RUN}"/>
    </marker>
    <marker id="pass" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
      <path d="M0,1 L9,5 L0,9 z" fill="${PASS}"/>
    </marker>
    <filter id="sh" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.6" flood-color="#000" flood-opacity="0.45"/>
    </filter>
  </defs>`;
}

function pitch(withLineoutLines) {
  // Mowing stripes, touchline, and (only where the lineout is drawn) the 5m
  // and 15m lines it stands between.
  let s = `<rect width="${W}" height="${H}" fill="${GRASS_A}"/>`;
  for (let x = 0; x < W; x += 120)
    s += `<rect x="${x}" y="0" width="60" height="${H}" fill="#ffffff" opacity="0.032"/>`;
  s += `<line x1="0" y1="24" x2="${W}" y2="24" stroke="${LINE}" stroke-width="5"/>`;
  if (withLineoutLines) {
    s += `<line x1="0" y1="58" x2="${W}" y2="58" stroke="${LINE}" stroke-width="2.5" stroke-dasharray="14 12"/>`;
    s += `<line x1="0" y1="208" x2="${W}" y2="208" stroke="${LINE}" stroke-width="2.5" stroke-dasharray="14 12"/>`;
    s += `<text x="14" y="50" ${lab(13)}>5m</text>`;
    s += `<text x="14" y="228" ${lab(13)}>15m</text>`;
  }
  return s;
}

const lab = (sz) =>
  `font-family="Arial, Helvetica, sans-serif" font-size="${sz}" font-weight="700" fill="#ffffff" opacity="0.72"`;

/** Line of touch — the vertical gain line at the lineout. */
function lineOfTouch(x) {
  return `<line x1="${x}" y1="24" x2="${x}" y2="250" stroke="${LINE}" stroke-width="2.5" stroke-dasharray="8 9"/>`;
}

function player(x, y, n, kind = "fwd", r = 16) {
  const fill = kind === "fwd" ? FWD : BCK;
  const fs = String(n).length > 2 ? 12 : 15;
  return `<g filter="url(#sh)"><circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="#ffffff" stroke-width="2.2"/></g>` +
    `<text x="${x}" y="${y + fs * 0.36}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fs}" font-weight="700" fill="#ffffff">${n}</text>`;
}

/** Opposition marker — hollow, so it reads as "not us". */
function opp(x, y, r = 13) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="rgba(0,0,0,0.22)" stroke="#ffffff" stroke-width="2" stroke-dasharray="4 3"/>`;
}

function ruck(x, y, text) {
  const w = text.length * 8.6 + 26;
  return `<g filter="url(#sh)"><rect x="${x - w / 2}" y="${y - 15}" width="${w}" height="30" rx="15" fill="${RUCK}" stroke="#ffffff" stroke-width="2.2"/></g>` +
    `<text x="${x}" y="${y + 5.5}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#0c2036">${text}</text>`;
}

const run = (d, dash = null) =>
  `<path d="${d}" fill="none" stroke="${RUN}" stroke-width="5" stroke-linecap="round" marker-end="url(#run)"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;

const pass = (d) =>
  `<path d="${d}" fill="none" stroke="${PASS}" stroke-width="3.4" stroke-dasharray="11 8" stroke-linecap="round" marker-end="url(#pass)"/>`;

/** Dotted route showing players folding round to a new position. */
const fold = (d) =>
  `<path d="${d}" fill="none" stroke="${RUN}" stroke-width="4" stroke-dasharray="2 8" stroke-linecap="round" opacity="0.95" marker-end="url(#run)"/>`;

function tag(x, y, text, anchor = "start") {
  const w = text.length * 8.2 + 20;
  const rx = anchor === "start" ? x : x - w / 2;
  return `<rect x="${rx}" y="${y - 16}" width="${w}" height="26" rx="6" fill="rgba(10,20,32,0.78)"/>` +
    `<text x="${rx + w / 2}" y="${y + 2}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#ffffff" letter-spacing="0.4">${text}</text>`;
}

/** "Attack this way" arrow, so the diagram is never read backwards. */
function attackArrow() {
  return `<g opacity="0.9">
    <text x="${W - 128}" y="46" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#ffffff" letter-spacing="1.4">ATTACK</text>
    <path d="M ${W - 118} 41 L ${W - 26} 41" fill="none" stroke="#ffffff" stroke-width="3.5" marker-end="url(#wa)"/>
  </g>
  <defs><marker id="wa" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
    <path d="M0,1 L9,5 L0,9 z" fill="#ffffff"/></marker></defs>`;
}

const svg = (body, lineoutLines) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs()}${pitch(lineoutLines)}${body}${attackArrow()}</svg>`;

// ---------------------------------------------------------------- the lineout
// Five in the line at the line of touch (x = LOT), 5m to 15m.
const LOT = 210;
const LINE_Y = [64, 100, 136, 172, 203];
const LINE_N = ["1", "4", "7", "5", "3"];

function lineoutSet() {
  let s = lineOfTouch(LOT);
  LINE_Y.forEach((y, i) => (s += opp(LOT + 34, y)));
  LINE_Y.forEach((y, i) => (s += player(LOT, y, LINE_N[i], "fwd")));
  s += player(LOT, 24, "2", "fwd", 15); // hooker, throwing from touch
  return s;
}

// ------------------------------------------------------------------- phase 1
// OTT to 9; 9 passes past 10 to the pod (6 and 8) standing in front of him.
function phase1() {
  let s = lineoutSet();
  s += tag(56, 300, "5-MAN LINEOUT");

  s += pass("M 232 150 C 296 176, 302 206, 282 228");  // off the top, down to 9
  s += player(268, 243, "9", "bck");
  s += pass("M 296 243 L 408 240");                    // 9 past 10 to the pod
  s += player(438, 238, "6", "fwd");
  s += player(486, 238, "8", "fwd");
  s += run("M 508 246 C 552 262, 578 254, 596 246");   // pod carries
  s += ruck(654, 243, "RUCK 1");

  s += player(392, 300, "10", "bck");                  // first receiver, behind the pod
  s += tag(330, 356, "10 STANDS BEHIND THE POD");

  s += player(470, 316, "12", "bck");
  s += run("M 492 306 C 550 296, 590 278, 624 262");   // 12 in to resource

  s += player(232, 352, "11", "bck");
  s += player(690, 326, "13", "bck");
  s += player(800, 378, "15", "bck");
  s += player(952, 340, "14", "bck");
  return s;
}

// ------------------------------------------------------------------- phase 2
// Pod races round ruck 1 and carries into ruck 2 — Rhino.
function phase2() {
  let s = "";
  s += ruck(238, 216, "RUCK 1");
  s += player(302, 242, "9", "bck");

  // 6 and 8 race round the ruck to reload in front of 10
  s += fold("M 212 244 C 250 340, 356 336, 428 258");
  s += fold("M 244 252 C 286 356, 400 350, 472 258");
  s += tag(256, 372, "FORWARDS RACE ROUND");
  s += player(452, 234, "6", "fwd");
  s += player(500, 234, "8", "fwd");
  s += pass("M 328 240 L 424 236");
  s += run("M 522 242 C 566 258, 596 250, 616 242");
  s += ruck(686, 240, "RUCK 2");
  s += tag(556, 196, "RHINO");

  s += player(486, 322, "10", "bck");
  s += player(604, 344, "12", "bck");

  // Hooker and props hang back for width on the next phase, and the blind
  s += player(110, 306, "2", "fwd");
  s += player(158, 334, "1", "fwd");
  s += player(206, 358, "3", "fwd");
  s += tag(56, 406, "STAY BACK FOR WIDTH + BLIND");

  s += player(128, 252, "11", "bck");
  s += player(726, 330, "13", "bck");
  s += player(846, 386, "15", "bck");
  s += player(976, 344, "14", "bck");
  return s;
}

// -------------------------------------------------------- phase 2, Hippo option
// 10 wants it a phase early: the pod runs as a dummy, ball goes behind to 10.
function phase2Hippo() {
  let s = "";
  s += ruck(238, 216, "RUCK 1");
  s += player(302, 242, "9", "bck");

  // Pod already reloaded in front of 10 — they run the same line, without the ball
  s += player(452, 234, "6", "fwd");
  s += player(500, 234, "8", "fwd");
  s += run("M 470 254 C 512 288, 556 286, 588 272", "10 10");
  s += run("M 522 242 C 566 258, 596 250, 616 242", "10 10");
  s += tag(560, 196, "DUMMY RUN — NO BALL");

  s += pass("M 328 256 L 436 308");                   // 9 behind the pod to 10
  s += player(470, 320, "10", "bck");
  s += tag(322, 380, "HIPPO — BALL BEHIND THE POD");
  s += pass("M 500 330 L 690 356");                   // 10 away
  s += player(722, 362, "13", "bck");
  s += run("M 742 352 C 782 322, 822 306, 858 298");

  s += player(110, 300, "2", "fwd");
  s += player(158, 330, "1", "fwd");
  s += player(206, 356, "3", "fwd");

  s += player(128, 252, "11", "bck");
  s += player(618, 392, "12", "bck");
  s += player(852, 392, "15", "bck");
  s += player(990, 348, "14", "bck");
  return s;
}

// ------------------------------------------------------------------- phase 3
// Backs edge attack off 10.
function phase3() {
  let s = "";
  s += ruck(250, 216, "RUCK 2");
  s += player(316, 240, "9", "bck");
  s += pass("M 342 248 L 436 296");
  s += player(468, 306, "10", "bck");
  s += pass("M 498 314 L 596 332");
  s += player(628, 340, "12", "bck");
  s += pass("M 658 348 L 742 362");
  s += player(774, 368, "13", "bck");
  s += pass("M 800 360 L 966 300");
  s += player(1000, 288, "14", "bck");
  s += player(836, 398, "15", "bck");
  s += run("M 854 388 C 888 368, 912 358, 936 350");
  s += tag(400, 190, "BACKS EDGE ATTACK");

  s += player(128, 252, "11", "bck");
  s += player(110, 306, "2", "fwd");
  s += player(158, 334, "1", "fwd");
  s += player(206, 358, "3", "fwd");
  s += fold("M 232 348 C 322 374, 412 388, 500 392");
  s += tag(528, 400, "FOLLOW FOR WIDTH");
  return s;
}

const OUT = process.argv[2] || ".";
const files = {
  "5man_rhino_phase1": [phase1(), true],
  "5man_rhino_phase2": [phase2(), false],
  "5man_rhino_phase2_hippo": [phase2Hippo(), false],
  "5man_rhino_phase3": [phase3(), false],
};
for (const [name, [body, lines]] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, `${name}.svg`), svg(body, lines));
  fs.writeFileSync(
    path.join(OUT, `${name}.html`),
    `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#fff}svg{display:block}</style>${svg(body, lines)}`,
  );
}
console.log("wrote", Object.keys(files).join(", "));
