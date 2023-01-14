import { LightBulbIcon, SearchIcon } from '@primer/octicons-react'
import { useState, useEffect } from 'preact/hooks'
import PropTypes from 'prop-types'
import ChatGPTQuery from './ChatGPTQuery'
import { getPossibleElementByQuerySelector, endsWithQuestionMark } from './utils.mjs'
import { defaultConfig, getUserConfig } from '../config'
import Browser from 'webextension-polyfill'

function ChatGPTCard(props) {
  const [triggered, setTriggered] = useState(false)
  const [config, setConfig] = useState(defaultConfig)
  const [render, setRender] = useState(false)

  const question = props.question

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

  const updatePosition = () => {
    if (!render) return

    const container = props.container
    const siteConfig = props.siteConfig
    container.classList.remove('sidebar-free')

    if (config.appendQuery) {
      const appendContainer = getPossibleElementByQuerySelector([config.appendQuery])
      if (appendContainer) {
        appendContainer.appendChild(container)
        return
      }
    }

    if (config.prependQuery) {
      const prependContainer = getPossibleElementByQuerySelector([config.prependQuery])
      if (prependContainer) {
        prependContainer.prepend(container)
        return
      }
    }

    if (!siteConfig) return

    if (config.insertAtTop) {
      const resultsContainerQuery = getPossibleElementByQuerySelector(
        siteConfig.resultsContainerQuery,
      )
      if (resultsContainerQuery) resultsContainerQuery.prepend(container)
    } else {
      const siderbarContainer = getPossibleElementByQuerySelector(siteConfig.sidebarContainerQuery)
      if (siderbarContainer) {
        siderbarContainer.prepend(container)
      } else {
        const appendContainer = getPossibleElementByQuerySelector(siteConfig.appendContainerQuery)
        if (appendContainer) {
          container.classList.add('sidebar-free')
          appendContainer.appendChild(container)
        } else {
          const resultsContainerQuery = getPossibleElementByQuerySelector(
            siteConfig.resultsContainerQuery,
          )
          if (resultsContainerQuery) resultsContainerQuery.prepend(container)
        }
      }
    }
  }

  useEffect(() => updatePosition(), [config])

  return (
    render && (
      <div data-theme={config.themeMode}>
        {(() => {
          if (question)
            switch (config.triggerMode) {
              case 'always':
                return <ChatGPTQuery question={question} />
              case 'manually':
                if (triggered) {
                  return <ChatGPTQuery question={question} />
                }
                return (
                  <p
                    className="gpt-inner manual-btn icon-and-text"
                    onClick={() => setTriggered(true)}
                  >
                    <SearchIcon size="small" /> Ask ChatGPT for this query
                  </p>
                )
              case 'questionMark':
                if (endsWithQuestionMark(question.trim())) {
                  return <ChatGPTQuery question={question} />
                }
                return (
                  <p className="gpt-inner icon-and-text">
                    <LightBulbIcon size="small" /> Trigger ChatGPT by appending a question mark
                    after your query
                  </p>
                )
            }
          else
            return (
              <p className="gpt-inner icon-and-text">
                <LightBulbIcon size="small" /> No input found, set your input query in the extension
                popup window
              </p>
            )
        })()}
      </div>
    )
  )
}

ChatGPTCard.propTypes = {
  question: PropTypes.string.isRequired,
  siteConfig: PropTypes.object.isRequired,
  container: PropTypes.object.isRequired,
}

export default ChatGPTCard
