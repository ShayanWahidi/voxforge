import { useState, useEffect, useRef } from 'react'

const SpeechRecognitionComponent = () => {
  const [transcript, setTranscript] = useState('')
  const [history, setHistory] = useState([])
  const [answer, setAnswer] = useState('')
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState('')
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)
  const historyRef = useRef([])

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition

  const ask = async (question) => {
    setThinking(true)
    setError('')
    try {
      const res = await fetch('http://localhost:3001/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: question, history: historyRef.current }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`Server error ${res.status}: ${body}`)
      }
      const data = await res.json()

      const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`)
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
        setTranscript(newFinal.trim())
        ask(newFinal.trim())
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

  return (
    <div>
      <button onClick={toggleListening}>
        {listening ? 'Stop Listening' : 'Start Listening'}
      </button>
      <div>
        <h2>Live Transcript</h2>
        <p>{transcript}</p>
      </div>
      {thinking && <p>thinking...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {answer && (
        <div>
          <h2>Answer</h2>
          <p>{answer}</p>
        </div>
      )}
      {history.length > 0 && (
        <div>
          <h2>History</h2>
          <ul>
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
  )
}

export default SpeechRecognitionComponent
