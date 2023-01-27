import '@picocss/pico'
import { useEffect, useState } from 'preact/hooks'
import { setUserConfig, getUserConfig, TriggerMode, ThemeMode } from '../config'
import './styles.css'
import { MarkGithubIcon } from '@primer/octicons-react'
import Browser from 'webextension-polyfill'

function Popup() {
  const [triggerMode, setTriggerMode] = useState()
  const [themeMode, setThemeMode] = useState()
  const [insertAtTop, setInsertAtTop] = useState()
  const [siteRegex, setSiteRegex] = useState()
  const [userSiteRegexOnly, setUserSiteRegexOnly] = useState()
  const [inputQuery, setInputQuery] = useState()
  const [appendQuery, setAppendQuery] = useState()
  const [prependQuery, setPrependQuery] = useState()

  const [currentVersion, setCurrentVersion] = useState()
  const [latestVersion, setLatestVersion] = useState()

  useEffect(() => {
    getUserConfig().then((config) => {
      setTriggerMode(config.triggerMode)
      setThemeMode(config.themeMode)
      setInsertAtTop(config.insertAtTop)
      setSiteRegex(config.siteRegex)
      setUserSiteRegexOnly(config.userSiteRegexOnly)
      setInputQuery(config.inputQuery)
      setAppendQuery(config.appendQuery)
      setPrependQuery(config.prependQuery)

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
    document.documentElement.dataset.theme = themeMode
  }, [themeMode])

  return (
    <div className="container">
      <form>
        <fieldset
          onChange={(e) => {
            const mode = e.target.value
            setTriggerMode(mode)
            setUserConfig({ triggerMode: mode })
          }}
        >
          <legend>Trigger Mode</legend>
          {Object.entries(TriggerMode).map(([value, label]) => {
            return (
              <label htmlFor={value} key={value}>
                <input
                  type="radio"
                  id={value}
                  name="triggerMode"
                  value={value}
                  checked={triggerMode === value}
                />
                {label}
              </label>
            )
          })}
        </fieldset>
        <label>
          <legend>Theme Mode</legend>
          <select
            required
            onChange={(e) => {
              const mode = e.target.value
              setThemeMode(mode)
              setUserConfig({ themeMode: mode })
            }}
          >
            {Object.entries(ThemeMode).map(([value, label]) => {
              return (
                <option value={value} key={value} selected={value === themeMode}>
                  {label}
                </option>
              )
            })}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={insertAtTop}
            onChange={(e) => {
              const checked = e.target.checked
              setInsertAtTop(checked)
              setUserConfig({ insertAtTop: checked })
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
              value={siteRegex}
              onChange={(e) => {
                const regex = e.target.value
                setSiteRegex(regex)
                setUserConfig({ siteRegex: regex })
              }}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={userSiteRegexOnly}
              onChange={(e) => {
                const checked = e.target.checked
                setUserSiteRegexOnly(checked)
                setUserConfig({ userSiteRegexOnly: checked })
              }}
            />
            Only use Custom Site Regex for website matching, ignore built-in rules
          </label>
          <br />
          <label>
            Input Query:
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => {
                const query = e.target.value
                setInputQuery(query)
                setUserConfig({ inputQuery: query })
              }}
            />
          </label>
          <label>
            Append Query:
            <input
              type="text"
              value={appendQuery}
              onChange={(e) => {
                const query = e.target.value
                setAppendQuery(query)
                setUserConfig({ appendQuery: query })
              }}
            />
          </label>
          <label>
            Prepend Query:
            <input
              type="text"
              value={prependQuery}
              onChange={(e) => {
                const query = e.target.value
                setPrependQuery(query)
                setUserConfig({ prependQuery: query })
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
