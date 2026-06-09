import React from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart3,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Clipboard,
  History,
  Play,
  RotateCcw,
  Settings,
  Shuffle,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import testData from "./data/tests.generated.json";
import "./styles.css";

const HISTORY_KEY = "red-ice.history";
const SETTINGS_KEY = "red-ice.settings";
const DEFAULT_ACCENT = "#27d8ff";

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function shuffleArray(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return Math.min(Math.max(number, min), max);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ru", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = String(safe % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

function formatQuestionForCopy(question) {
  return [`? ${question.text}`, ...question.answers.map((answer) => `- ${answer.text}`)].join("\n");
}

function buildStats(tests, history) {
  return tests.map((test) => {
    const entries = history.filter((entry) => entry.testId === test.id);
    const best = entries.reduce((max, entry) => Math.max(max, entry.percent), 0);
    const totalCorrect = entries.reduce((sum, entry) => sum + entry.correctCount, 0);
    const totalQuestions = entries.reduce((sum, entry) => sum + entry.totalQuestions, 0);
    const average = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    return {
      test,
      attempts: entries.length,
      best,
      average,
      last: entries[0],
    };
  });
}

function StatCard({ stat }) {
  return (
    <article className="panel stat-card">
      <div>
        <p className="muted">Файл</p>
        <h3>{stat.test.filename}</h3>
      </div>
      <div className="stat-grid">
        <span>
          <strong>{stat.test.questionCount}</strong>
          <small>вопросов</small>
        </span>
        <span>
          <strong>{stat.attempts}</strong>
          <small>попыток</small>
        </span>
        <span>
          <strong>{stat.best}%</strong>
          <small>лучший</small>
        </span>
        <span>
          <strong>{stat.average}%</strong>
          <small>средний</small>
        </span>
      </div>
      <p className="last-run">{stat.last ? `Последний: ${formatDate(stat.last.createdAt)} · ${stat.last.correctCount}/${stat.last.totalQuestions}` : "Еще не проходили"}</p>
    </article>
  );
}

function TestCard({ test, onStart }) {
  return (
    <article className="panel test-card">
      <div>
        <h3>{test.title}</h3>
        <p>{test.filename}</p>
      </div>
      <div className="test-card-footer">
        <span>{test.questionCount} вопросов</span>
        <button className="primary-button" onClick={() => onStart(test)}>
          <Play size={17} />
          START
        </button>
      </div>
    </article>
  );
}

function StartModal({ test, onClose, onBegin }) {
  const [minutes, setMinutes] = React.useState("");
  const [questionCount, setQuestionCount] = React.useState("");
  const [shuffle, setShuffle] = React.useState(true);
  const [quizMode, setQuizMode] = React.useState(false);

  if (!test) return null;

  const maxQuestions = test.questionCount;
  const normalizedCount = questionCount === "" ? maxQuestions : clampNumber(questionCount, 1, maxQuestions);
  const normalizedMinutes = minutes === "" ? "" : clampNumber(minutes, 1, 600);

  function submit(event) {
    event.preventDefault();
    onBegin({
      test,
      minutes: normalizedMinutes === "" ? null : normalizedMinutes,
      questionCount: normalizedCount,
      shuffle,
      quizMode,
    });
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal panel" onSubmit={submit}>
        <div className="modal-head">
          <div>
            <p className="muted">Параметры прохождения</p>
            <h2>{test.filename}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>

        <label className="field">
          <span>Время</span>
          <input
            type="number"
            min="1"
            max="600"
            placeholder="минуты"
            value={minutes}
            onChange={(event) => setMinutes(event.target.value === "" ? "" : clampNumber(event.target.value, 1, 600))}
          />
        </label>

        <label className="field">
          <span>Количество вопросов</span>
          <input
            type="number"
            min="1"
            max={maxQuestions}
            placeholder={`макс: ${maxQuestions}`}
            value={questionCount}
            onChange={(event) => setQuestionCount(event.target.value === "" ? "" : clampNumber(event.target.value, 1, maxQuestions))}
          />
        </label>

        <label className="toggle-row">
          <input type="checkbox" checked={shuffle} onChange={(event) => setShuffle(event.target.checked)} />
          <span>
            <Shuffle size={16} />
            Смешать вопросы и варианты
          </span>
        </label>

        <button
          type="button"
          className={`mode-button ${quizMode ? "active" : ""}`}
          onClick={() => setQuizMode((value) => !value)}
        >
          <CheckCircle2 size={17} />
          Режим Quiz
        </button>

        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>Отмена</button>
          <button className="primary-button" type="submit">
            <Play size={17} />
            Начать
          </button>
        </div>
      </form>
    </div>
  );
}

function SettingsModal({ accent, setAccent, onClose }) {
  const presets = ["#27d8ff", "#7cffd4", "#ff4fd8", "#ffe66b", "#8f7cff"];
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal panel">
        <div className="modal-head">
          <div>
            <p className="muted">Настройки сайта</p>
            <h2>Неоновая линия</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>
        <label className="field">
          <span>Цвет контура</span>
          <input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} />
        </label>
        <div className="swatches">
          {presets.map((color) => (
            <button
              key={color}
              className="swatch"
              style={{ background: color }}
              onClick={() => setAccent(color)}
              aria-label={`Выбрать ${color}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function QuizView({ session, onFinish, onExit }) {
  const [answers, setAnswers] = React.useState({});
  const [remaining, setRemaining] = React.useState(session.timeLimitSeconds);
  const [confirmExit, setConfirmExit] = React.useState(false);
  const [copiedQuestionId, setCopiedQuestionId] = React.useState(null);
  const questionRefs = React.useRef({});
  const answersRef = React.useRef({});
  const copiedTimerRef = React.useRef(null);

  React.useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  React.useEffect(() => {
    answersRef.current = {};
    setAnswers({});
    setRemaining(session.timeLimitSeconds);
  }, [session.id]);

  React.useEffect(() => {
    if (!session.timeLimitSeconds) return undefined;
    const timer = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          finishQuiz(true);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [session.id]);

  React.useEffect(() => () => window.clearTimeout(copiedTimerRef.current), []);

  function chooseAnswer(questionId, answerId) {
    if (session.quizMode && answersRef.current[questionId]) return;
    setAnswers((current) => {
      const next = { ...current, [questionId]: answerId };
      answersRef.current = next;
      return next;
    });
  }

  function scrollToQuestion(questionId) {
    questionRefs.current[questionId]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function copyQuestion(question) {
    await navigator.clipboard.writeText(formatQuestionForCopy(question));
    setCopiedQuestionId(question.id);
    window.clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = window.setTimeout(() => setCopiedQuestionId(null), 1400);
  }

  function finishQuiz(auto = false) {
    const currentAnswers = answersRef.current;
    const resultQuestions = session.questions.map((question) => {
      const selectedId = currentAnswers[question.id] ?? null;
      const correctAnswer = question.answers.find((answer) => answer.correct);
      const selectedAnswer = question.answers.find((answer) => answer.id === selectedId);
      return {
        question: question.text,
        selected: selectedAnswer?.text ?? null,
        correct: correctAnswer.text,
        isCorrect: selectedId === correctAnswer.id,
        answers: question.answers,
      };
    });
    const correctCount = resultQuestions.filter((question) => question.isCorrect).length;
    onFinish({
      id: crypto.randomUUID(),
      testId: session.test.id,
      testTitle: session.test.title,
      filename: session.test.filename,
      createdAt: new Date().toISOString(),
      totalQuestions: session.questions.length,
      answeredCount: Object.keys(currentAnswers).length,
      correctCount,
      wrongCount: session.questions.length - correctCount,
      percent: Math.round((correctCount / session.questions.length) * 100),
      durationSeconds: Math.round((Date.now() - session.startedAt) / 1000),
      autoFinished: auto,
      questions: resultQuestions,
    });
  }

  const answeredCount = Object.keys(answers).length;
  const unanswered = session.questions.length - answeredCount;

  return (
    <main className="quiz-shell">
      <header className="quiz-header panel">
        <button className="ghost-button" onClick={onExit}>
          <ChevronLeft size={18} />
          Главная
        </button>
        <div>
          <p className="muted">{session.test.filename}</p>
          <h1>{session.test.title}</h1>
        </div>
        <div className="quiz-meta">
          <span>{answeredCount}/{session.questions.length}</span>
          {session.timeLimitSeconds ? (
            <span>
              <Clock size={16} />
              {formatDuration(remaining)}
            </span>
          ) : null}
          {session.quizMode ? <span>Quiz</span> : null}
        </div>
      </header>

      <section className="quiz-layout">
        <div className="question-stack">
          {session.questions.map((question, questionIndex) => (
            <article
              key={question.id}
              className="panel question-card"
              ref={(node) => {
                questionRefs.current[question.id] = node;
              }}
            >
              {(() => {
                const selectedAnswerId = answers[question.id];
                const selectedAnswer = question.answers.find((answer) => answer.id === selectedAnswerId);
                const correctAnswer = question.answers.find((answer) => answer.correct);
                const revealed = session.quizMode && selectedAnswerId;
                const isCorrect = selectedAnswerId === correctAnswer?.id;

                return (
                  <>
              <div className="question-title">
                <span>{questionIndex + 1}</span>
                <h2>{question.text}</h2>
              </div>
              <div className="answer-list">
                {question.answers.map((answer) => (
                  <button
                    key={answer.id}
                    className={[
                      "answer-button",
                      selectedAnswerId === answer.id ? "selected" : "",
                      revealed && answer.correct ? "correct" : "",
                      revealed && selectedAnswerId === answer.id && !answer.correct ? "wrong" : "",
                      revealed ? "revealed" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => chooseAnswer(question.id, answer.id)}
                  >
                    <span>{selectedAnswerId === answer.id ? <Check size={16} /> : null}</span>
                    {answer.text}
                  </button>
                ))}
              </div>
              {revealed ? (
                <div className={`instant-feedback ${isCorrect ? "correct" : "wrong"}`}>
                  {isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  <p>
                    {isCorrect ? "Правильно" : `Неверно. Правильный ответ: ${correctAnswer.text}`}
                  </p>
                </div>
              ) : null}
              <div className="question-tools">
                <button
                  className={`copy-question-button ${copiedQuestionId === question.id ? "copied" : ""}`}
                  onClick={() => copyQuestion(question)}
                  title="Копировать вопрос с вариантами"
                  aria-label="Копировать вопрос с вариантами"
                >
                  <Clipboard size={18} />
                </button>
              </div>
                  </>
                );
              })()}
            </article>
          ))}
        </div>

        <aside className="question-nav panel" aria-label="Навигация по вопросам">
          {session.questions.map((question, index) => (
            <button
              key={question.id}
              className={answers[question.id] ? "answered" : ""}
              onClick={() => scrollToQuestion(question.id)}
            >
              {index + 1}
            </button>
          ))}
        </aside>
      </section>

      <button
        className="finish-button primary-button"
        onClick={() => (unanswered > 0 ? setConfirmExit(true) : finishQuiz())}
      >
        Завершить
      </button>

      {confirmExit ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <section className="modal panel">
            <div className="modal-head">
              <div>
                <p className="muted">Не отвечено: {unanswered}</p>
                <h2>Завершить тест?</h2>
              </div>
            </div>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setConfirmExit(false)}>Вернуться</button>
              <button className="primary-button" onClick={() => finishQuiz()}>Завершить</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function ResultView({ result, onHome, onRetry }) {
  return (
    <main className="page">
      <section className="panel result-hero">
        <p className="muted">{result.filename}</p>
        <h1>{result.percent}%</h1>
        <div className="result-stats">
          <span><strong>{result.correctCount}</strong> верно</span>
          <span><strong>{result.wrongCount}</strong> неверно</span>
          <span><strong>{result.answeredCount}/{result.totalQuestions}</strong> отвечено</span>
          <span><strong>{formatDuration(result.durationSeconds)}</strong> время</span>
        </div>
        <div className="modal-actions">
          <button className="ghost-button" onClick={onHome}>На главную</button>
          <button className="primary-button" onClick={onRetry}>
            <RotateCcw size={17} />
            Повторить
          </button>
        </div>
      </section>

      <section className="review-list">
        {result.questions.map((question, index) => (
          <article key={`${question.question}-${index}`} className={`panel review-card ${question.isCorrect ? "ok" : "fail"}`}>
            <h3>{index + 1}. {question.question}</h3>
            <div className="review-answers">
              {question.answers.map((answer) => {
                const isSelected = answer.text === question.selected;
                return (
                  <div
                    key={answer.id}
                    className={`review-answer ${answer.correct ? "correct" : ""} ${isSelected ? "picked" : ""}`}
                  >
                    <span>{answer.correct ? "верно" : isSelected ? "выбрано" : ""}</span>
                    <p>{answer.text}</p>
                  </div>
                );
              })}
            </div>
            {!question.selected ? <p>Ваш ответ: <strong>нет ответа</strong></p> : null}
          </article>
        ))}
      </section>
    </main>
  );
}

function HistoryView({ history, onBack, onOpen, onDelete, onClear }) {
  return (
    <main className="page">
      <header className="topbar">
        <button className="ghost-button" onClick={onBack}>
          <ChevronLeft size={18} />
          Главная
        </button>
        <h1>История</h1>
        <button className="ghost-button danger" onClick={onClear} disabled={!history.length}>
          <Trash2 size={17} />
          Очистить
        </button>
      </header>
      <section className="history-list">
        {history.length ? history.map((entry) => (
          <article key={entry.id} className="panel history-card">
            <button className="history-main" onClick={() => onOpen(entry)}>
              <strong>{entry.filename}</strong>
              <span>{formatDate(entry.createdAt)} · {entry.correctCount}/{entry.totalQuestions} · {entry.percent}%</span>
            </button>
            <button className="icon-button danger" onClick={() => onDelete(entry.id)} aria-label="Удалить результат">
              <Trash2 size={18} />
            </button>
          </article>
        )) : <p className="empty-state">История пока пустая.</p>}
      </section>
    </main>
  );
}

function HomeView({ tests, stats, onStart, onHistory, onSettings }) {
  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="muted">Test runner</p>
          <h1>RED ICE</h1>
        </div>
        <div className="hero-actions">
          <button className="ghost-button" onClick={onHistory}>
            <History size={17} />
            История
          </button>
          <button className="ghost-button" onClick={onSettings}>
            <Settings size={17} />
            Настройки
          </button>
        </div>
      </header>

      <section className="section-head">
        <h2><BarChart3 size={20} /> Статистика</h2>
      </section>
      <section className="stats-list">
        {stats.map((stat) => <StatCard key={stat.test.id} stat={stat} />)}
      </section>

      <section className="section-head">
        <h2>Тесты</h2>
        <p>{tests.length} файла из test_file/</p>
      </section>
      <section className="test-list">
        {tests.length ? tests.map((test) => <TestCard key={test.id} test={test} onStart={onStart} />) : (
          <p className="empty-state">В папке test_file/ нет txt-тестов.</p>
        )}
      </section>
    </main>
  );
}

function App() {
  const tests = testData.tests;
  const [history, setHistory] = React.useState(() => readStorage(HISTORY_KEY, []));
  const [settings, setSettings] = React.useState(() => readStorage(SETTINGS_KEY, { accent: DEFAULT_ACCENT }));
  const [startTest, setStartTest] = React.useState(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [view, setView] = React.useState("home");
  const [session, setSession] = React.useState(null);
  const [result, setResult] = React.useState(null);
  const lastConfig = React.useRef(null);

  React.useEffect(() => {
    document.documentElement.style.setProperty("--accent", settings.accent);
    writeStorage(SETTINGS_KEY, settings);
  }, [settings]);

  React.useEffect(() => {
    writeStorage(HISTORY_KEY, history);
  }, [history]);

  function beginSession(config) {
    const selectedQuestions = (config.shuffle ? shuffleArray(config.test.questions) : [...config.test.questions])
      .slice(0, config.questionCount)
      .map((question) => ({
        ...question,
        answers: config.shuffle ? shuffleArray(question.answers) : question.answers,
      }));

    lastConfig.current = config;
    setStartTest(null);
    setResult(null);
    setSession({
      id: crypto.randomUUID(),
      test: config.test,
      questions: selectedQuestions,
      startedAt: Date.now(),
      timeLimitSeconds: config.minutes ? config.minutes * 60 : null,
      quizMode: config.quizMode,
    });
    setView("quiz");
  }

  function finishSession(entry) {
    setHistory((current) => [entry, ...current]);
    setResult(entry);
    setSession(null);
    setView("result");
  }

  function deleteHistory(id) {
    setHistory((current) => current.filter((entry) => entry.id !== id));
  }

  function clearHistory() {
    if (history.length && window.confirm("Удалить всю историю прохождений?")) {
      setHistory([]);
    }
  }

  const stats = React.useMemo(() => buildStats(tests, history), [tests, history]);

  return (
    <>
      {view === "home" ? (
        <HomeView
          tests={tests}
          stats={stats}
          onStart={setStartTest}
          onHistory={() => setView("history")}
          onSettings={() => setSettingsOpen(true)}
        />
      ) : null}
      {view === "quiz" && session ? (
        <QuizView
          session={session}
          onFinish={finishSession}
          onExit={() => setView("home")}
        />
      ) : null}
      {view === "result" && result ? (
        <ResultView
          result={result}
          onHome={() => setView("home")}
          onRetry={() => lastConfig.current && beginSession(lastConfig.current)}
        />
      ) : null}
      {view === "history" ? (
        <HistoryView
          history={history}
          onBack={() => setView("home")}
          onOpen={(entry) => {
            setResult(entry);
            setView("result");
          }}
          onDelete={deleteHistory}
          onClear={clearHistory}
        />
      ) : null}

      <StartModal test={startTest} onClose={() => setStartTest(null)} onBegin={beginSession} />
      {settingsOpen ? (
        <SettingsModal
          accent={settings.accent}
          setAccent={(accent) => setSettings((current) => ({ ...current, accent }))}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
