import { LightBulbIcon, SearchIcon } from '@primer/octicons-react'
import { useState, useEffect } from 'preact/hooks'
import { createContext } from 'preact'
import PropTypes from 'prop-types'
import ChatGPTQuery from './ChatGPTQuery'
import { endsWithQuestionMark } from './utils.mjs'
import { initUserConfig, getDefaultConfig } from '../config'

export const UserConfig = createContext(getDefaultConfig())

function ChatGPTCard(props) {
  const [triggered, setTriggered] = useState(false)
  const [config, setConfig] = useState(getDefaultConfig())
  useEffect(() => {
    initUserConfig().then(setConfig)
    window.addEventListener('storage', (e) => {
      if (e.key === 'gpt_extension_config') {
        setConfig(JSON.parse(e.newValue))
        console.log(e.newValue)
      }
    })
  }, [])

  return (
    <UserConfig.Provider value={config}>
      {(() => {
        switch (config.triggerMode) {
          case 'always':
            return <ChatGPTQuery question={props.question} />
          case 'manually':
            if (triggered) {
              return <ChatGPTQuery question={props.question} />
            }
            return (
              <p className="gpt-inner manual-btn icon-and-text" onClick={() => setTriggered(true)}>
                <SearchIcon size="small" /> Ask ChatGPT for this query
              </p>
            )
          case 'questionMark':
            if (endsWithQuestionMark(props.question.trim())) {
              return <ChatGPTQuery question={props.question} />
            }
            return (
              <p className="gpt-inner icon-and-text">
                <LightBulbIcon size="small" /> Trigger ChatGPT by append a question mark after your
                query
              </p>
            )
        }
      })()}
    </UserConfig.Provider>
  )
}

ChatGPTCard.propTypes = {
  question: PropTypes.string.isRequired,
  config: PropTypes.object.isRequired,
}

export default ChatGPTCard
