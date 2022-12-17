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

/**
 * @typedef {Object} UserConfig
 * @property {keyof TriggerMode} triggerMode
 * @property {keyof ThemeMode} themeMode
 */

/**
 * get user config from local storage
 * @returns {Promise<UserConfig>}
 */
export async function getUserConfig() {
  const { gpt_extension_config: options } = await Browser.storage.local.get('gpt_extension_config')
  return options
}

/**
 * set user config to local storage
 * @param {UserConfig} value
 */
export async function setUserConfig(value) {
  await Browser.storage.local.set({ gpt_extension_config: value })
}

/**
 * get default config
 * @returns {UserConfig}
 */
export function getDefaultConfig() {
  return {
    triggerMode: 'always',
    themeMode: 'auto',
  }
}

/**
 * if user config is not set, set default config and return it
 * @returns {Promise<UserConfig>}
 */
export async function initUserConfig() {
  let options = await getUserConfig()

  if (!options) {
    options = getDefaultConfig()
    await Browser.storage.local.set({ gpt_extension_config: options })
  }
  return options
}
