import './styles.scss'
import { render } from 'preact'
import DecisionCardForSearch from '../components/DecisionCardForSearch'
import { config as siteConfig } from './site-adapters'
import { clearOldAccessToken, getUserConfig, setAccessToken } from '../config'
import {
  createElementAtPosition,
  getPossibleElementByQuerySelector,
  initSession,
  isSafari,
} from '../utils'
import FloatingToolbar from '../components/FloatingToolbar'

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

let toolbarContainer

async function prepareForSelectionTools() {
  document.addEventListener('mouseup', (e) => {
    if (toolbarContainer && toolbarContainer.contains(e.target)) return
    if (
      toolbarContainer &&
      window.getSelection()?.rangeCount > 0 &&
      toolbarContainer.contains(window.getSelection()?.getRangeAt(0).endContainer.parentElement)
    )
      return

    if (toolbarContainer) toolbarContainer.remove()
    setTimeout(() => {
      const selection = window.getSelection()?.toString()
      if (selection) {
        const position = { x: e.clientX + 15, y: e.clientY - 15 }
        toolbarContainer = createElementAtPosition(position.x, position.y)
        toolbarContainer.className = 'toolbar-container'
        render(
          <FloatingToolbar
            selection={selection}
            position={position}
            container={toolbarContainer}
          />,
          toolbarContainer,
        )
      }
    })
  })
  document.addEventListener('mousedown', (e) => {
    if (toolbarContainer && toolbarContainer.contains(e.target)) return

    document.querySelectorAll('.toolbar-container').forEach((e) => e.remove())
  })
  document.addEventListener('keydown', (e) => {
    if (
      toolbarContainer &&
      !toolbarContainer.contains(e.target) &&
      (e.target.nodeName === 'INPUT' || e.target.nodeName === 'TEXTAREA')
    ) {
      setTimeout(() => {
        if (!window.getSelection()?.toString()) toolbarContainer.remove()
      })
    }
  })
}

async function prepareForStaticCard() {
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

async function run() {
  if (isSafari()) await prepareForSafari()
  prepareForSelectionTools()
  prepareForStaticCard()
}

run()
