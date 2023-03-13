import './styles.scss'
import { render } from 'preact'
import DecisionCardForSearch from '../components/DecisionCardForSearch'
import { config as siteConfig } from './site-adapters'
import { clearOldAccessToken, getUserConfig, setAccessToken } from '../config'
import { getPossibleElementByQuerySelector, initSession, isSafari } from '../utils'

window.session = initSession()

/**
 * @param {SiteConfig} siteConfig
 * @param {UserConfig} userConfig
 */
async function mountComponent(siteConfig, userConfig) {
  if (
    !getPossibleElementByQuerySelector(siteConfig.sidebarContainerQuery) &&
    !getPossibleElementByQuerySelector(siteConfig.appendContainerQuery) &&
    !getPossibleElementByQuerySelector(siteConfig.sidebarContainerQuery) &&
    !getPossibleElementByQuerySelector([userConfig.prependQuery]) &&
    !getPossibleElementByQuerySelector([userConfig.appendQuery])
  )
    return

  document.querySelectorAll('.chat-gpt-container').forEach((e) => e.remove())

  let question
  if (userConfig.inputQuery) question = await getInput([userConfig.inputQuery])
  if (!question && siteConfig) question = await getInput(siteConfig.inputQuery)

  document.querySelectorAll('.chat-gpt-container').forEach((e) => e.remove())
  const container = document.createElement('div')
  container.className = 'chat-gpt-container'
  render(
    <DecisionCardForSearch
      session={initSession()}
      question={question}
      siteConfig={siteConfig}
      container={container}
    />,
    container,
  )
}

/**
 * @param {string[]|function} inputQuery
 * @returns {Promise<string>}
 */
async function getInput(inputQuery) {
  if (typeof inputQuery === 'function') return await inputQuery()
  const searchInput = getPossibleElementByQuerySelector(inputQuery)
  if (searchInput && searchInput.value) {
    return searchInput.value
  }
}

async function prepareForSafari() {
  await clearOldAccessToken()

  if (location.hostname !== 'chat.openai.com' || location.pathname !== '/api/auth/session') return

  const response = document.querySelector('pre').textContent

  let data
  try {
    data = JSON.parse(response)
  } catch (error) {
    console.error('json error', error)
    return
  }
  if (data.accessToken) {
    await setAccessToken(data.accessToken)
  }
}

async function run() {
  if (isSafari()) await prepareForSafari()

  const userConfig = await getUserConfig()
  let siteRegex
  if (userConfig.userSiteRegexOnly) siteRegex = userConfig.siteRegex
  else
    siteRegex = new RegExp(
      (userConfig.siteRegex && userConfig.siteRegex + '|') + Object.keys(siteConfig).join('|'),
    )

  const matches = location.hostname.match(siteRegex)
  if (matches) {
    const siteName = matches[0]
    if (siteName in siteConfig) {
      const siteAction = siteConfig[siteName].action
      if (siteAction && siteAction.init) {
        await siteAction.init(location.hostname, userConfig, getInput, mountComponent)
      }
    }
    mountComponent(siteConfig[siteName], userConfig)
  }
}

run()
