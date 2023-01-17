import { defaults } from 'lodash-es'
import Browser from 'webextension-polyfill'

export const TriggerMode = {
  always: 'Always',
  questionMark: 'When query ends with question mark (?)',
  manually: 'Manually',
}

export const ThemeMode = {
  light: 'Light',
  dark: 'Dark',
  auto: 'Auto',
}

export const defaultConfig = {
  /** @type {keyof TriggerMode}*/
  triggerMode: 'always',
  /** @type {keyof ThemeMode}*/
  themeMode: 'auto',
  insertAtTop: false,
  siteRegex: 'match nothing',
  userSiteRegexOnly: false,
  inputQuery: '',
  appendQuery: '',
  prependQuery: '',
  accessToken: '',
  tokenSavedOn: 0,
}

/**
 * @typedef {typeof defaultConfig} UserConfig
 */

/**
 * get user config from local storage
 * @returns {Promise<UserConfig>}
 */
export async function getUserConfig() {
  const options = await Browser.storage.local.get(Object.keys(defaultConfig))
  return defaults(options, defaultConfig)
}

/**
 * set user config to local storage
 * @param {Partial<UserConfig>} value
 */
export async function setUserConfig(value) {
  await Browser.storage.local.set(value)
}

export async function setAccessToken(accessToken) {
  await setUserConfig({ accessToken, tokenSavedOn: Date.now() })
}

const TOKEN_DURATION = 30 * 24 * 3600 * 1000
export async function clearOldAccessToken() {
  const duration = Date.now() - (await getUserConfig()).tokenSavedOn
  if (duration > TOKEN_DURATION) {
    await setAccessToken('')
  }
}
