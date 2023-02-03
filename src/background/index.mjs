import { v4 as uuidv4 } from 'uuid'
import Browser from 'webextension-polyfill'
import { generateAnswersWithChatGptApi, sendMessageFeedback } from './chatgpt.mjs'
import { getUserConfig, isUsingApiKey } from '../config.js'
import { generateAnswersWithOpenAiApi } from './openai.mjs'
import ExpiryMap from 'expiry-map'
import { isSafari } from '../content-script/utils.mjs'

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

Browser.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(async (msg) => {
    console.debug('received msg', msg)
    const config = await getUserConfig()
    const session = msg.session
    if (session.useApiKey == null) {
      session.useApiKey = isUsingApiKey(config)
      if (session.useApiKey) {
        session.conversationId = uuidv4()
      }
    }

    try {
      if (session.useApiKey) {
        await generateAnswersWithOpenAiApi(
          port,
          session.question,
          session,
          config.apiKey,
          config.modelName,
        )
      } else {
        const accessToken = await getAccessToken()
        session.messageId = uuidv4()
        if (session.parentMessageId == null) {
          session.parentMessageId = uuidv4()
        }
        await generateAnswersWithChatGptApi(port, session.question, session, accessToken)
      }
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
