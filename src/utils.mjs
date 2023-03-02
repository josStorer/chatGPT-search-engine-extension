export function getPossibleElementByQuerySelector(queryArray) {
  for (const query of queryArray) {
    if (query) {
      try {
        const element = document.querySelector(query)
        if (element) {
          return element
        }
      } catch (e) {
        /* empty */
      }
    }
  }
}

export function endsWithQuestionMark(question) {
  return (
    question.endsWith('?') || // ASCII
    question.endsWith('？') || // Chinese/Japanese
    question.endsWith('؟') || // Arabic
    question.endsWith('⸮') // Arabic
  )
}

export function isSafari() {
  return navigator.vendor === 'Apple Computer, Inc.'
}

export function getChatPairs(records, isChatgpt) {
  let pairs
  if (isChatgpt) {
    pairs = []
    for (const record of records) {
      pairs.push({ role: 'user', content: record['question'] })
      pairs.push({ role: 'assistant', content: record['answer'] })
    }
  } else {
    pairs = ''
    for (const record of records) {
      pairs += 'Human:' + record.question + '\nAI:' + record.answer + '\n'
    }
  }

  return pairs
}
