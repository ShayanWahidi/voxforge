import { useState, useEffect, useRef } from 'react'
import DebugPanel from './DebugPanel.jsx'

const SpeechRecognitionComponent = () => {
  const [transcript, setTranscript] = useState('')
  const [history, setHistory] = useState([])
  const [answer, setAnswer] = useState('')
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState('')
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [timings, setTimings] = useState(null)
  const recognitionRef = useRef(null)
  const historyRef = useRef([])

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition

  const ask = async (question, sttEndTime) => {
    setThinking(true)
    setSpeaking(false)
    setError('')
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: question, history: historyRef.current }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`Server error ${res.status}: ${body}`)
      }
      const data = await res.json()
      const responseReceivedTime = performance.now()

      const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`)
      audio.addEventListener(
        'playing',
        () => {
          const audioStartTime = performance.now()
          const serverTimings = data.timings || {}
          const clientRoundTripMs = audioStartTime - sttEndTime
          const totalBackendMs = serverTimings.totalBackendMs || 0
          setTimings({
            embeddingMs: serverTimings.embeddingMs,
            qdrantMs: serverTimings.qdrantMs,
            geminiMs: serverTimings.geminiMs,
            rimeMs: serverTimings.rimeMs,
            totalBackendMs,
            networkOverheadMs: clientRoundTripMs - totalBackendMs,
            clientRoundTripMs,
            responseReceivedMs: responseReceivedTime - sttEndTime,
          })
          setSpeaking(true)
        },
        { once: true }
      )
      audio.addEventListener('ended', () => setSpeaking(false))
      audio.play()

      setAnswer(data.answerText)
      const nextHistory = [...historyRef.current, { question, answer: data.answerText }]
      historyRef.current = nextHistory
      setHistory(nextHistory)
    } catch (err) {
      setError(err.message || 'Something went wrong contacting the server.')
    } finally {
      setThinking(false)
    }
  }

  useEffect(() => {
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      let newFinal = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += text
          newFinal += text
        } else {
          interim += text
        }
      }
      setTranscript(final || interim)

      if (newFinal.trim()) {
        const sttEndTime = performance.now()
        setTranscript(newFinal.trim())
        ask(newFinal.trim(), sttEndTime)
      }
    }

    recognition.onerror = (event) => {
      console.error('SpeechRecognition error:', event.error)
      if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.')
      }
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
    }
  }, [SpeechRecognition])

  const toggleListening = () => {
    const recognition = recognitionRef.current
    if (!recognition) return

    if (listening) {
      recognition.stop()
      setListening(false)
    } else {
      setTranscript('')
      setAnswer('')
      setError('')
      setSpeaking(false)
      recognition.start()
      setListening(true)
    }
  }

  if (!SpeechRecognition) {
    return (
      <div>
        <p>
          Your browser does not support the Web Speech API. Try Chrome or Edge.
        </p>
      </div>
    )
  }

  const status =
    speaking ? 'Speaking' : thinking ? 'Thinking' : listening ? 'Listening' : 'Ready'
  const micDisabled = thinking || speaking

  return (
    <div className="shell">
      <header className="app-header">
        <h1 className="app-title">Voxforge</h1>
        <div className="header-actions">
          <button
            className={`mic-btn${listening && !micDisabled ? ' listening' : ''}${
              micDisabled ? ' disabled' : ''
            }`}
            onClick={toggleListening}
            disabled={micDisabled}
            aria-label={listening ? 'Stop listening' : 'Start listening'}
            title={listening ? 'Stop listening' : 'Start listening'}
          >
            <svg
              viewBox="0 0 24 24"
              width="30"
              height="30"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" />
              <path d="M17 11a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
            </svg>
          </button>
          <span className={`status-pill status-${status.toLowerCase()}`}>
            {status}
          </span>
        </div>
      </header>

      <div className="workspace">
        <div className="col-main">
          {thinking && (
            <div className="thinking">
              <div className="orb" aria-hidden="true">
                <span className="orb-ring orb-ring-1" />
                <span className="orb-ring orb-ring-2" />
                <span className="orb-ring orb-ring-3" />
              </div>
              <p className="thinking-label">Thinking…</p>
            </div>
          )}

          <div className="text-block">
            <h2 className="block-title">Live Transcript</h2>
            <p className="block-text">
              {transcript || 'Waiting for your question…'}
            </p>
          </div>

          {error && <p className="error">{error}</p>}

          {answer && (
            <div className="text-block">
              <h2 className="block-title">Answer</h2>
              <p className="block-text">{answer}</p>
            </div>
          )}
        </div>

        <div className="col-side">
          <div className="latency-pin">
            <DebugPanel timings={timings} />
          </div>
          {history.length > 0 && (
            <div className="text-block history-block">
              <h2 className="block-title">History</h2>
              <ul className="history-list">
                {history.map((item, i) => (
                  <li key={i}>
                    <strong>Q:</strong> {item.question}
                    <br />
                    <strong>A:</strong> {item.answer}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SpeechRecognitionComponent
