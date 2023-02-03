import '@picocss/pico'
import { useEffect, useState } from 'preact/hooks'
import {
  setUserConfig,
  getUserConfig,
  TriggerMode,
  ThemeMode,
  defaultConfig,
  Models,
  isUsingApiKey,
} from '../config'
import './styles.css'
import { MarkGithubIcon } from '@primer/octicons-react'
import Browser from 'webextension-polyfill'

function Popup() {
  const [config, setConfig] = useState(defaultConfig)
  const [currentVersion, setCurrentVersion] = useState('')
  const [latestVersion, setLatestVersion] = useState('')

  const updateConfig = (value) => {
    setConfig({ ...config, ...value })
    setUserConfig(value)
  }

  useEffect(() => {
    getUserConfig().then((config) => {
      setConfig(config)
      setCurrentVersion(Browser.runtime.getManifest().version.replace('v', ''))
      fetch(
        'https://api.github.com/repos/josstorer/chatgpt-search-engine-extension/releases/latest',
      ).then((response) =>
        response.json().then((data) => {
          setLatestVersion(data.tag_name.replace('v', ''))
        }),
      )
    })
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = config.themeMode
  }, [config.themeMode])

  return (
    <div className="container">
      <form>
        <label>
          <legend>Trigger Mode</legend>
          <select
            required
            onChange={(e) => {
              const mode = e.target.value
              updateConfig({ triggerMode: mode })
            }}
          >
            {Object.entries(TriggerMode).map(([key, desc]) => {
              return (
                <option value={key} key={key} selected={key === config.triggerMode}>
                  {desc}
                </option>
              )
            })}
          </select>
        </label>
        <label>
          <legend>Theme Mode</legend>
          <select
            required
            onChange={(e) => {
              const mode = e.target.value
              updateConfig({ themeMode: mode })
            }}
          >
            {Object.entries(ThemeMode).map(([key, desc]) => {
              return (
                <option value={key} key={key} selected={key === config.themeMode}>
                  {desc}
                </option>
              )
            })}
          </select>
        </label>
        <label>
          <legend>API Mode</legend>
          <span style="display: flex; gap: 15px;">
            <select
              style={isUsingApiKey(config) ? 'width: 50%;' : undefined}
              required
              onChange={(e) => {
                const modelName = e.target.value
                updateConfig({ modelName: modelName })
              }}
            >
              {Object.entries(Models).map(([key, model]) => {
                return (
                  <option value={key} key={key} selected={key === config.modelName}>
                    {model.desc}
                  </option>
                )
              })}
            </select>
            {isUsingApiKey(config) && (
              <span style="width: 50%; display: flex; gap: 5px;">
                <input
                  type="password"
                  value={config.apiKey}
                  placeholder="API Key"
                  onChange={(e) => {
                    const apiKey = e.target.value
                    updateConfig({ apiKey: apiKey })
                  }}
                />
                {config.apiKey.length === 0 && (
                  <a
                    href="https://platform.openai.com/account/api-keys"
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                  >
                    <button type="button">Get</button>
                  </a>
                )}
              </span>
            )}
          </span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={config.insertAtTop}
            onChange={(e) => {
              const checked = e.target.checked
              updateConfig({ insertAtTop: checked })
            }}
          />
          Insert chatGPT at the top of search results
        </label>
        <br />
        <details>
          <summary>Advanced</summary>
          <label>
            Custom Site Regex:
            <input
              type="text"
              value={config.siteRegex}
              onChange={(e) => {
                const regex = e.target.value
                updateConfig({ siteRegex: regex })
              }}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={config.userSiteRegexOnly}
              onChange={(e) => {
                const checked = e.target.checked
                updateConfig({ userSiteRegexOnly: checked })
              }}
            />
            Only use Custom Site Regex for website matching, ignore built-in rules
          </label>
          <br />
          <label>
            Input Query:
            <input
              type="text"
              value={config.inputQuery}
              onChange={(e) => {
                const query = e.target.value
                updateConfig({ inputQuery: query })
              }}
            />
          </label>
          <label>
            Append Query:
            <input
              type="text"
              value={config.appendQuery}
              onChange={(e) => {
                const query = e.target.value
                updateConfig({ appendQuery: query })
              }}
            />
          </label>
          <label>
            Prepend Query:
            <input
              type="text"
              value={config.prependQuery}
              onChange={(e) => {
                const query = e.target.value
                updateConfig({ prependQuery: query })
              }}
            />
          </label>
        </details>
      </form>
      <>
        Current Version: {currentVersion}{' '}
        {currentVersion === latestVersion ? (
          '(Latest)'
        ) : (
          <>
            (Latest:{' '}
            <a
              href={
                'https://github.com/josStorer/chatGPT-search-engine-extension/releases/tag/v' +
                latestVersion
              }
              target="_blank"
              rel="nofollow noopener noreferrer"
            >
              {latestVersion}
            </a>
            )
          </>
        )}
      </>
      <a
        href="https://github.com/josStorer/chatGPT-search-engine-extension"
        target="_blank"
        rel="nofollow noopener noreferrer"
        className="github-link"
      >
        <MarkGithubIcon />
      </a>
    </div>
  )
}

export default Popup
