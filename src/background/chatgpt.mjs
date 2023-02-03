import { fetchSSE } from './fetch-sse.mjs'
import { isEmpty } from 'lodash-es'
import { Models } from '../config.js'

async function request(token, method, path, data) {
  const response = await fetch(`https://chat.openai.com/backend-api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  const responseText = await response.text()
  console.debug(`request: ${path}`, responseText)
  return { response, responseText }
}

export async function sendMessageFeedback(token, data) {
  await request(token, 'POST', '/conversation/message_feedback', data)
}

export async function setConversationProperty(token, conversationId, propertyObject) {
  await request(token, 'PATCH', `/conversation/${conversationId}`, propertyObject)
}

export async function sendModerations(token, question, conversationId, messageId) {
  await request(token, 'POST', `/moderations`, {
    conversation_id: conversationId,
    input: question,
    message_id: messageId,
    model: 'text-moderation-playground',
  })
}

/**
 * @param {Runtime.Port} port
 * @param {string} question
 * @param {Session} session
 * @param {string} accessToken
 */
export async function generateAnswersWithChatGptApi(port, question, session, accessToken) {
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
      model: Models.normal.value,
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
