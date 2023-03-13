import Browser from 'webextension-polyfill'
import { cloneElement, useEffect, useRef, useState } from 'react'
import ConversationCardForSearch from '../ConversationCardForSearch'
import PropTypes from 'prop-types'
import { defaultConfig, getUserConfig } from '../../config.mjs'
import { config as toolsConfig } from '../../content-script/selection-tools'
import { updateRefHeight } from '../../utils/update-ref-height.mjs'
import { initSession } from '../../utils/index.mjs'

const logo = Browser.runtime.getURL('logo.png')

function FloatingToolbar(props) {
  const [prompt, setPrompt] = useState('')
  const [triggered, setTriggered] = useState(false)
  const [config, setConfig] = useState(defaultConfig)
  const [render, setRender] = useState(false)
  const [session] = useState(initSession())
  const toolWindow = useRef(null)

  useEffect(() => {
    getUserConfig()
      .then(setConfig)
      .then(() => setRender(true))
  }, [])

  useEffect(() => {
    const listener = (changes) => {
      const changedItems = Object.keys(changes)
      let newConfig = {}
      for (const key of changedItems) {
        newConfig[key] = changes[key].newValue
      }
      setConfig({ ...config, ...newConfig })
    }
    Browser.storage.local.onChanged.addListener(listener)
    return () => {
      Browser.storage.local.onChanged.removeListener(listener)
    }
  }, [config])

  if (!render) return <div />

  const tools = []

  for (const key in toolsConfig) {
    const toolConfig = toolsConfig[key]
    tools.push(
      cloneElement(toolConfig.icon, {
        size: 20,
        className: 'gpt-selection-toolbar-button',
        title: toolConfig.label,
        onClick: () => {
          setPrompt(toolConfig.genPrompt(props.selection))
          setTriggered(true)
        },
      }),
    )
  }

  return (
    <div data-theme={config.themeMode}>
      {triggered ? (
        <div className="gpt-selection-window" ref={toolWindow}>
          <div className="chat-gpt-container">
            <ConversationCardForSearch
              session={session}
              question={prompt}
              onUpdate={() => updateRefHeight(toolWindow)}
            />
          </div>
        </div>
      ) : (
        <div className="gpt-selection-toolbar">
          <img src={logo} width="24" height="24" />
          {tools}
        </div>
      )}
    </div>
  )
}

FloatingToolbar.propTypes = {
  selection: PropTypes.string.isRequired,
}

export default FloatingToolbar
