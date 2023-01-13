import './styles.scss'
import { render } from 'preact'
import ChatGPTCard from './ChatGPTCard'
import { config } from './search-engine-configs.mjs'
import { getPossibleElementByQuerySelector } from './utils.mjs'

/**
 * @param {string} question
 * @param {SiteConfig} siteConfig
 */
async function run(question, siteConfig) {
  const container = document.createElement('div')
  container.className = 'chat-gpt-container'
  render(
    <ChatGPTCard question={question} siteConfig={siteConfig} container={container} />,
    container,
  )
}

/**
 * @param {SiteConfig} siteConfig
 * @returns {string}
 */
function getSearchInputValue(siteConfig) {
  const searchInput = getPossibleElementByQuerySelector(siteConfig.inputQuery)
  if (searchInput && searchInput.value) {
    // only run on first page
    const startParam = new URL(location.href).searchParams.get('start') || '0'
    if (startParam === '0') {
      return searchInput.value
    }
  }
}

const siteRegex = new RegExp(Object.keys(config).join('|'))
const siteName = location.hostname.match(siteRegex)[0]
const siteAction = config[siteName].action
if (siteAction && siteAction.init) {
  siteAction.init(location.hostname, getSearchInputValue, run)
}
const searchValue = getSearchInputValue(config[siteName])
if (searchValue) {
  run(searchValue, config[siteName])
}
