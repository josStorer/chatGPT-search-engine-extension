import {
  CardHeading,
  CardList,
  EmojiSmile,
  Palette,
  QuestionCircle,
  Translate,
} from 'react-bootstrap-icons'

export const config = {
  translate: {
    icon: <Translate />,
    label: 'Translate',
    genPrompt: (selection) => `Translate the following into Chinese:"${selection}"`,
  },
  summary: {
    icon: <CardHeading />,
    label: 'Summary',
    genPrompt: (selection) => `Summarize the following:"${selection}"`,
  },
  polish: {
    icon: <Palette />,
    label: 'Polish',
    genPrompt: (selection) =>
      `Check the following content for diction and grammar,and polish:"${selection}"`,
  },
  sentiment: {
    icon: <EmojiSmile />,
    label: 'Sentiment Analysis',
    genPrompt: (selection) =>
      `Analyze the sentiments expressed in the following content and make a brief summary:"${selection}"`,
  },
  divide: {
    icon: <CardList />,
    label: 'Divide Paragraphs',
    genPrompt: (selection) =>
      `Divide the following into paragraphs that are easy to read and understand:"${selection}"`,
  },
  ask: {
    icon: <QuestionCircle />,
    label: 'Ask',
    genPrompt: (selection) =>
      `Analyze the following content and express your opinion,or give your answer:"${selection}"`,
  },
}
