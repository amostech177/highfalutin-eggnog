import { useEffect, useState } from 'react'

export default function Help() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/USER_GUIDE.md')
      .then(res => res.text())
      .then(text => setContent(text))
      .catch(() => setContent('Failed to load documentation.'))
      .finally(() => setLoading(false))
  }, [])

  const parseMarkdown = (md) => {
    const lines = md.split('\n')
    const blocks = []
    let currentList = null
    let inTable = false
    let tableRows = []
    let isTableHeader = true

    const flushList = () => {
      if (currentList) {
        blocks.push(currentList)
        currentList = null
      }
    }

    const flushTable = () => {
      if (inTable && tableRows.length > 0) {
        blocks.push({ type: 'table', rows: tableRows, isHeader: isTableHeader })
        tableRows = []
        inTable = false
        isTableHeader = true
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (line.startsWith('# ')) {
        flushList()
        flushTable()
        blocks.push({ type: 'h1', content: line.slice(2).trim() })
      } else if (line.startsWith('## ')) {
        flushList()
        flushTable()
        blocks.push({ type: 'h2', content: line.slice(3).trim() })
      } else if (line.startsWith('### ')) {
        flushList()
        flushTable()
        blocks.push({ type: 'h3', content: line.slice(4).trim() })
      } else if (line.startsWith('> ')) {
        flushList()
        flushTable()
        blocks.push({ type: 'blockquote', content: line.slice(2).trim() })
      } else if (line.startsWith('|') && line.endsWith('|')) {
        flushList()
        inTable = true
        const cells = line.split('|').slice(1, -1).map(c => c.trim())
        if (isTableHeader && cells.every(c => /^[-:| ]+$/.test(c))) {
          isTableHeader = false
          continue
        }
        tableRows.push(cells)
        if (isTableHeader) isTableHeader = false
      } else if (line.startsWith('```')) {
        flushList()
        flushTable()
        blocks.push({ type: 'code', content: line })
      } else if (line.trim() === '---') {
        flushList()
        flushTable()
        blocks.push({ type: 'hr' })
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        flushTable()
        if (!currentList) currentList = { type: 'ul', items: [] }
        currentList.items.push(line.slice(2).trim())
      } else if (/^\d+\.\s/.test(line)) {
        flushTable()
        if (!currentList) currentList = { type: 'ol', items: [] }
        currentList.items.push(line.replace(/^\d+\.\s/, ''))
      } else if (line.trim() === '') {
        if (currentList && i + 1 < lines.length && !/^[-*] /.test(lines[i + 1]) && !/^\d+\.\s/.test(lines[i + 1])) {
          flushList()
        }
      } else {
        flushList()
        flushTable()
        blocks.push({ type: 'p', content: line })
      }
    }

    flushList()
    flushTable()

    return blocks
  }

  const renderBlocks = (blocks) => {
    return blocks.map((block, i) => {
      switch (block.type) {
        case 'h1':
          return <h1 key={i}>{block.content}</h1>
        case 'h2':
          return <h2 key={i}>{block.content}</h2>
        case 'h3':
          return <h3 key={i}>{block.content}</h3>
        case 'p':
          return <p key={i}>{block.content}</p>
        case 'blockquote':
          return <blockquote key={i}>{block.content}</blockquote>
        case 'hr':
          return <hr key={i} />
        case 'code':
          return <pre key={i}><code>{block.content}</code></pre>
        case 'ul':
          return (
            <ul key={i}>
              {block.items.map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          )
        case 'ol':
          return (
            <ol key={i}>
              {block.items.map((item, idx) => <li key={idx}>{item}</li>)}
            </ol>
          )
        case 'table':
          return (
            <table key={i}>
              <thead>
                <tr>
                  {block.rows[0].map((cell, idx) => <th key={idx}>{cell}</th>)}
                </tr>
              </thead>
              <tbody>
                {block.rows.slice(1).map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {row.map((cell, idx) => <td key={idx}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )
        default:
          return <p key={i}>{block.content}</p>
      }
    })
  }

  if (loading) {
    return <div className="help-page">Loading documentation...</div>
  }

  const blocks = parseMarkdown(content)

  return (
    <div className="help-page">
      <div className="help-content">
        {renderBlocks(blocks)}
      </div>
    </div>
  )
}