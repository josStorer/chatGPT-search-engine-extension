import { useEffect, useMemo, useState } from 'preact/hooks'
import PropTypes from 'prop-types'
import { MarkdownRender } from './markdown.jsx'
import Browser from 'webextension-polyfill'

let session = {
  question: null,
  conversationId: null,
  messageId: null,
  parentMessageId: null,
}

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
        placeholder={
          enabled
            ? 'Type your question here'
            : 'Wait for the answer to finish and then continue here'
        }
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
  useEffect(() => {
    session.question = props.question
    port.postMessage({ session })
  }, [props.question]) // usually only triggered once

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
  const UpdateAnswer = (value, appended, type) => {
    setTalk((old) => {
      const copy = [...old]
      const index = copy.findLastIndex((v) => v.type === 'answer')
      if (index === -1) return copy
      copy[index] = new Talk(type, appended ? copy[index].content + value : value)
      return copy
    })
  }

  const port = useMemo(() => Browser.runtime.connect(), [])
  useEffect(() => {
    const listener = (msg) => {
      if (msg.answer) {
        UpdateAnswer('**ChatGPT:**\n' + msg.answer, false, 'answer')
        return
      }
      if (msg.done) {
        UpdateAnswer('<hr>', true, 'answer')
        if (msg.session) {
          session = msg.session
        }
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
          default:
            setTalk([...talk, new Talk('error', msg.error + '<hr>')])
            break
        }
      }
      setIsReady(true)
    }
    port.onMessage.addListener(listener)
    return () => {
      port.onMessage.removeListener(listener)
    }
  }, [talk])

  return (
    <>
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

          session.question = question
          try {
            port.postMessage({ session })
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
