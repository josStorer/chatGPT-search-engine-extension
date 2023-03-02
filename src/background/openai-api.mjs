// api version

import { Models } from '../config.js'
import { fetchSSE } from './fetch-sse.mjs'
import { isEmpty } from 'lodash-es'
import { getChatPairs } from '../utils.mjs'

const chatgptPromptBase =
  `You are a helpful, creative, clever, and very friendly assistant.` +
  `When you receive a question, you will analyse the language used(usually english) and reply in the same language.`

const gptPromptBase =
  `The following is a conversation with an AI assistant.` +
  `The assistant is helpful, creative, clever, and very friendly.` +
  `When the assistant receive a question, it will analyse the language(usually english)  used and reply in the same language.\n\n` +
  `Human: Hello, who are you?\n` +
  `AI: I am an AI created by OpenAI. How can I help you today?\n`

/**
 * @param {Browser.Runtime.Port} port
 * @param {string} question
 * @param {Session} session
 * @param {string} apiKey
 * @param {string} modelName
 */
export async function generateAnswersWithGptCompletionApi(
  port,
  question,
  session,
  apiKey,
  modelName,
) {
  const controller = new AbortController()
  port.onDisconnect.addListener(() => {
    console.debug('port disconnected')
    controller.abort()
  })

  const prompt =
    gptPromptBase + getChatPairs(session.conversationRecords, false) + `Human:${question}\nAI:`

  let answer = ''
  await fetchSSE('https://api.openai.com/v1/completions', {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: prompt,
      model: Models[modelName].value,
      stream: true,
      max_tokens: 1000,
    }),
    onMessage(message) {
      console.debug('sse message', message)
      if (message === '[DONE]') {
        session.conversationRecords.push({ question: question, answer: answer })
        console.debug('conversation history', { content: session.conversationRecords })
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
      answer += data.choices[0].text
      port.postMessage({ answer: answer, done: false, session: null })
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

/**
 * @param {Browser.Runtime.Port} port
 * @param {string} question
 * @param {Session} session
 * @param {string} apiKey
 * @param {string} modelName
 */
export async function generateAnswersWithChatgptApi(port, question, session, apiKey, modelName) {
  const controller = new AbortController()
  port.onDisconnect.addListener(() => {
    console.debug('port disconnected')
    controller.abort()
  })

  const prompt = getChatPairs(session.conversationRecords, true)
  prompt.unshift({ role: 'system', content: chatgptPromptBase })
  prompt.push({ role: 'user', content: question })

  console.debug('dsdsd', prompt)

  let answer = ''
  await fetchSSE('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      messages: prompt,
      model: Models[modelName].value,
      stream: true,
      max_tokens: 1000,
    }),
    onMessage(message) {
      console.debug('sse message', message)
      if (message === '[DONE]') {
        session.conversationRecords.push({ question: question, answer: answer })
        console.debug('conversation history', { content: session.conversationRecords })
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
      if ('content' in data.choices[0].delta) answer += data.choices[0].delta.content
      port.postMessage({ answer: answer, done: false, session: null })
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
