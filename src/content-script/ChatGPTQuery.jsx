import { memo } from 'react'
import { useEffect, useMemo, useState } from 'preact/hooks'
import PropTypes from 'prop-types'
import { MarkdownRender } from './markdown.jsx'
import Browser from 'webextension-polyfill'
import ChatGPTFeedback from './ChatGPTFeedback'
import { ChevronDownIcon, CopyIcon, XCircleIcon, LinkExternalIcon } from '@primer/octicons-react'
import { motion } from 'framer-motion'
import { isSafari } from './utils.mjs'

let session = {
  question: null,
  conversationId: null,
  messageId: null,
  parentMessageId: null,
}

const copyAnimation = {
  normal: { scale: 1 },
  copied: { scale: 1.2, y: [0, -1.5, 3, 0] },
}

function TalkItem({ type, content, session, done }) {
  const [collapsed, setCollapsed] = useState(false)
  const [copied, setCopied] = useState(false)

  return (
    <div className={type} dir="auto">
      {type === 'answer' && (
        <div className="gpt-header">
          <p>ChatGPT:</p>
          <div style="display: flex; gap: 15px;">
            {done && (
              <ChatGPTFeedback
                messageId={session.messageId}
                conversationId={session.conversationId}
              />
            )}
            {session && session.conversationId && (
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
            {session && (
              <motion.span
                title="Copy"
                className="gpt-util-icon"
                animate={copied ? 'copied' : 'normal'}
                variants={copyAnimation}
                onClick={() => {
                  navigator.clipboard
                    .writeText(content)
                    .then(() => setCopied(true))
                    .then(() =>
                      setTimeout(() => {
                        setCopied(false)
                      }, 400),
                    )
                }}
              >
                <CopyIcon size={14} />
              </motion.span>
            )}
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
    this.session = null
    this.done = false
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

  const port = useMemo(() => Browser.runtime.connect(), [])
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
              }`,
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
