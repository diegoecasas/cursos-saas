/* Widget de quiz mínimo. Cero dependencias, cero red.
   Uso: cada .quiz contiene .question, <ul> con <li data-correct="true|false"> y .feedback. */
(function () {
  function attach(quiz) {
    var options = quiz.querySelectorAll('ul li');
    var feedback = quiz.querySelector('.feedback');
    var answered = false;
    options.forEach(function (li) {
      li.addEventListener('click', function () {
        if (answered) return;
        answered = true;
        var correct = li.getAttribute('data-correct') === 'true';
        li.classList.add(correct ? 'correct' : 'incorrect');
        if (feedback) {
          feedback.textContent = li.getAttribute('data-feedback')
            || (correct ? '¡Correcto!' : 'No es esa.');
        }
        if (!correct) {
          options.forEach(function (other) {
            if (other.getAttribute('data-correct') === 'true') {
              other.classList.add('correct');
            }
          });
        }
      });
    });
  }
  document.querySelectorAll('.quiz').forEach(attach);
})();
