import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'

export function MarkdownRender(props) {
  const linkProperties = {
    target: '_blank',
    style: 'color: #8ab4f8;',
    rel: 'nofollow noopener noreferrer',
  }
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[
        rehypeRaw,
        [
          rehypeHighlight,
          {
            detect: true,
            ignoreMissing: true,
          },
        ],
      ]}
      components={{
        a: (props) => (
          <a href={props.href} {...linkProperties}>
            {props.children}
          </a>
        ),
      }}
      {...props}
    >
      {props.children}
    </ReactMarkdown>
  )
}

MarkdownRender.propTypes = {
  ...ReactMarkdown.propTypes,
}

export default MarkdownRender
