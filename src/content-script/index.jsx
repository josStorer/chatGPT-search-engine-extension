import './styles.scss'
import { render } from 'preact'
import ChatGPTCard from './ChatGPTCard'
import { config as siteConfig } from './search-engine-configs.mjs'
import { getPossibleElementByQuerySelector } from './utils.mjs'
import { getUserConfig } from '../config'

/**
 * @param {SiteConfig} siteConfig
 * @param {UserConfig} userConfig
 */
async function mountComponent(siteConfig, userConfig) {
  let question
  if (userConfig.inputQuery) question = getSearchInputValue([userConfig.inputQuery])
  if (!question && siteConfig) question = getSearchInputValue(siteConfig.inputQuery)

  const container = document.createElement('div')
  container.className = 'chat-gpt-container'
  render(
    <ChatGPTCard question={question} siteConfig={siteConfig} container={container} />,
    container,
  )
}

/**
 * @param {string[]} inputQuery
 * @returns {string}
 */
function getSearchInputValue(inputQuery) {
  const searchInput = getPossibleElementByQuerySelector(inputQuery)
  if (searchInput && searchInput.value) {
    return searchInput.value
  }
}

async function run() {
  const userConfig = await getUserConfig()
  let siteRegex
  if (userConfig.userSiteRegexOnly) siteRegex = userConfig.siteRegex
  else siteRegex = new RegExp(userConfig.siteRegex + '|' + Object.keys(siteConfig).join('|'))

  const matches = location.hostname.match(siteRegex)
  if (matches) {
    const siteName = matches[0]
    if (siteName in siteConfig) {
      const siteAction = siteConfig[siteName].action
      if (siteAction && siteAction.init) {
        siteAction.init(location.hostname, userConfig, getSearchInputValue, mountComponent)
      }
    }
    mountComponent(siteConfig[siteName], userConfig)
  }
}

run()
