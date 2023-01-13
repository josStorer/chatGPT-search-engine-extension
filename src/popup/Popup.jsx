import '@picocss/pico'
import { useEffect, useState } from 'preact/hooks'
import { setUserConfig, getUserConfig, TriggerMode, ThemeMode } from '../config'
import './styles.css'
import { MarkGithubIcon } from '@primer/octicons-react'

function Popup() {
  const [triggerMode, setTriggerMode] = useState()
  const [themeMode, setThemeMode] = useState()
  const [insertAtTop, setInsertAtTop] = useState()
  const [appendQuery, setAppendQuery] = useState()
  const [prependQuery, setPrependQuery] = useState()

  useEffect(() => {
    getUserConfig().then((config) => {
      setTriggerMode(config.triggerMode)
      setThemeMode(config.themeMode)
      setInsertAtTop(config.insertAtTop)
      setAppendQuery(config.appendQuery)
      setPrependQuery(config.prependQuery)
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
      <a
        href="https://github.com/josStorer/chatGPT-search-engine-extension"
        target="_blank"
        rel="noreferrer"
        className="github-link"
      >
        <MarkGithubIcon />
      </a>
    </div>
  )
}

export default Popup
