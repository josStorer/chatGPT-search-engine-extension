import '@picocss/pico'
import { useEffect, useState } from 'preact/hooks'
import { setUserConfig, initUserConfig, TriggerMode, ThemeMode } from '../config'
import './styles.css'
import { MarkGithubIcon } from '@primer/octicons-react'

function Popup() {
  /**
   * @type {[TriggerMode, (mode: TriggerMode) => void]}
   */
  const [triggerMode, setTriggerMode] = useState()
  const [themeMode, setThemeMode] = useState()
  const [insertAtTop, setInsertAtTop] = useState()

  useEffect(() => {
    initUserConfig().then(({ triggerMode, themeMode, insertAtTop }) => {
      setTriggerMode(triggerMode)
      setThemeMode(themeMode)
      setInsertAtTop(insertAtTop)
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
            setUserConfig({ triggerMode: mode, themeMode: themeMode, insertAtTop: insertAtTop })
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
              setUserConfig({ triggerMode: triggerMode, themeMode: mode, insertAtTop: insertAtTop })
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
        <hr />
        <label>
          <input
            type="checkbox"
            checked={insertAtTop}
            onChange={(e) => {
              const checked = e.target.checked
              setInsertAtTop(checked)
              setUserConfig({
                triggerMode: triggerMode,
                themeMode: themeMode,
                insertAtTop: checked,
              })
            }}
          />
          Insert chatGPT at the top of search results
        </label>
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
