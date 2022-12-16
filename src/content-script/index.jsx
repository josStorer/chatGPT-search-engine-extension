import './styles.scss'
import { render } from 'preact'
import ChatGPTCard from './ChatGPTCard'
import { config } from './search-engine-configs.mjs'
import { getPossibleElementByQuerySelector } from './utils.mjs'

export async function run(question, siteConfig) {
  const container = document.createElement('div')
  container.className = 'chat-gpt-container'

  const siderbarContainer = getPossibleElementByQuerySelector(siteConfig.sidebarContainerQuery)
  if (siderbarContainer) {
    siderbarContainer.prepend(container)
  } else {
    container.classList.add('sidebar-free')
    const appendContainer = getPossibleElementByQuerySelector(siteConfig.appendContainerQuery)
    if (appendContainer) {
      appendContainer.appendChild(container)
    }
  }

  render(<ChatGPTCard question={question} />, container)
}

export function getSearchInputValue(siteConfig) {
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
  siteAction.init()
}
const searchValue = getSearchInputValue(config[siteName])
if (searchValue) {
  run(searchValue, config[siteName])
}
