/* 医療事務用語ドリル: 分野別ミニテスト（test.html）と略語クイズ（abbr.html）。
   用語データは terms.js（build.py が生成）の window.SITE_TERMS、ミニテストの問題数は window.SITE_TEST */
(function () {
  const root = document.getElementById("drill");
  if (!root) return;
  const FIELD = window.SITE_FIELDS;
  const TERMS = window.SITE_TERMS;
  const KANA = ["ア", "イ", "ウ", "エ"];

  /* ---------- 保存（ホームの学習機能と同じ場所に記録する） ---------- */
  function load(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v && typeof v === "object" ? v : d; } catch (e) { return d; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  const known = load("iryo-drill-v1", {});
  const weak = load("iryo-drill-weak", {});
  function record(t, ok) {
    if (ok) { known[t.term] = 1; delete weak[t.term]; } else { delete known[t.term]; weak[t.term] = 1; }
    store("iryo-drill-v1", known); store("iryo-drill-weak", weak);
  }

  /* ---------- 文字列 ---------- */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const link = (t) => `terms/${t.id}.html`;
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function aliases(term) {
    const out = new Set([term]);
    const m = term.match(/^(.*?)[（(](.*?)[)）](.*)$/);
    if (m) { out.add((m[1] + m[3]).trim()); m[2].split(/[、,]/).forEach((s) => out.add(s.trim())); }
    [...out].forEach((a) => a.split(/\s*\/\s*/).forEach((s) => out.add(s.trim())));
    return [...out].filter(Boolean);
  }
  /* 「AとB」の形の用語は、AとBも隠す（「の」を含む用語は分けない） */
  function maskWords(term) {
    const out = new Set(aliases(term));
    [...out].forEach((a) => { if (!a.includes("の") && a.includes("と")) a.split(/\s*と\s*/).forEach((p) => { if (p.trim() !== "AI") out.add(p.trim()); }); });
    return [...out].filter((a) => a.length >= 2);
  }
  function masked(t) {
    let d = t.desc;
    maskWords(t.term).sort((a, b) => b.length - a.length).forEach((a) => { d = d.split(a).join("〇〇"); });
    return d;
  }
  /* 同じ小分類 → 同じ分野 → 全体の順に、ひっかけの選択肢を3つ選ぶ */
  function distractors(t, src) {
    const same = shuffle(src.filter((x) => x.id !== t.id && x.sub === t.sub));
    const field = shuffle(src.filter((x) => x.id !== t.id && x.sub !== t.sub && x.f === t.f));
    const rest = shuffle(src.filter((x) => x.id !== t.id && x.f !== t.f));
    return [...same, ...field, ...rest].slice(0, 3);
  }
  const pct = (c, n) => n ? Math.round((c / n) * 100) : 0;
  const focusTop = () => root.scrollIntoView({ block: "start", behavior: "smooth" });

  /* ============ 分野別ミニテスト ============ */
  function initTest() {
    const COUNTS = window.SITE_TEST;
    let test = null;

    function renderStart() {
      const hist = load("iryo-drill-test", { list: [] }).list || [];
      const total = Object.values(COUNTS).reduce((a, b) => a + b, 0);
      const rows = hist.slice(-5).reverse().map((h) => `<tr><td class="mono">${esc(h.d)}</td><td class="mono">${h.c}/${h.n}</td>${Object.keys(FIELD).map((k) => `<td class="mono">${h.f[k] ? pct(h.f[k][0], h.f[k][1]) + "%" : "-"}</td>`).join("")}</tr>`).join("");
      root.innerHTML = `
        <div class="result">
          <div class="score" style="font-size:1.6rem;line-height:1.4">${total}問のミニテスト</div>
          <p style="margin:0">${Object.entries(COUNTS).map(([k, n]) => `${FIELD[k]} ${n}問`).join("・")}</p>
          <div class="cta-row" style="justify-content:center"><button class="btn primary" type="button" id="start">テストを始める</button></div>
        </div>
        ${rows ? `<h2>これまでの結果（最近5回）</h2><div class="table-scroll"><table class="score-table"><thead><tr><th>日付</th><th>正解</th>${Object.values(FIELD).map((v) => `<th>${v}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>` : ""}`;
      document.getElementById("start").onclick = start;
    }

    function start() {
      const qs = [];
      Object.entries(COUNTS).forEach(([k, n]) => {
        const src = TERMS.filter((t) => t.f === k);
        shuffle(src).slice(0, n).forEach((t) => qs.push({ t, choices: shuffle([t, ...distractors(t, TERMS)]), picked: null }));
      });
      test = { qs, i: 0 };
      renderQ();
      focusTop();
    }

    function renderQ() {
      const q = test.qs[test.i], n = test.qs.length;
      const answered = test.qs.filter((x) => x.picked !== null).length;
      const chips = test.qs.map((x, k) => `<button type="button" class="pchip${x.picked !== null ? " done" : ""}" data-go="${k}" aria-pressed="${k === test.i}" aria-label="問${k + 1}${x.picked !== null ? "（解答済み）" : ""}">${k + 1}</button>`).join("");
      root.innerHTML = `
        <div class="meta"><span class="mono">問${test.i + 1} / ${n}</span><span>解答済み <span class="mono">${answered}</span></span></div>
        <div class="pchips">${chips}</div>
        <div class="question"><div class="q">${FIELD[q.t.f]}</div><p>${esc(masked(q.t))}</p></div>
        <div class="choices">${q.choices.map((c, k) => `<button class="choice${q.picked === k ? " picked" : ""}" type="button" data-k="${k}"><span class="oval">${KANA[k]}</span><span>${esc(c.term)}</span></button>`).join("")}</div>
        <div class="pnav">
          <button class="btn ghost" type="button" id="prev" ${test.i === 0 ? "disabled" : ""}>前の問題</button>
          ${answered === n ? `<button class="btn primary" type="button" id="finish">採点する</button>` : `<button class="btn ghost" type="button" id="next" ${test.i === n - 1 ? "disabled" : ""}>次の問題</button>`}
        </div>
        <div class="kbd">1〜4 で解答</div>`;
      root.querySelectorAll(".choice").forEach((b) => b.onclick = () => pick(+b.dataset.k));
      root.querySelectorAll("[data-go]").forEach((b) => b.onclick = () => { test.i = +b.dataset.go; renderQ(); });
      document.getElementById("prev").onclick = () => { test.i--; renderQ(); };
      const next = document.getElementById("next");
      if (next) next.onclick = () => { test.i++; renderQ(); };
      const fin = document.getElementById("finish");
      if (fin) fin.onclick = finish;
    }

    function pick(k) {
      const q = test.qs[test.i];
      if (!q || !q.choices[k]) return;
      q.picked = k;
      /* 次のまだ答えていない問題へ進む */
      const rest = test.qs.findIndex((x, j) => j > test.i && x.picked === null);
      const any = test.qs.findIndex((x) => x.picked === null);
      if (rest >= 0) test.i = rest; else if (any >= 0) test.i = any;
      renderQ();
    }

    function finish() {
      const by = {};
      let c = 0;
      test.qs.forEach((q) => {
        const ok = q.choices[q.picked].id === q.t.id;
        record(q.t, ok);
        if (ok) c++;
        by[q.t.f] = by[q.t.f] || [0, 0];
        by[q.t.f][1]++;
        if (ok) by[q.t.f][0]++;
      });
      const n = test.qs.length;
      const hist = load("iryo-drill-test", { list: [] });
      const d = new Date();
      hist.list = (hist.list || []).concat([{ d: `${d.getMonth() + 1}/${d.getDate()}`, c, n, f: by }]).slice(-20);
      store("iryo-drill-test", hist);

      const keys = Object.keys(FIELD).filter((k) => by[k]);
      const low = Math.min(...keys.map((k) => pct(by[k][0], by[k][1])));
      const weakest = keys.filter((k) => pct(by[k][0], by[k][1]) === low);
      const bars = keys.map((k) => {
        const p = pct(by[k][0], by[k][1]);
        return `<div class="fscore${weakest.includes(k) && low < 100 ? " low" : ""}"><span class="top"><span>${FIELD[k]}</span><span class="mono">${by[k][0]}/${by[k][1]}（${p}%）</span></span><span class="bar"><i style="width:${p}%"></i></span></div>`;
      }).join("");
      const advice = low === 100 ? "すべての分野で全問正解です。新しい問題でもう一度挑戦してみましょう。"
        : `いちばん正答率が低いのは<b>${weakest.map((k) => FIELD[k]).join("・")}</b>です。本番は分野ごとに基準点があるので、この分野の用語を重点的に復習しましょう。`;
      const list = test.qs.map((q, k) => {
        const ok = q.choices[q.picked].id === q.t.id;
        return `<li class="${ok ? "ok" : "ng"}"><span class="mark">${ok ? "○" : "×"}</span><div><b>問${k + 1}</b> <a href="${link(q.t)}">${esc(q.t.term)}</a><small>${FIELD[q.t.f]}・${esc(q.t.sub)}</small>
          ${ok ? "" : `<p>あなたの答え: ${esc(q.choices[q.picked].term)}</p>`}<p class="d">${esc(q.t.desc)}</p></div></li>`;
      }).join("");
      root.innerHTML = `
        <div class="result">
          <div>結果</div>
          <div class="score">${c}<span> / ${n} 問正解（${pct(c, n)}%）</span></div>
          <div class="fscores">${bars}</div>
          <p style="margin:0;text-align:left">${advice}</p>
          <div class="cta-row" style="justify-content:center">
            <button class="btn primary" type="button" id="again">新しい問題でもう一度</button>
            ${c < n ? `<a class="btn" href="index.html#review">間違えた用語を復習する</a>` : ""}
          </div>
        </div>
        <h2>答え合わせ</h2>
        <ul class="answers">${list}</ul>`;
      document.getElementById("again").onclick = start;
      test = null;
      focusTop();
    }

    document.addEventListener("keydown", (e) => {
      if (!test || e.target.tagName === "INPUT") return;
      if (["1", "2", "3", "4"].includes(e.key)) pick(+e.key - 1);
    });
    renderStart();
  }

  /* ============ 略語クイズ ============ */
  function initAbbr() {
    const ABBRS = TERMS.filter((t) => t.abbr);
    const prefs = Object.assign({ dir: "a2d", field: "all" }, load("iryo-drill-abbr", {}));
    let quiz = null;

    const pool = () => prefs.field === "all" ? ABBRS : ABBRS.filter((t) => t.f === prefs.field);
    function toolbar() {
      const fields = [["all", "すべて"], ...Object.entries(FIELD)].filter(([k]) => k === "all" || ABBRS.filter((t) => t.f === k).length >= 4);
      return `<div class="toolbar">
        <div class="seg" role="group" aria-label="出題の向き">
          <button type="button" data-dir="a2d" aria-pressed="${prefs.dir === "a2d"}">略語 → 意味</button>
          <button type="button" data-dir="f2a" aria-pressed="${prefs.dir === "f2a"}">正式名 → 略語</button>
        </div>
        <div class="seg" role="group" aria-label="分野">${fields.map(([k, v]) => `<button type="button" data-field="${k}" aria-pressed="${prefs.field === k}">${v.replace("系", "")}</button>`).join("")}</div>
      </div>`;
    }
    function newQuiz() {
      const p = pool();
      const order = [...shuffle(p.filter((t) => !known[t.term])), ...shuffle(p.filter((t) => known[t.term]))];
      quiz = { qs: order.slice(0, 10).map((t) => ({ t, choices: shuffle([t, ...distractors(t, p.length >= 4 ? p : ABBRS)]), picked: null })), i: 0, score: 0 };
    }
    function render() {
      const q = quiz.qs[quiz.i];
      if (!q) return renderEnd();
      const done = q.picked !== null;
      const a2d = prefs.dir === "a2d";
      const stem = a2d ? `<div class="qterm">${esc(q.t.term)}</div><p class="muted">この略語の意味はどれか。</p>`
                       : `<div class="qterm" lang="en">${esc(q.t.abbr)}</div><p class="muted">この正式名の略語はどれか。</p>`;
      const label = (c) => a2d ? esc(c.id === q.t.id ? masked(c) : c.desc) : esc(c.term);
      let explain = "";
      if (done) {
        const c = q.choices[q.picked];
        explain = `<div class="explain"><b>${esc(q.t.term)}</b>（<span lang="en">${esc(q.t.abbr)}</span>）: ${esc(q.t.desc)}`
          + (c.id !== q.t.id ? `<br>選んだのは <b>${esc(c.term)}</b>（<span lang="en">${esc(c.abbr)}</span>）です。` : "") + `</div>`;
      }
      root.innerHTML = `${toolbar()}
        <div class="meta"><span class="mono">問${quiz.i + 1} / ${quiz.qs.length}</span><span>正解 <span class="mono">${quiz.score}</span></span></div>
        <div class="question"><div class="q">${FIELD[q.t.f]}・${esc(q.t.sub)}</div>${stem}</div>
        <div class="choices">${q.choices.map((c, k) => {
          const cls = done && c.id === q.t.id ? "correct" : done && k === q.picked ? "wrong" : "";
          return `<button class="choice ${cls}" type="button" data-k="${k}" ${done ? "disabled" : ""}><span class="oval">${KANA[k]}</span><span>${label(c)}</span></button>`;
        }).join("")}</div>
        ${done ? `${explain}<button class="btn primary" type="button" id="next">${quiz.i + 1 < quiz.qs.length ? "次の問題" : "結果を見る"}</button>` : ""}
        <div class="kbd">1〜4 で解答 / Enter で次へ</div>`;
      bindToolbar();
      root.querySelectorAll(".choice").forEach((b) => b.onclick = () => pick(+b.dataset.k));
      if (done) { const nx = document.getElementById("next"); nx.onclick = () => { quiz.i++; render(); }; nx.focus({ preventScroll: true }); }
    }
    function pick(k) {
      const q = quiz.qs[quiz.i];
      if (!q || q.picked !== null || !q.choices[k]) return;
      q.picked = k;
      const ok = q.choices[k].id === q.t.id;
      if (ok) quiz.score++;
      record(q.t, ok);
      render();
    }
    function renderEnd() {
      const miss = quiz.qs.filter((x) => x.choices[x.picked].id !== x.t.id).map((x) => x.t);
      root.innerHTML = `${toolbar()}
        <div class="result"><div>結果</div><div class="score">${quiz.score}<span> / ${quiz.qs.length} 問正解</span></div>
        ${miss.length ? `<ul class="misses">${miss.map((t) => `<li><a href="${link(t)}">${esc(t.term)}</a>（<span lang="en">${esc(t.abbr)}</span>）: ${esc(t.desc)}</li>`).join("")}</ul>` : "<div>全問正解です</div>"}
        <button class="btn primary" type="button" id="again">次の10問</button></div>`;
      bindToolbar();
      document.getElementById("again").onclick = () => { newQuiz(); render(); };
    }
    function bindToolbar() {
      root.querySelectorAll("[data-dir]").forEach((b) => b.onclick = () => { prefs.dir = b.dataset.dir; store("iryo-drill-abbr", prefs); newQuiz(); render(); });
      root.querySelectorAll("[data-field]").forEach((b) => b.onclick = () => { prefs.field = b.dataset.field; store("iryo-drill-abbr", prefs); newQuiz(); render(); });
    }
    document.addEventListener("keydown", (e) => {
      if (!quiz || e.target.tagName === "INPUT") return;
      const tag = e.target.tagName;
      if (tag === "A" || (tag === "BUTTON" && (e.key === "Enter" || e.key === " "))) return;
      const q = quiz.qs[quiz.i];
      if (!q) return;
      if (["1", "2", "3", "4"].includes(e.key)) pick(+e.key - 1);
      else if (e.key === "Enter" && q.picked !== null) { quiz.i++; render(); }
    });
    if (prefs.field !== "all" && pool().length < 4) prefs.field = "all";
    newQuiz();
    render();
  }

  if (root.dataset.drill === "test") initTest();
  else if (root.dataset.drill === "abbr") initAbbr();
})();
