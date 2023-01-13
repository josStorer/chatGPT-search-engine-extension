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
