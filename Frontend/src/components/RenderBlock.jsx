import PropTypes from 'prop-types'

export default function RenderBlock({ block }) {
  if (block.type === 'heading') return <h1 className="h1">{block.props.text || ''}</h1>
  if (block.type === 'text') return <p className="p">{block.props.text || ''}</p>
  if (block.type === 'button') return <a className="btn primary" href={block.props.href || '#'}>{block.props.text || 'Button'}</a>
  if (block.type === 'leadForm') return <div className="muted">Lead form (shown on published page)</div>
  return null
}

RenderBlock.propTypes = {
  block: PropTypes.shape({
    type: PropTypes.string.isRequired,
    props: PropTypes.object,
  }).isRequired,
}
