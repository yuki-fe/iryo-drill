/* 用語ページの確認問題: 選んだ選択肢の正誤を表示する */
(function () {
  const quiz = document.querySelector(".mini-quiz");
  if (!quiz) return;
  const answer = +quiz.dataset.answer;
  const buttons = quiz.querySelectorAll(".choice");
  const result = quiz.querySelector(".quiz-result");
  buttons.forEach((b) => b.addEventListener("click", () => {
    const k = +b.dataset.k;
    buttons.forEach((x) => {
      x.disabled = true;
      if (+x.dataset.k === answer) x.classList.add("correct");
    });
    const ok = k === answer;
    if (!ok) b.classList.add("wrong");
    result.className = "quiz-result " + (ok ? "ok" : "ng");
    result.textContent = ok ? "正解です。" : "不正解です。正解は「" + quiz.dataset.term + "」です。";
    const a = document.createElement("a");
    a.href = quiz.dataset.href;
    a.textContent = " 解説を読む";
    result.appendChild(a);
    result.hidden = false;
  }));
})();
