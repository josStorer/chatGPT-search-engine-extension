import { JSDOM } from 'jsdom'
import { config } from '../../../src/content-script/search-engine-configs.mjs'

let headers = new Headers({
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36 Edg/108.0.1462.76',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
  Connection: 'keep-alive',
  'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7', // for baidu
})

const urls = {
  google: ['https://www.google.com/search?q=hello'],
  bing: ['https://www.bing.com/search?q=hello', 'https://cn.bing.com/search?q=hello'],
  yahoo: ['https://search.yahoo.com/search?p=hello', 'https://search.yahoo.co.jp/search?p=hello'],
  duckduckgo: ['https://duckduckgo.com/s?q=hello'],
  startpage: [], // need redirect and post
  baidu: ['https://www.baidu.com/s?wd=hello'],
  kagi: [], // need login
  yandex: [], // need cookie
  naver: ['https://search.naver.com/search.naver?query=hello'],
  brave: ['https://search.brave.com/search?q=hello'],
  searx: ['https://searx.tiekoetter.com/search?q=hello'],
  ecosia: [], // unknown verify method
}

const queryNames = [
  'inputQuery',
  'sidebarContainerQuery',
  'appendContainerQuery',
  'resultsContainerQuery',
]

let errors = ''

async function verify() {
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
                if (queryArray.length > 0)
                  if (
                    queryArray.some((query) => {
                      const section = dom.window.document.querySelector(query)
                      if (section) return true
                    })
                  ) {
                    console.log(`${siteName} ${url} ${queryName} passed`)
                  } else {
                    const error = `${siteName} ${url} ${queryName} failed`
                    errors += error + '\n'
                  }
              }
            })
            .catch((error) => {
              errors += error + '\n'
            }),
        ),
      ),
    ),
  )

  if (errors.length > 0) throw new Error('\n' + errors)
  else console.log('\nAll passed')
}

verify()
