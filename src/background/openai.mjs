import { Models } from '../config.js'
import { fetchSSE } from './fetch-sse.mjs'
import { isEmpty } from 'lodash-es'

/**
 * @param {Browser.Runtime.Port} port
 * @param {string} question
 * @param {Session} session
 * @param {string} apiKey
 * @param {string} modelName
 */
export async function generateAnswersWithOpenAiApi(port, question, session, apiKey, modelName) {
  const controller = new AbortController()
  port.onDisconnect.addListener(() => {
    console.debug('port disconnected')
    controller.abort()
  })

  if (!session.conversationContent) {
    session.conversationContent =
      `The following is a conversation with an AI assistant. ` +
      `The assistant is helpful, creative, clever, and very friendly.\n\n` +
      `Human: Hello, who are you?\n` +
      `AI: I am an AI created by OpenAI. How can I help you today?\n` +
      `Human: ${question}\n`
  } else {
    session.conversationContent += `\nHuman: ${question}\n`
  }

  let text = ''
  await fetchSSE('https://api.openai.com/v1/completions', {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: session.conversationContent,
      model: Models[modelName].value,
      stream: true,
      max_tokens: 1000,
    }),
    onMessage(message) {
      console.debug('sse message', message)
      if (message === '[DONE]') {
        session.conversationContent += text
        console.debug('conversation history', { content: session.conversationContent })
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
      text += data.choices[0].text
      port.postMessage({ answer: text.replace(/^A?I?:? ?/, ''), done: false, session: null })
    },
    async onStart() {},
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
