import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowBack, CheckCircle, EmojiEvents, SportsEsports } from '@mui/icons-material';
import ThemeToggle from '../ThemeToggle.jsx';
import './PlayArena.css';

const QUESTIONS = [
    {
        subject: 'Physics',
        question: 'Which law explains why a book stays at rest on a table until it is pushed?',
        choices: ['Newton’s first law', 'Newton’s second law', 'Newton’s third law', 'Law of gravitation'],
        answer: 0,
        explanation: 'Newton’s first law describes inertia: an object keeps its state of motion unless a net force acts on it.'
    },
    {
        subject: 'Mathematics',
        question: 'Solve for x: 3x + 5 = 20.',
        choices: ['3', '5', '7', '15'],
        answer: 1,
        explanation: 'Subtract 5 from both sides to get 3x = 15, then divide by 3. So x = 5.'
    },
    {
        subject: 'Biology',
        question: 'Which cell structure contains most of the cell’s genetic information?',
        choices: ['Cell membrane', 'Ribosome', 'Nucleus', 'Cytoplasm'],
        answer: 2,
        explanation: 'The nucleus stores most of a eukaryotic cell’s DNA and helps coordinate cell activity.'
    },
    {
        subject: 'Chemistry',
        question: 'What determines which chemical element an atom is?',
        choices: ['Number of neutrons', 'Number of protons', 'Number of shells', 'Atom’s mass only'],
        answer: 1,
        explanation: 'An element is identified by its atomic number, which equals the number of protons in its nucleus.'
    },
    {
        subject: 'Mathematics',
        question: 'What is the area of a rectangle that is 8 cm long and 3 cm wide?',
        choices: ['11 cm²', '22 cm²', '24 cm²', '48 cm²'],
        answer: 2,
        explanation: 'Area of a rectangle is length × width, so 8 × 3 = 24 cm².'
    }
];

const PlayArena = () => {
    const [questionIndex, setQuestionIndex] = useState(0);
    const [selectedChoice, setSelectedChoice] = useState(null);
    const [score, setScore] = useState(0);
    const [answered, setAnswered] = useState(false);
    const [finished, setFinished] = useState(false);
    const question = QUESTIONS[questionIndex];

    function checkAnswer() {
        if (selectedChoice === null || answered) return;
        if (selectedChoice === question.answer) setScore((current) => current + 1);
        setAnswered(true);
    }

    function goToNextQuestion() {
        if (questionIndex === QUESTIONS.length - 1) {
            setFinished(true);
            return;
        }
        setQuestionIndex((current) => current + 1);
        setSelectedChoice(null);
        setAnswered(false);
    }

    function restartQuiz() {
        setQuestionIndex(0);
        setSelectedChoice(null);
        setScore(0);
        setAnswered(false);
        setFinished(false);
    }

    return (
        <main className="play-arena-page">
            <header className="play-arena-topbar">
                <Link to="/" className="play-arena-back"><ArrowBack /> Home</Link>
                <ThemeToggle />
            </header>
            <section className="arena-hero">
                <span className="arena-hero-icon"><SportsEsports /></span>
                <p className="arena-kicker">LEARN A LITTLE. PLAY A LITTLE.</p>
                <h1>Play Arena</h1>
                <p>Quick questions, helpful explanations, and a chance to beat your best score.</p>
            </section>
            <section className="quiz-card" aria-label="Study quiz">
                {finished ? (
                    <div className="quiz-result" aria-live="polite">
                        <span className="quiz-result-icon"><EmojiEvents /></span>
                        <p className="arena-kicker">QUIZ COMPLETE</p>
                        <h2>You scored {score} out of {QUESTIONS.length}</h2>
                        <p>{score === QUESTIONS.length ? 'Perfect round! Brilliant work.' : 'Nice effort. Review the explanations and give it another go.'}</p>
                        <button className="arena-primary-button" type="button" onClick={restartQuiz}>Play again</button>
                    </div>
                ) : (
                    <>
                        <div className="quiz-progress-row">
                            <span>{question.subject}</span>
                            <span>Question {questionIndex + 1} of {QUESTIONS.length}</span>
                        </div>
                        <div className="quiz-progress-track" aria-label={`Question ${questionIndex + 1} of ${QUESTIONS.length}`}>
                            <span style={{ width: `${((questionIndex + 1) / QUESTIONS.length) * 100}%` }} />
                        </div>
                        <h2 className="quiz-question">{question.question}</h2>
                        <div className="quiz-choices">
                            {question.choices.map((choice, index) => {
                                const isCorrect = answered && index === question.answer;
                                const isIncorrect = answered && selectedChoice === index && index !== question.answer;
                                return (
                                    <button
                                        className={`quiz-choice${selectedChoice === index ? ' is-selected' : ''}${isCorrect ? ' is-correct' : ''}${isIncorrect ? ' is-incorrect' : ''}`}
                                        type="button"
                                        key={choice}
                                        onClick={() => !answered && setSelectedChoice(index)}
                                        disabled={answered}
                                        aria-pressed={selectedChoice === index}
                                    >
                                        <span>{String.fromCharCode(65 + index)}</span>{choice}
                                        {isCorrect && <CheckCircle />}
                                    </button>
                                );
                            })}
                        </div>
                        {answered && <p className="quiz-explanation" aria-live="polite">{question.explanation}</p>}
                        {!answered
                            ? <button className="arena-primary-button" type="button" onClick={checkAnswer} disabled={selectedChoice === null}>Check answer</button>
                            : <button className="arena-primary-button" type="button" onClick={goToNextQuestion}>{questionIndex === QUESTIONS.length - 1 ? 'See my score' : 'Next question'}</button>}
                    </>
                )}
            </section>
            <Link className="arena-notes-link" to="/notes">Need a refresher? Review your study notes</Link>
        </main>
    );
};

export default PlayArena;
