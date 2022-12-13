import { useEffect, useMemo, useState } from 'preact/hooks'
import PropTypes from 'prop-types'
import { MarkdownRender } from './markdown.jsx'
import Browser from 'webextension-polyfill'

function TalkItem({ type, content }) {
  return (
    <div className={`${type}`} dir="auto">
      <MarkdownRender>{content}</MarkdownRender>
    </div>
  )
}
TalkItem.propTypes = {
  type: PropTypes.oneOf(['question', 'answer', 'error']).isRequired,
  content: PropTypes.string.isRequired,
}

function Interact({ onSubmit, enabled }) {
  const [value, setValue] = useState('')

  return (
    <form
      className="interact-container"
      id="interact"
      onSubmit={(e) => {
        e.preventDefault()
        if (!value) return
        onSubmit(value)
        setValue('')
      }}
    >
      <input
        disabled={!enabled}
        className="interact-input"
        type="text"
        placeholder="Type your question here"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </form>
  )
}
Interact.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  enabled: PropTypes.bool,
}

class Talk extends Object {
  /**
   * @param {'question'|'answer'|'error'} type
   * @param {string} content
   */
  constructor(type, content) {
    super()
    this.type = type
    this.content = content
  }
}

function ChatGPTQuery(props) {
  /**
   * @type {[Talk[], (talk: Talk[]) => void]}
   */
  const [talk, setTalk] = useState([
    new Talk('answer', '<p class="gpt-loading">Waiting for ChatGPT response...</p>'),
  ])
  const [isReady, setIsReady] = useState(false)
  /**
   * @param {string} value
   * @param {boolean} appended
   * @param {'question'|'answer'|'error'} type
   */
  function UpdateAnswer(value, appended, type) {
    setTalk((old) => {
      const copy = [...old]
      const revCopy = [...copy].reverse() // reverse to get the last answer
      let index = revCopy.findIndex((value) => {
        return value.type == 'answer'
      })
      index = old.length - index - 1 // reverse back
      if (index < old.length) {
        const newValue = old[index].content + value
        copy[index] = new Talk(type, appended ? newValue : value)
        return copy
      } else {
        return old
      }
    })
  }

  const port = useMemo(() => Browser.runtime.connect(), [])
  useEffect(() => {
    const listener = (msg) => {
      if (msg.answer) {
        UpdateAnswer('**ChatGPT:**\n' + msg.answer, false, 'answer')
        setIsReady(false)
        return
      }
      if (msg.done) {
        UpdateAnswer('<hr>', true, 'answer')
      } else if (msg.error) {
        switch (msg.error) {
          case 'UNAUTHORIZED':
            UpdateAnswer(
              'UNAUTHORIZED<br>Please login at ' +
                '<a href="https://chat.openai.com" target="_blank" rel="noreferrer">' +
                'https://chat.openai.com' +
                '</a> first',
              false,
              'error',
            )
            break
          case 'EXCEPTION':
            UpdateAnswer(msg.error, false, 'error')
            break
          default:
            UpdateAnswer(msg.error, false, 'error')
            break
        }
      }
      setIsReady(true)
    }
    port.onMessage.addListener(listener)
    port.postMessage({
      question: props.question,
    })
    return () => {
      port.onMessage.removeListener(listener)
      port.disconnect()
    }
  }, [props.question])

  return (
    <>
      <link
        rel="stylesheet"
        href={'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.4/katex.min.css'}
      />
      <div className="markdown-body gpt-inner">
        {talk.map((talk, idx) => (
          <TalkItem content={talk.content} key={idx} type={talk.type} />
        ))}
      </div>
      <Interact
        enabled={isReady}
        onSubmit={(question) => {
          const newQuestion = new Talk('question', '**You:**\n' + question)
          const newAnswer = new Talk(
            'answer',
            '<p class="gpt-loading">Waiting for ChatGPT response...</p>',
          )
          setTalk([...talk, newQuestion, newAnswer])
          setIsReady(false)
          try {
            port.postMessage({ question })
          } catch (e) {
            UpdateAnswer('Error: ' + e, false, 'error')
          }
        }}
      />
    </>
  )
}

ChatGPTQuery.propTypes = {
  question: PropTypes.string.isRequired,
}

export default ChatGPTQuery
