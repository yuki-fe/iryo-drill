/* 医療事務用語ドリル: ホームの学習機能。用語データは terms.js（build.py が生成）の window.SITE_TERMS */
(function () {
  const FIELD = window.SITE_FIELDS;
  const TERMS = window.SITE_TERMS.map((t, i) => ({ ...t, n: i }));
  const KANA = ["ア", "イ", "ウ", "エ"];
  const MODES = [
    { id: "card", name: "カード", cap: "めくって覚える", title: "カード", sub: "タップで裏返し、覚えたかどうかを仕分けます" },
    { id: "quiz", name: "4択", cap: "ア〜エから選ぶ", title: "4択クイズ", sub: "10問ずつ。覚えていない用語から出ます" },
    { id: "type", name: "書いて答える", short: "書く", cap: "意味から用語を入力", title: "書いて答える", sub: "説明を読んで用語を入力します。ひらがなや英字の略語でも答えられます" },
    { id: "review", name: "復習", cap: "間違えた用語だけ", title: "復習", sub: "「まだ」を押した用語や間違えた用語を、まとめて学習します。正解すると復習リストから外れます" },
    { id: "list", name: "一覧", cap: "検索・チェック", title: "用語一覧", sub: "検索して、覚えた用語に印を付けられます" }
  ];
  const KINDS = [["card", "カード"], ["quiz", "4択"], ["type", "書いて答える"]];

  /* ---------- 保存 ---------- */
  function load(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v && typeof v === "object" ? v : d; } catch (e) { return d; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  let known = load("iryo-drill-v1", {});
  let weak = load("iryo-drill-weak", {});
  const prefs = Object.assign({ mode: "card", field: "all", cardDir: "d2t", quizDir: "d2t", reviewKind: "card" }, load("iryo-drill-prefs", {}));
  const hashMode = location.hash.slice(1);
  if (MODES.some((m) => m.id === hashMode)) prefs.mode = hashMode;
  if (!MODES.some((m) => m.id === prefs.mode)) prefs.mode = "card";
  if (prefs.field !== "all" && !FIELD[prefs.field]) prefs.field = "all";
  if (!KINDS.some(([k]) => k === prefs.reviewKind)) prefs.reviewKind = "card";
  const savePrefs = () => store("iryo-drill-prefs", prefs);
  const isKnown = (t) => !!known[t.term];
  const isWeak = (t) => !!weak[t.term];
  function saveProgress() { store("iryo-drill-v1", known); store("iryo-drill-weak", weak); renderFields(); updateWeakCount(); }
  /* 学習での答え: 正解・覚えた → 覚えた用語に、間違い・まだ → 復習リストに */
  function record(t, ok) {
    if (ok) { known[t.term] = 1; delete weak[t.term]; } else { delete known[t.term]; weak[t.term] = 1; }
    saveProgress();
  }
  /* 一覧での印の付け外し: 復習リストには入れない */
  function setKnown(t, v) {
    if (v) { known[t.term] = 1; delete weak[t.term]; } else delete known[t.term];
    saveProgress();
  }

  /* ---------- 文字列 ---------- */
  const $ = (s) => document.querySelector(s);
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
  function primary(term) {
    const m = term.match(/^(.*?)[（(].*?[)）](.*)$/);
    return (m ? m[1] + m[2] : term).split(/\s*\/\s*/)[0].trim();
  }
  const norm = (s) => s.normalize("NFKC").toLowerCase()
    .replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .replace(/[\s・･\-‐_/／]/g, "");
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

  let field = prefs.field, mode = prefs.mode, query = "";
  let deck = [], idx = 0, flipped = false, quiz = null, typing = null;
  const reviewing = () => mode === "review";
  const kind = () => reviewing() ? prefs.reviewKind : mode;
  const basePool = () => field === "all" ? TERMS : TERMS.filter((t) => t.f === field);
  const pool = () => reviewing() ? basePool().filter(isWeak) : basePool();
  const studyOrder = (p) => [...shuffle(p.filter((t) => !isKnown(t))), ...shuffle(p.filter(isKnown))];

  /* ---------- サイドバー ---------- */
  function renderModes() {
    $("#modes").innerHTML = MODES.map((m) => `
      <button class="mode" type="button" role="tab" data-mode="${m.id}" aria-selected="${m.id === mode}">
        <span class="bub" aria-hidden="true"></span><b><span class="nm${m.short ? " has-short" : ""}">${m.name}</span>${m.short ? `<span class="nm-short">${m.short}</span>` : ""}${m.id === "review" ? `<span class="count" id="weakCount"></span>` : ""}</b><small>${m.cap}</small>
      </button>`).join("");
    updateWeakCount();
  }
  function updateWeakCount() {
    const el = $("#weakCount");
    if (!el) return;
    const n = basePool().filter(isWeak).length;
    el.textContent = n ? String(n) : "";
    el.setAttribute("aria-label", `復習する用語 ${n}語`);
  }
  function renderFields() {
    const rows = [["all", "すべて", TERMS], ...Object.entries(FIELD).map(([k, v]) => [k, v, TERMS.filter((t) => t.f === k)])];
    $("#fields").innerHTML = rows.map(([k, v, list]) => {
      const n = list.filter(isKnown).length;
      return `<button class="frow" type="button" data-f="${k}" aria-pressed="${field === k}">
        <span class="top"><span>${v}</span><span class="mono">${n}/${list.length}</span></span>
        <span class="bar"><i style="width:${(n / list.length) * 100}%"></i></span>
      </button>`;
    }).join("");
  }
  function renderToolbar() {
    const m = MODES.find((x) => x.id === mode);
    let seg = "";
    if (reviewing()) {
      seg = `<div class="seg" role="group" aria-label="復習のしかた">${KINDS.map(([k, label]) =>
        `<button type="button" data-kind="${k}" aria-pressed="${prefs.reviewKind === k}">${label}</button>`).join("")}</div>`;
    } else if (mode === "card" || mode === "quiz") {
      const key = mode === "card" ? "cardDir" : "quizDir";
      seg = `<div class="seg" role="group" aria-label="出題の向き">
        <button type="button" data-dir="d2t" data-key="${key}" aria-pressed="${prefs[key] === "d2t"}">意味 → 用語</button>
        <button type="button" data-dir="t2d" data-key="${key}" aria-pressed="${prefs[key] === "t2d"}">用語 → 意味</button>
      </div>`;
    }
    $("#toolbar").innerHTML = `<h2>${m.title}<small>${m.sub}</small></h2>${seg}`;
  }

  function renderRoundEnd(head, big, unit, extra, btn, fn) {
    $("#panel").innerHTML = `<div class="result"><div>${head}</div><div class="score">${big}<span> ${unit}</span></div>${extra}<button class="btn primary" type="button" id="again2">${btn}</button></div>`;
    $("#again2").onclick = fn; $("#again2").focus({ preventScroll: true });
  }
  function missList(miss) {
    return miss.length ? `<ul class="misses">${miss.map((t) => `<li><a href="${link(t)}">${esc(t.term)}</a>: ${esc(t.desc)}</li>`).join("")}</ul>` : `<div>全問正解です</div>`;
  }
  /* 復習モードで1回分を終えたときの「続ける」ボタン */
  function reviewNext(fallbackLabel, fallback) {
    if (!reviewing()) return [fallbackLabel, fallback];
    const n = pool().length;
    return n ? [`続けて復習する（残り${n}語）`, start] : ["復習を終える", start];
  }
  function renderReviewEmpty() {
    const scope = field === "all" ? "" : `${FIELD[field]}の`;
    $("#panel").innerHTML = `
      <div class="result">
        <div class="score" style="font-size:1.35rem;line-height:1.4">復習する${scope}用語はありません</div>
        <p style="margin:0">カードで「まだ」を押した用語や、4択・書いて答えるで間違えた用語がここに集まります。<br>正解すると、復習リストから外れます。</p>
        <div class="cta-row" style="justify-content:center">
          <button class="btn primary" type="button" data-go="quiz">4択クイズをする</button>
          <button class="btn" type="button" data-go="card">カードで覚える</button>
        </div>
      </div>`;
    document.querySelectorAll("[data-go]").forEach((b) => b.onclick = () => { mode = b.dataset.go; refresh(); });
  }

  /* ---------- カード ---------- */
  function newDeck() { deck = studyOrder(pool()); idx = 0; flipped = false; }
  function renderCard() {
    const t = deck[idx];
    if (!t) { $("#panel").innerHTML = `<div class="empty">用語がありません</div>`; return; }
    const left = reviewing() ? `復習リスト 残り <span class="mono">${pool().length}</span>` : `まだ覚えていない用語 <span class="mono">${pool().filter((x) => !isKnown(x)).length}</span>`;
    const rev = prefs.cardDir === "d2t";
    const full = t.abbr ? `<div class="hint" lang="en">${esc(t.abbr)}</div>` : "";
    let body;
    if (!rev) body = `<div class="term">${esc(t.term)}</div>` + (flipped ? `${full}<div class="desc">${esc(t.desc)}</div>` : `<div class="hint">タップして意味を見る</div>`);
    else body = flipped ? `<div class="term">${esc(t.term)}</div>${full}<div class="desc">${esc(t.desc)}</div>`
                        : `<div class="desc big">${esc(masked(t))}</div><div class="hint">用語を思い浮かべてからタップ</div>`;
    $("#panel").innerHTML = `
      <div class="meta"><span class="mono">${idx + 1} / ${deck.length}</span><span>${left}</span></div>
      <div class="card" id="flashcard" tabindex="0" role="button" aria-label="カードを裏返す">
        ${isKnown(t) ? `<span class="known-badge">覚えた</span>` : ""}
        <span class="tag">${FIELD[t.f]}・${esc(t.sub)}</span>${body}
      </div>
      <div class="actions"><button class="btn again" type="button" id="again">まだ</button><button class="btn ok" type="button" id="ok">覚えた</button></div>
      <div class="kbd">Space で裏返す / ← まだ / → 覚えた</div>`;
    $("#flashcard").onclick = flip;
    $("#again").onclick = () => answerCard(false);
    $("#ok").onclick = () => answerCard(true);
  }
  function flip() { flipped = !flipped; renderCard(); $("#flashcard").focus({ preventScroll: true }); }
  function answerCard(ok) {
    record(deck[idx], ok); idx++; flipped = false;
    if (idx < deck.length) return renderCard();
    if (reviewing()) {
      const n = pool().length;
      return renderRoundEnd("1周しました", n, "語が復習リストに残っています", "", ...reviewNext());
    }
    renderRoundEnd("1周しました", pool().filter(isKnown).length, `/ ${pool().length} 覚えた`, "", "もう1周する", () => { newDeck(); renderCard(); });
  }

  /* ---------- 4択 ---------- */
  function newQuiz() {
    const p = pool(), all = basePool(), src = all.length >= 4 ? all : TERMS;
    quiz = { qs: studyOrder(p).slice(0, 10).map((t) => {
      const same = shuffle(src.filter((x) => x.id !== t.id && x.sub === t.sub));
      const rest = shuffle(src.filter((x) => x.id !== t.id && x.sub !== t.sub));
      return { t, choices: shuffle([t, ...[...same, ...rest].slice(0, 3)]), picked: null };
    }), i: 0, score: 0, dir: prefs.quizDir };
  }
  function renderQuiz() {
    const q = quiz.qs[quiz.i];
    if (!q) {
      const miss = quiz.qs.filter((x) => x.choices[x.picked].id !== x.t.id).map((x) => x.t);
      return renderRoundEnd("結果", quiz.score, `/ ${quiz.qs.length} 問正解`, missList(miss), ...reviewNext("次の10問", () => { newQuiz(); renderQuiz(); }));
    }
    const d2t = quiz.dir === "d2t", done = q.picked !== null;
    const stem = d2t ? `<p>${esc(masked(q.t))}</p>` : `<div class="qterm">${esc(q.t.term)}</div>`;
    const label = (c) => d2t ? esc(c.term) : esc(c.id === q.t.id ? masked(c) : c.desc);
    let explain = "";
    if (done && q.choices[q.picked].id !== q.t.id) {
      const c = q.choices[q.picked];
      explain = d2t ? `<div class="explain"><b>${esc(c.term)}</b>: ${esc(c.desc)}</div>` : `<div class="explain">選んだ説明は「<b>${esc(c.term)}</b>」の説明です。</div>`;
    }
    $("#panel").innerHTML = `
      <div class="meta"><span class="mono">問${quiz.i + 1} / ${quiz.qs.length}</span><span>正解 <span class="mono">${quiz.score}</span></span></div>
      <div class="question"><div class="q">${FIELD[q.t.f]}・${esc(q.t.sub)}</div>${stem}</div>
      <div class="choices">${q.choices.map((c, k) => {
        const cls = done && c.id === q.t.id ? "correct" : done && k === q.picked ? "wrong" : "";
        return `<button class="choice ${cls}" type="button" data-k="${k}" ${done ? "disabled" : ""}><span class="oval">${KANA[k]}</span><span>${label(c)}</span></button>`;
      }).join("")}</div>
      ${done ? `${explain}<button class="btn primary" type="button" id="next">${quiz.i + 1 < quiz.qs.length ? "次の問題" : "結果を見る"}</button>` : ""}
      <div class="kbd">1〜4 で解答 / Enter で次へ</div>`;
    document.querySelectorAll(".choice").forEach((b) => b.onclick = () => pick(+b.dataset.k));
    if (done) { $("#next").onclick = () => { quiz.i++; renderQuiz(); }; $("#next").focus({ preventScroll: true }); }
  }
  function pick(k) {
    const q = quiz.qs[quiz.i];
    if (q.picked !== null || !q.choices[k]) return;
    q.picked = k;
    const ok = q.choices[k].id === q.t.id;
    if (ok) quiz.score++;
    record(q.t, ok);
    renderQuiz();
  }

  /* ---------- 書いて答える ---------- */
  function newTyping() { typing = { qs: studyOrder(pool()).slice(0, 10).map((t) => ({ t, input: "", result: null, hint: false })), i: 0, score: 0 }; }
  function renderTyping() {
    const q = typing.qs[typing.i];
    if (!q) {
      const miss = typing.qs.filter((x) => x.result !== "ok").map((x) => x.t);
      return renderRoundEnd("結果", typing.score, `/ ${typing.qs.length} 問正解`, missList(miss), ...reviewNext("次の10問", () => { newTyping(); renderTyping(); }));
    }
    const chars = Array.from(primary(q.t.term));
    const hint = q.hint ? `<div class="hint" style="padding:0">ヒント: 「${esc(chars[0])}」から始まる${chars.length}文字</div>` : "";
    let foot;
    if (q.result === null) {
      foot = `
        <div class="answer-row">
          <input id="answer" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="用語を入力" aria-label="答え" value="${esc(q.input)}">
          <button class="btn primary" type="button" id="submit">答える</button>
        </div>
        <div class="sub-actions">
          <button class="btn ghost" type="button" id="hintBtn" ${q.hint ? "disabled" : ""}>ヒントを見る</button>
          <button class="btn ghost" type="button" id="skip">わからない</button>
        </div>
        <div class="kbd">Enter で答える</div>`;
    } else {
      const ok = q.result === "ok";
      foot = `
        <div class="verdict ${ok ? "ok" : "ng"}">
          <span class="v">${ok ? "正解" : q.result === "skip" ? "答え" : "不正解"}</span>
          <span class="t">${esc(q.t.term)}</span>
          ${q.result === "ng" ? `<span class="yours">あなたの答え: ${esc(q.input)}</span>` : ""}
          <a href="${link(q.t)}">この用語の解説ページを見る</a>
        </div>
        <button class="btn primary" type="button" id="next">${typing.i + 1 < typing.qs.length ? "次の問題" : "結果を見る"}</button>`;
    }
    $("#panel").innerHTML = `
      <div class="meta"><span class="mono">問${typing.i + 1} / ${typing.qs.length}</span><span>正解 <span class="mono">${typing.score}</span></span></div>
      <div class="question"><div class="q">${FIELD[q.t.f]}・${esc(q.t.sub)}</div><p>${esc(masked(q.t))}</p>${hint}</div>
      ${foot}`;
    if (q.result === null) {
      const inp = $("#answer");
      inp.oninput = () => { q.input = inp.value; };
      inp.onkeydown = (e) => { if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); submitTyping(); } };
      $("#submit").onclick = submitTyping;
      $("#hintBtn").onclick = () => { q.hint = true; renderTyping(); };
      $("#skip").onclick = () => { q.result = "skip"; record(q.t, false); renderTyping(); };
      inp.focus({ preventScroll: true });
    } else {
      $("#next").onclick = () => { typing.i++; renderTyping(); };
      $("#next").focus({ preventScroll: true });
    }
  }
  function submitTyping() {
    const q = typing.qs[typing.i];
    const v = norm(q.input);
    if (!v) { $("#answer").focus(); return; }
    const ok = aliases(q.t.term).some((a) => norm(a) === v);
    q.result = ok ? "ok" : "ng";
    if (ok) typing.score++;
    record(q.t, ok);
    renderTyping();
  }

  /* ---------- 一覧 ---------- */
  function renderList() {
    $("#panel").innerHTML = `
      <input class="search" id="search" type="search" placeholder="用語や説明で検索（例: KPI、著作権）" value="${esc(query)}" aria-label="用語を検索">
      <div class="list" id="list"></div>`;
    $("#search").oninput = (e) => { query = e.target.value; renderRows(); };
    renderRows();
  }
  function renderRows() {
    const qq = norm(query);
    const rows = pool().filter((t) => !qq || norm(t.term + t.desc + t.sub).includes(qq));
    $("#list").innerHTML = rows.length ? rows.map((t) => `
      <div class="row">
        <button class="st" type="button" data-n="${t.n}" aria-pressed="${isKnown(t)}" aria-label="${esc(t.term)}を覚えたにする" title="覚えた"></button>
        <div><h3><a href="${link(t)}">${esc(t.term)}</a>${isWeak(t) ? `<span class="weak-tag">復習</span>` : ""}<small>${FIELD[t.f]}・${esc(t.sub)}</small></h3><p>${esc(t.desc)}</p></div>
      </div>`).join("") : `<div class="empty">「${esc(query)}」に当てはまる用語はありません</div>`;
    document.querySelectorAll(".st").forEach((b) => b.onclick = () => {
      const t = TERMS[+b.dataset.n]; setKnown(t, !isKnown(t)); renderRows();
    });
  }

  /* ---------- 切り替え ---------- */
  function start() {
    if (reviewing() && !pool().length) return renderReviewEmpty();
    const k = kind();
    if (k === "card") { newDeck(); renderCard(); }
    else if (k === "quiz") { newQuiz(); renderQuiz(); }
    else if (k === "type") { newTyping(); renderTyping(); }
    else renderList();
  }
  function refresh() {
    prefs.mode = mode; prefs.field = field; savePrefs();
    try { history.replaceState(null, "", "#" + mode); } catch (e) {}
    renderModes(); renderFields(); renderToolbar(); start();
  }

  $("#modes").onclick = (e) => { const b = e.target.closest(".mode"); if (b) { mode = b.dataset.mode; refresh(); } };
  $("#fields").onclick = (e) => { const b = e.target.closest(".frow"); if (b) { field = b.dataset.f; refresh(); } };
  $("#toolbar").onclick = (e) => {
    const kb = e.target.closest("[data-kind]");
    if (kb) { prefs.reviewKind = kb.dataset.kind; savePrefs(); renderToolbar(); start(); return; }
    const b = e.target.closest("[data-dir]"); if (!b) return;
    prefs[b.dataset.key] = b.dataset.dir; savePrefs(); renderToolbar();
    if (mode === "card") { flipped = false; renderCard(); } else { newQuiz(); renderQuiz(); }
  };

  let resetArmed = false;
  $("#reset").onclick = () => {
    const btn = $("#reset");
    if (!resetArmed) { resetArmed = true; btn.textContent = "もう一度押すとリセットします"; setTimeout(() => { resetArmed = false; btn.textContent = "進み具合をリセット"; }, 3000); return; }
    known = {}; weak = {}; store("iryo-drill-v1", known); store("iryo-drill-weak", weak);
    resetArmed = false; btn.textContent = "進み具合をリセット"; refresh();
  };

  document.addEventListener("keydown", (e) => {
    const tag = e.target.tagName;
    if (tag === "INPUT" || tag === "A" || (tag === "BUTTON" && (e.key === "Enter" || e.key === " "))) return;
    const k = kind();
    if (k === "card" && deck[idx] && $("#flashcard")) {
      if (e.key === " ") { e.preventDefault(); flip(); }
      else if (e.key === "ArrowLeft") answerCard(false);
      else if (e.key === "ArrowRight") answerCard(true);
    } else if (k === "quiz" && quiz && quiz.qs[quiz.i] && $(".choices")) {
      const q = quiz.qs[quiz.i];
      if (["1", "2", "3", "4"].includes(e.key)) pick(+e.key - 1);
      else if (e.key === "Enter" && q.picked !== null) { quiz.i++; renderQuiz(); }
    }
  });

  refresh();
})();
