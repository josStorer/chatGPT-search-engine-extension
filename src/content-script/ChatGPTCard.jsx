import { LightBulbIcon, SearchIcon } from '@primer/octicons-react'
import { useState, useEffect } from 'preact/hooks'
import PropTypes from 'prop-types'
import ChatGPTQuery from './ChatGPTQuery'
import { endsWithQuestionMark } from './utils.mjs'
import { initUserConfig, getDefaultConfig } from '../config'
import Browser from 'webextension-polyfill'

function ChatGPTCard(props) {
  const [triggered, setTriggered] = useState(false)
  const [config, setConfig] = useState(getDefaultConfig())
  const [render, setRender] = useState(false)
  useEffect(() => {
    initUserConfig()
      .then(setConfig)
      .then(() => setRender(true))
    const listener = (changes) => {
      if (changes.gpt_extension_config) {
        setConfig(changes.gpt_extension_config.newValue)
      }
    }
    Browser.storage.local.onChanged.addListener(listener)
    return () => {
      Browser.storage.local.onChanged.removeListener(listener)
    }
  }, [])

  return (
    render && (
      <div data-theme={config.themeMode}>
        {(() => {
          switch (config.triggerMode) {
            case 'always':
              return <ChatGPTQuery question={props.question} />
            case 'manually':
              if (triggered) {
                return <ChatGPTQuery question={props.question} />
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
              if (endsWithQuestionMark(props.question.trim())) {
                return <ChatGPTQuery question={props.question} />
              }
              return (
                <p className="gpt-inner icon-and-text">
                  <LightBulbIcon size="small" /> Trigger ChatGPT by append a question mark after
                  your query
                </p>
              )
          }
        })()}
      </div>
    )
  )
}

ChatGPTCard.propTypes = {
  question: PropTypes.string.isRequired,
}

export default ChatGPTCard
