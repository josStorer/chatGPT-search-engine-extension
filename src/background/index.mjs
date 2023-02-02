import ExpiryMap from 'expiry-map'
import { v4 as uuidv4 } from 'uuid'
import Browser from 'webextension-polyfill'
import { sendMessageFeedback, setConversationProperty } from './chatgpt.mjs'
import { fetchSSE } from './fetch-sse.mjs'
import { isSafari } from '../content-script/utils.mjs'
import { getUserConfig } from '../config.js'
import { isEmpty } from 'lodash-es'

const KEY_ACCESS_TOKEN = 'accessToken'
const cache = new ExpiryMap(10 * 1000)

/**
 * @returns {Promise<string>}
 */
async function getAccessToken() {
  if (cache.get(KEY_ACCESS_TOKEN)) {
    return cache.get(KEY_ACCESS_TOKEN)
  }
  if (isSafari()) {
    const userConfig = await getUserConfig()
    if (userConfig.accessToken) {
      cache.set(KEY_ACCESS_TOKEN, userConfig.accessToken)
    } else {
      throw new Error('UNAUTHORIZED')
    }
  } else {
    const resp = await fetch('https://chat.openai.com/api/auth/session')
    if (resp.status === 403) {
      throw new Error('CLOUDFLARE')
    }
    const data = await resp.json().catch(() => ({}))
    if (!data.accessToken) {
      throw new Error('UNAUTHORIZED')
    }
    cache.set(KEY_ACCESS_TOKEN, data.accessToken)
  }
  return cache.get(KEY_ACCESS_TOKEN)
}

/**
 * @param {Browser.Runtime.Port} port
 * @param {string} question
 * @param {Session} session
 */
async function generateAnswers(port, question, session) {
  const accessToken = await getAccessToken()

  const deleteConversation = () => {
    setConversationProperty(accessToken, session.conversationId, { is_visible: false })
  }

  const controller = new AbortController()
  port.onDisconnect.addListener(() => {
    console.debug('port disconnected')
    controller.abort()
    deleteConversation()
  })

  await fetchSSE('https://chat.openai.com/backend-api/conversation', {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      action: 'next',
      conversation_id: session.conversationId,
      messages: [
        {
          id: session.messageId,
          role: 'user',
          content: {
            content_type: 'text',
            parts: [question],
          },
        },
      ],
      model: 'text-davinci-002-render-next',
      parent_message_id: session.parentMessageId,
    }),
    onMessage(message) {
      console.debug('sse message', message)
      if (message === '[DONE]') {
        port.postMessage({ answer: null, done: true, session: session })
        return
      }
      let data
      try {
        data = JSON.parse(message)
      } catch (error) {
        console.debug('json error', error)
        return
      }
      if (data.conversation_id) session.conversationId = data.conversation_id
      if (data.message?.id) session.parentMessageId = data.message.id

      const text = data.message?.content?.parts?.[0]
      if (text) {
        port.postMessage({ answer: text, done: false, session: session })
      }
    },
    async onStart() {
      // sendModerations(accessToken, question, session.conversationId, session.messageId)
    },
    async onEnd() {},
    async onError(resp) {
      if (resp.status === 403) {
        throw new Error('CLOUDFLARE')
      }
      const error = await resp.json().catch(() => ({}))
      throw new Error(!isEmpty(error) ? JSON.stringify(error) : `${resp.status} ${resp.statusText}`)
    },
  })
}

Browser.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(async (msg) => {
    console.debug('received msg', msg)
    const session = msg.session
    session.messageId = uuidv4()
    if (session.parentMessageId == null) {
      session.parentMessageId = uuidv4()
    }
    try {
      await generateAnswers(port, session.question, session)
    } catch (err) {
      console.error(err)
      port.postMessage({ error: err.message })
      cache.delete(KEY_ACCESS_TOKEN)
    }
  })
})

Browser.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'FEEDBACK') {
    const token = await getAccessToken()
    await sendMessageFeedback(token, message.data)
  }
})
