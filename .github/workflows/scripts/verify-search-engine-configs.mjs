import { JSDOM } from 'jsdom'
import { config } from '../../../src/content-script/search-engine-configs.mjs'
import fetch, { Headers } from 'node-fetch'

const urls = {
  google: ['https://www.google.com/search?q=hello'],
  bing: ['https://www.bing.com/search?q=hello', 'https://cn.bing.com/search?q=hello'],
  yahoo: ['https://search.yahoo.com/search?p=hello', 'https://search.yahoo.co.jp/search?p=hello'],
  duckduckgo: ['https://duckduckgo.com/s?q=hello'],
  startpage: [], // need redirect and post https://www.startpage.com/do/search?query=hello
  baidu: ['https://www.baidu.com/s?wd=hello'],
  kagi: [], // need login https://kagi.com/search?q=hello
  yandex: [], // need cookie https://yandex.com/search/?text=hello
  naver: ['https://search.naver.com/search.naver?query=hello'],
  brave: ['https://search.brave.com/search?q=hello'],
  searx: ['https://searx.tiekoetter.com/search?q=hello'],
  ecosia: [], // unknown verify method https://www.ecosia.org/search?q=hello
}

const commonHeaders = {
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
  Connection: 'keep-alive',
  'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7', // for baidu
}

const desktopHeaders = new Headers({
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36 Edg/108.0.1462.76',
  ...commonHeaders,
})

const mobileHeaders = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Mobile Safari/537.36 Edg/108.0.1462.76',
  ...commonHeaders,
}

const desktopQueryNames = [
  'inputQuery',
  'sidebarContainerQuery',
  'appendContainerQuery',
  'resultsContainerQuery',
]

const mobileQueryNames = ['inputQuery', 'resultsContainerQuery']

let errors = ''

async function verify(errorTag, urls, headers, queryNames) {
  await Promise.all(
    Object.entries(urls).map(([siteName, urlArray]) =>
      Promise.all(
        urlArray.map((url) =>
          fetch(url, {
            method: 'GET',
            headers: headers,
          })
            .then((response) => response.text())
            .then((text) => {
              const dom = new JSDOM(text)
              for (const queryName of queryNames) {
                const queryArray = config[siteName][queryName]
                if (queryArray.length === 0) continue

                let foundQuery
                for (const query of queryArray) {
                  const element = dom.window.document.querySelector(query)
                  if (element) {
                    foundQuery = query
                    break
                  }
                }
                if (foundQuery) {
                  console.log(`${siteName} ${url} ${queryName}: ${foundQuery} passed`)
                } else {
                  const error = `${siteName} ${url} ${queryName} failed`
                  errors += errorTag + error + '\n'
                }
              }
            })
            .catch((error) => {
              errors += errorTag + error + '\n'
            }),
        ),
      ),
    ),
  )
}

async function main() {
  console.log('Verify desktop search engine configs:')
  await verify('desktop: ', urls, desktopHeaders, desktopQueryNames)
  console.log('\nVerify mobile search engine configs:')
  await verify('mobile: ', urls, mobileHeaders, mobileQueryNames)

  if (errors.length > 0) throw new Error('\n' + errors)
  else console.log('\nAll passed')
}

main()
