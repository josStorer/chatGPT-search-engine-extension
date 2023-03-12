import { cropText } from '../../../utils/crop-text.mjs'

export default {
  inputQuery: async () => {
    try {
      const title = document.querySelector('.QuestionHeader-title').textContent
      let description
      try {
        description = document.querySelector('.QuestionRichText').textContent
      } catch (e) {
        /* empty */
      }
      let answer
      try {
        answer = document.querySelector('.AnswerItem .RichText').textContent
      } catch (e) {
        /* empty */
      }

      return cropText(
        `以下是一个问答平台的提问与回答内容,给出相应的摘要,以及你对此的看法.问题是:"${title}",问题的进一步描述是:"${description}".` +
          `其中一个回答如下:\n${answer}`,
      )
    } catch (e) {
      console.log(e)
    }
  },
}
