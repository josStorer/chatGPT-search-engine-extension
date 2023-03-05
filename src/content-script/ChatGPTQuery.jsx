import { memo, useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { MarkdownRender } from './markdown.jsx'
import Browser from 'webextension-polyfill'
import ChatGPTFeedback from './ChatGPTFeedback'
import { ChevronDownIcon, LinkExternalIcon, XCircleIcon } from '@primer/octicons-react'
import { isSafari } from '../utils.mjs'
import CopyButton from './CopyButton'

/**
 * @typedef {object} Session
 * @property {string|null} question
 * @property {string|null} conversationId - chatGPT web mode
 * @property {string|null} messageId - chatGPT web mode
 * @property {string|null} parentMessageId - chatGPT web mode
 * @property {Object[]|null} conversationRecords - API key mode
 * @property {bool|null} useApiKey
 */
/**
 * @type {Session}
 */
let session = {
  question: null,
  conversationId: null,
  messageId: null,
  parentMessageId: null,
  conversationRecords: [],
  useApiKey: null,
}

function TalkItem({ type, content, session, done }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className={type} dir="auto">
      {type === 'answer' && (
        <div className="gpt-header">
          <p>{session ? 'ChatGPT:' : 'Loading...'}</p>
          <div style="display: flex; gap: 15px;">
            {done && !session.useApiKey && (
              <ChatGPTFeedback
                messageId={session.messageId}
                conversationId={session.conversationId}
              />
            )}
            {session && session.conversationId && !session.useApiKey && (
              <a
                title="Continue on official website"
                href={'https://chat.openai.com/chat/' + session.conversationId}
                target="_blank"
                rel="nofollow noopener noreferrer"
                style="color: inherit;"
              >
                <LinkExternalIcon size={14} />
              </a>
            )}
            {session && <CopyButton contentFn={() => content} size={14} />}
            {!collapsed ? (
              <span title="Collapse" className="gpt-util-icon" onClick={() => setCollapsed(true)}>
                <XCircleIcon size={14} />
              </span>
            ) : (
              <span title="Expand" className="gpt-util-icon" onClick={() => setCollapsed(false)}>
                <ChevronDownIcon size={14} />
              </span>
            )}
          </div>
        </div>
      )}
      {!collapsed && <MarkdownRender>{content}</MarkdownRender>}
    </div>
  )
}

TalkItem.propTypes = {
  type: PropTypes.oneOf(['question', 'answer', 'error']).isRequired,
  content: PropTypes.string.isRequired,
  session: PropTypes.object.isRequired,
  done: PropTypes.bool.isRequired,
}

function Interact({ onSubmit, enabled }) {
  const [value, setValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current.style.height = 'auto'
    const computed = window.getComputedStyle(inputRef.current)
    const height =
      parseInt(computed.getPropertyValue('border-top-width'), 10) +
      parseInt(computed.getPropertyValue('padding-top'), 10) +
      inputRef.current.scrollHeight +
      parseInt(computed.getPropertyValue('padding-bottom'), 10) +
      parseInt(computed.getPropertyValue('border-bottom-width'), 10)

    inputRef.current.style.height = `${height}px`
  })

  const onKeyDown = (e) => {
    if (e.keyCode === 13 && e.shiftKey === false) {
      e.preventDefault()
      if (!value) return
      onSubmit(value)
      setValue('')
    }
  }

  return (
    <textarea
      ref={inputRef}
      disabled={!enabled}
      className="interact-input"
      placeholder={
        enabled ? 'Type your question here' : 'Wait for the answer to finish and then continue here'
      }
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={onKeyDown}
    />
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
    this.session = null
    this.done = false
  }
}

function ChatGPTQuery(props) {
  /**
   * @type {[Talk[], (talk: Talk[]) => void]}
   */
  const [talk, setTalk] = useState([
    new Talk('answer', '<p class="gpt-loading">Waiting for response...</p>'),
  ])
  const [isReady, setIsReady] = useState(false)
  const [port, setPort] = useState(() => Browser.runtime.connect())

  useEffect(() => {
    session.question = props.question
    port.postMessage({ session })
  }, [props.question]) // usually only triggered once

  /**
   * @param {string} value
   * @param {boolean} appended
   * @param {'question'|'answer'|'error'} newType
   * @param {boolean} done
   */
  const UpdateAnswer = (value, appended, newType, done = false) => {
    setTalk((old) => {
      const copy = [...old]
      const index = copy.findLastIndex((v) => v.type === 'answer')
      if (index === -1) return copy
      copy[index] = new Talk(newType, appended ? copy[index].content + value : value)
      copy[index].session = { ...session }
      copy[index].done = done
      return copy
    })
  }

  useEffect(() => {
    const listener = () => {
      setPort(Browser.runtime.connect())
    }
    port.onDisconnect.addListener(listener)
    return () => {
      port.onDisconnect.removeListener(listener)
    }
  }, [port])
  useEffect(() => {
    const listener = (msg) => {
      if (msg.answer) {
        UpdateAnswer(msg.answer, false, 'answer')
      }
      if (msg.session) {
        session = msg.session
      }
      if (msg.done) {
        UpdateAnswer('\n<hr>', true, 'answer', true)
        setIsReady(true)
      }
      if (msg.error) {
        switch (msg.error) {
          case 'UNAUTHORIZED':
            UpdateAnswer(
              `UNAUTHORIZED<br>Please login at https://chat.openai.com first${
                isSafari() ? '<br>Then open https://chat.openai.com/api/auth/session' : ''
              }<br>And refresh this page or type you question again`,
              false,
              'error',
            )
            break
          case 'CLOUDFLARE':
            UpdateAnswer(
              `OpenAI Security Check Required<br>Please open ${
                isSafari() ? 'https://chat.openai.com/api/auth/session' : 'https://chat.openai.com'
              }<br>And refresh this page or type you question again`,
              false,
              'error',
            )
            break
          default:
            setTalk([...talk, new Talk('error', msg.error + '\n<hr>')])
            break
        }
        setIsReady(true)
      }
    }
    port.onMessage.addListener(listener)
    return () => {
      port.onMessage.removeListener(listener)
    }
  }, [talk])

  return (
    <div className="gpt-inner">
      <div className="markdown-body">
        {talk.map((talk, idx) => (
          <TalkItem
            content={talk.content}
            key={idx}
            type={talk.type}
            session={talk.session}
            done={talk.done}
          />
        ))}
      </div>
      <Interact
        enabled={isReady}
        onSubmit={(question) => {
          const newQuestion = new Talk('question', '**You:**\n' + question)
          const newAnswer = new Talk('answer', '<p class="gpt-loading">Waiting for response...</p>')
          setTalk([...talk, newQuestion, newAnswer])
          setIsReady(false)

          session.question = question
          try {
            port.postMessage({ session })
          } catch (e) {
            UpdateAnswer(e, false, 'error')
          }
        }}
      />
    </div>
  )
}

ChatGPTQuery.propTypes = {
  question: PropTypes.string.isRequired,
}

export default memo(ChatGPTQuery)
