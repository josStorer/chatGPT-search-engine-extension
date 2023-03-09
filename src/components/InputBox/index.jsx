import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'

export function InputBox({ onSubmit, enabled }) {
  const [value, setValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current.style.height = 'auto'
    const computed = window.getComputedStyle(inputRef.current)
    const height =
      parseInt(computed.getPropertyValue('border-top-width'), 10) +
      parseInt(computed.getPropertyValue('padding-top'), 10) +
      inputRef.current.scrollHeight +
      parseInt(computed.getPropertyValue('padding-bottom'), 10) +
      parseInt(computed.getPropertyValue('border-bottom-width'), 10)

    inputRef.current.style.height = `${height}px`
  })

  const onKeyDown = (e) => {
    if (e.keyCode === 13 && e.shiftKey === false) {
      e.preventDefault()
      if (!value) return
      onSubmit(value)
      setValue('')
    }
  }

  return (
    <textarea
      ref={inputRef}
      disabled={!enabled}
      className="interact-input"
      placeholder={
        enabled ? 'Type your question here' : 'Wait for the answer to finish and then continue here'
      }
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={onKeyDown}
    />
  )
}

InputBox.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  enabled: PropTypes.bool,
}

export default InputBox
