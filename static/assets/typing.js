/* 用語タイピング（typing.html）。用語ドリルの各サイトで同じファイルを使う。
   用語は terms.js（window.SITE_TERMS、FE は window.FE_TERMS、ITパスポートは window.IP_TERMS）の y（読み）を打つ。
   練習: 用語・読み・ローマ字・意味が出る。腕だめし: 意味だけを見て、用語を思い出して打つ。
   意味も打つ: 用語のあとに、意味の要点（terms.js の mt＝画面に出す文、my＝打つ読み）も打つ。データがないサイトでは出さない。
   制限時間は TIMES から選ぶ。 */
(function () {
  "use strict";
  const root = document.getElementById("typing");
  const TERMS = (window.SITE_TERMS || window.FE_TERMS || window.IP_TERMS || []).filter((t) => t.y);
  if (!root) return;
  if (!TERMS.length) {
    // サイトを新しくした直後は、保存してある古い terms.js（読みがない）が使われることがある
    root.innerHTML = '<p class="empty">用語のデータが古いままです。ページを再読み込みしてください（直らないときは、もう一度）。</p>';
    return;
  }
  const FIELDS = window.SITE_FIELDS || JSON.parse(root.dataset.fields || "{}");
  const TIMES = [30, 60, 90, 120, 180];
  const HAS_IMI = TERMS.some((t) => t.my);
  const REL = document.body.dataset.root || "";

  function load(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v && typeof v === "object" ? v : d; } catch (e) { return d; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  // ---------- ローマ字の表 ----------
  const R = {};
  function add(kana, list) { R[kana] = list.split(" "); }
  [["あいうえお", "a i u e o"], ["かきくけこ", "ka ki ku ke ko"], ["さしすせそ", "sa si su se so"], ["たちつてと", "ta ti tu te to"],
   ["なにぬねの", "na ni nu ne no"], ["はひふへほ", "ha hi hu he ho"], ["まみむめも", "ma mi mu me mo"], ["やゆよ", "ya yu yo"],
   ["らりるれろ", "ra ri ru re ro"], ["わを", "wa wo"], ["がぎぐげご", "ga gi gu ge go"], ["ざじずぜぞ", "za zi zu ze zo"],
   ["だぢづでど", "da di du de do"], ["ばびぶべぼ", "ba bi bu be bo"], ["ぱぴぷぺぽ", "pa pi pu pe po"]]
    .forEach(([ks, rs]) => { const r = rs.split(" "); [...ks].forEach((k, i) => add(k, r[i])); });
  // よく使う別の打ち方（先頭がおすすめとして表示される）
  Object.assign(R, { "い": ["i", "yi"], "う": ["u", "wu", "whu"], "か": ["ka", "ca"], "く": ["ku", "cu", "qu"], "こ": ["ko", "co"],
    "し": ["shi", "si", "ci"], "せ": ["se", "ce"], "ち": ["chi", "ti"], "つ": ["tsu", "tu"], "ふ": ["hu", "fu"], "じ": ["zi", "ji"],
    "ゔ": ["vu"], "ー": ["-"] });
  [["ぁぃぅぇぉ", "a i u e o"], ["ゃゅょ", "ya yu yo"]].forEach(([ks, rs]) => {
    const r = rs.split(" "); [...ks].forEach((k, i) => { R[k] = ["x" + r[i], "l" + r[i]]; });
  });
  R["ゎ"] = ["xwa", "lwa"]; R["っ"] = ["xtu", "ltu", "xtsu", "ltsu"];
  // 2文字で1つになるもの（きゃ・しゃ・ふぁ など）
  const Y = { "き": ["ky"], "ぎ": ["gy"], "し": ["sh", "sy"], "じ": ["zy", "j", "jy"], "ち": ["ch", "ty", "cy"], "ぢ": ["dy"], "に": ["ny"],
    "ひ": ["hy"], "び": ["by"], "ぴ": ["py"], "み": ["my"], "り": ["ry"] };
  for (const k in Y) [["ゃ", "a"], ["ゅ", "u"], ["ょ", "o"]].forEach(([s, v]) => { R[k + s] = Y[k].map((c) => c + v); });
  ["し", "じ", "ち"].forEach((k) => { R[k + "ぇ"] = Y[k].map((c) => c + "e"); });
  Object.assign(R, { "ふぁ": ["fa"], "ふぃ": ["fi"], "ふぇ": ["fe"], "ふぉ": ["fo"], "ふゅ": ["fyu"], "てぃ": ["thi"], "でぃ": ["dhi"],
    "でゅ": ["dhu"], "とぅ": ["twu"], "どぅ": ["dwu"], "うぃ": ["wi", "whi"], "うぇ": ["we", "whe"], "うぉ": ["who"], "つぁ": ["tsa"],
    "ゔぁ": ["va"], "ゔぃ": ["vi"], "ゔぇ": ["ve"], "ゔぉ": ["vo"], "くぁ": ["qa", "kwa"] });

  // 読みを「打つかたまり」に分ける。かたまりごとに、受け付ける打ち方の一覧を持つ
  function chunks(yomi) {
    const s = [...yomi], out = [];
    for (let i = 0; i < s.length;) {
      const two = s[i] + (s[i + 1] || "");
      if (s[i + 1] && R[two]) {
        // 「しゃ」は sha のほか、shi + xya のように分けても打てる
        const sep = R[s[i]].flatMap((a) => R[s[i + 1]].map((b) => a + b));
        out.push({ kana: two, opts: [...R[two], ...sep] }); i += 2;
      } else if (R[s[i]]) { out.push({ kana: s[i], opts: R[s[i]].slice() }); i += 1; }
      else if (s[i] === "ん") { out.push({ kana: "ん", opts: null }); i += 1; }
      else { out.push({ kana: s[i], opts: [s[i].toLowerCase()] }); i += 1; }
    }
    // 「ん」と「っ」は、次のかたまりを見て打ち方を決める
    for (let i = out.length - 1; i >= 0; i--) {
      const c = out[i], next = out[i + 1];
      if (c.kana === "ん") {
        const single = next && next.opts.every((o) => !/^[aiueony]/.test(o) && /^[a-z]/.test(o));
        c.opts = single ? ["n", "nn", "xn"] : ["nn", "xn"];
      } else if (c.kana === "っ" && next && /^[a-z]/.test(next.opts[0]) && !/^[aiueon]/.test(next.opts[0])) {
        // 次のかたまりとまとめて、子音を重ねる打ち方（kka）も受け付ける
        const dbl = next.opts.filter((o) => !/^[aiueon]/.test(o)).map((o) => o[0] + o);
        out.splice(i, 2, { kana: "っ" + next.kana, opts: [...dbl, ...R["っ"].flatMap((a) => next.opts.map((b) => a + b))] });
      }
    }
    return out;
  }

  // ---------- 状態 ----------
  const pref = load("typing-pref", {});
  const state = { mode: pref.mode || "practice", field: pref.field || "all",
    sec: TIMES.includes(pref.sec) ? pref.sec : 60, imi: HAS_IMI && pref.imi !== false,
    phase: "menu", deck: [], cur: null, idx: 0, buf: "", kanaBuf: "", typed: "", t0: 0, timer: 0,
    score: 0, words: 0, keys: 0, miss: 0, missedIds: new Set(), wordMiss: false, hintTo: 0, flash: "", passed: null };

  const fieldKeys = Object.keys(FIELDS).filter((f) => TERMS.some((t) => t.f === f));
  function pool() { return state.field === "all" ? TERMS : TERMS.filter((t) => t.f === state.field); }
  // 自己ベストは、遊び方・分野・制限時間・意味も打つかごとに分ける（60秒・用語だけは、前からの名前のまま）
  function bestKey() { return `typing-best-${state.mode}-${state.field}` + (state.sec !== 60 ? `-${state.sec}s` : "") + (state.imi ? "-imi" : ""); }

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function nextWord() {
    if (!state.deck.length) state.deck = shuffle(pool().slice());
    const t = state.deck.pop();
    state.cur = { t, ch: chunks(t.y), part: "term" };
    state.idx = 0; state.buf = ""; state.kanaBuf = ""; state.typed = ""; state.wordMiss = false; state.hintTo = 0;
  }
  // 用語を打ち終わったら、続けて意味の要点を打つ（ミスの記録は用語と合わせて1語として数える）
  function startImi() {
    state.cur.part = "imi"; state.cur.ch = chunks(state.cur.t.my);
    state.idx = 0; state.buf = ""; state.kanaBuf = ""; state.typed = ""; state.hintTo = 0;
  }

  // ---------- 打つ処理 ----------
  function feedKey(k) {
    if (state.phase !== "play") return;
    const ch = state.cur.ch;
    const c = ch[state.idx];
    const nb = state.buf + k;
    if (c.opts.some((o) => o.startsWith(nb))) {
      state.buf = nb; state.typed += k; state.keys++;
      if (c.opts.includes(nb) && !c.opts.some((o) => o !== nb && o.startsWith(nb))) finishChunk();
    } else if (c.opts.includes(state.buf)) {
      // 「n」で終われる「ん」のあとに次の文字が来たとき
      finishChunk(); if (state.phase === "play" && state.cur.ch === ch) feedKey(k);
      return;
    } else { mistake(); return; }
    render();
  }
  function feedKana(kana) {
    if (state.phase !== "play") return;
    const c = state.cur.ch[state.idx];
    const nb = state.kanaBuf + kana;
    if (c.kana.startsWith(nb)) {
      state.kanaBuf = nb; state.keys++;
      if (c.kana === nb) { state.typed += c.opts[0]; finishChunk(); }
    } else mistake();
    render();
  }
  function finishChunk() {
    // スコアは正しく打った読みの文字数（ヒントで見た文字は数えない）
    if (state.idx >= state.hintTo) state.score += [...state.cur.ch[state.idx].kana].length;
    state.idx++; state.buf = ""; state.kanaBuf = "";
    if (state.idx >= state.cur.ch.length) {
      if (state.cur.part === "term" && state.imi && state.cur.t.my) { flash("ok"); startImi(); return; }
      state.words++;
      if (state.wordMiss || state.hintTo) state.missedIds.add(state.cur.t.id);
      flash("ok"); nextWord();
    }
  }
  function mistake() {
    state.miss++; state.wordMiss = true; flash("ng"); render();
  }
  function pass() {
    if (state.phase !== "play") return;
    state.missedIds.add(state.cur.t.id);
    state.passed = { t: state.cur.t, part: state.cur.part }; clearTimeout(passTimer);
    passTimer = setTimeout(() => { state.passed = null; render(); }, 1800);
    nextWord(); render();
  }
  function hint() {
    if (state.phase !== "play" || state.mode !== "test" || state.cur.part !== "term") return;
    state.hintTo = Math.min(Math.max(state.hintTo, state.idx) + 1, state.cur.ch.length); render();
  }
  let flashTimer = 0, passTimer = 0;
  function flash(kind) {
    state.flash = kind; clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { state.flash = ""; const p = root.querySelector(".ty-play"); if (p) p.classList.remove("f-ok", "f-ng"); }, 250);
  }

  // ---------- 画面 ----------
  function rest(c, buf) {
    const o = c.opts.find((x) => x.startsWith(buf)) || c.opts[0];
    return o.slice(buf.length);
  }
  function wordHtml() {
    const { t, ch } = state.cur;
    const doneKana = ch.slice(0, state.idx).map((c) => c.kana).join("") + state.kanaBuf;
    const restKana = ch.slice(state.idx).map((c) => c.kana).join("").slice(state.kanaBuf.length);
    const romaRest = rest(ch[state.idx], state.buf) + ch.slice(state.idx + 1).map((c) => c.opts[0]).join("");
    const label = FIELDS[t.f] ? `${esc(FIELDS[t.f])}・${esc(t.sub)}` : esc(t.sub || "");
    const kanaLine = `<p class="ty-kana"><span class="done">${esc(doneKana)}</span>${esc(restKana)}</p>
        <p class="ty-roma"><span class="done">${esc(state.typed)}</span>${esc(romaRest)}</p>`;
    if (state.cur.part === "imi") {
      // 意味の要点: 練習でも腕だめしでも、文と読みを見て打つ
      return `<p class="ty-sub">${label}</p>
        <p class="ty-term ty-term-done">${esc(t.term)}<span class="ty-check" aria-label="打てた">✓</span></p>
        <p class="ty-part">意味を打とう</p>
        <p class="ty-imi">${esc(t.mt)}</p>
        ${kanaLine}
        <p class="ty-desc">${esc(t.desc)}</p>
        ${state.mode === "test" ? '<p class="ty-keys"><button type="button" class="btn ghost" data-act="pass">パス（Esc）</button></p>' : ""}`;
    }
    const next = state.imi && t.my ? '<p class="ty-next">このあと意味も打ちます</p>' : "";
    if (state.mode === "practice") {
      return `<p class="ty-sub">${label}</p>
        <p class="ty-term">${esc(t.term)}</p>
        ${kanaLine}${next}
        <p class="ty-desc">${esc(t.desc)}</p>`;
    }
    const shown = ch.slice(state.idx, state.hintTo).map((c) => c.kana).join("");
    const left = [...ch.slice(Math.max(state.idx, state.hintTo)).map((c) => c.kana).join("")].length;
    return `<p class="ty-sub">${label}</p>
      <p class="ty-desc big">${esc(masked(t))}</p>
      <p class="ty-kana"><span class="done">${esc(doneKana)}</span><span class="hint">${esc(shown.slice(state.kanaBuf.length))}</span>${"・".repeat(Math.max(0, left))}</p>
      <p class="ty-roma"><span class="done">${esc(state.typed)}</span></p>${next}
      <p class="ty-keys"><button type="button" class="btn ghost" data-act="hint">ヒント（Enter）</button><button type="button" class="btn ghost" data-act="pass">パス（Esc）</button></p>`;
  }
  // 腕だめしでは、意味の中に答えの用語が出てきたら「〇〇」で隠す
  function masked(t) {
    let d = t.desc;
    const names = [t.term, t.term.replace(/[（(].*?[)）]/g, "")].concat((t.term.match(/[（(](.*?)[)）]/) || [])[1] || []);
    names.filter((n) => n && n.length >= 2).sort((a, b) => b.length - a.length).forEach((n) => { d = d.split(n).join("〇〇"); });
    return d;
  }

  function menuHtml() {
    const best = load(bestKey(), null);
    const fieldBtns = [["all", `すべて（${TERMS.length}語）`]].concat(fieldKeys.map((f) => [f, `${FIELDS[f]}（${TERMS.filter((t) => t.f === f).length}語）`]))
      .map(([k, v]) => `<button type="button" class="ty-chip" data-field="${k}" aria-pressed="${state.field === k}">${esc(v)}</button>`).join("");
    const modeBtns = [["practice", "練習", "用語と読みを見て打つ"], ["test", "腕だめし", "意味を見て、用語を思い出して打つ"]]
      .map(([k, b, s]) => `<button type="button" class="ty-mode" data-mode="${k}" aria-pressed="${state.mode === k}"><b>${b}</b><small>${s}</small></button>`).join("");
    const imiBtns = [[true, "する"], [false, "しない（用語だけ）"]]
      .map(([v, s]) => `<button type="button" class="ty-chip" data-imi="${v ? 1 : 0}" aria-pressed="${state.imi === v}">${s}</button>`).join("");
    const secBtns = TIMES.map((s) => `<button type="button" class="ty-chip" data-sec="${s}" aria-pressed="${state.sec === s}">${s}秒</button>`).join("");
    return `<div class="ty-menu">
      <p class="label">遊び方</p><div class="ty-modes">${modeBtns}</div>
      ${HAS_IMI ? `<p class="label">意味も打つ</p><div class="ty-chips">${imiBtns}</div>` : ""}
      <p class="label">制限時間</p><div class="ty-chips">${secBtns}</div>
      <p class="label">分野</p><div class="ty-chips">${fieldBtns}</div>
      <p class="ty-best">${best && best.score ? `自己ベスト: <b>${best.score}文字</b>（${best.words}語）` : "まだ記録はありません"}</p>
      <button type="button" class="btn primary ty-start" data-act="start">スタート（スペースキー）</button>
      <p class="muted">${state.sec}秒で何語打てるか挑戦します。${state.imi ? "用語を打ったあとに、意味の要点も打ちます。" : ""}ローマ字入力は半角英数で打ってください（スマホは、ひらがなのキーボードでも打てます）。</p>
    </div>`;
  }

  function resultHtml() {
    const kps = (state.keys / state.sec).toFixed(1);
    const acc = state.keys + state.miss ? Math.round((state.keys / (state.keys + state.miss)) * 100) : 0;
    const missed = TERMS.filter((t) => state.missedIds.has(t.id));
    const list = missed.map((t) => `<li><a href="${REL}terms/${t.id}.html">${esc(t.term)}</a><span>${esc(t.y)}</span>`
      + (t.mt ? `<small class="ty-m">${esc(t.mt)}</small>` : "") + `</li>`).join("");
    return `<div class="ty-result">
      <p class="ty-mode-name">${state.mode === "practice" ? "練習" : "腕だめし"}・${esc(state.field === "all" ? "すべて" : FIELDS[state.field])}・${state.sec}秒${state.imi ? "・意味も打つ" : ""}</p>
      ${state.newBest ? '<p class="ty-new">自己ベスト更新！</p>' : ""}
      <p class="ty-total"><small>スコア</small><b class="mono">${state.score}</b><small>文字</small></p>
      <dl class="ty-score"><div><dt>打てた用語</dt><dd>${state.words}<small>語</small></dd></div><div><dt>正しく打った数</dt><dd>${state.keys}<small>打鍵</small></dd></div>
        <div><dt>ミス</dt><dd>${state.miss}<small>回</small></dd></div><div><dt>1秒あたり</dt><dd>${kps}<small>打鍵</small></dd></div><div><dt>正確さ</dt><dd>${acc}<small>%</small></dd></div></dl>
      ${missed.length ? `<h2>ミス・パスした用語（${missed.length}語）</h2><ul class="ty-missed">${list}</ul>` : ""}
      <p class="ty-again"><button type="button" class="btn primary" data-act="start">もう一度（スペースキー）</button><button type="button" class="btn" data-act="menu">遊び方・分野を変える</button></p>
    </div>`;
  }

  function render() {
    let html;
    if (state.phase === "menu") html = menuHtml();
    else if (state.phase === "result") html = resultHtml();
    else {
      const left = Math.max(0, Math.ceil(state.sec - (performance.now() - state.t0) / 1000));
      const pt = state.passed && state.passed.t;
      const passed = !pt ? "" : state.passed.part === "imi"
        ? `<p class="ty-passed">${esc(pt.term)} の意味: <b>${esc(pt.mt)}</b></p>`
        : `<p class="ty-passed">答え: <b>${esc(pt.term)}</b>（${esc(pt.y)}）${pt.mt ? `… ${esc(pt.mt)}` : ""}</p>`;
      html = `<div class="ty-play ${state.flash ? "f-" + state.flash : ""}">
        <div class="ty-bar"><span>残り <b class="mono ty-left">${left}</b> 秒</span><span>スコア <b class="mono">${state.score}</b></span><span><b class="mono">${state.words}</b> 語</span><span>ミス <b class="mono">${state.miss}</b></span></div>
        <div class="ty-time"><i style="width:${(left / state.sec) * 100}%"></i></div>
        ${passed}<div class="ty-word">${wordHtml()}</div>
        <p class="ty-keys muted">打つ欄が見えないときは、ここを押すとキーボードが出ます。</p>
      </div>`;
    }
    root.querySelector(".ty-view").innerHTML = html;
  }

  function start() {
    state.phase = "play"; state.deck = []; state.score = 0; state.words = 0; state.keys = 0; state.miss = 0; state.missedIds = new Set();
    state.newBest = false; state.passed = null; state.flash = "";
    store("typing-pref", { mode: state.mode, field: state.field, sec: state.sec, imi: state.imi });
    nextWord(); state.t0 = performance.now();
    clearInterval(state.timer);
    state.timer = setInterval(tick, 200);
    render(); focusInput();
  }
  // 残り時間だけを書き換える（画面全体を作り直すと、ボタンが押しにくくなるため）
  function tick() {
    const ms = state.sec * 1000 - (performance.now() - state.t0);
    if (ms <= 0) { end(); return; }
    const l = root.querySelector(".ty-left"), bar = root.querySelector(".ty-time i");
    if (l) l.textContent = Math.ceil(ms / 1000);
    if (bar) bar.style.width = (ms / state.sec / 10) + "%";
  }
  function end() {
    clearInterval(state.timer);
    // 時間切れのときに打っていた用語も、ミスやヒントがあれば一覧に入れる
    if (state.cur && (state.wordMiss || state.hintTo)) state.missedIds.add(state.cur.t.id);
    const best = load(bestKey(), null);
    if (state.score && (!best || !best.score || state.score > best.score)) {
      store(bestKey(), { score: state.score, words: state.words }); state.newBest = true;
    }
    state.phase = "result"; render();
    if (window.gtag) gtag("event", "typing_finish", { mode: state.mode, field: state.field, seconds: state.sec, meaning: state.imi ? 1 : 0, words: state.words, score: state.score });
  }

  // ---------- 入力 ----------
  root.innerHTML = `<div class="ty-view"></div><input class="ty-input" type="text" inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="ここに打つ">`;
  const input = root.querySelector(".ty-input");
  function focusInput() { try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); } }
  const toHira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (state.phase !== "play") {
      const tag = e.target === input ? "" : e.target.tagName;
      if (e.key === " " && state.phase !== "play" && !/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(tag)) {
        e.preventDefault(); start();
      }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); pass(); return; }
    if (e.key === "Enter") { e.preventDefault(); hint(); return; }
    if (e.key.length === 1 && /[ -~]/.test(e.key) && !e.isComposing) {
      e.preventDefault(); feedKey(e.key.toLowerCase()); return;
    }
  });
  // スマホのキーボード（keydown で文字がわからない）と、かな入力
  function takeInput() {
    const v = input.value; input.value = "";
    for (const c of v) {
      if (/[ぁ-ゖァ-ヶー]/.test(c)) feedKana(toHira(c));
      else if (/[ -~]/.test(c) && c !== " ") feedKey(c.toLowerCase());
    }
  }
  input.addEventListener("input", (e) => { if (!e.isComposing) takeInput(); });
  input.addEventListener("compositionend", () => setTimeout(takeInput, 0));

  root.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) { if (state.phase === "play") focusInput(); return; }
    if (b.dataset.mode) { state.mode = b.dataset.mode; render(); }
    else if (b.dataset.field) { state.field = b.dataset.field; render(); }
    else if (b.dataset.sec) { state.sec = Number(b.dataset.sec); render(); }
    else if (b.dataset.imi) { state.imi = b.dataset.imi === "1"; render(); }
    else if (b.dataset.act === "start") start();
    else if (b.dataset.act === "menu") { state.phase = "menu"; render(); }
    else if (b.dataset.act === "pass") { pass(); focusInput(); }
    else if (b.dataset.act === "hint") { hint(); focusInput(); }
  });
  render();
})();
