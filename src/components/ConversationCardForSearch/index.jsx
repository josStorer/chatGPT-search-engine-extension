import { memo, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import Browser from 'webextension-polyfill'
import InputBox from '../InputBox'
import ConversationItem from '../ConversationItem'
import { initSession, isSafari } from '../../utils'
import { DownloadIcon } from '@primer/octicons-react'
import FileSaver from 'file-saver'

const logo = Browser.runtime.getURL('logo.png')

class ConversationItemData extends Object {
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

function ConversationCardForSearch(props) {
  /**
   * @type {[ConversationItemData[], (conversationItemData: ConversationItemData[]) => void]}
   */
  const [conversationItemData, setConversationItemData] = useState([
    new ConversationItemData('answer', '<p class="gpt-loading">Waiting for response...</p>'),
  ])
  const [isReady, setIsReady] = useState(false)
  const [port, setPort] = useState(() => Browser.runtime.connect())
  const [session, setSession] = useState(props.session)

  useEffect(() => {
    if (props.onUpdate) props.onUpdate()
  })

  useEffect(() => {
    // when the page is responsive, session may accumulate redundant data and needs to be cleared after remounting and before making a new request
    const newSession = initSession({ question: props.question })
    setSession(newSession)
    port.postMessage({ session: newSession })
  }, [props.question]) // usually only triggered once

  /**
   * @param {string} value
   * @param {boolean} appended
   * @param {'question'|'answer'|'error'} newType
   * @param {boolean} done
   */
  const UpdateAnswer = (value, appended, newType, done = false) => {
    setConversationItemData((old) => {
      const copy = [...old]
      const index = copy.findLastIndex((v) => v.type === 'answer')
      if (index === -1) return copy
      copy[index] = new ConversationItemData(
        newType,
        appended ? copy[index].content + value : value,
      )
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
        setSession(msg.session)
      }
      if (msg.done) {
        UpdateAnswer('\n<hr/>', true, 'answer', true)
        setIsReady(true)
      }
      if (msg.error) {
        switch (msg.error) {
          case 'UNAUTHORIZED':
            UpdateAnswer(
              `UNAUTHORIZED<br>Please login at https://chat.openai.com first${
                isSafari() ? '<br>Then open https://chat.openai.com/api/auth/session' : ''
              }<br>And refresh this page or type you question again` +
                `<br><br>Consider creating an api key at https://platform.openai.com/account/api-keys<hr>`,
              false,
              'error',
            )
            break
          case 'CLOUDFLARE':
            UpdateAnswer(
              `OpenAI Security Check Required<br>Please open ${
                isSafari() ? 'https://chat.openai.com/api/auth/session' : 'https://chat.openai.com'
              }<br>And refresh this page or type you question again` +
                `<br><br>Consider creating an api key at https://platform.openai.com/account/api-keys<hr>`,
              false,
              'error',
            )
            break
          default:
            setConversationItemData([
              ...conversationItemData,
              new ConversationItemData('error', msg.error + '\n<hr/>'),
            ])
            break
        }
        setIsReady(true)
      }
    }
    port.onMessage.addListener(listener)
    return () => {
      port.onMessage.removeListener(listener)
    }
  }, [conversationItemData])

  return (
    <div className="gpt-inner">
      <div className="gpt-header">
        <img src={logo} width="20" height="20" style="margin:5px 15px 0px;" />
        <span
          title="Save Conversation"
          className="gpt-util-icon"
          style="margin:15px 15px 10px;"
          onClick={() => {
            let output = ''
            session.conversationRecords.forEach((data) => {
              output += `Question:\n\n${data.question}\n\nAnswer:\n\n${data.answer}\n\n<hr/>\n\n`
            })
            const blob = new Blob([output], { type: 'text/plain;charset=utf-8' })
            FileSaver.saveAs(blob, 'conversation.md')
          }}
        >
          <DownloadIcon size={16} />
        </span>
      </div>
      <hr />
      <div className="markdown-body">
        {conversationItemData.map((data, idx) => (
          <ConversationItem
            content={data.content}
            key={idx}
            type={data.type}
            session={data.session}
            done={data.done}
          />
        ))}
      </div>
      <InputBox
        enabled={isReady}
        onSubmit={(question) => {
          const newQuestion = new ConversationItemData('question', question + '\n<hr/>')
          const newAnswer = new ConversationItemData(
            'answer',
            '<p class="gpt-loading">Waiting for response...</p>',
          )
          setConversationItemData([...conversationItemData, newQuestion, newAnswer])
          setIsReady(false)

          const newSession = { ...session, question }
          setSession(newSession)
          try {
            port.postMessage({ session: newSession })
          } catch (e) {
            UpdateAnswer(e, false, 'error')
          }
        }}
      />
    </div>
  )
}

ConversationCardForSearch.propTypes = {
  session: PropTypes.object.isRequired,
  question: PropTypes.string.isRequired,
  onUpdate: PropTypes.func,
}

export default memo(ConversationCardForSearch)
