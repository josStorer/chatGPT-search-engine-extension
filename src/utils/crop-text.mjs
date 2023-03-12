import { maxResponseTokenLength } from '../config.mjs'
import { encode } from '@nem035/gpt-3-encoder'

// TODO add model support
export function cropText(
  text,
  maxLength = 3900 - maxResponseTokenLength,
  startLength = 400,
  endLength = 300,
  tiktoken = true,
) {
  let length = tiktoken ? encode(text).length : text.length
  if (length <= maxLength) return text

  const splits = text.split(/[,，.。?？!！;；\n]/).map((s) => s.trim())
  const splitsLength = splits.map((s) => (tiktoken ? encode(s).length : s.length))
  length = splitsLength.reduce((sum, length) => sum + length, 0)

  const cropLength = length - startLength - endLength
  const cropTargetLength = maxLength - startLength - endLength
  const cropPercentage = cropTargetLength / cropLength
  const cropStep = Math.max(0, 1 / cropPercentage - 1)

  let croppedText = ''
  let currentLength = 0
  let currentIndex = 0
  let currentStep = 0

  for (; currentIndex < splits.length; currentIndex++) {
    if (currentLength + splitsLength[currentIndex] + 1 <= startLength) {
      croppedText += splits[currentIndex] + ','
      currentLength += splitsLength[currentIndex] + 1
    } else if (currentLength + splitsLength[currentIndex] + 1 + endLength <= maxLength) {
      if (currentStep < cropStep) {
        currentStep++
      } else {
        croppedText += splits[currentIndex] + ','
        currentLength += splitsLength[currentIndex] + 1
        currentStep = currentStep - cropStep
      }
    } else {
      break
    }
  }

  let endPart = ''
  let endPartLength = 0
  for (let i = splits.length - 1; endPartLength + splitsLength[i] <= endLength; i--) {
    endPart = splits[i] + ',' + endPart
    endPartLength += splitsLength[i] + 1
  }
  currentLength += endPartLength
  croppedText += endPart

  console.log(
    `maxLength: ${maxLength}\n` +
      `croppedTextLength: ${tiktoken ? encode(croppedText).length : croppedText.length}\n` +
      `desiredLength: ${currentLength}\n` +
      `content: ${croppedText}`,
  )
  return croppedText
}
